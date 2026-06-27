# Personal Recording System (PRS) — Prototype

A production-quality frontend prototype for a **Personal Recording System** — a technical object engineered to preserve the continuity and coherence of human agency by externalizing relevant states and enabling their persistent recording, discovery, retrieval, and use over time.

> The backend is **mocked** (Flask + JSON file). The client is the **actual final version** in terms of UX, visual design, and interaction patterns.

---

## Quick Start

```bash
pip install flask flask-cors
python3 server.py
```

Open **http://localhost:5000** in your browser.

> **Note:** The frontend works fully offline via `localStorage`. If the API is unavailable, it uses seeded mock data. To reset to seed data, clear localStorage (or open an incognito window).

---

## Architecture

```
tool-prs/
├── server.py                    # Flask mock API (records, search, stats, export/import)
├── data/
│   └── mock_records.json        # 30 seed records spanning all record types
├── static/
│   ├── index.html               # SPA shell (single entry point)
│   ├── css/
│   │   ├── variables.css        # Design tokens (Oxford-inspired palette)
│   │   ├── base.css             # Reset, typography
│   │   ├── layout.css           # App shell, sidebar, grid
│   │   ├── components.css       # Buttons, cards, badges, forms, modals
│   │   ├── views.css            # Dashboard, record list, editor, viz
│   │   └── command-palette.css  # Command palette + scratchpad overlay
│   └── js/
│       ├── store.js             # Data layer (localStorage + API sync)
│       ├── app.js               # SPA router, view switching, keyboard
│       ├── record.js            # Record CRUD, editor, viewer, annotations
│       ├── dashboard.js         # Dashboard statistics & sub-views
│       ├── search.js            # Full-text search + filtering
│       ├── timeline.js          # Chronological record timeline
│       ├── heatmap.js           # GitHub-style activity heatmap (SVG)
│       ├── graph.js             # Relationship graph (SVG)
│       ├── command-palette.js   # Universal command interface (Ctrl+K)
│       ├── scratchpad.js        # Quick capture (Ctrl+Shift+N)
│       ├── complementary.js     # Mock complementary feature panels
│       ├── charts.js            # SVG bar & donut charts
│       ├── study.js             # Record Study (Analysis) mocks
│       └── summary.js           # Record Summary (Daily/Weekly/Monthly/Annual)
└── requirements.txt
```

**Stack:** Python Flask · Vanilla JS (no framework) · Hand-crafted CSS · SVG visualizations (no chart library)

---

## Features

### Core Record Management
- **Insert** — Full editor with progressive disclosure for all metadata categories
- **Annotation** — Append-only commentary log per record
- **Search** — Full-text search weighted across content, tags, subject, domain, type, ID
- **Reminders** — Deadline tracking with date fields
- **Share Link** — Each record has a stable ID for referencing
- **Quick Capture** — Scratchpad with auto-type detection (Ctrl+Shift+N)

### Dashboard
- Summary statistics (total records, active/pending, critical, types)
- "By Type" bar chart and "By Status" donut chart (SVG)
- Recent records feed
- Quick actions panel

### Derivative Functionality (Visualizations)
- **Record Timeline** — Vertical chronological display, color-coded by type
- **Activity Heatmap** — GitHub-style contribution grid (last 180 days)
- **Relationship Graph** — Node-link diagram of record relationships
- **Topic Landscape** — Browse by type via sidebar navigation

### Record Study (Analysis) — Mocks
The **Record Study** view (`#study`) renders the six derivative analyses defined in the spec, all derived from stored records (mocks):
- **Time Reference Evolution** — stacked area of `horizon` distribution over time
- **Record Time Line** — scatter plot (x = day, y = hour of day, one point per record)
- **Activity Heat Map** — contribution grid (reused heatmap renderer)
- **Topic Landscape Evolution** — domain bubbles with mocked growth trajectories
- **Record Embedding Graph** — deterministic 2D pseudo-embedding, clustered by domain
- **Recurrence Map** — radial map of recurring records by cadence (Daily/Weekly/Monthly/Yearly)

### Record Summary — Mocks
The **Record Summary** view (`#summary`) generates period digests (Daily / Weekly / Monthly / Annual) from stored records:
- Anchor-date selector with period tabs
- Stat line (records, deadlines, annotations, all-time)
- Top Types / Domains / Tags / Status mixes
- Highlights feed for the selected period

### Complementary Features (Visual/Mocked)
- Google Calendar Integration panel
- Keyword Navigation (tag/type browsing)
- Intelligent Autocomplete (mock LLM suggestions)
- Browser Autosave (functional localStorage)
- Intelligent Suggestions panel
- Voice Input (mock)
- Data Export/Import (functional JSON)
- Encryption status indicator (mock)

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Open Command Palette |
| `Ctrl/Cmd + Shift + N` | Quick Capture (Scratchpad) |
| `N` | New Record |
| `Esc` | Close modals/palette |
| `Enter` (in palette) | Select first result |
| `↑/↓` (in palette) | Navigate results |

---

## Record Model

Each record implements the full spec schema (11 metadata categories):

**Core:** `id`, `content`, `detail`, `created_at`, `updated_at`

**Classification:** `record_type` (Goal, Decision, Task, Project, Event, Observation, Hypothesis, Question, Principle, Reference, Lesson, Idea, Meeting, Procedure, Commitment, Constraint, Resource, Opportunity), `state_class`, `domain`, `subject`, `tags`

**Operational:** `status` (Draft/Active/Pending/Blocked/Completed/Archived/Scheduled/Cancelled), `priority` (Critical/High/Medium/Low), `owner`, `project`, `workflow_state`

**Temporal:** `horizon`, `relevance`, `recurrence`, `validity`, `deadline`

**Epistemic:** `confidence`, `evidence_level`, `source_type`, `verification_status`

**Relational:** `links` `[{target, type}]`, `annotations` `[{id, kind, text, author, created_at}]`

---

## Design System — Editorial / Scholarly

The interface follows the spec's UI/UX principles: visually calm, consistent, minimal, with aesthetics emerging from clarity, hierarchy, and purposeful design — refined to a classic, editorial register (academic journal × private study × fine print craft).

- **Typography (self-hosted, offline-first):** Spectral (serif display/body, with true italic) + Inter (sans UI, tabular figures) + IBM Plex Mono (IDs/keys)
- **Palette:** Warm parchment background, deepened Oxford red (`#7A1A2A`), signature gold hairline rule, a 10-step warm-neutral ink ramp, semantic status colors
- **Iconography:** Self-hosted Lucide monoline set (1.6px stroke, 24px grid) via a `<prs-icon>` custom element / `PRS.icon()` helper — no Unicode glyphs
- **Detailing:** Hairline (0.5px) borders, multi-layer ambient shadows, architectural (sharper) radii, keycap-styled keyboard hints, editorial small-caps eyebrows
- **Whitespace as structure** — 4/8 baseline grid, reading-measure prose columns, generous gutters
- **Semantic color usage** — Colors communicate record type, status, priority
- **Progressive disclosure** — Essential metadata first; advanced sections collapsible
- **Command palette everywhere** — Universal Ctrl+K interface for all actions
- **Motion with purpose** — Expo-out easing vocabulary, staggered reveals, guarded by `prefers-reduced-motion`
