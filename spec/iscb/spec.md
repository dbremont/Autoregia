# Inter-System Communication Bus Specification

> This document establishes the conceptual foundations, core model, and
> implementation direction of a **Personal Event Bus (PEB)** — the
> internal communication **bus** of the Autoregia Personal Viable System Model
> (PVSM). A PEB is a technical object engineered to `carry the control flow
> between the cooperating systems` — turning the fact that *something changed*
> in one system into the *consequence that should follow* in another, without
> hard-coupling those systems to each other.

> Where the sibling systems each externalize a **substance** — the PRS
> externalizes records, the AOOS externalizes action, the PPS externalizes
> policy, the PTOCS externalizes capabilities, the PKTS externalizes attention —
> the PEB externalizes the **control flow** *between* them. A recording in the
> PRS is not, by itself, a task; but it may *signal* that a task should be
> registered in the AOOS. The PEB is what turns that "may" into a declared,
> inspectable, reversible reaction: an event crosses the bus, a rule fires, a
> task appears.

> Within the PVSM, the PEB is the substrate of the **Coordination function**
> (**VSM System 2 – Coordination**): the medium that harmonizes the operational
> units (System 1,
> the AOOS) with each other and with the regulatory systems (S3 Control /
> Accounting, S3\* Audit, S4 Intelligence, S5 Policy), by propagating the signals
> that keep them coherent. The **Notification System** (also S2) is a *consumer*
> on this bus, not an alternative to it.

