import { availability, daysAvailability } from "@/lib/booking/server";
import { isDate } from "@/lib/booking/time";

/**
 * Booking availability of a studio, never cached (bookings change every minute):
 * - `?studio=<slug>&date=YYYY-MM-DD`: free start/end times of that Baku date;
 * - `?studio=<slug>&from=YYYY-MM-DD&days=N` (N ≤ 42): each day's state for the calendar.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const studio = url.searchParams.get("studio") ?? "";
  const date = url.searchParams.get("date") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const days = Number(url.searchParams.get("days") ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(studio)) return Response.json({ error: "invalid" }, { status: 400 });

  if (from) {
    if (!isDate(from) || !Number.isInteger(days) || days < 1 || days > 42) return Response.json({ error: "invalid" }, { status: 400 });
    const states = await daysAvailability(studio, from, days);
    if (!states) return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ days: states }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!isDate(date)) return Response.json({ error: "invalid" }, { status: 400 });
  const slots = await availability(studio, date);
  if (!slots) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(slots, { headers: { "Cache-Control": "no-store" } });
}
