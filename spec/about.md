# Autoregia Model Explanation

> What underlies the Autoregia model? This document is the conceptual basis for [`about.html`](../about.html) — the canonical home of the Autoregia model: the agent, the agent control loop, the Viable System Model (VSM) and the Autoregia system map, and the Personal Viable System Model (PVSM).
>
> The diagrams in `about.html` are **interactive**: every stage is clickable and opens a detail panel. Node labels use **abstract** cybernetic terms only; the **concrete** personal-system mapping is revealed on click. The ASCII diagrams below mirror that same closed-loop topology; the mapping tables are the authoritative reference for the specifics.

## Agent

> An agent is a system that maintains its continued existence and pursues objectives through regulated interaction with an environment.

> An agent is a system that deliberately transforms states of itself and its environment by selecting and executing actions according to internal objectives while regulating those actions using feedback.

| Component      | Role                                     |
| -------------- | ---------------------------------------- |
| Identity       | what persists through time               |
| Objectives     | desired future states                    |
| World          |(Internal, External)                      |
| Internal State | beliefs, memory, resources, capabilities |
| Perception     | acquisition of information               |
| Decision       | selection among alternatives             |
| Action         | modification of world or self            |
| Feedback       | observation of consequences              |
| Regulation     | correction of deviations                 |
| Learning       | modification of internal models          |

### What functional problems must every agent solve?

| Functional Problem   | Description                       |
| -------------------- | --------------------------------- |
| Identity Maintenance | preserve the agent                |
| Situation Assessment | understand environment            |
| Goal Formation       | determine desired future          |
| Planning             | generate possible actions         |
| Resource Allocation  | distribute limited resources      |
| Coordination         | synchronize concurrent activities |
| Execution            | perform actions                   |
| Monitoring           | observe progress                  |
| Regulation           | compensate disturbances           |
| Learning             | improve future behavior           |

### Foundational Model Substrates

The agent maintains two foundational model substrates — typed, declarative ontologies — that structure its perception, situation-assessment, and self-regulation. Both are sub-systems of the **Agent State** system and are **generative**: from their types they can derive recording templates and emit records into the PRS automatically.

- **World Model** — the typed ontology of the external environment: entity types, relation types, event types, and domains. Makes explicit the structure that Perception reads and the Situation Model instantiates. Materialized as the [Personal World Model System (PWMS)](asrs/pwms/README.md), a sub-system of Agent State.
- **Self Model** — the typed model of the self: identity, capabilities, resources, beliefs, commitments, constraints. Makes explicit the structure of the internal world against which internal state is recorded and regulated. Materialized as the [Personal Self Model System (PSMS)](asrs/psms/README.md), a sub-system of Agent State along with the [Personal Policy System (PPS)](../pps/) that writes to it.

### Agent Control Loop Model

The agent control loop is an **outer loop** that closes the world on itself through the agent. It contains an inner **Deliberative Cycle** — the sense→decide arc that turns raw information into a committed action — followed by an **Execution** arc that carries the action out and a **Feedback** path that re-enters the cycle.

> The **Deliberative Cycle** is the sub-loop spanning Perception → Situation Model → Decision → Action Selection: it observes the world, builds a state estimate, evaluates alternatives, and commits to an action. It does *not* act; it produces a *selected* action that the outer loop then executes.

#### Stages

| Stage           | Loop          | Role                                                       |
| --------------- | ------------- | ---------------------------------------------------------- |
| Perception      | Deliberative  | acquire information from the internal and external world  |
| Situation Model | Deliberative  | integrate perception into a current state estimate        |
| Decision        | Deliberative  | evaluate and choose among alternative courses of action   |
| Action Selection| Deliberative  | commit to a specific action or plan to carry out          |
| Execution       | Outer         | carry out the selected action in the world or self        |
| Feedback        | Outer         | observe consequences and regulate the Deliberative Cycle  |

#### Diagram

The control loop is a closed loop with a single **World** node. The **Deliberative Cycle** (the dashed inner sub-loop) observes the world, commits to an action, and the **Feedback** path observes the consequences and regulates the cycle.

```txt
  World ──perceive──▶ ┌──── Deliberative Cycle ──────────────────────┐
(Environment ·        │  Perception ─▶ Situation ─▶ Decision ─▶ Action │
 Internal)            │                 Model              Selection   │
     ▲                └─────────────────────────────────────┬──────────┘
     │                                              commit │
     │                                                    ▼
     │                                               Execution
     │                                                    │
     └────────────────── act · modify world ──────────────┘
                          │
                          │ observe
                          ▼
                      Feedback ── regulate ──▶ (into the Deliberative Cycle)
```

## Personal Viable System Model (PVSM)

### Agent Control Loop

The PVSM instantiates the agent control loop with concrete personal systems. The **Deliberative Cycle** is supplied by the recording, reflection, and planning instruments; the **Execution** arc is supplied by production tools; and **Feedback** closes the loop through reflection.

#### Stages (PVSM mapping)

| Stage           | Loop          | PVSM Component                                       |
| --------------- | ------------- | ---------------------------------------------------- |
| Perception      | Deliberative  | Personal Recording System (PRS), Audit Process       |
| Situation Model | Deliberative  | Reflection, Documentation                            |
| Decision        | Deliberative  | Task Registry Mechanism, Reflection                  |
| Action Selection| Deliberative  | Calendar, Time Tracker                               |
| Execution       | Outer         | Production                                           |
| Feedback        | Outer         | Reflection (Intelligence Layer)                      |

#### Foundational Substrates

