# Computation Task Execution System

> This document establishes the conceptual foundations, taxonomy, and design of
> a **Computation Task Execution System (CTES)** — a system that manages the
> execution of specified tasks from submission to completion.

> Within the Autoregia Personal Viable System Model (PVSM), CTES is a tool of
> the **Agent Toolbox Ecosystem (ATE)** — VSM System 1 (Execution) alongside
> [CES](../ces/). The division of labor: **CES provisions and executes in
> computational environments; CTES manages the lifecycle of the tasks
> themselves** — emission, storage, scheduling, dispatch, execution, results.
> The two are complementary, not competing: a task executed by CES would be
> *managed* by CTES.

Status: **partially implemented — phase 2 app shell live.** The register of
handles (full lifecycle), task specs, synchronous runs, audit, settings, and
self monitoring are implemented at `/ate/tool/ctes/`; queues, schedulers,
leases, async dispatch, and retries remain future phases.

## Formulation

### What is a task?

> A **task** is a specification of a unit of work to be performed, together
> with the information necessary to determine and execute that work.

A task is characterized by:

- **Objective** — what is to be accomplished
- **Input** — information on which execution operates
- **Operation** — what is to be done
- **Output** — expected result
- **Constraints** — conditions governing execution
- **Dependencies** — other tasks or resources required
- **Temporal mode** — when and how the result is expected

### What is a task execution system?

> **Task execution system** = a system that manages the lifecycle of tasks,
> using mechanisms such as queues, schedulers, workers, executors, and result
> channels.

### The problem it solves

A task execution system manages the transformation of specified work into
completed results. It solves:

> **How can tasks be emitted, stored, scheduled, executed, and have their
> results returned reliably under the constraints of the system?**

This becomes a *systems* problem when there are multiple tasks, executors,
dependencies, failures, priorities, resource constraints, or asynchronous
execution.

## The Execution Workflow

```
Task Emitter
  │ creates & submits task
  ▼
Task Submission
  ▼
Task Storage / Queue
  │ stores pending work
  ▼
Scheduling / Dispatch
  │ selects & assigns task
  ▼
Task Executor
  │ performs work
  ▼
Task Result
  │ stored / delivered
  ▼
Result / Feedback Channel
  ▼
Task Emitter ──► uses the result to determine subsequent tasks
```

Cross-cutting mechanisms — state management, leases, heartbeats, timeouts,
retries, logging, monitoring — operate across this structure.

### Temporal modes

- **Synchronous** — the emitter waits for the result:
  `Emitter → Execute → Result → Emitter`.
- **Asynchronous** — the emitter submits and continues; the result arrives
  later through the feedback channel.

## Characterization

Task execution systems are characterized along: execution model (sync/async),
scheduling model (immediate/scheduled/priority/dependency), topology
(local/distributed), concurrency (sequential/parallel/concurrent), persistence
(ephemeral/durable), coordination (centralized/decentralized), dependencies
(independent/DAG), resource model, failure model (fail-stop/retry/
fault-tolerant), result model (returned/stored/streamed/event-driven),
granularity (function/process/job/workflow), scheduling horizon, and state
model (stateless/stateful).

### The taxonomy

These are not separate categories — different configurations of the same
underlying task-execution problem:

| Type | Executes | Instances |
| --- | --- | --- |
| Function Execution | a discrete function per task | AWS Lambda, OpenFaaS |
| Job Execution | submitted jobs via queue + worker pool | Celery, Sidekiq |
| Workflow Execution | tasks coordinated by dependencies and workflow logic | Temporal, Apache Airflow |
| Build Execution | source artifacts → derived artifacts | Bazel, Buck, Ninja |
| Batch Execution | collections of tasks as batches | Apache Hadoop, Apache Spark |
| Stream Processing | continuous computation over a stream | Apache Flink, Kafka Streams |
| Serverless Execution | tasks without user-managed infrastructure | AWS Lambda, Google Cloud Functions |
| Distributed Execution | tasks across machines | Ray, Dask |
| Cluster Execution | tasks across a managed cluster | Kubernetes, Slurm |

## Design

### Task representation

A task carries: identifier; operation or executable reference; input data or
references; expected output or destination; execution parameters; constraints;
dependencies; priority; scheduling information; retry policy; timeout/deadline;
execution metadata.

### Task lifecycle

```
Created → Submitted → Pending → Dispatched → Running
                                           ├─► Completed
                                           └─► Failed ─┬─► Retry → Pending
                                                       └─► Abandoned
```

Cancellation may transition a task from several intermediate states to
`Cancelled`, subject to the system's semantics.

### Coordination

Which executor owns a task, whether it may run concurrently, and who takes over
after failure, are established by: **lease** (temporary ownership), **lock**
(exclusion), **heartbeat** (liveness), **acknowledgement** (receipt),
**commit** (durable completion), **deduplication** (collapse of repeats), and
**idempotency** (safe re-execution).

### Failure handling

The system distinguishes at least: task failure, executor failure,
infrastructure failure, dependency failure, timeout, cancellation, and
result-delivery failure. The handling path:

