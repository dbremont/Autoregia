# Personal Technical Object Catalog System (PTOCS)

> PTOCS is the **Personal Technical Object Catalog System** — an Autoregia
> sub-project within the **Intelligence System** (VSM System 4 – Intelligence).
> It builds and maintains a **catalog of the technical objects** (software,
> services, hardware, references, capabilities, and infrastructure) the agent
> uses in daily life, enabling their persistent recording, discovery,
> retrieval, navigation, and analysis over time.

> This directory contains the **prototype implementation**. Conceptual
> foundations, the data model, and the full functional specification live in
> [`../spec/ptocs/`](../spec/ptocs) ([`spec.md`](../spec/ptocs/spec.md),
> [`schema.json`](../spec/ptocs/schema.json),
> [`spec.json`](../spec/ptocs/spec.json)).

## Prototype

A Flask mock-API server plus a vanilla HTML/CSS/JS client that conforms to the
Autoregia UI specification ([`../spec/ui.spec`](../spec/ui.spec)).

### Structure

```
ptocs/
├── server.py              # Flask API: CRUD, search, browse, analysis, export/import
├── requirements.txt       # flask, flask-cors
├── README.md              # this document
├── data/
│   ├── mock_entries.json  # seed catalog (23 entries, conforms to schema.json)
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
        ├── search.js      # header + catalog filter application
        ├── entry.js       # catalog list, filters, editor & detail modals
        ├── dashboard.js   # at-a-glance statistics + charts
        ├── browse.js      # faceted pivot cards (kind/domain/status/system/…)
        ├── relations.js   # relationship graph (force layout)
        ├── analysis.js    # Statistical Overlay (coverage, gaps, redundancy, …)
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
- **Retrieval & Navigation:** search (scored), browse by facet, capability
  discovery via the relationship graph, and entry detail with the full
  classification/provenance/delivery/cost/usage/epistemic/strategic metadata.
- **Statistical Overlay (Analysis):** coverage & composition, capability-gap
  analysis, redundancy/overlap detection, dependency-graph analytics (depth,
  fan-in/out, single points of failure), cost exposure, lifecycle/freshness,
  ecosystem health (orphans, vendor/license concentration), and provenance/trust.
- **Derivative:** JSON export & import (merge-by-id).
- **Append-only Annotation Log:** per-entry commentary without mutating content.

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
