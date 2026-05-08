# Personal Recording System

> The `Personal Recording System` is a mechanism to store both (retrospective = past state),  present state,  (prospective = future state), meta records information.

## Formulation

> What are the things that I should be able to record?


What should be the structure of such record?

- Record Id
- Record Date
- Record Tags
- Record Detail

NVIM : 

- Allow the extention of each record with a node link to the id.
- ...

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

## References

- [Modellum Systematis Viabilis Personalis](https://www.notion.so/Modellum-Systematis-Viabilis-Personalis-1a5d38c7497c8060851cec0681de4a8b?source=copy_link)
