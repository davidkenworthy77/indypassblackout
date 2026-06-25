import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { getPass } from "../../../core/types.js";
import { resolveRange, buildPeriodIndex, type RangeResolution, type DayState } from "../../../core/resolver.js";
import { expandPeriod } from "../../../core/resolve-periods.js";
import { formatShort } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill,
  reservationDetail, DEFAULT_START, DEFAULT_END,
} from "../ui.js";

const PAGE = 10;
const STATES: { key: DayState; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "reservation", label: "Reservation required" },
  { key: "blackout", label: "Blacked out" },
];

export function mountChecker(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);
  // Precompute each named period's date set for the "key dates" filter.
  const periodDates = new Map<string, Set<string>>();
  for (const key of Object.keys(data.periods)) {
    periodDates.set(key, new Set(expandPeriod(data.periods, key)));
  }

  let pass: PassId = "indy_base";
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  let query = "";
  let filtersOpen = false;
  let limit = PAGE;
  const stateFilter = new Set<DayState>(["open", "reservation", "blackout"]);
  const periodFilter = new Set<string>();
  const expanded = new Set<string>();

  const results = h("div");
  const filterPanel = h("div", { class: "indy-filter-panel" });

  const search = h("input", {
    type: "text",
    placeholder: "Search a resort (optional)…",
    oninput: (e: Event) => { query = (e.target as HTMLInputElement).value; limit = PAGE; render(); },
  });

  // ---- filters ----
  function chip(label: string, on: boolean, onToggle: () => void): HTMLElement {
    return h("div", {
      class: "indy-ms-chip", "aria-pressed": on ? "true" : "false",
      onclick: () => { onToggle(); limit = PAGE; render(); renderFilters(); },
    }, [label]);
  }

  function renderFilters() {
    clear(filterPanel);
    if (!filtersOpen) return;
    const stateGroup = h("div", { class: "indy-filter-group" });
    stateGroup.appendChild(h("div", { class: "indy-filter-label" }, ["Show"]));
    const stateChips = h("div", { class: "indy-multiselect" });
    for (const s of STATES) {
      stateChips.appendChild(chip(s.label, stateFilter.has(s.key), () => {
        if (stateFilter.has(s.key)) stateFilter.delete(s.key);
        else stateFilter.add(s.key);
      }));
    }
    stateGroup.appendChild(stateChips);

    const periodGroup = h("div", { class: "indy-filter-group" });
    periodGroup.appendChild(h("div", { class: "indy-filter-label" }, ["Affected over these key dates"]));
    const periodChips = h("div", { class: "indy-multiselect" });
    for (const key of Object.keys(data.periods)) {
      periodChips.appendChild(chip(data.periods[key].label, periodFilter.has(key), () => {
        if (periodFilter.has(key)) periodFilter.delete(key);
        else periodFilter.add(key);
      }));
    }
    periodGroup.appendChild(periodChips);

    filterPanel.appendChild(stateGroup);
    filterPanel.appendChild(periodGroup);
    filterPanel.appendChild(h("button", {
      class: "indy-btn indy-btn--ghost", style: "margin-top:4px",
      onclick: () => {
        stateFilter.clear(); STATES.forEach((s) => stateFilter.add(s.key));
        periodFilter.clear(); limit = PAGE; render(); renderFilters();
      },
    }, ["Clear filters"]));
  }

  // ---- count pills, e.g. "Open · 2 days" "Blacked out · 1 day" ----
  function countPills(rr: RangeResolution): HTMLElement {
    const wrap = h("div", { class: "indy-result__pills" });
    for (const s of STATES) {
      const n = rr.counts[s.key];
      if (!n) continue;
      wrap.appendChild(h("span", { class: `indy-pill indy-state-${s.key}` }, [
        `${s.label === "Reservation required" ? "Reservation" : s.label} · ${n} day${n > 1 ? "s" : ""}`,
      ]));
    }
    return wrap;
  }

  function detailsBody(resort: Resort, rr: RangeResolution): HTMLElement {
    const body = h("div", { class: "indy-details" });
    const reservation = resort[getPass(pass).reservationDataset].reservation;
    if (reservation.status === "required" || reservation.status === "voluntary") {
      body.appendChild(reservationDetail(reservation));
    }
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

  function resortBlackoutSet(resort: Resort): Set<string> {
    const p = getPass(pass);
    if (!p.observesBlackouts) return new Set();
    return new Set(resort[p.blackoutDataset].blackout_dates);
  }

  function passesPeriodFilter(resort: Resort): boolean {
    if (!periodFilter.size) return true;
    const blackouts = resortBlackoutSet(resort);
    for (const key of periodFilter) {
      const set = periodDates.get(key)!;
      for (const d of set) if (blackouts.has(d)) return true;
    }
    return false;
  }

  function passesStateFilter(rr: RangeResolution): boolean {
    if (stateFilter.size === STATES.length) return true;
    for (const s of stateFilter) if (rr.counts[s] > 0) return true;
    return false;
  }

  function render() {
    clear(results);
    if (start > end) {
      results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."]));
      return;
    }

    const q = query.trim().toLowerCase();
    const rows = data.resorts
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q))
      .map((r) => ({ r, rr: resolveRange(pass, r, start, end, idx) }))
      .filter(({ r, rr }) => passesStateFilter(rr) && passesPeriodFilter(r));

    const rank = { open: 0, reservation: 1, blackout: 2 };
    rows.sort((a, b) => rank[a.rr.summary] - rank[b.rr.summary] || a.r.name.localeCompare(b.r.name));

    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `${rows.length} resort${rows.length === 1 ? "" : "s"} · ${formatShort(start)} – ${formatShort(end)}`,
    ]));

    if (!rows.length) {
      results.appendChild(h("div", { class: "indy-empty" }, ["No resorts match your search and filters."]));
      return;
    }

    const list = h("div", { class: "indy-list" });
    for (const { r, rr } of rows.slice(0, limit)) {
      const isOpen = expanded.has(r.node_id);
      const toggle = () => {
        if (expanded.has(r.node_id)) expanded.delete(r.node_id);
        else expanded.add(r.node_id);
        render();
      };
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

  const filterToggle = h("button", {
    class: "indy-filter-toggle",
    onclick: () => { filtersOpen = !filtersOpen; filterToggle.setAttribute("aria-pressed", filtersOpen ? "true" : "false"); renderFilters(); },
  }, ["⚲ Filters"]);

  const controls = h("div", {}, [
    h("div", { class: "indy-controls cols-3" }, [
      field("Your pass", passSelect(pass, (v) => { pass = v; limit = PAGE; render(); })),
      field("Arrive", dateInput(start, (v) => { start = v; limit = PAGE; render(); })),
      field("Depart", dateInput(end, (v) => { end = v; limit = PAGE; render(); })),
    ]),
    h("div", { class: "indy-controls cols-2", style: "margin-top:12px;align-items:end" }, [
      field("Search resort", search),
      h("div", { class: "indy-field" }, [h("label", {}, ["Refine"]), filterToggle]),
    ]),
    filterPanel,
  ]);

  renderFilters();
  render();
  el.appendChild(card(
    "Blackout & reservation checker",
    "Pick your pass and dates. Search or filter to find what's open across the network.",
    h("div", {}, [controls, h("div", { style: "margin-top:16px" }, [results])]),
  ));
}
