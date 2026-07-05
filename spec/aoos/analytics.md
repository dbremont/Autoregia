# AOOS Analytics Dashboard

> This document specifies the **Analytics Dashboard** for the Personal Work
> Organization System. It is a *measurement surface* — a read-only view that
> turns the agent's recorded action (and, by adapter, the platforms that record
> it) into the indicators defined in the parent spec's
> [Evaluation](spec.md#evaluation) section.

> Within the Autoregia Personal Viable System Model (PVSM), the Analytics
> Dashboard is a **System 3\* (Audit)** instrument: it does not steer action
> (that is System 1 / AOOS itself, or System 3 Control); it *observes* what was
> done, exposes divergence from intention, and feeds the regulatory systems the
> evidence they need to regulate. It is the S1↔S3 capacity channel, made visible.

The dashboard is prototyped against a **Todoist-shaped dataset** (`app.todoist`):
projects, items (tasks), labels, priorities, due dates, and completion events.
The Todoist shape is a concrete, well-understood projection of AOOS action
constructs — a *platform adapter* in the sense of Component [C]. The metrics,
however, are platform-neutral: they are defined over the AOOS action model and
the Todoist data is one (fake) instance of it.

## Scope of the Prototype

> The prototype is **fake** in two senses, deliberately.

1. **The dataset is synthetic.** A deterministic generator
   (`aoos/data/gen_todoist_mock.py`) produces a plausible, year-long Todoist
   export — ~120 projects, ~3 000 items, ~1 200 labels — with realistic
   seasonality, weekday/weekend rhythm, completion delay, and overdue backlog.
   No real user data is used.
2. **The metrics are computed, not measured.** The indicators are derived
   purely from the dataset; no measurement infrastructure (PKTS capacity
   channels, PPS policy evaluation) is wired in. The dashboard shows *what the
   shape of the real thing will be*.

The objective is to fix the **information architecture** — which indicators
matter, how they are grouped, and how they read in the design system — before
the real data and the real measurement channels exist.

## Data Model — the Todoist Projection

> The dashboard operates over a Todoist-shaped dataset. The mapping below is the
> adapter contract: how an external platform's objects become AOOS terms.

### `projects`

| Field | Description | Example |
| --- | --- | --- |
| `id` | Platform project id. | `"2329934714"` |
| `name` | Human-readable name. | `"AOOS Prototype"` |
| `color` | Platform color label. | `"blue"` |
| `color_hex` | Resolved hex (for charts). | `"#3F6092"` |
| `is_favorite` | Starred in the platform. | `true` |
| `is_archived` | Archived (excluded from active backlog). | `false` |
| `parent_id` | Parent project id (nested projects). | `null` |
| `view_style` | `"list"` / `"board"` / `"calendar"`. | `"list"` |

### `items` (tasks)

| Field | Description | Example |
| --- | --- | --- |
| `id` | Platform item id. | `"6784329105"` |
| `content` | The task title. | `"Implement search index"` |
| `project_id` | Owning project. | `"2329934714"` |
| `section_id` | Section within the project (nullable). | `null` |
| `priority` | Todoist priority. `1` = urgent (red), `4` = normal (grey). | `3` |
| `labels` | Free-form tags. | `["@deep", "eng"]` |
| `due_date` | ISO date the item is due (nullable). | `"2026-06-28"` |
| `is_recurring` | Recurrence flag. | `false` |
| `created_at` | ISO 8601 timestamp. | `"2026-04-01T09:12:00Z"` |
| `completed_at` | ISO 8601 timestamp when closed (null if open). | `null` |
| `is_completed` | Convenience flag (`completed_at != null`). | `false` |
| `user_id` | Assignee (single-user in the prototype). | `"4298376"` |

### `labels`

| Field | Description | Example |
| --- | --- | --- |
| `id` | Platform label id. | `"2156147820"` |
| `name` | Label text. | `"@deep"` |
| `color` / `color_hex` | Resolved chart color. | `"#B4742A"` |
| `item_count` | Denormalized membership count (cache). | `412` |

### Projection to AOOS

| Todoist object | AOOS action construct | Notes |
| --- | --- | --- |
| `project` | `Project` kind | `strategic.project` ← project `id`. |
| `item` (open or completed) | `Task` kind | `record_type: Task`; deadline ← `due_date`. |
| `item.priority` | `priority` (Critical/High/Medium/Low) | `1→Critical`, `2→High`, `3→Medium`, `4→Low`. |
| `item.completed_at` | `scheduling_state: done` | Drives Completion Rate & throughput. |
| `item.due_date` < today & open | `scheduling_state: deferred` + overdue | Drives Deadline Adherence & backlog aging. |
| `label` | `tags[]` | Cross-domain harmonization dimension. |

## Indicators

> The indicators are organized by the AOOS evaluation families. Each indicator
> names its source dataset field(s) so the prototype computation is auditable.

### Composite Indices (hero)

> Three single-number health readings, each a weighted composite of auditable
> sub-components. They are the dashboard's "executive summary" — the first thing
> the regulator sees, and the entry point into the detail below. Every component
> is exposed in the payload so the index is decomposable, not a black box.

#### Productivity Index (0–100, higher is better)

A viability score combining throughput, reliability, consistency, and trajectory.
Bands: `0–40` critical · `40–70` developing · `70–100` viable.

| Component | Weight | Definition |
| --- | --- | --- |
| Completion Rate | 0.30 | `Completed ÷ (Completed + Open)` over the window, ×100. |
| Deadline Adherence | 0.30 | Share of completed-due items closed on/before due, ×100. |
| Throughput Consistency | 0.20 | `100 − normalized(σ² of daily completions)`. Lower variance → higher score. |
| Backlog Trajectory | 0.20 | Is the backlog shrinking? `100 × clamp(1 − netflow/created)`; netflow = created−completed. |

#### Backlog Pressure Index (0–100, lower is better)

How hard the open backlog is pressing. Captures size, staleness, overdue weight,
and inflow/outflow imbalance in one number.

| Component | Weight | Definition |
| --- | --- | --- |
| Open Load | 0.30 | `Open ÷ Total` (share of all work still on the plate). |
| Overdue Weight | 0.30 | `Overdue ÷ max(1, Open)`. |
| Aging | 0.25 | `mean(open age in days) ÷ 90`, clamped to 1. |
| Inflow/Outflow Imbalance | 0.15 | `(created − completed) ÷ max(1, created)` over the window, clamped to 1. |

#### Cognitive Fragmentation Index (0–100, lower is better)

How scattered focus is — a proxy for context-switching cost. Novel to this
dashboard. Combines project breadth, label breadth, and within-day switching.

| Component | Weight | Definition |
| --- | --- | --- |
| Project Breadth | 0.35 | Mean distinct `project_id` touched per active day, normalized against the 90th-percentile breadth. |
| Label Breadth | 0.30 | Mean distinct labels touched per active day, normalized. |
| Switch Rate | 0.35 | Mean within-day project transitions in completion order, normalized. |

> These three indices surface what no single chart can: a holistic viability
> reading. **Caveat:** the Fragmentation index is computed from completion
> timestamps + project/label switching; the true context-switch cost arrives
> with the PKTS attention feed. Until then it is a *behavioural proxy*.

## Personal Performance Goals

> The dashboard's highest layer. A set of **generic, measurable performance
> goals** — about *how* the agent operates, not *what* they ship. They are the
> S4/S5 (Policy/Intelligence) intention; the rest of the dashboard is the S3\*
> evidence of whether the agent is becoming the operator it intends to be.

> These goals are intentionally project-agnostic. "Execute reliably" does not
> mean "ship AOOS"; it means *whatever you commit to, you close on time*. They
> are therefore stable across changes of project, role, or season — and they
> compose directly into the [Evaluation](spec.md#evaluation) families.

### Framework

Each **Goal** is an outcome statement carrying 3 **Key Results** (KRs). Each KR
binds a named `metric` to a `target` and a `direction` (`gte` = higher is
better, `lte` = lower is better). Progress and status are computed live from
the same window the rest of the dashboard operates on.

| Goal | Family | Horizon | Key Results |
| --- | --- | --- | --- |
| **Execute reliably** | Commitment Reliability | rolling 30d | deadline adherence ≥ 85% · overdue backlog ≤ 50 items · P1 slip rate ≤ 20% |
| **Sustain a steady cadence** | Execution Throughput | rolling 30d | ≥ 40 completed/week · throughput stability σ² ≤ 15 · ≥ 5 active days/week |
| **Protect deep-work capacity** | Capacity / Focus | rolling 30d | fragmentation index ≤ 50 · weekend overflow ≤ 15% · peak-window utilization ≥ 60% |
| **Keep the backlog healthy** | Capacity Adherence | rolling 30d | backlog net flow ≤ 0 · no open item older than 90 days · cycle-time p50 ≤ 7 days |
| **Operate sustainably** | Viability Contribution | rolling 30d | productivity index ≥ 70 · backlog pressure index ≤ 40 · review cadence consistency ≥ 75% |

### Measurement Contract

Each KR's `metric` is a key into the computed analytics payload, so every goal
is auditable against a concrete computation:

| Metric | Definition | Source |
| --- | --- | --- |
| `deadline_adherence` | % of completed-with-due items closed ≤ due date | `completed_at` vs `due_date` |
| `overdue_count` | open items past `due_date` | open + `due_date < today` |
| `p1_slip_rate` | % of completed P1 items that missed deadline | priority=1 completions |
| `weekly_throughput` | mean completions per ISO week over the window | `completed_at` |
| `stability_variance` | σ² of daily completions | `completed_at` per day |
| `active_days_per_week` | mean days/week with ≥ 1 completion | `completed_at` |
| `fragmentation_index` | the composite fragmentation index (see above) | derived |
| `weekend_overflow` | % of completions on Sat/Sun | `completed_at` weekday |
| `peak_window_utilization` | % of completions in the top 2-hour band | `completed_at` hour |
| `backlog_netflow` | `created − completed` over the window | `created_at`/`completed_at` |
| `max_open_age` | oldest open item's age in days | open `created_at` |
| `cycle_p50` | median `created → completed` in days | derived |
| `productivity_index` | the composite productivity index | derived |
| `backlog_pressure_index` | the composite backlog-pressure index | derived |
| `review_cadence_consistency` | % of weeks with a recurring "review" completed | recurring + content |

### Evaluation Logic

For each KR, **progress** is normalized to 0–100 and a **status** assigned:

- `gte` (higher is better): `progress = min(100, current ÷ target × 100)`
- `lte` (lower is better): `progress = 100` if `current ≤ target`, else
  `max(0, target ÷ current × 100)`

KR status: `on-track` (≥ 100%) · `at-risk` (60–99%) · `off-track` (< 60%).
Goal progress = mean of its KRs; goal status uses the same bands at 90/60.
Overall = mean of goal progresses; a single verdict (`on-track` / `at-risk` /
`off-track`) heads the scorecard.

> The goals are configuration, not code: a clearly-editable list on the server,
> so the agent can retune targets without touching logic. Targets are the
> agent's self-imposed policy — a [PPS](../../pps/) concern expressed as numbers.

### Headline KPIs

| Indicator | Definition | Source |
| --- | --- | --- |
| **Total Items** | Count of all items (open + completed) in the window. | `items` |
| **Completed** | Count of items with `completed_at` in the window. | `items.completed_at` |
| **Open (Backlog)** | Count of items with `completed_at = null`. | `items` |
| **Completion Rate** | `Completed ÷ (Completed + Open)` over the window. | derived |
| **Overdue** | Open items with `due_date < today`. | `items.due_date` |
| **Active Projects** | Distinct projects with ≥ 1 item touched in the window. | `items.project_id` |
| **Cycle Time p50 / p90** | Median & 90th-percentile `(completed_at − created_at)` over completed items. | derived |
| **Current Streak** | Consecutive days (ending today) with ≥ 1 completion. | derived |

### Flow & Funnel

| Indicator | Chart | Definition |
| --- | --- | --- |
| **Throughput** | Grouped bar + line | Per-day `created_at` vs `completed_at` + 7-day rolling velocity. |
| **Backlog Trajectory** | Area line | Cumulative `created − completed` over the window. The #1 trend: growing or shrinking? |
| **Completion Funnel** | Funnel | `created → has-due-date → completed → completed-on-time`. Surfaces where tasks drop off. |
| **Created vs Completed** | — | Folded into Throughput (not a separate section). |

### Temporal Behavior

| Indicator | Chart | Definition |
| --- | --- | --- |
| **Weekly Rhythm** | Bar | Mean completions per weekday + completion-rate of items due that day; names the peak day. |
| **Hourly Productivity** | Heatmap (hour × weekday) | Completion density by hour-of-day × day-of-week; names the peak 2-hour focus window. |
| **Monthly Comparison** | Small multiples + table | Last N months across key metrics, % change MoM, trajectory verdict. |

### Health & Risk

| Indicator | Chart | Definition |
| --- | --- | --- |
| **Cycle-Time Distribution** | Box/percentile bar by priority | p50/p90 of `created→completed`, split by priority. Reveals estimate realism. |
| **Priority Debt** | Stacked area | Cumulative high-priority (P1+P2) *open* items over time. Technical-debt analog. |
| **Reliability** | KPI + bar | Deadline Adherence + Overdue age buckets (0–7 / 7–30 / 30–90 / 90+ d). Subsumes "Overdue Tasks" / "Task Against Analysis". |
| **Backlog Aging** | Histogram | Age distribution of open items. |

### Projects, Habits & Activity

| Indicator | Chart | Definition |
| --- | --- | --- |
| **Project Intelligence** | Bar + verdict | Per-project last-14d velocity vs its own historical baseline → `heating / steady / cooling`. Replaces the plain "Items per Project". |
| **Top Labels** | Horizontal bar | Item count per label, top 12. |
| **Streak & Habits** | Streak calendar + habit rings | Current/longest streak history; per-habit consistency for recurring items (`is_recurring`). |
| **Recent Activity Stream** | Timeline feed | Reverse-chronological events grouped by day with net delta; detects work sessions (clusters within ~30 min). |

### Comparative & Insight

| Indicator | Chart | Definition |
| --- | --- | --- |
| **Radar Comparison** | Radar | This period vs previous period across 6 dimensions (throughput, rate, adherence, stability, backlog-trend, focus). |
| **Auto-Insights** | Text panel | 4–5 computed plain-language findings (e.g. "Tuesdays = 3× Fridays", "P1 slips 40%"). The S3\* auditor voice. |
| **Activity Heatmap** | GitHub-style calendar | 365-day daily completion intensity (full year). |
| **Evaluation Mapping** | Table | AOOS Evaluation criteria → the indicator that serves each. |

### Markov State Model

> A first-order Markov chain over the **item lifecycle**. The dataset has no
> explicit state log, so states are *derived* from the timestamps by classifying
> each item's state on each day. The matrix `P[i][j]` is the empirical
> probability that an item in state `i` on day `t` is in state `j` on day `t+1`,
> computed over the chosen window.

**States** (5 transient + 2 absorbing):

| State | Class | Definition |
| --- | --- | --- |
| `Inbox` | transient | created, no due date, age ≤ 7 days |
| `Scheduled` | transient | has a future due date (> 1 day out) |
| `Active` | transient | due today or tomorrow |
| `Overdue` | transient | past due date, still open |
| `Stale` | transient | open, no due date, age > 7 days |
| `Done on-time` | absorbing | closed ≤ due date |
| `Done late` | absorbing | closed > due date |

**Computation.** For each item, walk day-by-day from `max(created, window-start)`
to `min(completed, window-end)`, classify the state each day, and count
consecutive-day transitions. Rows are normalized to probabilities. Absorbing
states carry a self-loop of 1.0. The diagonal captures **dwell** (how long work
lingers in each state); off-diagonal captures **flow**.

**Empirical fate.** Alongside the matrix, the endpoint reports the *observed*
fate of items passing through each transient state — the share that eventually
resolved `on-time`, `late`, or remained `open`. This is the "so what" of the
model: *if an item is currently Overdue, what becomes of it?*

**Historical evolution.** The matrix is recomputed over each of the last N
monthly windows, and the most diagnostic transition probabilities are plotted as
a time series — answering "is the flow improving?" (e.g. is
`Active → Done on-time` rising, is `Stale → Stale` falling?).

> **Deduplication note.** The following requested sections are intentionally
> *not* separate views because they are already subsumed: *Task Created vs
> Completed* → Throughput; *Backlog Size* → headline KPI; *Overdue Tasks* →
> headline KPI + Reliability; *Task Against Analysis* → Completion Funnel +
> Reliability; *Recent Activity* + *Recent Activity Stream* → one Activity Stream.

## Functionality

- **Window selector** — last 7 / 30 / 90 / 365 days, applied to all temporal
  indicators simultaneously. Defaults to 30 days.
- **Project filter** — restrict every indicator to one project (or "All").
- **Priority filter** — P1–P4 multi-select.
- **Export** — JSON of the current computed indicator payload
  (`GET /api/analytics/export`).
- **Refresh** — recompute against the current dataset (server-side; no live
  platform call in the prototype).

> The dashboard is **read-only**. It never mutates action constructs or blocks.
> This is the audit posture: observe, do not steer.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/analytics/summary?window=30&project=&priority=` | Headline KPIs + small distribution payloads. |
| `GET /api/analytics/performance?window=30` | Personal Performance scorecard: goals → key results → progress/status. |
| `GET /api/analytics/indices?window=30` | The three composite indices with decomposed sub-components. |
| `GET /api/analytics/throughput?window=90` | Daily created/completed series + 7-day rolling velocity. |
| `GET /api/analytics/trajectory?window=90` | Cumulative `created − completed` backlog trajectory. |
| `GET /api/analytics/funnel?window=30` | Completion funnel: created → due → completed → on-time. |
| `GET /api/analytics/rhythm?window=90` | Weekly rhythm: per-weekday means + completion rate. |
| `GET /api/analytics/hourly?window=90` | Hour × weekday completion-density matrix. |
| `GET /api/analytics/monthly?months=6` | Month-over-month comparison across key metrics. |
| `GET /api/analytics/cycletime?window=90` | Cycle-time p50/p90 by priority. |
| `GET /api/analytics/priority-debt?days=180` | Cumulative high-priority open items over time. |
| `GET /api/analytics/projects?window=30` | Per-project counts (items, open, overdue, completed). |
| `GET /api/analytics/projects-intelligence?window=30` | Per-project momentum: recent velocity vs baseline + verdict. |
| `GET /api/analytics/priority?window=30` | Counts + completion rate by priority. |
| `GET /api/analytics/labels?window=30&limit=12` | Top labels by item count. |
| `GET /api/analytics/habits?window=30` | Streak history + recurring-item consistency. |
| `GET /api/analytics/activity?limit=40` | Recent activity stream (timeline, grouped, session-detected). |
| `GET /api/analytics/radar?window=30` | This-period vs previous-period across 6 dimensions. |
| `GET /api/analytics/insights?window=30` | Auto-generated plain-language findings. |
| `GET /api/analytics/markov?window=90` | Markov transition matrix over item lifecycle states + empirical fate. |
| `GET /api/analytics/markov-evolution?months=6` | Monthly sequence of matrices + key-transition time series. |
| `GET /api/analytics/heatmap?year=2026` | 365-day daily completion intensity. |
| `GET /api/analytics/reliability?window=30` | Deadline adherence + overdue buckets. |
| `GET /api/analytics/aging?window=30` | Backlog age histogram. |
| `GET /api/analytics/export?window=30` | Full computed payload (JSON download). |

## Implementation

### Technical Element Set

| Layer | Choice |
| --- | --- |
| Dataset | `aoos/data/mock_todoist.json` (generated by `gen_todoist_mock.py`) |
| Computation | Python aggregations in `aoos/server.py` (server-side; the dataset is small) |
| Charts | **Apache ECharts**, self-hosted (`static/js/vendor/echarts.min.js`), themed to the design tokens |
| UI | Vanilla HTML/CSS/JS, one new view (`static/js/analytics.js`) |

### UI / UX

The dashboard follows the **Autoregia UI specification** — parchment surface,
Spectral/Inter/IBM Plex Mono type, Oxford accent, hairline rules. Charts inherit
a shared ECharts theme built from the CSS custom properties so they read as part
of the page, not as imported widgets. The window/project/priority selectors live
in a `filter-bar` (same grammar as the Actions view).

## Evaluation Mapping

> Every indicator on the dashboard traces to a criterion in the parent
> [`spec.md` Evaluation](spec.md#evaluation) table. The mapping is the audit
> contract: if an evaluation criterion exists, it must be visible here.

| Parent Criterion | Dashboard Indicator(s) |
| --- | --- |
| Execution Throughput — Completion Rate | Completion Rate KPI; Priority Completion Rate |
| Execution Throughput — Throughput Stability | 7-Day Rolling Velocity; Throughput Stability σ² |
| Capacity Adherence — Overload Frequency | (placeholder — needs PKTS capacity feed) |
| Commitment Reliability — Deadline Adherence | Deadline Adherence KPI; Overdue Distribution |
| Commitment Reliability — Slippage Detection | Overdue by Priority; Backlog Aging |
| Coordination Coherence — Cross-Domain Harmonization | Top Labels; Label Throughput |
| Auditability — Execution Traceability | Activity Heatmap; Daily Completions |
| Viability Contribution — Operating Stability | Current Streak; Throughput Stability |

> Indicators marked *placeholder* identify criteria the prototype cannot yet
> satisfy because their inputs come from sibling systems (PKTS, PPS). The
> dashboard renders them as muted "awaiting feed" tiles so the gap is visible.

## References

- [AOOS — spec](spec.md) — parent specification & the Evaluation section this dashboard serves.
- [AOOS — schema](schema.json) — action construct + calendar block data models.
- [AOOS — prototype README](../../aoos/README.md) — how to run the prototype.
- [Autoregia UI Specification](../ui.spec) — canonical UI standard.
- [Apache ECharts](https://echarts.apache.org/) — charting library.
