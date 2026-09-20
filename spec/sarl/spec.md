# Sistema Asistencia de Revisión Lingüística

> This document establishes the conceptual foundations, data model, functionality,
> and design of a **Sistema Asistencia de Revisión Lingüística (SARL)** — a
> *Linguistic Review Assistance System*. A SARL is a technical object engineered
> to `verify and correct text`: it checks a submitted text for **linguistic**,
> **stylistic**, **terminological**, and **orthotypographic** defects and returns
> evidence-cited **findings** with suggestions, from which a corrected text is
> composed by explicit disposition — the discipline of a copy editor's pass,
> applied to every text the agent produces.

> Within the Autoregia Personal Viable System Model (PVSM), SARL is not an organ
> of the control loop: it is a tool of the **Agent Toolbox Ecosystem (ATE)**,
> mounted at `/ate/tool/sarl/`. It serves the quality of the agent's textual
> outputs — documents, notes, READMEs, deliberations, reports — the texts
> **Execution** (CES) produces and **Feedback** (PRAS) reads. It is
> deliberately *not* a writer and *not* a translator: it composes nothing and
> translates nothing — it verifies and corrects what already exists, and every
> change it proposes is accepted or rejected by the agent.

Fundamentally, a SARL exists to make *reviewing a text* a uniform, inspectable,
repeatable pass. These include:

- **Texts** — the submitted work: content, language, and register. The unit of
  work.
- **Rules** — the check definitions: one entry per defect class, each declaring
  its dimension, severity, matcher, message, and suggestion strategy. The unit
  of criteria.
- **Findings** — one detected issue: an exact span of the text, the rule that
  fired, the evidence quoted, suggested replacement(s), and a disposition. The
  unit of evidence.
- **Glossaries** — terminological authorities per language and domain: preferred
  terms, forbidden terms, aliases. The unit of terminology.
- **Phrase collections** — the engine's editable phrase lists (muletillas,
  fillers) per language, consulted by the `estilística` rules at review time.
  The unit of the phrase catalog.
- **Text edition tasks** — the workflow of a linguistic review of a document
  under a set of criteria: findings, dispositions, and the corrected text with
  its change log, carried through an explicit lifecycle. The set of tasks is
  the journal — searchable, append-only evidence; the analogue of CTES task
  specs and runs.

## The Model

### Text

The document under review is **markdown**. Defining a task (`POST /api/tasks`)
fixes it:

| Field | Meaning |
| --- | --- |
| `title` | optional document name, shown in the journal |
| `content` | the document, in markdown |
| `language` | `es` (first-class) or `en` — selects the rule packs |
| `register` | optional genre tag (`technical · formal · editorial · personal`) — tunes stylistic thresholds |
| `glossary_ids` | optional terminological authorities to enforce |

Because the document is markdown, the engine protects its non-prose regions:
findings never fire inside fenced or indented code blocks, inline code spans,
or link/autolink URLs — code, links, and markup are never "corrected". The
document is **never mutated in place**: a review reads it; corrections are
suggestions over spans, applied only by an explicit Apply (below).

### Rule

A rule is one defect class, member of a **rule pack** (below). Each rule
declares:

| Field | Meaning |
| --- | --- |
| `id` | stable slug (`es-ort-typographic-quotes`, `est-filler-phrases`, …) |
| `dimension` | one of `ortotipografica · linguistica · estilistica · terminologica` |
| `severity` | `error · warning · suggestion` |
| `matcher` | the deterministic test: regex, token pattern, or list lookup |
| `message` | the human-facing explanation, with the reason, not just the verdict |
| `suggestion` | how a replacement is derived, when one can be |

Every live rule is **deterministic**: the same text over the same packs always
yields the same findings. No model calls sit in the live path.

### Finding

A finding is one occurrence of one rule in one review: the exact span
(`start`, `end`) plus the quoted evidence — never a bare line number — the
severity, the suggestion(s), and a disposition:

| Disposition | Meaning |
| --- | --- |
| `pending` | raised, undecided — the initial state |
| `accepted` | the suggestion will be applied |
| `rejected` | the agent overrules the rule — recorded, not applied |

Dispositions are SARL's feedback surface: a rejected finding is a voice of
policy, and repeated rejections of one rule are the natural trigger to retire
or retune it.

### Glossary

A glossary is a terminological authority: a named, language-tagged set of
entries, each declaring a **preferred term**, optional **forbidden** variants,
and **aliases**. The `terminologica` dimension enforces it: forbidden terms and
unpreferred aliases are raised as findings whose suggestion is the preferred
form; unwarranted variation between equally valid aliases is flagged for
consistency. One starter glossary (Spanish technical writing) seeds the store.

### Phrase catalog

