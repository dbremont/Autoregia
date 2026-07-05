# Personal Application Interaction System (PAIS)

> PAIS is the **Personal Application Interaction System** — an Autoregia
> sub-project within the **Accounting System** (VSM System 3 – Audit /
> Accounting). It records how the agent *interacts* with applications (mouse
> pointer, clicks, scroll, and the focused-window timeline) and joins that
> telemetry with the [PKTS](../pkts/README.md) keystroke stream to surface
> **application-interaction analytics**: where time is spent, how attention is
> fragmented, and how input is distributed across apps.

> PAIS is a sibling of [PKTS](../pkts/README.md). The two share a single source
> of truth for the focused window — [`shared/focus_watcher.py`](../shared/) — so
> every keystroke (owned by PKTS) and every mouse event + focus segment (owned
> by PAIS) carries identical application attribution.

## Scope

PAIS owns three signals that PKTS does not:

- **Mouse events** — button presses/releases, scroll ticks, and sampled pointer
  movement (coalesced to ~5 Hz or on direction change, never raw kernel rate).
- **Focus timeline** — segments of continuous focus on one window
  `(app, title, window_id, started_ms, ended_ms)`, the authoritative record of
  "where the user's attention was".
- **Interaction analytics** — the join of PAIS mouse/focus with PKTS keystrokes:
  time-per-app, click-rate, keystrokes-per-click, app-switch frequency,
  focus-fragmentation index, idle gaps, click-coordinate heatmaps.

It does **not** re-capture keystrokes; those remain PKTS's contract. PAIS reads
the processed `pkts` CouchDB database read-only for the join.

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Sibling:** [PKTS](../pkts/README.md) — the keystroke stream PAIS joins with.
- **Shared module:** [`shared/focus_watcher.py`](../shared/) — focused-window
  source of truth (X11 + Wayland backend chain).
- **Decision log:** [`logos.log.md`](../logos.log.md).

## Status

Skeleton — conceptual foundations, schema, and collector in progress.
