# Personal Recording System

> This document establishes the conceptual foundations, architecture, and implementation of a **Personal Recording System (PRS)**. A **PRS** is a technical object engineered to `preserve the continuity and coherence of human agency` by externalizing relevant states and enabling their persistent recording, discovery, retrieval, and use over time.

Fundamentally, a PRS exists to maintain persistent representations of the states that are relevant for effective action and orientation. These include:

- **External World State** — relevant aspects of the environment, events, opportunities, constraints, resources, and ongoing processes.
- **Internal Cognitive State** — intentions, plans, hypotheses, beliefs, decisions, reflections, mental models, and other cognitive structures that influence reasoning and action.
- **Social Cognitive State** — shared commitments, expectations, agreements, delegations, coordination structures, and other forms of jointly maintained social context.
- By preserving these states across time, a PRS functions as an externalized memory and coordination substrate, reducing state loss, improving continuity, and enabling more reliable individual and collective action.

## Formulation

> How to think about a `Personal Recording System`?

A `Personal Recording System` is a technical object with the role of externalizing **cognitive and intentional processes** to scaffold extended agency:

- preserve temporal coherence,
- stabilize intentional structures,
- reduce cognitive state loss,
- maintain coordination across time and agents,
- and support consistent strategic action.

### What Should I Remember? What is the nature?

#### Principle

> A PRS should preserve any state whose disappearance would reduce an agent's ability to reason, decide, coordinate, or act effectively in the future.
> The objective is not exhaustive recording, but selective persistence of operationally relevant state. Every recorded state should improve future orientation, continuity, or decision-making.

Conversely, information should generally not be preserved when it is:

- Easily recoverable from authoritative sources.
- Ephemeral and unlikely to influence future action.
- Redundant with existing records.
- Operationally irrelevant.
- More costly to maintain than the value it provides.

#### (Case Set) When to record an state?

A state is generally worth preserving if it is:

| Case                         | Description                                                                  | Examples                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Difficult to Reconstruct** | Recreating the state would require significant time, effort, or information. | Research findings, meeting notes, design rationale.             |
| **Action-Critical**          | Future actions depend on the state remaining available.                      | Pending tasks, commitments, deadlines, execution plans.         |
| **Decision-Critical**        | The state influences future choices or judgments.                            | Trade-off analyses, assumptions, hypotheses, constraints.       |
| **Coordination-Critical**    | Multiple agents rely on a shared understanding.                              | Agreements, responsibilities, shared goals, protocols.          |
| **Long-Lived**               | The state remains relevant over an extended period.                          | Personal principles, strategic objectives, reference knowledge. |
| **Time-Sensitive**           | The value of the state depends on acting before a deadline or event.         | Opportunities, appointments, renewal dates, reminders.          |
| **Volatile**                 | The state changes frequently and requires tracking over time.                | Project status, metrics, finances, health observations.         |
| **Non-Obvious**              | The information is unlikely to be recalled accurately from memory alone.     | Insights, lessons learned, subtle observations, ideas.          |
| **Expensive to Lose**        | Losing the state would impose significant cognitive or operational cost.     | System architectures, project history, legal obligations.       |
| **Identity-Defining**        | The state contributes to maintaining consistency of behavior over time.      | Values, policies, operating principles, personal standards.     |

#### State Recording Taxonomy

