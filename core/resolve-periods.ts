import type { ISODate, PeriodMap } from "./types.js";
import { enumerateRange, uniqSortDates } from "./dates.js";

// The period-to-date resolution rules, applied by BOTH the Sheet sync
// (Option A) and the seed importer. This is the one place the messy
// human-facing sheet becomes a clean canonical date list.
//
//   X        -> black out the period's entire window
//   PARTIAL  -> ignore the window; the real dates come from additional_dates
//   blank    -> period is open
//
// additional_dates is ALWAYS merged in (it carries the PARTIAL dates and any
// extra explicit blackouts).

export type CellFlag = "X" | "PARTIAL" | "";

/** Normalize a raw sheet cell into a flag. */
export function normalizeFlag(raw: string | undefined | null): CellFlag {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "X" || v === "BLACKOUT") return "X";
  if (v.startsWith("PARTIAL")) return "PARTIAL";
  return "";
}

/** Expand a single named period to its full list of ISO dates. */
export function expandPeriod(periods: PeriodMap, key: string): ISODate[] {
  const p = periods[key];
  if (!p) throw new Error(`Unknown period key: ${key}`);
  const out: ISODate[] = [];
  for (const [start, end] of p.ranges ?? []) out.push(...enumerateRange(start, end));
  out.push(...(p.dates ?? []));
  return out;
}

const US = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;

function expandYear(y: string | undefined, fallback?: string): string {
  let yy = y ?? fallback ?? "";
  if (yy.length === 2) yy = (Number(yy) >= 70 ? "19" : "20") + yy;
  return yy;
}

function parseOne(token: string, yearHint?: string): ISODate | null {
  const t = token.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // already ISO
  const m = t.match(US);
  if (!m) return null;
  const [, mo, d, y] = m;
  const yy = expandYear(y, yearHint);
  if (!yy) return null;
  return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const RANGE_SEP = /\.\.|–|—|\s+to\s+|\s+-\s+|-/;

/**
 * Parse the free-text `additional_dates` column into ISO dates.
 * Accepts ISO ("2026-01-03"), ISO ranges ("2026-01-03..2026-01-04"),
 * US dates ("1/3/2026", "01/03/26"), US ranges ("12/26 - 12/31/25"),
 * separated by "," or ";". Prose that isn't a date is discarded.
 */
export function parseAdditionalDates(raw: string | undefined | null): ISODate[] {
  if (!raw) return [];
  const out: ISODate[] = [];
  for (const chunk of raw.split(/[;,]/)) {
    const entry = chunk.trim();
    if (!entry) continue;

    // ISO single
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
      out.push(entry);
      continue;
    }
    // ISO range ("2026-01-03..2026-01-04"). Handle before generic splitting so
    // the hyphens inside ISO dates aren't mistaken for a range separator.
    if (entry.includes("..")) {
      const [a, b] = entry.split("..").map((x) => x.trim());
      const pa = parseOne(a);
      const pb = parseOne(b);
      if (pa && pb) {
        out.push(...enumerateRange(pa, pb));
        continue;
      }
    }
    // US range?  Split on the first range separator that yields two date-ish parts.
    const parts = splitRange(entry);
    if (parts) {
      const [aRaw, bRaw] = parts;
      // Year may be present only on the second endpoint ("12/26 - 12/31/25").
      const bYear = (bRaw.match(US)?.[3]) ?? (bRaw.match(/^\d{4}/)?.[0]);
      const a = parseOne(aRaw, bYear);
      const b = parseOne(bRaw, bYear);
      if (a && b) {
        out.push(...enumerateRange(a, b));
        continue;
      }
    }
    // Single US date / fallthrough
    const single = parseOne(entry);
    if (single) out.push(single);
    // else: prose — discarded on purpose (operational notes never enter data).
  }
  return uniqSortDates(out);
}

function splitRange(entry: string): [string, string] | null {
  // Don't treat ISO singles or hyphenated single tokens incorrectly:
  // only split when both sides look like partial/full dates.
  const m = entry.match(RANGE_SEP);
  if (!m || m.index === undefined) return null;
  const a = entry.slice(0, m.index).trim();
  const b = entry.slice(m.index + m[0].length).trim();
  if (!a || !b) return null;
  // Both endpoints must contain a slash or be ISO to count as a date range.
  const looksDate = (s: string) => /\d{1,2}\/\d{1,2}/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
  if (looksDate(a) && looksDate(b)) return [a, b];
  return null;
}

export interface BlackoutRow {
  /** period key -> flag */
  flags: Record<string, CellFlag>;
  additional: string;
}

/** Resolve one resort's blackout row into the canonical fully-expanded list. */
export function resolveBlackoutRow(periods: PeriodMap, row: BlackoutRow): ISODate[] {
  const out: ISODate[] = [];
  for (const key of Object.keys(periods)) {
    if (row.flags[key] === "X") out.push(...expandPeriod(periods, key));
    // PARTIAL and blank contribute nothing here; PARTIAL dates arrive via additional.
  }
  out.push(...parseAdditionalDates(row.additional));
  return uniqSortDates(out);
}
