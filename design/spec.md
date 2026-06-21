# Personal Recording System (PRS) — Specification

> A **Personal Recording System (PRS)** is cognitive infrastructure designed to preserve continuity of state, support coherent agency across time, and enable the systematic externalization of cognition. Fundamentally, a PRS exists to maintain persistent representations of the states that are relevant for effective action and orientation.

## 1. Purpose & Conceptual Foundations

### 1.1 What Must Be Remembered

A PRS maintains persistent representations across three fundamental classes of state:

- **External World State** — relevant aspects of the environment, events, opportunities, constraints, resources, and ongoing processes.
- **Internal Cognitive State** — intentions, plans, hypotheses, beliefs, decisions, reflections, mental models, and other cognitive structures that influence reasoning and action.
- **Social Cognitive State** — shared commitments, expectations, agreements, delegations, coordination structures, and other forms of jointly maintained social context.

By preserving these states across time, a PRS functions as an externalized memory and coordination substrate, reducing state loss, improving continuity, and enabling more reliable individual and collective action.

### 1.2 Practical Categories of Records

| Category                                | Description                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Temporal Projection Structures**      | Anticipated, intended, or scheduled future states: goals, forecasts, plans, milestones, risk projections.         |
| **Meta-Cognitive State**                | Reflective/evaluative structures: self-reflection, confidence assessments, knowledge gaps, attention allocation.   |
| **Operational State**                   | Executable coordination state: active tasks, workflows, pending decisions, resource allocations.                  |
| **Identity-Continuity Structures**      | Persistent identity/values: principles, role identities, long-term commitments, worldview structures.             |
| **Knowledge Structures**                | Stabilized understanding: conceptual models, taxonomies, theories, procedural knowledge, causal models.          |
| **Decision Structures**                 | Decision rationale, alternatives, trade-offs, approval states, policy choices.                                    |
| **Constraint Structures**               | Limitations: budget constraints, time limitations, legal restrictions, dependency constraints.                     |
| **Relationship Structures**             | Relational dynamics: trust relationships, influence networks, stakeholder mappings.                               |
| **Environmental Monitoring Structures** | Changing external conditions: market monitoring, geopolitical developments, regulatory updates.                   |
| **Intentional Structures**              | Desired states: intentions, motivations, strategic objectives, transformation agendas.                            |
| **Memory-Audit Structures**             | Historical traceability: journals, revision logs, decision histories, audit trails.                               |
| **Coordination Structures**             | Synchronization across agents: delegations, task assignments, governance workflows.                               |
| **Risk Structures**                     | Uncertainty/vulnerability: threat models, failure scenarios, systemic fragility.                                  |
| **Resource Structures**                 | Available/allocated resources: financial resources, personnel, computational capacity, time budgets.             |

---

## 2. Data Model

A record is an **immutable unit** described by **core content** plus typed **metadata dimensions**. Editing never mutates a record in place; it produces a new revision (see §2.4).

### 2.1 Core Fields

Every record carries the following core fields:

| Field          | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `content`      | The primary semantic payload (structured value).     |
| `detail`       | Supplementary detail / elaboration (structured value).|
| `annotations` | Append-only commentary log *about* the record (see §2.7). Does **not** mutate `content` or `detail`. |

### 2.2 The High-Value Core

> These **8 fields deliver the most value per keystroke** and cover the inputs needed by *every* artifact in the Concrete Epistemic Artifact Set. They are the recommended minimum for new records.

