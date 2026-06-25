# Indy Pass — Blackout & Reservation Checker (prototype)

A set of embeddable widgets that let an Indy Pass holder check, for their
specific pass and travel dates, whether a resort is **open**, **blacked out**,
or **open but reservation-required** — plus planning tools (multi-resort trip
planner, "plan a trip" discovery, all-resorts heatmap). Every widget reads from
one canonical `data.json`. Two interchangeable tools *produce* that JSON: a
Google Sheet sync and an admin web app. **The widgets never know which one
produced the data** — that's what lets the client pick a content-management
approach later without touching the widgets.

This is a clickable prototype to show how the system could work, not a
production system. It prioritises a convincing demo over auth, scale and
hardening.

---

## Quick start

```bash
npm install            # root dev deps (tsx, typescript)
npm run build:data     # generate data/data.json from the Sheet CSVs (Option A)
npm test               # 21 assertions over the resolver, periods & planner

npm run demo           # builds widgets + admin + data, serves everything on :5050
```

Then open **http://localhost:5050/demo/index.html** and use the top nav. Three
mock host pages plus the admin app, all from one static server:

| Page | What it shows |
|---|---|
| `/demo/index.html` | Main **Blackout Dates** page — the global checker |
| `/demo/all-resorts.html` | All-resorts **heatmap**, **multi-resort planner**, **plan-a-trip** |
| `/demo/resort.html` | Sample **resort page** (Cannon) — resort checker + season calendar |
| `/admin/dist/index.html` | **Option B** admin app (linked from the nav) |

> If a page looks unstyled, your browser cached an old redirect — hard-reload
> (`⌘⇧R`). A `serve.json` disables clean-URL rewriting so paths stay stable.

### Developing
```bash
npm run widgets:dev    # widget playground with live reload (:5173)
npm run admin:dev      # admin app with live reload (:5174)
```

---

## The core design decision: separate the contract from the source

```
            ┌─────────────────┐         ┌─────────────────┐
 Option A → │  Google Sheet   │         │   Admin web app │ ← Option B
            │  + sync script  │         │  (React SPA)    │
            └────────┬────────┘         └────────┬────────┘
                     │   both PRODUCE the same    │
                     └──────────┬─────────────────┘
                                ▼
                        canonical data.json
                                ▼
            ┌───────────────────────────────────────────┐
            │  indy-widgets.js  (6 framework-agnostic     │
            │  widgets, hydrate [data-indy-widget])       │
            └───────────────────────────────────────────┘
```

One canonical JSON format (`core/types.ts`) is the contract. The resolver, both
producers and all six widgets are written against it. Swap the producer, keep
everything else.

---

## How a pass resolves (the important bit)

Two **independent** axes decide what a pass holder sees on a date — kept separate
in both the data model and the resolver (`core/resolver.ts`):

1. **Does this pass observe blackouts?**
2. **Which reservation rules apply (Standard vs LTT dataset)?**

| Pass | Observes blackouts? | Blackout data | Reservation data |
|---|---|---|---|
| Indy+ / Indy+ Add-On | **No** | — | Standard |
| Indy Base / Base Add-On / Employee | Yes | Standard | Standard |
| Learn to Turn (LTT) | Yes | LTT | LTT |

The case that breaks a naive "pass type decides everything" model: **Indy+ never
hits a blackout, but can still be reservation-required.** In the demo, Cannon
over MLK weekend is *blacked out* on Indy Base but flips to *reservation
required* (orange, not green) on Indy+ — try the pass selector on the resort
page. Resolution precedence per `(pass, resort, date)` is **blackout → required
reservation → open**; voluntary reservations stay green but carry a "recommended"
note.

> Out of scope: resort operating calendars aren't in the source data, so
> "closed for the season" is not a state. It's noted as a possible 4th state.
> Employee Pass is modelled against the Standard dataset (assumption to confirm).

---

## The six widgets

One bundle, one data URL — the whole integration surface:

```html
<div data-indy-widget="checker"></div>
<div data-indy-widget="resort-checker" data-resort-node-id="9001"></div>
<div data-indy-widget="calendar" data-resort-node-id="9001"></div>
<div data-indy-widget="planner"></div>
<div data-indy-widget="trip-planner"></div>
<div data-indy-widget="resort-matrix"></div>
<script src="/indy-widgets.js" data-source="/data.json"></script>
```

1. **checker** — pass + dates + optional resort search. No resort → network list
   with each resort's state; pick one → precise answer with reservation detail.
