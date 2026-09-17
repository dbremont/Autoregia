# Autoregia Dependability — Fault Tolerance & Continuity

> **Status:** adopted (2026-09). **Scope:** the whole system — all sub-systems,
> their collectors, CouchDB, and the container/deployment layer.
>
> This document states the **dependability guarantees of the system**: which
> failures it tolerates, how it preserves **continuity** (recoverability), and
> where continuity is still broken. It applies the *Self-Continuation /
> Joint-Continuation* formulation — the ability of a computational system to
> **maintain, recover, and continue its own ongoing computational process
> across time, interruptions, or failures** — to Autoregia's concrete
> mechanisms. Every guarantee below is classified honestly:
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

The failure classes the system actually faces, with their concrete instances
here:

| Failure type | Instances in Autoregia |
| --- | --- |
| **Node failure** | host reboot; `autoregia` / `couchdb` container crash; desktop sleep kills the PKTS/PWTS/WOS collectors |
| **Process crash** | Flask server exception; RQ worker death mid-batch; collector daemon killed |
| **Network partition** | CouchDB unreachable from the server; nitter mirror down; an external feed timing out; Redis down |
| **Message loss / delay** | fire-and-forget result POSTs (CES → AOOS/PBS); ingest POST from a desktop collector while the server is down |
| **Performance degradation** | feed polls stacking behind a slow mirror; embedding model load on first Recompute; disk pressure on the CouchDB volume |
| **Data corruption / inconsistency** | a bad batch written by a worker; a partially updated view; stale seed assumptions after manual DB edits |

## Guarantees held today

| Guarantee | Status | Mechanism | Where |
| --- | --- | --- | --- |
| **Checkpoint / resume** (polling continues from the last known point) | guaranteed | per-source poll cursors persist `last_fetched_ms`, `last_observed_ms`, `last_error`, `error_count` as `STATE-<id>` docs; each sweep resumes from them | `wos` collector + `wos/server.py` |
| **Progress continuity** (completed work is not redone) | guaranteed | cursors advance only on success; `since_ms` filters re-delivery | `wos/sources/*.py` |
| **Execution-identity continuity** (a spec is recognized across restarts) | guaranteed | stable spec `id` keys the cursor; observations key on `obs_id` | `config/seed.json`, `wos/sources/base.py` |
| **Deduplication → exactly-once store effects** | guaranteed | `obs_id = sha1(source:native_id)`; `Store.put` upserts by application id — replays collapse into one durable document | `wos/sources/base.py`, `support/storage/` |
| **At-least-once processing + reconciliation** (PKTS/PWTS) | guaranteed | ingest persists the raw batch to CouchDB **first**, enqueue second; a Redis outage loses nothing — the worker drains *every* unprocessed batch, not just the notified one | `pkts/server.py` (`ingest`), `pkts/worker.py` |
| **Durable queue** | guaranteed (CouchDB as the queue) | unprocessed batches live as documents until a worker marks them processed | `pkts_raw` / `pwts_raw` |
| **Failure detection / health checking** | guaranteed | cursor-derived per-source health (`healthy / degraded / failing / pending`) surfaced on the Sources plate | `wos/server.py` (`/api/sources/status`) |
| **Graceful degradation** (partial continuity) | guaranteed | AOOS falls back to `data/*.json` fixtures when CouchDB is down; analytics degrade to empty states instead of erroring | `aoos`, `wos/static/js/*` |
| **Resource reacquisition / process continuation** | guaranteed | the server is stateless: on restart it rehydrates from CouchDB + `seed.json`; containers run `--restart unless-stopped` | `app/app.py`, `Makefile`, Dockerfile |
| **Configuration continuity** (desired state survives restarts and DB loss) | guaranteed | `config/seed.json` is committed, read directly on every `/api/sources` — the watched set is not DB state | `wos/config/seed.json`, `spec/wos/policy.md` |
| **Codebase identity continuity** | guaranteed | git history + GHCR image tags; every deploy is a named, recoverable artifact | CI (GitHub Actions) |
| **Retry of failed feeds** | best-effort | `error_count`/`last_error` recorded per spec; the sweep retries next interval — but there is no exponential backoff or dead-letter | `wos` collector |
| **Joint work tracking (RQ)** | best-effort | Redis queues `pkts`/`pwts` are ephemeral; correctness relies on the CouchDB reconciliation above, not on Redis durability | `pkts/tasks.py`, `pkts/worker.py` |
| **Ephemeral sub-system state** (CES sessions, in-memory caches) | absent (by design) | CES sessions are in-memory; a restart resets them — accepted, since they are exploratory mock environments | `ate/tool/ces` |

