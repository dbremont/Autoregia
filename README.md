# Personal Recording System (PRS)

A web-based implementation of the [Personal Recording System design](design/README.md) — a cognitive infrastructure for preserving continuity of state, supporting coherent agency across time, and externalizing cognition.

The system stores **records** (decisions, tasks, risks, reflections, events, etc.) with rich metadata, relational links, and temporal projections. It renders four interactive perspectives: a **Dashboard**, a **Timeline** of upcoming deadlines, a **Knowledge Graph** of record relationships, and a searchable **Record Log**.

## Architecture

```
prs/
├── design/                 # Original design documents
│   ├── README.md           # Conceptual foundations & grammar
│   ├── client.html         # Original single-file mockup
│   ├── client-spec.md      # Client specification
│   └── gramar.ebnf         # PRSL formal grammar (EBNF)
│
├── backend/                # Python + Flask + SQLite backend
│   ├── app.py              # Flask app, REST API, vocabularies
│   ├── db.py               # SQLite data layer (JSON document store)
│   ├── prsl.py             # PRSL text exporter (gramar.ebnf format)
│   └── seed.py             # Seed data loader
│
├── static/                 # Frontend (vanilla HTML/CSS/JS)
│   ├── index.html          # SPA shell
│   ├── css/style.css       # Dark theme stylesheet
│   └── js/
│       ├── api.js          # REST API client
│       ├── app.js          # View controller & rendering
│       ├── forms.js        # Create/edit record modal
│       └── graph.js        # Canvas force-directed graph
│
├── data/
│   ├── seed.json           # 15 sample records with relations
│   └── prs.db              # SQLite database (auto-created)
│
├── requirements.txt        # Python dependencies
└── run.py                  # Entry point
```

### Storage Model

- **SQLite** stores records as JSON documents in the `records` table, with denormalized columns (`execution_state`, `priority`, `domain`, `deadline`, etc.) for fast dashboard queries.
- **Relations** between records are stored in a separate `relations` table for the knowledge graph.
- Each record follows the schema from `design/README.md` with all metadata categories: temporal, contextual, epistemic, operational, lifecycle, relational, and general.

## Quick Start

### Prerequisites

- Python 3.10+
- pip

### Install & Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the server (auto-creates DB + loads seed data)
python run.py
```

Then open **http://localhost:5000** in your browser.

To start without loading seed data:

```bash
python run.py --no-seed
```

### Resetting the Database

```bash
# Reload seed data (wipes existing records)
python -m backend.seed --force
```

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Aggregate metrics (active, blocked, critical, speculative counts) + recent activity feed |
| **Record Log** | Searchable/filterable table of all records |
| **Timeline** | Upcoming deadlines sorted chronologically |
| **Knowledge Graph** | Interactive force-directed canvas visualization of record relationships |
| **Record Detail** | Full metadata view with PRSL grammar export |
| **Create / Edit / Delete** | Full CRUD with tag picker and relation editor |
| **Search** | Full-text search across record content and detail |
| **Filters** | Filter by active, blocked, completed, risks, or decisions |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/records` | List records (`?filter=active&q=search`) |
| `GET` | `/api/records/:id` | Get single record |
| `POST` | `/api/records` | Create record |
| `PUT` | `/api/records/:id` | Update record |
| `DELETE` | `/api/records/:id` | Delete record |
| `GET` | `/api/records/:id/prsl` | Export record as PRSL text |
| `GET` | `/api/stats` | Dashboard aggregate stats |
| `GET` | `/api/graph` | Graph nodes & links |
| `GET` | `/api/timeline` | Records with deadlines, sorted |
| `GET` | `/api/meta` | Controlled vocabularies for forms |

## Record Schema

Each record contains these sections (based on `design/README.md`):

```json
{
  "id": "REC-2026-00001",
  "content": "Brief description",
  "detail": "Extended explanation",
  "retentionPolicy": "permanent",
  "temporalMetadata": {
    "createdAt": "2026-01-15 09:30:00",
    "updatedAt": "2026-02-20 14:22:00",
    "deadline": "2026-03-15 17:00:00",
    "orientation": "prospective"
  },
  "contextualMetadata": { "projectContext": "Project-Alpha" },
  "epistemicMetadata": {
    "confidence": "85%",
    "validationState": "confirmed",
    "evidenceSource": ["technical-spec", "security-audit"]
  },
  "operationalMetadata": {
    "executionState": "active",
    "priority": "critical",
    "delegation": "team-backend"
  },
  "lifecycleMetadata": { "state": "revised", "revision": 3 },
  "relationalMetadata": [
    { "target": "REC-2026-00003", "type": "depends-on" }
  ],
  "generalMetadata": {
    "classification": "Internal",
    "domain": "technical-work",
    "tags": ["critical", "active"],
    "cognitiveCategory": "Operational State",
    "operationalCategory": "task"
  }
}
```

## License

Personal project. See `design/` for the conceptual foundation.