2. **resort-checker** — bound to a node ID; answers for that one resort across a
   range, reservation detail inline.
3. **calendar** — resort-scoped, recolours by pass. Switch to Indy+ and watch
   blackouts disappear while reservation days stay orange. Click a day for why.
4. **planner** — pick 2–4 resorts; assigns each day to an open resort and works
   the trip around the blackouts, or names the unlocks when a day can't clear.
5. **trip-planner** — discovery by pass + dates + region; open resorts with their
   lodging deals attached. A deal shows bookable only when the nights clear
   **both** the resort and the property (try Eagle Point over President's week).
6. **resort-matrix** — all-resorts heatmap (resorts × dates), recolours by pass,
   filterable by region, plus a date-first "what's open on this day" inverse view.

Widgets are plain TypeScript compiled to one self-executing `indy-widgets.js`
(~35 KB, ~10 KB gzipped) with CSS injected at runtime, scoped under `.indy-w` so
nothing leaks into the host page. No framework — drops into Drupal cleanly.

---

## Content management: Option A vs Option B

Both write the same `data.json`. **Build both, let the client choose after
seeing them.**

| | **Option A — Google Sheet + sync** | **Option B — Admin web app** |
|---|---|---|
| Fits how the client works today | ✅ Yes — they already use a Sheet | ⚠️ New tool to learn |
| New software to host/run | None (just the sync script) | A small SPA |
| Parsing ambiguity | ⚠️ `PARTIAL`, free-text dates, typos must be parsed | ✅ None — dates come from clicks |
| Stops operational notes leaking into data | ⚠️ Relies on the sync discarding prose | ✅ Structurally — there is no notes field |
| Validation / bad-input safety | ⚠️ Weaker (a malformed cell ships) | ✅ Strong — UI constrains input |
| Bulk edits across many resorts | ✅ Fast in a spreadsheet | ⚠️ One resort at a time |

**Recommendation:** the Sheet (A) is the lowest-friction starting point and
mirrors today's workflow; the admin app (B) is the more robust long-term answer
because it removes the entire class of parsing problems. They're not mutually
exclusive — both emit the same JSON, so the client can start on the Sheet and
migrate to the admin app later with zero widget changes.

See [`sheet-template/README.md`](sheet-template/README.md) for the Sheet column
spec and the **day-grid layout** alternative.

### Persistence in the prototype
- `data.json` is a static file served from the host.
- The admin app loads it, persists edits to `localStorage`, and exports a fresh
  `data.json` (download / copy). In production this would persist to **Supabase**
  (the easy upgrade path) or commit back to the repo.
- Lodging is seeded from the public Lodging Deals page. In production the planner
  should read the existing **Drupal lodging content** rather than a parallel
  store — confirm how lodging nodes relate to resort nodes.

---

## Repo layout

```
/core           canonical types, periods, date utils, resolver, planner (shared)
/widgets        indy-widgets.js bundle — the 6 widgets (Vite lib build)
/admin          Option B admin SPA (React + Vite)
/sync           Option A Google Sheet CSV -> data.json (Node/tsx)
/data           data.json canonical store
/sheet-template the 5-tab Sheet, pre-filled with the seed (doubles as example)
/demo           three mock host pages embedding the widgets
/test           resolver / period / planner assertions
```

`/core` is shared by the widgets, the admin app, the sync and the seed — there
is exactly one resolver and one period-resolution implementation.

## Seed data

Seeded from the two attached PDFs (Standard + LTT) and the Lodging Deals page,
covering every edge case: clean full blackouts (Mt. Hood Meadows, White Pass),
`PARTIAL` cases (Cannon, Tenney, Mont Sutton, Mt. La Crosse), the Standard
reservation resorts and the voluntary ones (Blacktail, Saddleback), the spread of
LTT reservation methods (online/email/phone/walk-in), an Indy+ walkthrough on a
blacked-out resort, a multi-resort NH planner case, and lodging with its own
blackouts (Eagle Point, Tamarack). Node IDs are placeholders (`9001`…) — the real
IDs come from the client's Drupal instance.

## Assumptions to confirm with the client
- Employee Pass uses the Standard blackout dataset (not yet verified).
- Reservation requirements are resort-level for the season, not date-specific
  (the model allows date-scoped reservations later).
- Node IDs are the agreed unique key and can be exposed to the widget embed.
- Resort operating calendars aren't provided, so "closed" is not a state yet.
- Lodging deals are seeded from the public page; production should read Drupal
  lodging content.
