# SOPCS — Standard Operating Procedure Catalog System

*Specification · 2026*

## 1. Formulation

A **Standard Operating Procedure (SOP)** is a document that specifies how a
recurring activity is to be carried out: its purpose, prerequisites, steps,
and cautions. A **SOP Catalog System** is the technical object that stores
such documents, makes them retrievable (by browsing, by full text, and by
meaning), tracks their lifecycle, and records every change.

The problem SOPCS answers: an agent's operative knowledge lives in habit,
chat history, and scattered notes. Habit cannot be audited; history cannot
be retrieved. Writing the procedure down — in a system whose whole purpose
is to keep it findable, current, and honest about its own state — converts
implicit routine into explicit, steerable structure. This is the same move
the PVSM makes everywhere: externalize, then regulate.

## 2. Characterization

- **What it is:** a catalog of markdown documents (SOPs) with metadata
  (slug, title, summary, tags, lifecycle status), derived reading
  aids (reading time, heading outline), retrieval (catalog browsing with
  pagination and facets; full-text search; optional semantic search), and
  supporting figures stored as database attachments.
- **What it is not:** not a wiki (no free-form page graph), not a note
  pile (one document = one procedure with a lifecycle), not a CMS (no
  users, no publishing pipeline — a single-operator system).
- **Inheritance:** SOPCS is a document catalog in the tradition of the
  Information Catalog System (Source, Document) applied to the self's own
  procedures; it is to *how work is done* what GIS is to *what is known*.

## 3. Design

### 3.1 The document

```json
{
  "id": "deploy-autoregia",          // slug, CouchDB _id
  "type": "sop",
  "title": "Deploying Autoregia",
  "summary": "Build and run the unified container locally…",
  "tags": ["deployment", "docker"],
  "status": "active",                // draft | active | deprecated
  "body": "# Deploying Autoregia\n\n…markdown…",
  "words": 209, "reading_minutes": 2, // derived at save (200 wpm)
  "toc": [{"level": 2, "text": "Prerequisites", "anchor": "h-3"}],
  "created_at": "…", "updated_at": "…"
}
```

Derived fields are computed **on save** by the server, so the catalog view
never needs document bodies. The TOC anchor contract: one counter over ALL
ATX headings (`#`–`######`) in document order produces `h-1, h-2, …`; the
shared renderer (`/ui/js/md.js` → `AUTOREGIA.Markdown`) stamps exactly
these ids on the rendered headings, so server-side outline and client-side
anchors can never diverge. Levels beyond 4 are anchored but not listed.

Side documents (same DB, `sopcs`):

- `type: "revision"` — the Notion-style history: one per content change
  (`id: "rev-<sop_id>-<seq>"`, per-SOP monotonic `seq`), carrying the full
  document snapshot, an optional note, and the timestamp. The SOP doc
  carries `revision` (its latest seq). Kept forever; deleted with the SOP.
  See §3.5.
- `type: "embedding"` — `id: "embed-<sop_id>"`, the L2-normalized 384-dim
  BGE-small vector of title+summary+tags+body, written in a background
  thread on content changes and by `POST /api/reindex`.
- `type: "image"` — one per upload (`id: "img-<hex>"`), holding
  content-type/size/filename; the bytes ride as a CouchDB **attachment**
  via the shared `Store.put_attachment`/`get_attachment` API. Images are
  standalone (not purged when a referencing SOP is deleted) and persist
  with the `couchdb_data` volume — never the container filesystem.
- `type: "audit"` — one append-only record per mutation (CTES convention).

### 3.2 Retrieval

- **Catalog** (`GET /api/docs`): metadata projection via Mango, then
  filter (status, tag), sort (`updated|created|title`), paginate. The
  catalog is a browsing surface at personal scale; the search surfaces are
  where the query machinery lives.
- **Lexical** (`GET /api/search?q=…&mode=lexical`): the WOS search
  pattern — a design-doc `token` view over title+summary+tags+body,
  queried by per-token prefix ranges (`[tok, tok+"\uffff"]`). AND
  semantics intersect per-token doc-id **sets** (a doc matches when it
  contains every token); `score` is total query-token occurrences;
  ranking is score then recency. Every lookup executes inside CouchDB.
