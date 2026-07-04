# Automated Work Execution System

> An **Automated Work Execution System (AWES)** is a technical object engineered to
> `bridge action selection and action completion` — it provisions computational
> environments, dispatches work units to them, captures artifacts, and feeds
> results back into the agent's operational and reflective systems.

> Within the Autoregia Personal Viable System Model (PVSM), AWES instantiates the
> **Execution** stage of the agent control loop and maps to **VSM System 1 –
> Operations (Execution)**. Where PWOS organizes *what* to do, AWES *does* it —
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
  referenced by PRS records or PWOS action sessions.
- **[R] Result Feed** — pushes execution results into the agent's feedback loop:
  writes a PWOS session (actuals), creates a PRS record (durable trace), and
  signals PRAS (outcome for reflection).

## Spec

- [Full specification](spec.md)

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md)
- **Role:** VSM System 1 – Operations (Execution)
- **Sibling sub-projects:** [PRS](../../spec/prs/), [PKTS](../../spec/pkts/),
  [PTOCS](../../spec/ptocs/), [PPS](../../spec/asrs/pps/), [PWOS](../../spec/pwos/),
  [PRAS](../../spec/pras/)
- **Shared UI standard:** [`../ui.spec`](../ui.spec)
- **Decision log:** [`../../logos.log.md`](../../logos.log.md)

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6)
