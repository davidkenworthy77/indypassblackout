import type {
  IndyData,
  ISODate,
  PassId,
  Reservation,
  Resort,
  PeriodMap,
} from "./types.js";
import { getPass } from "./types.js";
import { enumerateRange } from "./dates.js";
import { expandPeriod } from "./resolve-periods.js";

export type DayState = "open" | "blackout" | "reservation";

export interface DayResolution {
  date: ISODate;
  state: DayState;
  /** Human reason a day is blacked out (the named period, when known). */
  blackoutReason?: string;
  /** The applicable reservation block, surfaced when status !== "none". */
  reservation?: Reservation;
}

export interface RangeResolution {
  resort: Resort;
  days: DayResolution[];
  /** Roll-up: the "worst" state across the range, for list/matrix summaries. */
  summary: DayState;
  counts: { open: number; blackout: number; reservation: number };
}

/** Build a date -> period label index, so we can explain WHY a day is red. */
export function buildPeriodIndex(periods: PeriodMap): Map<ISODate, string> {
  const idx = new Map<ISODate, string>();
  for (const key of Object.keys(periods)) {
    for (const d of expandPeriod(periods, key)) {
      if (!idx.has(d)) idx.set(d, periods[key].label);
    }
  }
  return idx;
}

/** Resolve a single (pass, resort, date) to exactly one state. */
export function resolveDay(
  passId: PassId,
  resort: Resort,
  date: ISODate,
  periodIndex?: Map<ISODate, string>,
): DayResolution {
  const pass = getPass(passId);
  const resDataset = resort[pass.reservationDataset];
  const reservation = resDataset.reservation;

  // 1. Blackout wins — if you can't ride, nothing else matters.
  if (pass.observesBlackouts) {
    const blackoutSet = resort[pass.blackoutDataset].blackout_dates;
    if (blackoutSet.includes(date)) {
      return {
        date,
        state: "blackout",
        blackoutReason: periodIndex?.get(date) ?? "Resort blackout",
      };
    }
  }

  // 2. Required reservation -> orange (valid, but must book).
  if (reservation.status === "required") {
    return { date, state: "reservation", reservation };
  }

  // 3. Open. Voluntary reservations stay green but we carry the detail through
  //    so the widget can show a "reservations recommended" hint.
  return {
    date,
    state: "open",
    reservation: reservation.status === "voluntary" ? reservation : undefined,
  };
}

const WORST: Record<DayState, number> = { open: 0, reservation: 1, blackout: 2 };

/** Resolve every day in an inclusive range for one resort. */
export function resolveRange(
  passId: PassId,
  resort: Resort,
  start: ISODate,
  end: ISODate,
  periodIndex?: Map<ISODate, string>,
): RangeResolution {
  const days = enumerateRange(start, end).map((d) =>
    resolveDay(passId, resort, d, periodIndex),
  );
  const counts = { open: 0, blackout: 0, reservation: 0 };
  let summary: DayState = "open";
  for (const d of days) {
    counts[d.state]++;
    if (WORST[d.state] > WORST[summary]) summary = d.state;
  }
  return { resort, days, summary, counts };
}

/** Resolve a whole network for a range — used by the global checker & matrix. */
export function resolveAll(
  data: IndyData,
  passId: PassId,
  start: ISODate,
  end: ISODate,
): RangeResolution[] {
  const idx = buildPeriodIndex(data.periods);
  return data.resorts.map((r) => resolveRange(passId, r, start, end, idx));
}

/** For the inverse "what's open on this single day" view. */
export function resolveSingleDay(
  data: IndyData,
  passId: PassId,
  date: ISODate,
): { resort: Resort; res: DayResolution }[] {
  const idx = buildPeriodIndex(data.periods);
  return data.resorts.map((r) => ({
    resort: r,
    res: resolveDay(passId, r, date, idx),
  }));
}

/** Does a lodging deal clear BOTH the resort and the property for a stay? */
export function lodgingClears(
  blackoutNights: ISODate[],
  stayNights: ISODate[],
): boolean {
  const set = new Set(blackoutNights);
  return !stayNights.some((n) => set.has(n));
}
