import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IndyData } from "../../core/types.js";

// The publishable (anon) key is meant to live in client code — security comes
// from row-level security on the database, not from hiding this key. When the
// env vars are absent (e.g. plain local demo), the admin falls back to the
// offline localStorage + download flow.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SEASON = "25-26";
export const supabaseEnabled = Boolean(url && key);
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, key!)
  : null;

/** Load the currently-published document (source of truth). */
export async function loadPublished(season = SEASON): Promise<IndyData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("season_data")
    .select("data")
    .eq("season", season)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.data as IndyData) : null;
}

/** Publish (upsert) the document. The DB trigger snapshots a version + stamps
 *  updated_at; RLS allows this only for allow-listed admin accounts. */
export async function savePublished(
  doc: IndyData,
  userId?: string,
  season = SEASON,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("season_data")
    .upsert({ season, data: doc, updated_by: userId ?? null });
  if (error) throw error;
}
