// Canonical data contract for the Indy Pass Blackout & Reservation Checker.
// Everything the widgets consume is described here. The Google Sheet sync
// (Option A) and the admin app (Option B) both PRODUCE data in this shape;
// the widgets never know which one produced it.

/** ISO date string, e.g. "2026-01-17". */
export type ISODate = string;

/** A named blackout period (Christmas, MLK, Peak Saturdays, ...). */
export interface Period {
  label: string;
  /** Inclusive [start, end] ranges. */
  ranges?: [ISODate, ISODate][];
  /** Explicit individual dates (used for Peak Saturdays / Sundays). */
  dates?: ISODate[];
}

export type PeriodMap = Record<string, Period>;

export type ReservationStatus = "none" | "voluntary" | "required";

export type ReservationMethod =
  | "online"
  | "form"
  | "email"
  | "phone"
  | "walkin"
  | "see_resort_page"
  | "voluntary";

export interface Reservation {
  status: ReservationStatus;
  method: ReservationMethod;
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  instructions?: string | null;
  /** Free-text lead time, e.g. "48h". */
  lead_time?: string | null;
}

/** One pass-tier dataset for a resort: its blackouts + its reservation rule. */
export interface ResortDataset {
  /** Canonical, fully-resolved list of ISO blackout dates. */
  blackout_dates: ISODate[];
  reservation: Reservation;
}

export interface LodgingDeal {
  property: string;
  discount: string;
  promo_code?: string | null;
  booking_method: "online" | "phone" | "email" | "walkin";
  url?: string | null;
  phone?: string | null;
  email?: string | null;
  min_nights?: number | null;
  /** Nights the property itself is unavailable, independent of lift blackouts. */
  blackout_dates: ISODate[];
  notes?: string | null;
}

export interface Resort {
  /** Drupal node ID — the unique key the widgets embed with. */
  node_id: string;
  slug: string;
  name: string;
  region: string;
  standard: ResortDataset;
  ltt: ResortDataset;
  lodging: LodgingDeal[];
}

export interface IndyData {
  season: string;
  periods: PeriodMap;
  resorts: Resort[];
}

// ---------------------------------------------------------------------------
// Passes — two independent axes: does it observe blackouts, and which
// reservation dataset applies. Keep these separate (the brief's core rule).
// ---------------------------------------------------------------------------

export type PassId =
  | "indy_plus"
  | "indy_plus_addon"
  | "indy_base"
  | "indy_base_addon"
  | "employee"
  | "ltt";

/** Which dataset a pass reads for blackouts / reservations. */
export type Dataset = "standard" | "ltt";

export interface PassDef {
  id: PassId;
  label: string;
  shortLabel: string;
  /** Does this pass ever hit a blackout? */
  observesBlackouts: boolean;
  /** Which dataset supplies the blackout list (only used if observesBlackouts). */
  blackoutDataset: Dataset;
  /** Which dataset supplies reservation rules. */
  reservationDataset: Dataset;
}

export const PASSES: PassDef[] = [
  {
    id: "indy_plus",
    label: "Indy+ Pass",
    shortLabel: "Indy+",
    observesBlackouts: false,
    blackoutDataset: "standard",
    reservationDataset: "standard",
  },
  {
    id: "indy_plus_addon",
    label: "Indy+ Add-On",
    shortLabel: "Indy+ Add-On",
    observesBlackouts: false,
    blackoutDataset: "standard",
    reservationDataset: "standard",
  },
  {
    id: "indy_base",
    label: "Indy Base Pass",
    shortLabel: "Indy Base",
    observesBlackouts: true,
    blackoutDataset: "standard",
    reservationDataset: "standard",
  },
  {
    id: "indy_base_addon",
    label: "Indy Base Add-On",
    shortLabel: "Base Add-On",
    observesBlackouts: true,
    blackoutDataset: "standard",
    reservationDataset: "standard",
  },
  {
    id: "employee",
    label: "Employee Pass",
    shortLabel: "Employee",
    observesBlackouts: true,
    blackoutDataset: "standard",
    reservationDataset: "standard",
  },
  {
    id: "ltt",
    label: "Learn to Turn (LTT)",
    shortLabel: "LTT",
    observesBlackouts: true,
    blackoutDataset: "ltt",
    reservationDataset: "ltt",
  },
];

export function getPass(id: PassId): PassDef {
  const p = PASSES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown pass: ${id}`);
  return p;
}