> **Status: draft foundation.** The foundational decisions (name, event-log
> location, execution model) are recorded under [Decisions](#decisions); the
> remaining open ones are listed under [Open Questions](#open-questions). This
> document begins the specification; it does not close it.

---

## Formulation

> How to think about a `Personal Event Bus`?

A `Personal Event Bus` is a technical object with the role of
externalizing **the cross-system control flow** to scaffold extended agency:

- **preserve coordination continuity** — consequences of a change are not lost
  when attention moves on (a recorded commitment does not silently fail to
  become a tracked action);
- **stabilize cross-system reactions as an explicit object** — the wiring
  ("when X happens, do Y") is data the agent can read, edit, and reason about,
  rather than code scattered across systems or, worse, only in the agent's head;
- **reduce hidden coupling** — systems know how to *emit* and *serve*, not how to
  find and call each other;
- **make reactions inspectable and auditable** — every consequence carries the
  causal trace of what triggered it (System 3\* – Audit);
- **enable composition** — new behavior is a new rule, not an edit to every
  system.

### Principle

> The PEB should carry any cross-system reaction whose absence would either
> (a) **lose a necessary consequence** — a commitment not registered, a conflict
> not surfaced, a deadline not notified — or (b) **embed a coupling that should
> instead be configurable and visible.**

Conversely, a reaction should generally *not* live on the bus when it is:

- **Internal to a single system** — pure record-to-record derivation inside the
  PRS, or pure dependency-graph computation inside the AOOS, belongs to that
  system, not to the coordination layer.
- **Trivial and local** — a UI re-render or a cache invalidation is plumbing,
  not coordination.
- **Speculative** — "this record *might* be interesting to system X" is not a
  reaction; reactions follow declared rules, not ambient surfacing.
- **Irreversible and unauditable** — effects that cannot be traced or undone
  belong to the executing system's governed surface, not to autonomous firing.

### (Case Set) When should a change propagate?

| Case | Description | Example |
| --- | --- | --- |
| **Consequence-Bearing** | The change creates an obligation or a new unit of work elsewhere. | A `Commitment` record is created → a AOOS action should be registered. |
| **Constraint-Triggering** | The change may violate, or newly satisfy, a policy. | A deep-work block scheduled at 02:00 → a PPS Sleep-Policy check. |
| **Status-Propagating** | A lifecycle transition in one system must be reflected in another. | A task is marked `Completed` → its deadline-linked calendar block is freed. |
| **Conflict-Signaling** | The change may collide with another commitment. | Two blocks overlap → a conflict is raised and the agent is notified. |
| **Drift-Signaling** | A measured signal crosses a threshold. | A PKTS keyword-intensity reading spikes → an observation is recorded / surfaced. |
| **Identity-Relevant** | The change alters a policy, objective, or principle. | A PPS policy is revised → existing constructs are re-checked for compliance. |

---

## Internal Composition

> The PEB is a single System 2 composite. The conceptual separation between its
> parts is real; the deployment boundary is intended to be one project.

```
PEB — Personal Event Bus  (VSM System 2 – Coordination)
  |
  +-- [1] Event Log  (the substance the bus carries)
  |     \_ The append-only stream of facts: "X happened, at T, caused-by Y."
  |        Canonical home: PRS records of type Event / Observation
  |        (PRS remains the single source of truth).
  |
  +-- [2] Dispatcher  (the medium)
  |     \_ Accepts an event, matches it against the route table, and delivers
  |        it to each subscribing reaction, recording the outcome of each.
  |
  +-- [3] Route Table  (the wiring — a managed object)
  |     \_ Declarative bindings: { event predicate } -> { reaction }.
  |        This is what the agent reads and edits to change system behavior.
  |
  +-- [4] Reactions  (the effects)
        \_ Declared handlers that call into a target system's API to produce a
           consequence. Each effect is itself an event-emitting operation, so
           reactions compose into causal chains.
```

| Component | Role | Owns | Does NOT own |
| --- | --- | --- | --- |
| **[1] Event Log** | The carried substance — "what happened" | The ordered stream of event facts | The *meaning* of the events (producers/consumers define that) |
| **[2] Dispatcher** | The medium — "how it moves" | Matching, delivery, retry, outcome recording | The reactions themselves |
| **[3] Route Table** | The wiring — "what follows what" | The declarative bindings event→reaction | The event schema or the effect logic |
| **[4] Reactions** | The effects — "what gets done" | The translation from event to target-system API call | The target system's internal state |

---

## Core Model

### Event

> An **event** is an immutable fact that *something happened* in some system at
> some time. It is the atomic unit carried by the bus.

| Field | Description | Example |
| --- | --- | --- |
| **Event Id** | Globally unique identifier; if events are PRS records, this is the record id. | `REC-2026-00124` |
| **Origin** | The system and operation that produced it. | `{system: PRS, op: record.create}` |
| **Type** | The event kind within a typed vocabulary (see Event Taxonomy). | `RecordCreated` |
| **Payload** | The structured detail of what changed (references, not copies, of substance). | `{record_id, record_type, ...}` |
| **Occurred At** | When the change happened in the originating system. | ISO 8601 timestamp |
| **Causal Id** | The event (or agent act) that caused this one; `null` for agent-originated events. | `REC-2026-00120` |
| **Correlation Id** | Groups a cascade of events into one deliberative thread. | `thr-2026-06-28-007` |

> Two design notes carry over from the sibling specs. First, events **reference**
> substance rather than embedding it (the PRS record is the source of truth; the
> event points at it). Second, **causal lineage is first-class**: every effect
> records the event that triggered it, so any cascade is an inspectable DAG —
> the same `causes` / `spawned-from` / `historically-caused` vocabulary the PRS
> already defines.

### Producer

A **producer** is any system that emits events when its state changes. A system
becomes a producer by instrumenting its write paths to append an event to the log.

| Producer | Emits (seed) |
| --- | --- |
| **PRS** | `RecordCreated`, `RecordAnnotated`, `RecordStatusChanged`, `RecordDeadlineSet`, `RecordLinked` |
| **AOOS** | `ActionRegistered`, `ActionScheduled`, `ActionCompleted`, `BlockConflictDetected`, `SyncDriftDetected` |
| **PPS** | `PolicyChanged`, `PolicyViolated` |
| **PTOCS** | `CapabilityAdded`, `CapabilityDeprecated` |
| **PKTS** | `KeywordThresholdCrossed` |
| **Agent (human)** | `AgentActed` — the root cause for any manually-initiated cascade |
| **PEB (self)** | `ReactionFired`, `ReactionSucceeded`, `ReactionFailed`, `ReactionSuppressed` |

### Reaction

A **reaction** is a declared handler that subscribes to events matching a
predicate and performs an **effect** — typically an API call into a target
system, which itself emits new events and so continues the cascade.

| Property | Description | Example |
| --- | --- | --- |
| **Reaction Id** | Stable identifier. | `rxn.commitment-to-action` |
| **Trigger** | Predicate over events (type + conditions on payload). | `type == RecordCreated AND record_type in {Commitment, Task}` |
| **Effect** | The operation performed in the target system. | `AOOS.registerAction(derived)` |
| **Target** | The system whose API is called. | `AOOS` |
| **Gating** | Auto-fire / require-confirmation / suppress-on-policy. | `require-confirmation if irreversible` |
| **Idempotency Key** | Derived from event+reaction so a redelivery does not double-fire. | `hash(event_id, reaction_id)` |
| **Inverse** | Where possible, the operation that undoes the effect. | `AOOS.cancelAction` |

### Route

A **route** is the declarative binding from trigger to reaction. The **Route
Table** is the collection of routes. It is the primary object the agent edits to
change how the systems coordinate — modifying behavior by changing data, not by
patching systems.

```jsonc
// illustrative
{
  "id": "route.commitment-to-action",
  "trigger": { "type": "RecordCreated", "where": { "record_type": ["Commitment", "Task"] } },
  "reaction": "rxn.commitment-to-action",
  "enabled": true,
  "gating": "auto"
}
```

---

## A Reaction Flow (worked example)

> The seed scenario: **a recording triggers an entry into the task registry.**

```
Agent captures a commitment ("Deliver draft by Friday") in the PRS.
   │
   ▼
PRS appends  RecordCreated { record_id: REC-124, type: Commitment, deadline: Fri }
   │
   ▼
PEB Dispatcher matches route.commitment-to-action
   │
   ▼
Reaction rxn.commitment-to-action  ->  AOOS.registerAction(
        kind      = Commitment,
        source    = REC-124,
        deadline  = Fri,
        effort    = { estimate: nil } )
   │
   ▼
AOOS appends  ActionRegistered { action_id: ACT-124, source: REC-124 }
   │  (caused-by REC-124, correlation thr-...-007)
   │
   ▼
PEB matches route.action-to-schedule-projection
   │
   ▼
Reaction  ->  AOOS.projectDeadline(...)  ─▶  BlockConflictDetected
   │
   ▼
PEB matches route.conflict-to-notification
   │
   ▼
Notification System (S2 consumer)  ->  alert the agent
```

At every hop the causal id and correlation id are carried forward. After the
cascade, the agent (or S3\* Audit) can reconstruct the entire thread: *why does
this task exist? because REC-124 was captured; why was I alerted? because its
projected block conflicted.* Nothing is hidden; nothing is only-in-someone's-head.

---

## Delivery & Semantics (provisional)

> The bus is **asynchronous** and **at-least-once**. Correctness rests on
> reactions being **deterministic** and **idempotent** (via the idempotency key),
> not on exactly-once delivery.

- **Ordering** — events from a single producer are delivered in occurrence order;
  across producers, only causality (via the causal id) is guaranteed, not wall-clock order.
- **Idempotency** — a redelivered event must not double-fire its effect; the
  idempotency key is checked before the effect runs.
- **Reversibility** — effects carry an `inverse` where possible; irreversible
  effects default to **require-confirmation** gating.
- **Policy gating** — before firing, a reaction is checked against applicable
  **PPS** policies; a violation suppresses the reaction and emits
  `ReactionSuppressed` (governance, not silent failure).
- **Human-in-the-loop** — reactions marked `require-confirmation` surface to the
  agent rather than firing autonomously.

---

## Evaluation

> How to evaluate a Personal Event Bus?

| Criterion | Indicator | Description |
| --- | --- | --- |
| Consequence Completeness | Lost-Consequence Rate | Share of changes that *should* have propagated but did not |
| Coupling Reduction | Cross-System Call Avoidance | Share of cross-system effects mediated by the bus vs. direct coupling |
| Causal Auditability | Cascade Traceability | Ability to reconstruct why any state exists, back to its origin |
| Reaction Correctness | Double-Fire Rate | Rate of effects applied more than once (should be zero) |
| Reaction Latency | Propagation Delay | Time from an event occurring to its consequence being applied |
| Reversibility | Undo Coverage | Share of effects with a defined, working inverse |
| Wiring Legibility | Route Discoverability | Ease with which the agent can read and predict system behavior |
| Policy Compliance | Gating Effectiveness | Share of reactions correctly suppressed/confirmed per PPS policy |
| Resilience | Recovery After Outage | Ability to replay the log and converge to the correct state |
| Compositionality | New-Behavior Cost | Effort to add a new cross-system behavior as a route vs. as code |

---

## Implementation (directional)

| Layer | Recommendation |
| --- | --- |
| Event Log | PRS records of type `Event` / `Observation` (single source of truth) |
| Dispatcher | Small Python process; matches events against the route table |
| Route Table | Declarative (data), stored in SQLite; editable through a managed surface |
| Reactions | Registered handlers calling each system's existing internal API |
| Delivery | At-least-once with idempotency keys; durable queue (SQLite-backed) |
| Observability | `ReactionFired/Succeeded/Failed/Suppressed` are themselves events → auditable |

> The first implementation is expected to be **in-process** (all systems in one
> Python project), with the dispatcher as a library the systems import. A
> decoupled (queue + workers) deployment is a later option, enabled by the event
> log being the contract.

---

## Decisions

> Foundational decisions locked for this draft.

1. **Name & slot.** **PEB** — Personal Event Bus — realizing the **VSM System 2 –
   Coordination** function. The *bus* is the mechanism; *Coordination* is the role.
2. **Event log.** **Events are PRS records of type `Event` / `Observation`.** PRS
   remains the single source of truth; the PEB reuses the existing causal-link
   vocabulary (`causes`, `spawned-from`, `historically-caused`). Any cascade is an
   inspectable subgraph of the PRS record graph.
3. **v1 execution model.** **Asynchronous, in-process, at-least-once**, with a
   dispatcher library the systems import and a durable (SQLite-backed) queue.
   Correctness rests on reaction idempotency, not exactly-once delivery.

## Open Questions

> The remaining decisions that materially shape the rest of the specification.
> These are the agenda for the next round.

1. **Declarative vs. code reactions.** Recommended: **declarative routes + thin
   registered handlers** (inspectability first). How far to push pure-data rules
   before falling back to code?
2. **Synchronous exceptions.** Async is the default — but are there reactions
   that *must* be synchronous (e.g., a PPS policy gate that blocks a save before
   it commits)? If so, how is the sync/async boundary drawn?
3. **Human-in-the-loop default.** Which classes of reaction fire autonomously,
   and which require confirmation by default? (Irreversible effects clearly do;
   where is the line?)
4. **Reaction failure policy.** On `ReactionFailed`: retry with backoff, surface
   to the agent, or both? How are stuck reactions drained?
5. **Back-reactions and loops.** How do we prevent / detect cycles (`A→B→A`)?
   Causal id + a visited-set per correlation id is the obvious guard — confirm.
6. **Event schema location.** Since events are PRS records, does the event-type
   vocabulary (`RecordCreated`, `ActionRegistered`, …) live in the PRS schema, in
   a PEB schema, or in both? (Touches the PRS↔PEB ownership boundary.)

---

## References

- [Autoregia](../../README.md) — workspace overview & VSM mapping.
- [PVSM — Specification](../README.md) — agent control loop & VSM framing.
- [PRS — spec](../prs/spec.md) — recording system; canonical home of the event log; source of the causal-link vocabulary.
- [AOOS — spec](../aoos/spec.md) — operations system; the primary reaction *target* (task registry) and a producer (`ActionRegistered`, …).
- [PPS — README](../../pps/README.md) — policy corpus; source of gating rules.
- [PTOCS — spec](../ptocs/spec.md) — capability catalog; referenced by capability-bearing reactions.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
