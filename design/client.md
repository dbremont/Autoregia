# Client Spec

This is the specification of the client for the **Personal Recording System (PRS)**. It defines the user-facing capabilities of the client application and how those capabilities map onto the underlying PRSL data model defined in [`gramar.ebnf`](./gramar.ebnf).

> The client is the *source of intent*; `gramar.ebnf` is the *source of truth* for the data model. Where this document enumerates fields, it mirrors the grammar. Any discrepancy should be resolved in favor of the grammar, and this document updated to match.

---

## Goals

- Drafting (Temporal Records)
- -__Access control / sharing / encryption -  Which should be send on every api interaction - and the client should used it.
- Notifications / reminders__ — The system has `deadline`, `recurrence`, `review-periodic`, and a Future Commitments Map — but no notification, reminder, or alerting feature.
- Overview — combined view (multiple artifacts on one screen), drill-down, zoom, or cross-artifact navigation.

### 1. Recording

The client must let users capture, structure, and maintain records. A record is an immutable unit described by **core content** plus a set of typed **metadata dimensions**. Editing never mutates a record in place; it produces a new version (see §Versioning & Lifecycle).

#### 1.1 Core fields

Every record carries the following core fields, which the client must support for authoring, display, and search:

| Field            | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `content`        | The primary body of the record (structured value).   |
| `detail`         | Supplementary detail / elaboration (structured value).|
| `retention-policy` | How long the record is kept (`permanent`, `temporary`, `archive-on-completion`, `review-periodic`, or a `Duration`). |

#### 1.2 Metadata dimensions

The client surfaces, and lets users edit, the metadata dimensions defined by PRSL. Each block is optional but, when present, must be validated against the grammar.

- **Temporal metadata** — `created-at`, `updated-at`, `valid-from`, `valid-until`, `deadline`, `recurrence`, `orientation` (`retrospective` | `present` | `prospective`), `projection-horizon`.
- **Contextual metadata** — `project-context`, `organizational-context`, `strategic-context`, `emotional-context`, `environmental-context`, `location-context`.
- **Epistemic metadata** — `confidence` (percentage), `validation-state` (`confirmed` | `speculative` | `inferred` | `disputed`), `evidence-source` (list), `inference-status`, `certainty-level`.
- **Operational metadata** — `execution-state` (`pending` | `active` | `blocked` | `delegated` | `completed`), `priority` (`critical` | `high` | `medium` | `low`), `delegation`, `coordination-state`, `actionability`.
- **Lifecycle metadata** — `state`, `revision`, `superseded-by`, `archived-at` (see §Versioning & Lifecycle).
- **Relational metadata** — typed relations to other records: `depends-on`, `supports`, `supersedes`, `contradicts`, `references`, `derived-from`, `causes`, `related-to`.
- **General metadata** — `classification`, `tags`, `domain`, `cognitive-category`, `operational-category`.

#### 1.3 Versioning & Lifecycle

Records are **immutable**. All mutations are modeled as the creation of a new revision:

- Editing a record creates a new record version carrying an incremented `revision` and a `lifecycle-metadata.state` of `revised`.
- The previous version's lifecycle transitions to `superseded`, with `superseded-by` pointing at the new version.
- A **patch** is a targeted update of specific fields (vs. a full rewrite) that likewise yields a new revision; the client should make the diff explicit before committing.
- Superseded versions are retained for audit; they are never silently deleted.
- Supported lifecycle states: `created`, `revised`, `deprecated`, `archived`, `invalidated`, `superseded`.

#### 1.4 Search

The client must provide a search experience combining:

- **Full-text search** over `content` and `detail`.
- **Structured filters** over metadata dimensions, e.g.:
  - Temporal ranges (`valid-from`/`valid-until`, `deadline`, `created-at`).
  - Classification: `tags`, `domain`, `classification`, `cognitive-category`, `operational-category`.
  - Operational: `execution-state`, `priority`, `delegation`, `actionability`.
  - Epistemic: `validation-state`, `confidence`/`certainty-level` thresholds.
  - Relational: traversal of relations (e.g., all records `depends-on` X, or contradicting Y).
  - Lifecycle: current revision only vs. full history; state filters.