| # | Field                | Group       | Why                                                                                   |
| - | -------------------- | ----------- | ------------------------------------------------------------------------------------- |
| 1 | `created-at`/`updated-at` | Temporal    | Auto-captured; universal leverage; anchors all time-based views.                      |
| 2 | `orientation`        | Temporal    | Cheap enum; partitions past/present/future; highest-leverage *manual* temporal field. |
| 3 | `validation-state`   | Epistemic   | Cheap enum; separates fact from speculation; highest single-field epistemic value.    |
| 4 | `tags`               | General     | Flexible, cheap retrieval axis; universal fallback across all dimensions.            |
| 5 | `execution-state`    | Operational | Cheap enum; separates knowledge from tasks; drives calendar overlays.               |
| 6 | Typed relations      | Relational  | Builds the knowledge graph; backbone of explanation and navigation.                  |
| 7 | `deadline`           | Temporal    | Turns records into commitments; surfaces them on the Calendar.                        |
| 8 | `project-context`    | Contextual  | Highest-value contextual field; enables calendar grouping and filtering.             |

### 2.3 Metadata Dimensions (Organized by Value Tier)

The full PRSL grammar defines more fields; here we organize them by **leverage tier** so implementation effort tracks value delivered.

#### Tier 1 — The Structural Backbone (highest leverage, required core)

> These dimension groups separate PRS from a flat notebook. Without them, the system cannot construct its core epistemic artifacts.

| Group | Fields | Rationale |
|-------|--------|-----------|
| **Temporal** | `created-at`, `updated-at`, `orientation` (`retrospective` \| `present` \| `prospective`), `valid-from`, `valid-until`, `deadline`, `recurrence`, `projection-horizon` | Feeds **9/13** artifacts; mostly auto-captured; epistemically deep. Capture `created-at`/`updated-at` automatically *always*. Make `orientation` near-mandatory. |
| **Relational** | Typed relations (see §2.5) | Converts notes into a knowledge graph; backbone of explanation and navigation. The single highest-value dimension for *explanation*. |
| **Epistemic** | `validation-state` (`confirmed` \| `speculative` \| `inferred` \| `disputed`), `confidence`/`certainty-level`, `evidence-source`, `inference-status` | The system's identity — makes PRS an *epistemic* system rather than a note store. `validation-state` is the single highest-leverage epistemic field. |

#### Tier 2 — High Value (Operational & Organizational)

| Group | Fields | Rationale |
|-------|--------|-----------|
| **Operational** | `execution-state` (`pending` \| `active` \| `blocked` \| `delegated` \| `completed`), `priority` (`critical` \| `high` \| `medium` \| `low`), `actionability`, `delegation`, `coordination-state` | Makes records actionable; drives action-oriented artifacts. `execution-state` and `actionability` give the best leverage. |
| **General** | `tags`, `domain`, `classification`, `cognitive-category`, `operational-category` | Primary retrieval and clustering axes. `tags` and `domain` are the high-leverage fields. The three `*-category` fields add diminishing returns and risk redundancy with `tags`/`domain`. |

#### Tier 3 — Moderate Value (Contextual Richness)

| Group | Fields | Rationale |
|-------|--------|-----------|
| **Contextual** | `project-context`, `organizational-context`, `strategic-context`, `emotional-context`, `environmental-context`, `location-context` | Adds richness but has the lowest artifact leverage. No dedicated artifact remains after consolidation. `project-context` enables calendar grouping/filtering. Treat the rest as optional refinements; consider promoting them to `tags`. |

#### Tier 4 — Infrastructure (essential, system-managed)

| Group | Fields | Rationale |
|-------|--------|-----------|
| **Lifecycle** | `state`, `revision`, `superseded-by`, `archived-at` | Essential for correctness and versioning, but automatically maintained by the system on every mutation. Not a target for user-facing capture effort. |

### 2.4 Versioning & Lifecycle

Records are **immutable**. All mutations are modeled as the creation of a new revision:

- The previous version's lifecycle transitions to `superseded`, with `superseded-by` pointing at the new version.
- `state`, `revision`, `superseded-by`, and `archived-at` are automatically maintained by the system.

> **Annotations are not revisions.** The annotation log (§2.7) is a separate, append-only commentary channel *about* a record. Appending an annotation never alters the record's `content`, `detail`, metadata, or revision history; it attaches commentary to the record without mutating it.

### 2.5 Record Links (Core Set)

