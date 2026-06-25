import type { IndyData, ISODate, PassId, Resort } from "./types.js";
import { enumerateRange } from "./dates.js";
import { buildPeriodIndex, resolveDay, type DayState } from "./resolver.js";

// Multi-resort planner. The search space is tiny (a handful of resorts over a
// few days), so we just resolve every day against every chosen resort and
// greedily assign each day to its best available resort.

export interface PlannedDay {
  date: ISODate;
  /** Per-resort state for this day. */
  options: { resort: Resort; state: DayState }[];
  /** The resort we suggest skiing this day (best available), or null. */
  assigned: Resort | null;
  assignedState: DayState | null;
  /** True when no chosen resort is skiable this day. */
  blocked: boolean;
}

export interface PlanResult {
  days: PlannedDay[];
  /** Days nobody could cover. */
  blockedDays: ISODate[];
  /** Resorts that ended up unused across the whole trip. */
  unusedResorts: Resort[];
  workable: boolean;
}

const RANK: Record<DayState, number> = { open: 0, reservation: 1, blackout: 2 };

export function planTrip(
  data: IndyData,
  passId: PassId,
  start: ISODate,
  end: ISODate,
  resortNodeIds: string[],
): PlanResult {
  const idx = buildPeriodIndex(data.periods);
  const resorts = resortNodeIds
    .map((id) => data.resorts.find((r) => r.node_id === id))
    .filter((r): r is Resort => Boolean(r));

  const dates = enumerateRange(start, end);
  const usage = new Map<string, number>(); // node_id -> days assigned (spread the love)
  const days: PlannedDay[] = [];
  const blockedDays: ISODate[] = [];

  for (const date of dates) {
    const options = resorts.map((resort) => ({
      resort,
      state: resolveDay(passId, resort, date, idx).state,
    }));

    // Candidates that are skiable today (open or reservation).
    const skiable = options.filter((o) => o.state !== "blackout");
    skiable.sort((a, b) => {
      // Prefer open over reservation; then the least-used resort for variety.
      if (RANK[a.state] !== RANK[b.state]) return RANK[a.state] - RANK[b.state];
      return (usage.get(a.resort.node_id) ?? 0) - (usage.get(b.resort.node_id) ?? 0);
    });

    const pick = skiable[0] ?? null;
    if (pick) usage.set(pick.resort.node_id, (usage.get(pick.resort.node_id) ?? 0) + 1);
    else blockedDays.push(date);

    days.push({
      date,
      options,
      assigned: pick?.resort ?? null,
      assignedState: pick?.state ?? null,
      blocked: !pick,
    });
  }

  const unusedResorts = resorts.filter((r) => !usage.has(r.node_id));
  return {
    days,
    blockedDays,
    unusedResorts,
    workable: blockedDays.length === 0,
  };
}