## Joint-continuity today

Computation is genuinely distributed: server, collectors, workers, and
container infrastructure each hold part of the ongoing process.

| Delegation | Continuity of the link |
| --- | --- |
| **collector daemon → server** (`GET /api/sources`, `POST /api/poll`) | best-effort: the daemon sweeps on a timer and re-asks every cycle, so a missed sweep self-heals; but the daemon itself is **hand-started and unsupervised** (see gaps) |
| **desktop collectors → ingest** (PKTS/PWTS batches) | best-effort: push over HTTP; if the server is down *at push time* the batch is lost — there is no store-and-forward on the collector side |
| **server → RQ workers** | guaranteed via CouchDB reconciliation (above); Redis is an optimization, not a source of truth |
| **CES → AOOS / PBS** (result posts) | **absent** — fire-and-forget POSTs with no acknowledgment, retry, or record. If the receiver is down, the result vanishes: a live joint-continuity gap |
| **operator → deployment** (`make deploy-*`, CI) | guaranteed: images are rebuilt from git; the running system is always reproducible from the repository |

## Known discontinuities

Honest gaps — what the system does **not** yet guarantee, with the roadmap:

| Gap | Consequence | Roadmap |
| --- | --- | --- |
| **No CouchDB backups** | host/volume loss destroys the whole corpus (observations, cursors, batches) — the one unrecoverable artifact | periodic `couchdb-dump`/replication to a second location; restore runbook |
| **Single-node CouchDB** | no replication, no failover; DB downtime = degraded mode for every store-backed sub-system | 2-node replication or scheduled snapshot restore drill |
| **Unsupervised collectors** | the WOS collector (and desktop collectors) are hand-started; a host reboot silently stops perception until noticed | systemd units / supervised processes with health reporting into WOS itself |
| **No ack/retry on result feeds** (CES → AOOS/PBS) | joint-continuity break: delegated results can vanish silently | durable result documents + retry, or route results through CouchDB instead of POSTs |
| **Collector push without store-and-forward** | PKTS/PWTS batches generated while the server is down are lost at the source | local spool on the collector; drain on reconnect |
| **No backoff / dead-letter for failing feeds** | a dead mirror is retried every sweep at full cost | backoff policy in the cursor; dead-letter state |

## The continuity loop

The note's minimal architecture, as instantiated here:

```txt
COLLECT / COMPUTE            (server, collectors, workers — stateless)
   ↓
UPDATE STATE                 (observations, cursors, batches, clusters doc)
   ↓
PERSIST STATE                (CouchDB documents; seed.json for desired state)
   ↓
   [INTERRUPTION]            (crash, redeploy, host reboot, DB outage)
   ↓
RECOVER STATE                (restart: rehydrate from CouchDB; re-read seed)
   ↓
RECONSTRUCT CONTEXT          (cursors → what was fetched; health → what failed)
   ↓
CONTINUE                     (next sweep resumes; workers drain; user re-renders)
   ↓
COLLECT / COMPUTE ...
```

Design rule this encodes: **all durable state lives in CouchDB or committed
files; every process is a stateless function of that state.** Any mechanism
that breaks the rule (in-memory sessions, fire-and-forget posts, hand-started
daemons) is a listed discontinuity above, not an accident.

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
