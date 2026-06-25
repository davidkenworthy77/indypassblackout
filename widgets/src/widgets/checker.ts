import type { WidgetContext } from "../main.js";
import type { PassId, Resort } from "../../../core/types.js";
import { resolveRange, buildPeriodIndex, type RangeResolution } from "../../../core/resolver.js";
import { formatShort } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill,
  reservationDetail, stateLabel, DEFAULT_START, DEFAULT_END,
} from "../ui.js";

export function mountChecker(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);

  let pass: PassId = "indy_base";
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  let query = "";
  let selected: string | null = null; // node_id

  const results = h("div");

  const search = h("input", {
    type: "text",
    placeholder: "Search a resort (optional)…",
    oninput: (e: Event) => {
      query = (e.target as HTMLInputElement).value;
      selected = null;
      render();
    },
  });

  const controls = h("div", {}, [
    h("div", { class: "indy-controls cols-3" }, [
      field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
      field("Arrive", dateInput(start, (v) => { start = v; render(); })),
      field("Depart", dateInput(end, (v) => { end = v; render(); })),
    ]),
    h("div", { class: "indy-controls", style: "margin-top:12px" }, [
      field("Resort", search),
    ]),
  ]);

  function countsBadge(rr: RangeResolution): HTMLElement {
    const wrap = h("div", { class: "indy-row__counts" });
    const order: ("open" | "reservation" | "blackout")[] = ["open", "reservation", "blackout"];
    for (const s of order) {
      const n = rr.counts[s];
      if (!n) continue;
      wrap.appendChild(h("span", {
        class: "indy-row__meta", title: stateLabel(s),
        style: "display:inline-flex;align-items:center;gap:4px",
      }, [h("span", { class: `indy-dot ${s}` }), String(n)]));
    }
    return wrap;
  }

  function detailView(resort: Resort) {
    const rr = resolveRange(pass, resort, start, end, idx);
    const wrap = h("div");
    wrap.appendChild(h("button", { class: "indy-btn indy-btn--ghost", style: "margin-bottom:10px",
      onclick: () => { selected = null; render(); } }, ["← All resorts"]));
    const icon = rr.summary === "open" ? "✓" : rr.summary === "blackout" ? "✕" : "!";
    wrap.appendChild(h("div", { class: `indy-banner ${rr.summary}` }, [
      h("div", { class: "indy-banner__icon" }, [icon]),
      h("div", {}, [
        h("div", { class: "indy-banner__title" }, [`${resort.name} — ${stateLabel(rr.summary)}`]),
        h("div", { class: "indy-banner__note" }, [`${resort.region} · ${rr.days.length} day(s) checked`]),
      ]),
    ]));
    const list = h("div", { class: "indy-list", style: "margin-top:12px" });
    for (const d of rr.days) {
      list.appendChild(h("div", { class: "indy-row" }, [
        h("div", {}, [
          h("div", { class: "indy-row__name" }, [formatShort(d.date)]),
          d.blackoutReason ? h("div", { class: "indy-row__meta" }, [d.blackoutReason]) : null,
        ]),
        statePill(d.state),
      ]));
      if (d.state === "reservation" && d.reservation) list.appendChild(reservationDetail(d.reservation));
    }
    wrap.appendChild(list);
    return wrap;
  }

  function render() {
    clear(results);
    if (start > end) { results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."])); return; }

    if (selected) {
      const r = data.resorts.find((x) => x.node_id === selected);
      if (r) { results.appendChild(detailView(r)); return; }
    }

    const q = query.trim().toLowerCase();
    const matches = data.resorts.filter((r) => !q || r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q));

    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `${matches.length} resort(s) · ${formatShort(start)} – ${formatShort(end)}`,
    ]));

    const rank = { open: 0, reservation: 1, blackout: 2 };
    const rows = matches
      .map((r) => ({ r, rr: resolveRange(pass, r, start, end, idx) }))
      .sort((a, b) => rank[a.rr.summary] - rank[b.rr.summary] || a.r.name.localeCompare(b.r.name));

    if (!rows.length) { results.appendChild(h("div", { class: "indy-empty" }, ["No resorts match your search."])); return; }

    const list = h("div", { class: "indy-list" });
    for (const { r, rr } of rows) {
      list.appendChild(h("div", { class: "indy-row", style: "cursor:pointer",
        onclick: () => { selected = r.node_id; render(); } }, [
        h("div", {}, [
          h("div", { class: "indy-row__name" }, [r.name]),
          h("div", { class: "indy-row__meta" }, [r.region]),
        ]),
        h("div", { style: "display:flex;align-items:center;gap:12px" }, [
          countsBadge(rr),
          statePill(rr.summary),
        ]),
      ]));
    }
    results.appendChild(list);
  }

  render();
  el.appendChild(card(
    "Blackout & reservation checker",
    "Pick your pass and dates. Search a resort, or browse what's open across the network.",
    h("div", {}, [controls, h("div", { style: "margin-top:16px" }, [results])]),
  ));
}
