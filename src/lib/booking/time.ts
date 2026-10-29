/**
 * Baku time. Azerbaijan has been UTC+4 all year since 2016 (no daylight saving), so a fixed
 * offset is exact and needs no time-zone database. Dates are "YYYY-MM-DD", times minutes
 * after midnight (1440 = 24:00).
 */
export const BAKU_OFFSET_MIN = 4 * 60;
export const timeZone = "Asia/Baku";

const pad = (n: number) => String(n).padStart(2, "0");

/** The Baku calendar date of an instant. */
export function bakuDate(at: Date = new Date()): string {
  const d = new Date(at.getTime() + BAKU_OFFSET_MIN * 60_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Minutes after Baku midnight of an instant. */
export function bakuMinutes(at: Date): number {
  const d = new Date(at.getTime() + BAKU_OFFSET_MIN * 60_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** The instant of `minutes` after midnight on a Baku date. */
export function bakuInstant(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - BAKU_OFFSET_MIN * 60_000);
}

/** Monday = 0 … Sunday = 6 (the order of the admin's opening-hours rows). */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && addDays(v, 0) === v;

/** "HH:MM" → minutes; "24:00" is allowed (end of day). */
export function parseTime(v: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[2]) < 60 && n <= 1440 ? n : null;
}

/** minutes → "HH:MM" (1440 → "24:00"). */
export const formatTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "2026-11-03" → "03.11.2026" (Azerbaijani notation). */
export function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

/** An instant as "03.11.2026, 10:00" in Baku time. */
export const formatInstant = (at: Date) => `${formatDate(bakuDate(at))}, ${formatTime(bakuMinutes(at))}`;
