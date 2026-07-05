# Autoregia Agency Dashboard — Specification

> This document specifies the **Autoregia Agency Dashboard** (`loop/`): a read-only
> analytical dashboard presenting aspects of the agent's **agency** — the agent
> interacting with its environment. It is a set of instruments over the data the
> agent generates about itself and its world, in service of self-management.

> It is **not** a VSM system-map surface. Its organizing concept is the **agent**
> ([`spec/about.md`](../about.md)): an adaptive control system that perceives an
> environment, decides, acts, and regulates itself through feedback. The dashboard
> makes the facets of that agency inspectable.

## Formulation

> How to think about an `Agency Dashboard`?

An `Agency Dashboard` is a technical object with the role of externalizing
**analytical visibility over the agent's own operation** to scaffold extended
agency. It exists to:

- let the agent **see** what its world is doing and what it is doing in it;
- surface the state of its finite **reserves** before they are depleted;
- expose the relationship between **action and outcome** — what the agent causes;
- show where its scarcest resource, **attention**, actually goes (vs. stated intent);
- track its **obligations** and whether it keeps them; and
- show where its hours actually go — the truest measure of its priorities.

It observes; it does not steer. Steering belongs to the operational systems; this
dashboard is the mirror they are steered against.

## Scope

The dashboard addresses the **analytical-visibility** dimension of self-management:

- Present each aspect of agency as a focused analytical instrument.
- Derive every indicator from the data the agent already generates.
- Stay read-only and substrate-agnostic (it owns no data; it reads the organs').
- Compute live, with a window selector that re-derives everything instantly.

## The Agent Model (basis)

Per [`spec/about.md`](../about.md), the agent is a system that maintains its
existence and pursues objectives through regulated interaction with an environment.
Its components: Identity, Objectives, World (External · Internal), Internal State
(beliefs, memory, **resources**, capabilities), Perception, Decision, Action,
Feedback, Regulation, Learning.

Two foundational reconceptions ground the dashboard's aspects:

- **The external environment** is modeled as a bounded region of state — entities,
  resources, other agents — perceived through a time-ordered stream of **discrete
  events** of four kinds: *occurrence* (independent happening), *outcome*
  (consequence of the agent's own action), *trigger* (time/condition-based), and
  *observational* (a reading the agent actively takes).
- **The internal environment** is the agent's stateful substrate: finite,
  depletable, renewable **essential variables** — time, energy, attention, money —
  plus beliefs/models, commitments, and capabilities. These are the variables the
  loop exists to regulate.

## Aspects

Each aspect is one panel and one analytical tool. The prototype implements seven.

### Overview
A dense at-a-glance across all aspects: essential-variable gauges, headline
counts, environment event rate & kind mix, attention share, execution-vs-outcome,
deep-work hours & share, and an environment activity heatmap.

### Environment
The world as an event stream: per-kind rate over time, kind composition, an
hour×weekday activity heatmap, mean valence, the most active entities and domains,
high-magnitude events, and a recent-events log.

### Internal State
The agent's reserves: energy · attention · focus · sleep trajectories against
viable bands; time-used vs capacity (overload); and depletion events (days a
reserve fell below threshold).

### Action & Outcome
The execution arc and its feedback: actions executed vs outcomes observed,
capacity bands consumed, effort-estimate-vs-actual calibration (scatter), session
duration distribution, and a recent-sessions log.

### Attention
Where the scarcest resource goes: attention by domain over time (stacked), share,
drift (recent-minus-prior trend per domain), and the most-attended subjects.

### Commitments
The social/intentional state: obligations, open vs kept vs overdue, a reliability
gauge, distribution by domain, and upcoming deadlines.

### Time & Rhythm
The most concrete measure of agency — spent time: hours by domain and project,
deep/shallow/low mode split over time, the weekly rhythm, and the hour×weekday
map of when work happens (the natural focus windows).

## Data Model (the substrate)

The dashboard owns no data. The prototype's mock substrate (`data/mock_loop.json`)
is one concrete instance of what the organs produce. Its relevant projections:

| Collection | Source aspect | Selected fields |
| --- | --- | --- |
| `records` | perception / beliefs / commitments | `record_type`, `state_class`, `domain`, `subject`, `status`, `priority`, `confidence`, `evidence_level`, `source_type`, `created_at`, `deadline?` |
| `environment_events` | environment | `type` (occurrence/outcome/trigger/observational), `entity_id`, `entity_name`, `kind`, `domain`, `occurred_at`, `valence`, `magnitude` |
| `entities` | environment | `id`, `name`, `kind`, `domain`, `salience` |
| `sessions` | action | `action_id`, `started_at`, `ended_at`, `duration_min`, `capacity_band`, `domain`, `status` |
| `actions` | action | `kind`, `status`, `effort_estimate_h`, `registered_at`, `completed_at?`, `domain` |
| `essential_variables` | internal state | `date`, `time_used_h`, `time_capacity_h`, `energy`, `attention`, `focus_pct`, `sleep_h`, `money_spent` |
| `deliberations` | reflection | `type`, `status`, `date`, `domain`, `source_session?` |

## API

The server serves the raw substrate; every indicator is computed client-side so
the window selector is instant.

| Endpoint | Description |
| --- | --- |
| `GET /api/dataset` | The full raw substrate. |
| `GET /api/summary` | Headline counts + window metadata. |
| `GET /api/orgs` | Organ metadata (for reference). |
| `GET /api/export` | Full substrate (JSON download). |

## Interaction Model

- **Window selector** — 7 / 30 / 90 / All days, applied to every indicator at once.
- **Command palette** — `Ctrl/Cmd + K` (navigation + substrate search).
- **Quick capture** — `Ctrl/Cmd + Shift + N`.
- **Esc** dismisses overlays.
- Keyboard, progressive disclosure, focus rings, reduced-motion and reduced-transparency guards per `ui.spec`.

## Conformance

Implements the [`Autoregia UI Specification`](../ui.spec): warm-parchment Oxford
aesthetic, `variables.css` token vocabulary, Spectral/Inter/IBM Plex Mono type
system, app-shell layout, the §7 component catalog, the §8 interaction model, and
self-hosted offline-first fonts/icons. ECharts is themed **within** the design
system (palette and typography reference the tokens, not an alien theme).

## Evaluation

An Agency Dashboard is evaluated against:

| Criterion | Description |
| --- | --- |
| Aspect Coverage | Every aspect of agency has a faithful instrument. |
| Substrate Fidelity | Indicators derive cleanly from the agent's actual data. |
| Read-Only Posture | The dashboard never mutates state; it only observes. |
| Live Responsiveness | The window selector re-derives all indicators instantly. |
| Legibility | Dense yet calm; tabular figures, clear hierarchy, no ornament. |
| Decision Relevance | The panels surface what self-management actually needs to act on. |

## Status

Prototype on a deterministic mock substrate. The information architecture and the
analytical grammar are fixed; the metrics become real as the organs' feeds come
online (PRS records, the environment event stream, PKTS attention accounting, AOOS
sessions). Aspects whose feeds are not yet real render as the shape of the real
thing on mock data.

## References

- [`spec/about.md`](../about.md) — the agent, the agent control loop, the environment & internal-environment reconceptions.
- [`spec/ui.spec`](../ui.spec) — canonical UI standard.
- [PRS spec](../prs/spec.md), [AOOS spec](../aoos/spec.md), [PKTS](../pkts/README.md), [PRAS spec](../pras/spec.md) — the organs whose data the dashboard reads.
