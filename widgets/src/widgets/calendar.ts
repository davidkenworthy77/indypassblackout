import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { resolveDay, buildPeriodIndex } from "../../../core/resolver.js";
import { formatShort, formatMonthYear } from "../../../core/dates.js";
import { h, clear, card, field, passSelect, reservationDetail, stateLabel } from "../ui.js";

// Months covered by the calendar (the bulk of the 25-26 season). The view is
// paginated — one month at a time, stepped with the ← → arrows.
const MONTHS: [number, number][] = [
  [2025, 11], [2026, 0], [2026, 1], [2026, 2], [2026, 3],
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function mountCalendar(ctx: WidgetContext) {
  const { data, el } = ctx;
  const nodeId = el.getAttribute("data-resort-node-id") || "";
  const resort = data.resorts.find((r) => r.node_id === nodeId);
  const idx = buildPeriodIndex(data.periods);

  if (!resort) {
    el.appendChild(card("Calendar", null,
      h("div", { class: "indy-error" }, [`No resort found for node ID "${nodeId}".`])));
    return;
  }

  let pass: PassId = "indy_base";
  let monthIdx = 1; // open on January 2026 (where the season gets busy)
  const grid = h("div", { class: "indy-cal-single" });
  const detail = h("div");

  function iso(y: number, m0: number, day: number): string {
    return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function showDetail(date: string) {
    clear(detail);
    const d = resolveDay(pass, resort as Resort, date, idx);
    const box = h("div", { class: "indy-daydetail" }, [
      h("div", { class: "indy-daydetail__date" }, [`${formatShort(date)} — ${stateLabel(d.state)}`]),
    ]);
    if (d.state === "blackout") {
      box.appendChild(h("div", { class: "indy-row__meta" }, [d.blackoutReason ?? "Resort blackout"]));
    } else if (d.state === "reservation" && d.reservation) {
      box.appendChild(reservationDetail(d.reservation));
    } else {
      box.appendChild(h("div", { class: "indy-row__meta" }, [
        d.reservation?.status === "voluntary"
          ? "Open — reservations recommended but not required."
          : "Open — ride freely on this pass.",
      ]));
    }
    detail.appendChild(box);
  }

  function render() {
    clear(grid);
    const [y, m0] = MONTHS[monthIdx];

    const pager = h("div", { class: "indy-cal-pager" }, [
      h("button", {
        class: "indy-cal-nav", "aria-label": "Previous month", disabled: monthIdx === 0,
        onclick: () => { if (monthIdx > 0) { monthIdx--; render(); } },
      }, ["‹"]),
      h("div", { class: "indy-cal-pager__label" }, [formatMonthYear(y, m0)]),
      h("button", {
        class: "indy-cal-nav", "aria-label": "Next month", disabled: monthIdx === MONTHS.length - 1,
        onclick: () => { if (monthIdx < MONTHS.length - 1) { monthIdx++; render(); } },
      }, ["›"]),
    ]);
    grid.appendChild(pager);

    const g = h("div", { class: "indy-cal-grid" });
    for (const d of DOW) g.appendChild(h("div", { class: "indy-cal-dow" }, [d]));
    const startDow = new Date(Date.UTC(y, m0, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    for (let i = 0; i < startDow; i++) g.appendChild(h("div", { class: "indy-cal-day empty" }));
    for (let day = 1; day <= daysInMonth; day++) {
      const date = iso(y, m0, day);
      const st = resolveDay(pass, resort as Resort, date, idx).state;
      g.appendChild(h("div", {
        class: `indy-cal-day ${st}`,
        title: `${formatShort(date)} — ${stateLabel(st)}`,
        onclick: () => showDetail(date),
      }, [String(day)]));
    }
    grid.appendChild(g);

    clear(detail);
    detail.appendChild(h("div", { class: "indy-row__meta", style: "padding:4px 2px" }, ["Click any day to see why."]));
  }

  const legend = h("div", { class: "indy-cal-legend" }, [
    h("span", {}, [h("span", { class: "indy-dot open" }), "Open"]),
    h("span", {}, [h("span", { class: "indy-dot reservation" }), "Reservation required"]),
    h("span", {}, [h("span", { class: "indy-dot blackout" }), "Blacked out"]),
  ]);

  render();
  el.appendChild(card(
    `${(resort as Resort).name} — season calendar`,
    "Switch passes to see the calendar recolour. Indy+ removes blackouts entirely.",
    h("div", {}, [
      h("div", { class: "indy-controls", style: "margin-bottom:6px" }, [
        field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
      ]),
      legend,
      h("div", { style: "margin-top:14px" }, [grid]),
      detail,
    ]),
  ));
}
