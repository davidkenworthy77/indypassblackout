import type { WidgetContext } from "../main.js";
import type { PassId } from "../../../core/types.js";
import { resolveRange, resolveSingleDay, buildPeriodIndex } from "../../../core/resolver.js";
import { enumerateRange, formatShort, dayOfWeek } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill, stateLabel,
  DEFAULT_START, DEFAULT_END,
} from "../ui.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function mountMatrix(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);
  const regions = Array.from(new Set(data.resorts.map((r) => r.region))).sort();

  let pass: PassId = "indy_base";
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  let region = "all";
  let mode: "range" | "day" = "range";
  let singleDay = DEFAULT_START;

  const results = h("div");
  const dynamicControls = h("div");

  const regionSel = (() => {
    const sel = h("select", { onchange: (e: Event) => { region = (e.target as HTMLSelectElement).value; render(); } }) as HTMLSelectElement;
    sel.appendChild(h("option", { value: "all" }, ["All regions"]));
    for (const r of regions) sel.appendChild(h("option", { value: r }, [r]));
    return sel;
  })();

  function filtered() {
    return data.resorts.filter((r) => region === "all" || r.region === region);
  }

  function renderMatrix() {
    if (start > end) { results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."])); return; }
    const dates = enumerateRange(start, end);
    const resorts = filtered();

    const table = h("table", { class: "indy-matrix" });
    const thead = h("thead");
    const hr = h("tr", {}, [h("th", {}, ["Resort"])]);
    for (const d of dates) {
      hr.appendChild(h("th", {}, [
        h("div", {}, [DOW[dayOfWeek(d)]]),
        h("div", { style: "font-weight:400" }, [formatShort(d).replace(/^[A-Za-z]+, /, "")]),
      ]));
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = h("tbody");
    for (const r of resorts) {
      const rr = resolveRange(pass, r, start, end, idx);
      const tr = h("tr", {}, [h("th", {}, [r.name])]);
      rr.days.forEach((day) => {
        tr.appendChild(h("td", {}, [h("div", {
          class: `indy-mcell ${day.state}`,
          title: `${r.name} · ${formatShort(day.date)} — ${stateLabel(day.state)}`,
        })]));
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    results.appendChild(h("div", { class: "indy-matrix-wrap" }, [table]));
    results.appendChild(h("div", { class: "indy-cal-legend", style: "margin-top:10px" }, [
      h("span", {}, [h("span", { class: "indy-dot open" }), "Open"]),
      h("span", {}, [h("span", { class: "indy-dot reservation" }), "Reservation required"]),
      h("span", {}, [h("span", { class: "indy-dot blackout" }), "Blacked out"]),
    ]));
  }

  function renderDay() {
    const rows = resolveSingleDay(data, pass, singleDay)
      .filter(({ resort }) => region === "all" || resort.region === region);
    const rank = { open: 0, reservation: 1, blackout: 2 };
    rows.sort((a, b) => rank[a.res.state] - rank[b.res.state] || a.resort.name.localeCompare(b.resort.name));

    const openCount = rows.filter((x) => x.res.state !== "blackout").length;
    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:10px" }, [
      `${openCount} of ${rows.length} resort(s) open on ${formatShort(singleDay)}`,
    ]));
    const list = h("div", { class: "indy-list" });
    for (const { resort, res } of rows) {
      list.appendChild(h("div", { class: "indy-row" }, [
        h("div", {}, [
          h("div", { class: "indy-row__name" }, [resort.name]),
          h("div", { class: "indy-row__meta" }, [res.state === "blackout" && res.blackoutReason ? `${resort.region} · ${res.blackoutReason}` : resort.region]),
        ]),
        statePill(res.state),
      ]));
    }
    results.appendChild(list);
  }

  function renderDynamicControls() {
    clear(dynamicControls);
    if (mode === "range") {
      dynamicControls.appendChild(h("div", { class: "indy-controls cols-4" }, [
        field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
        field("From", dateInput(start, (v) => { start = v; render(); })),
        field("To", dateInput(end, (v) => { end = v; render(); })),
        field("Region", regionSel),
      ]));
    } else {
      dynamicControls.appendChild(h("div", { class: "indy-controls cols-3" }, [
        field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
        field("Day", dateInput(singleDay, (v) => { singleDay = v; render(); })),
        field("Region", regionSel),
      ]));
    }
  }

  function render() {
    renderDynamicControls();
    clear(results);
    if (mode === "range") renderMatrix();
    else renderDay();
  }

  const toggle = h("div", { style: "display:flex;gap:8px;margin-bottom:14px" }, [
    h("button", { class: "indy-btn", "aria-pressed": "true",
      onclick: (e: Event) => { mode = "range"; setToggle(e); render(); } }, ["Date-range heatmap"]),
    h("button", { class: "indy-btn", "aria-pressed": "false",
      onclick: (e: Event) => { mode = "day"; setToggle(e); render(); } }, ["What's open on a day"]),
  ]);
  function setToggle(e: Event) {
    const btns = toggle.querySelectorAll("button");
    btns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    (e.currentTarget as HTMLElement).setAttribute("aria-pressed", "true");
  }

  render();
  el.appendChild(card(
    "All resorts",
    "Scan the whole network at a glance. Recolours by pass; filter by region.",
    h("div", {}, [toggle, dynamicControls, h("div", { style: "margin-top:16px" }, [results])]),
  ));
}
