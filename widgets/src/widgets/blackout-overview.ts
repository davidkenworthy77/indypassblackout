import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { getPass } from "../../../core/types.js";
import { resolveRange, buildPeriodIndex, type RangeResolution, type DayState } from "../../../core/resolver.js";
import { expandPeriod } from "../../../core/resolve-periods.js";
import { formatShort, toDayNum } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill, reservationDetail,
} from "../ui.js";

// VARIANT of the checker (for discussion). With no dates chosen it shows the
// at-a-glance blackout grid from the PDF — every resort and the key periods it
// blacks out. Choosing dates switches it into the same precise check the main
// checker does.
const PAGE = 10;
const STATES: { key: DayState; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "reservation", label: "Reservation" },
  { key: "blackout", label: "Blacked out" },
];

export function mountBlackoutOverview(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);
  const periodDates = new Map<string, string[]>();
  for (const key of Object.keys(data.periods)) periodDates.set(key, expandPeriod(data.periods, key));

  let pass: PassId = "indy_base";
  let start = "";
  let end = "";
  let limit = PAGE;
  const expanded = new Set<string>();

  const results = h("div");

  // ---- matrix helpers (default no-dates view) ----
  const PERIOD_KEYS = Object.keys(data.periods);
  const SHORT: Record<string, string> = {
    christmas_new_years: "Christmas",
    mlk_weekend: "MLK",
    presidents_weekend: "President's",
    peak_saturdays: "Peak Sat",
    peak_sundays: "Peak Sun",
  };
  const shortLabel = (key: string) => SHORT[key] ?? data.periods[key].label;
  /** "Jan 3" — short month + day, no weekday. */
  const md = (iso: string) => formatShort(iso).replace(/^\w{3}, /, "");
  const span = (key: string) => {
    const d = periodDates.get(key)!;
    return `${md(d[0])} – ${md(d[d.length - 1])}`;
  };

  function blackoutSetFor(resort: Resort): Set<string> {
    const p = getPass(pass);
    if (!p.observesBlackouts) return new Set();
    return new Set(resort[p.blackoutDataset].blackout_dates);
  }

  type CellState = "open" | "blackout" | "partial";
  function cellState(blackouts: Set<string>, key: string): CellState {
    const dates = periodDates.get(key)!;
    let hit = 0;
    for (const d of dates) if (blackouts.has(d)) hit++;
    if (hit === 0) return "open";
    if (hit === dates.length) return "blackout";
    return "partial";
  }

  /** Compress consecutive ISO dates into "Jan 3 – Jan 4" ranges. */
  function formatRanges(isos: string[]): string {
    const sorted = [...isos].sort();
    const out: string[] = [];
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && toDayNum(sorted[j + 1]) === toDayNum(sorted[j]) + 1) j++;
      out.push(j > i ? `${md(sorted[i])} – ${md(sorted[j])}` : md(sorted[i]));
      i = j + 1;
    }
    return out.join(", ");
  }

  /** Notes for partial periods + any blackout dates outside named periods. */
  function resortNotes(blackouts: Set<string>): string {
    const covered = new Set<string>();
    const parts: string[] = [];
    for (const key of PERIOD_KEYS) {
      const dates = periodDates.get(key)!;
      const inP = dates.filter((d) => blackouts.has(d));
      inP.forEach((d) => covered.add(d));
      if (inP.length > 0 && inP.length < dates.length) {
        parts.push(`${shortLabel(key)}: ${formatRanges(inP)}`);
      }
    }
    const other = [...blackouts].filter((d) => !covered.has(d));
    if (other.length) parts.push(`Other: ${formatRanges(other)}`);
    return parts.join(" · ");
  }

  function countPills(rr: RangeResolution): HTMLElement {
    const wrap = h("div", { class: "indy-result__pills" });
    for (const s of STATES) {
      const n = rr.counts[s.key];
      if (!n) continue;
      wrap.appendChild(h("span", { class: `indy-pill indy-state-${s.key}` }, [
        `${s.label} · ${n} day${n > 1 ? "s" : ""}`,
      ]));
    }
    return wrap;
  }

  function detailsBody(resort: Resort, rr: RangeResolution): HTMLElement {
    const body = h("div", { class: "indy-details" });
    const reservation = resort[getPass(pass).reservationDataset].reservation;
    if (reservation.status !== "none") body.appendChild(reservationDetail(reservation));
    const list = h("div", { class: "indy-list", style: "margin-top:10px" });
    for (const d of rr.days) {
      list.appendChild(h("div", { class: "indy-row" }, [
        h("div", {}, [
          h("div", { class: "indy-row__name" }, [formatShort(d.date)]),
          d.blackoutReason ? h("div", { class: "indy-row__meta" }, [d.blackoutReason]) : null,
        ]),
        statePill(d.state),
      ]));
    }
    body.appendChild(list);
    return body;
  }

  // ---- default (no dates) overview: the PDF-style blackout grid ----
  function renderOverview() {
    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `Blackout grid for the ${getPass(pass).label}. Pick dates above to check a specific trip.`,
    ]));
    results.appendChild(h("div", { class: "indy-cal-legend", style: "margin-bottom:12px" }, [
      h("span", {}, [h("span", { class: "indy-dot open" }), "Open"]),
      h("span", {}, [h("span", { class: "indy-dot blackout" }), "Blacked out"]),
      h("span", {}, [h("span", { class: "indy-dot reservation" }), "Partial — some days (see notes)"]),
    ]));

    const sorted = [...data.resorts].sort((a, b) => a.name.localeCompare(b.name));
    const table = h("table", { class: "indy-matrix indy-pmatrix" });

    const hr = h("tr", {}, [h("th", {}, ["Resort"])]);
    for (const key of PERIOD_KEYS) {
      hr.appendChild(h("th", {}, [
        h("div", {}, [shortLabel(key)]),
        h("div", { class: "sub" }, [span(key)]),
      ]));
    }
    hr.appendChild(h("th", { class: "notes-h" }, ["Notes / additional dates"]));
    table.appendChild(h("thead", {}, [hr]));

    const tbody = h("tbody");
    for (const r of sorted) {
      const blackouts = blackoutSetFor(r);
      const reservation = r[getPass(pass).reservationDataset].reservation;
      const nameCell = h("th", {}, [
        h("span", { class: "indy-pmatrix__name" }, [r.name]),
        reservation.status === "required" ? h("span", { class: "indy-restag" }, ["Res"]) : null,
        h("div", { class: "indy-row__meta" }, [r.region]),
      ]);
      const tr = h("tr", {}, [nameCell]);
      for (const key of PERIOD_KEYS) {
        const st = cellState(blackouts, key);
        const label = st === "open" ? "Open" : st === "blackout" ? "Blacked out" : "Partial — some days";
        tr.appendChild(h("td", {}, [
          h("span", { class: `indy-pdot ${st}`, title: `${shortLabel(key)} — ${label}` }),
        ]));
      }
      const notes = resortNotes(blackouts);
      tr.appendChild(h("td", { class: "notes" }, [notes || "—"]));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    results.appendChild(h("div", { class: "indy-matrix-wrap" }, [table]));
  }

  // ---- dates chosen: behave like the checker ----
  function renderResults() {
    if (start > end) {
      results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."]));
      return;
    }
    const rows = data.resorts
      .map((r) => ({ r, rr: resolveRange(pass, r, start, end, idx) }));
    const rank = { open: 0, reservation: 1, blackout: 2 };
    rows.sort((a, b) => rank[a.rr.summary] - rank[b.rr.summary] || a.r.name.localeCompare(b.r.name));

    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `${rows.length} resorts · ${formatShort(start)} – ${formatShort(end)}`,
    ]));
    const list = h("div", { class: "indy-list" });
    for (const { r, rr } of rows.slice(0, limit)) {
      const isOpen = expanded.has(r.node_id);
      const toggle = () => { isOpen ? expanded.delete(r.node_id) : expanded.add(r.node_id); render(); };
      const head = h("div", { class: "indy-result__head", onclick: toggle }, [
        h("div", { class: "indy-result__id" }, [
          h("div", { class: "indy-row__name" }, [r.name]),
          h("div", { class: "indy-row__meta" }, [r.region]),
        ]),
        countPills(rr),
        h("button", { class: "indy-details-toggle", onclick: (e: Event) => { e.stopPropagation(); toggle(); } }, [
          isOpen ? "Details −" : "Details +",
        ]),
      ]);
      const result = h("div", { class: `indy-result ${isOpen ? "open" : ""}` }, [head]);
      if (isOpen) result.appendChild(detailsBody(r, rr));
      list.appendChild(result);
    }
    results.appendChild(list);
    if (rows.length > limit) {
      results.appendChild(h("div", { style: "text-align:center;margin-top:14px" }, [
        h("button", { class: "indy-btn", onclick: () => { limit += PAGE; render(); } }, [
          `Load more (${rows.length - limit} more)`,
        ]),
      ]));
    }
  }

  function render() {
    clear(results);
    const hasDates = Boolean(start && end);
    if (hasDates) renderResults();
    else renderOverview();
  }

  function clearDates() { start = ""; end = ""; limit = PAGE; render(); renderControls(); }

  const controlsWrap = h("div");
  function renderControls() {
    clear(controlsWrap);
    const row = h("div", { class: "indy-controls cols-3" }, [
      field("Your pass", passSelect(pass, (v) => { pass = v; limit = PAGE; render(); })),
      field("Arrive", dateInput(start, (v) => { start = v; limit = PAGE; render(); renderControls(); })),
      field("Depart", dateInput(end, (v) => { end = v; limit = PAGE; render(); renderControls(); })),
    ]);
    controlsWrap.appendChild(row);
    if (start || end) {
      controlsWrap.appendChild(h("button", {
        class: "indy-btn indy-btn--ghost", style: "margin-top:8px", onclick: clearDates,
      }, ["← Clear dates · show all blackout periods"]));
    }
  }

  renderControls();
  render();
  el.appendChild(card(
    "Resort blackout overview",
    "Browse every resort's blackout periods, or pick dates to check a trip. (Variant for discussion.)",
    h("div", {}, [controlsWrap, h("div", { style: "margin-top:16px" }, [results])]),
  ));
}