> Relations transform isolated records into a connected epistemic structure. Per [`Philosophia Naturalis.md`](./Philosophia%20Naturalis.md), *"Relation — The way in which two or more entities are connected"* is an ontological primitive.

The full PRSL grammar defines **8** relation types; [`README.md`](./README.md) §"Record Link" specifies an intended **80+** types across **10 categories** (Structural, Temporal, Causal, Operational, Epistemic, Governance, Strategic, Intelligence, Human & Social, Artifact & Knowledge). This spec prioritizes the **8 core high-leverage types**; the full taxonomy should be referenced from `README.md`.

| Link          | Category    | Why high-value                                                                 |
| ------------- | ----------- | ------------------------------------------------------------------------------ |
| `depends-on`  | Operational | Encodes dependency structure — backbone of explanation and impact analysis.    |
| `supports`    | Epistemic   | Encodes justificatory structure; essential for validation.                      |
| `contradicts` | Epistemic   | Flags epistemic tension; essential for diagnosis and detecting invalidated beliefs. |
| `causes`      | Causal      | Encodes causal claims — the deepest form of relational knowledge, serving prediction. |
| `derived-from`| Structural  | Provenance and evolution of thought; supports auditability.                    |
| `supersedes`  | Structural  | Replaces/invalidates a previous record; supports lifecycle reasoning.          |
| `references`  | Structural  | Navigation glue; cheaper to capture.                                           |
| `related-to`  | Structural  | General associative relationship; cheapest, lowest individual leverage.        |

> **Implementation note:** Prioritize typed relations (`depends-on`, `supports`, `contradicts`, `causes`) over generic `related-to`. The gap between the grammar's 8 types and the README's 80+ intended types should be closed over time — each new typed relation multiplies the graph's expressive power.

### 2.6 Tags (Core Ontology)

> `tags` is the **universal fallback and join layer** across all dimensions — a record can be retrievable via tags even when its structured metadata is incomplete.

The full tag ontology in [`README.md`](./README.md) §"Tags" spans **12 categories** and **90+ tag values**. This spec prioritizes the two highest-leverage categories:

#### Domain Tags (primary clustering axis)

`physical-health`, `cognitive-development`, `administration`, `house-management`, `domestic-infrastructure`, `technical-work`, `business-development`, `finance`, `organizational-development`, `infrastructure`, `planning`, `knowledge-management`

#### Record Type Tags (semantic classification)

`event`, `commitment`, `decision`, `reflection`, `state`, `signal`, `risk`, `policy`, `artifact`, `consultation`, `interaction`, `task`, `project`

> **Note:** The full tag ontology (including Temporal, Operational Status, Priority, Epistemic, Cognitive Processing, Relationship, Risk, Energy & Effort, Governance, and Intelligence categories) is documented in [`README.md`](./README.md) §"Tags". Note that several tag categories *partition* semantics that also live in dedicated metadata blocks (e.g., Temporal tags overlap with `orientation`; Epistemic tags overlap with `validation-state`).

### 2.7 Annotation Log (Append-Only Commentary)

> Every record carries an **annotation log**: an append-only sequence of commentary entries written *about* the record. Annotations let users attach reflection, questions, review notes, provenance commentary, and contextual updates **without changing the record's content**. This preserves the immutability guarantee (§2.4) while giving the record a living conversational surface.

**Annotation ≠ Revision.** The defining rule of the annotation log:

- Appending an annotation **never** mutates `content`, `detail`, metadata, relations, or the revision counter.
- To *change what the record says*, the user must create a new **revision** (§2.4).
- To *say something about the record* (reflect, question, comment, review), the user appends an **annotation**.

**Annotation entry model:**

| Field        | Purpose                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| `id`         | Unique identifier for the annotation entry (UUID).                                     |
| `created-at` | Auto-captured timestamp of the annotation.                                             |
| `author`     | Originating actor (user, agent, or system).                                            |
| `kind`       | Optional semantic class of the commentary (e.g., `comment`, `question`, `review`, `reflection`, `correction-request`, `provenance`). |
| `text`       | The commentary payload (Markdown).                                                     |
| `state`      | Optional lifecycle of the entry itself (`open` / `resolved`), e.g., to mark a question as answered or a correction as addressed. |