```
Failure Detection
  ├─► Retry ──► Backoff ──► Re-execution
  ├─► Reschedule
  ├─► Reassign
  └─► Abandon / Dead Letter
```

### Techniques

Queue-based execution · worker-pool execution · scheduled execution ·
priority-based scheduling · dependency-aware execution · parallel execution ·
distributed execution · retry-based recovery · backoff · lease-based execution ·
heartbeat-based execution · idempotent execution · isolation-based execution ·
resource-aware scheduling.

### Trade-offs

| Trade-off | One side | Other side |
| --- | --- | --- |
| Throughput ↔ Latency | maximize completion rate | minimize individual completion time |
| Parallelism ↔ Coordination | more concurrent execution | more coordination overhead |
| Reliability ↔ Resource cost | retries, replication, persistence | less resource consumption |
| Persistence ↔ Performance | durable task/state storage | lower overhead and latency |
| Fault tolerance ↔ Complexity | recover from more failures | simpler implementation |
| Ordering ↔ Concurrency | preserve execution order | run independent tasks concurrently |

### Scales of implementation

| Scale | Typical implementation |
| --- | --- |
| Local | function calls, process execution, local queue |
| Single-process | in-memory task queue and worker pool |
| Single-machine | processes/threads plus persistent queue |
| Multi-process | broker plus multiple workers |
| Distributed | distributed queue/state store plus worker pool |
| Workflow-scale | persistent workflow state plus task orchestration |

## Verification

What must hold: task correctness (the operation produces the specified
result); completeness (accepted tasks are never silently lost); state
correctness (lifecycle state reflects execution); dependency correctness (no
execution before dependencies); concurrency correctness; persistence
correctness (required state survives the specified failures); failure
correctness (failures produce the specified recovery behavior).

Key invariants: a task cannot be `Completed` without a producing execution
path; a task cannot be dispatched before it is executable; a task under an
exclusive lease cannot be simultaneously owned by another worker; a failed task
is retried only per its retry policy; **a task must not be silently lost
between submission and terminal state**.

## Relation to Autoregia

- **CES** (`/ate/tool/ces/`) — provisions execution environments, dispatches
  work units, captures artifacts. CTES would manage the *lifecycle* of such
  work units: who emitted them, what state they are in, what their results were.
- **Dependability** ([`../dependability.md`](../dependability.md)) — the
  continuity guarantees a real CTES must carry are already enumerated there:
  durable queue, at-least-once processing with reconciliation, deduplication,
  idempotent continuation, failure detection. CTES is the generalization of
  what `pkts_raw`/`pwts_raw` + RQ workers already do ad hoc for telemetry
  batches.

## Implementation Status

**Phase 2 app shell implemented** at `/ate/tool/ctes/` (decision log: "CTES
phase 1 shell", "CTES phase 2 app shell"). What exists:

- **The register** — CouchDB db `ctes` (shared `Store`; seed applies only
  when the DB is empty) of *handles*: self-contained Python packages under
  `packages/<id>/` (`manifest.json`, entry point `module:function`). Code
  stays on disk; the register holds metadata only. Full lifecycle through
  the UI and API: register, update (rewrites the manifest), activate/
  inactivate (soft path — inactive handles refuse runs), manual delete
  (purges doc + code; the run journal is kept and marks the handle
  deleted), and read-only code viewing (path-contained).
- **Task specs** — registered intents that reference a handler directly:
  objective, payload template, expected output, priority, constraints
  (timeout, deadline), dependencies. *Emitting* resolves the handler and
  dispatches synchronously; async mode is stored but rejected (501) until
  queues exist.
- **Synchronous runs** — every execution goes through the uniform
  `runner.py` shim (JSON payload on stdin, JSON envelope on stdout) in a
  self-contained environment: `docker run --rm -i --network none` with
  read-only mounts (default when the docker CLI is present), or the venv's
  own python (`CTES_EXEC_BACKEND=subprocess`, the test fallback). Each run
  is journaled: input, result, log, exit code, timing, backend, and a
  sha256 snapshot of the exact code that ran. Run retention is enforced
  from settings.
- **Audit** — every mutation of the register, specs, and settings is
  recorded (typed docs in the same DB) with actor, action, and change
  details; the trail is never pruned.
- **Settings** — persisted, editable defaults (timeout, backend, log
  limit, retention, network policy) consulted by the run path; env-derived
  values display read-only.
- **The shell** — WOS-style app: header search, sidebar router, command
  palette, dashboard (outcome rates, per-handle activity), runs journal
  with filters and paging, handler manager, spec registry, audit view,
  self monitoring, settings, documentation, export.
- **Not yet** (future phases): queues, schedulers, workers, leases,
  heartbeats, retries/backoff, dependency (DAG) execution, async dispatch.

Design-plate content lives in the spec and the
[decision log](../../log.md); the tool plate is the working app.

## References

- Sibling tools: [CES](../ces/) · [GIAL](../gial/) · [SARL](../sarl/)
- [Dependability — Fault Tolerance & Continuity](../dependability.md)
- Temporal · Apache Airflow · Celery — workflow/job execution references
- Agent System entry, Dependability case-study table (task/context state so the
  agent never silently forgets an unfinished operation)