| State Type              | Category         | Description                                   | Example Instances                                    |
| ----------------------- | ---------------- | --------------------------------------------- | ---------------------------------------------------- |
| **Intentional State**   | Goals            | Desired future states to achieve.             | Finish PRS implementation; Learn Rust.               |
|                         | Plans            | Ordered courses of action.                    | Weekly implementation roadmap.                       |
|                         | Decisions        | Commitments to specific alternatives.         | Adopt SQLite as storage backend.                     |
|                         | Priorities       | Relative importance of ongoing work.          | PRS > Website redesign.                              |
| **Knowledge State**     | Facts            | Information believed to be true.              | API supports OAuth2.                                 |
|                         | Mental Models    | Internal explanatory structures.              | Model of Linux process scheduling.                   |
|                         | Hypotheses       | Provisional explanations awaiting validation. | Memory retrieval improves with tagging.              |
|                         | References       | Sources and supporting material.              | Research papers, books, documentation.               |
| **Task State**          | Tasks            | Units of actionable work.                     | Implement search index.                              |
|                         | Projects         | Collections of coordinated tasks.             | Personal Recording System.                           |
|                         | Progress         | Current execution state.                      | 65% complete.                                        |
|                         | Blockers         | Constraints preventing progress.              | Waiting for design decision.                         |
| **Environmental State** | Opportunities    | Favorable external conditions.                | Conference CFP deadline.                             |
|                         | Constraints      | External limitations.                         | Budget limits; legal requirements.                   |
|                         | Resources        | Available assets.                             | GPU server; documentation.                           |
|                         | Events           | Time-dependent occurrences.                   | Meeting tomorrow; software release.                  |
| **Social State**        | Commitments      | Promises and obligations.                     | Deliver draft by Friday.                             |
|                         | Agreements       | Shared decisions.                             | Team coding standard.                                |
|                         | Delegations      | Assigned responsibilities.                    | Alice owns deployment.                               |
|                         | Contacts         | Relevant people and organizations.            | Research collaborators.                              |
| **Reflective State**    | Observations     | Recorded experiences.                         | Search workflow is too slow.                         |
|                         | Lessons          | Generalized learning.                         | Prefer incremental indexing.                         |
|                         | Questions        | Open uncertainties.                           | Should embeddings be versioned?                      |
|                         | Rationales       | Why decisions were made.                      | SQLite chosen for portability.                       |
| **Identity State**      | Principles       | Stable operating values.                      | Favor reproducibility over convenience.              |
|                         | Preferences      | Persistent choices.                           | Markdown-first workflow.                             |
|                         | Standards        | Personal quality criteria.                    | Every project requires documentation.                |
|                         | Long-term Vision | Enduring direction.                           | Build cognitive infrastructure for engineering work. |

### What should be the structure of such **record**?

| Field                       | Description                                                                                                                                      | Example                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Record Id**               | Globally unique identifier used for traceability, referencing, synchronization, and relational linking across the recording system.              | `REC-2026-00124`, UUID, hash identifier.                                                              |
| **Record Content**          | The primary semantic payload of the record representing the core informational, cognitive, operational, or observational substance.              | A decision rationale, hypothesis, meeting summary, task description, strategic insight.               |
| **Record Detail**           | Extended explanatory, analytical, contextual, or supporting information expanding the primary content.                                           | Supporting arguments, implementation notes, evidence, commentary, diagrams, attachments.              |
| **Annotation Log**          | Append-only commentary written *about* the record. Annotations attach reflection, questions, review notes, and provenance commentary **without mutating the record's content**, `detail`, or revision history. | Reflections, open questions, review comments, correction requests, provenance notes. Each entry: `{id, created-at, author, kind, text, state}`. |
| **Temporal Metadata**       | Metadata describing temporal positioning, duration, sequencing, validity, or temporal orientation of the record.                                 | Creation timestamp, modification timestamp, deadline, recurrence interval, future projection horizon. |
| **Contextual Metadata**     | Metadata representing the situational, environmental, institutional, emotional, strategic, or operational context under which the record exists. | Project context, meeting context, organizational state, emotional state, geopolitical condition.      |
| **Epistemic Metadata**      | Metadata characterizing certainty, evidence quality, validation state, inference status, and epistemic reliability.                              | Confirmed, speculative, inferred, disputed, confidence score, evidence source.                        |
| **Operational Metadata**    | Metadata related to execution, coordination, workflows, operational status, and actionability.                                                   | Pending, active, blocked, delegated, completed, execution priority.                                   |
| **Lifecycle Metadata**      | Metadata describing the evolutionary state and historical progression of the record through time.                                                | Created, revised, deprecated, archived, invalidated, superseded.                                      |
| **Relational Metadata**     | Explicit graph relationships connecting the record to other records, entities, systems, or dependencies.                                         | `[(REC-104, depends-on), (REC-221, supersedes), (REC-89, supports)]`                                  |
| **Classification Metadata** | High-level semantic and classificatory metadata enabling indexing, organization, retrieval, and ontology alignment.                              | Classification, tags, domain, cognitive category, operational category, priority class.               |

