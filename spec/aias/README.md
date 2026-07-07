# Agent Intent Aid System (AIAS)

> This document establishes the conceptual foundations, architecture, and implementation of an **Agent Intent Aid System (AIAS)**. An AIAS is a technical object engineered to `carry the intent-management function` of the Personal Viable System Model (PVSM) — continuously generating, evaluating, selecting, committing, monitoring, revising, and retiring intentions, and yielding the **Active Intent Set** that directs planning and execution.

Fundamentally, an AIAS is the **central coordination layer between Perception and Deliberation**. It transforms signals arriving from the environment, the agent's internal state, memory, identity, and policy into a coherent, prioritized, resource-feasible set of commitments. It does not decide what the agent should value — that belongs to Policy ([PPS](../pps/)); it turns what the agent already pursues into a maintained, revisable, schedulable set of intentions that eventually generate action.

## Formulation

> How to think about an `Agent Intent Aid System`?

An AIAS is best understood by analogy to an operating system's **process scheduler**. A kernel does not create processes; it maintains a process table and continuously selects which eligible processes receive resources, in what order, and under what constraints. Likewise, an AIAS does not manufacture the agent's goals — those originate from identity, commitments, opportunities, problems, and the world. It maintains an **Intent Store** (all candidate, active, and historical intents) together with an **Intent Scheduler** that continuously selects the subset of intents eligible for planning and execution based on policy, resource constraints, and strategic priorities.

An AIAS therefore:

- preserves the continuity and coherence of what the agent is pursuing across time,
- separates generation from commitment (many candidates; a committed few),
- keeps active commitments feasible against finite resources,
- makes conflict, over-commitment, and drift inspectable rather than latent,
- and provides a clean foundation for unifying goals, projects, tasks, habits, recurring obligations, and autonomous (LLM) agents into a single model of intention.

## Position in the Loop

Intent Management sits between Perception and Deliberation, and is re-entered by Feedback:

```
Perception
      │
      ▼
Intent Management  ◄── AIAS
      │
      ├────────► Deliberative Engine (Decision)
      │
      ├────────► Action Selection (Planning)
      │
      └────────► Working Memory

Execution
      │
      ▼
Feedback
      │
      ▼
Intent Revision  ◄── AIAS
```

## Inputs

Intent Management consumes signals from many systems.

### External World

* events
* requests
* deadlines
* opportunities
* threats
* messages
* environmental changes

### Internal State

* energy
* attention
* available time
* money
* computational budget
* current workload
* emotional state
* confidence

### Identity

* goals
* values
* principles
* commitments
* roles
* strategy

### Memory

* unfinished work
* previous failures
* previous successes
* routines
* habits
* learned heuristics

### Feedback

* execution failures
* completed tasks
* deviations
* unexpected outcomes

## Architecture

The AIAS is built from three cooperating parts.

### Intent Store

The **Intent Store** is the persistent system of record for intentions across their entire lifecycle — candidate, active, suspended, completed, abandoned, superseded, and historical. It is append-minded (revisions are explicit and traceable) and relationally rich: intents link to their sources, dependencies, the records that justify them, and the actions they eventually produce. It is the substrate on which every other intent function operates.

### Intent Scheduler

The **Intent Scheduler** is the continuous evaluation-and-selection function. It scores candidates, resolves conflicts, enforces policy and resource constraints, and emits — at any point in time — the subset of intents eligible for planning and execution. It is regulatory rather than one-shot: it re-runs as perception, execution feedback, and internal state change, reprioritizing, suspending, resuming, or retiring commitments as conditions warrant.

### Active Intent Set

The **Active Intent Set** is the authoritative output of the scheduler: the complete set of objectives the agent is actively committed to at the present moment. It is the input to Planning and the reference against which Execution and Feedback are compared.

## The Intent Record

Each intent in the store is described by:

| Field                   | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| **Intent ID**           | Globally unique identifier.                                                 |
| **Description**         | What the agent intends to bring about.                                      |
| **Source**              | Origin class (problem, opportunity, commitment, request, identity, habit, curiosity). |
| **Priority**            | Relative importance.                                                        |
| **Status**              | Lifecycle state (see below).                                                |
| **Confidence**          | Likelihood the intention is well-formed and achievable.                     |
| **Expected Value**      | What is gained by succeeding.                                               |
| **Deadline**            | Time horizon / due date, if any.                                            |
| **Owner**               | The agent (or delegated actor) responsible.                                 |
| **Constraints**         | Limits under which it must be pursued.                                      |
| **Dependencies**        | What must happen first (other intents, resources, capabilities).           |
| **Review Schedule**     | When the intent should be re-evaluated.                                     |
| **Termination Condition** | The state in which the intent is no longer active.                        |