**Rules:**

- **Append-only:** entries can be added and (optionally) state-transitioned, but never silently edited or deleted; their own history is preserved as part of the audit trail.
- **Non-authoritative:** annotations carry no authority over record content; they are *about* the record, not part of it.
- **Promotable:** a high-value annotation (e.g., a confirmed correction) can be promoted into a new **revision**, or converted into a typed **relation** (§2.5) or a new **record** (e.g., `supports` / `contradicts`), at which point the immutable-record semantics apply to the promoted artifact.
- **Searchable:** annotations are included in full-text search (§4.3) so commentary about a record is as discoverable as the record itself.
- **Auditable:** annotations contribute to *Memory-Audit Structures* (§1.2) and the *Auditability* evaluation criteria (§6: Event Auditability, Change Traceability, Evidence Preservation).

---

## 3. Metadata Value Analysis

> Which metadata dimensions add the most value? This analysis ranks the PRSL metadata dimensions by *leverage* — the degree to which capturing a dimension increases the system's ability to deliver its goals: intelligibility, navigation, explanation, diagnosis, prediction, and action.

### 3.1 Evaluation Criteria

A dimension is "high-value" when it scores well across: **artifact leverage** (how many artifacts it enables), **query/filter power**, **non-derivable information**, **epistemic depth**, **action/decision support**, and low **capture cost**. High value = high leverage + low capture cost.

### 3.2 Tier Ranking Summary

| Rank | Dimension group | Value tier | Primary reason                                                                 |
| ---- | --------------- | ---------- | ------------------------------------------------------------------------------ |
| 1    | **Temporal**    | Tier 1     | Feeds 9/13 artifacts; mostly auto-captured; epistemically deep.                |
| 2    | **Relational**  | Tier 1     | Converts notes into a knowledge graph; backbone of explanation & navigation.   |
| 3    | **Epistemic**   | Tier 1     | The system's identity; separates knowledge from belief.                        |
| 4    | **Operational** | Tier 2     | Makes records actionable.                                                       |
| 5    | **General**     | Tier 2     | Primary retrieval/clustering axes (`tags`, `domain`).                          |
| 6    | **Contextual**  | Tier 3     | Richness; `project-context` enables calendar grouping. No dedicated artifact.  |
| 7    | **Lifecycle**   | Tier 4     | Infrastructure; system-managed, low user-capture value.                        |

**Bottom line:** Invest capture effort in **Temporal (esp. `orientation`, `deadline`), Relational (typed relations), and Epistemic (`validation-state`) metadata.** These three groups carry the system from "notebook" to "epistemic instrument." General `tags`/`domain` are the cheap organizational multiplier. The **Calendar** is the temporal hub that consolidates logs, events, and summaries into one navigable view.

### 3.3 Artifact → Dimension Dependency Matrix

| Artifact                  | Temporal | Relational | Epistemic | Operational | General | Contextual | Lifecycle |
| ------------------------- | :------: | :--------: | :-------: | :---------: | :-----: | :--------: | :-------: |
| Record Time Reference Line           | ●        |            |           |             |         |            |           |
| Record Time Line           |          | ●          | ◐         |             |         |            |           |
| Activity Heat Map         | ●        |            |           | ●           |         |            |           |
| Daily/Weekly/Monthly/Annual Summaries | ● |          |           |             |         |            |           |
| Calendar                  | ●        |            |           |             | ●       |            |           |
| Recurrence Map            | ●        |            |           |             |         |            |           |
| Topic Landscape Evolution | ●        |            |           |             | ●       |            |           |
| Record Embedding Map      |          | ◐          | ◐         |             | ●       | ●          |           |

