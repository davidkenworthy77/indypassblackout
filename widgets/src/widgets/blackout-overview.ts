import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { getPass } from "../../../core/types.js";
import { resolveRange, buildPeriodIndex, type RangeResolution, type DayState } from "../../../core/resolver.js";
import { expandPeriod } from "../../../core/resolve-periods.js";
import { formatShort } from "../../../core/dates.js";
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

  // Which named periods (and whether "other" dates) a resort blacks out.
  function resortPeriods(resort: Resort): { labels: string[]; other: boolean; total: number } {
    const p = getPass(pass);
    if (!p.observesBlackouts) return { labels: [], other: false, total: 0 };
    const blackouts = new Set(resort[p.blackoutDataset].blackout_dates);
    const labels: string[] = [];
    const covered = new Set<string>();
    for (const key of Object.keys(data.periods)) {
      const dates = periodDates.get(key)!;
      let hit = false;
      for (const d of dates) if (blackouts.has(d)) { hit = true; covered.add(d); }
      if (hit) labels.push(data.periods[key].label);
    }
    const other = [...blackouts].some((d) => !covered.has(d));
    return { labels, other, total: blackouts.size };
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

  // ---- default (no dates) overview ----
  function renderOverview() {
    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `Every resort's blackout periods for the ${getPass(pass).label}. Pick dates above to check a specific trip.`,
    ]));
    const list = h("div", { class: "indy-list" });
    const sorted = [...data.resorts].sort((a, b) => a.name.localeCompare(b.name));
    for (const r of sorted) {
      const { labels, other, total } = resortPeriods(r);
      const chips = h("div", { class: "indy-overview__chips" });
      if (total === 0) {
        chips.appendChild(h("span", { class: "indy-pill indy-state-open" }, ["No blackouts"]));
      } else {
        for (const label of labels) chips.appendChild(h("span", { class: "indy-chip period" }, [label]));
        if (other) chips.appendChild(h("span", { class: "indy-chip period" }, ["Other dates"]));
      }
      const reservation = r[getPass(pass).reservationDataset].reservation;
      if (reservation.status === "required") chips.appendChild(h("span", { class: "indy-chip reservation" }, ["Reservation"]));

      list.appendChild(h("div", { class: "indy-overview__row" }, [
        h("div", { class: "indy-overview__id" }, [
          h("div", { class: "indy-row__name" }, [r.name]),
          h("div", { class: "indy-row__meta" }, [r.region]),
        ]),
        chips,
      ]));
    }
    results.appendChild(list);
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
