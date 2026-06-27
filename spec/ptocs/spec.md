# Personal Technical Object Catalog System

> This document establishes the conceptual foundations, data model, functionality, and implementation of a **Personal Technical Object Catalog System (PTOCS)**. A PTOCS is a technical object engineered to `externalize the agent's available technical capabilities` — maintaining a structured, persistent catalog of the software, services, hardware, references, and infrastructure the agent relies on, and enabling their discovery, retrieval, navigation, and analysis over time.

> Within the Autoregia Personal Viable System Model (PVSM), PTOCS is the **Intelligence System** (VSM System 4 – Intelligence): it scans, indexes, and reasons over what the agent *can do* and *with what*. By making capability explicit, it converts an implicit, scattered toolset into an intelligible, queryable, and steerable structure.

Fundamentally, a PTOCS exists to maintain persistent representations of the **technical objects** relevant for effective action and orientation. These include:

- **Software Objects** — applications, libraries, frameworks, command-line tools, editors, and plugins the agent runs.
- **Service & Platform Objects** — hosted APIs, SaaS platforms, cloud accounts, and subscription services the agent depends on.
- **Infrastructure Objects** — systems, servers, networks, storage, and runtime environments the agent operates within.
- **Hardware & Physical Objects** — devices, instruments, and physical tools the agent uses to perceive, compute, or act.
- **Reference & Knowledge Objects** — documentation sites, datasets, schemas, books, and reference artifacts that operationalize capability.
- **Workflow & Method Objects** — recipes, playbooks, procedures, and reusable pipelines (capability encoded as process).
- **Capability & Skill Objects** — named skills, methods, or competencies the agent has acquired and can invoke.

By preserving these objects across time, a PTOCS functions as an externalized **capability substrate**, reducing capability blindness, improving reuse, and enabling more reliable planning and adaptation.

## Formulation

> How to think about a `Personal Technical Object Catalog System`?

A `Personal Technical Object Catalog System` is a technical object with the role of externalizing **the inventory of the agent's operative means** to scaffold extended agency:

- preserve capability continuity,
- stabilize the toolset as an intelligible structure,
- reduce capability discovery cost,
- maintain coordination of dependencies across objects,
- and support consistent, well-informed strategic action.

### What Is a Technical Object? What is its nature?

#### Principle

> A technical object is any *made thing* — material, digital, or methodological — whose presence or absence changes what the agent can perceive, reason about, decide, coordinate, or do.

> PTOCS should record any technical object whose unknown, forgotten, or unattributed state would degrade the agent's ability to act effectively. The objective is not exhaustive hoarding of every artifact, but selective registration of **operationally relevant capability**.

Conversely, an object should generally not be cataloged when it is:

- Ephemeral and never reused (a throwaway script with no durable role).
- Fully internal to a single object already cataloged (a private helper of a library).
- Operationally irrelevant to current or foreseeable objectives.
- Redundant with a better-attributed entry (a duplicate alias rather than a distinct object).
- More costly to maintain than the value it provides.

#### Technical Object Kind Taxonomy

> What classes of object should the catalog recognize?

| Kind                       | Category            | Description                                                              | Example Instances                                       |
| -------------------------- | ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Software Tool**          | Software            | End-user or developer-facing application.                                | VS Code, Obsidian, Zotero, git.                         |
| **Library / Framework**    | Software            | Reusable code component integrated into other software.                  | Flask, React, numpy, SQLite.                            |
| **Service / Platform**     | Service             | Hosted offering consumed over a network (API, SaaS, platform).           | OpenAI API, GitHub, Notion, Cloudflare.                 |
| **Data Source / Dataset**  | Service             | External or internal data feed, corpus, or dataset.                      | arXiv API, a local embedding corpus, Crunchbase.        |
| **Infrastructure**         | Infrastructure      | System, server, runtime, network, or storage environment.                | NixOS server, Postgres instance, home network.          |
| **Hardware / Device**      | Physical            | Physical computing or measuring instrument.                              | Laptop, mechanical keyboard, e-reader, oscilloscope.    |
| **Physical Instrument**    | Physical            | Non-computing tool used to perceive or act in the world.                 | Standing desk, camera, lab scale.                       |
| **Reference Artifact**     | Knowledge           | Documentation, schema, standard, or reference work operationalizing capability. | OpenAPI spec, RFC 9110, a textbook, an ISO standard.    |
| **Workflow / Method**      | Method              | Encoded process, recipe, playbook, or pipeline.                         | A release pipeline, a research extraction procedure.    |
| **Capability / Skill**     | Method              | Named skill, method, or competency the agent can invoke.                 | "Prompt engineering", "statistical debugging", "LATeX". |

### What should be the structure of such **catalog entry**?

> A catalog entry is the atomic unit of the PTOCS: one technical object, its identity, description, classification, provenance, operational state, relationships, and a commentary log.

