# General Index System (GIS)

> GIS is the **General Index System** — an Autoregia sub-project within the
> **Intelligence System** (VSM System 4 – Intelligence). It is the **general
> index of everything** the agent knows and uses: each entry is a
> **point → element** pair, where the point is the handle (a name/alias) and
> the element is what it points to — a GitHub project, a document, a service,
> a capability, or a deep-link into any other Autoregia system. The index is
> the **entry point to everything**.

> This directory contains the **prototype implementation**. It evolved from
> the PTOCS catalog (Personal Technical Object Catalog System); entries
> follow the catalog schema plus an optional `target` field
> (`{kind, system, url, ref}`) that turns a catalog entry into a live index
> pointer. The CouchDB database remains `ptocs` for data continuity.

## Prototype

A Flask API server plus a vanilla HTML/CSS/JS client that conforms to the
Autoregia UI specification ([`../spec/ui.spec`](../spec/ui.spec)).

### Structure

```
gis/
├── server.py              # Flask API: CRUD, index projection, overview, search,
│                          #   browse, analysis, activity log, export/import
├── requirements.txt       # flask, flask-cors
├── test_gis.py            # pytest suite (needs CouchDB on 127.0.0.1:5984)
├── README.md              # this document
├── data/
│   ├── mock_entries.json  # seed catalog (31 entries, conforms to schema.json)
│   └── gen_mock.py        # deterministic generator (+ optional schema validation)
└── static/
    ├── index.html         # app-shell: header, sidebar, views, modals, command palette
    ├── css/               # design tokens & components (mirrors PRS, the reference impl)
    ├── fonts/             # self-hosted Spectral / Inter / IBM Plex Mono (offline-first)
    └── js/
        ├── store.js       # data layer (localStorage + API)
        ├── icons.js       # self-hosted Lucide icon set (<pt-icon>)
        ├── charts.js      # ECharts wrappers within the design system
        ├── app.js         # router, view switching, keyboard, shared helpers
        ├── search.js      # header search application (delegates to the Index view)
        ├── home.js        # General Index home: hero, stats, tabs, table/grid,
        │                  #   pagination, right rail (spaces, filters, tags,
        │                  #   graph preview, activity)
        ├── entry.js       # entry card, editor & detail modals
        ├── reference.js   # user-facing plates: Data Sources, Documentation, About
        ├── dashboard.js   # multi-tab dashboard: Overview · Coverage · Structure
        │                  #   · Health · Cost & Trust · Activity
        ├── analysis.js    # shared /api/analysis projection service + the four
        │                  #   analytics tab renderers
        ├── relations.js   # relationship graph (force layout)
        └── command-palette.js  # Ctrl+K universal command interface
```

### Run

```bash
python3 -m venv ../env && source ../env/bin/activate   # once, shared venv
pip install -r requirements.txt
python3 server.py
# open http://localhost:5003
```

The server listens on **port 5003** (PRS → 5000, PKTS → 5001/5002). The port can
be overridden with the `PTOCS_PORT` environment variable.

To regenerate the seed catalog:

```bash
python3 data/gen_mock.py
```

If [`jsonschema`](https://pypi.org/project/jsonschema/) is installed, the
generator validates every entry against `spec/ptocs/schema.json`.

### What it implements

Per [`../spec/ptocs/spec.md`](../spec/ptocs/spec.md):

- **Catalog (CRUD):** insert, update, delete, retrieve, and pin/unpin entries.
  Entries carry a `space` field (`personal | work | projects`) in addition to
  `pinned` (favorites), and the kind set extends the catalog schema with
  `document`, `language`, `person`, `project`, and `other`.
- **Index home:** a filtered, paginated projection (`/api/index`) of every
  entry with kind-group tabs (Documents / Tools / Services / Infra / Data /
  People / Projects / More), sort (relevance / updated / name / created), a
  list & grid mode, and an overview endpoint (`/api/overview`) for header
  stats (total, kinds, relationship count, freshness) and facet counts
  (kinds, groups, spaces, top tags). The right rail holds quick actions,
  space chips, kind filters with counts, top tags, a knowledge-graph
  preview, and recent activity.
- **Dashboard (multi-tab):** one tabbed analytics surface derived from the
  statistics the system holds — **Overview** (composition + pinned + recent),
  **Coverage** (domains, hosting, capability gaps), **Structure** (dependency
  depth, single points of failure, redundancy clusters), **Health** (findings,
  lifecycle/freshness, ecosystem concentration), **Cost & Trust** (recurring
  spend, evidence levels, under-validated entries), and **Activity** (the
  added/updated/viewed/deleted feed). The analysis tabs share one cached
  `/api/analysis` projection with a client-side fallback.
- **Activity log:** `added / updated / viewed / deleted` events persisted in
  a separate CouchDB db (`ptocs_activity`; view/updated events throttled to
  one per entry per hour), surfaced in the Activity tab and the home rail
  (`POST /api/entries/<id>/view`, `GET /api/activity`).
- **Retrieval & Navigation:** search (scored), faceted counts (`/api/browse`,
  API retained), capability discovery via the relationship graph, and entry
  detail with the full classification/provenance/delivery/cost/usage/
  epistemic/strategic metadata.
- **Reference:** three user-facing plates about the Index itself — **Data
  Sources** (the live list of data-source entries, linked to their detail
  views and out to their sources), **Documentation** (every view, control,
  and shortcut in plain language, plus entry anatomy, kinds, and spaces),
  and **About** (the point → element idea and the system's role). Rendered
  in the standalone-document archetype (`design.md` §3.2).
- **Derivative:** JSON export & import (merge-by-id).
- **Append-only Annotation Log:** per-entry commentary without mutating content.

### Tests

```bash
python3 -m pytest test_gis.py   # needs CouchDB on 127.0.0.1:5984
```

Uses an isolated `gis_test_` CouchDB DB prefix; the dev/prod `ptocs` data is
never touched.

### UI / UX

The interface follows the **Autoregia UI specification** — warm-parchment
Oxford aesthetic, shared design tokens (copied verbatim from the PRS reference
implementation), the same CSS file split, the app-shell layout, self-hosted
Lucide icons (`<pt-icon>`), a command palette (`Ctrl/Cmd+K`), keyboard
shortcuts (`N` for new entry, `Esc` to close), reduced-motion support, and
offline-first fonts. Apache ECharts is used for the data-rich analysis surfaces,
themed **within** the design system (palette references the tokens, not an
alien theme).

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Intelligence System** (VSM System 4 – Intelligence).
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/).
- **Shared UI standard:** [`../spec/ui.spec`](../spec/ui.spec).
- **Decision log:** [`../logos.log.md`](../logos.log.md).

## References

- [Spec](../spec/ptocs/spec.md) · [Schema](../spec/ptocs/schema.json) · [Spec manifest](../spec/ptocs/spec.json)
- [csiglab/Index](https://github.com/csiglab/Index) — the originating "Tool Index" concept.
