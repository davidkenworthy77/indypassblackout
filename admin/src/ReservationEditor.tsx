import type {
  Reservation,
  ReservationMethod,
  ReservationStatus,
} from "../../core/types.js";

const STATUSES: { value: ReservationStatus; label: string }[] = [
  { value: "none", label: "None" },
  { value: "voluntary", label: "Voluntary" },
  { value: "required", label: "Required" },
];

const METHODS: { value: ReservationMethod; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "form", label: "Form" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "walkin", label: "Walk-in" },
  { value: "see_resort_page", label: "See resort page" },
  { value: "voluntary", label: "Voluntary" },
];

interface Props {
  reservation: Reservation;
  onChange: (r: Reservation) => void;
}

export function ReservationEditor({ reservation, onChange }: Props) {
  function set<K extends keyof Reservation>(key: K, value: Reservation[K]) {
    onChange({ ...reservation, [key]: value });
  }

  // Which contact fields are relevant for the chosen method.
  const m = reservation.method;
  const wantsUrl = m === "online" || m === "form";
  const wantsPhone = m === "phone";
  const wantsEmail = m === "email";

  return (
    <div className="card">
      <div className="field-grid">
        <div className="full">
          <label>Status</label>
          <div className="radio-row">
            {STATUSES.map((s) => (
              <label key={s.value} className={reservation.status === s.value ? "sel" : ""}>
                <input
                  type="radio"
                  name="res-status"
                  checked={reservation.status === s.value}
                  onChange={() => set("status", s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label>Method</label>
          <select value={m} onChange={(e) => set("method", e.target.value as ReservationMethod)}>
            {METHODS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Lead time</label>
          <input
            value={reservation.lead_time ?? ""}
            placeholder="e.g. 48h"
            onChange={(e) => set("lead_time", e.target.value || null)}
          />
        </div>

        <div>
          <label>URL {wantsUrl ? "" : "(n/a for method)"}</label>
          <input
            type="url"
            value={reservation.url ?? ""}
            disabled={!wantsUrl}
            placeholder="https://…"
            onChange={(e) => set("url", e.target.value || null)}
          />
        </div>

        <div>
          <label>Phone {wantsPhone ? "" : "(n/a for method)"}</label>
          <input
            value={reservation.phone ?? ""}
            disabled={!wantsPhone}
            placeholder="(555) 555-5555"
            onChange={(e) => set("phone", e.target.value || null)}
          />
        </div>

        <div>
          <label>Email {wantsEmail ? "" : "(n/a for method)"}</label>
          <input
            type="email"
            value={reservation.email ?? ""}
            disabled={!wantsEmail}
            placeholder="reservations@resort.com"
            onChange={(e) => set("email", e.target.value || null)}
          />
        </div>

        <div className="full">
          <label>Instructions</label>
          <textarea
            value={reservation.instructions ?? ""}
            placeholder="Booking window, who to contact, special notes…"
            onChange={(e) => set("instructions", e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}