| Field                       | Description                                                                                                                  | Example                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Entry Id**                | Globally unique identifier used for traceability, referencing, synchronization, and relational linking across the catalog.  | `OBJ-2026-00042`, UUID, slug-based identifier.                                                   |
| **Name**                    | Canonical name of the technical object.                                                                                      | `Obsidian`, `OpenAI Chat Completions API`, `mechanical-keyboard`.                                |
| **Aliases**                 | Alternate names, product names, or identifiers under which the object is known.                                              | `obsidian-md`, `vault app`.                                                                      |
| **Summary**                 | One-line description of what the object *is*.                                                                                | "Local-first Markdown knowledge base."                                                           |
| **Detail**                  | Extended explanatory, analytical, or supporting information about the object.                                                | Strengths, limitations, setup notes, gotchas, diagrams.                                          |
| **Purpose**                 | The *role* the object plays in the agent's workflow (what it is *for*).                                                      | "External memory / note store."                                                                  |
| **Function**                | The concrete capability the object provides (what it *does*).                                                                | "Bidirectional-link note editing with local file storage."                                       |
| **Object Kind**             | Class of technical object (see Object Kind Taxonomy).                                                                        | `software_tool`, `service_platform`, `hardware_device`.                                          |
| **Category**                | Refined functional category within the kind.                                                                                 | `note-taking`, `llm-inference`, `version-control`.                                               |
| **Domain**                  | Subject domain the object serves.                                                                                            | `Software Engineering`, `Knowledge Management`, `Finance`.                                       |
| **Keywords**                | Controlled vocabulary of terms for search and retrieval.                                                                     | `markdown`, `pkm`, `backlinks`.                                                                  |
| **Tags**                    | Free-form user-defined labels.                                                                                               | `daily-driver`, `paid`, `experimental`.                                                          |
| **Provenance**              | Origin metadata: source URL, vendor, version, license, acquisition date.                                                     | `{source_url, vendor: "Obsidian", version: "1.7", license: "proprietary", acquired_at}`.         |
| **Operational Metadata**    | Status, priority, owner, workflow state — how the entry is managed.                                                          | `status: active`, `priority: high`, `owner: self`.                                               |
| **Lifecycle Metadata**      | Evolutionary/historical state: lifecycle state, version history.                                                             | `provisional -> active -> deprecated -> retired`.                                                |
| **Hosting / Access Model**  | How the object is delivered and reached.                                                                                     | `hosting_model: local`, `access_model: api_key`.                                                 |
| **Cost**                    | Resource cost of the object (money, dependencies, maintenance).                                                             | `{currency, amount, period}` or `{kind: "free", notes}`.                                         |
| **Usage Metadata**          | How the agent engages the object: interface, install, config, docs URL, last used.                                           | `{interface: cli, install: "brew install", config, docs_url, last_used_at}`.                     |
| **Epistemic Metadata**      | Confidence in fit, evidence level, and personal rating of the object.                                                        | `fit_confidence: high`, `evidence_level: experimental`, `rating: 4/5`.                           |
| **Strategic Metadata**      | How the object relates to long-term objectives and the VSM system it serves.                                                 | `{system_served: "System 4 - Intelligence", goal, objective, capability}`.                       |
| **Relational Metadata**     | Explicit graph relationships connecting the entry to other entries, entities, or dependencies.                               | `[(OBJ-9, depends-on), (OBJ-12, integrates-with), (OBJ-5, alternative-to)]`.                     |
| **Annotation Log**          | Append-only commentary written *about the entry* without mutating its content or detail.                                     | Reflections, migration notes, "deprecated in favor of...", cost changes. Each entry: `{id, created_at, author, kind, text, state}`. |
| **Temporal Metadata**       | Created-at, updated-at, last-used-at timestamps.                                                                             | `created_at`, `updated_at`, `last_used_at`.                                                      |

### Catalog Link

> How can the entries be linked?

