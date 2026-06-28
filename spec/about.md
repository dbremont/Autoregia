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

## Viable System Model (VSM)

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

### System Map · Autoregia Systems

Autoregia decomposes self-management into a set of cooperating systems. Some are materialized as dedicated tools developed in this workspace; others are satisfied by existing tools or documents. Each maps to a level of the Viable System Model. *(This system map is rendered in [`about.html`](../about.html) and was previously on the landing page; it has been moved here as conceptual model content.)*

| **System** | **Role** | **VSM Level** |
| --- | --- | --- |
| Policy | Long-term direction, identity, principles, life-policy | **S5 – Policy** |
| Intelligence | Scan environment, synthesize, learn, anticipate | **S4 – Intelligence** |
| Documentation | External memory: explicit knowledge & decision records | **S4 – Intelligence** |
| Control | Priority-setting, scheduling, day-to-day steering | **S3 – Control** |
| Accounting | Track resource usage (time, money, energy, attention) | **S3 – Audit / Accounting** |
| Audit | Diagnostics, deviation detection, performance evaluation | **S3 – Audit** |
| Task Management | Organize action constructs (projects, tasks, routines) | **S1 – Operations** |
| Notification | Timely external triggers for commitments & events | **S2 – Coordination** |
| Coordination | Resolve conflicts, harmonize schedules, avoid overload | **S2 – Coordination** |
| Execution | Physical & cognitive tools used to perform work | **S1 – Operations** |
| Inventory | Registry of assets, capabilities, reference objects | **S3 – Control** |

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

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