The phrase catalog is the engine's phrase lists made editable: named
**phrase collections**, each a language-tagged (`es` · `en` · `any`) set of
phrases with a kind (`muletilla` · `filler` · `formulaic` · `other`), a note,
and an `enabled` switch. The `estilística` muletilla rule consults the enabled
collections matching the text's language at review time — no hard-coded lists.
A phrase raised from the catalog suggests deletion; edits apply on the very
next task. Starter collections seed the store.

### Text edition task

A task is **the documented representation of a linguistic review process** —
the workflow of a review of one document under a set of criteria, recorded as
evidence: not a single fused pass. The task carries the markdown
document (title, content, language, register), its **criteria set** (the
engaged dimensions + the attached glossaries), the rule packs engaged, the
full findings list, per-finding dispositions, summary counts by dimension
and severity, and — after Apply — the **corrected text** with a **change
log** (one entry per applied suggestion: span, rule, before → after). Tasks
are append-only evidence; the set of tasks is searchable (by title, content,
or rule fired); the log is SARL's analogue of the binnacle.

The workflow lifecycle is explicit:

```
Created → Reviewed → Applied
              └─► Discarded
```

Defining a task journals it in `created` — document and criteria fixed, no
findings yet. **Review is an explicit workflow step** (`POST
/api/tasks/<id>/review`): the packs run synchronously (the live path is
deterministic and instant) and the task moves to `reviewed`. Dispositions
are only open while `reviewed`; `apply` and `discard` are the terminal
paths (`discard` is also open to a `created` task — abandon before
reviewing). Applying an accepted suggestion whose span overlaps another
accepted one is refused at disposition time, so Apply composes right-to-left
over disjoint spans — deterministic by construction.

## Dimensions

| Dimension | Verifies | Examples |
| --- | --- | --- |
| **Ortotipográfica** | the typography conventions of the written sign | straight quotes → «comillas latinas» / curly quotes; hyphen vs. raya (`-` vs `—`); ellipsis (`...` → `…`); double spaces; capitalization after punctuation; abbreviation spacing (p. ej.); number and percent typography |
| **Lingüística** | grammar and usage of the language | agreement and conjugation slips; accentuation (`tildes`); confusions (*queísmo*, *dequeísmo*, `haber/a ver`, `si no/sino`); gender of loanwords |
| **Estilística** | clarity, economy, and register | filler phrases (*muletillas*: "cabe destacar que", "it should be noted that"); unwarranted repetition; sentence length outliers; register breaks against the declared genre |
| **Terminológica** | glossary compliance and consistency | forbidden terms; unpreferred aliases; terminology drift across one text |

## Engine

**Deterministic offline rules — live.** The live path is pure Python: regex and
token matchers plus word lists, no network, no models. Rule packs are the unit
of deployment — one pack per language × dimension, discovered from a package in
the house style (adding a pack is adding one module).

**External engine — designed, dormant.** A LanguageTool adapter
(`POST /api/v2/check`, local server) is designed as a supplemental pack: the
code path — submit, parse matches, map to findings with evidence spans — is
specified and testable against a mock endpoint, but it wakes only when a
LanguageTool server is configured. Dormancy is visible as the pack's
`dormant` state with setup copy, never as missing design — the same doctrine as
GCAL's dormant OAuth2 adapters.

## Rule Packs (v1)

| Pack | Language | Dimension | Status |
| --- | --- | --- | --- |
| `es-ortotipografia` | es | ortotipográfica | **live** — the zero-dependency workhorse |
| `es-linguistica` | es | lingüística | **live** — word-list and pattern checks |
| `en-orthotypography` | en | ortotipográfica | **live** |
| `estilo` | es · en | estilística | **live** — consults the phrase catalog |
| `terminologia` | es · en | terminológica | **live** — enforces any attached glossary |
| `languagetool` | es · en | all | **flow-complete, dormant** — supplemental engine |

*Dormant* means the adapter is designed — request shape, match mapping, mock —
but unexercisable until a LanguageTool endpoint is configured. Live packs are
exactly reproducible; the dormant engine, when woken, contributes findings
marked `engine: languagetool` so their provenance stays distinct.

## API Surface