`●` = primary input, `◐` = secondary/enriching input. Temporal feeds **6/7** artifacts; General feeds **3**; Operational feeds **1**; Relational enriches **2**. This empirically supports Temporal as the highest-value group. The **Calendar** is the temporal hub through which all time-bound views (logs, summaries, events) are navigated. The **Record Embedding Map** is the semantic hub: it consumes embeddings plus `General`/`Contextual`/`Relational` metadata to render the corpus as a navigable topic hierarchy. Relational metadata remains the highest *qualitative* dimension for knowledge-graph structure.

### 3.4 Cross-Validation Against the Evaluation Framework

Cross-checking against the 53 evaluation criteria across 14 categories (§6) confirms the tier ranking: **Temporal** is required by 3/14 categories, **Relational** by 3/14, **Epistemic** is the sole satisfier of Epistemic Quality and Intelligence (uniqueness value), **Operational** by 2/14, and **General** (`tags`) is the only path to Cognitive Efficiency. **Contextual** is not required by any category (enrichment only). This independently reproduces the tier ranking from the artifact-leverage analysis.

---

## 4. Client Capabilities

### 4.1 Goals

- Drafting (Temporal Records)
- Access control: User and API key when communicating with the backend.
- Notifications
- Overview — combined view (multiple artifacts on one screen), drill-down, zoom, or cross-artifact navigation.

### 4.2 Recording

The client must let users capture, structure, and maintain records. Each metadata block is optional but, when present, must be validated against the grammar. PRSL-aware structured editors provide validation and autocomplete against reserved keywords and enumerations.

The client must also support the **annotation log** (§2.7): users can append commentary to any record at any time without entering a revision/edit workflow. Record `content`/`detail` remain read-only while annotations are added.

### 4.3 Search

The client must provide a search experience combining:

- **Full-text search** over `content`, `detail`, and `annotations`.
- **Structured filters** over metadata dimensions, e.g.:
  - Temporal ranges (`valid-from`/`valid-until`, `deadline`, `created-at`).
  - Classification: `tags`, `domain`, `classification`, `cognitive-category`, `operational-category`.
  - Operational: `execution-state`, `priority`, `delegation`, `actionability`.
  - Epistemic: `validation-state`, `confidence`/`certainty-level` thresholds.
  - Relational: traversal of relations (e.g., all records `depends-on` X, or contradicting Y).
  - Lifecycle: current revision only vs. full history; state filters.
- **Combinations** of the above via an explicit query builder.
- **Saved queries / views** so common filters can be re-run.

### 4.4 AI Service Integration

- Field Completion.
- Text Completion.
- Summarization.
- **Record Embedding** — project records into a vector space and cluster them into a **multi-layer topic hierarchy** (records → sub-topics → topics → topic-groups), enabling hierarchical semantic navigation of the corpus (see §5 *Record Embedding Map*).
- Search & Retrieval
  - Semantic Search — Retrieve records by meaning rather than keyword matching.
  - Query Expansion — Extend searches with related concepts and terminology.
  - Question Answering — Answer questions using the PRSL corpus as the knowledge source.
  - Record Recommendation — Surface potentially relevant records during authoring and review.
- Record Structuring — Transform unstructured notes into valid PRSL records.

---

## 5. Epistemic Projection

> The PRSL dataset is the reality-facing record substrate. Epistemic Projection is the process of transforming the raw record collection into higher-order epistemic artifacts that increase intelligibility, navigation, explanation, diagnosis, prediction, and action.

> **The goal of epistemology is (1) to construct and maintain the scaffolding mechanisms of inquiry, and (2) to construct, validate, and organize the Domain Concrete Epistemic Artifact Set (DCESA) that represents reality.**

> **Domain Concrete Epistemic Artifact Set (DCESA):** The intelligibility layer of a reality domain, consisting of the complete set of concrete epistemic artifacts through which that domain becomes describable, explainable, predictable, navigable, and actionable.

### Concrete Epistemic Artifact Set

