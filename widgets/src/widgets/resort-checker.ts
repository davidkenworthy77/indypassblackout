import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { resolveRange, buildPeriodIndex } from "../../../core/resolver.js";
import { formatShort } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill,
  reservationDetail, DEFAULT_START, DEFAULT_END,
} from "../ui.js";

export function mountResortChecker(ctx: WidgetContext) {
  const { data, el } = ctx;
  const nodeId = el.getAttribute("data-resort-node-id") || "";
  const resort = data.resorts.find((r) => r.node_id === nodeId);
  const idx = buildPeriodIndex(data.periods);

  let pass: PassId = "indy_base";
  let start = DEFAULT_START;
  let end = DEFAULT_END;

  if (!resort) {
    el.appendChild(card("Resort checker", null,
      h("div", { class: "indy-error" }, [`No resort found for node ID "${nodeId}".`])));
    return;
  }

  const results = h("div");
  const controls = h("div", { class: "indy-controls cols-3" }, [
    field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
    field("Arrive", dateInput(start, (v) => { start = v; render(); })),
    field("Depart", dateInput(end, (v) => { end = v; render(); })),
  ]);

  function render() {
    clear(results);
    if (start > end) { results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."])); return; }
    const rr = resolveRange(pass, resort as Resort, start, end, idx);

    // Headline banner = the worst state across the range.
    const summary = rr.summary;
    const icon = summary === "open" ? "✓" : summary === "blackout" ? "✕" : "!";
    const title =
      summary === "open" ? "You're good to go" :
      summary === "blackout" ? "Blacked out on some days" :
      "Open — reservation required";
    const note =
      summary === "open" ? `${(resort as Resort).name} is open for your pass across these dates.` :
      summary === "blackout" ? `${rr.counts.blackout} of ${rr.days.length} day(s) are blacked out for this pass.` :
      `You can ride, but you must book ahead.`;
    results.appendChild(h("div", { class: `indy-banner ${summary}` }, [
      h("div", { class: "indy-banner__icon" }, [icon]),
      h("div", {}, [
        h("div", { class: "indy-banner__title" }, [title]),
        h("div", { class: "indy-banner__note" }, [note]),
      ]),
    ]));

    // Per-day breakdown.
    const list = h("div", { class: "indy-list", style: "margin-top:14px" });
    for (const d of rr.days) {
      const row = h("div", { class: "indy-row" }, [
        h("div", {}, [
          h("div", { class: "indy-row__name" }, [formatShort(d.date)]),
          d.state === "blackout" && d.blackoutReason
            ? h("div", { class: "indy-row__meta" }, [d.blackoutReason])
            : null,
        ]),
        statePill(d.state),
      ]);
      list.appendChild(row);
      if (d.state === "reservation" && d.reservation) {
        list.appendChild(reservationDetail(d.reservation));
      }
    }
    results.appendChild(list);

    if (summary === "blackout") {
      results.appendChild(h("div", { class: "indy-footnote" }, [
        "Tip: an Indy+ pass removes blackouts — try selecting it above to see these days clear.",
      ]));
    }
  }

  render();
  el.appendChild(card(
    (resort as Resort).name,
    `Check your dates for this resort`,
    h("div", {}, [controls, h("div", { style: "margin-top:16px" }, [results])]),
  ));
}
