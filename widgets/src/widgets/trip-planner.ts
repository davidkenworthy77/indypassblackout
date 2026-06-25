import type { WidgetContext } from "../main.js";
import type { LodgingDeal, PassId, Resort } from "../../../core/types.js";
import { resolveRange, resolveDay, buildPeriodIndex, lodgingClears } from "../../../core/resolver.js";
import { enumerateRange, formatShort } from "../../../core/dates.js";
import {
  h, clear, card, field, passSelect, dateInput, statePill,
  DEFAULT_START, DEFAULT_END,
} from "../ui.js";

const METHOD_VERB: Record<string, string> = {
  online: "Book online", phone: "Call to book", email: "Email to book", walkin: "Book on arrival",
};

export function mountTripPlanner(ctx: WidgetContext) {
  const { data, el } = ctx;
  const idx = buildPeriodIndex(data.periods);
  const regions = Array.from(new Set(data.resorts.map((r) => r.region))).sort();

  let pass: PassId = "indy_plus";
  let start = DEFAULT_START;
  let end = DEFAULT_END;
  let region = "all";

  const results = h("div");

  const regionSel = (() => {
    const sel = h("select", { onchange: (e: Event) => { region = (e.target as HTMLSelectElement).value; render(); } }) as HTMLSelectElement;
    sel.appendChild(h("option", { value: "all" }, ["All regions"]));
    for (const r of regions) sel.appendChild(h("option", { value: r }, [r]));
    return sel;
  })();

  function lodgingRow(deal: LodgingDeal, resortBlockedNights: boolean, nights: string[]): HTMLElement {
    const propertyClear = lodgingClears(deal.blackout_dates, nights);
    const bookable = !resortBlockedNights && propertyClear;
    const meta: string[] = [];
    if (deal.promo_code) meta.push(`Code ${deal.promo_code}`);
    if (deal.min_nights) meta.push(`${deal.min_nights}+ nights`);
    meta.push(METHOD_VERB[deal.booking_method] ?? "Book direct");

    const contact = h("div", { class: "indy-links" });
    if (deal.url) contact.appendChild(h("a", { href: deal.url, target: "_blank", rel: "noopener" }, ["Book →"]));
    if (deal.phone) contact.appendChild(h("a", { href: `tel:${deal.phone}` }, [`☎ ${deal.phone}`]));
    if (deal.email) contact.appendChild(h("a", { href: `mailto:${deal.email}` }, [`✉ ${deal.email}`]));

    const reason = !propertyClear
      ? "Unavailable — property blacked out on your nights"
      : resortBlockedNights
        ? "Resort blacked out on your nights"
        : "";

    return h("div", { class: `indy-lodging__item ${bookable ? "" : "unavailable"}` }, [
      h("div", {}, [
        h("div", { class: "indy-lodging__deal" }, [`${deal.property} — ${deal.discount}`]),
        h("div", { class: "indy-lodging__meta" }, [meta.join(" · ")]),
        bookable ? contact : (reason ? h("div", { class: "indy-lodging__meta" }, [reason]) : null),
      ]),
      bookable
        ? h("span", { class: "indy-tag" }, ["Bookable"])
        : h("span", { class: "indy-tag warn" }, ["Unavailable"]),
    ]);
  }

  function render() {
    clear(results);
    if (start > end) { results.appendChild(h("div", { class: "indy-empty" }, ["Arrival is after departure — check your dates."])); return; }

    const dates = enumerateRange(start, end);
    const nights = dates.length > 1 ? dates.slice(0, -1) : [];

    const inRegion = data.resorts.filter((r) => region === "all" || r.region === region);
    // Skiable = at least one open / reservation day in range.
    const skiable = inRegion
      .map((r) => ({ r, rr: resolveRange(pass, r, start, end, idx) }))
      .filter(({ rr }) => rr.counts.open + rr.counts.reservation > 0)
      .sort((a, b) => (a.rr.counts.blackout - b.rr.counts.blackout) || a.r.name.localeCompare(b.r.name));

    results.appendChild(h("div", { class: "indy-card__sub", style: "margin-bottom:12px" }, [
      `${skiable.length} resort(s) you can ride ${formatShort(start)} – ${formatShort(end)}` +
      (nights.length ? ` · ${nights.length} night(s)` : " · day trip"),
    ]));

    if (!skiable.length) {
      results.appendChild(h("div", { class: "indy-empty" }, ["Nothing's open for this pass and region on these dates. Try Indy+, a different region, or shifting dates."]));
      return;
    }

    const list = h("div", { class: "indy-list" });
    for (const { r, rr } of skiable) {
      const resortBlockedNights = nights.length > 0 &&
        nights.some((n) => resolveDay(pass, r as Resort, n, idx).state === "blackout");

      const block = h("div", { class: "indy-trip-resort" }, [
        h("div", { class: "indy-trip-resort__head" }, [
          h("div", {}, [
            h("span", { class: "indy-trip-resort__name" }, [r.name]),
            h("span", { class: "indy-row__meta" }, [`  ${r.region}`]),
          ]),
          statePill(rr.summary),
        ]),
      ]);

      if (r.lodging.length) {
        const lod = h("div", { class: "indy-lodging" });
        for (const deal of r.lodging) lod.appendChild(lodgingRow(deal, resortBlockedNights, nights));
        block.appendChild(lod);
      } else {
        block.appendChild(h("div", { class: "indy-lodging__meta", style: "margin-top:6px" }, ["No lodging deals on file for this resort."]));
      }
      list.appendChild(block);
    }
    results.appendChild(list);
    results.appendChild(h("div", { class: "indy-footnote" }, [
      "Lodging deals are seeded from the public Lodging Deals page. A deal shows as bookable only when your nights clear both the resort and the property.",
    ]));
  }

  render();
  el.appendChild(card(
    "Plan a trip",
    "Find open resorts for your pass and dates, with lodging deals attached.",
    h("div", {}, [
      h("div", { class: "indy-controls cols-4" }, [
        field("Your pass", passSelect(pass, (v) => { pass = v; render(); })),
        field("Arrive", dateInput(start, (v) => { start = v; render(); })),
        field("Depart", dateInput(end, (v) => { end = v; render(); })),
        field("Region", regionSel),
      ]),
      h("div", { style: "margin-top:16px" }, [results]),
    ]),
  ));
}
