// Option A — Google Sheet -> data.json sync.
//
// Reads the five published CSV tabs (the same shape the client edits in the
// Sheet) and emits the canonical data.json the widgets consume. The
// period-to-date resolution is shared with the rest of the system via
// core/resolve-periods, so the Sheet path and the admin path can never drift.
//
//   Usage:  tsx sync/sync.ts [sheetDir] [outFile]
//   Default: reads ./sheet-template, writes ./data/data.json

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { parseCSV, type Row } from "./csv.js";
import { PERIODS_25_26, SEASON } from "../core/periods.js";
import {
  normalizeFlag,
  resolveBlackoutRow,
  parseAdditionalDates,
  type CellFlag,
} from "../core/resolve-periods.js";
import { PERIOD_KEYS } from "../core/periods.js";
import type {
  IndyData,
  LodgingDeal,
  Reservation,
  ReservationMethod,
  ReservationStatus,
  Resort,
  ResortDataset,
} from "../core/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sheetDir = resolve(process.argv[2] ?? join(root, "sheet-template"));
const outFile = resolve(process.argv[3] ?? join(root, "data", "data.json"));

const warnings: string[] = [];
const warn = (m: string) => warnings.push(m);

function read(file: string): Row[] {
  try {
    return parseCSV(readFileSync(join(sheetDir, file), "utf8"));
  } catch {
    warn(`Could not read ${file} — treating as empty.`);
    return [];
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blackoutRowFromCsv(r: Row): { flags: Record<string, CellFlag>; additional: string } {
  const flags: Record<string, CellFlag> = {};
  for (const key of PERIOD_KEYS) flags[key] = normalizeFlag(r[key]);
  return { flags, additional: r.additional_dates ?? "" };
}

const VALID_STATUS: ReservationStatus[] = ["none", "voluntary", "required"];
const VALID_METHOD: ReservationMethod[] = [
  "online", "form", "email", "phone", "walkin", "see_resort_page", "voluntary",
];

function reservationFromCsv(r: Row | undefined, who: string): Reservation {
  if (!r) return { status: "none", method: "voluntary" };
  const status = (r.status || "none").toLowerCase() as ReservationStatus;
  const method = (r.method || "voluntary").toLowerCase() as ReservationMethod;
  if (!VALID_STATUS.includes(status)) warn(`${who}: unknown status "${r.status}"`);
  if (!VALID_METHOD.includes(method)) warn(`${who}: unknown method "${r.method}"`);
  return {
    status: VALID_STATUS.includes(status) ? status : "none",
    method: VALID_METHOD.includes(method) ? method : "voluntary",
    url: r.url || null,
    phone: r.phone || null,
    email: r.email || null,
    instructions: r.instructions || null,
    lead_time: r.lead_time || null,
  };
}

function build(): IndyData {
  const stdBlackouts = read("01-standard-blackouts.csv");
  const lttBlackouts = read("02-ltt-blackouts.csv");
  const stdRes = read("03-standard-reservations.csv");
  const lttRes = read("04-ltt-reservations.csv");
  const lodging = read("05-lodging.csv");

  // Index helpers.
  const byNode = <T extends Row>(rows: T[]) => {
    const m = new Map<string, T>();
    for (const r of rows) if (r.node_id) m.set(r.node_id, r);
    return m;
  };
  const stdBlackMap = byNode(stdBlackouts);
  const lttBlackMap = byNode(lttBlackouts);
  const stdResMap = byNode(stdRes);
  const lttResMap = byNode(lttRes);

  const lodgingByNode = new Map<string, LodgingDeal[]>();
  for (const r of lodging) {
    if (!r.node_id) continue;
    const deal: LodgingDeal = {
      property: r.property,
      discount: r.discount,
      promo_code: r.promo_code || null,
      booking_method: (r.booking_method || "online") as LodgingDeal["booking_method"],
      url: r.url || null,
      phone: r.phone || null,
      email: r.email || null,
      min_nights: r.min_nights ? Number(r.min_nights) : null,
      blackout_dates: parseAdditionalDates(r.lodging_blackout_dates),
      notes: r.notes || null,
    };
    const list = lodgingByNode.get(r.node_id) ?? [];
    list.push(deal);
    lodgingByNode.set(r.node_id, list);
  }

  // Union of every node_id seen anywhere.
  const allNodes = new Set<string>([
    ...stdBlackMap.keys(),
    ...lttBlackMap.keys(),
    ...stdResMap.keys(),
    ...lttResMap.keys(),
    ...lodgingByNode.keys(),
  ]);

  const resorts: Resort[] = [];
  for (const node_id of allNodes) {
    // Name/region come from whichever tab has them.
    const nameRow = stdBlackMap.get(node_id) ?? lttBlackMap.get(node_id)
      ?? stdResMap.get(node_id) ?? lttResMap.get(node_id);
    const name = nameRow?.resort_name?.trim() || `Resort ${node_id}`;
    const region =
      stdBlackMap.get(node_id)?.region?.trim() ||
      lttBlackMap.get(node_id)?.region?.trim() ||
      "Unknown";

    const empty: ResortDataset["blackout_dates"] = [];

    const standard: ResortDataset = {
      blackout_dates: stdBlackMap.has(node_id)
        ? resolveBlackoutRow(PERIODS_25_26, blackoutRowFromCsv(stdBlackMap.get(node_id)!))
        : empty.slice(),
      reservation: reservationFromCsv(stdResMap.get(node_id), `${name} (standard)`),
    };
    const ltt: ResortDataset = {
      blackout_dates: lttBlackMap.has(node_id)
        ? resolveBlackoutRow(PERIODS_25_26, blackoutRowFromCsv(lttBlackMap.get(node_id)!))
        : empty.slice(),
      reservation: reservationFromCsv(lttResMap.get(node_id), `${name} (ltt)`),
    };

    resorts.push({
      node_id,
      slug: slugify(name),
      name,
      region,
      standard,
      ltt,
      lodging: lodgingByNode.get(node_id) ?? [],
    });
  }

  resorts.sort((a, b) => a.name.localeCompare(b.name));
  return { season: SEASON, periods: PERIODS_25_26, resorts };
}

const data = build();
writeFileSync(outFile, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`✓ Wrote ${data.resorts.length} resorts -> ${outFile}`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
