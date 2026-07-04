# Personal Self Model System (PSMS)

> PSMS is the **Personal Self Model System** — an Autoregia sub-project that maintains the agent's explicit **model of itself**: a typed model of the identity, capabilities, resources, beliefs, commitments, and constraints that constitute the agent's internal world.

> The systems that act on the self — [PPS](../pps/README.md) (policy/identity), the Inventory / [PTOCS](../../ptocs/) (capabilities & resources), and the *Internal Cognitive State* class of the [PRS](../../prs/) — each assume a model of the agent but keep it fragmented and implicit. PSMS makes that model **explicit and unified**: it is the structural substrate of the self.

> PSMS is the counterpart to [PWMS](../pwms/): where PWMS models the **external world**, PSMS models the **internal / self world**. Together they realize the agent's `World = (External, Internal)` ([`about.md`](../../about.md)). Like PWMS, PSMS is **generative**: from its self-model types it can derive introspection prompts and emit self-records into the PRS automatically.

> This sub-project is currently a **specification skeleton**. Conceptual foundations are established here; the data model ([`spec.md`](spec.md)) and implementation are planned.

## Formulation

> How to think about a `Personal Self Model System`?

A `Personal Self Model System` is a technical object with the role of externalizing the agent's **model of itself** to scaffold extended agency:

- make the implicit self model explicit, unified, and inspectable,
- provide the types against which internal state is recorded and capabilities/resources are accounted,
- stabilize identity ("what persists through time") as a revisable structure rather than an unexamined assumption,
- and enable that model to **generate** self-records — turning self-knowledge into captured, calibratable state.

### The Self Model — what it is

The self model is a **declarative, typed structure**: it says nothing about *how the agent is right now* (that is the internal half of the Situation Model) — it says what the agent *is*: its enduring identity, its capabilities, its finite resources, its held beliefs, its standing commitments, and its constraints. It is the a priori scaffolding that turns raw introspection into typed, retrievable self-state.

### Atomic Units

The self model is composed of typed facets:

| Element | Role |
| --- | --- |
| **Identity** | What persists through time — charter, values, narrative, the boundary of the self. Links to [PPS](../pps/README.md). |
| **Capability** | What the agent can do — skills, proficiencies, tool fluencies. Links to [PTOCS](../../ptocs/) / the Inventory. |
| **Resource** | Finite reserves and their model — time, energy, attention, money — including capacity and replenishment. Links to [PKTS](../../pkts/) / Accounting. |
| **Belief / Mental Model** | Held models of how things work — about the world and about the self. |
| **Commitment** | Standing intentions and obligations the agent has taken on. |
| **Constraint** | Limits, principles, and boundaries the agent holds (what it will/will not do). Links to [PPS](../pps/README.md). |

A PRS record of an intention, a PTOCS capability entry, or a PPS principle is an *instance* of one of these facets. PSMS is what makes them a single, coherent self model.

### Generative function

Because the model is typed and declarative, it can **generate self-records** rather than only describe them:

