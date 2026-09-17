# ACSMS — Agent Capability Self Management System

A substrate sub-system that manages the deliberate growth of the agent's own
capabilities (see `spec/acsms/README.md`). This module materializes the
*Practice → Evidence → Review → Cull* span of the improvement lifecycle as a
tracking system:

- **Skill definition** — the catalog: name, description, tags, lifecycle
  status (`active` / `paused` / `retired`) and a cadence target
  (`target_per_week`).
- **Skill practice** — a self-report form records each session against an
  *existing* skill (date, duration, notes, quality/confidence 1–5, evidence
  URL). You cannot self-report practice on a skill that does not exist —
  the server validates `skill_id` and rejects unknown or retired skills.
- **Automated tracking** — every skill carries a computed `practice_state`
  derived from its practice history: `never-practiced`, `on-track`,
  `neglected` (stale beyond 2× the target interval), plus the lifecycle
  states. Flagged skills surface in the dashboard's attention queue.
  Practiced skills cannot be hard-deleted — they are *retired* so the cull
  decision is recorded.

## Layout

```
server.py        Flask app: API + UI  (mounted at /acsms/ by app/app.py)
data/skills.json seed catalog (applied only when the DB is empty)
static/          WOS-style shell: hash router, sidebar, command palette,
                 quick-capture overlay (Ctrl+Shift+N), dashboard / skills /
                 practice views
test_acsms.py    pytest suite (needs CouchDB on 127.0.0.1:5984; uses the
                 acsms_test_ DB prefix)
```

## Storage

CouchDB db `acsms` (subject to `COUCHDB_DB_PREFIX`), via the shared
`support.storage.Store`. Two document kinds, discriminated by `doc_type`:

- `skill` — `id` (`SKILL-…`), `name`, `description`, `tags`, `status`,
  `target_per_week`, `created_at_ms`, `updated_at_ms`.
- `practice` — `id` (`PRACTICE-…`), `skill_id`, denormalized `skill_name`
  (kept in sync on rename), `practiced_at_ms`, `duration_min`, `notes`,
  `quality`, `confidence`, `evidence_url`, `created_at_ms`.

## API

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | db reachability + counts |
| `/api/skills` | GET, POST | catalog (joined with tracking fields) / define |
| `/api/skills/<id>` | GET, PUT, DELETE | detail / edit / delete (409 if practiced) |
| `/api/practices` | GET, POST | stream (`skill_id`, `q`, `since_ms`, paging) / self-report |
| `/api/practices/<id>` | DELETE | remove a report |
| `/api/dashboard/stats` | GET | totals, state tallies, attention queue, recent |

Skill query filters: `?status=`, `?state=` (the computed practice state).
