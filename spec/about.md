# Autoregia Model Explanation

> Autoregia is a self-management system that augments an agent's capacity to deliberately regulate its behavior, resources, and objectives in pursuit of its long-term viability and goals.

> Autoregia is not a manager of the agent; it is an enabling infrastructure for agency.

> Autoregia is analogous to an exoskeleton for an agent. It does not replace the agent's core capabilities, but augments them with structures and mechanisms for self-regulation, resource management, intention management, monitoring, and adaptation, enabling more capable and sustained autonomous behavior.

> This is analogous to the cross-cutting capabilities that AI provides to traditional software systems, extending their computational abilities with functions that were previously impractical or intractable, such as speech recognition, natural language understanding, and computer vision.

> What underlies the Autoregia model? This document is the conceptual basis for [`about.html`](../about.html) — the canonical home of the Autoregia model: the agent, the agent control loop, the Viable System Model (VSM) and the Autoregia system map, and the Personal Viable System Model (PVSM).

> The diagrams in `about.html` are **interactive**: every stage is clickable and opens a detail panel. Node labels use **abstract** cybernetic terms only; the **concrete** personal-system mapping is revealed on click. The ASCII diagrams below mirror that same closed-loop topology; the mapping tables are the authoritative reference for the specifics.

## Agent

> An agent is a system that maintains its continued existence and pursues objectives through regulated interaction with an environment.

> An agent is a system that deliberately transforms states of itself and its environment by selecting and executing actions according to internal objectives while regulating those actions using feedback.

> Every person can be understood as an adaptive control system operating within a changing environment. Autoregia starts from that premise: rather than designing productivity tools from intuition or convention, it creates/uses a model of agency - with it's core oragnizing principle -  identifies the fundamental functional architecture that every viable agent must implement.

> An agent is a stateful autonomous system that maintains an internal representation of itself and its environment, continuously updating this representation through perception and using it to generate intentions, make decisions, coordinate actions, regulate execution, and learn from outcomes. The agent operates as a recursive feedback system that seeks to achieve objectives while maintaining its long-term viability.

> See `img/self-model.png`

| **Agency Aspect**        | **Agency Problem Addressed**                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Identity**             | **Identity Maintenance** — What makes the agent the same entity over time?                                    |
| **Intent Management**    | **Intent Management** — Which intentions should be generated, evaluated, committed to, revised, or abandoned? |
| **External World Model** | **Situation Understanding** — What is the current state of the external world?                                |
| **Agent State**          | **Self-State Maintenance** — What is the current condition, capabilities, and resources of the agent?         |
| **Perception**           | **Situation Assessment** — What is happening right now?                                                       |
| **Decision**             | **Choice** — Which course of action should be selected?                                                       |
| **Planning**             | **Action Organization** — How should chosen intentions be transformed into executable actions?                |
| **Operation Control**    | **Coordination** — How should ongoing activities, resources, and concurrent work be coordinated?              |
| **Execution**            | **Intervention** — How should actions be carried out to change the world?                                     |
| **Feedback**             | **Outcome Assessment** — What actually happened, and how did it compare with expectations?                    |
| **Regulation**           | **Behavioral Control** — How should deviations be corrected to remain aligned with intentions?                |
| **Learning**             | **Adaptation** — How should future behavior improve based on experience?                                      |

### Foundational Model Substrates

The agent maintains two foundational model substrates — typed, declarative ontologies — that structure its perception, situation-assessment, and self-regulation. Both are sub-systems of the **Agent State** system and are **generative**: from their types they can derive recording templates and emit records into the PRS automatically.

- **World Model** — the typed ontology of the external environment: entity types, relation types, event types, and domains. Makes explicit the structure that Perception reads and the Situation Model instantiates. Materialized as the [Personal World Model System (PWMS)](asrs/pwms/README.md), a sub-system of Agent State.
- **Self Model** — the typed model of the self: identity, capabilities, resources, beliefs, commitments, constraints. Makes explicit the structure of the internal world against which internal state is recorded and regulated. Materialized as the [Personal Self Model System (PSMS)](asrs/psms/README.md), a sub-system of Agent State along with the [Personal Policy System (PPS)](../pps/) that writes to it.

## Management Model Formulation

The Management Model (also called the **Personal Viable System Model (PVSM)**) concretizes the abstract agency framework by providing the tools, mechanisms, and organizational structure through which each agency function is realized in practice.

The Control Loop serves as the organizing principle of the Management Model, structuring how its systems and tools support the agent's continuous cycle of deliberation, action, feedback, regulation, and adaptation.

The PVSM instantiates the agent control loop with concrete personal systems. The **Deliberative Cycle** is supplied by the recording, reflection, and planning instruments; the **Execution** arc is supplied by production tools; and **Feedback** closes the loop through reflection.

> See `control-loop-expanded.png`.

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

## **Q. How should intent formation (or intent management) be conceptualized? Which are the triggers?**

**A.** Intent management is the process by which an agent continuously generates, evaluates, selects, commits to, and revises intentions that determine what it should pursue. It bridges perception and deliberation by transforming changes in the environment, internal state, and enduring commitments into an active set of intentions that guide planning and execution.

Intent generation is triggered whenever information suggests that attention or action may be warranted. The principal trigger classes are:

- **Problematization:** detection of deviations, unmet needs, failures, threats, or risks requiring intervention.
-  **Opportunity Discovery:** recognition of favorable conditions that could produce value or advantage.
-  **Commitments & Obligations:** goals, plans, policies, promises, deadlines, and recurring responsibilities requiring progress or maintenance.
-  **External Requests:** commands, messages, delegated work, or other requests originating from external agents.
-  **Identity & Values:** strategic objectives, principles, roles, and long-term aspirations that proactively generate intentions.
-  **Habits & Routines:** recurring behaviors generated from persistent policies or recurrence rules rather than fresh deliberation.
-  **Curiosity & Exploration:** uncertainty, knowledge gaps, prediction errors, or intrinsic motivation to acquire information or experiment.

These sources produce **intent candidates**, which are subsequently evaluated according to importance, urgency, expected value, feasibility, resource requirements, constraints, and strategic alignment. Conflicting candidates are prioritized and resolved, producing an **Active Intent Set** that directs planning and execution. Intentions remain active until completed, abandoned, superseded, or revised in response to new information or changing circumstances.

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