| Category        | Link                 | Description                                                              |
| --------------- | -------------------- | ------------------------------------------------------------------------ |
| Structural      | `references`         | Mentions or cites another entry, entity, or artifact                     |
| Structural      | `related-to`         | General associative relationship without stronger semantics              |
| Structural      | `part-of`            | Entry belongs to a larger aggregate object                               |
| Structural      | `contains`           | Entry structurally includes subordinate objects                          |
| Structural      | `extends`            | Adds capability or continuation to another object                        |
| Structural      | `version-of`         | Represents a revision or iteration of another object                     |
| Structural      | `supersedes`         | Replaces or invalidates a previous object                                |
| Structural      | `duplicates`         | Represents substantially the same object                                 |
| Dependency      | `depends-on`         | Requires another object to function                                      |
| Dependency      | `required-by`        | Is a dependency of another object                                        |
| Dependency      | `integrates-with`    | Connects to / interoperates with another object                          |
| Dependency      | `consumes`           | Reads input or data from another object                                  |
| Dependency      | `produces`           | Generates output or data consumed by another object                      |
| Capability      | `alternative-to`     | Serves the same capability as another object (substitutable)             |
| Capability      | `complements`        | Augments another object's capability                                     |
| Capability      | `provided-by`        | Capability is supplied by another entry (host/platform)                  |
| Capability      | `enables`            | Unlocks or makes possible another entry's use                            |
| Capability      | `serves`             | Supports an objective, capability, or VSM system                         |
| Temporal        | `precedes`           | Was used before another object (predecessor in time)                     |
| Temporal        | `replaced-by`        | Was succeeded by another object                                          |
| Intelligence    | `recommends`         | Endorses another object for a use case                                   |
| Intelligence    | `root-cause-of`      | Identified as foundational source of a problem in another object         |

### Classification Metadata

> How to classify the **catalog entry**?

#### Dimension

| Classification Dimension | Purpose                                                       | Field Set                                                  |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **Identity**             | What is this object?                                          | Object Kind, Category, Domain, Keywords, Aliases          |
| **Operational**          | How is this object managed or acted upon?                     | Status, Priority, Owner, Workflow State, Pinned           |
| **Lifecycle**            | Where is this object in its life?                             | Lifecycle State, Version                                   |
| **Provenance**           | Where does this object come from?                             | Source URL, Vendor, License, Acquisition                   |
| **Delivery**             | How is the object reached and run?                            | Hosting Model, Access Model, Interface                     |
| **Cost**                 | What does this object cost to keep?                           | Cost Kind, Amount, Period, Dependencies                   |
| **Usage**                | How does the agent engage it?                                 | Interface, Install, Config, Docs, Last Used               |
| **Epistemic**            | What is the knowledge/fit status of this object?              | Fit Confidence, Evidence Level, Rating                    |
| **Strategic**            | How does this object relate to long-term objectives?          | System Served, Goal, Objective, Capability                |
| **Free**                 | What additional user-defined classifications are useful?      | Custom Tags, Labels                                        |

#### Field Set

> Which are the allowed values for every field?

| Dimension       | Field                 | Allowed Value Set                                                                                          |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Identity**    | **Object Kind**       | `software_tool`, `library_framework`, `service_platform`, `data_source`, `infrastructure`, `hardware_device`, `physical_instrument`, `reference_artifact`, `workflow_method`, `capability_skill` |
| **Identity**    | **Domain**            | Software Engineering, Knowledge Management, Data Science, Finance, Research, Writing, Productivity, Infrastructure, Communication, Health, ... |
| **Operational** | **Status**            | Provisional, Active, Trial, Backup, Deprecated, Retired                                                    |
| **Operational** | **Priority**          | Critical, High, Medium, Low                                                                                |
| **Operational** | **Workflow State**    | Candidate, Adopted, In Review, Phasing Out, Removed                                                        |
| **Operational** | **Pinned**            | `true`, `false`                                                                                            |
| **Lifecycle**   | **Lifecycle State**   | Provisional, Active, Deprecated, Retired, Superseded                                                       |
| **Delivery**    | **Hosting Model**     | `local`, `self-hosted`, `cloud`, `hybrid`, `physical`                                                      |
| **Delivery**    | **Access Model**      | `open`, `free`, `freemium`, `paid`, `subscription`, `api_key`, `oauth`, `license`, `invitation`, `offline` |
| **Usage**       | **Interface**         | `gui`, `cli`, `tui`, `api`, `library`, `web`, `hardware`, `document`, `none`                               |
| **Epistemic**   | **Fit Confidence**    | Very Low, Low, Medium, High, Very High                                                                     |
| **Epistemic**   | **Evidence Level**    | None, Anecdotal, Observational, Experimental, Established                                                  |
| **Strategic**   | **System Served**     | System 1 - Operations, System 2 - Coordination, System 3 - Control, System 3 - Audit/Accounting, System 4 - Intelligence, System 5 - Policy |
| **Strategic**   | **Capability**        | Capability identifier (e.g. `note-taking`, `version-control`, `llm-inference`)                             |
| **Cost**        | **Cost Kind**         | free, one-time, subscription, usage-based, maintenance, opportunity                                         |

## Implementation

### Functionality Set

> The PTOCS exposes two layers: a **catalog layer** (the registry and its CRUD) and a **Statistical Overlay** (analysis projected over the registry).

- **Catalog (CRUD):**
  - **Insert** — register a new technical object entry (with classification, provenance, usage, relations).
  - **Update** — revise an entry (provenance-preserving; edits are logged).
  - **Delete** — retire or remove an entry; soft-retire (`retired`) preferred over hard delete.
  - **Pin / Unpin** — toggle a boolean flag (`pinned`) that promotes an entry as a quick-access capability on the Dashboard and sorts it above the catalog.
  - **Retrieval** — read by id, name, alias, or slug; full-text and structured search.

