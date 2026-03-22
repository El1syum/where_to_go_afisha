import { NextResponse } from "next/server";

/**
 * Заглушка для внешнего API.
 * Будет реализована когда определится конкретный API.
 */
export async function GET() {
  return NextResponse.json({
    status: "stub",
    message: "External API integration is not configured yet",
    events: [],
  });
}