- derive **introspection prompts** per facet (what to check about each resource, capability, commitment),
- emit **periodic self-records** into the [PRS](../../prs/) (e.g., a Resource's check-in cadence yields its recurring records),
- provide **calibration targets** for [PRAS](../../pras/) (the self model is the standard against which actual self-state is compared to detect deviation),
- and propose **self-model revisions** when observed self-state diverges from the model.

## Relation to Autoregia

- **Parent:** [Autoregia](../../../README.md) — a Personal Viable System Model (PVSM).
- **Role:** foundational **model substrate** of the self — the structure against which the *World (Internal)* half of the agent is perceived, recorded, and regulated.
- **Loop stage:** underpins the **Situation Model** (the self half of the state estimate) and the **Regulation / Learning** arc (the self model is precisely what gets corrected and refined).
- **VSM level:** **System 5 – Policy** (identity, values, cohesion — "preserve the agent"), with facets feeding **S3 Control** (resources/capabilities) and **S4 Intelligence** (self-beliefs/anticipation).
- **Foundational for (what assumes PSMS):** [PPS](../pps/README.md) (identity/policy), the Inventory / [PTOCS](../../ptocs/) (capabilities & resources), and the *Internal Cognitive State* class of [PRS](../../prs/).
- **Adapted by (what revises PSMS):** [PRAS](../../pras/) (feedback that revises the self model when intention and outcome diverge).
- **Counterpart:** [PWMS](../pwms/) — the model of the *external* world. Together PWMS + PSMS realize the agent's `World = (External, Internal)`.

### Canonical Distinction from PPS

PSMS and [PPS](../pps/README.md) both map to **System 5 – Policy** and both touch identity, commitments, and constraints. Their roles are complementary but distinct:

| Dimension | PPS (Policy System) | PSMS (Self Model System) |
| --- | --- | --- |
| **Logical type** | **Regulatory / Normative** — sets direction, issues rules, resolves value conflicts | **Structural / Descriptive** — holds the typed ontology of the self |
| **What it does** | Charter values, rank priorities, reconcile conflicting commitments, issue policy decisions | Maintain the self model schema + data; expose identity, capability, resource, belief, commitment, and constraint facets |
| **What it answers** | "What should the agent do? What does it stand for? Which rules take priority?" | "What is the agent? What does it have? What does it believe? What has it committed to?" |
| **Direction** | **Top-down** — prescribes what the agent *ought* to be | **Bottom-up** — records what the agent *actually* is, has, and holds |
| **Reads from PSMS** | PPS checks the self model for consistency before issuing new policy | — |
| **Writes to PSMS** | PPS records charters, value rankings, policy decisions, and commitments as instances of PSMS facets | — |
| **Primacy** | PPS is the **authoritative decision-maker** at S5; PSMS is the **canonical store** that makes those decisions inspectable and consistent | — |

In short: **PPS is the agent's policy apparatus** — the active system that does the work of setting direction. **PSMS is the self model substrate** — the schema + registry that PPS operates on. PPS without PSMS would set policy without a coherent model of whom it governs; PSMS without PPS would be a static registry with no way to resolve conflicts or issue new direction.

## Scope

PSMS addresses the **explicit-self-model** dimension of self-management:

- Maintain a typed model of the self: identity, capabilities, resources, beliefs, commitments, constraints.
- Unify the fragmented self assumptions currently spread across PPS, the Inventory, and PRS's Internal Cognitive State.
- Expose the model as the shared schema against which internal state is recorded and capabilities/resources accounted.
- Generate introspection prompts and automatic/emitted self-records from the model's facets.
- Serve as the calibration standard for deviation detection (the self model vs. actual self-state → PRAS).
- Stay at the *structural/ontological* level — current internal state lives in the Situation Model; individual self-records live in the PRS.

## Planned Structure

```
psms/
├── README.md     # this document (about)
├── spec.md       # conceptual foundations, data model, generative function
└── schema.json   # (planned) JSON Schema for self-model facets
```

```
psms/             # (planned) implementation
├── server.py
├── static/       # UI (HTML/CSS/JS per ../ui.spec)
└── data/         # model store (JSON + SQLite)
```

## References

- [`about.md`](../../about.md) — the Autoregia model: agent, control loop, VSM, PVSM, and the Q&A on how the internal environment is conceptualized.
- [Personal Policy System (PPS)](../pps/README.md) — identity, values, and policy (Identity & Constraint facets).
- [Personal Technical Object Catalog System (PTOCS)](../../ptocs/) — capabilities & resources (Capability facet).
- [Personal Recording System (PRS)](../../prs/) — records of internal cognitive state.
- [Personal World Model System (PWMS)](../pwms/) — the counterpart model of the external world.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Autoregia UI Specification](../../ui.spec)
