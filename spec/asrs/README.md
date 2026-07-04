# Agent Self Representation System (ASRS)

> ASRS is the **Agent Self Representation System** — the Autoregia umbrella system that holds the agent's **representation of itself in the world**. It is the integrated representational substrate composed of four parts: the **World** (the `(External, Internal)` boundary the agent operates within), the **Model** (the typed ontology of the external world — [PWMS](pwms/)), the **Self Model** (the typed model of the agent — [PSMS](psms/)), and the **Policy System** (the normative layer that directs the self — [PPS](pps/)).

> The three sub-systems — [PWMS](pwms/), [PSMS](psms/), and [PPS](pps/) — each maintain a part of the agent's self-representation: the world model, the self model, and the policy that governs both. But each, alone, is a fragment. ASRS is the **integration layer** that binds them into one coherent structure: the agent's unified answer to *"what is the world I am in, what am I, and what should I be?"*

> Where the **Situation Model** is a *current state estimate* (an instance — how the world and self are *right now*), ASRS is the *declarative schema* (the types, relations, values, and constraints that make a state estimate possible) plus the *normative direction* that tells the agent how to act on it. It is the agent's standing representation of itself — the structural and regulatory memory the whole control loop reads from and writes back to.

> This document is a **specification skeleton** at the integration level. The parts are specified in their own sub-projects ([PWMS](pwms/), [PSMS](psms/), [PPS](pps/)); ASRS specifies how they compose into a single self-representation.

## Formulation

> How to think about an `Agent Self Representation System`?

An `Agent Self Representation System` is a technical object with the role of externalizing the agent's **integrated self-representation** to scaffold extended agency:

- make the agent's model of the world, model of itself, and governing policy explicit, unified, and mutually consistent,
- provide the single representational substrate against which perception is interpreted, decisions are evaluated, and behaviour is regulated,
- resolve the boundary between *what the agent is in* (the World) and *what the agent is* (the Self), and place the normative layer (Policy) that says *what the agent should be* on top of both,
- and keep that representation **inspectable and revisable** so the agent can learn — the feedback arc ([PRAS](../pras/)) revises ASRS when intention and outcome diverge.

### The Self Representation — what it is