**Status (lifecycle states):** `Generated` · `Evaluated` · `Selected` · `Committed` · `Planned` · `In Progress` · `Completed` · `Paused` · `Cancelled` · `Merged` · `Split` · `Deferred` · `Superseded`.

## Intent Lifecycle

```
Generated
      │
      ▼
Evaluated
      │
      ▼
Selected
      │
      ▼
Committed
      │
      ▼
Planned
      │
      ▼
Executed
      │
      ▼
Completed
```

Alternative transitions from `Committed`:

```
Committed ──► Paused
Committed ──► Cancelled
Committed ──► Merged
Committed ──► Split
Committed ──► Reprioritized
Committed ──► Replanned
```

## Intent Generation

Intent candidates originate from seven classes.

### 1. Problem Detection

Deviation from a desired state.

* missed deadline
* system failure
* low cash
* broken software

### 2. Opportunity Detection

Potential gains.

* investment
* partnership
* useful article
* market opportunity

### 3. Commitments

Previously accepted obligations.

* goals
* projects
* recurring reviews
* promises

### 4. External Requests

Other agents.

* email
* customer
* manager
* family

### 5. Identity

The agent proactively generates intentions because of who it is.

* researcher
* entrepreneur
* parent
* athlete

### 6. Habits

Recurring policies.

* exercise
* weekly review
* backups
* journaling

### 7. Curiosity

Knowledge acquisition.

* investigate
* experiment
* learn
* validate hypothesis

## Intent Evaluation

Every candidate is scored. Possible dimensions:

| Dimension           | Question                              |
| ------------------- | ------------------------------------- |
| Importance          | Does it matter?                       |
| Urgency             | When?                                 |
| Strategic Alignment | Does it advance long-term objectives? |
| Feasibility         | Can it currently be done?             |
| Expected Value      | What is gained?                       |
| Cost                | Resources required?                   |
| Risk                | Potential downside?                   |
| Reversibility       | Can mistakes be undone?               |
| Dependencies        | What must happen first?               |
| Opportunity Cost    | What must be displaced?               |

## Selection

The Scheduler resolves conflicts among evaluated candidates. Possible operators:

* prioritize
* merge
* split
* reject
* defer
* delegate
* suspend

**Result:** the `Active Intent Set`.

## Active Intent Set

This is the authoritative list of what the agent is currently committed to. It should be:

* internally consistent,
* resource feasible,
* policy compliant,
* strategically aligned,
* periodically reviewed.

It becomes the input to Planning.

## Monitoring

Intent Management continuously observes:

```
progress
blocked work
resource changes
environment changes
new opportunities
new obligations
execution feedback
```

## Revision

The active set evolves. Possible operations:

```
Increase priority
Decrease priority
Suspend
Resume
Cancel
Merge
Split
Escalate
Delegate
Replace
Expire
```

## Termination

An intent ends when it is:

* completed
* abandoned
* impossible
* superseded
* merged
* expired

## Interfaces

Intent Management interacts with nearly every subsystem in Autoregia:

```
External World
      │
      ▼
Perception
      │
      ▼
Intent Management  ◄── AIAS
      │
      ├────────► Planning          (AOOS)
      │
      ├────────► Deliberative Engine
      │
      ├────────► Operation Control
      │
      └────────► Working Memory

Execution
      │
      ▼
Feedback
      │
      ▼
Intent Revision  ◄── AIAS
```

Principal couplings:

| Neighbor | Relation |
| --- | --- |
| [PRS](../prs/) | Perceived events, records, and observational state feed candidate generation. |
| [PPS](../pps/) | Policy supplies the values, principles, and constraints against which intents are evaluated. |
| [ASRS](../asrs/) / PSMS | Internal state, capabilities, and resources bound what is feasible. |
| [AOOS](../aoos/) | The Active Intent Set directs planning and action selection. |
| [AWES](../awes/) | Execution outcomes return as feedback for revision. |
| [PRAS](../pras/) | Deliberations on intention–outcome gaps mature into revisions and policy. |

## Design Principles

An implementation should satisfy these architectural principles:

1. **Intentions are commitments, not merely desires.** An intent enters the Active Intent Set only after explicit evaluation and commitment.
2. **The Active Intent Set is authoritative.** At any point in time, it represents the complete set of objectives the agent is actively pursuing.
3. **Generation and commitment are separate concerns.** New opportunities and problems continuously generate candidates, but only a subset become active commitments.
4. **Intent management is continuous.** It is not a one-time planning step; it operates as an ongoing regulatory process driven by perception, execution feedback, and changes in internal state.
5. **Resource boundedness is explicit.** The subsystem must ensure that active commitments remain feasible given the agent's available time, energy, attention, finances, computational budget, and other constrained resources.
6. **Intentions are revisable.** Commitments can be reprioritized, suspended, merged, split, delegated, or retired when new information warrants adaptation.

