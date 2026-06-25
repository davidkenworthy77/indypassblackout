import { PASSES, type PassId } from "../../core/types.js";
import type { Reservation } from "../../core/types.js";
import type { DayState } from "../../core/resolver.js";

// --- tiny DOM builder ------------------------------------------------------
type Attrs = Record<string, string | number | boolean | EventListener | null | undefined>;

export function h(
  tag: string,
  attrs: Attrs = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = String(v);
    else if (k === "html") e.innerHTML = String(v);
    else if (k.startsWith("on") && typeof v === "function") {
      e.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c == null) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

export function clear(node: HTMLElement) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// --- common controls -------------------------------------------------------
export function passSelect(value: PassId, onChange: (id: PassId) => void): HTMLElement {
  const sel = h("select", {
    onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value as PassId),
  }) as HTMLSelectElement;
  for (const p of PASSES) {
    const opt = h("option", { value: p.id }, [p.label]) as HTMLOptionElement;
    if (p.id === value) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

export function dateInput(value: string, onChange: (v: string) => void): HTMLElement {
  return h("input", {
    type: "date",
    value,
    min: "2025-11-01",
    max: "2026-05-15",
    onchange: (e: Event) => onChange((e.target as HTMLInputElement).value),
  });
}

export function field(label: string, control: HTMLElement): HTMLElement {
  return h("div", { class: "indy-field" }, [h("label", {}, [label]), control]);
}

const STATE_LABEL: Record<DayState, string> = {
  open: "Open",
  blackout: "Blacked out",
  reservation: "Reservation required",
};

export function statePill(state: DayState, text?: string): HTMLElement {
  return h("span", { class: `indy-pill indy-state-${state}` }, [text ?? STATE_LABEL[state]]);
}

export function stateLabel(state: DayState): string {
  return STATE_LABEL[state];
}

// --- reservation detail rendering -----------------------------------------
const METHOD_VERB: Record<string, string> = {
  online: "Book online",
  form: "Submit the reservation form",
  email: "Email to reserve",
  phone: "Call to reserve",
  walkin: "Reserve in person on arrival",
  see_resort_page: "See the resort page to book",
  voluntary: "Reservations recommended",
};

export function reservationDetail(res: Reservation): HTMLElement {
  const wrap = h("div", { class: "indy-reservation-detail" });
  const verb = METHOD_VERB[res.method] ?? "Reservation required";
  wrap.appendChild(h("span", { class: "label" }, [verb]));
  if (res.lead_time) wrap.appendChild(document.createTextNode(` · ${res.lead_time} ahead`));
  if (res.instructions) {
    wrap.appendChild(h("div", {}, [res.instructions]));
  }
  const contact = h("div", { class: "indy-links" });
  if (res.url) contact.appendChild(h("a", { href: res.url, target: "_blank", rel: "noopener" }, ["Open booking page →"]));
  if (res.phone) contact.appendChild(h("a", { href: `tel:${res.phone}` }, [`☎ ${res.phone}`]));
  if (res.email) contact.appendChild(h("a", { href: `mailto:${res.email}` }, [`✉ ${res.email}`]));
  if (contact.childNodes.length) wrap.appendChild(contact);
  return wrap;
}

// --- card scaffold ---------------------------------------------------------
export function card(title: string, sub: string | null, body: HTMLElement): HTMLElement {
  const head = h("div", { class: "indy-card__head" }, [
    h("h3", { class: "indy-card__title" }, [title]),
    sub ? h("p", { class: "indy-card__sub" }, [sub]) : null,
  ]);
  return h("div", { class: "indy-card" }, [head, h("div", { class: "indy-card__body" }, [body])]);
}

/** A sensible default season range to land on (MLK weekend — visually busy). */
export const DEFAULT_START = "2026-01-17";
export const DEFAULT_END = "2026-01-19";
