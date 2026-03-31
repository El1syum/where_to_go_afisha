import { SaxesParser } from "saxes";
import { Readable } from "stream";
import { logger } from "../shared/logger.js";

export interface RawKassirOffer {
  id: string;
  available: string;
  name: string;
  description: string;
  url: string;
  picture: string;
  price: string;
  categoryIds: string[];
  city: string;
  venue: string;
  date: string;
  domain: string;
  modifiedTime: string;
}

export async function parseKassirStream(
  input: Readable,
  onOffer: (offer: RawKassirOffer) => Promise<void>
): Promise<{ totalOffers: number }> {
  const parser = new SaxesParser();

  let totalOffers = 0;
  let insideOffer = false;
  let currentTag = "";
  let currentOffer: Partial<RawKassirOffer> & { categoryIds: string[] } = { categoryIds: [] };
  let textBuffer = "";

  return new Promise((resolve, reject) => {
    parser.on("opentag", (node) => {
      textBuffer = "";

      if (node.name === "offer") {
        insideOffer = true;
        currentOffer = {
          id: (node.attributes.id as string) || "",
          available: (node.attributes.available as string) || "true",
          categoryIds: [],
        };
      } else if (insideOffer) {
        currentTag = node.name;
      }
    });

    parser.on("text", (text) => {
      textBuffer += text;
    });

    parser.on("closetag", async (node) => {
      const tagName = node.name;
      const text = textBuffer.trim();

      if (tagName === "offer" && insideOffer) {
        insideOffer = false;
        totalOffers++;

        try {
          await onOffer(currentOffer as RawKassirOffer);
        } catch (err) {
          logger.error({ offerId: currentOffer.id, err }, "Error processing Kassir offer");
        }

        currentOffer = { categoryIds: [] };
        if (totalOffers % 5000 === 0) {
          logger.info(`Kassir: parsed ${totalOffers} offers...`);
        }
      } else if (insideOffer && currentTag === tagName) {
        switch (tagName) {
          case "name": currentOffer.name = text; break;
          case "description": currentOffer.description = text; break;
          case "url": currentOffer.url = text; break;
          case "picture": currentOffer.picture = text; break;
          case "price": currentOffer.price = text; break;
          case "categoryId": currentOffer.categoryIds!.push(text); break;
          case "city": currentOffer.city = text; break;
          case "venue": currentOffer.venue = text; break;
          case "date": currentOffer.date = text; break;
          case "domain": currentOffer.domain = text; break;
          case "modified_time": currentOffer.modifiedTime = text; break;
        }
        currentTag = "";
      }

      textBuffer = "";
    });

    parser.on("error", (err) => {
      logger.error(err, "Kassir SAX parser error");
    });

    input.on("data", (chunk: Buffer) => {
      parser.write(chunk.toString());
    });

    input.on("end", () => {
      parser.close();
      resolve({ totalOffers });
    });

    input.on("error", (err) => {
      reject(err);
    });
  });
}
