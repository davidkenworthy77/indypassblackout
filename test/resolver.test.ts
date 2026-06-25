// Lightweight assertion tests for the core resolver + period resolution.
// Run with: npm test
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { PERIODS_25_26 } from "../core/periods.js";
import { resolveBlackoutRow, parseAdditionalDates, normalizeFlag } from "../core/resolve-periods.js";
import { resolveDay, resolveRange, buildPeriodIndex } from "../core/resolver.js";
import { planTrip } from "../core/planner.js";
import type { IndyData, Resort } from "../core/types.js";

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; } else { failed++; console.error(`  ✗ ${msg}`); }
}
function eq<T>(a: T, b: T, msg: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const data: IndyData = JSON.parse(
  readFileSync(resolve(__dirname, "../data/data.json"), "utf8"),
);
const byName = (n: string) => data.resorts.find((r) => r.name === n) as Resort;
const idx = buildPeriodIndex(data.periods);

// --- period resolution ---------------------------------------------------
const cannon = byName("Cannon Mountain");
ok(!!cannon, "Cannon Mountain present in seed");
// Cannon: PARTIAL Christmas -> NOT the whole window; only the additional dates.
ok(!cannon.standard.blackout_dates.includes("2025-12-25"), "Cannon PARTIAL Christmas excludes 12/25");
ok(cannon.standard.blackout_dates.includes("2026-01-03"), "Cannon additional 01/03 present");
ok(cannon.standard.blackout_dates.includes("2026-01-04"), "Cannon additional 01/04 present");
// X MLK -> whole window.
ok(cannon.standard.blackout_dates.includes("2026-01-17"), "Cannon MLK 01/17 blacked");
ok(cannon.standard.blackout_dates.includes("2026-01-19"), "Cannon MLK 01/19 blacked");

// --- pass axes ------------------------------------------------------------
// Indy+ never hits a blackout, but still reservation-required where required.
eq(resolveDay("indy_plus", cannon, "2026-01-17", idx).state, "reservation",
  "Indy+ on Cannon MLK = reservation (blackout drops, reservation stays)");
eq(resolveDay("indy_base", cannon, "2026-01-17", idx).state, "blackout",
  "Indy Base on Cannon MLK = blackout");
// Open day for base, reservation-required resort -> reservation.
eq(resolveDay("indy_base", cannon, "2026-03-15", idx).state, "reservation",
  "Indy Base on Cannon open day = reservation (Cannon requires reservations)");

// Voluntary stays green.
const blacktail = byName("Blacktail Mountain");
eq(resolveDay("indy_base", blacktail, "2026-03-15", idx).state, "open",
  "Blacktail voluntary = open");
ok(resolveDay("indy_base", blacktail, "2026-03-15", idx).reservation?.status === "voluntary",
  "Blacktail carries voluntary reservation detail");

// LTT uses its own dataset.
const waterville = byName("Waterville Valley");
ok(waterville.ltt.blackout_dates.includes("2025-11-30"), "Waterville LTT additional 11/30 present");
eq(resolveDay("ltt", waterville, "2025-11-30", idx).state, "blackout",
  "LTT pass on Waterville 11/30 = blackout (LTT dataset)");
eq(resolveDay("indy_base", waterville, "2025-11-30", idx).state, "open",
  "Indy Base on Waterville 11/30 = open (not in standard dataset, no reservation)");

// --- planner: a workable NH split ----------------------------------------
// President's weekend: Cannon blacked (X), Waterville blacked, but pick a peak
// weekend where at least one is open. Use MLK Sun 01/18 (Cannon MLK blacked,
// Waterville MLK blacked) — instead test a range that resolves.
const nhPlan = planTrip(data, "indy_plus", "2026-01-17", "2026-01-19",
  [cannon.node_id, waterville.node_id]);
ok(nhPlan.workable, "Indy+ NH plan over MLK is workable (no blackouts for Indy+)");

const basePlan = planTrip(data, "indy_base", "2026-03-14", "2026-03-15",
  [cannon.node_id, waterville.node_id, byName("Greek Peak").node_id]);
ok(basePlan.workable, "Base plan mid-March is workable");

// --- additional_dates parser ---------------------------------------------
eq(parseAdditionalDates("2026-01-03..2026-01-04"), ["2026-01-03", "2026-01-04"], "ISO range parse");
eq(parseAdditionalDates("1/3/2026"), ["2026-01-03"], "US single parse");
eq(parseAdditionalDates("12/26 - 12/31/25"),
  ["2025-12-26","2025-12-27","2025-12-28","2025-12-29","2025-12-30","2025-12-31"],
  "US range with inherited year");
eq(normalizeFlag("Partial (See Additional)"), "PARTIAL", "PARTIAL flag normalized");
eq(normalizeFlag("BLACKOUT"), "X", "BLACKOUT normalized to X");

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