### Record Link

> How can the records be linked?

| Category             | Link                        | Description                                                    |
| -------------------- | --------------------------- | -------------------------------------------------------------- |
| Structural           | `references`                | Mentions or cites another record, entity, artifact, or concept |
| Structural           | `related-to`                | General associative relationship without stronger semantics    |
| Structural           | `derived-from`              | Originates from or is produced from another record             |
| Structural           | `supersedes`                | Replaces or invalidates a previous record                      |
| Structural           | `duplicates`                | Represents substantially the same information                  |
| Structural           | `contains`                  | Parent record structurally includes subordinate records        |
| Structural           | `part-of`                   | Record belongs to a larger aggregate structure                 |
| Structural           | `extends`                   | Adds additional detail or continuation to another record       |
| Structural           | `version-of`                | Represents a revision or iteration of another record           |
| Temporal             | `precedes`                  | Occurs before another record in time                           |
| Temporal             | `follows`                   | Occurs after another record in time                            |
| Temporal             | `simultaneous-with`         | Occurs concurrently with another record                        |
| Temporal             | `recurs-from`               | Repeats according to a prior occurrence                        |
| Temporal             | `scheduled-after`           | Planned to occur following another record                      |
| Temporal             | `historically-caused`       | Indicates historical causal lineage                            |
| Causal               | `causes`                    | Directly produces or triggers another condition or event       |
| Causal               | `contributes-to`            | Partially influences another outcome                           |
| Causal               | `mitigates`                 | Reduces severity, probability, or impact                       |
| Causal               | `escalates`                 | Increases severity, instability, or impact                     |
| Causal               | `resolves`                  | Eliminates or closes another issue or condition                |
| Causal               | `enables`                   | Creates conditions allowing another process or action          |
| Causal               | `inhibits`                  | Restricts or suppresses another process or condition           |
| Operational          | `blocks`                    | Prevents progress or execution                                 |
| Operational          | `depends-on`                | Requires another record, capability, or condition              |
| Operational          | `required-by`               | Another record depends on this one                             |
| Operational          | `assigned-to`               | Responsibility delegated to an entity or actor                 |
| Operational          | `coordinates-with`          | Requires synchronization with another process or actor         |
| Operational          | `implements`                | Operationalizes or realizes a policy, decision, or objective   |
| Operational          | `tracks`                    | Monitors evolution or progress of another record               |
| Operational          | `spawned-from`              | Originated operationally from another activity                 |
| Epistemic            | `supports`                  | Provides evidence or justification                             |
| Epistemic            | `contradicts`               | Conflicts with another record or interpretation                |
| Epistemic            | `validates`                 | Confirms correctness or reliability                            |
| Epistemic            | `questions`                 | Raises doubt or uncertainty                                    |
| Epistemic            | `corroborates`              | Independently reinforces another claim                         |
| Epistemic            | `hypothesizes-about`        | Proposes explanatory interpretation concerning another record  |
| Epistemic            | `based-on`                  | Reasoning or conclusion derived from another source            |
| Governance           | `governed-by`               | Subject to a policy, rule, or constraint                       |
| Governance           | `violates`                  | Conflicts with a declared principle or rule                    |
| Governance           | `audits`                    | Reviews or inspects another record                             |
| Governance           | `authorizes`                | Grants permission or legitimacy                                |
| Governance           | `constrained-by`            | Limited by operational, legal, or strategic constraints        |
| Governance           | `aligned-with`              | Consistent with declared goals or principles                   |
| Strategic            | `advances`                  | Contributes toward a strategic objective                       |
| Strategic            | `threatens`                 | Endangers a strategic objective or system stability            |
| Strategic            | `opportunistically-enables` | Creates favorable strategic possibilities                      |
| Strategic            | `degrades`                  | Reduces long-term capability or viability                      |
| Strategic            | `strengthens`               | Improves resilience, capability, or systemic robustness        |
| Intelligence         | `signals`                   | Indicates an emerging pattern, anomaly, or possible issue      |
| Intelligence         | `predicts`                  | Suggests probable future state or event                        |
| Intelligence         | `indicates-drift`           | Reveals deviation from intended trajectory                     |
| Intelligence         | `clusters-with`             | Frequently co-occurs with related observations                 |
| Intelligence         | `root-cause-of`             | Identified as foundational source of another issue             |
| Human & Social       | `communicated-to`           | Shared with another actor                                      |
| Human & Social       | `requested-by`              | Initiated by another person or entity                          |
| Human & Social       | `approved-by`               | Validated or accepted by another actor                         |
| Human & Social       | `collaborates-with`         | Jointly developed or executed with others                      |
| Human & Social       | `affects`                   | Impacts another stakeholder or group                           |
| Artifact & Knowledge | `documents`                 | Formally records another event, state, or process              |
| Artifact & Knowledge | `evidenced-by`              | Supported by attached artifact or proof                        |
| Artifact & Knowledge | `visualizes`                | Represents another record graphically or structurally          |
| Artifact & Knowledge | `summarizes`                | Compresses or abstracts another record                         |
| Artifact & Knowledge | `explains`                  | Provides interpretive or instructional clarification           |
| Artifact & Knowledge | `indexes`                   | Organizes or catalogs another information structure            |

