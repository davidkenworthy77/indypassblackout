import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  Dataset,
  IndyData,
  ISODate,
  LodgingDeal,
  Reservation,
  Resort,
  ResortDataset,
} from "../../core/types.js";
import {
  clearPersisted,
  clone,
  fetchSeed,
  loadData,
  newResort,
  persist,
  prettyJSON,
} from "./store.ts";
import { supabase, supabaseEnabled, loadPublished, savePublished } from "./supabase.ts";
import { Calendar } from "./Calendar.tsx";
import { ReservationEditor } from "./ReservationEditor.tsx";
import { LodgingEditor } from "./LodgingEditor.tsx";

type Tab = "blackouts" | "reservation" | "lodging";

export function App({ session }: { session: Session | null }) {
  const [data, setData] = useState<IndyData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset>("standard");
  const [tab, setTab] = useState<Tab>("blackouts");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Initial load: the published document from Supabase (source of truth) when
  // configured, otherwise localStorage / bundled seed for the offline demo.
  useEffect(() => {
    (async () => {
      if (supabaseEnabled) {
        try {
          const published = await loadPublished();
          const doc = published ?? (await fetchSeed());
          setData(doc);
          setSelectedId(doc.resorts[0]?.node_id ?? null);
          flash(published ? "Loaded the published data" : "No published data yet — loaded the seed");
          return;
        } catch (e) {
          flash(`Load failed: ${(e as Error).message}`);
        }
      }
      const { data, fromStorage } = await loadData();
      setData(data);
      setSelectedId(data.resorts[0]?.node_id ?? null);
      if (fromStorage) flash("Loaded your saved edits from this browser");
    })();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }

  // Keep a local draft copy (crash safety) and track unsaved changes.
  const [loadedAt] = useState(() => ({ first: true }));
  useEffect(() => {
    if (!data) return;
    persist(data);
    if (loadedAt.first) loadedAt.first = false;
    else setDirty(true);
  }, [data]);

  const selected: Resort | undefined = useMemo(
    () => data?.resorts.find((r) => r.node_id === selectedId),
    [data, selectedId],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.resorts;
    return data.resorts.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q),
    );
  }, [data, search]);

  // ---- Mutators ----
  function patchResort(id: string, patch: (r: Resort) => Resort) {
    setData((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      const idx = next.resorts.findIndex((r) => r.node_id === id);
      if (idx >= 0) next.resorts[idx] = patch(next.resorts[idx]);
      return next;
    });
  }

  function patchDataset(id: string, ds: Dataset, patch: (d: ResortDataset) => ResortDataset) {
    patchResort(id, (r) => ({ ...r, [ds]: patch(r[ds]) }));
  }

  function setBlackouts(dates: ISODate[]) {
    if (!selected) return;
    patchDataset(selected.node_id, dataset, (d) => ({ ...d, blackout_dates: dates }));
  }

  function setReservation(res: Reservation) {
    if (!selected) return;
    patchDataset(selected.node_id, dataset, (d) => ({ ...d, reservation: res }));
  }

  function setLodging(deals: LodgingDeal[]) {
    if (!selected) return;
    patchResort(selected.node_id, (r) => ({ ...r, lodging: deals }));
  }

  function addResort() {
    const r = newResort();
    setData((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      next.resorts.push(r);
      return next;
    });
    setSelectedId(r.node_id);
    setTab("blackouts");
    flash("Added new resort");
  }

  function deleteResort(resort: Resort) {
    if (!confirm(`Delete "${resort.name}"? This can't be undone (until you re-publish).`)) return;
    setData((prev) => {
      if (!prev) return prev;
      const next = clone(prev);
      next.resorts = next.resorts.filter((r) => r.node_id !== resort.node_id);
      setSelectedId(next.resorts[0]?.node_id ?? null);
      return next;
    });
    flash(`Deleted ${resort.name} — Save & publish to make it live`);
  }

  // ---- Persistence actions ----
  async function publish() {
    if (!data) return;
    setSaving(true);
    try {
      await savePublished(data, session?.user?.id);
      setDirty(false);
      flash("Saved & published — live on the site within seconds");
    } catch (e) {
      flash(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  function exportJSON() {
    if (!data) return;
    const blob = new Blob([prettyJSON(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Downloaded data.json");
  }

  async function copyJSON() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(prettyJSON(data));
      flash("Copied data.json to clipboard");
    } catch {
      flash("Clipboard blocked — use Export instead");
    }
  }

  async function resetSeed() {
    if (!confirm("Reset to the seed data.json? This discards all edits in this browser.")) return;
    clearPersisted();
    const seed = await fetchSeed();
    setData(seed);
    setSelectedId(seed.resorts[0]?.node_id ?? null);
    flash("Reset to seed data");
  }

  if (!data) {
    return <div className="loading">Loading data.json…</div>;
  }

  const dsData = selected ? selected[dataset] : null;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <img className="brand-logo" src="/demo/assets/iplogo-light.svg" alt="Indy Pass" />
        </a>
        <nav className="topbar-nav">
          <a href="../../demo/index.html">All Resorts</a>
          <a href="../../demo/individual.html">Individual</a>
          <a className="active" href="#">Admin</a>
        </nav>
        <div className="spacer" />
        {supabaseEnabled ? (
          <p className="persist-note">
            {dirty ? "You have unsaved changes." : "All changes published."}
            {session?.user?.email ? ` · ${session.user.email}` : ""}
          </p>
        ) : (
          <p className="persist-note">
            Offline demo — edits stay in this browser. Connect Supabase to publish live.
          </p>
        )}
        <div className="topbar-actions">
          <button className="btn ghost small" onClick={resetSeed}>
            Reset to seed
          </button>
          <button className="btn ghost small" onClick={exportJSON}>
            ⬇ Backup
          </button>
          {supabaseEnabled ? (
            <>
              <button
                className="btn primary"
                onClick={publish}
                disabled={saving || !dirty}
                title={dirty ? "Publish to the live site" : "Nothing to save"}
              >
                {saving ? "Saving…" : dirty ? "Save & publish" : "✓ Saved"}
              </button>
              <button className="btn ghost small" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={copyJSON}>
              Copy data.json
            </button>
          )}
        </div>
      </header>

      <div className="body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="row">
              <input
                placeholder="Search resorts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn dark small" style={{ width: "100%" }} onClick={addResort}>
              ＋ Add resort
            </button>
          </div>
          <div className="resort-list">
            {filtered.length === 0 && <div className="empty-note">No resorts match.</div>}
            {filtered.map((r) => (
              <button
                key={r.node_id}
                className={`resort-item ${r.node_id === selectedId ? "active" : ""}`}
                onClick={() => setSelectedId(r.node_id)}
              >
                <div className="name">{r.name || "Untitled resort"}</div>
                <div className="meta">
                  <span className="pill">{r.region || "—"}</span>
                  <span>
                    {r.standard.blackout_dates.length}/{r.ltt.blackout_dates.length} blackouts
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {!selected && <div className="empty-note">Select a resort to begin.</div>}

          {selected && dsData && (
            <>
              <div className="resort-header">
                <div className="resort-title-fields">
                  <div className="name-input">
                    <label>Resort name</label>
                    <input
                      value={selected.name}
                      onChange={(e) =>
                        patchResort(selected.node_id, (r) => ({ ...r, name: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label>Region</label>
                    <input
                      value={selected.region}
                      onChange={(e) =>
                        patchResort(selected.node_id, (r) => ({ ...r, region: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label>Node ID</label>
                    <input
                      value={selected.node_id}
                      onChange={(e) => {
                        const newId = e.target.value;
                        patchResort(selected.node_id, (r) => ({ ...r, node_id: newId }));
                        setSelectedId(newId);
                      }}
                    />
                  </div>
                </div>
                <button
                  className="btn danger small"
                  onClick={() => deleteResort(selected)}
                  title="Delete this resort"
                >
                  Delete resort
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span className="toolbar-label" style={{ width: "auto" }}>
                  Dataset
                </span>
                <div className="dataset-toggle">
                  <button
                    className={dataset === "standard" ? "active" : ""}
                    onClick={() => setDataset("standard")}
                  >
                    Standard
                  </button>
                  <button
                    className={dataset === "ltt" ? "active" : ""}
                    onClick={() => setDataset("ltt")}
                  >
                    LTT
                  </button>
                </div>
              </div>

              <div className="tabs">
                <button
                  className={`tab ${tab === "blackouts" ? "active" : ""}`}
                  onClick={() => setTab("blackouts")}
                >
                  Blackouts
                  <span className="count">{dsData.blackout_dates.length}</span>
                </button>
                <button
                  className={`tab ${tab === "reservation" ? "active" : ""}`}
                  onClick={() => setTab("reservation")}
                >
                  Reservation
                  <span className="count">{dsData.reservation.status}</span>
                </button>
                <button
                  className={`tab ${tab === "lodging" ? "active" : ""}`}
                  onClick={() => setTab("lodging")}
                >
                  Lodging
                  <span className="count">{selected.lodging.length}</span>
                </button>
              </div>

              {tab === "blackouts" && (
                <Calendar blackoutDates={dsData.blackout_dates} onChange={setBlackouts} />
              )}
              {tab === "reservation" && (
                <ReservationEditor reservation={dsData.reservation} onChange={setReservation} />
              )}
              {tab === "lodging" && (
                <LodgingEditor lodging={selected.lodging} onChange={setLodging} />
              )}
            </>
          )}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
