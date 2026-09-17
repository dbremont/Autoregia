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
- **Reviews** — one pass over a text: the dimensions requested, the findings
  raised, the dispositions taken, and the corrected text with its change log.
  The unit of a review session — the analogue of CES sessions and GIAL
  executions.

## The Model

### Text

A text is the object under review, submitted to `POST /api/reviews`:

| Field | Meaning |
| --- | --- |
| `content` | the raw text (markdown or plain) |
| `language` | `es` (first-class) or `en` — selects the rule packs |
| `register` | optional genre tag (`technical · formal · editorial · personal`) — tunes stylistic thresholds |
| `glossary_ids` | optional terminological authorities to enforce |

The text is **never mutated in place**: a review reads it; corrections are
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

### Review

Every pass is logged as a review: the submitted text, language, register, the
rule packs engaged, the full findings list, per-finding dispositions, summary
counts by dimension and severity, and — after Apply — the **corrected text**
with a **change log** (one entry per applied suggestion: span, rule, before →
after). Reviews are append-only evidence; the log is SARL's analogue of the
binnacle.

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
GIAL's dormant OAuth2 adapters.

## Rule Packs (v1)

| Pack | Language | Dimension | Status |
| --- | --- | --- | --- |
| `es-ortotipografia` | es | ortotipográfica | **live** — the zero-dependency workhorse |
| `es-linguistica` | es | lingüística | **live** — word-list and pattern checks |
| `en-orthotypography` | en | ortotipográfica | **live** |
| `estilo` | es · en | estilística | **live** — bilingual muletilla and repetition lists |
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
| `GET /api/glossaries` | list glossaries |
| `POST /api/glossaries` | create a glossary |
| `GET /api/glossaries/<id>` | glossary detail |
| `PUT /api/glossaries/<id>` | update entries |
| `DELETE /api/glossaries/<id>` | remove a glossary |
| `POST /api/reviews` | submit `{content, language, register?, glossary_ids?}` → review + findings |
| `GET /api/reviews` | review log |
| `GET /api/reviews/<id>` | review detail: findings, dispositions, counts |
| `POST /api/reviews/<id>/disposition` | `{finding_id, disposition}` — accept or reject |
| `POST /api/reviews/<id>/apply` | apply accepted suggestions → corrected text + change log |
| `DELETE /api/reviews` | clear the log |

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
rule-pack metadata, never user data. Reviews are append-only evidence;
dispositions and applies are recorded on the review document. Test suites use
the isolated `sarl_test_` prefix and never touch dev data.

## The Plate

One plate, three zones, in the design language of the rest of the system
(`design.md` tokens):

- **Left** — the submission: text area, language select (`es` first), register
  select, glossary toggles, dimension checkboxes, Review button.
- **Right** — the findings: grouped by dimension, ordered by severity, each
  card quoting its evidence with accept / reject buttons and the suggested
  replacement; summary counts by dimension and severity above.
- **Bottom** — the report: Apply composes the corrected text beside its change
  log; below it, the review log with one row per pass, click through to full
  detail.

## Implementation Status

**Designed — not implemented.** This document is the design; a design plate
reserves the URL at `/ate/tool/sarl/` and carries the model summary. The
implementation order when begun: rule-pack base + `es-ortotipografia` → review
API + CouchDB storage → findings/dispositions on the plate → Apply + change
log → remaining live packs → glossaries → LanguageTool adapter (dormant) →
tests (golden texts per pack, mock LanguageTool endpoint).

## References

- RAE, *Ortografía de la lengua española* — the orthotypographic canon the
  `es` packs encode: <https://www.rae.es/ortografia/>
- LanguageTool — the external engine, designed dormant:
  <https://languagetool.org/dev-reference>
- The sibling tools this work complements: [CES](../ces/) (Execution) and
  [GIAL](../gial/) (Integration) — the latter source of the dormant-adapter
  doctrine
