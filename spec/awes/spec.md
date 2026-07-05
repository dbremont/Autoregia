# Automated Work Execution System

> This document establishes the conceptual foundations, data model, functionality,
> and implementation of an **Automated Work Execution System (AWES)**. An AWES is
> a technical object engineered to `execute computational work automatically` —
> it receives an action or command, provisions an execution environment, runs the
> work, captures the results, and feeds them back into the agent's operational
> and reflective systems.

> Within the Autoregia Personal Viable System Model (PVSM), AWES instantiates the
> **Execution** stage of the agent control loop and maps to **VSM System 1 –
> Operations (Execution)**: it *carries out* the actions that the deliberative
> cycle selects. Where AOOS organizes action constructs and records actuals,
> AWES performs the computational work itself — turning "action selected" into
> "action completed."

Fundamentally, an AWES exists to maintain persistent representations of the
**computational work** relevant for effective automated execution. These include:

- **Execution Environments** — sandboxed runtimes (shell, Python, Jupyter,
  container) with declared capabilities and resource limits.
- **Work Units** — the executable payload: a command string, script body, or
  notebook cell sequence, with an optional reference to a AOOS action.
- **Execution Sessions** — the record of a single dispatch: which environment,
  what was run, the output streams, exit code, timing, and produced artifacts.
- **Execution Artifacts** — files, data, or logs produced during execution,
  addressable by session and storable for later retrieval or reflection.

By preserving these across time, an AWES functions as an externalized
**execution substrate**, reducing the gap between intention and completion,
enabling automated task pipelines, and providing a verifiable trace of
computational actions for audit and reflection.

## Internal Composition

> AWES is composed of four cooperating components. The conceptual separation is
> real; the deployment boundary is one project.

```
AWES — Automated Work Execution System  (VSM System 1 – Execution)
 |
 +-- [E] Environment Manager
 |     \_ Provisions and manages execution environments: local shell, Python
 |        runtime, Jupyter kernels, Docker containers. Each environment
 |        self-describes its type, runtime version, capabilities, and limits.
 |
 +-- [T] Task Runner
 |     \_ Receives a work unit, selects/matches an environment, dispatches
 |        execution, monitors progress, enforces timeouts, returns results.
 |        One execution at a time per environment; concurrent across environments.
 |
 +-- [A] Artifact Capture
 |     \_ Captures stdout, stderr, exit code, timing, and produced file paths.
 |        Artifacts are addressable by session ID and carry MIME type metadata.
 |
 +-- [R] Result Feed
 |     \_ Pushes execution results into the feedback loop: writes a AOOS session
 |        (actuals), creates a PRS record (durable trace), signals PRAS (outcome
 |        for adaptation).
```