| Endpoint | Description |
| --- | --- |
| `GET /api/rules` | registry: packs, rules, dimensions, severities, pack status |
| `POST /api/tasks` | define `{title?, content (markdown), language, register?, glossary_ids?, dimensions?}` → task in `created` |
| `GET /api/tasks` | the task set — searchable (`q`: title, content, rule fired); filters `state`, `language`; offset paging |
| `GET /api/tasks/<id>` | task detail: criteria, findings, dispositions, counts |
| `POST /api/tasks/<id>/review` | run the review — the workflow step that raises the findings (`created` → `reviewed`) |
| `POST /api/tasks/<id>/disposition` | `{finding_id, disposition}` — accept, reject, or reset |
| `POST /api/tasks/<id>/apply` | apply accepted suggestions → corrected text + change log |
| `POST /api/tasks/<id>/discard` | close the task without applying |
| `DELETE /api/tasks` | clear the journal |
| `GET /api/glossaries` | list glossaries |
| `POST /api/glossaries` | create a glossary |
| `GET /api/glossaries/<id>` | glossary detail |
| `PUT /api/glossaries/<id>` | update entries |
| `DELETE /api/glossaries/<id>` | remove a glossary |
| `GET /api/phrases` | the phrase catalog (collections) |
| `POST /api/phrases` | create a collection |
| `GET /api/phrases/<id>` | collection detail |
| `PUT /api/phrases/<id>` | update phrases / toggle enabled |
| `DELETE /api/phrases/<id>` | remove a collection |
| `GET /api/overview` | the dashboard payload (counts, top rules, resources) |
| `GET /api/audit` | audit trail (every mutation; never pruned) |
| `GET/PUT /api/settings` | defaults: language, register, caps, LanguageTool URL |
| `GET /api/self` | self monitoring: store, engine packs, timing |
| `GET /api/export` | full JSON export |

## Conventions

- **Non-destructive by default** — the submitted text is immutable; Apply is
  the only operation that composes a corrected text, and it produces a new
  artifact next to a change log, never an overwrite.
- **Evidence spans** — every finding cites `start`, `end`, and the quoted
  evidence; a finding without its span is a bug.
- **Deterministic first** — live findings are reproducible by construction;
  any woken external engine is provenance-tagged, never blended silently.
- **Bounded responses** — findings capped per review, evidence excerpts
  truncated, so a pathological text cannot flood the plate or the log.

## Storage

A single CouchDB database `sarl` through the shared `support.storage.Store`,
seed-on-empty per house convention — the seed carries the starter glossary and
the starter phrase collections, never user data. Typed documents: `task`,
`glossary`, `phrase_collection`, `audit`, `settings`. Tasks are append-only
evidence; dispositions and applies are recorded on the task document, and a
retention setting prunes the journal. Test suites use the isolated
`sarl_test_` prefix and never touch dev data.

## The Plate

A WOS-style application shell — the CTES copy of the house grammar
(`spec/ui.spec` §5.2, §7): header search, sidebar router, command palette
(Ctrl K), toast, shared icons — all relative URLs, all tokens from the shared
`/ui/` layer. The views:

- **Dashboard** — the review practice at a glance: findings by dimension and
  severity, dispositions, most-fired rules, engine pack status, latest tasks.
- **Tasks** — the set of review tasks, searchable (free text over title,
  content, and rules fired; state and language filters; paging). Defining a
  task lives here — a **New Task** button opens the definition view
  (`#tasks/new`): a **markdown editor** (Write | Preview over the shared
  renderer, insert toolbar) plus title, language, register, dimension
  checkboxes, and glossary toggles; there is no separate creation view in
  the aside.
- **Task detail** (`#tasks/<id>`) — **the review pipeline**: a stage
  tracker (Intake → Criteria → Review → Findings → Resolution → Verify →
  Complete) projected from the task state, over three panes. Left: the task
  record (id, state, title) with its declared **criteria** as a checklist
  and the process history link. Center: **the document** — a Read |
  Annotated toggle (Read = rendered markdown; Annotated = the exact-span
  view with numbered, severity-colored highlights) and a findings pager.
  Right: **the resolution rail** — finding cards with severity/dimension
  filters, line and paragraph anchors, quoted evidence, explanation,
  suggested replacement, and **Apply / Ignore** per finding (the
  accepted/rejected dispositions). Card ⇄ highlight selection is two-way;
  Verify shows the corrected text (raw or rendered) beside its change log;
  **Complete review** is the Apply step.
- **Glossaries · Phrase Catalog** — the two authorities, both full CRUD with
  modal editors; the phrase catalog's edits reach the engine live.
- **Audit · Self Monitoring · Settings · Documentation · About · Export** —
  the system views, in the standard register.

## Implementation Status

**Implemented — v1 live** at `/ate/tool/sarl/`. The deterministic engine (all
five live packs, markdown-protected), text edition tasks as define → review →
disposition → apply workflows over markdown documents, the searchable task
set, glossaries, the phrase catalog, the WOS-style shell, audit, settings,
self monitoring, overview, and export. The LanguageTool adapter ships
flow-complete and **dormant**: it wakes only when `languagetool_url` is set
in Settings, is tested against a mock endpoint, and tags its findings
`engine: languagetool`. Golden texts per pack, markdown protection, and the
mock LanguageTool run in `test_sarl.py` (listed in `make test`).

## References

- RAE, *Ortografía de la lengua española* — the orthotypographic canon the
  `es` packs encode: <https://www.rae.es/ortografia/>
- LanguageTool — the external engine, designed dormant:
  <https://languagetool.org/dev-reference>
- The sibling tools this work complements: [CES](../ces/) (Execution) and
  [GCAL](../gcal/) (Connectors) — the latter source of the dormant-adapter
  doctrine
