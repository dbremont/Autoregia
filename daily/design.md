# Personal Recording System

> The `Personal Recording System` is a mechanism to store both (retrospective = past state),  present state,  (prospective = future state), meta records information.

## Formulation

### What are the things that I should be able to record?

### What should be the structure of such record?

- Record Id
- Record Links Link -> [(Id - Link Type), ...]
- Record Date
- Record Tags
- Record Detail

NVIM :

- Allow the extention of each `record` with a node link to the `id`.
- ... 

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

### Tags

> How to classify the **record**?

| Category               | Tag                          | Description                                                                            |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| Domain                 | `physical-health`            | Physical health maintenance, exercise, sleep, nutrition, and medical management        |
| Domain                 | `cognitive-development`      | Study, research, intellectual growth, and learning activities                          |
| Domain                 | `administration`             | Personal administrative logistics, documentation, banking, and compliance              |
| Domain                 | `house-management`           | Governance and coordination of household operations                                    |
| Domain                 | `domestic-infrastructure`    | Maintenance and operation of home infrastructure and supplies                          |
| Domain                 | `technical-work`             | Engineering, software development, debugging, architecture, and technical production   |
| Domain                 | `business-development`       | Opportunity discovery, partnerships, market research, and growth initiatives           |
| Domain                 | `finance`                    | Financial operations, budgeting, investments, and resource allocation                  |
| Domain                 | `organizational-development` | Internal systems building, SOPs, capability development, and governance infrastructure |
| Domain                 | `infrastructure`             | Devices, tooling, environments, software configuration, and operational infrastructure |
| Domain                 | `planning`                   | Scheduling, prioritization, coordination, and execution planning                       |
| Domain                 | `knowledge-management`       | Knowledge organization, documentation, and cognitive externalization                   |
| Record Type            | `event`                      | Something that occurred in the past                                                    |
| Record Type            | `commitment`                 | Promise, obligation, or future responsibility                                          |
| Record Type            | `decision`                   | Governance or strategic determination                                                  |
| Record Type            | `reflection`                 | Meta-cognitive or analytical evaluation                                                |
| Record Type            | `state`                      | Snapshot of a system condition                                                         |
| Record Type            | `signal`                     | Weak observation requiring monitoring or interpretation                                |
| Record Type            | `risk`                       | Threat, instability, or possible negative condition                                    |
| Record Type            | `policy`                     | Governing principle or persistent constraint                                           |
| Record Type            | `artifact`                   | Produced output such as documents, code, diagrams, or reports                          |
| Record Type            | `consultation`               | Record of external information or resource consumption                                 |
| Record Type            | `interaction`                | Human interaction, meeting, conversation, or coordination exchange                     |
| Record Type            | `task`                       | Executable operational unit                                                            |
| Record Type            | `project`                    | Coordinated multi-step objective                                                       |
| Temporal               | `immediate`                  | Requires attention now or very soon                                                    |
| Temporal               | `short-term`                 | Relevant within days or weeks                                                          |
| Temporal               | `mid-term`                   | Relevant within months                                                                 |
| Temporal               | `long-term`                  | Strategic or distant-future relevance                                                  |
| Temporal               | `historical`                 | Primarily historical or archival significance                                          |
| Temporal               | `recurring`                  | Repeats periodically                                                                   |
| Temporal               | `deferred`                   | Intentionally postponed                                                                |
| Temporal               | `scheduled`                  | Assigned to a specific future time                                                     |
| Operational Status     | `active`                     | Currently being worked on or operational                                               |
| Operational Status     | `blocked`                    | Cannot proceed due to dependency or obstacle                                           |
| Operational Status     | `completed`                  | Successfully finished                                                                  |
| Operational Status     | `failed`                     | Did not succeed                                                                        |
| Operational Status     | `suspended`                  | Temporarily paused                                                                     |
| Operational Status     | `cancelled`                  | Explicitly terminated                                                                  |
| Operational Status     | `pending-review`             | Awaiting analysis, validation, or approval                                             |
| Operational Status     | `archived`                   | Preserved for historical reference                                                     |
| Priority & Criticality | `critical`                   | Severe importance or high operational impact                                           |
| Priority & Criticality | `high-priority`              | Important and time-sensitive                                                           |
| Priority & Criticality | `routine`                    | Standard operational relevance                                                         |
| Priority & Criticality | `low-priority`               | Minor urgency or importance                                                            |
| Priority & Criticality | `strategic`                  | Long-term systemic importance                                                          |
| Priority & Criticality | `maintenance`                | Sustains continuity or stability                                                       |
| Epistemic              | `hypothesis`                 | Unverified explanatory interpretation                                                  |
| Epistemic              | `confirmed`                  | Verified or validated information                                                      |
| Epistemic              | `uncertain`                  | Confidence level is low                                                                |
| Epistemic              | `speculative`                | Exploratory or conjectural idea                                                        |
| Epistemic              | `observed`                   | Directly witnessed or measured                                                         |
| Epistemic              | `inferred`                   | Derived through reasoning                                                              |
| Epistemic              | `assumption`                 | Working premise accepted temporarily                                                   |
| Cognitive Processing   | `capture-only`               | Store without immediate processing                                                     |
| Cognitive Processing   | `deep-work`                  | Requires uninterrupted concentration                                                   |
| Cognitive Processing   | `requires-reflection`        | Needs analytical review                                                                |
| Cognitive Processing   | `research-later`             | Deferred investigation                                                                 |
| Cognitive Processing   | `decision-needed`            | Requires governance or strategic action                                                |
| Cognitive Processing   | `context-heavy`              | Difficult to resume without supporting context                                         |
| Cognitive Processing   | `interruptible`              | Can tolerate interruptions                                                             |
| Cognitive Processing   | `non-interruptible`          | Requires continuity of attention                                                       |
| Relationship           | `stakeholder`                | Relevant external or internal actor                                                    |
| Relationship           | `dependency`                 | Depends on another entity or process                                                   |
| Relationship           | `vendor`                     | Supplier or external service provider                                                  |
| Relationship           | `collaboration`              | Joint effort with others                                                               |
| Relationship           | `political`                  | Involves power, influence, or organizational dynamics                                  |
| Relationship           | `trust-sensitive`            | Reliability or trust implications exist                                                |
| Risk                   | `burnout-risk`               | Cognitive or emotional exhaustion risk                                                 |
| Risk                   | `financial-risk`             | Economic instability or financial exposure                                             |
| Risk                   | `coordination-risk`          | Scheduling or synchronization instability                                              |
| Risk                   | `security-risk`              | Information or infrastructure security concern                                         |
| Risk                   | `technical-debt`             | Structural engineering degradation or shortcuts                                        |
| Risk                   | `operational-fragility`      | Low resilience or stability                                                            |
| Risk                   | `single-point-of-failure`    | Dangerous dependency concentration                                                     |
| Energy & Effort        | `low-energy`                 | Minimal cognitive or physical expenditure                                              |
| Energy & Effort        | `high-energy`                | Significant expenditure required                                                       |
| Energy & Effort        | `attention-intensive`        | Requires sustained focus                                                               |
| Energy & Effort        | `administrative-overhead`    | Primarily bureaucratic or coordination work                                            |
| Energy & Effort        | `cognitively-expensive`      | Heavy mental processing required                                                       |
| Governance             | `policy-aligned`             | Consistent with declared principles                                                    |
| Governance             | `policy-conflict`            | Contradicts governance principles                                                      |
| Governance             | `audit-required`             | Requires inspection or review                                                          |
| Governance             | `traceability-required`      | Must preserve reasoning and evidence                                                   |
| Intelligence           | `emerging-pattern`           | Potential recurring structure or trend                                                 |
| Intelligence           | `opportunity`                | Possible future advantage                                                              |
| Intelligence           | `anomaly`                    | Unexpected deviation                                                                   |
| Intelligence           | `drift`                      | Gradual deviation from intended state                                                  |
| Intelligence           | `systemic-issue`             | Structural recurring problem                                                           |

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

## References

- [Self Management](https://www.notion.so/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [A Guide to Daily Log](https://www.notion.so/A-Guide-to-Daily-Log-252c0f5171ec80fcb08cc98a46769479?source=copy_link)
- [Modellum Systematis Viabilis Personalis](https://www.notion.so/Modellum-Systematis-Viabilis-Personalis-1a5d38c7497c8060851cec0681de4a8b?source=copy_link)