- **Semantic** (`mode=semantic`, `mode=auto`): `fastembed`
  (`BAAI/bge-small-en-v1.5`) embeds the query; cosine similarity over the
  stored embedding side-docs. The WOS clustering convention is kept:
  fastembed is a lazy import, never a requirements entry; when absent,
  `mode=semantic` answers `501` with the reason, `mode=auto` degrades to
  lexical, and the UI disables the toggle. Enable with
  `pip install fastembed`, then *Re-index*.
- **Figures in search:** image bytes are not embedded; their `alt` text
  and surrounding prose are.

### 3.5 Revision history (the version mechanism)

CouchDB keeps no readable history of superseded revisions, so SOPCS
snapshots explicitly: **every content change** (body, title, summary,
tags, or status — a no-change save snapshots nothing) writes the whole
document as a `type: "revision"` side doc before the change is reported.
Snapshots are full, never patches — bodies are KB-scale, patches would be
fragile chains, and full snapshots make every operation trivial:

- **Diff on read** — `difflib.unified_diff` computed at request time,
  always older → newer so additions render as `+` (a rev's default diff
  compares its predecessor to it; rev 1 diffs against empty;
  `?against=latest` compares to the current document).
- **Restore is forward-only** — restoring an old version writes its
  content as a *new* revision. History is immutable; undo is restoring
  forward; the audit trail records `sop.restore` with the source seq.
- **Retention** — kept forever (a personal catalog of KB-sized documents
  makes the storage question someone else's problem); deleting a SOP
  cascades its revisions, the audit record of the deletion remains.
- **Line normalization** — diff inputs get a guaranteed trailing newline
  so a final line without one cannot fuse a `-` hunk line with the
  following `+`.

The reader exposes this as a **History** panel (per-tool modal markup,
shared `AUTOREGIA.dialog` contract): revision list on the left, unified
diff with red/green line tinting on the right, restore behind a confirm.

### 3.6 Overview (the dashboard)

`GET /api/overview` assembles one payload — catalog shape (counts by
status, total words / reading time), top tags, recently updated, **stale
actives** (active SOPs untouched for 90+ days — the review queue),
latest revisions across the catalog, a 30-day edit-activity histogram,
figure count, and the retrieval stack's health (embeddings indexed vs
sops — a lag line waiting on `/api/reindex` — plus backend status). The
dashboard view renders it with token-colored CSS bars — no vendor chart
library; the surface is lists, links, and proportions.

### 3.8 Semantic clusters (the dashboard topic graph)

A batch-computed map of how the catalog clusters by meaning, in the WOS
clustering tradition (`sopcs/clustering.py`): **embeddings primary** —
cosine space of the stored embedding side-docs, no model call at cluster
time — with a **lexical TF-IDF fallback** when no embeddings exist.
Spherical k-means (k = `max(2, min(8, √(n/2)))`), cluster labels = top
non-ubiquitous tokens of member documents, and a deterministic 2-D PCA
projection place every SOP on the map; per-node k-nearest-neighbour
cosine links (top 2, ≥ 0.2) render it as a similarity graph.

- **Batch, never on read**: `POST /api/clusters` computes and stores one
  `CLUSTERS-current` document (`type: "clustermap"`); `GET /api/clusters`
  returns it. `POST /api/reindex` refreshes the map so it never lags its
  own vectors.
- **Degradation contract**: no numpy/fastembed, or fewer than three
  SOPs, yields `meta.backend: "none"` with a reason; the dashboard's
  empty state says which and offers the Compute action. The ECharts
  force-free graph (`layout: 'none'` on PCA coordinates — a true map,
  not an animation) sizes nodes by words, colors by cluster, and opens
  the reader on click.

### 3.9 The app shell

The WOS-style application shell (the CTES copy of the house grammar):
header search, sidebar router, command palette (`Ctrl K`), toast, shared
icons — all relative URLs, all tokens from the shared layer. Three
surfaces:

- **Library** — search bar with `auto | lexical | semantic` mode, status
  segment, tag facets, record cards (title, summary, status badge,
  reading time, updated, tags), pagination.
