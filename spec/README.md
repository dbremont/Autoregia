# Autoregia Specification

> **What underlies the Personal Viable System Model (PVSM)?**

> **Where this is rendered.** [`index.html`](../index.html) is the project landing page — it explains the project (premise → methodology → reference architecture) and indexes the sub-systems. [`about.html`](../about.html) is the canonical home of the Autoregia model: the agent, the agent control loop, the Viable System Model (VSM) and the **Autoregia system map** (the Policy / Intelligence / Control / Accounting / … → VSM mapping), and the Personal Viable System Model (PVSM). The conceptual basis for `about.html` is [`about.md`](about.md).

The **Personal Viable System Model (PVSM)** begins with a simple premise: every human can be understood as an **adaptive control system** operating within a changing environment.

Rather than designing productivity tools from intuition or convention, PVSM starts by identifying the fundamental functional architecture that every viable agent must implement to remain effective over time.

The methodology consists of three stages:

1. **Model the universal agent control loop** independently of any particular implementation.
2. **Formalize the required functional components** that make an agent viable, including perception, decision-making, execution, regulation, learning, and identity maintenance.
3. **Map concrete personal systems**—such as note-taking systems, task managers, calendars, reflection practices, planning routines, and AI assistants—to these functions in order to analyze, engineer, and continuously improve personal agency.

The formal model serves as a **reference architecture**. Rather than prescribing specific tools or workflows, it provides a principled framework for evaluating whether every essential control function is present, identifying functional deficiencies, and systematically improving the overall self-management system.

In this view, productivity systems, knowledge management systems, planning methods, and AI assistants are not independent solutions; they are concrete implementations of specific functions within a larger cybernetic architecture of human agency.

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

### Agent Control Loop  Model

```txt
World: Environment | Internal Environment
      │
      ▼
 Perception
      │
      ▼
Situation Model
      │
      ▼
Decision
      │
      ▼
Action Selection
      │
      ▼
Execution
      │
      ▼
World
      ▲
      │
Feedback
```

## Personal Viable System Model (PVSM)

### Viable System Model (VSM)

> A Viable System Model (VSM) is a formal cybernetic model of the organizational structure required for an autonomous system to remain viable in a changing environment. It specifies the minimum set of interacting subsystems necessary to regulate operations, coordinate activities, adapt to environmental change, and preserve the identity and continuity of the system over time.

| **System** | **Description** | **Function** |
| --- | --- | --- |
| **System 1** | **Operational Units** | The primary units perform the organization's basic operations. Each unit is semi-autonomous and responsible for delivering specific outputs or services. |
| **System 2** | **Coordination** | Ensures the harmonious operation of System 1 units by providing coordination and conflict resolution. Manages the interactions and synergies between operational units. |
| **System 3** | **Control** | Provides resource allocation, monitoring, and control over the operational units. Ensures that the organization is functioning efficiently and effectively. |
| **System 3*** | **Audit** | A subset of System 3 focuses on monitoring and auditing the activities of the operational units to ensure compliance and performance standards. |
| **System 4** | **Intelligence** | Focuses on external environments and future planning. Responsible for adapting the organization to environmental changes, innovation, and strategic development. |
| **System 5** | **Policy** | Sets the organization's overall goals, values, and direction. Ensures a balance between internal and external focus and maintains the organization's identity and cohesion. |

### Agent Control Loop

```txt
World: Environment | Internal Environment
      │
      ▼
 Perception: Personal Recording System
        -> Null.
        -> Task Regitry Mechanism -> Documentation
        -> Reflection
        -> Audit Process
        -> ...
Situation Model
      │
      ▼
Decision
      │
      ▼
Action Selection  (Calendar, Time Tracker, ...)
      │
      ▼
Execution  (Production)
      │
      ▼
World
      ▲
      │
Feedback  (Reflection; Intelligence Layer)
```

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [Viable System Model (VSM)](https://app.notion.com/p/Viable-System-Model-VSM-204c0f5171ec80fbb08bdf964724daf0?source=copy_link)
