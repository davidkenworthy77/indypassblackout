// Public read endpoint — the URL the embedded widgets point `data-source` at.
//
//   <script src=".../indy-widgets.js" data-source="https://<app>.vercel.app/api/data">
//
// It reads the published document from Supabase and returns it in the exact
// data.json shape the widgets already expect. A short CDN cache (s-maxage)
// means a Save is live everywhere within a few seconds while the database is
// only hit on a cache miss — so a high-traffic marketing page costs almost
// nothing and stays fast. CORS is open because the widgets run on the client's
// own (Drupal) domain, a different origin from Vercel.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export default async function handler(req: any, res: any) {
  // CORS preflight + headers.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const season = (req.query?.season as string) || "25-26";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ error: "Supabase env not configured" });
    return;
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/season_data` +
      `?season=eq.${encodeURIComponent(season)}&select=data,updated_at`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      res.status(502).json({ error: `Upstream ${r.status}` });
      return;
    }
    const rows = (await r.json()) as { data: unknown; updated_at: string }[];
    if (!rows.length) {
      res.status(404).json({ error: `No data for season ${season}` });
      return;
    }

    // Near-instant propagation: edge caches for a few seconds, serves stale
    // while it refreshes in the background. A Save shows up within ~5s.
    res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=300");
    res.setHeader("CDN-Cache-Control", "public, s-maxage=5");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Indy-Updated-At", rows[0].updated_at ?? "");
    res.status(200).send(JSON.stringify(rows[0].data));
  } catch (err) {
    res.status(500).json({ error: String((err as Error).message) });
  }
}
