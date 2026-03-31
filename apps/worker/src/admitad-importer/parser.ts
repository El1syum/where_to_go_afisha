import { SaxesParser } from "saxes";
import { Readable } from "stream";
import { logger } from "../shared/logger.js";

export interface RawAdmitadOffer {
  id: string;
  available: string;
  name: string;
  description: string;
  url: string;
  picture: string;
  price: string;
  categoryId: string;
  city: string;
  date: string;
  age: string;
  model: string;
  vendor: string;
  modifiedTime: string;
}

export async function parseAdmitadStream(
  input: Readable,
  onOffer: (offer: RawAdmitadOffer) => Promise<void>
): Promise<{ totalOffers: number }> {
  const parser = new SaxesParser();

  let totalOffers = 0;
  let insideOffer = false;
  let currentTag = "";
  let currentOffer: Partial<RawAdmitadOffer> = {};
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
          await onOffer(currentOffer as RawAdmitadOffer);
        } catch (err) {
          logger.error({ offerId: currentOffer.id, err }, "Error processing Admitad offer");
        }

        currentOffer = {};
        if (totalOffers % 5000 === 0) {
          logger.info(`Admitad: parsed ${totalOffers} offers...`);
        }
      } else if (insideOffer && currentTag === tagName) {
        switch (tagName) {
          case "name": currentOffer.name = text; break;
          case "description": currentOffer.description = text; break;
          case "url": currentOffer.url = text; break;
          case "picture": currentOffer.picture = text; break;
          case "price": currentOffer.price = text; break;
          case "categoryId": currentOffer.categoryId = text; break;
          case "city": currentOffer.city = text; break;
          case "date": currentOffer.date = text; break;
          case "age": currentOffer.age = text; break;
          case "model": currentOffer.model = text; break;
          case "vendor": currentOffer.vendor = text; break;
          case "modified_time": currentOffer.modifiedTime = text; break;
        }
        currentTag = "";
      }

      textBuffer = "";
    });

    parser.on("error", (err) => {
      logger.error(err, "Admitad SAX parser error");
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
