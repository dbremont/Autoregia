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

- **[S] Scratchpad** — a single persistent Markdown + LaTeX working document.
  Edit ↔ Preview toggle (rendered Markdown with KaTeX math), autosave, and share
  by link with **view** or **edit** permission.
- **[A] Work Organization & Registration** — action constructs (CRUD, filters,
  hierarchy tree), dependency graph edges.
- **[B] Work Calendarization** — calendar blocks, multi-view calendar
  (Day / Week / Month / Year), conflict detection, workload aggregation.
- **[C] Platforms Integration** — Google Calendar OAuth 2.0 two-way sync, with
  graceful **mock mode** when credentials are absent.
- **Analytics Dashboard** — an S3\* (Audit) read-only surface over a synthetic
  `app.todoist` dataset: a **Personal Performance scorecard** (generic,
  measurable operational-health goals), composite indices (Productivity / Backlog
  Pressure / Fragmentation), throughput, backlog aging, deadline adherence,
  priority mix, label spread, weekly rhythm, hourly productivity heatmap, monthly
  comparison, cycle-time & priority-debt, project momentum, radar comparison, and
  auto-insights. Specified in [`../spec/pwos/analytics.md`](../spec/pwos/analytics.md).

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
python3 data/gen_todoist_mock.py   # analytics dataset -> data/mock_todoist.json
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
| `GET /api/scratch` | S | Retrieve the singleton scratchpad document (markdown + LaTeX) |
| `PUT /api/scratch` | S | Update the scratchpad document body |
| `POST /api/scratch/share` | S | Create a share link (`{permission: view\|edit}`) |
| `GET /api/scratch/shares` | S | List active share grants |
| `DELETE /api/scratch/share/<token>` | S | Revoke a share link |
| `GET /api/scratch/shared/<token>` | S | Public read via share token (returns body + permission) |
| `PUT /api/scratch/shared/<token>` | S | Public edit via share token (edit grants only; 403 for view) |
| `GET /share/<token>` | S | Public share page (standalone HTML) |
| `GET/POST /api/blocks` | B | List (filterable) / create calendar blocks (with conflict detection) |
| `GET/PUT/DELETE /api/blocks/<id>` | B | Retrieve / update / delete a block |
| `GET /api/calendar/day?start=` | B | Blocks for a single day (day view) |
| `GET /api/calendar/week?start=` | B | Blocks grouped by day with scheduled minutes (week view) |
| `GET /api/calendar/month?year=&month=` | B | 6×7 weekday-aligned grid for a month (month view) |
| `GET /api/calendar/year?year=` | B | Per-month workload summary for a year (year view) |
| `GET /api/dashboard/stats` | A/B/C | Aggregate statistics |
| `GET /api/analytics/summary` | S3\* | Headline KPIs (completion rate, backlog, overdue, streak, cycle p50) |
| `GET /api/analytics/performance` | S3\* | Personal Performance scorecard: 5 generic goals × 3 key results, live progress & status |
| `GET /api/analytics/indices` | S3\* | Composite indices (Productivity / Backlog Pressure / Fragmentation) decomposed |
| `GET /api/analytics/throughput` | S3\* | Daily created/completed series + 7-day rolling velocity |
| `GET /api/analytics/trajectory` | S3\* | Cumulative created − completed backlog trajectory |
| `GET /api/analytics/funnel` | S3\* | Completion funnel: created → due → completed → on-time |
| `GET /api/analytics/rhythm` | S3\* | Weekly rhythm: per-weekday completion means + peak day |
| `GET /api/analytics/hourly` | S3\* | Hour × weekday completion-density matrix + peak focus window |
| `GET /api/analytics/monthly` | S3\* | Month-over-month comparison + trajectory verdicts |
| `GET /api/analytics/cycletime` | S3\* | Cycle-time p50/p90 by priority |
| `GET /api/analytics/priority-debt` | S3\* | Cumulative high-priority (P1+P2) open items over time |
| `GET /api/analytics/markov` | S3\* | Markov transition matrix over item lifecycle states + empirical fate |
| `GET /api/analytics/markov-evolution` | S3\* | Monthly sequence of matrices + key-transition time series |
| `GET /api/analytics/projects` | S3\* | Per-project item/open/overdue/completed counts |
| `GET /api/analytics/projects-intelligence` | S3\* | Per-project momentum: recent velocity vs baseline (heating/cooling) |
| `GET /api/analytics/priority` | S3\* | Counts + completion rate by priority band |
| `GET /api/analytics/labels` | S3\* | Top labels by items touched |
| `GET /api/analytics/habits` | S3\* | Streak history + recurring-item consistency |
| `GET /api/analytics/activity` | S3\* | Recent activity stream (timeline, grouped, session-detected) |
| `GET /api/analytics/radar` | S3\* | This-period vs previous-period across 6 dimensions |
| `GET /api/analytics/insights` | S3\* | Auto-generated plain-language findings |
| `GET /api/analytics/heatmap` | S3\* | 365-day daily completion intensity |
| `GET /api/analytics/reliability` | S3\* | Deadline adherence + overdue age buckets |
| `GET /api/analytics/aging` | S3\* | Open backlog age histogram |
| `GET /api/analytics/export` | S3\* | Full computed indicator payload (JSON download) |
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
├── server.py              # Flask API: actions, blocks, hierarchy, Google Calendar, analytics
├── requirements.txt       # flask, flask-cors, google-auth-oauthlib, google-api-python-client
├── README.md              # this document
├── data/
│   ├── mock_actions.json  # seed action constructs (conforms to schema.json)
│   ├── mock_blocks.json   # seed calendar blocks
│   ├── mock_scratch.json  # seed scratchpad document (Component S — markdown working doc)
│   ├── mock_todoist.json  # synthetic app.todoist dataset (analytics dashboard)
│   ├── gen_mock.py        # deterministic generator (+ optional schema validation)
│   └── gen_todoist_mock.py # deterministic Todoist-style dataset generator
├── config/                # (gitignored) client_secret.json + token.json
└── static/
    ├── index.html         # app-shell: header, sidebar, views, modals, command palette
    ├── css/               # design tokens & components (mirrors PRS/PTOCS)
    ├── fonts/             # self-hosted Spectral / Inter / IBM Plex Mono
    ├── katex/             # self-hosted KaTeX (js + css + woff2 fonts) — LaTeX math
    ├── share.html         # standalone public share page (/pwos/share/<token>)
    └── js/
        ├── store.js       # data layer (localStorage + API)
        ├── icons.js       # self-hosted Lucide icon set (<pw-icon>)
        ├── md.js          # markdown + LaTeX renderer (shared by app + share page)
        ├── vendor/
        │   └── echarts.min.js  # Apache ECharts (self-hosted, offline-first)
        ├── app.js         # router, view switching, keyboard, shared helpers
        ├── actions.js     # action list, filters, editor & detail modals
        ├── hierarchy.js   # objective tree (Component A)
        ├── calendar.js    # multi-view calendar (day/week/month/year) + block scheduling (Component B)
        ├── google.js      # Google Calendar status/auth/sync (Component C)
        ├── dashboard.js   # at-a-glance statistics
        ├── analytics.js   # S3* analytics dashboard (KPIs, ECharts, heatmap)
        ├── sessions.js    # work sessions / focus timer (Component D)
        ├── scratch.js     # scratchpad: single markdown + LaTeX doc, share by link (Component S)
        └── command-palette.js  # Ctrl/Cmd+K universal command interface
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Operations System** (VSM System 1 – Operations).
- **Spec:** [`../spec/pwos/spec.md`](../spec/pwos/spec.md) ·
  [`../spec/pwos/schema.json`](../spec/pwos/schema.json) ·
  [`../spec/pwos/analytics.md`](../spec/pwos/analytics.md).
- **Storage substrate:** [PRS](../prs/) — PWOS operates over PRS records; it is
  not a competing record store.
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/), [PTOCS](../ptocs/), [PPS](../pps/).
- **Decision log:** [`../logos.log.md`](../logos.log.md).

## References

- [PWOS — spec](../spec/pwos/spec.md) · [schema](../spec/pwos/schema.json) · [analytics](../spec/pwos/analytics.md)
- [Agency — Execution Architecture](https://bremontix.xyz/lab/ar/Locus-Social-Realitatis/Onto/Guide/Agency/#execution-architecture)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference/events)
