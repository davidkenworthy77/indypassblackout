import type { WidgetContext } from "../main.js";
import type { PassId } from "../../../core/types.js";
import { planTrip } from "../../../core/planner.js";
import { resolveDay, buildPeriodIndex } from "../../../core/resolver.js";
import { formatShort } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, reservationDetail,
  DEFAULT_START, DEFAULT_END,
} from "../ui.js";

export function mountPlanner(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);

  let pass: PassId = "indy_base";
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  const chosen = new Set<string>();
  const MAX = 4;

  const results = h("div");
  const msWrap = h("div", { class: "indy-multiselect" });

  function renderChips() {
    clear(msWrap);
    for (const r of data.resorts) {
      const on = chosen.has(r.node_id);
      const disabled = !on && chosen.size >= MAX;
      msWrap.appendChild(h("div", {
        class: "indy-ms-chip",
        "aria-pressed": on ? "true" : "false",
        "aria-disabled": disabled ? "true" : "false",
        onclick: () => {
          if (on) chosen.delete(r.node_id);
          else if (chosen.size < MAX) chosen.add(r.node_id);
          renderChips();
          render();
        },
      }, [r.name]));
    }
  }

  function render() {
    clear(results);
    if (chosen.size < 2) {
      results.appendChild(h("div", { class: "indy-empty" }, ["Pick 2–4 resorts above to build a day-by-day plan."]));
      return;
    }
    if (start > end) { results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."])); return; }

    const plan = planTrip(data, pass, start, end, [...chosen]);

    // Headline.
    if (plan.workable) {
      results.appendChild(h("div", { class: "indy-banner open" }, [
        h("div", { class: "indy-banner__icon" }, ["✓"]),
        h("div", {}, [
          h("div", { class: "indy-banner__title" }, ["The trip works"]),
          h("div", { class: "indy-banner__note" }, ["Every day has an open resort. Suggested split below."]),
        ]),
      ]));
    } else {
      results.appendChild(h("div", { class: "indy-banner blackout" }, [
        h("div", { class: "indy-banner__icon" }, ["✕"]),
        h("div", {}, [
          h("div", { class: "indy-banner__title" }, [`${plan.blockedDays.length} day(s) can't be covered`]),
          h("div", { class: "indy-banner__note" }, ["Every chosen resort is blacked out on those days. Unlocks below."]),
        ]),
      ]));
    }

    const plist = h("div", { class: "indy-plan", style: "margin-top:14px" });
    for (const day of plan.days) {
      const optionChips = h("div", { class: "indy-plan-day__options" });
      for (const o of day.options) {
        optionChips.appendChild(h("span", { class: `indy-chip ${o.state}` }, [o.resort.name]));
      }
      const right = h("div", {}, [
        day.blocked
          ? h("div", { class: "indy-plan-day__assign" }, [h("b", {}, ["No open resort this day"])])
          : h("div", { class: "indy-plan-day__assign" }, [
              "Ski ", h("b", {}, [day.assigned!.name]),
              day.assignedState === "reservation" ? " (reservation required)" : "",
            ]),
        optionChips,
      ]);
      const row = h("div", { class: `indy-plan-day ${day.blocked ? "blocked" : ""}` }, [
        h("div", { class: "indy-plan-day__date" }, [formatShort(day.date)]),
        right,
      ]);
      plist.appendChild(row);
      // Surface reservation booking info on assigned reservation days.
      if (!day.blocked && day.assignedState === "reservation") {
        const res = resolveDay(pass, day.assigned!, day.date, idx).reservation;
        if (res) plist.appendChild(reservationDetail(res));
      }
    }
    results.appendChild(plist);

    if (!plan.workable) {
      const unlocks = h("ul", { style: "margin:12px 0 0;padding-left:20px;line-height:1.7" }, [
        h("li", {}, ["Switch to an Indy+ pass — it ignores blackouts entirely."]),
        h("li", {}, ["Shift a date by a day to dodge the peak window."]),
        h("li", {}, ["Add another nearby resort with different blackout dates."]),
      ]);
      results.appendChild(h("div", { class: "indy-footnote" }, ["Try one of these:"]));
      results.appendChild(unlocks);
    }
    if (plan.unusedResorts.length) {
      results.appendChild(h("div", { class: "indy-footnote" }, [
        `Not needed for this trip: ${plan.unusedResorts.map((r) => r.name).join(", ")}.`,
      ]));
    }
  }

  renderChips();
  render();
  el.appendChild(card(
    "Multi-resort trip planner",
    "Considering a few resorts for one trip? Pick your pass, dates and 2–4 resorts — we'll fit them around the blackouts.",
    h("div", {}, [
      h("div", { class: "indy-controls cols-3" }, [
        field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
        field("Arrive", dateInput(start, (v) => { start = v; render(); })),
        field("Depart", dateInput(end, (v) => { end = v; render(); })),
      ]),
      h("div", { class: "indy-field", style: "margin-top:12px" }, [
        h("label", {}, ["Resorts (pick 2–4)"]), msWrap,
      ]),
      h("div", { style: "margin-top:16px" }, [results]),
    ]),
  ));
}
