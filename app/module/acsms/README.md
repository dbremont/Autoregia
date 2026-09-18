# ACSMS — Agent Capability Self Management System

A substrate sub-system that manages the deliberate growth of the agent's own
capabilities (see `spec/acsms/README.md`). This module materializes the
*Practice → Evidence → Review → Cull* span of the improvement lifecycle as a
tracking system:

- **Skill definition** — the catalog: name, description, tags, **domain**
  (free-form grouping, `General` fallback), self-assessed **level** 0–5
  (the catalog progress bar), lifecycle status (`active` / `paused` /
  `retired`) and a cadence target (`target_per_week`). Every definition and
  edit is recorded in an embedded **change log** (field-level from → to
  diffs, capped at 100 entries).
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
- **Skill paths** — ordered curricula (`path` docs): a sequence of skill ids
  with derived progress (share of members practiced, completion %) and a
  *current step* (first member still needing work). Deleting a path never
  touches its skills.

## Layout

```
server.py        Flask app: API + UI  (mounted at /acsms/ by app/app.py)
data/skills.json seed catalog (applied only when the DB is empty)
data/paths.json  seed paths (same rule)
static/          WOS-style shell: hash router with sub-routes (#skills/<id>),
                 command palette (Ctrl+K), quick-capture overlay
                 (Ctrl+Shift+N), dashboard / catalog + right rail / skill
                 detail / paths views
test_acsms.py    pytest suite (needs CouchDB on 127.0.0.1:5984; uses the
                 acsms_test_ DB prefix)
```

## Storage

CouchDB db `acsms` (subject to `COUCHDB_DB_PREFIX`), via the shared
`support.storage.Store`. Three document kinds, discriminated by `doc_type`:

- `skill` — `id` (`SKILL-…`), `name`, `description`, `tags`, `domain`,
  `level`, `status`, `target_per_week`, `changes[]` (embedded changelog),
  `created_at_ms`, `updated_at_ms`.
- `practice` — `id` (`PRACTICE-…`), `skill_id`, denormalized `skill_name`
  (kept in sync on rename), `practiced_at_ms`, `duration_min`, `notes`,
  `quality`, `confidence`, `evidence_url`, `created_at_ms`.
- `path` — `id` (`PATH-…`), `name`, `description`, `skill_ids[]` (ordered),
  `status` (`active`/`archived`), `created_at_ms`, `updated_at_ms`.

## API

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | db reachability + counts |
| `/api/skills` | GET, POST | catalog (joined with tracking fields) / define |
| `/api/skills/<id>` | GET, PUT, DELETE | detail / edit (diff → changelog) / delete (409 if practiced) |
| `/api/practices` | GET, POST | stream (`skill_id`, `q`, `since_ms`, paging) / self-report |
| `/api/practices/<id>` | DELETE | remove a report |
| `/api/paths` | GET, POST | paths with joined member stats / define |
| `/api/paths/<id>` | GET, PUT, DELETE | detail / edit (reorder via `skill_ids`) / delete |
| `/api/activity` | GET | merged feed: practice events + skill changes |
| `/api/dashboard/stats` | GET | totals, state tallies, domains, weekly milestone, attention, recent |

Skill query filters: `?status=`, `?state=` (the computed practice state).
Path GETs carry `members[]` (id, name, state, level, practice_count),
`completion_pct`, `practiced_count`, and `current_step` (index into
`members`, or null).