The self representation is a **declarative, typed, and normative structure**. It says nothing about *what the agent is doing right now* (that is the Situation Model's job, supplied by Control) — it says *what can be the case* (the World Model), *what the agent is* (the Self Model), and *what the agent should do and be* (the Policy System). It is the a priori scaffolding that turns raw perception into typed, retrievable state and turns self-knowledge into self-direction.

ASRS externalizes this scaffolding so it is no longer fragmented across tools and assumptions. Making it explicit is what allows the representation to be reviewed, reconciled, shared across systems, and used to generate recordings and direction.

### The Four Parts

ASRS is the composition of four parts, organized from the most basic (the boundary) inward to the most prescriptive (the direction):

| Part | Role | Materialized as |
| --- | --- | --- |
| **World** | The `(External, Internal)` boundary the agent operates within. The totality of what the agent represents: the environment it perceives and acts on, plus its own internal substrate. Not a separate store — the *scope* that the Model and Self Model partition. | — (conceptual; see [`about.md`](../about.md)) |
| **Model** | The typed ontology of the **external** world: entity types, relation types, event types, domains. What *can be* the case out there. Generative: derives recording templates and emits records into the [PRS](../prs/). | [PWMS](pwms/) |
| **Self Model** | The typed model of the **internal / self** world: identity, capabilities, resources, beliefs, commitments, constraints. What the agent *is, has, and holds*. Generative: derives introspection prompts and emits self-records. | [PSMS](psms/) |
| **Policy System** | The **normative / regulatory** layer: charter, values, principles, commitments, domain policies. What the agent *ought to do and be*. Writes its decisions into the Self Model as identity / constraint / commitment facets. | [PPS](pps/) |

The **Model** and **Self Model** are the *descriptive* halves of the World (`World = (External, Internal)`); the **Policy System** is the *prescriptive* layer on top. Together they realize the agent's self representation.

### Composition — how the parts fit

```txt
                   Agent Self Representation System (ASRS)
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   Policy System (PPS)          ← normative: what to do / be     │
  │        │ writes charter · values · principles · commitments     │
  │        ▼                                                        │
  │   ┌───────────────────── World = (External, Internal) ─────────┐│
  │   │                                                            ││
  │   │   Model (PWMS)              Self Model (PSMS)              ││
  │   │   external-world ontology   internal-self ontology         ││
  │   │   entity · relation ·       identity · capability ·        ││
  │   │   event · domain types      resource · belief ·            ││
  │   │                             commitment · constraint facets  ││
  │   └────────────────────────────────────────────────────────────┘│
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
            ▲                                  │
   revised by PRAS (feedback)         read by Perception · Situation
                                      Model · Decision · Regulation
```

- **PPS → PSMS:** policy decisions are written into the self model as structured facets (charter → Identity; values/principles → Constraint; commitments → Commitment).
- **PWMS + PSMS = World:** the external and internal ontologies partition the agent's `World`; together they are the schema the Situation Model instantiates.
- **ASRS is read cross-cuttingly:** Perception reads it (what is perceivable), the Situation Model instantiates it (current state), Decision checks against it (consistency), and Regulation/Learning revise it (via [PRAS](../pras/)).

### Generative function

Because the whole representation is typed and declarative, ASRS can **generate** rather than only describe:

- derive **recording templates** (from World Model types) and **introspection prompts** (from Self Model facets),
- emit **expected / triggered / periodic records** into the [PRS](../prs/),
- provide **calibration targets** for deviation detection ([PRAS](../pras/)) — the self representation is the standard against which actual state is compared,
- and run a **consistency check** — does a given plan, intention, or observed behaviour violate any standing policy, exceed any modelled resource, or contradict the modelled self?

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md) — a Personal Viable System Model (PVSM).
- **Parent system:** [Agent State](../about.md#system-map--autoregia-systems) (S5 – Policy) — ASRS is the **representational layer** of Agent State: the unified model-of-self-in-the-world that Agent State applies to steer day-to-day.
- **Role:** **foundational representation substrate** of the agent — the structure and direction against which the control loop perceives, decides, acts, and learns.
- **Loop stage:** underpins **Perception** (defines what is perceivable), the **Situation Model** (instantiates it as current state), **Decision** (checks plans against it), and the **Regulation / Learning** arc (the representation is what gets corrected and refined).
- **VSM level:** **System 5 – Policy** (identity, values, cohesion — "preserve the agent"), with the World Model facets feeding **S4 Intelligence** (environment scanning/anticipation) and the Self Model facets feeding **S3 Control** (resources/capabilities).
- **Composed of:** the **World** boundary, the **Model** ([PWMS](pwms/)), the **Self Model** ([PSMS](psms/)), and the **Policy System** ([PPS](pps/)).
- **Read by:** [PRS](../prs/) (records are typed instances of ASRS types), [PTOCS](../ptocs/) (catalog entries instantiate entity types), [PWOS](../pwos/) (operations are planned against the modelled self and world), Control (priority-setting and scheduling), Decision (consistency checks).
- **Adapted by (what revises ASRS):** [PRAS](../pras/) — the feedback arc that revises the world model, self model, and policy when intention and outcome diverge.

### Canonical distinction from its parts

ASRS is **not a fourth sibling** beside PWMS, PSMS, and PPS — it is the **whole they compose**. The distinction is one of level, not of function:

| Dimension | ASRS (the integration) | PWMS / PSMS / PPS (the parts) |
| --- | --- | --- |
| **Logical type** | **Integrative** — binds world model + self model + policy into one self-representation | **Constituent** — each maintains one facet of the representation |
| **What it answers** | "What is the agent's integrated representation of itself in the world?" | "What can be the case?" / "What is the agent?" / "What should it do?" |
| **Scope** | The `World = (External, Internal)` boundary + the normative layer over it | The external ontology / the internal ontology / the policy apparatus |
| **Without it** | The parts exist but cannot be reconciled — no consistency check, no shared boundary, no unified self | The integration has nothing to integrate |

In short: **PWMS, PSMS, and PPS are the organs; ASRS is the organism-level representation they constitute.** A policy without a self model would govern nobody; a self model without a world model would describe an agent with no environment; the three without integration would be three fragments with no shared boundary. ASRS is what makes them one coherent, inspectable self-representation.

## Scope

ASRS addresses the **integrated self-representation** dimension of self-management:

- Define and hold the `World = (External, Internal)` boundary that the Model and Self Model partition.
- Unify the world model ([PWMS](pwms/)), self model ([PSMS](psms/)), and policy ([PPS](pps/)) into a single, mutually consistent representation.
- Provide the cross-cutting consistency check: do plans, intentions, and behaviour remain consistent with the modelled self, the modelled world, and stated policy?
- Expose the unified representation as the shared schema read by Perception, the Situation Model, Decision, and Regulation.
- Stay at the *structural / ontological / normative* level — current state lives in the Situation Model; individual records live in the [PRS](../prs/); day-to-day steering is Agent State's job.

## Planned Structure

```
asrs/
├── README.md     # this document (about)
└── spec.md       # (planned) integration model: boundary, composition, consistency check, generative function
```

## References

- [`about.md`](../about.md) — the Autoregia model: agent, control loop, `World = (External, Internal)`, VSM, PVSM, and the Agent State system map.
- [Personal World Model System (PWMS)](pwms/) — the Model (external-world ontology).
- [Personal Self Model System (PSMS)](psms/) — the Self Model (internal/self ontology).
- [Personal Policy System (PPS)](pps/) — the Policy System (normative layer).
- [Personal Recording System (PRS)](../prs/) — records instances of ASRS types.
- [Personal Reflection & Adaptation System (PRAS)](../pras/) — revises ASRS via feedback.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Autoregia UI Specification](../ui.spec)
