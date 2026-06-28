# Personal Work Organization System (PWOS)

> PWOS is the **Personal Work Organization System** — an Autoregia sub-project
> within the **Operations System** (VSM System 1 – Operations). It lifts the
> action-bearing states recorded in the PRS into a steerable, dependency-aware,
> capacity-checked, and calendar-coordinated execution structure, and it keeps
> that structure synchronized with the platforms the agent actually operates
> through.

> PWOS is a single System 1 composite of three cooperating components. The
> conceptual separation between them is real; the deployment boundary is one
> project.

## Components

- **[A] Work Organization & Registration** — the action hierarchy. Manages *action
  constructs* (tasks, projects, routines, commitments, initiatives, objectives)
  and their dependency graph. Operates **over** PRS records (the single source of
  truth) plus a thin operational extension (dependencies, effort estimates,
  scheduling state). This is *"what to do."*
- **[B] Work Calendarization** — the **calendar system**. Takes the logical action
  structure and resolves it against a concrete timeline: recurrence expansion,
  deadline projection, conflict detection, workload-vs-capacity checks, policy
  gating. This is *"when, against the real calendar."*
- **[C] Platforms Integration** — the boundary with the outside world. Adapters
  normalize external systems into PWOS terms. **Google Calendar** is the primary
  platform (OAuth 2.0, two-way sync). This is *"how it connects."*

> [B] and [C] together realize what the original formulation called *Work
> Calendarization*: [C] brings the platform's calendar in, [B] reasons over it.

## Spec

The conceptual foundations, data model, calendar model, Google Calendar
integration architecture, evaluation criteria, and implementation guidance live
in [`spec.md`](spec.md).

## Documentation

Detailed, user-facing documentation is [`docs.html`](docs.html) — a standalone,
self-contained page (Autoregia parchment aesthetic, no external dependencies).
The PWOS prototype serves it at `GET /docs` (see the prototype README), and the
in-app **Help** modal (`F1`) links to it for the full reference.

## Google Calendar setup (Component C)

> Concrete OAuth credentials are **not** part of this repository. The agent
> provides them out-of-band.

1. Create a Google Cloud project; enable the **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (application type: *Desktop app*).
3. Download the client secret as `client_secret.json` and place it in the PWOS
   config location (documented in the prototype README; never committed).
4. On first run, PWOS performs the interactive consent flow and stores the refresh
   token locally (encrypted at rest).
5. Select which calendars to sync (e.g., `primary`, `work`, `personal`).

Scopes: `https://www.googleapis.com/auth/calendar` (read/write) for two-way sync,
or `calendar.readonly` for a read-only deployment.

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Operations System** (VSM System 1 – Operations) — organizes and
  executes the agent's operative action.
- **Storage substrate:** [PRS](../../prs/) — PWOS operates over PRS records; it is
  not a competing record store.
- **Sibling sub-projects:** [PRS](../../prs/), [PKTS](../../pkts/), [PTOCS](../../ptocs/), [PPS](../../pps/).
- **Shared UI standard:** [`../ui.spec`](../ui.spec).
- **Decision log:** [`../../logos.log.md`](../../logos.log.md).

## References

- [PWOS — spec](spec.md) — conceptual foundations, data model, calendar & integration architecture.
- [Agency — Execution Architecture](https://bremontix.xyz/lab/ar/Locus-Social-Realitatis/Onto/Guide/Agency/#execution-architecture) — the originating execution-architecture reference.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
