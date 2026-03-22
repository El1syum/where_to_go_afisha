import { logger } from "../shared/logger.js";

/**
 * Заглушка адаптера внешнего API.
 * Когда API будет определён, нужно реализовать fetch() и transform().
 */

export interface ExternalEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  city: string;
  category: string;
  place?: string;
  price?: number;
  imageUrl?: string;
  url?: string;
}

export async function fetchExternalEvents(): Promise<ExternalEvent[]> {
  logger.info("External API adapter is a stub — skipping");
  return [];
}

export function transformExternalEvent(_raw: ExternalEvent) {
  // TODO: implement when API is defined
  throw new Error("External API adapter not implemented");
}