| Artifact                   | Derived From                            | Purpose                                                        |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| Record Time Reference Line            | Temporal metadata                       | Display the evolution of recorded reality through time.        |
| Record Time Line           | Relational metadata (typed relations)   | Display the structure of recorded knowledge: how records depend on, cause, support, contradict, and derive from each other. |
| Activity Heat Map          | `created-at`, `updated-at`, `execution-state` | Reveal activity density, bursts, inactivity, and rhythms. |
| Calendar                   | `created-at`, `deadline`, `recurrence`, Google Calendar events | Central temporal hub: logs, summaries, events, and commitments in one navigable view. |
| Daily Summary              | Records within day window               | Produce a compressed description of a day.                     |
| Weekly Summary             | Records within week window              | Produce a compressed description of weekly activity.           |
| Monthly Summary            | Records within month window             | Produce a compressed description of monthly activity.          |
| Annual Summary             | Records within year window              | Produce a compressed description of yearly activity.           |
| Recurrence Map             | `recurrence`                            | Reveal recurring activities and patterns.                      |
| Topic Landscape Evolution  | `created-at`, `tags`, `domain`          | Reveal the emergence, growth, decline, and disappearance of topics through time. |
| Record Embedding Map       | Record embeddings, `domain`, `tags`, `project-context` | Project records into vector space and cluster them into a **multi-layer "onion" topic hierarchy** (records → sub-topics → topics → topic-groups) for hierarchical semantic navigation, drill-down, and topic-scale overview. |

---

## 6. Evaluation Framework

> How to evaluate such a system? The following 53 criteria across 14 categories define the quality dimensions of a PRS.

