# Google Sheet template (Option A)

This folder is the five-tab template the client edits in Google Sheets. Each tab
is one CSV here. The five CSVs in this folder are **pre-filled with the seed
data** so they double as a worked example — clear the data rows to get a blank
template, or copy the headers.

Publish the Sheet as CSV (File → Share → Publish to web → per-tab CSV) or export
each tab, then run the sync:

```bash
npm run build:data            # reads ./sheet-template/*.csv -> ./data/data.json
# or point at any folder of the five CSVs:
tsx sync/sync.ts /path/to/csvs ./data/data.json
```

The sync shares its period-to-date resolution with the rest of the system
(`core/resolve-periods.ts`), so the Sheet path and the admin-app path can never
produce different `data.json` for the same input.

## The five tabs

| File | Tab | One row per |
|---|---|---|
| `01-standard-blackouts.csv` | Standard Blackouts | resort |
| `02-ltt-blackouts.csv` | LTT Blackouts | resort |
| `03-standard-reservations.csv` | Standard Reservations | resort |
| `04-ltt-reservations.csv` | LTT Reservations | resort |
| `05-lodging.csv` | Lodging | property (a resort can have several) |

### Blackout tabs (1 & 2)
Columns: `node_id, resort_name, region`, then **one column per named period**
(`christmas_new_years, mlk_weekend, presidents_weekend, peak_saturdays,
peak_sundays`), then `additional_dates`.

Each period cell holds:
- **`X`** — black out that period's entire window.
- **`PARTIAL`** — ignore the window; the real dates for that period come from
  `additional_dates`.
- **blank** — that period is open.

`additional_dates` is a free-text list of explicit dates/ranges, separated by
`;` or `,`. Accepts ISO (`2026-01-03`), ISO ranges (`2026-01-03..2026-01-04`),
US dates (`1/3/2026`, `01/03/26`) and US ranges (`12/26 - 12/31/25`). Any prose
that isn't a date is discarded — operational notes never enter the data.

> President's Weekend is four days and some resorts black out only two of them:
> put `PARTIAL` in the `presidents_weekend` column and the two real dates in
> `additional_dates`. (See Cannon, Tenney, Mont Sutton, Mt. La Crosse in the
> seed.)

### Reservation tabs (3 & 4)
Columns: `node_id, resort_name, status, method, url, phone, email, instructions,
lead_time`.
- `status`: `none` | `voluntary` | `required`
- `method`: `online` | `form` | `email` | `phone` | `walkin` | `see_resort_page` | `voluntary`

Resorts omitted from a reservation tab default to `status: none`.

### Lodging tab (5)
Columns: `node_id, resort_name, property, discount, promo_code, booking_method,
url, phone, email, min_nights, lodging_blackout_dates`. `lodging_blackout_dates`
uses the same date format as `additional_dates`, and is independent of the
resort's lift blackouts.

## Recommended alternative: the day-grid layout

Dave flagged that the client's instinct is **one column per day of the season**.
That layout removes *all* parsing ambiguity — every cell is just blacked-out or
not, there is no `PARTIAL`/free-text to interpret — so it is the more robust
choice for a hand-edited Sheet. The period-column layout above is implemented
here because it mirrors the existing PDFs and is far more compact (5 columns vs
~150). If the client prefers the day-grid, the sync's resolution step is the
only thing that changes: instead of expanding periods, you read the grid
directly. This is noted as a small, well-scoped follow-up rather than built
twice for the prototype.
