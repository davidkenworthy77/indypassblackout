import type { IndyData, Resort, ResortDataset } from "../../core/types.js";

export const STORAGE_KEY = "indy-admin-data";

/** Deep clone via JSON — the data is plain JSON-serializable. */
export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Fetch the seed data.json copied into public/. */
export async function fetchSeed(): Promise<IndyData> {
  const res = await fetch(`${import.meta.env.BASE_URL}data.json`);
  if (!res.ok) throw new Error(`Failed to load seed data.json (${res.status})`);
  return (await res.json()) as IndyData;
}

/** Load from localStorage if present, otherwise fall back to the seed. */
export async function loadData(): Promise<{ data: IndyData; fromStorage: boolean }> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { data: JSON.parse(stored) as IndyData, fromStorage: true };
    } catch {
      // Corrupt — fall through to seed.
    }
  }
  return { data: await fetchSeed(), fromStorage: false };
}

export function persist(data: IndyData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearPersisted(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function emptyDataset(): ResortDataset {
  return {
    blackout_dates: [],
    reservation: {
      status: "none",
      method: "see_resort_page",
      url: null,
      phone: null,
      email: null,
      instructions: null,
      lead_time: null,
    },
  };
}

let placeholderCounter = 0;
export function newResort(): Resort {
  placeholderCounter += 1;
  const suffix = `${Date.now().toString(36)}-${placeholderCounter}`;
  return {
    node_id: `new-${suffix}`,
    slug: `new-resort-${suffix}`,
    name: "New Resort",
    region: "",
    standard: emptyDataset(),
    ltt: emptyDataset(),
    lodging: [],
  };
}

export function prettyJSON(data: IndyData): string {
  return JSON.stringify(data, null, 2);
}
