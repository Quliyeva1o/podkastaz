import { availability } from "@/lib/booking/server";
import { isDate } from "@/lib/booking/time";

/**
 * Free start/end times of a studio on a Baku date: GET /api/availability?studio=<slug>&date=YYYY-MM-DD.
 * Small JSON, never cached (bookings change every minute).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const studio = url.searchParams.get("studio") ?? "";
  const date = url.searchParams.get("date") ?? "";
  if (!/^[a-z0-9-]{1,80}$/.test(studio) || !isDate(date)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const slots = await availability(studio, date);
  if (!slots) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(slots, { headers: { "Cache-Control": "no-store" } });
}