Two foundational model substrates underpin the control loop, making Perception and Situation Model possible. They are sub-systems of the **Agent State** system — the structural/ontological layer that Perception reads and the Situation Model instantiates as a current state estimate:

- **Personal World Model System (PWMS)** — the typed ontology of the external world (entity types, event types, relations, domains). A sub-system of Agent State. The PRS records *instances* of its types; the Situation Model is a *current-state instance* of its structure. Generative: PWMS can derive recording templates and emit expected/triggered records into the PRS.
- **Personal Self Model System (PSMS)** — the typed model of the self (identity, capability, resource, belief, commitment, constraint). A sub-system of Agent State. Provides the structural facets against which internal state is recorded and regulated. Generative: PSMS can derive introspection prompts and emit self-records into the PRS.
- **Personal Policy System (PPS)** — the regulatory apparatus at S5: direction, identity, principles, life-policy. A sub-system of Agent State that writes its decisions into PSMS as identity/constraint/commitment facets of the self model.

All three are specified as specification skeletons in [`spec/pwms/`](asrs/pwms/), [`spec/psms/`](asrs/psms/), and [`spec/pps/`](../pps/).

#### Diagram

The PVSM diagram shares the *same* closed-loop topology as the agent control loop. In `about.html` the node labels are **abstract** (identical to the control-loop diagram); clicking a stage reveals which **concrete** personal system instantiates it (see the mapping table above).

```txt
  World ──perceive──▶ ┌──── Deliberative Cycle ──────────────────────┐
(Environment ·        │  Perception ─▶ Situation ─▶ Decision ─▶ Action │
 Internal)            │                 Model              Selection   │
     ▲                └─────────────────────────────────────┬──────────┘
     │                                              commit │
     │                                                    ▼
     │                                               Execution
     │                                                    │
     └────────────────── act · modify world ──────────────┘
                          │
                          │ observe
                          ▼
                      Feedback ── regulate ──▶ (into the Deliberative Cycle)
```

## Q&A

**Q. How should the external environment (the world) be conceptualized? As a sequence of events? What types of events constitute such a sequence?**

A. Model the world as a bounded region of state — entities, resources, and other agents — perceived through a time-ordered stream of discrete events. Events are the deltas; the *Situation Model* integrates them into a snapshot of current state. Four types constitute the stream: *occurrence* events (independent happenings — a message arrives, a deadline passes), *outcome* events (consequences of your own actions, i.e. the feedback signal), *trigger* events (time- or condition-based, e.g. alarms and scheduled commitments), and *observational* events (readings you actively take). So not the world as a bare sequence, but a state-bearing region perceived as a sequence of events.

**Q. How should the agent's internal environment be conceptualized?**

A. As the agent's own stateful substrate — the part of the world it regulates directly and observes with low latency. It holds memory (declarative, episodic, procedural), finite resources (time, energy, attention, money), beliefs and models, current commitments, and capabilities. In cybernetic terms these are the system's essential variables: the deliberative cycle reads them into the Situation Model, and the regulation layer corrects deviations (fatigue, overload, drift). It is bounded, depletable, and renewable — the reservoir the whole loop manages.

**Q. How should tasks be conceptualized?**

A. A task is a bounded specification of work that represents an intended intervention by an agent to achieve, maintain, restore, investigate, create, or prevent a particular state of affairs. It is the fundamental operational unit of execution, defining what work is to be performed, under what conditions, and according to what constraints. Within the agent control loop, a task is materialized through Decision and Action Selection as the operational commitment to execution.

Every task originates from an underlying source—such as a goal, obligation, recurrent obligation, problem, opportunity, policy, plan, external request, or environmental event—that justifies its existence.

**Q. How should recurrent tasks be conceptualized?**

A. A recurrent task is not a single task but a task generator: a template paired with a recurrence rule (interval, schedule, or trigger condition) that emits a discrete task instance each time the rule fires. Each emitted instance has its own lifecycle and completion, while the rule persists until terminated. Recurrence encodes routine and pre-commits repeated decisions, lowering deliberative load — it belongs jointly to System 1 (the instances) and System 2 coordination (the rhythm).

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)

## Appendix A · Viable System Model (VSM)

> A Viable System Model (VSM) is a formal cybernetic model of the organizational structure required for an autonomous system to remain viable in a changing environment. It specifies the minimum set of interacting subsystems necessary to regulate operations, coordinate activities, adapt to environmental change, and preserve the identity and continuity of the system over time.

Where the **agent control loop** describes the *temporal* arc of agency — sense, decide, act, regulate — the Viable System Model describes its *structural* complement: the minimum set of interacting subsystems any viable system must implement to keep that loop running. Autoregia uses the VSM as its reference architecture, mapping every personal system to one of these functions.

### The Five Systems

| **System** | **Name** | **Function** |
| --- | --- | --- |
| **System 1** | **Operational Units** | The primary units that perform the agent's basic operations. Each unit is semi-autonomous and responsible for delivering specific outputs or services. |
| **System 2** | **Coordination** | Ensures the harmonious operation of System 1 units by providing coordination and conflict resolution. Manages the interactions and synergies between operational units. |
| **System 3** | **Control** | Provides resource allocation, monitoring, and control over the operational units; ensures the system is functioning efficiently and effectively. |
| **System 3*** | **Audit** | A subset of System 3 focused on monitoring and auditing the operational units to ensure compliance and performance standards. |
| **System 4** | **Intelligence** | Focuses on the external environment and future planning; adapts the system to environmental change, drives innovation and strategic development. |
| **System 5** | **Policy** | Sets the system's overall goals, values, and direction; balances internal and external focus and maintains identity and cohesion. |
