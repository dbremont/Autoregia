# Computation Execution System

> An **Computation Execution System (CES)** is a technical object engineered to
> `bridge action selection and action completion` — it provisions computational
> environments, dispatches work units to them, captures artifacts, and feeds
> results back into the agent's operational and reflective systems.

> Within the Autoregia Personal Viable System Model (PVSM), CES instantiates the
> **Execution** stage of the agent control loop and maps to **VSM System 1 –
> Operations (Execution)**. Where AOOS organizes *what* to do, CES *does* it —
> programmatically.

## Components

- **[E] Environment Manager** — provisions and manages execution environments
  (shell, Python runtime, Jupyter kernels, containers). Environments are
  self-describing: each declares its type, runtime, capabilities, and resource
  limits.
- **[T] Task Runner** — receives a work unit (command, script, or notebook),
  selects or creates an appropriate environment, dispatches execution, monitors
  progress, enforces timeouts, and returns the result.
- **[A] Artifact Capture** — records stdout, stderr, exit codes, produced files,
  and execution metadata. Artifacts are addressable by session and can be
  referenced by PBS records or AOOS action sessions.
- **[R] Result Feed** — pushes execution results into the agent's feedback loop:
  writes a AOOS session (actuals), creates a PBS record (durable trace), and
  signals PRAS (outcome for reflection).

## Spec

- [Full specification](spec.md)

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md)
- **Role:** VSM System 1 – Operations (Execution)
- **Sibling sub-projects:** [PBS](../../spec/pbs/), [PKTS](../../spec/pkts/),
  [PTOCS](../../spec/ptocs/), [AGS](../../spec/ags/ags/), [AOOS](../../spec/aoos/),
  [PRAS](../../spec/pras/)
- **Shared UI standard:** [`../ui.spec`](../ui.spec)
- **Decision log:** [`../../log.md`](../../log.md)

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6)
