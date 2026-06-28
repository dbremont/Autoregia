# Personal Work Organization System (PWOS) — Prototype

> PWOS is the **Personal Work Organization System** — an Autoregia sub-project
> within the **Operations System** (VSM System 1 – Operations). This directory
> contains the **prototype implementation**. Conceptual foundations, the data
> model, and the full functional specification live in
> [`../spec/pwos/`](../spec/pwos) ([`spec.md`](../spec/pwos/spec.md),
> [`schema.json`](../spec/pwos/schema.json)).

## Prototype

A Flask mock-API server plus a vanilla HTML/CSS/JS client that conforms to the
Autoregia UI specification ([`../spec/ui.spec`](../spec/ui.spec)). It implements
all three PWOS components:

- **[A] Work Organization & Registration** — action constructs (CRUD, filters,
  hierarchy tree), dependency graph edges.
- **[B] Work Calendarization** — calendar blocks, multi-view calendar
  (Day / Week / Month / Year), conflict detection, workload aggregation.
- **[C] Platforms Integration** — Google Calendar OAuth 2.0 two-way sync, with
  graceful **mock mode** when credentials are absent.

### Run

```bash
python3 -m venv ../env && source ../env/bin/activate   # once, shared venv
pip install -r requirements.txt
python3 server.py
# open http://localhost:5005
```

The server listens on **port 5005** (PRS → 5000, PKTS → 5001, PTOCS → 5003,
PPS → 5004). Override with the `PWOS_PORT` environment variable.

To regenerate the seed data:

```bash
python3 data/gen_mock.py   # deterministic (seeded) -> data/mock_actions.json + mock_blocks.json
```

If [`jsonschema`](https://pypi.org/project/jsonschema/) is installed, the
generator validates every entry against `spec/pwos/schema.json`.

### Google Calendar (Component C)

The prototype runs in **mock mode** by default — fully functional on local block
data, no credentials required. To enable live two-way sync:

1. Create a Google Cloud project; enable the **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (application type: *Desktop app*).
3. Download the client secret as `config/client_secret.json` inside this folder
   (or set `PWOS_GC_CLIENT_SECRET` to its absolute path). **Never commit it.**
4. `pip install google-auth-oauthlib google-api-python-client` (in requirements.txt).
5. Open the *Google Calendar* view in the client and click **Connect**; complete
   the consent flow. The refresh token is stored in `config/token.json`.
6. Click **Sync** (header) or **Sync Now** (Google view) to pull remote events
   and push local dirty blocks.

Scope: `https://www.googleapis.com/auth/calendar` (read/write) for two-way sync.

### API

| Endpoint | Component | Description |
| --- | --- | --- |
| `GET/POST /api/actions` | A | List (filterable) / create action constructs |
| `GET/PUT/DELETE /api/actions/<id>` | A | Retrieve / update / delete an action |
| `POST /api/actions/<id>/pin` | A | Toggle pin |
| `GET /api/hierarchy` | A | Objective → Initiative → Project → Task tree |
| `GET/POST /api/blocks` | B | List (filterable) / create calendar blocks (with conflict detection) |
| `GET/PUT/DELETE /api/blocks/<id>` | B | Retrieve / update / delete a block |
| `GET /api/calendar/day?start=` | B | Blocks for a single day (day view) |
| `GET /api/calendar/week?start=` | B | Blocks grouped by day with scheduled minutes (week view) |
| `GET /api/calendar/month?year=&month=` | B | 6×7 weekday-aligned grid for a month (month view) |
| `GET /api/calendar/year?year=` | B | Per-month workload summary for a year (year view) |
| `GET /api/dashboard/stats` | A/B/C | Aggregate statistics |
| `GET /api/calendar/google/status` | C | Mock / authorized / connected status |
| `POST /api/calendar/google/auth` | C | Begin OAuth consent flow |
| `GET /api/calendar/google/callback` | C | OAuth redirect endpoint |
| `GET /api/calendar/google/calendars` | C | List remote calendars (connected) |
| `POST /api/calendar/google/sync` | C | Two-way incremental sync |
| `GET /api/export` · `POST /api/import` | — | JSON export / import (merge-by-id) |

### UI / UX

The interface follows the **Autoregia UI specification** — warm-parchment Oxford
aesthetic, shared design tokens (copied verbatim from the PRS reference
implementation), the Spectral/Inter/IBM Plex Mono type system, self-hosted
Lucide icons (`<pw-icon>`), a command palette (`Ctrl/Cmd+K`), keyboard shortcuts
(`N` for new action, `Esc` to close), and offline-first fonts.

## Structure

```
pwos/
├── server.py              # Flask API: actions, blocks, hierarchy, Google Calendar
├── requirements.txt       # flask, flask-cors, google-auth-oauthlib, google-api-python-client
├── README.md              # this document
├── data/
│   ├── mock_actions.json  # seed action constructs (conforms to schema.json)
│   ├── mock_blocks.json   # seed calendar blocks
│   └── gen_mock.py        # deterministic generator (+ optional schema validation)
├── config/                # (gitignored) client_secret.json + token.json
└── static/
    ├── index.html         # app-shell: header, sidebar, views, modals, command palette
    ├── css/               # design tokens & components (mirrors PRS/PTOCS)
    ├── fonts/             # self-hosted Spectral / Inter / IBM Plex Mono
    └── js/
        ├── store.js       # data layer (localStorage + API)
        ├── icons.js       # self-hosted Lucide icon set (<pw-icon>)
        ├── app.js         # router, view switching, keyboard, shared helpers
        ├── actions.js     # action list, filters, editor & detail modals
        ├── hierarchy.js   # objective tree (Component A)
        ├── calendar.js    # multi-view calendar (day/week/month/year) + block scheduling (Component B)
        ├── google.js      # Google Calendar status/auth/sync (Component C)
        ├── dashboard.js   # at-a-glance statistics
        └── command-palette.js  # Ctrl/Cmd+K universal command interface
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Operations System** (VSM System 1 – Operations).
- **Spec:** [`../spec/pwos/spec.md`](../spec/pwos/spec.md) ·
  [`../spec/pwos/schema.json`](../spec/pwos/schema.json).
- **Storage substrate:** [PRS](../prs/) — PWOS operates over PRS records; it is
  not a competing record store.
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/), [PTOCS](../ptocs/), [PPS](../pps/).
- **Decision log:** [`../logos.log.md`](../logos.log.md).

## References

- [PWOS — spec](../spec/pwos/spec.md) · [schema](../spec/pwos/schema.json)
- [Agency — Execution Architecture](https://bremontix.xyz/lab/ar/Locus-Social-Realitatis/Onto/Guide/Agency/#execution-architecture)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference/events)
