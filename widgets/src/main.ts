import type { IndyData } from "../../core/types.js";
import { injectCSS } from "./theme.js";
import { h } from "./ui.js";

import { mountChecker } from "./widgets/checker.js";
import { mountResortChecker } from "./widgets/resort-checker.js";
import { mountCalendar } from "./widgets/calendar.js";
import { mountPlanner } from "./widgets/planner.js";
import { mountTripPlanner } from "./widgets/trip-planner.js";
import { mountMatrix } from "./widgets/resort-matrix.js";

export interface WidgetContext {
  data: IndyData;
  el: HTMLElement;
}

type Mounter = (ctx: WidgetContext) => void;

const REGISTRY: Record<string, Mounter> = {
  checker: mountChecker,
  "resort-checker": mountResortChecker,
  calendar: mountCalendar,
  planner: mountPlanner,
  "trip-planner": mountTripPlanner,
  "resort-matrix": mountMatrix,
};

// Capture the data source from the <script> tag while it's still current.
function dataSource(): string {
  const cur = document.currentScript as HTMLScriptElement | null;
  const fromCurrent = cur?.getAttribute("data-source");
  if (fromCurrent) return fromCurrent;
  // Fallback: scan for any script that declared a source.
  const tagged = document.querySelector("script[data-source]");
  return tagged?.getAttribute("data-source") || "/data.json";
}

const SOURCE = dataSource();
let dataPromise: Promise<IndyData> | null = null;
function loadData(): Promise<IndyData> {
  if (!dataPromise) {
    dataPromise = fetch(SOURCE).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${SOURCE} (${r.status})`);
      return r.json();
    });
  }
  return dataPromise;
}

async function hydrate(root: ParentNode = document) {
  injectCSS();
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-indy-widget]"),
  ).filter((n) => !n.hasAttribute("data-indy-mounted"));
  if (!nodes.length) return;

  let data: IndyData;
  try {
    data = await loadData();
  } catch (err) {
    for (const el of nodes) {
      el.classList.add("indy-w");
      el.appendChild(h("div", { class: "indy-error" }, [String((err as Error).message)]));
    }
    return;
  }

  for (const el of nodes) {
    const kind = el.getAttribute("data-indy-widget") || "";
    const mounter = REGISTRY[kind];
    el.classList.add("indy-w");
    el.setAttribute("data-indy-mounted", "");
    if (!mounter) {
      el.appendChild(h("div", { class: "indy-error" }, [`Unknown widget "${kind}".`]));
      continue;
    }
    try {
      mounter({ data, el });
    } catch (err) {
      el.appendChild(h("div", { class: "indy-error" }, [`Widget error: ${String((err as Error).message)}`]));
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }
}

// Expose a manual hook for SPA hosts that inject widgets after load.
(window as unknown as { IndyWidgets: unknown }).IndyWidgets = {
  hydrate,
  reload: () => {
    dataPromise = null;
    return hydrate();
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => hydrate());
} else {
  hydrate();
}
