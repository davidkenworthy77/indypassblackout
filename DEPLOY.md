# Deploying the live data layer (Supabase + Vercel)

This explains how the **admin → Save → live embeds** pipeline works and how to
run it in production. The static `data/data.json` stays in the repo as the
seed / offline fallback; in production **Supabase is the source of truth.**

```
  Admin app (Vercel) ──Save (auth)──►  Supabase (Postgres)  ◄── source of truth
       client logs in                        │
                                              │ read
                                              ▼
  Drupal site                       /api/data (Vercel function)
  <script indy-widgets.js ──fetch──►  reads Supabase, returns data.json
   data-source=/api/data>             shape + CORS + ~5s edge cache
```

The widgets are unchanged — they still fetch one JSON URL. Only that URL
changes from a static file to the live `/api/data` endpoint.

## What's already provisioned

A Supabase project is live for this prototype:

- **Project URL:** `https://stuwvqkmhcufontwnxpe.supabase.co`
- **Table `season_data`** — one row per season holding the canonical document.
- **`season_data_versions`** — every Save is auto-snapshotted here for rollback.
- **Row-level security** — public read-only; writes restricted to allow-listed
  admin emails (`public.admins`).
- **Admin login** — email `davidkenworthy77@gmail.com` (password provided
  separately — change it after first sign-in). Add more admins with:
  ```sql
  insert into public.admins (email) values ('client@indyskipass.com');
  -- then create their login in Supabase → Authentication → Add user
  ```

## Deploy to Vercel

1. Import the GitHub repo (`davidkenworthy77/indypassblackout`) into Vercel.
2. **Environment Variables** (Project Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://stuwvqkmhcufontwnxpe.supabase.co` |
   | `SUPABASE_ANON_KEY` | the `sb_publishable_…` key |
   | `VITE_SUPABASE_URL` | same as `SUPABASE_URL` |
   | `VITE_SUPABASE_ANON_KEY` | same as `SUPABASE_ANON_KEY` |

   (The publishable/anon key is meant to be public — security is enforced by
   row-level security, not by hiding it. It's already committed in `admin/.env`
   for the demo; Vercel env vars let you point a fork at a different project.)
3. Vercel uses `vercel.json`: it runs `npm run build:all` (builds the widgets
   bundle, the admin app, and the data fallback) and serves `/api/data` as a
   serverless function. Deploy.

After deploy you'll have:
- `https://<app>.vercel.app/` — the landing page + demo
- `https://<app>.vercel.app/admin/dist/index.html` — the admin (login required)
- `https://<app>.vercel.app/api/data` — the live JSON the widgets read

## Embedding on the Drupal site

```html
<div data-indy-widget="checker"></div>
<script src="https://<app>.vercel.app/indy-widgets.js"
        data-source="https://<app>.vercel.app/api/data"></script>
```

That's the whole integration surface. `data-source` points at the live
endpoint; every other widget (`resort-checker`, `calendar`, `planner`,
`trip-planner`, `resort-matrix`) works the same way.

## How a Save reaches the website

1. The client edits in the admin app and hits **Save & publish**.
2. The admin writes the full document to Supabase (authenticated; only
   allow-listed admins can write). A version snapshot is recorded automatically.
3. `/api/data` serves the new data to every embed. It edge-caches for ~5
   seconds, so a Save is live across the site within seconds — no export, no
   redeploy. The database is only hit on a cache miss, so high-traffic pages
   stay fast and cheap.

> **Want literally 0-second propagation?** The 5-second edge cache is the
> simple, robust default. For instant invalidation you can drop the cache to
> `s-maxage=0` (every request revalidates — fine for low/medium traffic), or
> move the read endpoint to Next.js ISR with `revalidateTag` for tag-based
> purge on save. The current setup is the best balance of instant-enough,
> cheap, and bulletproof.

## Rollback

Every Save is stored in `season_data_versions`. To roll back:
```sql
-- inspect recent versions
select id, created_at, created_by from public.season_data_versions
where season = '25-26' order by created_at desc limit 10;

-- restore a specific version into the live row
update public.season_data s
set data = v.data
from public.season_data_versions v
where v.id = <VERSION_ID> and s.season = '25-26';
```

## Re-seeding from the repo

To reset the database to the bundled seed (`data/data.json`), run the SQL
insert in the project's migration history, or in the admin app use
**Reset to seed → Save & publish**.