| Category               | Criteria                     | Description                                                                        |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| Recoverability         | Historical Reconstruction    | Ability to reconstruct what happened, why it happened, and under which conditions  |
| Recoverability         | Context Recovery Speed       | Time required to resume interrupted work using recorded information                |
| Recoverability         | Decision Traceability        | Ability to recover reasoning, assumptions, and constraints behind decisions        |
| Recoverability         | Artifact Linkage             | Ability to connect events, decisions, outputs, and supporting evidence             |
| Cognitive Efficiency   | Cognitive Load Reduction     | Degree to which the system reduces mental rehearsal and memory burden              |
| Cognitive Efficiency   | Intrusive Thought Reduction  | Reduction of repeated reminders and unresolved mental loops                        |
| Cognitive Efficiency   | Capture Friction             | Effort required to record information without disrupting operations                |
| Cognitive Efficiency   | Retrieval Efficiency         | Speed and ease of finding relevant information                                     |
| Cognitive Efficiency   | Information Compression      | Ability to preserve high informational value with minimal verbosity                |
| Operational Continuity | Restart Latency              | Time required to restart work after interruption                                   |
| Operational Continuity | State Preservation           | Ability to preserve operational state across time gaps                             |
| Operational Continuity | Dependency Visibility        | Clarity regarding blockers, dependencies, and coordination requirements            |
| Operational Continuity | Execution Stability          | Ability to maintain continuity despite interruptions or environmental changes      |
| Coordination           | Commitment Reliability       | Ability to track and fulfill promises and obligations                              |
| Coordination           | Scheduling Coherence         | Degree to which future activities are temporally coordinated                       |
| Coordination           | Conflict Detection           | Ability to identify collisions, overload, or incompatible commitments              |
| Coordination           | Multi-Domain Synchronization | Ability to coordinate across personal, technical, financial, and strategic domains |
| Governance             | Policy Alignment             | Degree to which operations align with declared principles and long-term goals      |
| Governance             | Constraint Visibility        | Visibility of operational, financial, cognitive, or temporal limitations           |
| Governance             | Accountability               | Ability to identify responsibility and ownership                                   |
| Governance             | Review Mechanisms            | Presence of recurring audit and reflection processes                               |
| Intelligence           | Pattern Detection            | Ability to identify recurring structures, failures, and behaviors                  |
| Intelligence           | Weak Signal Detection        | Ability to detect emerging risks or opportunities early                            |
| Intelligence           | Adaptation Capacity          | Ability to evolve processes and behavior based on observations                     |
| Intelligence           | Strategic Awareness          | Ability to maintain awareness of long-term priorities and environmental changes    |
| Epistemic Quality      | Information Reliability      | Degree of accuracy, validity, and trustworthiness of records                       |
| Epistemic Quality      | Confidence Representation    | Ability to express uncertainty and epistemic status                                |
| Epistemic Quality      | Source Traceability          | Ability to trace where information originated                                      |
| Epistemic Quality      | Knowledge Reusability        | Ability to reuse previously acquired knowledge effectively                         |
| Temporal Integrity     | Temporal Coherence           | Clear distinction between past, present, and future information                    |
| Temporal Integrity     | Historical Continuity        | Preservation of long-term institutional memory                                     |
| Temporal Integrity     | Future Visibility            | Clarity regarding future obligations and planned actions                           |
| Structural Quality     | Classification Consistency   | Consistent use of tags, categories, and schemas                                    |
| Structural Quality     | Schema Stability             | Stability and predictability of record structures                                  |
| Structural Quality     | Relational Integrity         | Quality of relationships between records                                           |
| Structural Quality     | Information Density          | Ratio of useful information to storage overhead                                    |
| Scalability            | Growth Sustainability        | Ability of the system to scale without becoming chaotic                            |
| Scalability            | Retrieval Scalability        | Ability to retrieve information efficiently as records grow                        |
| Scalability            | Maintenance Overhead         | Operational cost of maintaining the system                                         |
| Usability              | Recording Simplicity         | Ease of recording information rapidly                                              |
| Usability              | Interface Clarity            | Clarity and navigability of the system                                             |
| Usability              | Workflow Compatibility       | Compatibility with real operational behavior                                       |
| Usability              | Interruptibility Tolerance   | Ability to tolerate fragmented or interrupted usage                                |
| Auditability           | Event Auditability           | Ability to inspect historical operations                                           |
| Auditability           | Change Traceability          | Visibility into modifications and state transitions                                |
| Auditability           | Evidence Preservation        | Preservation of supporting materials and references                                |
| Resilience             | Failure Recovery             | Ability to recover from data loss, interruption, or operational disruption         |
| Resilience             | Redundancy                   | Presence of backup and preservation mechanisms                                     |
| Resilience             | Fragility Resistance         | Resistance to collapse under complexity or overload                                |
| Strategic Value        | Long-Term Learning           | Contribution to cumulative knowledge and self-understanding                        |
| Strategic Value        | Institutionalization         | Ability to preserve systems, methods, and policies across time                     |
| Strategic Value        | Decision Improvement         | Contribution to higher-quality future decisions                                    |
| Strategic Value        | Viability Contribution       | Overall contribution to sustainable personal system functionality                  |

---

## 7. Implementation

### 7.1 Tech Stack

- **HTML, CSS, JavaScript** — standards-based, framework-agnostic core.
- **Markdown editor** with **image support** for `content` and `detail`.
- **PRSL-aware structured editors** for each metadata block, with validation and autocomplete against reserved keywords and enumerations (e.g., `validation-state`, `execution-state`, `priority`, `relation-type`, `orientation`).
- Dont' use frameworks, but you can use libraries, like for graphs, etc.

### 7.2 Storage Architecture

| Layer             | Recommendation        |
| ----------------- | --------------------- |
| Storage           | JSON + SQLite         |
| Semantic indexing | SQLite                |
| Navigation        | Custom commands       |
| Graph links       | UUID-based            |

---

## 8. UX / UI Guidelines

### Interaction Model

* **Keyboard shorctus** —  the most relevant actiosn - shoudl be trigger via the keyword like - action accessible via keyboard; command palette, shortcuts, bulk operations, and navigation optimized for power users.
* **Progressive disclosure** — expose essential information first; reveal advanced metadata, provenance, diagnostics, and configuration on demand.
* **Direct manipulation where appropriate** — drag, reorder, connect, annotate, and restructure entities without modal-heavy workflows.
* **Low interaction cost** — minimize clicks, context switches, and unnecessary confirmations.
* **Optimistic interaction design** — operations feel immediate while preserving transactional correctness.

