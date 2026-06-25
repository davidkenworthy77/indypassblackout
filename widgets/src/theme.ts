// All widget CSS, injected once into the page as a <style> tag. Everything is
// scoped under `.indy-w` so it can't leak into (or be clobbered by) the host
// page. Colours are CSS variables on `.indy-w` so a host can override the
// brand to match their own theme.

export const CSS = /* css */ `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Unbounded:wght@400;700;800&display=swap');
.indy-w {
  /* Indy Pass brand — pulled from indyskipass.com (theme "origin"). */
  --indy-orange: #d70300;        /* brand red (primary accent) */
  --indy-orange-dark: #a51b00;   /* darker red for hover/links */
  --indy-navy: #011323;          /* deep navy ink */
  --indy-ink: #011323;
  --indy-muted: #5b7079;         /* desaturated navy for secondary text */
  --indy-line: #dce5e9;          /* navy-tinted hairline */
  --indy-surface: #FFFFFF;
  --indy-surface-2: #f2f6f8;     /* Indy light blue-grey */
  --indy-open: #3c8a35;
  --indy-open-bg: #eef6e6;
  --indy-blackout: #d70300;
  --indy-blackout-bg: #fbe9e6;
  --indy-reservation: #c47600;
  --indy-reservation-bg: #fcf2da;
  --indy-radius: 6px;            /* Indy uses tight corners */
  --indy-shadow: 0 1px 2px rgba(1,19,35,.05), 0 10px 30px rgba(1,19,35,.07);
  --indy-font-head: 'Unbounded', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --indy-font-body: 'Manrope', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  color: var(--indy-ink);
  font-family: var(--indy-font-body);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}
.indy-w *, .indy-w *::before, .indy-w *::after { box-sizing: inherit; }

.indy-card {
  background: var(--indy-surface);
  border: 1px solid var(--indy-line);
  border-radius: var(--indy-radius);
  box-shadow: var(--indy-shadow);
  overflow: hidden;
}
.indy-card__head {
  padding: 18px 20px;
  border-bottom: 1px solid var(--indy-line);
  background: linear-gradient(180deg, var(--indy-surface), var(--indy-surface-2));
}
.indy-card__title { margin: 0; font-family: var(--indy-font-head); font-size: 17px; font-weight: 700; text-transform: uppercase; letter-spacing: .005em; line-height: 1.2; }
.indy-card__sub { margin: 3px 0 0; color: var(--indy-muted); font-size: 13.5px; }
.indy-card__body { padding: 18px 20px; }

.indy-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 560px) {
  .indy-controls.cols-3 { grid-template-columns: 1.4fr 1fr 1fr; }
  .indy-controls.cols-2 { grid-template-columns: 1fr 1fr; }
  .indy-controls.cols-4 { grid-template-columns: 1.4fr 1fr 1fr 1fr; }
}
.indy-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.indy-field > label { font-size: 12px; font-weight: 600; color: var(--indy-muted); text-transform: uppercase; letter-spacing: .04em; }
.indy-w select, .indy-w input[type="date"], .indy-w input[type="text"], .indy-w input[type="number"] {
  appearance: none;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--indy-line);
  border-radius: 9px;
  background: var(--indy-surface);
  font: inherit;
  color: var(--indy-ink);
}
.indy-w select:focus, .indy-w input:focus { outline: 2px solid var(--indy-orange); outline-offset: 1px; border-color: var(--indy-orange); }

.indy-btn {
  appearance: none; border: 2px solid var(--indy-line); background: var(--indy-surface);
  color: var(--indy-ink); font-family: var(--indy-font-head); font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .03em; padding: 8px 14px;
  border-radius: var(--indy-radius); cursor: pointer; transition: .15s ease;
}
.indy-btn:hover { background: var(--indy-surface-2); border-color: var(--indy-muted); }
.indy-btn--primary { background: var(--indy-orange); border-color: var(--indy-orange); color: #fff; }
.indy-btn--primary:hover { background: var(--indy-navy); border-color: var(--indy-navy); color: #fff; }
.indy-btn--ghost { border-color: transparent; background: transparent; color: var(--indy-orange); }
.indy-btn[aria-pressed="true"] { background: var(--indy-navy); border-color: var(--indy-navy); color: #fff; }

/* State pills + cells */
.indy-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 700;
  white-space: nowrap;
}
.indy-pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.indy-state-open { color: var(--indy-open); background: var(--indy-open-bg); }
.indy-state-blackout { color: var(--indy-blackout); background: var(--indy-blackout-bg); }
.indy-state-reservation { color: var(--indy-reservation); background: var(--indy-reservation-bg); }

.indy-banner {
  display: flex; gap: 12px; align-items: flex-start; padding: 15px 17px;
  border-radius: 8px; font-weight: 500; border-left: 4px solid currentColor;
}
.indy-banner__icon { font-size: 22px; line-height: 1; }
.indy-banner__title { font-family: var(--indy-font-head); font-weight: 700; text-transform: uppercase; font-size: 14.5px; letter-spacing: .01em; }
.indy-banner__note { color: var(--indy-muted); font-size: 13.5px; font-weight: 400; margin-top: 2px; }
.indy-banner.open { background: var(--indy-open-bg); color: var(--indy-open); }
.indy-banner.blackout { background: var(--indy-blackout-bg); color: var(--indy-blackout); }
.indy-banner.reservation { background: var(--indy-reservation-bg); color: var(--indy-reservation); }
.indy-banner.open .indy-banner__note, .indy-banner.blackout .indy-banner__note, .indy-banner.reservation .indy-banner__note { color: inherit; opacity: .8; }

/* Resort result rows */
.indy-list { display: flex; flex-direction: column; gap: 8px; }
.indy-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border: 1px solid var(--indy-line); border-radius: 11px; background: var(--indy-surface);
}
.indy-row__name { font-weight: 650; }
.indy-row__meta { color: var(--indy-muted); font-size: 13px; }
.indy-row__counts { display: flex; gap: 6px; align-items: center; }
.indy-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.indy-dot.open { background: var(--indy-open); }
.indy-dot.blackout { background: var(--indy-blackout); }
.indy-dot.reservation { background: var(--indy-reservation); }

.indy-reservation-detail {
  margin-top: 6px; font-size: 13.5px; color: var(--indy-ink);
  background: var(--indy-reservation-bg); border-radius: 9px; padding: 9px 12px;
}
.indy-reservation-detail a { color: var(--indy-orange-dark); font-weight: 600; }
.indy-reservation-detail .label { font-weight: 700; color: var(--indy-reservation); }

/* Calendar */
.indy-cal-months { display: flex; flex-direction: column; gap: 18px; }
.indy-cal-month__name { font-weight: 700; margin: 0 0 8px; font-size: 15px; }
.indy-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.indy-cal-dow { text-align: center; font-size: 11px; font-weight: 700; color: var(--indy-muted); padding-bottom: 2px; }
.indy-cal-day {
  position: relative; aspect-ratio: 1 / 1; border-radius: 8px; border: 1px solid transparent;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;
  cursor: pointer; background: var(--indy-surface-2); color: var(--indy-ink);
}
.indy-cal-day.empty { background: transparent; cursor: default; }
.indy-cal-day.open { background: var(--indy-open-bg); color: var(--indy-open); }
.indy-cal-day.blackout { background: var(--indy-blackout-bg); color: var(--indy-blackout); }
.indy-cal-day.reservation { background: var(--indy-reservation-bg); color: var(--indy-reservation); }
.indy-cal-day:not(.empty):hover { outline: 2px solid var(--indy-orange); outline-offset: -1px; }
.indy-cal-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; font-size: 13px; color: var(--indy-muted); }
.indy-cal-legend span { display: inline-flex; align-items: center; gap: 6px; }

.indy-daydetail {
  margin-top: 12px; padding: 12px 14px; border-radius: 11px; border: 1px solid var(--indy-line);
  background: var(--indy-surface-2);
}
.indy-daydetail__date { font-weight: 700; margin-bottom: 4px; }

/* Planner */
.indy-plan { display: flex; flex-direction: column; gap: 10px; }
.indy-plan-day {
  display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;
  padding: 12px 14px; border: 1px solid var(--indy-line); border-radius: 11px;
}
.indy-plan-day.blocked { border-color: var(--indy-blackout); background: var(--indy-blackout-bg); }
.indy-plan-day__date { font-weight: 700; }
.indy-plan-day__assign { font-size: 15px; }
.indy-plan-day__assign b { color: var(--indy-orange-dark); }
.indy-plan-day__options { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.indy-chip { font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--indy-line); color: var(--indy-muted); }
.indy-chip.open { color: var(--indy-open); border-color: var(--indy-open); }
.indy-chip.blackout { color: var(--indy-blackout); border-color: var(--indy-blackout); text-decoration: line-through; }
.indy-chip.reservation { color: var(--indy-reservation); border-color: var(--indy-reservation); }

/* Multiselect chips */
.indy-multiselect { display: flex; flex-wrap: wrap; gap: 7px; }
.indy-ms-chip {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--indy-line);
  cursor: pointer; font-size: 13.5px; font-weight: 600; background: var(--indy-surface); user-select: none;
}
.indy-ms-chip[aria-pressed="true"] { background: var(--indy-orange); border-color: var(--indy-orange); color: #fff; }
.indy-ms-chip[aria-disabled="true"] { opacity: .4; cursor: not-allowed; }

/* Matrix */
.indy-matrix-wrap { overflow-x: auto; border: 1px solid var(--indy-line); border-radius: 12px; }
.indy-matrix { border-collapse: collapse; width: 100%; min-width: 520px; }
.indy-matrix th, .indy-matrix td { padding: 0; text-align: center; }
.indy-matrix thead th { position: sticky; top: 0; background: var(--indy-surface-2); font-size: 11px; font-weight: 700; color: var(--indy-muted); padding: 8px 4px; border-bottom: 1px solid var(--indy-line); }
.indy-matrix tbody th { text-align: left; padding: 8px 12px; font-weight: 650; font-size: 13.5px; white-space: nowrap; border-bottom: 1px solid var(--indy-line); position: sticky; left: 0; background: var(--indy-surface); z-index: 1; }
.indy-matrix td { border-bottom: 1px solid var(--indy-line); }
.indy-mcell { width: 30px; height: 30px; margin: 3px auto; border-radius: 6px; }
.indy-mcell.open { background: var(--indy-open); }
.indy-mcell.blackout { background: var(--indy-blackout); }
.indy-mcell.reservation { background: var(--indy-reservation); }

/* Trip planner */
.indy-trip-resort { border: 1px solid var(--indy-line); border-radius: 12px; padding: 14px 16px; }
.indy-trip-resort__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.indy-trip-resort__name { font-weight: 700; font-size: 16px; }
.indy-lodging { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.indy-lodging__item { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 10px; background: var(--indy-surface-2); border: 1px solid var(--indy-line); }
.indy-lodging__item.unavailable { opacity: .55; }
.indy-lodging__deal { font-weight: 600; }
.indy-lodging__meta { font-size: 13px; color: var(--indy-muted); }
.indy-tag { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--indy-ink); color: #fff; }
.indy-tag.warn { background: var(--indy-blackout); }

.indy-empty { color: var(--indy-muted); font-style: italic; padding: 10px 2px; }
.indy-footnote { margin-top: 12px; font-size: 12px; color: var(--indy-muted); }
.indy-links { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
.indy-links a { color: var(--indy-orange-dark); font-weight: 600; text-decoration: none; }
.indy-links a:hover { text-decoration: underline; }
.indy-w a.indy-resort-link { color: var(--indy-orange-dark); font-weight: 650; text-decoration: none; }
.indy-error { color: var(--indy-blackout); padding: 14px; border: 1px solid var(--indy-blackout); border-radius: 10px; }

/* Filters */
.indy-filter-toggle {
  appearance: none; width: 100%; text-align: left; cursor: pointer;
  border: 1px solid var(--indy-line); border-radius: 8px; background: var(--indy-surface);
  padding: 9px 12px; font: inherit; font-weight: 600; color: var(--indy-ink);
}
.indy-filter-toggle[aria-pressed="true"] { border-color: var(--indy-orange); color: var(--indy-orange-dark); }
.indy-filter-panel:not(:empty) {
  margin-top: 12px; padding: 14px 16px; border: 1px solid var(--indy-line);
  border-radius: 10px; background: var(--indy-surface-2);
  display: flex; flex-direction: column; gap: 14px;
}
.indy-filter-group { display: flex; flex-direction: column; gap: 8px; }
.indy-filter-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--indy-muted); }

/* Accordion result rows */
.indy-result { border: 1px solid var(--indy-line); border-radius: 11px; background: var(--indy-surface); overflow: hidden; }
.indy-result.open { border-color: var(--indy-orange); }
.indy-result__head {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer;
}
.indy-result__head:hover { background: var(--indy-surface-2); }
.indy-result__id { min-width: 130px; flex-shrink: 0; }
.indy-result__pills { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.indy-details-toggle {
  appearance: none; border: 1px solid var(--indy-line); background: var(--indy-surface);
  color: var(--indy-orange-dark); font: inherit; font-size: 12px; font-weight: 700;
  padding: 6px 11px; border-radius: 999px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
}
.indy-details-toggle:hover { border-color: var(--indy-orange); background: var(--indy-surface-2); }
.indy-details { padding: 4px 14px 14px; border-top: 1px solid var(--indy-line); background: var(--indy-surface-2); }

/* Calendar pager */
.indy-cal-single { display: flex; flex-direction: column; gap: 10px; }
.indy-cal-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.indy-cal-pager__label { font-family: var(--indy-font-head); font-weight: 700; text-transform: uppercase; font-size: 15px; }
.indy-cal-nav {
  appearance: none; width: 38px; height: 38px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--indy-line); background: var(--indy-surface); color: var(--indy-ink);
  font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center;
}
.indy-cal-nav:hover:not(:disabled) { border-color: var(--indy-orange); color: var(--indy-orange); }
.indy-cal-nav:disabled { opacity: .35; cursor: not-allowed; }

/* Blackout overview (variant) */
.indy-overview__row {
  display: flex; align-items: center; gap: 14px; padding: 11px 14px;
  border: 1px solid var(--indy-line); border-radius: 11px; background: var(--indy-surface);
}
.indy-overview__id { min-width: 150px; flex-shrink: 0; }
.indy-overview__chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.indy-chip.period { color: var(--indy-blackout); border-color: var(--indy-blackout); background: var(--indy-blackout-bg); text-decoration: none; }
`;

let injected = false;
export function injectCSS(doc: Document = document) {
  if (injected) return;
  const style = doc.createElement("style");
  style.id = "indy-widgets-css";
  style.textContent = CSS;
  doc.head.appendChild(style);
  injected = true;
}