- **Retrieval & Navigation:**
  - Search entries by name, keyword, domain, capability, or free text.
  - Browse the catalog by kind, category, domain, status, or system served.
  - Capability discovery — given a task/objective, return the objects that serve the relevant capability.
  - Retrieve entry descriptions, specifications, and usage information.
  - Navigate related and complementary objects via the relationship graph.
  - Explain how an object contributes to the agent's overall capabilities (links to objectives/system served).

- **Statistical Overlay (Analysis):**
  > Analytical/statistical projections computed over the catalog — the "analysis" mode over the registry.

  - **Coverage & Composition** — counts and share of objects by kind, domain, category, system served, and hosting model.
  - **Capability-Gap Analysis** — capabilities with zero or weak coverage; objectives lacking supporting objects.
  - **Redundancy / Overlap Detection** — clusters of `alternative-to` and `complements` links surfacing duplicative capability.
  - **Dependency Graph Analytics** — dependency depth, fan-in/fan-out, critical-path and single-points-of-failure (`depends-on` exposure).
  - **Cost Exposure** — aggregate recurring cost, cost by domain/system, paid-vs-free ratio.
  - **Lifecycle / Freshness** — distribution of lifecycle states; staleness by `last_used_at`; deprecated/retired backlog.
  - **Ecosystem Health** — orphaned entries, broken docs links, license-risk concentration, vendor concentration.
  - **Provenance & Trust** — distribution by `evidence_level` and `fit_confidence`; under-validated objects.

- **Derivative Functionality:**
  - Catalog snapshots, diffs, and export/import (JSON, CSV).
  - Entry study: relation graph visualization, capability map, dependency tree.
  - Summaries: "what did I adopt/retire this period".

- **Complementary Functionality:**
  - Auto-import from existing tool manifests (package managers, browser, subscriptions, receipts).
  - Documentation fetching & link health checks (`docs_url`).
  - LLM-assisted entry extraction and enrichment (classify, summarize, propose relations).
  - PRS integration — record adoption/retirement decisions; link catalog entries to PRS records.
  - Cost & license monitoring; renewal reminders (via notification system).

### Technical Element Set

| Layer             | Recommendation                                  |
| ----------------- | ----------------------------------------------- |
| Storage           | JSON + SQLite                                   |
| API               | Simple Python Flask                             |
| UI                | CSS, JS, HTML (can use libraries, not frameworks) |
| Analysis / Charts | Apache ECharts (within the design system)       |

#### AI Integration

> AI mechanisms are not standalone features; they are integrated capabilities that augment cataloging workflows through suggestions, automation, assistance, and AI-first workflows where appropriate (entry extraction, classification, relation proposal, capability inference).

#### UI / UX Guiding Principle

> The interface follows the **Autoregia UI specification** ([`../ui.spec`](../ui.spec)): visually calm, consistent, and minimal, with an elegant, timeless, Oxford-inspired aesthetic. Every surface must converge on the shared design tokens, typography, component grammar, and interaction model defined there. This document does not re-specify the UI layer; `ui.spec` is normative.

## Evaluation

> How to evaluate a Personal Technical Object Catalog System?

| Criterion               | Indicator                        | Description                                                                              |
| ----------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| Coverage                | Capability Coverage              | Share of relevant capabilities backed by at least one cataloged object                   |
| Discoverability         | Retrieval Latency                | Time to locate the right object for a given task or objective                            |
| Accuracy                | Attribute Validity               | Correctness and freshness of provenance, status, version, and relations                  |
| Freshness               | Lifecycle Hygiene                | Proportion of entries with current status and recent `last_used_at`                      |
| Strategic Alignment     | Objective Backing                | Share of active objectives supported by cataloged objects                                |
| Reuse                   | Redundancy Resolution            | Effective consolidation of `alternative-to` clusters into a primary object               |
| Risk Visibility         | Dependency / Vendor Exposure     | Detectable concentration of dependencies or vendors                                      |
| Strategic Value         | Adaptation Contribution          | Contribution to higher-quality capability and investment decisions                        |
| Strategic Value         | Viability Contribution           | Overall contribution to sustainable personal system functionality                        |

## References

- [csiglab/Index](https://github.com/csiglab/Index) — the originating "Tool Index" concept and reference spec.
- [Autoregia](../../README.md) — workspace overview & VSM mapping.
- [PRS — spec](../prs/spec.md) / [schema](../prs/schema.json) — sibling recording system; shared metadata conventions.
- [Autoregia UI Specification](../ui.spec) — canonical, project-wide UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
