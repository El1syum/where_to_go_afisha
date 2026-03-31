import { SaxesParser } from "saxes";
import { Readable } from "stream";
import { logger } from "../shared/logger.js";

export interface RawAdvCakeOffer {
  id: string;
  available: string;
  name: string;
  description: string;
  url: string;
  picture: string;
  price: string;
  categoryId: string;
  typePrefix: string;
  region: string;
  date: string;
  age: string;
  vendor: string;
  model: string;
}

export async function parseAdvCakeStream(
  input: Readable,
  onOffer: (offer: RawAdvCakeOffer) => Promise<void>
): Promise<{ totalOffers: number }> {
  const parser = new SaxesParser();

  let totalOffers = 0;
  let insideOffer = false;
  let currentTag = "";
  let currentOffer: Partial<RawAdvCakeOffer> = {};
  let textBuffer = "";

  return new Promise((resolve, reject) => {
    parser.on("opentag", (node) => {
      textBuffer = "";

      if (node.name === "offer") {
        insideOffer = true;
        currentOffer = {
          id: (node.attributes.id as string) || "",
          available: (node.attributes.available as string) || "true",
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
          await onOffer(currentOffer as RawAdvCakeOffer);
        } catch (err) {
          logger.error({ offerId: currentOffer.id, err }, "Error processing AdvCake offer");
        }

        currentOffer = {};
        if (totalOffers % 5000 === 0) {
          logger.info(`AdvCake: parsed ${totalOffers} offers...`);
        }
      } else if (insideOffer && currentTag === tagName) {
        switch (tagName) {
          case "name": currentOffer.name = text; break;
          case "description": currentOffer.description = text; break;
          case "url": currentOffer.url = text; break;
          case "picture": currentOffer.picture = text; break;
          case "price": currentOffer.price = text; break;
          case "categoryId": currentOffer.categoryId = text; break;
          case "typePrefix": currentOffer.typePrefix = text; break;
          case "region": currentOffer.region = text; break;
          case "date": currentOffer.date = text; break;
          case "age": currentOffer.age = text; break;
          case "vendor": currentOffer.vendor = text; break;
          case "model": currentOffer.model = text; break;
        }
        currentTag = "";
      }

      textBuffer = "";
    });

    parser.on("error", (err) => {
      logger.error(err, "AdvCake SAX parser error");
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
