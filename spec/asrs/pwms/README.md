# Personal World Model System (PWMS)

> PWMS is the **Personal World Model System** — an Autoregia sub-project that maintains the agent's explicit **model of the external world**: a typed ontology of the entities, relationships, event types, and domains that constitute the environment the agent perceives and acts upon.

> The recording and cataloging systems — [PRS](../../prs/) (records) and [PTOCS](../../ptocs/) (technical objects) — *assume* a world model. They record *instances* of something, where the "something" is left implicit. PWMS makes that implicit model **explicit**: it is the structural substrate those systems are instances of.

> Where the **Situation Model** is a *current state estimate* (an instance, "how the world is right now"), the **World Model** is the *schema* (the types and relations that make a state estimate possible). PWMS is therefore more basic than PRS/PTOCS — it sits beneath them — and it is **generative**: from its entity and event types it can derive recording templates and emit records into the PRS automatically.

> This sub-project is currently a **specification skeleton**. Conceptual foundations are established here; the data model ([`spec.md`](spec.md)) and implementation are planned.

## Formulation

> How to think about a `Personal World Model System`?

A `Personal World Model System` is a technical object with the role of externalizing the agent's **ontology of the external world** to scaffold extended agency:

- make the implicit model of the world explicit, shared, and inspectable,
- provide the types and relations against which perception is recorded and objects are cataloged,
- define what *kinds* of things can exist and happen in the agent's world (so recording is never untyped),
- and enable that model to **generate** recordings — turning structure into captured state.

### The World Model — what it is

The world model is a **declarative, typed structure**: it says nothing about *what is* the case right now (that is the Situation Model's job) — it says what *can be* the case. It is the a priori scaffolding that turns raw perception into typed, retrievable state.

PWMS externalizes this scaffolding so it is no longer buried inside the conventions of a note app or a task tool. Making it explicit is what allows the model to be reviewed, revised, shared across systems, and used to generate recordings.

### Atomic Units

The world model is composed of typed elements:

| Element | Role |
| --- | --- |
| **Entity Type** | A kind of thing in the world — Person, Place, Project, Organization, Tool, Resource, Obligation, Document, … |
| **Relation Type** | A kind of link between entity types — `depends-on`, `part-of`, `located-at`, `owns`, `triggers`, `integrates-with`, … |
| **Event Type** | A kind of occurrence that can befall an entity — drawn from the control-loop event taxonomy: *occurrence*, *outcome*, *trigger*, *observational* (see [`about.md`](../../about.md) §Q&A). |
| **Domain / Facet** | A coherent slice of the world — work, health, finance, relationships, environment — used to scope and organize the model. |

A record in the PRS is an *instance* of an Entity Type or Event Type; an entry in PTOCS is an *instance* of a technical-object Entity Type. The world model is what makes those instances typed and inter-linkable.

### Generative function

Because the model is typed and declarative, it can **generate recordings** rather than only describe them:

- derive a **recording template** per Entity Type / Event Type (what facets to capture),
- emit **expected or triggered records** into the [PRS](../../prs/) (e.g., a recurring obligation's Event Type yields its periodic records),
- and propose **new entity/relation types** when observed records do not fit the current model (a feedback path into [PRAS](../../pras/)).

## Relation to Autoregia

- **Parent:** [Autoregia](../../../README.md) — a Personal Viable System Model (PVSM).
- **Parent system:** [Agent State](../../about.md#agent-state) — S5 – Policy, the integrated self-regulation system; PWMS is a sub-system providing the external world ontology.
- **Role:** foundational **model substrate** of the external world — the structure against which the *World (External)* half of the agent is perceived, recorded, and reasoned about.
- **Loop stage:** underpins **Perception** (it defines what is perceivable and recordable) and the **Situation Model** (which instantiates the world model as a current state estimate).
- **VSM level:** **System 4 – Intelligence** (the model of the environment that enables scanning, synthesis, and anticipation); consumed cross-cuttingly by S3 Control and S1 Operations.
- **Foundational for (what assumes PWMS):** [PRS](../../prs/) (records are typed instances), [PTOCS](../../ptocs/) (objects are entity instances), [PKTS](../../pkts/) (keywords index the model's domains).
- **Adapted by (what revises PWMS):** [PRAS](../../pras/) (feedback that revises the world model when records and model diverge).
- **Counterpart:** [PSMS](../psms/) — the model of the *self / internal* world. Together PWMS + PSMS realize the agent's `World = (External, Internal)`.

## Scope

PWMS addresses the **explicit-world-model** dimension of self-management:

- Maintain a typed ontology of the external world: entity types, relation types, event types, domains.
- Classify and relate the kinds of things the agent deals with, independently of any particular tool.
- Expose the model as the shared schema that PRS records and PTOCS entries instantiate.
- Generate recording templates and automatic/emitted records from the model's types.
- Detect when observed state does not fit the model and propose model revisions (handed to PRAS).
- Stay at the *structural/ontological* level — current state lives in the Situation Model; individual records live in the PRS.

## Planned Structure

```
pwms/
├── README.md     # this document (about)
├── spec.md       # conceptual foundations, data model, generative function
└── schema.json   # (planned) JSON Schema for world-model elements
```

```
pwms/             # (planned) implementation
├── server.py
├── static/       # UI (HTML/CSS/JS per ../ui.spec)
└── data/         # model store (JSON + SQLite)
```

## References

- [`about.md`](../../about.md) — the Autoregia model: agent, control loop, VSM, PVSM, and the Q&A on how the external world is conceptualized.
- [Personal Recording System (PRS)](../../prs/) — records instances of world-model types.
- [Personal Technical Object Catalog System (PTOCS)](../../ptocs/) — catalog of technical objects (entity instances).
- [Personal Self Model System (PSMS)](../psms/) — the counterpart model of the internal/self world.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Autoregia UI Specification](../../ui.spec)
