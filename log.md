# Log

> A guide that connect reality ([Nature](https://app.notion.com/p/Nature-554701ca10264f4091f1e9e8fd7aec04?pvs=21) ) -  with its representation ([Modelado](https://app.notion.com/p/Modelado-a6727ea210124fb9a00ff6bb5bcf7cd5?pvs=21), [Computacion](https://app.notion.com/p/Computacion-d20204a3de774ceca5cdc90a12e469ef?pvs=21),  [Formal System](https://app.notion.com/p/Formal-System-41d02881d0544314b0e7ad3e6ada608a?pvs=21), [Algorithm](https://app.notion.com/p/Algorithm-617ee00b46ea444799ea7a4945d72921?pvs=21),  [Observer](https://app.notion.com/p/Observer-24bc0f5171ec8060b8f3d55b4b766042?pvs=21) and [Representation](https://app.notion.com/p/Representation-4afbffa763ec46eeb10d8c87c248edf1?pvs=21) )

> **Reality** is the total set of phenomena, entities, and processes that exist or occur, **independently of an observer’s perception or conceptualization**, and which can, in principle, interact, change, or produce effects.

> Physics is a training ground for rigorous modeling because it enforces precise, testable, and feedback-rich representations of reality. The value lies in transferring this epistemic discipline—rather than its specific models—into more complex domains like social systems. [Why study physics?](https://app.notion.com/p/Why-study-physics-32ac0f5171ec80308107ccd0987455ef?pvs=21)

> Conceptual Model:

> [Conceptual Model: Philosophia Naturalis](https://app.notion.com/p/77e5241481084270b1ba038bb708971d?pvs=21)

> ...

TODO:

- Recurrence Epistemic Overlay:
   - Topic Recurrence
   - Reccurence Intensity
   - Topic Abstraction and Grouping (- > and More Grouping)

- How does let's say news, commentary feeat in such system? Are they relevant? How much should I Capture the State of the World?

- Record

 -> Topic -> Topic Grouping -> ... -> Grouping
 -> ...
 -> Embedding

## Index

### 2026 — GCAL wave 1: the connector manager goes live

**Question.** The GCAL design (registry, lifecycle, gateway, dormant OAuth2)
was complete but unimplemented. How should wave 1 land so the manager's
generic machinery is proven before any OAuth complexity — and what proves
the dispatch design is at the right level?

**Decision.**

1. **Manager shell + handler dispatch, not abstraction**: `base.py` holds
   the handler contract (`setup/credentials schemas, connect, test,
   execute, disconnect, refresh, classify, reconnect_hint`), auth helpers,
   the bounded HTTP gateway, and shape-aware credential masking;
   `connectors/` holds six handlers (http, rss, github, couchdb, files,
   smtp) discovered by package scan. The server resolves `connector_id →
   handler` and owns lifecycle state, health, and the log.
2. **Use drives health**: executions stamp `last_used_at`; the *handler*
   classifies outcomes (Github's quota-exhausted 403 is retryable, a 401 is
   auth failure); consecutive failures trip `error`; non-`connected` runs
   answer 409 with the handler's reconnect hint.
3. **Hermetic tests**: injectable transports per handler (`transport=`,
   `smtp_factory=`, `tmp_path`) plus a fixture RSS/Atom corpus — 34 tests,
   zero network. The server suite patches one seam
   (`base.default_transport`) for full-stack gateway coverage.
4. **Disconnect is an operation**: revoke best-effort, void the vault, keep
   settings + history; delete stays the hard remove.

**Rationale.** Six live connectors with zero new secrets prove the
machinery (including per-system specifics: Notion-style pickers are schema
fields, SMTP's TLS coupling is setup validation, GitHub's keyless reads are
a scheme choice) before the OAuth broker arrives in wave 2.

**Trade-offs accepted.** `bad_params` from handlers answers 400 while
unknown actions do too — consistent, but the 400/409/501/502 spread is now
a small contract callers must read; the runner reads error bodies as JSON
to preserve reconnect hints. localStorage has no role (all state is
server-side, unlike MAD's offline cache).

**Implements.** `app/module/ate/tool/gcal/` (`base.py`, `connectors/`,
`server.py`, shell `static/`, `test_gcal.py` in `make test`);
[spec/gcal/spec.md](spec/gcal/spec.md) (lifecycle, handler contract, error
taxonomy, type catalog, 10-connector table).

### 2026 — SARL: the detail as a review pipeline

**Question.** The task detail presented the process as one scrolling card —
document, findings, and actions stacked in sequence. The reference practice
(a copy editor's pass) reads better as a pipeline: stages across the top,
the document at the center, resolutions on a rail. How far can that shape be
adopted without inventing new backend states?

**Decision.**

1. **The stage tracker is a projection, not a state machine**: Intake →
   Criteria → Review → Findings → Resolution → Verify → Complete, computed
   from the existing lifecycle (`created`/`reviewed`/`applied`) plus
   disposition counts. The contextual actions live in the tracker: Run
   review, Complete review (Apply), Discard.
2. **Three panes**: the task record + declared criteria on the left; the
   document in the center with a **Read | Annotated** toggle (Read = the
   rendered markdown; Annotated = the exact-span view with numbered,
   severity-colored highlights — the span engine annotates raw offsets, so
   marks live on the faithful view, never on the renderer's rewritten DOM);
   the **resolution rail** on the right with severity/dimension filters and
   **Apply / Ignore** per finding (the accepted/rejected dispositions,
   renamed at the UI). Card ⇄ highlight selection is two-way; a pager steps
   through the filtered findings.
3. **Anchors**: every finding carries `line` and `paragraph` (computed on
   the raw markdown at review time) so cards cite "L3 · ¶2" like a copy
   editor's margin.

**Rationale.** The pipeline shape separates *reading* (document), *judging*
(resolution rail), and *bookkeeping* (stages, criteria) — the three things a
reviewer does — without changing what the engine records.

**Trade-offs accepted.** Marks do not sit on the rendered text (offset
alignment across a markdown renderer is fragile); the tracker adds seven
labels over three real states; Comments/Notes and multi-user affordances
from the reference are out of scope (no backend).

**Implements.** `app/module/ate/tool/sarl/static/js/review.js` (pipeline),
`static/css/sarl.css`, `server.py` `_annotate_anchors`;
[spec/sarl/spec.md](spec/sarl/spec.md) plate section.

### 2026 — SARL: the task is the workflow, not the pass

**Question.** The first SARL build fused task definition and review into one
synchronous step — a "task" was born already reviewed — and sat task creation
in its own sidebar view. What, then, is a task, and where does defining one
belong?

**Decision.**

1. **A task is the workflow of a linguistic review of one document under a
   set of criteria** (dimensions + attached glossaries). The lifecycle is
   explicit: `created → reviewed → applied | discarded`. Defining a task
   journals it in `created` with no findings; **the review is an explicit
   workflow step** (`POST /api/tasks/<id>/review`) that runs the packs and
   raises the findings; dispositions and apply remain `reviewed`-only;
   `discard` may abandon a task before review.
2. **The document is markdown.** The engine protects the document's
   non-prose regions — fenced and indented code blocks, inline code spans,
   link/autolink URLs — so code and markup are never "corrected"; one
   post-filter in `run_review` covers every rule and the external engine
   alike.
3. **The task set is searchable**: free text matches title, content, and the
   rule ids fired in the review; state and language filters unchanged.
4. **No creation view in the aside**: defining a task lives inside the Tasks
   view (a New Task button opening the definition modal, in the standard
   editor pattern); tasks now carry an optional document `title`.

**Rationale.** A review is a process with stages, not an event: fixing the
document and the criteria first makes the review a step of a declared
workflow (whose evidence is then attributable to a criteria set), and keeps
the sidebar for the set of tasks rather than the act of creating one.
Markdown protection removes the false-positive tax on exactly the texts the
agent produces most.

**Trade-offs accepted.** Two calls instead of one to reach findings (the
price of an honest workflow); criteria are fixed at definition (changing
them means a new task); markdown region detection is heuristic — exotic
nesting could under-protect or over-protect.

**Implements.** `app/module/ate/tool/sarl/` (`packs/base.py`
`protected_spans`, `server.py` review endpoint + `created` state, `static/`
Tasks-view creation and workflow strip); [spec/sarl/spec.md](spec/sarl/spec.md)
updated to the workflow model.

### 2026 — SARL v1: the copy editor's pass, reviews as text edition tasks

**Question.** SARL was designed but unimplemented — a design plate reserving
`/ate/tool/sarl/`. How should the review pass be modeled and built so the
engine stays deterministic and the discipline stays explicit: what is the unit
of work, where do the stylistic word lists live, and how does a pass become
evidence rather than an overwrite?

**Decision.**

1. **Reviews become text edition tasks with an explicit lifecycle** —
   `submitted → reviewed → applied | discarded` — journaled like CTES runs.
   Submission and review are one synchronous step (the live path is
   deterministic and instant); dispositions are only open while `reviewed`;
   `apply` and `discard` are terminal. The API surface renames the spec's
   original `/api/reviews` to `/api/tasks` accordingly.
2. **The engine reads its authorities from the store, not from code.** The
   phrase catalog (editable `phrase_collection` docs) feeds the estilística
   muletilla rule; glossaries (preferred / forbidden / aliases) feed the
   terminológica dimension. Edits apply on the very next task.
3. **Deterministic first, external engine dormant.** All five live packs are
   pure Python — regex, token matchers, word lists. The LanguageTool adapter
   ships flow-complete but wakes only when `languagetool_url` is set in
   settings; its findings carry `engine: languagetool`, never blended
   silently. An external-engine failure is recorded as a finding, not hidden.
4. **Apply is composition, not mutation.** The submitted text is immutable;
   accepted suggestions compose the corrected text right-to-left over
   disjoint spans (overlapping accepts are refused 409 at disposition time),
   beside a change log (span, rule, before → after).
5. **The shell is the CTES copy of the house grammar** — header search,
   sidebar router, command palette, audit, settings, self monitoring — with
   views for the journal, the submission, the two authorities (glossaries,
   phrase catalog), and the dashboard projecting dispositions as the feedback
   surface.

**Rationale.** A review is only trustworthy if it is repeatable (determinism),
reversible (non-destructive Apply), and improvable from evidence (dispositions
as policy feedback). Modeling passes as tasks reuses the journal discipline
the toolbox already has; making the word lists first-class authorities turns
style from hidden code into editable policy — at personal scale the catalog is
small, so live consultation costs nothing.

**Trade-offs accepted.** The rename breaks the original spec's API paths
(kept in one place — the spec); deterministic matchers cannot catch subtle
grammar (the dormant adapter is the designed escape hatch, at the cost of a
network dependency when woken); muletilla findings suggest deletion, which is
advice rather than nuance; the capitalization rule suppresses any short
abbreviation-like word before a period, accepting rare false negatives.

**Implements.** `app/module/ate/tool/sarl/` (engine `packs/`, `server.py`,
shell `static/`, `data/seed.json`, `test_sarl.py` in `make test`);
[spec/sarl/spec.md](spec/sarl/spec.md) updated to the task model and live
status.

### 2026 — SOPCS topic graph: the catalog clustered by meaning, batch-computed

**Question.** The dashboard showed the catalog's *shape* (counts, activity,
staleness) but not its *structure* — which procedures talk about the same
things, and how the topics group. WOS already solves semantic grouping for
observations; what is the honest version of that for a small, slowly
changing catalog whose embeddings may not even exist yet?

**Decision.**

1. **Cluster the stored, not the source.** `sopcs/clustering.py` mirrors
   the WOS machinery (spherical k-means, deterministic PCA, lexical
   TF-IDF fallback) but takes its primary vectors from the *stored
   embedding side-docs* — no model call at cluster time; the map can
   never disagree with what reindex actually produced.
2. **Batch, never on read.** `POST /api/clusters` computes and stores one
   `CLUSTERS-current` document; `GET` returns it; `/api/reindex` refreshes
   it so the map never lags its vectors. k = `max(2, min(8, √(n/2)))`;
   labels are the top non-ubiquitous tokens of each cluster's documents;
   edges are per-node top-2 k-NN cosine links (≥ 0.2).
3. **The dashboard graph is a true map, not an animation**: ECharts
   `layout: 'none'` on PCA coordinates (vendored `echarts.min.js`, the
   sanctioned data-rich-surface library), nodes sized by words, colored
   by cluster, opened in the reader on click. Degrades by cause — not
   computed (with a Compute button), too few SOPs, or no numpy/fastembed
   (with an install hint) — never silently empty.

**Rationale.** Recomputing per dashboard load would make the overview's
latency depend on numpy and matrix math for a catalog that changes a few
times a day; one stored map refreshed alongside reindex keeps reads free
and the semantics consistent. Reusing WOS's algorithms rather than its
module keeps the tools decoupled while the behaviour stays familiar.

**Trade-offs accepted.** The map is stale between computes (bounded: every
reindex and every explicit compute refreshes it); PCA on tiny corpora is
unstable run-to-run by design (deterministic seed, not meaningful
axes); the lexical fallback clusters shallower than embeddings.

**Implements.** [`spec/sopcs/spec.md`](spec/sopcs/spec.md) (§3.8),
[`app/module/ate/tool/sopcs/clustering.py`](app/module/ate/tool/sopcs/clustering.py),
dashboard `drawClusters`, tests in `make test`.

### 2026 — SOPCS history and overview: snapshot versions, forward-only restore, a landing dashboard

**Question.** SOPCS's audit trail recorded that mutations *happened* but
not *what changed* — CouchDB keeps no readable history of superseded
documents, so a botched edit was unrecoverable and a procedure's evolution
was invisible. What is the honest version-history mechanism for a
CouchDB document store, and what does an overview of the catalog owe the
operator at a glance?

**Decision.**

1. **Full-snapshot revision documents, never patches.** Every content
   change (body, title, summary, tags, or status; a no-change save
   snapshots nothing) writes the whole document as `type: "revision"`
   (`rev-<sop_id>-<seq>`, per-SOP monotonic seq, optional note) via a
   design-doc `[sop_id, seq]` view; the SOP doc carries its latest seq.
   Full snapshots over stored diffs: bodies are KB-scale, patch chains
   are fragile, and snapshots make diff/restore/deletion trivial.
   Retention: forever.
2. **Diffs are computed on read** (stdlib `difflib.unified_diff`), always
   older → newer so additions render `+`; a revision's default diff is
   predecessor → itself, rev 1 diffs against empty, `?against=latest`
   compares to the current doc. Diff inputs get a guaranteed trailing
   newline so a final unterminated line cannot fuse a `-` line with the
   following `+`.
3. **Restore is forward-only** — an old snapshot's content becomes a
   *new* revision (audit `sop.restore` with the source seq). History is
   never rewritten; undo is restoring forward.
4. **The reader gains a History panel** (per-tool modal, shared dialog
   contract): revision list left, red/green-tinted unified diff right,
   restore behind a confirm. `PUT` accepts an optional `comment` — the
   API records notes, the editor stays lean.
5. **A dashboard becomes the landing view**, fed by one `GET
   /api/overview` payload: status shape, totals, top tags, recently
   updated, **stale actives (90+ days) as the review queue**, latest
   revisions, a 30-day edit-activity histogram, figures, and retrieval
   health (embeddings indexed vs sops — the visible `/api/reindex` lag).
   Rendered with token-colored CSS bars — no vendor chart library for
   what is, in the end, lists and proportions.

**Rationale.** Notion-style history on CouchDB requires explicit
snapshots — the database's `_rev` bookkeeping is not a history API.
Choosing full snapshots over patches trades storage (trivial at personal
scale, retention forever by the same argument) for immutability of every
operation that matters. Diffs-on-read keep the write path one put. The
forward-only restore rule is what makes offering restore safe at all:
nothing is destroyed, so the confirm dialog is a courtesy, not a
guardrail. The dashboard's stale-active list is deliberately dumb — a
date comparison, not a review workflow — because the first honest version
of "what needs my attention" is a date comparison.

**Trade-offs accepted.** Snapshot-on-save doubles write volume (bodies
are small; CouchDB does far more work per view update than per put).
No word-level highlighting inside changed lines (v2). The stale list has
no snooze/ownership workflow yet. Dashboard bars are static proportions —
no interactive charts, deliberately.

**Implements.** [`spec/sopcs/spec.md`](spec/sopcs/spec.md) (§3.5–3.6),
[`app/module/ate/tool/sopcs/`](app/module/ate/tool/sopcs/) (server
revisions/overview + `history.js`/`dashboard.js`), tests in `make test`.

### 2026 — SOPCS: the procedure catalog, with search that degrades honestly

**Question.** An agent's repeatable work lives in habit and chat history —
unauditable and unretrievable. The toolbox needed a place where the *how*
of recurring work becomes a first-class document: stored, browsable,
full-text and semantically retrievable, lifecycle-tracked, and illustrated.
Where should such a catalog live, how should retrieval work without
shipping a search engine, and where do uploaded figures persist when the
container is recreated on every deploy?

**Decision.**

1. **A new ATE tool, `sopcs`**, in the WOS-style app shell (the CTES copy
   of the house grammar — relative URLs, sidebar router, command palette).
   One CouchDB DB (`sopcs`): `type: "sop"` documents (slug, title,
   summary, tags, `draft → active → deprecated` lifecycle, markdown body)
   plus `embedding`, `image`, and `audit` side docs.
2. **Retrieval in two honest tiers.** Lexical: the WOS token-view pattern
   — a design-doc inverted index queried inside CouchDB by per-token
   prefix ranges, AND-composed by intersecting per-token doc-id sets
   (occurrence counts as score, recency as tiebreak). Semantic: fastembed
   BGE-small embeddings written on save in a background thread plus
   `POST /api/reindex`, cosine over stored vectors — never a requirements
   entry (the WOS clustering convention); absent → `mode=semantic`
   answers 501 with the reason, `mode=auto` falls back to lexical, the
   UI disables the toggle.
3. **Derived reading aids are computed on save** — reading time (200 wpm)
   and the heading outline — so the catalog view is a metadata projection
   and never fetches bodies. The TOC anchor contract is global: one
   counter over ALL ATX headings produces `h-<n>`; the shared renderer
   stamps exactly those ids, so server outline and client anchors cannot
   diverge.
4. **Figures persist in CouchDB, not on disk.** The shared `Store` gained
   a public attachment API (`put_attachment`/`get_attachment`); editor
   uploads (picker, clipboard paste, drag-and-drop) become `type: image`
   docs with the bytes attached, served with immutable cache headers and
   inserted as *relative* markdown (`![alt](api/images/<id>)`) valid
   under any mount. Disk uploads would vanish on every `make deploy-local`
   recreate; CouchDB rides the `couchdb_data` volume.
5. **The markdown renderer joined the shared layer.** AOOS's XSS-safe
   escape-then-render renderer became `AUTOREGIA.Markdown` at
   `/ui/js/md.js` (extended with images, heading anchors, pipe tables,
   an `outline()` helper; URL whitelist for href/src), with AOOS as a
   thin aliasing consumer — two renderers under one contract beat two
   forks.
6. **Seeds normalize themselves**: a public `Store.seed()` seeds
   unconditionally by id (the old emptiness guard counted design docs
   and silently refused to reseed a wiped-but-indexed DB), and the server
   backfills derived fields onto raw fixtures at boot.

**Rationale.** The toolbox slot was the natural home — procedures are
tools for doing, and ATE already owns mounting, registry, and the shell
grammar. Two-tier retrieval keeps v1 honest: lexical search runs inside
CouchDB with zero extra machinery, and semantic search arrives exactly
when fastembed does, never pretending (a 501 with the reason, not silent
wrongness). Attachments over the filesystem was forced by the deployment
shape: the container is recreated on every deploy and only CouchDB has a
volume. Promoting the renderer paid for itself immediately — the TOC
anchor contract needed renderer-side ids anyway.

**Trade-offs accepted.** Semantic search needs an out-of-band
`pip install fastembed` plus a reindex before it works. Catalog listing
filters/sorts in Python over a projected metadata window (personal
scale) — the CouchDB-resident rule is kept where it matters (search).
Deleting a SOP deletes its embedding but keeps its images (they may be
shared, and orphans are visible in self-monitoring). No version history
yet — CouchDB revisions exist but are not surfaced; procedure review
cadence and stale-SOP surfacing remain future work.

**Implements.** [`spec/sopcs/spec.md`](spec/sopcs/spec.md),
[`app/module/ate/tool/sopcs/`](app/module/ate/tool/sopcs/) (server, shell,
tests in `make test`), [`app/support/storage/`](app/support/storage/)
(attachment API, public `seed`), [`app/support/ui/js/md.js`](app/support/ui/js/md.js)
(shared renderer; AOOS alias at `app/module/aoos/static/js/md.js`).

### 2026 — The ACSMS training camp: an independent trainer behind a seamless shell

**Question.** The Typing skill needs a real deliberate-practice surface
(a typing trainer with sessions, feedback and key-level assessment), not a
form. Should the trainer be built into the ACSMS shell, and how does a
completed test become a *practice record* the tracking layer can assess?

**Decision.**

1. **The trainer is an independent file** (`training/typing/index.html`),
   embedded by the skill practice view in a borderless iframe — a
   "training shell". The trainer carries the session engine and its own
   local ledger; the shell owns all chrome: the Practice/Feedback tabs
   (driving the frame via `postMessage`) and the back link.
2. **Two views only — Practice and Feedback.** A run leaves a brief
   feedback strip under the passage (until the next test starts); the
   complete assessment (per-second chart, key heatmap, trouble list) and
   the training log — each row opening a session-detail modal — live in
   Feedback. Session controls (kind, length, punctuation, key sounds)
   belong to the practice surface itself and persist in the browser;
   the only shell-side setting is **Auto Log Practice**.
3. **Recording is structured, not just narrated**: `POST /api/practices`
   accepts an optional `data` object (capped at 16 KB) stored verbatim on
   the practice doc. The trainer announces every completed test as
   `{session, data}` — shared structure (ts, duration, mode) plus the
   skill kind's payload (typing: wpm/raw/acc/cons, series, key report) —
   and the shell files it on the skill's log when Auto Log Practice is on.
   Each skill's view owns its payload shape; record-cards in the skill log
   open a session modal rendering that payload.

**Rationale.** An independent file keeps the trainer offline-first,
self-contained and testable outside the app, while the iframe shell keeps
the user inside the app's identity (project tokens only, no trainer
chrome, no CDN fonts). Structured recording is what turns a "very complete
log" into an assessable one: the assessment surface renders from the
record, not from a re-run or from prose notes.

**Trade-offs accepted.** The ledger is per-browser (the structured record
on the skill log is the durable copy); the trainer stays dormant config on
other clients until re-mounted; one old-format code path (fallback modal)
remains for records without `data`; modal renderers are per-skill-kind,
so a new skill kind means a new renderer.

**Implements.** [app/module/acsms/static/training/typing/index.html](app/module/acsms/static/training/typing/index.html),
[app/module/acsms/static/js/skills.js](app/module/acsms/static/js/skills.js),
[app/module/acsms/static/js/practice.js](app/module/acsms/static/js/practice.js),
[app/module/acsms/server.py](app/module/acsms/server.py)

### 2026 — ACSMS catalogs: domains, mastery levels, change logs, and skill paths

**Question.** The first ACSMS build tracked practice against a flat skill
list. How should the catalog grow into a *perfect skill tracking system* —
grouping skills, expressing progress, recording provenance — without
inventing state the practice stream cannot support?

**Decision.**

1. **Domains are a first-class field, tags stay tags.** A single free-form
   `domain` (fallback `General`) groups skills for the catalog's filter
   chips and the rail's per-domain rollup; multi-dimensional `tags` remain
   orthogonal labels.
2. **Progress is a self-assessed `level` 0–5**, edited in the define/edit
   modal and shown as the catalog bar. It is *mastery* ("how capable am
   I"), deliberately separate from the computed `practice_state` ("what
   does recent practice say") — a skill can be level 4 and neglected.
3. **Every skill carries an embedded changelog**: one entry per update with
   field-level from → to diffs; a status change names the entry after the
   lifecycle event (`paused`/`activated`/`retired`). Capped at 100 entries.
   This is provenance for the Review/Cull stages, not an audit fixture.
4. **Skill paths are ordered curricula over existing skills**: a `path`
   stores an ordered `skill_ids` list (validated, deduped, ≤ 20). All path
   progress is derived, never stored: completion = share of members with
   practice; the *current step* is the first member that is never-practiced
   or neglected. Deleting a path never touches skills; deleting a skill
   just removes it from the rendered stepper.

**Rationale.** Derived-only path progress keeps a single source of truth
(the practice stream) — a path cannot claim progress its members' history
does not show, mirroring the evidence-over-exposure rule. Level is the one
field the stream *cannot* derive (practice frequency ≠ mastery), so it is
explicit, bounded (0–5), and self-assessed. The changelog rides on the
skill doc (no second store) because its lifetime is exactly the skill's.

**Trade-offs accepted.** Domains are single-valued (a skill lives in one
domain; tags cover the rest); level drifts without practice (the state
pill exposes exactly that tension); path steps silently skip deleted
skills (displayed sequence stays truthful); changelog diffs rewrite the
whole skill doc on each edit (small documents, acceptable write volume).

**Implements.** `app/module/acsms/` (catalog + right rail + `#skills/<id>`
detail with statistics, practice history, and change log; `#paths` stepper
view), [`spec/acsms/README.md`](spec/acsms/README.md)
(Deliberate/Review stages).

### 2026 — ACSMS practice tracking: validated self-reports and computed practice states

**Question.** The ACSMS mount was a static prototype plate. Building the
skill-tracking system raised a modeling question: practice is *self-reported*
(human-entered), so what keeps the tracking honest — and what does the system
do about the skills that never receive any practice at all?

**Decision.**

1. **Practices are bound to existing skills.** A practice document carries a
   `skill_id`; the server validates it against the catalog and rejects
   unknown skills (400) and retired skills (400). You cannot self-report
   practice on a skill that does not exist — the form offers only defined
   skills, and the API enforces what the UI suggests.
2. **The inverse gap is tracked automatically.** Every skill carries a
   computed `practice_state` derived from its practice history and its
   `target_per_week` cadence: `never-practiced`, `on-track`, `neglected`
   (last practice older than 2× the target interval), plus the lifecycle
   states `paused`/`retired`. Flagged active skills surface in the
   dashboard's attention queue — the Review/Cull stages of the improvement
   lifecycle, materialized.
3. **Practiced skills leave through the lifecycle, not through DELETE.**
   Hard delete is allowed only while a skill has zero practice history;
   otherwise the API answers 409 and the path is retirement
   (`PUT {status: "retired"}`), so the cull decision is recorded and the
   practice history is preserved.
4. **Two doc kinds, one store** (`acsms` db via the shared `Store`):
   `skill` (catalog) and `practice` (self-report stream). Practice docs
   denormalize `skill_name`, kept in sync on rename. Seed catalog in
   `data/skills.json`, applied only when the DB is empty.

**Rationale.** Self-report data is only as trustworthy as its constraints:
requiring an existing skill anchors every report to a definition, and
computing state server-side from history (rather than asking the user
"are you keeping up?") makes the feedback automated and unfakeable. The
neglected detector uses 2× the target interval — a tolerant, explicit
form of "the cadence slipped" that needs no per-skill tuning.

**Trade-offs accepted.** Self-reported quality/confidence remain subjective
(evidence URLs are optional, not verified); renames rewrite historical
practice docs (small writes, truthful snapshots); deleting a practiced
skill is impossible by design — retiring it is the recorded decision.

**Implements.** [`spec/acsms/README.md`](spec/acsms/README.md)
(Practice/Evidence/Review/Cull stages),
`app/module/acsms/` (server API, shell UI, seed, tests).
### 2026 — CTES phase 2 app shell: manager, specs, audit, self-monitoring

**Question.** Phase 1 proved the execution path but shipped a bare plate —
no way to manage the register, no story for how emitters' intents relate to
registered code, no record of who changed what, and no view of CTES's own
health. Which existing surface should the shell imitate, how do task specs
bind to handlers, where does the audit live, and how much should Settings
actually control?

**Decision.**

1. **Copy the WOS app shell** (header search, sidebar router, command
   palette, per-view JS modules; the generic `layout/components/views/
   command-palette.css` copied verbatim plus a CTES layer; echarts
   vendored). CTES keeps WOS's grammar — views registry, click→filter bus
   into the Runs journal, window presets, `Ctrl K` — so the two surfaces
   feel like one system. No `wos/` file is touched.
2. **Task specs reference handlers directly** — `{objective, handler_id,
   payload template, expected_output, priority, constraints, dependencies,
   temporal_mode}`. Emitting resolves the handler and dispatches
   synchronously; the run records `task_spec_id`, the spec snapshot, and a
   sha256 of the exact code that ran. (Operation-code indirection was
   considered and rejected: one less resolution step, emitters name the
   code they mean.)
3. **Audit lives in the same DB as typed docs** (`type: audit`, never
   pruned): register, spec, settings, and clear-history mutations append
   actor/action/summary/details. Runs are their own journal, not audit.
4. **Handle lifecycle**: update (rewrites the on-disk manifest) ·
   activate/inactivate (soft path; inactive handles refuse runs with 409) ·
   manual delete through the UI with confirm — purges doc + `packages/<id>/`,
   run history kept with the handle marked deleted · read-only path-
   contained code viewer.
5. **Settings are a persisted editable subset** (default timeout, default
   backend, log limit, run retention, allow-network default) consulted by
   the run path; env-derived values (image, mem/cpus, CouchDB URL) display
   read-only. Retention is enforced after every run.
6. **Self monitoring** (`/api/self` + view): store doc counts, register
   coherence (active/inactive/code-missing), run outcomes and 24h success
   rate, backend availability, packages disk footprint, last failure,
   uptime.

**Rationale.** The shell question answers itself — WOS is the house
application grammar, and reusing it turns CTES from a plate into a
citizen. Direct spec→handler binding keeps phase 2 honest while the run
snapshot (code sha) preserves the provenance an indirection layer would
have obscured; when multiple handlers must serve one intent, the
resolution can be added above specs without breaking them. Same-DB typed
audit avoids a second store until volume says otherwise, and the never-
pruned trail is what makes manual deletion safe to offer.

**Trade-offs accepted.** Specs break loudly (400/409) when their handler
is missing or inactive — no fuzzy resolution; audit docs share the
register's DB (one clear-runs path touches only `type: run`); the code
viewer is read-only (edit on disk, then Scan) — a UI editor is a later,
dangerous convenience; settings control defaults only, never override a
handle or run that states its own.

**Implements.** [`spec/ctes/spec.md`](spec/ctes/spec.md) (Design, task
representation, lifecycle), [`app/module/ate/tool/ctes/`](app/module/ate/tool/ctes/)
(shell + server), WOS shell grammar (`app/module/wos/static/`, copied, not
modified).

### 2026 — CTES phase 1 shell: the register of handles

**Question.** CTES was a designed-but-unimplemented tool (`spec/ctes/spec.md`)
reserving its place with a design plate. Where should its implementation
start, and what is the smallest thing that is already *the* task-execution
discipline rather than a demo? Concretely: what is a CTES "task" in phase 1,
where do the register and the run records live, and how is registered code
executed so a handle cannot take the server down with it?

**Decision.**

1. **The unit of phase 1 is the *handle*** — a self-contained Python package
   under `packages/<id>/` (`manifest.json` + code, entry point
   `module:function` taking a JSON payload, returning a JSON value). Queues,
   schedulers, leases, and retries stay future phases; the shell is the
   spec's "single-machine configuration" minus the worker process.
2. **CouchDB is the register and the run journal** (db `ctes`, via the shared
   `Store`; seeds only when empty, per house rule). Code itself stays on
   disk — CouchDB holds the register docs and the run docs (input, result,
   log, exit code, timing, backend), never executable bytes.
3. **Every handle runs in a self-contained execution environment** through
   one uniform shim (`runner.py`: JSON payload on stdin, one JSON envelope on
   stdout). Two interchangeable backends behind `CTES_EXEC_BACKEND`:
   `docker` (default when the CLI is present — `docker run --rm -i --network
   none`, package and shim mounted read-only, disposable container per run)
   and `subprocess` (venv python, same shim — the test/dev fallback).
4. **Runs are synchronous** (`POST /api/runs` blocks until a terminal state:
   completed / failed / timed_out) with per-handle timeouts (request
   override, capped at 600s) and best-effort `docker rm -f` cleanup.
5. **The design plate becomes the working app**: register cards + run form +
   run history, on the shared UI layer, relative `api/…` URLs (no
   `prefix_assets` involvement). Registration via API creates the package
   skeleton; `POST /api/handles/scan` picks up hand-written manifests.

**Rationale.** A task-execution system is only honest once registered code
can actually execute and nothing is silently lost — the run journal in
CouchDB gives phase 1 its durability invariant, and process/container
isolation means a handle crash cannot corrupt the server. The shim
contract (envelope on stdout, handler prints diverted to the run log)
keeps the machine channel clean for both backends, so the docker upgrade
changes nothing about how handles are written.

**Trade-offs accepted.** Synchronous dispatch only — no long-running or
queued work yet; the docker backend is inert inside the deployed container
(no docker socket — subprocess fallback there); no per-handle dependency
install (base image only, `CTES_DOCKER_IMAGE` override); one shared DB for
handles and runs, distinguished by a `type` field, until volume says
otherwise.

**Implements.** [`spec/ctes/spec.md`](spec/ctes/spec.md) (Formulation,
single-machine scale), [`app/module/ate/tool/ctes/`](app/module/ate/tool/ctes/)
(server, runner, backends, packages/, seed, tests), `Makefile` test target.

### 2026 — UI remediation against industrial practice (WCAG 2.2 AA / APG / Nielsen)

**Question.** `design.md` §5 claimed "none outstanding" for tracked
non-conformances, but an independent audit of all ~19 surfaces against
industry practice (WCAG 2.2 AA, ARIA APG, Nielsen heuristics, design-token
discipline) found systemic violations: modal dialogs without the APG focus
contract, ~53 mislabeled form controls generated by three JS helpers,
contrast failures baked into the shared token mapping (`--color-text-muted`
mapped to a 3.5:1 step; gold used as body-size text), stores that silently
fell back to localStorage while toasting success (pbs mutations never
reached the server at all despite POST/PUT endpoints existing), single-char
shortcuts hijacking Ctrl+N, an AOOS Space handler that prevented keyboard
activation of buttons, native `alert()` validation, unhandled fetch
failures in awes/wos/pwts, and off-token chart palettes. Fix the symptoms
per surface, or change the shared layer so every surface inherits the fix?

**Decision.**

1. **Shared layer first.** `AUTOREGIA.dialog` (APG: `role="dialog"`,
   `aria-modal`, focus trap, restore-to-invoker, Esc stack) landed in
   `/ui/js/ui.js`; every tool's modal/palette/scratchpad now wires through
   it. Same for `AUTOREGIA.api` (res.ok + typed errors) and
   `AUTOREGIA.CHART` (token-derived canvas palettes with hex fallbacks).
2. **Contrast fixed at the token mapping, not per call site.**
   `--color-text-muted` → `--ink-4` (`#6B665B`, 5.7:1) and
   `--color-text-faint` → `--ink-5`, matching the §10.1 sanctioned pairs;
   new `--gold-ink` `#8A6A2F` (4.8:1) for gold as text (`.eyebrow`,
   badges, chart labels). The §3.1 ramp values themselves are untouched.
3. **Honest offline status, not silent fallback.** pbs/aias/gis/pkts
   stores write through to the API and return `{_persisted}`; callers
   toast "saved locally — sync pending" on failure. pbs delete remains
   client-only (no server DELETE endpoint) and is reported as unpersisted.
4. **Behavior fixes** (WCAG 2.1.1/2.1.4): AOOS Space no longer hijacks
   interactive-element activation; `n`/`/`/`?` are inert with modifiers
   held everywhere; `alert()` replaced with inline `role="alert"` errors;
   destructive calendar-block/clear-history actions confirm first.
5. **Convergence**: chart hues mapped onto §3 token values (pbs private
   palette, `#6B5B95`→`--class-identity`, pink ramp→oxford family,
   heatmap green→gold ramp); shadows ink-tinted; app-shell spacing snapped
   to the 4/8 grid (≤2px drift, 1–2px optical exempt); dead per-tool
   `css/{fonts,base}.css` links removed; palettes ported to pwts and awes;
   `<main>` added to 17 standalone plates; pras joined the shared layer
   (`base.css` import).
6. Cache-busters uniformly bumped to `?v=20260917` (mandatory after
   editing the shared layer).

**Rationale.** Per-surface fixes would re-create the drift §11.2/§11.5
exist to prevent; the audit showed violations clustered exactly where the
shared layer was missing a primitive (dialog, api wrapper) or where a
token mapping contradicted the a11y section of the spec (§3.4 vs §10.1).
Fixing the layer turns ~15 surface-local refactors into one-file changes
and makes the next audit mechanical.

**Trade-offs accepted.** Muted text renders slightly darker repo-wide
(visual hierarchy shift, contrast now passes); app-shell spacing drifted
up to 2px at ~40 call sites; ECharts canvas keeps numeric `fontSize`
(canvas cannot consume CSS vars — sanctioned); `AUTOREGIA.*` globals grow
(one namespace, still no framework); offline-capable shells now admit
their offline state in the UI instead of pretending to have saved.

**Implements.** [`design.md` §5](design.md) (re-audit entry),
[`spec/ui.spec`](spec/ui.spec) §2/§7.5/§8/§10 (norms applied),
`app/support/ui/` (dialog/api/chart helpers, token mapping fix).

### 2025 — Application-interaction capture (PWTS) + PKTS app-context enrichment

**Question.** PKTS captured keystrokes globally but (a) did not attribute them
to the focused application, and (b) there was no mouse/focus telemetry at all.
Should mouse capture be a new sub-system, folded into PKTS, or attached to an
existing one? How do we get a complete picture of "where the user spends time"?

**Decision.**

1. **Keep PKTS focused on keystrokes** — its spec, schema, and seven analytics
   tabs are keyboard-defined; folding mouse in would break its contract.
2. **Enrich PKTS keystrokes with application context** — but *not* by adding
   window-tracking logic inside PKTS. Factor out a shared
   `shared/focus_watcher.py` (X11 + Wayland backend chain) as the single source
   of truth for "what was focused at time T". PKTS stamps each keystroke; the
   watcher's full timeline lives elsewhere.
3. **Build a new sibling sub-system, PWTS** (Personal Application Interaction
   System) — mirrors the PBS/PKTS/PTOCS one-technical-object-per-sub-system
   convention. PWTS owns mouse capture (clicks + scroll + ~5 Hz sampled
   movement), the focus timeline, and the **join** of its own data with the
   PKTS keystream (read-only) to produce application-interaction analytics
   (time-per-app, click-rate, keys/click, app-switch frequency,
   focus-fragmentation index, idle gaps).

**Rationale.** One object per sub-system keeps each schema clean and lets the
join happen at query time rather than forcing one giant event schema. A shared
focus watcher avoids two collectors disagreeing about the active window. Mouse
movement is coalesced (never raw kernel-rate) to keep CouchDB volume sane.

**Trade-offs accepted.**

- Focus attribution is compositor-level, not kernel-level — there is no
  evdev-equivalent for "which window has focus". The watcher therefore uses
  the lowest-level source each desktop exposes: Xlib EWMH (X11), the
  compositor's own CLI where one exists (Hyprland/Sway/KDE), and AT-SPI as a
  bonus on GTK3 desktops.
- On modern GNOME (Wayland or X11) every low-level path is blocked:
  `org.gnome.Shell.Introspect` is denied, `Shell.Eval` needs session-only
  unsafe-mode, and on GTK4 AT-SPI no longer publishes app windows (verified on
  GNOME 46 — only `gjs`/Desktop appears on the a11y bus; `gnome-calculator`
  loads zero atk-bridge). The only reliable source is a small Shell extension
  (`pwts@autoregia`) that owns `org.autoregia.Focus`. It is **not a daemon** —
  it loads into the already-running gnome-shell like any other extension.
- evdev yields only relative pointer deltas; absolute coordinates are
  integrated from a screen-center origin and clamped to screen bounds
  (drifting approximation; sufficient for heatmaps). True absolute coords are
  available on the X11/pynput backend.
- Window titles may carry sensitive content; a `PWTS_TITLE_REDACT_REGEX`
  redaction knob masks matching substrings before they leave the watcher.

**Implements.** [`shared/focus_watcher.py`](../shared/focus_watcher.py),
[`pwts/`](../pwts/), [`spec/pwts/`](../spec/pwts/); PKTS enrichment in
[`pkts/collector.py`](../pkts/collector.py) + [`pkts/jobs.py`](../pkts/jobs.py)
+ [`spec/pkts/schema.json`](../spec/pkts/schema.json) (additive: `window_title`,
`focused_window_id` in `Context`).

## Terminology

| **Word** | **Definition** |
| --- | --- |
| Being | That which exists or has existence, in any form or mode. |
| Entity | A thing that exists as a distinct and identifiable unit. |
| Substance | That which exists independently and underlies properties or changes. |
| Property | A quality or attribute that something possesses. |
| Relation | The way in which two or more entities are connected. |
| Phenomenon | An observable event or occurrence. |
| Concept | A mental representation or general idea of something. |
| Proposition | A statement that expresses a judgment or opinion that can be true or false. |
| Truth | The correspondence of a proposition with reality or fact. |
| Knowledge | Justified true belief or reliably produced true belief. |
| Belief | Mental acceptance that something is true, regardless of proof. |
| Fact | An objective state of affairs in the world. |
| Model | A structured representation of a system, object, or concept for understanding or prediction. |
| Theory | A systematic framework of propositions explaining phenomena, supported by evidence. |
| Hypothesis | A proposed explanation made on the basis of limited evidence, subject to testing. |
| Evidence | Information that supports or refutes a claim. |
| Method | A structured process to acquire knowledge or solve problems. |
| Explanation | An account that makes something understandable by clarifying cause, mechanism, or relation. |
| Epistemic Tool | … |

## Formulation

> How to frame the description of reality? Which are the elements in such framing?
> 

> Epistemology : (Realty ; Ontology) → Description  & Validation.
> 

> **The Ontic (Reality):** The continuous, entangled, analog flux of properties (e.g., a falling
apple's position, a person's anxiety, a market's volatility).
> 

> **The Epistemic (Our Access):** The decision to *conceptualize* a specific aspect (e.g., "height above ground," "self-reported mood," "closing price") as a **variable**—a defined, bounded dimension of variation.
> 

> **The Description (The Bridge):**   How are epistemic techniques operationalized to construct formal descriptions of reality?
> 

### Reality

> See more in [Nature](https://app.notion.com/p/Nature-554701ca10264f4091f1e9e8fd7aec04?pvs=21) and [Reality](https://app.notion.com/p/Reality-343c0f5171ec807bbfaecb4947dbc8ea?pvs=21).
> 

> **Reality** is the total set of phenomena, entities, and processes that exist or occur, **independently of an observer’s perception or conceptualization**, and which can, in principle, interact, change, or produce effects.
> 

#### Introduction

> Understanding reality is a foundational step for any attempt to represent or model it. To study, reason about, or intervene in complex domains, we must first clarify the properties of what we seek to model. Reality is not merely what we observe—it exists independently, exhibits structure, evolves over time, and can be analyzed through careful observation and inference.
> 

The following principles summarize these features:

1. **Observer-independent** – Reality exists whether anyone perceives or models it.
2. **Composed of entities and processes** – These can be physical, biological, social, or abstract structures that have causal effects.
3. **Dynamic and interconnected** – Events, processes, and interactions continually change and produce emergent patterns.
4. **Accessible through observation and inference** – While humans perceive and conceptualize reality imperfectly, it is constrained by what actually exists and what causal relations are possible.

#### Segmentation

> How to segment—or observed—reality in order to represent it?
> 

| **Term** | **Description** | **Modeling Implications** |
| --- | --- | --- |
| **System** | A bounded set of interacting components with defined relations. | Requires defining boundaries, inputs/outputs, feedback loops; suitable for causal and dynamic modeling. |
| **Ecosystem** | A system of interacting entities within an environment, emphasizing interdependence. | Focus on flows, interactions, resilience, and emergent behaviors; boundaries are semi-permeable. |
| **Realm** | A domain or territory of influence; emphasizes scope over structure. | Useful for high-level mapping, context delimitation, and defining the scope of study. |
| **Sphere** | A conceptual domain of activity or influence, often overlapping with others. | Flexible boundaries; useful for studying cross-domain interactions and influence. |
| **Network** | A set of nodes and edges representing relationships or interactions. | Emphasizes topology, connectivity, centrality, and diffusion; can abstract from physical or material structure. |
| **Facet** | A particular aspect or dimension of a larger entity. | Allows selective modeling of attributes or perspectives; useful for multi-layered, modular, or multidimensional analysis. |
| **Population** | A defined set of individual entities sharing specified characteristics within a given boundary. | Requires explicit inclusion criteria, scale definition, and statistical representation; suitable for probabilistic modeling, distribution analysis, and inference over aggregate behavior. |
| **Piece of Reality** | … | … |

#### Level of Organization

> In highly technical terms, the **"Level of Organization"** of a system refers to the hierarchical stratification of its structural and functional components, ranging from fundamental microscopic interactions to emergent macroscopic behaviors. This concept is crucial in physics, biology, complexity science, and engineering when modeling systems with multiscale dynamics, memory, or adaptive laws.
> 

> See more in [Level of Organization](https://app.notion.com/p/Level-of-Organization-1ebc0f5171ec80dd9100ec305664c2d3?pvs=21).
> 
- **Micro-level:** Individual elements and their local interactions.
- **Meso-level:** Subsystems, modules, clusters of interactions.
- **Macro-level:** Emergent patterns, global behavior, systemic properties.
- Systems thinking is **hierarchical**: different questions require different levels of analysis.

### Ontology

> What is reality like? Which are the elements that makes up reality? How do we identify such elements?  How to think deeply about changed? How to think about changed as an element of reality itself?
> 

> See more in [Ontology](https://app.notion.com/p/Ontology-138eea37a34f43ed87c16d1818629723?pvs=21).
> 

### Level of Reality

> aka. Level of Organization.
> 

> How do we think about larger structures - made of more simpler things?
> 

> How new ontic entities arises  - from lower elements? How to they give rise to new pieces of reality?
> 

> See more in [Level of Organization](https://app.notion.com/p/Level-of-Organization-1ebc0f5171ec80dd9100ec305664c2d3?pvs=21).
> 

### Template of Realty

> The templates of reality are not ontic concepts; rather, they are epistemic constructs that allow us to parse and structure reality.
> 

> See more in [Ontology Template](https://app.notion.com/p/Ontology-Template-2f7c0f5171ec80eea496cb2437779712?pvs=21) and [Segment](https://app.notion.com/p/Segment-343c0f5171ec80868962e7bebb90cd36?pvs=21).
> 

| **Category** | **Notion** | **Description** |
| --- | --- | --- |
| Primitive Cut (Epistemic Operator) | **Segment of Reality** | An epistemically constructed cut over the event stream that defines a bounded or structured domain of analysis. It specifies what is included/excluded and determines the space in which invariants can be defined. |
| Segment Manifestation | **Event Stream** | The unsegmented flux of occurrences (ontic raw data) prior to any epistemic structuring or cut. |
| Emergent Structure | **Entity** | A relatively stable invariant cluster of properties or relations within a segment, treated as a “thing” for modeling and inference. |
| Emergent Structure | **Process** | A temporally extended invariant pattern of event transitions within a segment, exhibiting causal continuity or regularity. |
| Emergent Structure | **Phenomenon** | A coherent bundle of events and/or processes within a segment that is treated as a unified explanatory object. |
| Emergent Structure | **State** | A snapshot representation of a segment at a given resolution, capturing its configuration under a chosen observational scale (well-defined only in sufficiently structured segments). |
| Emergent Structure | **Trajectory** | A temporally ordered sequence of states or configurations within a segment, representing evolution through time. |
| Epistemic Access Layer | **Observable** | Any event, signal, or measurement that can be registered within a segment under a specified instrumentation or observational regime. |

## Epistemology

> aka.  The Theory and Practice of Inquiry — A schema to parse epistemic realty.
> 

> **How do observers represent and parse reality?** How are aspects of reality encoded into epistemic representations?
> 

> **What makes a representation epistemically valid or reliable?**  What criteria determine the validity, reliability, and scope of those representations?
> 

> **What is the relationship between epistemic representations and ontological structure?**
> 

> **What constitutes an epistemic tool, and how does it mediate access to reality?**
> 

> See more in [Epistemology](https://app.notion.com/p/Epistemology-0e47f3d857c544c6b08bc991c24c8891?pvs=21), [Ontology](https://app.notion.com/p/Ontology-138eea37a34f43ed87c16d1818629723?pvs=21)  and [Observer](https://app.notion.com/p/Observer-24bc0f5171ec8060b8f3d55b4b766042?pvs=21).
> 

> Note:  For reality section -  and a abstract template to encoded - see Ontology.
> 

> 
> 
> 
> **Ontology and epistemology are the right hand and left hand of knowledge construction: they are mutually constraining duals of the same epistemic act.**
> 
> - **Ontology** = what *is* (constraint space of reality)
> - **Epistemology** = how it is *accessed/represented* (constraint space of knowing)
> - They are not separate domains, but **co-dependent operators on the same reality-model interface**

> **The goal of epistemology is (1) to construct and maintain the scaffolding mechanisms of inquiry, and (2) to construct, validate, and organize the Domain Concrete Epistemic Artifact Set (DCESA) that represents reality.**
> 

> Domain Concrete Epistemic Artifact Set (DCESA): The intelligibility layer of a reality domain, consisting of the complete set of concrete epistemic artifacts through which that domain becomes describable, explainable, predictable, navigable, and actionable. Similar ideas **Cognitive Map - Sistema de Anclaje, Sistema de Organizacion,**
> 

Scaffold Status: Indicates whether the element functions as an epistemic scaffold for the construction, guidance, validation, organization, or operation of epistemic artifacts and processes.  

- **Scaffold: :** Directly or indirectly supports, structures, constrains, guides, enables, coordinates, validates, or organizes epistemic activity. Its primary role is to assist the production, management, evaluation, communication, or use of knowledge.
- **Non-Scaffold:** Does not perform a scaffolding function; instead serves as an object, target, output, agent, or product of epistemic activity.

| **Category** | **Description** | **Instance(s)** | **Scaffold Status** |
| --- | --- | --- | --- |
| **Epistemic Purpose** | The telos or intended epistemic objective that motivates the activity. Defines *why* knowledge is being produced. | Explanation, prediction, control, diagnosis, discovery, description, forecasting, intervention, understanding | Scaffold |
| **Reality** | The ontological substrate comprising the actual states, structures, processes, entities, and causal dynamics that exist independently (or partially independently) of any observer’s representation. Reality constitutes the ultimate source domain from which observations are extracted, against which epistemic artifacts are validated, and whose structure constrains possible knowledge. It includes both observable and unobservable phenomena, latent mechanisms, causal architectures, and state trajectories across time. | Physical systems, biological organisms, chemical reactions, social institutions, computational systems, economic systems, ecological networks, latent variables, hidden causal mechanisms, dynamical state spaces, material processes, environmental structures. | Non-Scaffold |
| Realty Section (Epistemic Object Set) | … | … | Non-Scaffold |
| **Observation Interface** | The sensorimotor boundary + inscription process that transduces a Domain Snapshot into a persistent encoded artifact. Includes transduction, sampling, quantization, encoding, and storage. | CMOS sensor + ADC + JPEG + SD card; thermocouple + data logger + CSV file; human retina + V1 cortex + working memory. | Scaffold |
| **Observation Encoding** |  |  | Scaffold |
| **Epistemic Representation Form (Epistemic Blueprint)** | Encoding format or substrate in which artifacts are expressed; constrains manipulation and interpretation. | Directed Acyclic Graph (DAG), Structural Equation (functional notation), Polynomial Equation, … | Scaffold |
| **Concrete Epistemic Artifact** | Structured object and **specific object** that encodes claims, constraints, or distributions over reality; the primary carrier of semantic content. | ***Zero free parameters**** – every coefficient, distribution, variable, and functional form is concretely specified. | Yes – can be evaluated as correct/incorrect against reality. | `y = 2.3x + 1.7` (fitted linear model); specific CSV file `[2.1, 3.4, 5.6]`; a particular DAG with all edges and functional forms fixed. - Propositions, numbers, datasets, differential equations, probabilistic models, Hypergraphs, property encoding, | Non-Scaffold |
| **Domain Concrete Epistemic  Artifact Set  (DCESA)** | The complete collection of instantiated epistemic objects produced and used to describe, explain, predict, and manipulate a specific domain of reality. | … | Non-Scaffold |
| **Epistemic Gap** | Portion of reality for which no adequate artifact, model, observation, or explanatory structure currently exists. | … | Scaffold |
| **Epistemic Agent** | Entity that performs epistemic operations by applying tools to artifacts. | Scientist, analyst, research institution, machine learning system, automated pipeline | Non-Scaffold |
| **Epistemic Goal** | … | … | .. |
| **Epistemic Goal Set** | The collection of specific desired epistemic outcomes that guide inquiry, observation, modeling, validation, and reasoning within a given epistemic process. Goals define the target knowledge state that an agent seeks to reach regarding a reality section. | Identify causal mechanisms; estimate parameter values; discover latent variables; classify entities; predict future states; explain observed phenomena; reduce uncertainty; detect anomalies; estimate risk; construct taxonomies; infer hidden states; evaluate interventions; improve forecast accuracy; characterize system structure; determine boundary conditions; identify governing laws; measure quantities; validate hypotheses; generate new hypotheses; optimize model performance. |  |
| **Epistemic Process (Activity)** | Ordered sequence of tool applications over time; defines the dynamics of knowledge construction. | Scientific method, Bayesian updating loop, training pipeline, experimental cycle |  |
| **Epistemic Standard** | Normative criteria used to evaluate validity, correctness, or acceptability of artifacts and processes. | Logical consistency, statistical significance, reproducibility, robustness, falsifiability |  |
| **Encoding Substrate** | An encoding substrate is the medium in which information is physically instantiated. | Paper,  Ink,  Electromagnetic Signal, … |  |
| **Epistemic Domain (Target Domain)**  | Segment of reality that the epistemic practice targets or models. | Physical systems, biological systems, social systems, computational systems |  |
| **Epistemic Constraint** | Limitation that bounds what can be known or inferred within the system. | Noise, limited data, computational complexity, identifiability issues, measurement error, ignorance, intractability, stochasticity, higher-order stochasticity, chaos, nonlinearity, uncertainty propagation, and observational limitations. |  |
| **Epistemic Infrastructure** | Supporting environment that enables storage, computation, measurement, and communication of artifacts. | Sensors, laboratories, software systems, databases, notebooks, scientific publications |  |
| **Epistemic Feedback** | Signal from reality (or from another artifact) that resists or confirms prior predictions or actions; primary driver of learning and error correction. | Prediction error (residual), unexpected observation, failed intervention, successful replication, sensor saturation, model divergence, comparison between two Domain Snapshots taken at different times. |  |
| **Epistemic Act** | Primitive, non‑decomposable operation performed by an agent: attending, discriminating, remembering, anticipating, intervening, comparing, observing (which invokes Observation Encoding). | Attending to a sensor reading, detecting a difference, recalling an observation, emitting a prediction, pressing a measurement probe, judging similarity, encoding a raw signal into a digital value. |  |
| **Epistemic Principle** | Foundational normative, structural, or strategic rule that governs how epistemic agents should construct, validate, organize, or revise knowledge. Principles shape the selection of standards, tools, and processes by defining the underlying logic of inquiry. | Empiricism, falsifiability, parsimony (Occam’s Razor), Bayesian coherence, causal reasoning, reproducibility, predictive adequacy, reductionism, systems thinking, explanatory power, measurement invariance |  |
| **Epistemic Prior (Inductive Bias)** | Pre-existing assumptions, expectations, structural preferences, or probability distributions that constrain hypothesis generation and inference before new evidence is incorporated. Priors determine what explanations are considered plausible and influence search trajectories through hypothesis space. | Gaussian prior,  Simplicity preference, Smoothness assumption, Locality assumption |  |
| **Epistemic Strategy** | Adaptive, context-dependent planning logic that governs how epistemic agents allocate resources, sequence inquiry, navigate uncertainty, and select investigative pathways to achieve epistemic objectives under real-world constraints. Strategies operationalize principles into executable inquiry architectures by determining search order, decomposition methods, validation sequencing, exploration/exploitation balance, and intervention priorities. | Exploratory data analysis before formal modeling; hypothesis-first experimentation; reductionist decomposition; systems-level integrative analysis; sequential Bayesian updating; active learning; robustness-first validation; coarse-to-fine modeling; simulation-before-deployment; high-throughput screening; falsification-driven testing; divide-and-conquer investigation; iterative refinement; uncertainty minimization; adversarial stress testing; hierarchical model building. |  |
| **Epistemic Framework** | Abstract conceptual, inferential, and formal systems that structure how epistemic agents interpret observations, organize knowledge, generate explanations, and reason about reality. Frameworks define the overarching cognitive architecture within which principles, operators, and artifacts are selected and deployed. | Logic, causal inference, Bayesian reasoning, statistical reasoning, systems theory, cybernetics, information theory, mechanistic modeling, optimization theory, game theory, control theory, reductionist frameworks, complexity science, decision theory |  |
| **Epistemic Operator** | Formal or procedural mechanism used to construct, transform, representation form ( abstract artifact)or validate epistemic artifacts. | Algebraic manipulation, statistical inference, optimization algorithms, simulation methods, measurement procedures,  generic or abstract class of artifact or let’s called it by representational form. |  |

### Epistemic Activity

> Which are the types of activities through which the **epistemic program** is carried out?
> 

> An epistemic activity is any operation performed by an observer to construct, transform, evaluate, or apply knowledge about reality.
> 

> The term “epistemic activity” was formulated independently; while it is not widely used, it does have prior usage.
> 

> See [Activity](https://app.notion.com/p/Activity-33cc0f5171ec802fb062d2599e76b856?pvs=21),  [Modelling](https://app.notion.com/p/Modelling-334c0f5171ec803e8cfbe7f0bc02c575?pvs=21), etc.
> 

### Epistemic Tool

> What is the toolbox employed in the **program of inquiry**? Which tools do we use to describe reality?
> 

> An **epistemic tool** is any technique, method, or formal mechanism used by an observer to construct, represent, and validate descriptions of reality.
> 

> **Note:** An epistemic tool is any element that participates in an epistemic activity, either as a guiding structure (e.g., concepts, assumptions, constraints) or as a resulting artifact.
> 

> This can include  (notions like [State](https://app.notion.com/p/State-33bc0f5171ec8046ac56e32f25359e3f?pvs=21)),   procedures like ([Modelling](https://app.notion.com/p/Modelling-334c0f5171ec803e8cfbe7f0bc02c575?pvs=21) → [Model](https://app.notion.com/p/Model-1b1c0f5171ec807192cad4c8bdbc9b88?pvs=21)),  [Modelado](https://app.notion.com/p/Modelado-a6727ea210124fb9a00ff6bb5bcf7cd5?pvs=21), [Modelado](https://app.notion.com/p/Modelado-a6727ea210124fb9a00ff6bb5bcf7cd5?pvs=21),  [Formal System](https://app.notion.com/p/Formal-System-41d02881d0544314b0e7ad3e6ada608a?pvs=21),  etc.
> 

> See more in [Epistemic Tool](https://app.notion.com/p/Epistemic-Tool-33cc0f5171ec80a6880deda9ac8af8f4?pvs=21).
> 

### Epistemic Artifact

> A **deliberately constructed structured object**  product of  **epistemic activity**  that  **encodes a set of affirmations about a segment of reality.**
> 

> It serves as the **material or formal carrier** through which a description is represented, stored, and manipulated.
> 

> An epistemic artifact - a very special kind of epistemic tool -  is an externalized construct that **embodies a description of reality**.
> 

> See more of them in  [Epistemic Artifact](https://app.notion.com/p/Epistemic-Artifact-30ec0f5171ec80909e69c302fff36f78?pvs=21).
> 

### Epistemic Prior

> An epistemic prior (aka inductive bias) is a **modeling practical assumption (not affirmation)** about the underlying segment of reality that **can informs** the selection, solution, and validation of the resulting epistemic artifact, as well as the epistemic tools (representational forms, etc.) used to derive it.
> 

> **Note:** This is term is a new re-used - not related with Bayesian Epistemology, but a useful bridge between practical epistemology and reality.
> 

> See more in [Epistemic Prior](https://app.notion.com/p/Epistemic-Prior-346c0f5171ec805f8d3cd9ffde949455?pvs=21).
> 

### Epistemic Pathology

> The study of failure modes in epistemic activities.
> 

> See more in [**Epistemic Processing Error**](https://app.notion.com/p/Epistemic-Processing-Error-331c0f5171ec801199b3efae4023d698?pvs=21).
> 

### Affirmation Space

> An **Affirmation Space** is a powerful idea that attempts to capture the full set of possible affirmations that can be made about something.
> 

> See more in [Affirmation Space](https://app.notion.com/p/Affirmation-Space-336c0f5171ec80928f75ddbde09d7121?pvs=21).
> 

### Description

> 
> 

> See more in [Epistemic Artifact](https://app.notion.com/p/Epistemic-Artifact-30ec0f5171ec80909e69c302fff36f78?pvs=21).
> 

### Explanation

> An explanation is a very special form of description - maybe the ultimate form - this is why we need a special space for it.
> 

> See more in [Explanation](https://app.notion.com/p/Explanation-11dc0f5171ec80b8b8bcf08793bc64a8?pvs=21).
> 

### Evaluation

> How to evaluate descriptions of reality?
> 

> Why do we need - the idea of evaluation - and just not used the idea of ‘Validation’?
> 

> An evaluation is a comprehensive assessment of a description, encompassing its validity and other relevant criteria.
> 

> See more in [Evaluation](https://app.notion.com/p/Evaluation-24cc0f5171ec805dbe23f243fb47201c?pvs=21).
> 

### Validation

> How to validate our descriptions of reality?
> 

> See more in [Validation](https://app.notion.com/p/Validation-33cc0f5171ec80c4b84dc4d9edec64e5?pvs=21).
> 

### Limitation

> Which are the **fundamental properties** of reality that make prediction and other forms of description inherently limited?
> 

| **Factor** | **Description** | **Tag(s)** |
| --- | --- | --- |
| **Complexity** | Systems with many interacting components whose collective behavior is difficult to reduce to component-level descriptions. | ontic, structural |
| **Nonlinearity** | Systems where outputs are not proportional to inputs, often leading to amplification effects and instability. | dynamical |
| **Uncertainty** | Incomplete knowledge of system state, parameters, or exogenous influences affecting prediction accuracy. | epistemic |
| **Chaos** | Deterministic systems with extreme sensitivity to initial conditions, leading to long-term unpredictability. | dynamical, sensitivity |
| **Emergence** | Macroscopic properties arising from interactions that are not directly reducible to micro-level rules. | ontic, structural |
| **Scale** | Modeling challenges due to extreme spatial, temporal, or agent-number scales, often involving regime changes. | multiscale |
| **Data Availability** | Limitations caused by insufficient, biased, noisy, or inaccessible data for calibration or validation. | epistemic, data |
| **Computational Complexity** | Resource constraints that limit exact simulation or inference within feasible time or memory bounds. | computational |
| **Irreducibility** | Systems whose behavior cannot be compressed into simpler models without losing predictive fidelity. | algorithmic, complexity_theoretic |
| **Partial Observability** | Only a subset of the true system state is accessible, requiring inference over hidden variables. | epistemic, observational |
| **Non-Repeatability** | Inability to reproduce identical experimental conditions or trajectories, limiting statistical estimation. | experimental, epistemic |
| **Measurement Disturbance** | Observation processes that actively alter the system being measured. | measurement, epistemic |
| **Highly Interactive Many-Body Systems** | Systems with large numbers of mutually interacting components producing strongly coupled global dynamics. | structural, many_body |

## QA

### Why is this note relevant?

> I need to reflect and create a guide that involves ontology and epistemology, with the goal of clarifying the target of study.
> 

### Do  I Need a Theory of Modelling? Or That Theory Should Emerge as a Theory of Ontology and Epistemology?

> For now I Think - That the node of modelling should only be a kind of placeholder - for a theory of epistemology and ontology.
> 

### What is the relationship between Ontology and Epistemology?

> …
> 

### Why should we use formal artifacts to describe reality? Why use models instead of relying solely on our mental representations?

> Why? To Discipline Our Thinking.
> 

| **Purpose** | **Description** |
| --- | --- |
| **Prediction** | Models are used to forecast the behavior or outcomes of a system or process under different conditions. |
| **Explanation** | Models help to explain the underlying mechanisms or processes that lead to observed phenomena. |
| **Design** | Models are used to design or optimize systems or processes for specific purposes. |
| **Evaluation** | Models evaluate the performance of systems or processes to assess their effectiveness. |
| **Exploration** | Models are used to explore the behavior of complex systems or processes that are difficult to study directly. |
| **Communication** | Models communicate complex ideas or concepts to a broader audience in an understandable way. |

### How do we go about figuring out how nature works in practice?

> We cannot simply look randomly at isolated aspects of nature, nor rely uncritically on derived artifacts such as mathematical formalisms that only represent a system indirectly.
> 

> Instead, we must ground inquiry in experiments, paying close attention to deviations from current theory.
> 

> Another effective approach is to focus on interesting processes, phenomena, or event streams that are not explained by existing theories, using these discrepancies to identify gaps in our understanding.
> 

## References

- https://en.wikipedia.org/wiki/Reality
- ‣
- ‣
- ‣
- ‣
- ‣
- https://www.youtube.com/watch?v=X4PdPnQuwjY&t=19s
- [A Guide to Reading](https://app.notion.com/p/A-Guide-to-Reading-d4b6dde6584840389a3b88685c1bf1ed?pvs=21)
- [System](https://app.notion.com/p/System-1dac0f5171ec80c38c08f74d095235a9?pvs=21)
- [Energy](https://app.notion.com/p/Energy-39f21c7cc02545e289e03578281bd13f?pvs=21)
- [Epistemic Artifact](https://app.notion.com/p/Epistemic-Artifact-30ec0f5171ec80909e69c302fff36f78?pvs=21)
- [Philosophy](https://app.notion.com/p/Philosophy-ccc223e791024b4181a87d0d2b5d1cec?pvs=21)
- [Modelling](https://app.notion.com/p/Modelling-334c0f5171ec803e8cfbe7f0bc02c575?pvs=21)
- https://en.wikipedia.org/wiki/Reality
- ‣
- ‣
- ‣