| Component | Role | Owns | Does NOT own |
| --- | --- | --- | --- |
| **[E] Environment Manager** | Environment lifecycle — "where to run" | Environment registry, provisioning, lifecycle, capability declarations | The work itself (that is [T]'s job) |
| **[T] Task Runner** | Work dispatch — "run this" | Work unit queue, dispatch, monitoring, timeout enforcement, result collection | The environment runtime (that is [E]'s job) |
| **[A] Artifact Capture** | Result preservation — "what came out" | Execution logs (stdout/stderr), exit codes, file artifacts, metadata | The durable event stream (PRS owns that) |
| **[R] Result Feed** | Feedback integration — "tell the agent" | AOOS session creation, PRS record linking, PRAS signal emission | The execution itself (that is [T]'s job) |

## Formulation

> How to think about an `Automated Work Execution System`?

An `Automated Work Execution System` is a technical object with the role of
externalizing **the agent's computational execution** to scaffold extended
agency:

- **execute without presence** — run scripts, queries, and computations while
  the agent attends to other work,
- **repeat without drift** — re-run the same work unit and get comparable
  results, with a verifiable trace,
- **compose without glue** — chain work units into pipelines where the artifact
  of one step feeds the next,
- **audit without guesswork** — every execution leaves a complete record:
  what ran, where, when, what came out.

### What is a Work Unit? What is its nature?

#### Principle

> A **work unit** is a self-contained executable specification: the *what* and
> the *how*, separated from the *where*. A work unit says "run this Python
> script" or "execute this shell command" — it does not say "on my laptop" or
> "in that container." The environment binding happens at dispatch time.

Conversely, a work unit is *not* a AOOS action construct. An action construct
says *why* and *when*; a work unit says *what exactly* and *how*. The same
action may produce different work units on different execution attempts.

#### (Case Set) When to use AWES

| Case | Description | Example |
| --- | --- | --- |
| Headless execution | Run a script without opening a terminal | `POST /api/execute` with a Python script body |
| Scheduled computation | A AOOS routine triggers a daily report | AWES pulls data, runs analysis, posts to PRS |
| Interactive exploration | A Jupyter notebook kernel managed by AWES | AWES provisions a kernel, the agent works through the UI, AWES captures the session |
| CI-style pipeline | A series of dependent work units | AWES runs lint -> test -> build, each step consuming the previous artifact |
| Reproducible audit | Re-run a past computation to verify a result | AWES replays a session in the same environment |

## Data Model

> AWES uses snake_case field naming. Enumerated values match the tables below.
> The canonical schema is defined in `schema.json`.

### Environment

An **environment** is a named, typed runtime that can execute work units.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `env_id` | `string` | Unique identifier (prefix `ENV-`). | `ENV-PYTHON-001` |
| `name` | `string` | Human-readable name. | "Python 3.12" |
| `env_type` | `enum` | One of `shell`, `python`, `jupyter`, `container`. | `python` |
| `status` | `enum` | `ready`, `busy`, `error`, `provisioning`. | `ready` |
| `runtime` | `string` | Runtime version or image reference. | `python:3.12-slim` |
| `capabilities` | `string[]` | Declared capabilities. | `["numpy", "pandas", "http"]` |
| `config` | `object` | Environment-specific configuration (env vars, resource limits). | `{"timeout_s": 300}` |
| `created_at` | `datetime` | ISO 8601 timestamp. | `2026-07-01T12:00:00Z` |

### Execution Session

An **execution session** records a single dispatch of a work unit.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `session_id` | `string` | Unique identifier (prefix `EXE-`). | `EXE-2026-00042` |
| `action_id` | `string?` | Optional link to a AOOS action construct. | `ACT-2026-00009` |
| `env_id` | `string` | The environment used. | `ENV-PYTHON-001` |
| `work_type` | `enum` | `command`, `script`, `notebook`. | `script` |
| `payload` | `string` | The command or script body. | `print("hello")` |
| `status` | `enum` | `pending`, `running`, `completed`, `failed`, `timed_out`. | `completed` |
| `exit_code` | `int?` | Process exit code (null while running). | `0` |
| `stdout` | `string` | Captured standard output. | `hello\n` |
| `stderr` | `string` | Captured standard error. | `""` |
| `started_at` | `datetime?` | ISO 8601. | `2026-07-01T12:00:00Z` |
| `ended_at` | `datetime?` | ISO 8601. | `2026-07-01T12:00:05Z` |
| `duration_ms` | `int?` | Wall-clock duration in milliseconds. | `5123` |
| `artifacts` | `Artifact[]` | List of produced artifacts. | `[]` |

### Artifact

An **artifact** is a file or data object produced during execution.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `artifact_id` | `string` | Unique identifier. | `ART-001` |
| `session_id` | `string` | Owning session. | `EXE-2026-00042` |
| `path` | `string` | File path or logical name. | `output.csv` |
| `mime_type` | `string` | MIME type. | `text/csv` |
| `size` | `int` | Size in bytes. | `2048` |
| `content` | `string?` | Inline content for small artifacts. | `a,b,c\n1,2,3\n` |

## Evaluation

> An AWES implementation is evaluated against the following criteria.

| Criterion | Description | Measure |
| --- | --- | --- |
| **Isolation** | Environments do not interfere with each other or the host | Subprocess isolation; container boundary for production |
| **Determinism** | Same work unit + same environment → same result (modulo time) | Repeatable exit code and output on re-run |
| **Observability** | Every execution produces a complete, inspectable record | stdout, stderr, exit code, timing, artifacts all captured |
| **Safety** | Work units cannot escape their resource or capability limits | Timeout enforcement; read-only filesystem where possible |
| **Feedback** | Results reach the agent's operational and reflective systems | AOOS session created; PRAS signal emitted |
| **Simplicity** | The system is easy to understand, run, and extend | Single Flask process; in-memory store for prototyping |

## Implementation

> The initial prototype targets **local subprocess execution** with an in-memory
> session store. Container-based isolation and Jupyter kernel management are
> future iterations.

### Function Set

- `environments.list()` — return all registered environments
- `environments.get(env_id)` — return a single environment
- `environments.register(env)` — register a new environment
- `sessions.create(work_unit)` — dispatch a work unit (creates session, runs synchronously)
- `sessions.get(session_id)` — return session with output
- `sessions.list(filter)` — list sessions with optional filters

### Technical Elements

- **Framework:** Flask (consistent with sibling prototypes)
- **Storage:** In-memory (Python dict) for the prototype; future migrations to
  SQLite or CouchDB for persistence.
- **Execution:** `subprocess.run()` with timeout and environment isolation.
  Jupyter execution via `jupyter nbconvert --execute` or kernel gateway API.
- **Port:** 5010

### Prototype

The prototype in [`awes/`](../../awes/) implements:
- `GET /api/environments` — list environments
- `POST /api/environments` — register a new environment
- `POST /api/execute` — execute a work unit (command or Python script)
- `GET /api/sessions` — list execution history
- `GET /api/sessions/<id>` — get session with full output
- `DELETE /api/sessions` — clear all sessions

Security: the prototype runs commands **without sandboxing**. It is intended for
local, single-user use only. Container isolation is required for multi-tenant or
production deployment.

## References

- [AOOS — spec](../aoos/spec.md) — the operations system AWES feeds into
- [PRS — spec](../prs/spec.md) — durable event stream for execution traces
- [PRAS — spec](../pras/spec.md) — reflection and adaptation on execution outcomes
- [Autoregia UI Specification](../ui.spec) — shared UI standard
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6)
