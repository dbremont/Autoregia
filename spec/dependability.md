# Autoregia Dependability — Fault Tolerance & Continuity

> **Status:** adopted (2026-09). **Scope:** the whole system — all sub-systems,
> their background services, the persistence layer, and the deployment layer.
>
> This document states the **dependability guarantees of the system**: which
> failures it tolerates, how it preserves **continuity** (recoverability), and
> where continuity is still broken. It applies the *Self-Continuation /
> Joint-Continuation* formulation — the ability of a computational system to
> **maintain, recover, and continue its own ongoing computational process
> across time, interruptions, or failures**. It is a spec of guarantees and
> obligations only: how each guarantee is realized — the mechanisms and their
> configuration — is documented in each sub-system's own implementation
> documentation. Every guarantee below is classified honestly:
> **guaranteed / best-effort / absent**.

## Formulation

> **Continuity** is the property of a process by which its state, identity, and
> progression are maintained across time — what happens later remains connected
> to what happened before.

> **Self-continuity** is the capacity to maintain the continuity of the
> system's *own* ongoing computation across interruptions: *"what I am doing
> now remains connected to what I was doing before."*

> **Joint-continuity** is the capacity to maintain continuity of a computation
> *distributed across interacting systems* — delegated work stays tracked,
> results come back, and external state joins the ongoing process.

> **Discontinuity** is any break in that connection: lost state, lost messages,
> duplicate or orphaned work, a resumed computation that cannot recognize what
> it was doing.

## Failure model

The failure classes the system faces:

| Failure type | Description |
| --- | --- |
| **Node failure** | a machine or service host becomes unavailable — reboot, crash, or sleep — silencing the services it hosts |
| **Process crash** | a service or background worker terminates unexpectedly, possibly mid-unit-of-work |
| **Network partition** | the persistence layer or an external dependency becomes unreachable, isolating services from state or from the world |
| **Message loss / delay** | notifications or results sent between services are lost, delayed, or delivered while the receiver is down |
| **Performance degradation** | load, slow external dependencies, or resource pressure stretch execution beyond expected times |
| **Data corruption / inconsistency** | partial writes, buggy processing, or out-of-band edits leave stored state inconsistent |

## Guarantees held today

| Guarantee | Status | Obligation |
| --- | --- | --- |
| **Checkpoint / resume** | guaranteed | every recurring acquisition records its progress; after any interruption, work resumes from the last recorded point |
| **Progress continuity** | guaranteed | completed work is never re-executed; re-delivery of already-recorded items changes nothing |
| **Execution-identity continuity** | guaranteed | a recurring obligation retains its identity across restarts and deployments |
| **Deduplication → exactly-once record effects** | guaranteed | a re-observed item collapses into the already-stored record; replays change nothing |
| **At-least-once processing + reconciliation** | guaranteed | work accepted by the system survives any interruption before processing; processing resumes from the durable record of the work, never from the notification |
| **Durable queue** | guaranteed | accepted-but-unprocessed work is held until it is processed or explicitly abandoned |
| **Failure detection / health** | guaranteed | every recurring obligation reports its state; stale, failing, and never-started obligations are visible |
| **Graceful degradation** | guaranteed | loss of the persistence layer reduces capability — it never destroys records or halts the whole system |
| **Resource reacquisition / process continuation** | guaranteed | services are stateless: a restarted process re-derives its state and continues where it left off |
| **Configuration continuity** | guaranteed | the declared configuration survives restarts and loss of the runtime store; it is not runtime state |
| **Codebase identity continuity** | guaranteed | any running state is reproducible from the repository |
| **Notification-channel independence** | guaranteed | notification channels are optimizations; correctness never depends on their durability |
| **Retry of failed obligations** | best-effort | failures are recorded and re-attempted next cycle, but there is no backoff or dead-letter policy |
| **Ephemeral exploratory state** | absent (by design) | exploratory, in-memory state is not preserved; a restart resets it — accepted for mock environments |

## Joint-continuity today

Computation is genuinely distributed: services, background executors, and the
deployment layer each hold part of the ongoing process.

| Delegation | Continuity of the link |
| --- | --- |
| **acquisition service → observation service** | best-effort: sweeps re-run on a timer, so a missed cycle self-heals; the service itself is hand-started and unsupervised (see gaps) |
| **edge collectors → ingestion** | best-effort: push at collection time; if the receiver is down at that moment, the batch is lost at the source — no store-and-forward |
| **services → background executors** | guaranteed: correctness rests on durable work records and reconciliation, never on the notification channel |
| **execution tool → record systems** | **absent** — results are posted without acknowledgment, retry, or record: a live joint-continuity gap |
| **operator → deployment** | guaranteed: the running system is always reproducible from the repository |

## Known discontinuities

Honest gaps — what the system does **not** yet guarantee, with the roadmap:

| Gap | Consequence | Roadmap |
| --- | --- | --- |
| **No backups of the persistent corpus** | loss of the persistence volume destroys observations, progress records, and accepted work — the one unrecoverable artifact | periodic backups to a second location; restore runbook |
| **Single persistence node** | no replication or failover; persistence-layer downtime means degraded mode for every store-backed sub-system | replication, or a scheduled snapshot-restore drill |
| **Unsupervised background services** | background services are hand-started; an interruption silently stops them until noticed | supervised services with health reporting into the system itself |
| **Unacknowledged result delivery** | delegated results can vanish silently | durable result records + retry |
| **Ingestion without store-and-forward** | work generated while the receiver is down is lost at the source | local spool on the emitter; drain on reconnect |
| **No backoff / dead-letter policy** | a failing dependency is retried every cycle at full cost | backoff policy; dead-letter state |

## The continuity loop

The minimal architecture, as the system realizes it:

```txt
COLLECT / COMPUTE            (application services — stateless)
   ↓
UPDATE STATE                 (acquired items, progress records, accepted work, derived projections)
   ↓
PERSIST STATE                (the durable store; declared configuration for desired state)
   ↓
   [INTERRUPTION]            (crash, redeploy, reboot, persistence-layer outage)
   ↓
RECOVER STATE                (restart: rehydrate from the durable store; re-read the declared configuration)
   ↓
RECONSTRUCT CONTEXT          (progress records → what was done; health → what failed)
   ↓
CONTINUE                     (the next cycle resumes; pending work drains)
   ↓
COLLECT / COMPUTE ...
```

Design rule this encodes: **all durable state lives in the durable store or the
declared configuration; every process is a stateless function of that state.**
Any mechanism that breaks the rule (in-memory sessions, fire-and-forget
delivery, hand-started services) is a listed discontinuity above, not an
accident.

## QA

Related topics: fault-tolerant systems · fault recovery · checkpoint/restart ·
state persistence · durable execution · message-delivery guarantees ·
idempotency · workflow recovery · self-healing systems · reliability
engineering.

## References

- Self-Continuation & Joint-Continuation note (formulation source); arXiv:2402.05244
- https://github.com/checkpoint-restore/criu
- https://en.wikipedia.org/wiki/Fault_tolerance
- https://en.wikipedia.org/wiki/Reliability_engineering
- Failure models in system / distributed system design (GeeksforGeeks)
- Companion specs: [`spec/wos/policy.md`](wos/policy.md) (poll-spec policy),
  [`spec/README.md`](README.md) (PVSM)
