import type { ISODate } from "./types.js";

// All date math is done on plain "YYYY-MM-DD" strings in UTC to avoid any
// timezone drift. We never construct a Date from a local-time string.

const MS_PER_DAY = 86_400_000;

/** Parse "YYYY-MM-DD" to a UTC epoch-day integer. */
export function toDayNum(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Inverse of toDayNum. */
export function fromDayNum(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive list of ISO dates from start..end. */
export function enumerateRange(start: ISODate, end: ISODate): ISODate[] {
  const a = toDayNum(start);
  const b = toDayNum(end);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: ISODate[] = [];
  for (let n = lo; n <= hi; n++) out.push(fromDayNum(n));
  return out;
}

/** Day of week for an ISO date. 0 = Sunday. */
export function dayOfWeek(iso: ISODate): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Sat, Jan 17" */
export function formatShort(iso: ISODate): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[dt.getUTCDay()]}, ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
}

/** "January 2026" */
export function formatMonthYear(year: number, month0: number): string {
  const long = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${long[month0]} ${year}`;
}

/** Sort + de-duplicate a list of ISO dates. */
export function uniqSortDates(dates: ISODate[]): ISODate[] {
  return Array.from(new Set(dates)).sort();
}

/** Today's normalized ISO date (UTC). */
export function todayISO(): ISODate {
  return fromDayNum(Math.floor(Date.now() / MS_PER_DAY));
}
