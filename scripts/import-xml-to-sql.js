/**
 * Парсит example.xml и генерирует SQL для загрузки в PostgreSQL.
 * Использование: node scripts/import-xml-to-sql.js > /tmp/import.sql
 */
const { createReadStream } = require("fs");
const { SaxesParser } = require("saxes");
const path = require("path");

const xmlPath = path.join(__dirname, "..", "example.xml");
const MAX_OFFERS = parseInt(process.env.MAX_OFFERS || "0") || Infinity;

function transliterate(str) {
  const map = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return str.toLowerCase().split("").map(c => map[c] ?? c).join("");
}

function slugify(str, id) {
  const clean = str.replace(/^Билеты на\s+/i, "");
  return transliterate(clean).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 100) + "-" + id.replace(/x/g, "-");
}

function extractCitySlug(url) {
  try {
    const u = new URL(url);
    const ulp = u.searchParams.get("ulp");
    if (!ulp) return null;
    return new URL(decodeURIComponent(ulp)).pathname.split("/").filter(Boolean)[0] || null;
  } catch { return null; }
}

function extractOriginalUrl(url) {
  try {
    const u = new URL(url);
    const ulp = u.searchParams.get("ulp");
    return ulp ? decodeURIComponent(ulp) : null;
  } catch { return null; }
}

function esc(s) {
  if (s == null) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function main() {
  const parser = new SaxesParser();
  const citySlugs = new Set();
  const events = []; // collect all events

  let insideOffer = false;
  let currentTag = "";
  let currentOffer = {};
  let textBuffer = "";
  let offerCount = 0;

  return new Promise((resolve, reject) => {
    parser.on("opentag", (node) => {
      textBuffer = "";
      if (node.name === "offer") {
        insideOffer = true;
        currentOffer = { id: node.attributes.id || "" };
      } else if (insideOffer) {
        currentTag = node.name;
      }
    });

    parser.on("text", (text) => { textBuffer += text; });

    parser.on("closetag", (node) => {
      const text = textBuffer.trim();
      if (node.name === "offer" && insideOffer) {
        insideOffer = false;
        offerCount++;

        if (offerCount <= MAX_OFFERS) {
          const o = currentOffer;
          const citySlug = extractCitySlug(o.url || "");
          if (citySlug && o.id && o.name) {
            citySlugs.add(citySlug);
            events.push({ ...o, _citySlug: citySlug });
          }
        }

        if (offerCount % 5000 === 0) {
          process.stderr.write(`Parsed ${offerCount} offers...\n`);
        }
        currentOffer = {};
      } else if (insideOffer && currentTag === node.name) {
        switch (node.name) {
          case "categoryId": currentOffer.categoryId = text; break;
          case "date": currentOffer.date = text; break;
          case "description": currentOffer.description = text; break;
          case "name": currentOffer.name = text; break;
          case "picture": currentOffer.picture = text; break;
          case "place": currentOffer.place = text; break;
          case "price": currentOffer.price = text; break;
          case "url": currentOffer.url = text; break;
          case "is_kids": currentOffer.isKids = text; break;
          case "is_premiere": currentOffer.isPremiere = text; break;
          case "modified_time": currentOffer.modifiedTime = text; break;
          case "age": currentOffer.age = text; break;
        }
        currentTag = "";
      }
      textBuffer = "";
    });

    parser.on("error", () => {}); // skip parse errors

    const stream = createReadStream(xmlPath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
    stream.on("data", (chunk) => parser.write(chunk));
    stream.on("error", reject);

    stream.on("end", () => {
      parser.close();

      process.stderr.write(`\nTotal: ${offerCount} parsed, ${events.length} valid, ${citySlugs.size} cities\n`);

      // Output SQL
      console.log("BEGIN;");
      console.log("");

      // 1. Insert cities
      for (const slug of citySlugs) {
        console.log(`INSERT INTO "City" (slug, name, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES (${esc(slug)}, ${esc(slug)}, true, 0, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING;`);
      }
      console.log("");

      // 2. Insert events
      for (const o of events) {
        const catId = parseInt(o.categoryId || "10") || 10;
        const slug = slugify(o.name, o.id);
        const title = (o.name || "").replace(/^Билеты на\s+/i, "");
        const price = o.price ? parseFloat(o.price) : null;
        const age = o.age ? parseInt(o.age) : null;
        const desc = o.description ? o.description.substring(0, 5000) : null;
        const origUrl = extractOriginalUrl(o.url);

        console.log(`INSERT INTO "Event" ("externalId", source, slug, title, description, date, place, price, "imageUrl", "affiliateUrl", "originalUrl", age, "isKids", "isPremiere", "isActive", "isApproved", "modifiedTime", "cityId", "categoryId", "createdAt", "updatedAt") VALUES (${esc(o.id)}, 'YANDEX_XML', ${esc(slug)}, ${esc(title)}, ${esc(desc)}, ${esc(o.date || '2026-01-01')}::timestamptz, ${esc(o.place)}, ${price !== null && !isNaN(price) ? price : "NULL"}, ${esc(o.picture)}, ${esc(o.url)}, ${esc(origUrl)}, ${age !== null && !isNaN(age) ? age : "NULL"}, ${o.isKids === "true"}, ${o.isPremiere === "true"}, true, true, ${o.modifiedTime ? parseInt(o.modifiedTime) : "NULL"}, (SELECT id FROM "City" WHERE slug = ${esc(o._citySlug)}), ${catId}, NOW(), NOW()) ON CONFLICT ("externalId", source) DO NOTHING;`);
      }

      console.log("");
      console.log("COMMIT;");
      resolve();
    });
  });
}

main().catch(e => { console.error(e); process.exit(1); });