- **Reader** — metadata header, rendered markdown (shared renderer:
  XSS-safe escape-then-render; tables, task lists, code fences, images),
  sticky TOC rail with smooth scrolling, history panel, edit/delete.
- **Editor** — metadata fields; Write/Preview toggle; markdown toolbar;
  figure insertion via **file picker, clipboard paste, or drag-and-drop**
  → upload → `![alt](api/images/<id>)` inserted at the cursor (relative
  URL, valid under any mount); unsaved-changes guard.
- **Dashboard** — the landing view: the overview payload as stat cards,
  bars, and linked lists (§3.6), plus the semantic cluster graph (§3.8).

### 3.4 Audit

`sop.create | sop.update | sop.delete | sop.reindex | image.upload` —
actor, action, entity, summary, details. Never pruned. Deleting a SOP
removes its embedding side-doc; its images are kept (they may be shared).

## 4. Verification

`app/module/ate/tool/sopcs/test_sopcs.py` (CouchDB-required, isolated
`sopcs_test_` prefix, hermetic via `SOPCS_EMBED_BACKEND=lexical`):

- CRUD + validation (required title/body, slug rules, status enum, tag
  normalization, duplicate conflict, auto-slug).
- Derived fields: TOC anchors match the renderer's global numbering
  (levels ≤4 listed), reading time from 200 wpm, summary derivation.
- Pagination windows, sort orders, status/tag filters, tag facets.
- Lexical search: single token, AND semantics (non-co-occurring tokens →
  empty), prefix matching, filter composition, empty query → recency.
- Semantic contract: 501 with reason when unavailable; auto falls back.
- Images: upload/serve roundtrip (bytes + content-type + cache headers),
  markdown snippet, 415/400/404 paths.
- Revisions: snapshot on create (rev 1) and content-changing updates (no
  snapshot on no-change saves), seed backfill, list/detail, diff
  direction (older → newer, rev 1 vs empty, against=latest), forward-only
  restore with audit, cascade delete.
- Overview: payload counts, activity histogram shape, stale-active
  flagging, retrieval lag.
- Clusters: absent map → graceful none; compute without numpy → 501 with
  an install hint; too few SOPs → says so; with numpy (skipped in its
  absence): lexical compute stores and returns assignments/edges/meta.
- Audit records, API index, self blob, plate.

## 5. Relation to Autoregia

- **ATE** hosts SOPCS at `/ate/tool/sopcs/`; the toolbox gains its
  procedure-knowledge layer next to computation (CES) and task execution
  (CTES).
- **WOS** contributes the search pattern (token view) and the
  embeddings-with-graceful-degradation convention (clustering).
- **CTES** contributes the shell grammar and the audit convention.
- **Shared layers:** `support/storage` gains a public attachment API;
  `support/ui/js/md.js` promotes the AOOS renderer to the design-system
  layer (images, heading anchors, tables) with AOOS as an aliasing
  consumer.
- The seeded catalog begins with the system's own procedures (deploy,
  commit workflow, CouchDB reseed) — SOPCS documents itself from day one.

## 6. Implementation Status

- [x] Server: catalog CRUD + derived fields, catalog listing (pagination,
      facets, sort), lexical token-view search, optional semantic search
      + reindex, image upload/serve as CouchDB attachments, audit, self,
      seed fixtures + derived-field normalization.
- [x] Revisions: full-snapshot history on every content change, unified
      diff on read, forward-only restore, cascade delete, forever
      retention.
- [x] Overview + dashboard (default landing): shape, review queue,
      activity histogram, retrieval health.
- [x] Semantic clusters: batch cluster map (embeddings primary, TF-IDF
      fallback), PCA topic graph on the dashboard, k-NN similarity edges.
- [x] Store: public `put_attachment` / `get_attachment`; public `seed`.
- [x] Shared renderer `/ui/js/md.js` (images, heading anchors, tables,
      outline helper); AOOS alias.
- [x] Shell: dashboard / library / reader / editor views, history panel,
      command palette, icons.
- [x] Tests (44) wired into `make test`.
- [ ] Procedure ownership and review workflow beyond the stale list.
- [ ] Cross-SOP links index and backlinks.
- [ ] Word-level diff highlighting inside changed lines.