### Information Architecture

* **Information density without clutter** — maximize information per screen while maintaining readability and visual calm.
* **Strong visual hierarchy** — clear distinction between primary content, metadata, annotations, controls, and system state.
* **Context preservation** — users should always know where they are, what they are editing, and how the current view relates to the larger system.
* **Locality of reference** — related information appears together whenever possible.
* **Overview → Zoom → Detail-on-demand** — support navigation from global structure to fine-grained inspection.

### Data Integrity & Trust

* **Validity in the editor** — surface schema violations, grammar errors, broken references, and enum mismatches inline.
* **Immutable-by-default mental model** — revisions are explicit; history and diffs are always discoverable.
* **Transparent system state** — clearly communicate save status, synchronization state, validation state, and background processing.
* **Explainability over magic** — generated suggestions, automations, and inferences should be inspectable.
* **Provenance awareness** — allow users to inspect origin, lineage, authorship, and transformation history of information.

### Visual Design

* **Sophisticated restraint** — prioritize clarity, typography, spacing, and composition over decorative elements.
* **Whitespace as structure** — use spacing intentionally to create cognitive grouping and improve scanning.
* **Semantic color usage** — colors communicate meaning, not decoration.
* **Consistent visual language** — predictable patterns, components, iconography, and behaviors.
* **Motion with purpose** — animations should communicate causality, continuity, and state transitions.

### Expert User Experience

* **Command palette for everything**.
* **Search-centric navigation** — users can reach any entity, document, relation, or command rapidly.
* **Batch and bulk operations** — optimize for large-scale workflows.
* **Customizable workspaces** — views, panels, layouts, filters, and shortcuts can be tailored.
* **High discoverability of advanced features** without overwhelming new users.

### Cognitive Ergonomics

* **Recognition over recall** — reduce memory burden through visible affordances and contextual assistance.
* **Minimize cognitive context switching**.
* **Reduce uncertainty** — users should rarely wonder what will happen next.
* **Support flow state** — avoid interruptions, modal dialogs, and unnecessary friction.
* **Cognitive continuity** — preserve focus, cursor position, viewport state, and working context.

### System Feedback

* **Immediate feedback for all actions**.
* **Predictable latency handling** — loading, processing, synchronization, and indexing states are explicit.
* **Graceful degradation** under slow networks or large datasets.
* **Recoverability by design** — undo, redo, rollback, and revision restoration should be ubiquitous.

### Accessibility

* **WCAG-conscious design**.
* **Full keyboard accessibility**.
* **Screen-reader compatibility**.
* **Color-independent communication**.
* **High-contrast and low-distraction modes**.
* **Dark/light themes with equivalent quality**.

### Scalability

* **Designed for 10× growth** — interfaces remain usable with thousands of entities, documents, relationships, or records.
* **Virtualized rendering for large datasets**.
* **Progressive loading of complex structures**.
* **Multiple representations of the same data** (table, graph, outline, timeline, card, map, etc.).

### Hallmarks of Premium Software

* **Calm by default, powerful on demand.**
* **Every pixel earns its place.**
* **Fast paths for experts; safe paths for novices.**
* **The system feels trustworthy, reversible, and inspectable.**
* **Complexity exists in the model, not in the interface.**

## References

- [`README.md`](./README.md) — Full conceptual foundations, complete record link taxonomy (80+ types), complete tag ontology (90+ values).
- [`metadata-value-analysis.md`](./metadata-value-analysis.md) — Detailed metadata value analysis with full tier rationale and cross-validation.
- [`Philosophia Naturalis.md`](./Philosophia%20Naturalis.md) — Epistemological grounding: reality, ontology, epistemology, DCESA.