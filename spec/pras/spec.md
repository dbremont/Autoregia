# Personal Reflection & Adaptation System — Specification

> This document establishes the conceptual foundations, data model, and functionality of a **Personal Reflection & Adaptation System (PRAS)**. A PRAS is a technical object engineered to `convert experience into deliberate adaptation` — it externalizes the reflective and adaptive processes that close the agent's feedback loop, turning observed consequences into revised models, goals, and policies.

> Within the Autoregia PVSM, PRAS instantiates the **Feedback** stage of the agent control loop and maps to **VSM System 4 – Intelligence**. See [`README.md`](README.md) for the conceptual summary and the deliberation lifecycle; this document specifies the data model and behavior.

## Formulation

> How to think about a `Personal Reflection & Adaptation System`?

A `Personal Reflection & Adaptation System` is a technical object with the role of externalizing **reflective and adaptive processes** to scaffold extended agency. It exists to:

- preserve the *reasoning* behind every change, so that adaptation is traceable rather than drift;
- detect and articulate deviation between intention and outcome;
- hold lessons, hypotheses, and decisions-in-formation in a stable, reviewable form;
- and route each settled adaptation to the system that must enact it.

### What should I reflect on?

> A deliberation should be opened whenever the agent notices a gap between intention and outcome that, if left unexamined, would degrade future action.

The objective is not exhaustive journaling but **selective persistence of operationally relevant reflection**. Every deliberation should improve future orientation, decision, or adaptation.

## Data Model

> The deliberations *are* the data. There is no separate database: each deliberation is a self-contained document (HTML in the prototype) under `pras/deliberations/`. The server indexes the documents at startup to provide search and a listing. This mirrors the [PPS](../../pps/README.md) "documents-as-data" model.

### The Deliberation

| Field | Role |
| --- | --- |
| `id` / slug | Stable identifier derived from the filename (e.g. `2026-w24-review`). |
| `title` | Human title of the deliberation. |
| `summary` | One-line synopsis. |
| `domain` | Life/domain tag — `Method`, `Work`, `Health`, `Learning`, `Conduct`, `Identity`. |
| `type` | Deliberation type (see below). |
| `status` | Lifecycle state (see below). |
| `date` | ISO date the deliberation was opened. |
| `tags` | Free-form keyword list. |
| `feeds` | Destination system(s) for the adaptation — subset of `pps, pwos, prs, ptocs`. |
| `observation` | What was noticed (the trigger of the deliberation). |
| `deliberation` | The reasoning: why it happened, what it means. |
| `adaptation` | The proposed change, and where it should be enacted. |
| `links` | References to records (PRS), policies (PPS), actions (PWOS), capabilities (PTOCS). |

### Deliberation Types

| Type | Use |
| --- | --- |
| `review` | A periodic review (daily / weekly / monthly / annual) summarizing the period and its lessons. |
| `deviation` | A deviation analysis: observed outcome vs. intended target, with cause and correction. |
| `retrospective` | A look back at a completed effort, cycle, or project. |
| `hypothesis` | A hypothesis to be tested by the next cycle of action and observation. |
| `decision-in-formation` | A decision being deliberated toward, before it is committed. |

### Lifecycle Status

| Status | Meaning | Next |
| --- | --- | --- |
| `open` | Reflection in progress. | → `concluded` |
| `concluded` | Reasoning settled; adaptation proposed. | → `enacted` (or `superseded`) |
| `enacted` | Adaptation applied to its destination system. | terminal (may be `superseded`) |
| `superseded` | Replaced by a later deliberation. | terminal |

### The Apex — Reflection Practice

The document `practice.html` is the **apex / main entry** of the corpus. It is not an instance of reflection but the **standing practice** that governs how deliberations are conducted and how they mature into adaptations. It is the analogue of the PPS charter: where the charter states identity and policy direction, the practice states the *method of reflection*.

## Functionality

### Index & Navigation
- A main entry lists the apex (Reflection Practice) as the pinned document.
- The remaining deliberations are grouped by `domain`, each shown with its `type`, `status`, and `date`.
- A status filter and a type filter narrow the index.

### Search
- Full scored search over the corpus: title, summary, domain, tags, type, status, and body text.
- Simple substring matching (case-insensitive); results ranked by field weight, with a highlighted snippet. No boolean or field-query syntax.

### The Deliberation Page
Each deliberation renders as a manuscript with:
- breadcrumb back to the index, eyebrow, title, and a meta line (domain · type · status · date · feeds),
- the **observation** → **deliberation** → **adaptation** arc,
- an **adaptation callout** declaring the destination system(s) and the enacted change (with a link into that system once `enacted`),
- links to related records, policies, actions, and capabilities.

### Lifecycle Actions (prototype scope)
- The prototype is **read / browse / search**. Adding a deliberation means dropping an HTML file into `pras/deliberations/` and restarting (the index rebuilds at startup), exactly as in PPS.
- Lifecycle transitions (`open → concluded → enacted`) are expressed by editing the document's `pra-status` meta and recording the enactment in the adaptation section. A future revision will expose creation, transition, and cross-system enactment through the Personal Event Bus ([ISCB](../iscb/spec.md)).

## Implementation Notes

- **Stack:** Flask + vanilla HTML/CSS/JS, conforming to the [Autoregia UI Specification](../ui.spec).
- **Documents are the data:** no database, no schema file, no separate record store. The `pra-*` `<meta>` tags are the structured surface the server indexes; the body is the prose.
- **Mounting:** under the unified `app.py` at the `/pras/` prefix (distinct from the Recording System's `/prs/`).
- **Feeds (future):** once the [ISCB](../iscb/spec.md) event bus exists, an `enacted` deliberation emits an event (`AdaptationEnacted`) carrying its destination, so PPS / PWOS / PRS / PTOCS can react without hard-coupling.

## References

- [Autoregia Specification](../README.md) — the PVSM, the agent control loop, the Feedback stage.
- [PPS](../../pps/README.md) — the sibling Policy System; PRAS deliberations feed it.
- [ISCB](../iscb/spec.md) — the Personal Event Bus that will carry enactment events.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