## Evaluation

> How to **evaluate** an AIAS?

| Category            | Criteria                   | Description                                                                 |
| ------------------- | -------------------------- | --------------------------------------------------------------------------- |
| Coherence           | Set Consistency            | The active set contains no mutually exclusive or contradictory commitments. |
| Coherence           | Completeness               | Everything the agent is actively pursuing is present and nothing stale.     |
| Feasibility         | Resource Boundedness       | Active commitments fit within time, energy, attention, money, and budget.   |
| Feasibility         | Conflict Detection         | Collisions and over-commitment are surfaced before they bite.               |
| Alignment           | Policy Compliance          | Commitments respect declared principles, values, and constraints.           |
| Alignment           | Strategic Coherence        | Active intents advance, or at least do not undermine, long-term objectives. |
| Responsiveness      | Revision Latency           | Speed with which the set adapts to new information or feedback.             |
| Responsiveness      | Capture Friction           | Effort required to register a new candidate without disrupting work.        |
| Continuity          | State Preservation         | Intentions and their rationale survive interruption and restart.            |
| Continuity          | Resumption Latency         | Time required to re-enter the active set after an interruption.             |
| Traceability        | Provenance                 | Every intent links to the source that justifies it.                         |
| Traceability        | Revision History           | Changes to priority, status, and scope are explicit and inspectable.        |
| Review Health       | Review Cadence             | Each intent has and meets a review schedule.                                |
| Review Health       | Staleness Resistance       | Inactive or superseded intents are retired rather than accumulated.         |
| Coordination        | Delegation Clarity         | Ownership of each intent is unambiguous.                                    |
| Coordination        | Dependency Visibility      | Blocking relationships between intents are visible.                         |

## Implementation

### Functionality Set

- **Capture** — quick capture of intent candidates from any source (scratchpad, ingestion from PRS / PEOS / PAIS events, external requests, reflective notes).
- **Triage queue** — a review surface for newly generated candidates awaiting evaluation.
- **Intent editor** — progressive disclosure over the full intent record (fields, constraints, dependencies, review schedule, termination condition).
- **Active Intent Set view** — the authoritative current commitments, ordered by priority and deadline.
- **Scheduling view** — the subset eligible for planning in the current horizon, handed off to AOOS.
- **Conflict & over-commit detection** — collisions, dependency cycles, and resource over-allocation flagged against ASRS / PSMS state.
- **Revision log** — append-only history of reprioritization, suspension, merge/split, delegation, and retirement, with rationale.
- **Monitoring board** — blocked work, resource changes, new obligations, and feedback awaiting revision.
- **Retrospective** — completed, abandoned, superseded, and expired intents for review and learning.

### Technical Element Set

| Layer      | Recommendation                          |
| ---------- | --------------------------------------- |
| Storage    | JSON + SQLite                           |
| API        | Simple Python Flask                     |
| UI         | CSS, JS, HTML (libraries allowed, no framework) |

### UI / UX Guiding Principles

> The interface should be visually calm, consistent, and minimal, with aesthetics emerging from clarity, hierarchy, and purposeful design rather than decoration.

> The interface should follow an elegant, timeless, Oxford-inspired aesthetic characterized by clarity, restraint, refined typography, balanced composition, and the absence of unnecessary ornamentation — consistent with the rest of Autoregia.

| Category                   | Principle                 | Description                                                                                                                          |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Interaction Model**      | Keyboard shortcuts        | The most relevant actions (capture, triage, reprioritize, commit, retire) accessible via keyboard, including a command palette.      |
| **Interaction Model**      | Progressive disclosure    | Expose the active set first; reveal evaluation scores, dependencies, and history only when needed.                                   |
| **Data Integrity & Trust** | Explicit commitments      | Moving an intent into the active set is a deliberate, inspectable act — never a silent side effect.                                  |
| **Data Integrity & Trust** | Immutable-by-default model | Revisions are explicit; history and diffs are always discoverable.                                                                   |
| **Data Integrity & Trust** | Explainability over magic | Scores, suggestions, and scheduling decisions are inspectable.                                                                       |
| **Visual Design**          | Sophisticated restraint   | Typography, spacing, clarity, and composition over decoration.                                                                       |
| **Visual Design**          | Whitespace as structure   | Spacing used intentionally to group the active set, the triage queue, and the retrospective.                                         |
| **Visual Design**          | Semantic color usage      | Color communicates status, source class, and urgency — never decoration.                                                            |
| **Expert User Experience** | Command palette everywhere | A universal command interface for actions and navigation.                                                                            |

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [Autoregia model — Intent formation](../../about.html)