### Classification Metadata

> How to classify the **record**?

#### Dimension

| Classification Dimension | Purpose                                                  | Field Set                                             |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------- |
| **Semantic**             | What does this record represent?                         | Type, Domain, Subject, Topic, Keywords                    |
| **Operational**          | How is this record managed or acted upon?                | Status, Priority, Owner, Workflow State, Project          |
| **Temporal**             | How is this record situated in time?                     | Created, Updated, Deadline, Validity, Horizon, Recurrence |
| **Epistemic**            | What is the knowledge status of this record?             | Confidence, Evidence, Verification, Source, Certainty     |
| **Strategic**            | How does this record relate to long-term objectives?     | Objective, Initiative, Goal, Capability, Theme            |
| **Free**                 | What additional user-defined classifications are useful? | Custom Tags, Labels                                       |

#### Field Set

> Which are the allow values foe every field?

| Dimension       | Field               | Allowed Value Set                                                                                                       |
| --------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Semantic**    | **State Class**     | Internal Cognitive, External World,  Social (Joint State ) |
|                 | **Record Type**     | Goal, Decision, Task, Project, Event, Observation, Hypothesis, Question, Principle, Reference, Procedure, Meeting, Idea |
|                 | **Domain**          | Software Engineering, Biology, Economics, Medicine, Physics, Management, ...                                            |
|                 | **Subject**         | Any entity, concept, technology, person, organization, artifact, or phenomenon                                          |
|                 | **Topic**           | Controlled taxonomy of topics                                                                                           |
| **Operational** | Status              | Draft, Active, Pending, Blocked, Completed, Archived, Cancelled                                                         |
|                 | Priority            | Critical, High, Medium, Low                                                                                             |
|                 | Owner               | Person, Team, Organization                                                                                              |
|                 | Project             | Project identifier                                                                                                      |
|                 | Workflow State      | Planned, In Progress, Under Review, Approved, Deprecated                                                                |
| **Temporal**    | Horizon             | Immediate, Short-term, Medium-term, Long-term                                                                           |
|                 | Relevance           | Historical, Current, Future                                                                                             |
|                 | Recurrence          | None, Daily, Weekly, Monthly, Yearly, Custom                                                                            |
|                 | Validity            | Permanent, Temporary, Expired                                                                                           |
| **Epistemic**   | Verification Status | Unverified, Verified, Falsified, Disputed                                                                               |
|                 | Confidence          | Very Low, Low, Medium, High, Very High                                                                                  |
|                 | Evidence Level      | None, Anecdotal, Observational, Experimental, Formal Proof                                                              |
|                 | Source Type         | Personal Memory, Observation, Measurement, Document, Expert, External System                                            |
| **Strategic**   | Goal                | Strategic goal identifier                                                                                               |
|                 | Objective           | Strategic objective identifier                                                                                          |
|                 | Initiative          | Initiative identifier                                                                                                   |
|                 | Capability          | Capability identifier                                                                                                   |

