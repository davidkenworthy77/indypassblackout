import { useMemo } from "react";
import type { ISODate } from "../../core/types.js";
import { PERIODS_25_26, PERIOD_KEYS } from "../../core/periods.js";
import { expandPeriod } from "../../core/resolve-periods.js";
import { uniqSortDates } from "../../core/dates.js";

// Months rendered: Dec 2025 .. Apr 2026 (year, month0).
const MONTHS: [number, number][] = [
  [2025, 11],
  [2026, 0],
  [2026, 1],
  [2026, 2],
  [2026, 3],
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** All ISO dates that belong to any named period — used for the dot marker. */
function buildNamedSet(): Set<ISODate> {
  const s = new Set<ISODate>();
  for (const key of PERIOD_KEYS) for (const d of expandPeriod(PERIODS_25_26, key)) s.add(d);
  return s;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthDays(year: number, month0: number): (ISODate | null)[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const startDow = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: (ISODate | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${pad(month0 + 1)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Props {
  blackoutDates: ISODate[];
  onChange: (dates: ISODate[]) => void;
}

export function Calendar({ blackoutDates, onChange }: Props) {
  const named = useMemo(buildNamedSet, []);
  const set = useMemo(() => new Set(blackoutDates), [blackoutDates]);

  function toggleDay(iso: ISODate) {
    const next = new Set(set);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    onChange(uniqSortDates([...next]));
  }

  function applyPeriod(key: string) {
    const next = new Set(set);
    for (const d of expandPeriod(PERIODS_25_26, key)) next.add(d);
    onChange(uniqSortDates([...next]));
  }

  function clearPeriod(key: string) {
    const next = new Set(set);
    for (const d of expandPeriod(PERIODS_25_26, key)) next.delete(d);
    onChange(uniqSortDates([...next]));
  }

  function clearAll() {
    if (set.size === 0) return;
    if (confirm(`Clear all ${set.size} blackout dates for this dataset?`)) onChange([]);
  }

  // Order periods by their key list for stable buttons.
  const periodEntries = PERIOD_KEYS.map((k) => ({ key: k, label: PERIODS_25_26[k].label }));

  return (
    <div>
      <div className="cal-toolbar">
        <div className="toolbar-row">
          <span className="toolbar-label">Apply</span>
          {periodEntries.map((p) => (
            <button
              key={p.key}
              className="btn btn-chip primary"
              onClick={() => applyPeriod(p.key)}
              title={`Add all ${p.label} dates`}
            >
              ＋ {p.label}
            </button>
          ))}
          <span className="count-badge">
            <b>{set.size}</b> day{set.size === 1 ? "" : "s"} blacked out
          </span>
        </div>
        <div className="toolbar-row">
          <span className="toolbar-label">Clear</span>
          {periodEntries.map((p) => (
            <button
              key={p.key}
              className="btn btn-chip"
              onClick={() => clearPeriod(p.key)}
              title={`Remove all ${p.label} dates`}
            >
              − {p.label}
            </button>
          ))}
          <button className="btn small danger" onClick={clearAll} style={{ marginLeft: "auto" }}>
            Clear all
          </button>
        </div>
      </div>

      <p className="hint">
        Click any day to toggle it. Dates can only be added by clicking or via the period
        buttons — there is no free-text date field, so notes never leak into the data.
      </p>

      <div className="legend">
        <span>
          <span className="swatch" style={{ background: "var(--open-soft)", border: "1px solid var(--line)" }} />
          Open
        </span>
        <span>
          <span className="swatch" style={{ background: "var(--blackout)" }} />
          Blackout
        </span>
        <span>
          <span className="swatch" style={{ background: "var(--indy-orange)" }} />
          In a named period
        </span>
      </div>

      <div className="months">
        {MONTHS.map(([year, m0]) => {
          const cells = monthDays(year, m0);
          return (
            <div className="month" key={`${year}-${m0}`}>
              <h4>
                {MONTH_LABELS[m0]} {year}
              </h4>
              <div className="dow">
                {DOW.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid">
                {cells.map((iso, i) => {
                  if (!iso) return <div className="day empty" key={i} />;
                  const isBlack = set.has(iso);
                  const isNamed = named.has(iso);
                  const dayNum = Number(iso.slice(-2));
                  const cls = ["day", isBlack ? "blackout" : "", isNamed ? "named" : ""]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={iso}
                      className={cls}
                      onClick={() => toggleDay(iso)}
                      title={iso + (isNamed ? " (named period)" : "")}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
