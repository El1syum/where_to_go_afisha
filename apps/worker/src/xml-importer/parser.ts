import { SaxesParser } from "saxes";
import { createReadStream } from "fs";
import { Readable } from "stream";
import { logger } from "../shared/logger.js";

export interface RawOffer {
  id: string;
  type: string;
  available: string;
  categoryId: string;
  currencyId: string;
  date: string;
  description: string;
  name: string;
  picture: string;
  place: string;
  price: string;
  url: string;
  age: string;
  isKids: string;
  isPremiere: string;
  modifiedTime: string;
}

interface ParseResult {
  categories: Map<string, string>; // id -> name
  offers: RawOffer[];
}

/**
 * Потоковый SAX-парсер XML-фида Яндекс Афиши.
 * Парсит файл потоково, не загружая целиком в память.
 */
export async function parseXmlStream(
  input: Readable,
  onOffer: (offer: RawOffer) => Promise<void>
): Promise<{ totalOffers: number; categories: Map<string, string> }> {
  const parser = new SaxesParser();
  const categories = new Map<string, string>();

  let totalOffers = 0;
  let insideOffer = false;
  let insideCategory = false;
  let currentTag = "";
  let currentOffer: Partial<RawOffer> = {};
  let currentCategoryId = "";
  let textBuffer = "";

  return new Promise((resolve, reject) => {
    parser.on("opentag", (node) => {
      const tagName = node.name;
      textBuffer = "";

      if (tagName === "offer") {
        insideOffer = true;
        currentOffer = {
          id: (node.attributes.id as string) || "",
          type: (node.attributes.type as string) || "",
          available: (node.attributes.available as string) || "",
        };
      } else if (tagName === "category" && !insideOffer) {
        insideCategory = true;
        currentCategoryId = (node.attributes.id as string) || "";
      } else if (insideOffer) {
        currentTag = tagName;
      }
    });

    parser.on("text", (text) => {
      textBuffer += text;
    });

    parser.on("closetag", async (node) => {
      const tagName = node.name;
      const text = textBuffer.trim();

      if (tagName === "category" && insideCategory) {
        insideCategory = false;
        if (currentCategoryId && text) {
          categories.set(currentCategoryId, text);
        }
        currentCategoryId = "";
      } else if (tagName === "offer" && insideOffer) {
        insideOffer = false;
        totalOffers++;

        try {
          await onOffer(currentOffer as RawOffer);
        } catch (err) {
          logger.error({ offerId: currentOffer.id, err }, "Error processing offer");
        }

        currentOffer = {};
        if (totalOffers % 5000 === 0) {
          logger.info(`Parsed ${totalOffers} offers...`);
        }
      } else if (insideOffer && currentTag === tagName) {
        switch (tagName) {
          case "categoryId":
            currentOffer.categoryId = text;
            break;
          case "currencyId":
            currentOffer.currencyId = text;
            break;
          case "date":
            currentOffer.date = text;
            break;
          case "description":
            currentOffer.description = text;
            break;
          case "name":
            currentOffer.name = text;
            break;
          case "picture":
            currentOffer.picture = text;
            break;
          case "place":
            currentOffer.place = text;
            break;
          case "price":
            currentOffer.price = text;
            break;
          case "url":
            currentOffer.url = text;
            break;
          case "is_kids":
            currentOffer.isKids = text;
            break;
          case "is_premiere":
            currentOffer.isPremiere = text;
            break;
          case "modified_time":
            currentOffer.modifiedTime = text;
            break;
          case "age":
            currentOffer.age = text;
            break;
        }
        currentTag = "";
      }

      textBuffer = "";
    });

    parser.on("error", (err) => {
      logger.error(err, "SAX parser error");
      // Don't reject — try to continue parsing
    });

    input.on("data", (chunk: Buffer) => {
      parser.write(chunk.toString());
    });

    input.on("end", () => {
      parser.close();
      resolve({ totalOffers, categories });
    });

    input.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Парсит XML из локального файла (для тестов и начальной загрузки).
 */
export function createFileStream(filePath: string): Readable {
  return createReadStream(filePath, { encoding: "utf-8", highWaterMark: 64 * 1024 });
}