## Evaluation

> How to **evaluate** such system?

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

## Implementation

### Functionality Set

- Record: Insert, Annotation, Search, Remeinder,  Share Link (To Visualization View), Quick Capture (Scratchpad)
- Dashbord: Statistics, Sub Views, etc.
- Derivative Functionality
  - Record Study (Analysis):  Record Time Reference Evolution, Record Time Line, Activity Heat Map, Topic Landscape Evolution, Record Embedding Graph, Recurrence Map
  - Record Summary:   (Daily, Weekly, Montly, Annual)
- Complementary Functionalty:
  - Google Calendar Integration
  - Keyword Navigation Mechanisms
  - Intelligent Autocomplete - Power by LLM API's
  - Browser Based Autosaved.
  - Intelligent Suggestions
  - Voice Input & Transcription
  - Email & Communication Integration
  - Task Management Integration
  - Multi-Calendar Integration
  - Recurrence & Pattern Mining
  - Automated Summary Generation
  - Automated Record Generation (Email Sources, ...)
  - Data Export & Import
  - Encryption

### Technical Element Set

| Layer             | Recommendation              |
| ----------------- | --------------------------- |
| Storage           | JSON + SQLIte               |
| API               | Simpel Python Flask         |
| UI                | CSS, JS, HTML (Can Use Librarie, Not Framework)|

#### UI - UX Guiding Principle

> The interface should be visually calm, consistent, and minimal, with aesthetics emerging from clarity, hierarchy, and purposeful design rather than decoration.

> The interface should follow an elegant, timeless, Oxford-inspired aesthetic characterized by clarity, restraint, refined typography, balanced composition, and the absence of unnecessary ornamentation.

| Category                     | Principle                           | Description                                                                                                                                                   |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Interaction Model**        | Keyboard shortcuts                  | The most relevant actions should be accessible via keyboard, including command palette, shortcuts, bulk operations, and navigation optimized for power users. |
| **Interaction Model**        | Progressive disclosure              | Expose essential information first; reveal advanced metadata, provenance, diagnostics, and configuration only when needed.                                    |
| **Data Integrity & Trust**   | Validity in the editor              | Surface schema violations, grammar errors, broken references, and enum mismatches inline.                                                                     |
| **Data Integrity & Trust**   | Immutable-by-default model          | Make revisions explicit; keep history and diffs always discoverable.                                                                                          |
| **Data Integrity & Trust**   | Transparent system state            | Clearly communicate save status, synchronization, validation, and background processing states.                                                               |
| **Data Integrity & Trust**   | Explainability over magic           | Generated suggestions, automations, and inferences should be inspectable.                                                                                     |
| **Visual Design**            | Sophisticated restraint             | Prioritize typography, spacing, clarity, and composition over decoration.                                                                                     |
| **Visual Design**            | Whitespace as structure             | Use spacing intentionally to create cognitive grouping and improve scanning.                                                                                  |
| **Visual Design**            | Semantic color usage                | Colors should communicate meaning rather than serve as decoration.                                                                                            |
| **Visual Design**            | Consistent visual language          | Maintain predictable patterns, components, iconography, and behaviors.                                                                                        |
| **Visual Design**            | Motion with purpose                 | Animations should communicate causality, continuity, and state transitions.                                                                                   |
| **Expert User Experience**   | Command palette everywhere          | Provide a universal command interface for actions and navigation.                                                                                             |

## References

- [Self Management](https://www.notion.so/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [A Guide to Daily Log](https://www.notion.so/A-Guide-to-Daily-Log-252c0f5171ec80fcb08cc98a46769479?source=copy_link)
- [Modellum Systematis Viabilis Personalis](https://www.notion.so/Modellum-Systematis-Viabilis-Personalis-1a5d38c7497c8060851cec0681de4a8b?source=copy_link)
- [New Audio APIs for Speech and Transcription](https://openrouter.ai/blog/announcements/announcing-audio-apis/)
