import type { PeriodMap } from "./types.js";

// The named blackout windows for the 25/26 season, exactly as encoded in the
// brief. The resolver never works off these labels — they exist so the admin
// UI can offer fast-fill and the calendar can show a human reason for a date.
export const SEASON = "25-26";

export const PERIODS_25_26: PeriodMap = {
  christmas_new_years: {
    label: "Christmas / New Year's",
    ranges: [["2025-12-20", "2026-01-04"]],
  },
  mlk_weekend: {
    label: "MLK Weekend",
    ranges: [["2026-01-17", "2026-01-19"]],
  },
  presidents_weekend: {
    label: "President's Weekend",
    ranges: [["2026-02-14", "2026-02-16"]],
  },
  peak_saturdays: {
    label: "Peak Saturdays",
    dates: [
      "2026-01-10",
      "2026-01-17",
      "2026-01-24",
      "2026-01-31",
      "2026-02-07",
      "2026-02-14",
      "2026-02-21",
      "2026-02-28",
      "2026-03-07",
    ],
  },
  peak_sundays: {
    label: "Peak Sundays",
    dates: [
      "2026-01-11",
      "2026-01-18",
      "2026-01-25",
      "2026-02-01",
      "2026-02-08",
      "2026-02-15",
      "2026-02-22",
      "2026-03-01",
      "2026-03-08",
    ],
  },
};

/** The canonical order/keys used by the sheet template columns. */
export const PERIOD_KEYS = Object.keys(PERIODS_25_26);
