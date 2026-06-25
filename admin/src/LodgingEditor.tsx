import { useEffect, useState } from "react";
import type { LodgingDeal } from "../../core/types.js";
import { uniqSortDates } from "../../core/dates.js";

type BookingMethod = LodgingDeal["booking_method"];

const BOOKING_METHODS: { value: BookingMethod; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "walkin", label: "Walk-in" },
];

function emptyDeal(): LodgingDeal {
  return {
    property: "",
    discount: "",
    promo_code: null,
    booking_method: "online",
    url: null,
    phone: null,
    email: null,
    min_nights: null,
    blackout_dates: [],
    notes: null,
  };
}

/** Parse a comma/semicolon list of ISO dates; keep only valid YYYY-MM-DD. */
function parseDateList(raw: string): string[] {
  const out: string[] = [];
  for (const tok of raw.split(/[;,]/)) {
    const t = tok.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) out.push(t);
  }
  return uniqSortDates(out);
}

/** Free-typing text field that only commits valid ISO dates on blur/change. */
function BlackoutDatesField({
  value,
  onCommit,
}: {
  value: string[];
  onCommit: (dates: string[]) => void;
}) {
  const [text, setText] = useState(value.join(", "));

  // Re-sync if the underlying value changes from elsewhere (e.g. switching deals).
  useEffect(() => {
    setText(value.join(", "));
  }, [value]);

  function commit() {
    const parsed = parseDateList(text);
    onCommit(parsed);
    setText(parsed.join(", "));
  }

  return (
    <input
      value={text}
      placeholder="2025-12-24, 2025-12-31"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
    />
  );
}

interface Props {
  lodging: LodgingDeal[];
  onChange: (deals: LodgingDeal[]) => void;
}

export function LodgingEditor({ lodging, onChange }: Props) {
  function update(i: number, patch: Partial<LodgingDeal>) {
    const next = lodging.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    onChange(next);
  }

  function add() {
    onChange([...lodging, emptyDeal()]);
  }

  function remove(i: number) {
    onChange(lodging.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 760, marginBottom: 14 }}>
        <p className="section-title" style={{ margin: 0 }}>
          {lodging.length} lodging deal{lodging.length === 1 ? "" : "s"}
        </p>
        <button className="btn primary small" onClick={add}>
          ＋ Add lodging deal
        </button>
      </div>

      {lodging.length === 0 && (
        <div className="card" style={{ color: "var(--muted)" }}>
          No lodging deals yet. Click “Add lodging deal” to create one.
        </div>
      )}

      <div className="lodging-list">
        {lodging.map((deal, i) => (
          <div className="card lodging-card" key={i}>
            <div className="lodging-head">
              <strong>{deal.property || "Untitled property"}</strong>
              <button className="btn small danger" onClick={() => remove(i)}>
                Remove
              </button>
            </div>

            <div className="field-grid">
              <div>
                <label>Property</label>
                <input
                  value={deal.property}
                  onChange={(e) => update(i, { property: e.target.value })}
                />
              </div>
              <div>
                <label>Discount</label>
                <input
                  value={deal.discount}
                  placeholder="e.g. 15% off rooms"
                  onChange={(e) => update(i, { discount: e.target.value })}
                />
              </div>

              <div>
                <label>Promo code</label>
                <input
                  value={deal.promo_code ?? ""}
                  onChange={(e) => update(i, { promo_code: e.target.value || null })}
                />
              </div>
              <div>
                <label>Booking method</label>
                <select
                  value={deal.booking_method}
                  onChange={(e) => update(i, { booking_method: e.target.value as BookingMethod })}
                >
                  {BOOKING_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>URL</label>
                <input
                  type="url"
                  value={deal.url ?? ""}
                  placeholder="https://…"
                  onChange={(e) => update(i, { url: e.target.value || null })}
                />
              </div>
              <div>
                <label>Min nights</label>
                <input
                  type="number"
                  min={0}
                  value={deal.min_nights ?? ""}
                  onChange={(e) =>
                    update(i, {
                      min_nights: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label>Phone</label>
                <input
                  value={deal.phone ?? ""}
                  onChange={(e) => update(i, { phone: e.target.value || null })}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={deal.email ?? ""}
                  onChange={(e) => update(i, { email: e.target.value || null })}
                />
              </div>

              <div className="full">
                <label>Property blackout dates (ISO, comma/semicolon separated)</label>
                <BlackoutDatesField
                  value={deal.blackout_dates}
                  onCommit={(dates) => update(i, { blackout_dates: dates })}
                />
              </div>

              <div className="full">
                <label>Notes</label>
                <textarea
                  value={deal.notes ?? ""}
                  onChange={(e) => update(i, { notes: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