- **Combinations** of the above via an explicit query builder.
- **Saved queries / views** so common filters can be re-run.

### 1.5 AI Service Integration

- Field Completion.
- Text Completion.
- Summarization.
- Record Embedding.
- Search & Retrieval
  - Semantic Search — Retrieve records by meaning rather than keyword matching.
  - Query Expansion — Extend searches with related concepts and terminology.
  - Question Answering — Answer questions using the PRSL corpus as the knowledge source.
  - Record Recommendation — Surface potentially relevant records during authoring and review.
- Record Structuring — Transform unstructured notes into valid PRSL records.

### 2. Epistemic Projection

> The PRSL dataset is the reality-facing record substrate. Epistemic Projection is the process of transforming the raw record collection into higher-order epistemic artifacts that increase intelligibility, navigation, explanation, diagnosis, prediction, and action.

> **The goal of epistemology is (1) to construct and maintain the scaffolding mechanisms of inquiry, and (2) to construct, validate, and organize the Domain Concrete Epistemic Artifact Set (DCESA) that represents reality.**

> Domain Concrete Epistemic Artifact Set (DCESA): The intelligibility layer of a reality domain, consisting of the complete set of concrete epistemic artifacts through which that domain becomes describable, explainable, predictable, navigable, and actionable. Similar ideas **Cognitive Map - Sistema de Anclaje, Sistema de Organizacion,**

#### Concrete Epistemic Artifact Set

| Artifact                   | Derived From                              | Purpose                                                           |
| -------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Record Timeline            | Temporal metadata                         | Display the evolution of recorded reality through time.           |
| Activity Heat Map          | created-at, updated-at, execution-state   | Reveal activity density, bursts, inactivity, and rhythms.         |
| Daily Summary              | Records within day window                 | Produce a compressed description of a day.                        |
| Weekly Summary             | Records within week window                | Produce a compressed description of weekly activity.              |
| Monthly Summary            | Records within month window               | Produce a compressed description of monthly activity.             |
| Annual Summary             | Records within year window                | Produce a compressed description of yearly activity.              |
| Domain Map                 | domain, classification, tags              | Reveal the major domains represented in the corpus.               |
| Record Graph Embedding   (Dependency Graph, )   | Records                                   | ... |
| Recurrence Map             | recurrence                                | Reveal recurring activities and patterns.                         |
| Future Commitments Map     | deadline, execution-state                 | Surface obligations and upcoming commitments.                     |
| Attention Allocation Map   | activity over time                        | Show where cognitive effort is concentrated.                      |
| Active Work Map            | execution-state                           | Show currently active efforts.
| Priority Landscape         | priority                                  | Visualize strategic attention allocation.                         |
| Project Context Map        | project-context                           | Display project structure and project relationships.              |
| Forecast Horizon Map       | projection-horizon, orientation           | Display future-oriented knowledge structures.                     |
| Topic Landscape Evolution  | created-at, tags, domain                  | Reveal the emergence, growth, decline, and disappearance of topics through time.|

## Tech Stack

- **HTML, CSS, JavaScript** — standards-based, framework-agnostic core.
- **Markdown editor** with **image support** for `content` and `detail`.
- **PRSL-aware structured editors** for each metadata block, with validation and autocomplete against reserved keywords and enumerations (e.g., `validation-state`, `execution-state`, `priority`, `relation-type`, `orientation`).
- A parser conforming to [`gramar.ebnf`](./gramar.ebnf) for ingest, validation, and round-tripping.

---

## UX / UI Guidelines

- **High-end, sophisticated design** — calm, information-dense, and precise; avoid decorative noise.
- **Keyboard-first** workflows for fast capture and editing; every metadata action reachable without the mouse. Keyword navigation maxxing - a la vim.
- **Progressive disclosure** — show core fields by default; reveal metadata blocks on demand.
- **Validity in the editor** — surface grammar/enum violations inline before save.
- **Immutable-by-default mental model** — make revision creation and diffs obvious; never imply silent overwrite.
- **Accessibility & theming** — WCAG-conscious, dark/light themes, strong typographic hierarchy, generous use of whitespace where it aids scanning.
