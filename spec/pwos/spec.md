# Personal Work Organization System

> This document establishes the conceptual foundations, data model, functionality,
> and implementation of a **Personal Work Organization System (PWOS)**. A PWOS is a
> technical object engineered to `organize the agent's operative action` — it lifts
> the action-bearing states recorded elsewhere (in the PRS) into a steerable,
> dependency-aware, capacity-checked, and calendar-coordinated execution structure,
> and it keeps that structure synchronized with the platforms the agent actually
> operates through.

> Within the Autoregia Personal Viable System Model (PVSM), PWOS is the
> **Operations System** (VSM System 1 – Operations): it is the layer of the agent
> that *does things*. By making action explicit, ordered, and accountable, it
> converts an implicit, scattered, anxiety-prone work life into an intelligible,
> navigable, and steerable operative structure — and gives the higher regulatory
> systems (Control S3, Audit S3*, Policy S5) a concrete object to regulate.

Fundamentally, a PWOS exists to maintain persistent, executable representations of
the **action** relevant for effective agency. These include:

- **Action Constructs** — tasks, projects, routines, commitments, initiatives, and
  objectives: the structured units of work the agent is (or may be) performing.
- **Operational Dependencies** — the graph of blocking, ordering, and enabling
  relations between action constructs and between constructs and resources.
- **Temporal Commitments** — the concrete placement of work in time: scheduled
  blocks, deadlines, recurring cadences, and calendar commitments.
- **External Platform State** — the calendar and task systems the agent operates
  through (Google Calendar, and future platforms), kept synchronized with the
  internal model.
- **Execution Actuals** — the real counterpart to the plan: **work sessions**
  that record what was actually done and for how long. A session stands on its
  own (a description + a time span); an action and a block are optional links.
  The gap between a planned *block* (intended) and the *sessions* (actual) is the
  deviation signal that closes the loop and feeds Audit (S3\*) and Adaptation
  (PRAS).

By preserving these across time, a PWOS functions as an externalized **operative
substrate**, reducing action blindness, improving throughput, and enabling more
reliable, capacity-aware, policy-compliant execution.

## Internal Composition

> PWOS is a single System 1 composite of three cooperating components. The
> conceptual separation between them is real; the deployment boundary is one
> project.

```
PWOS — Personal Work Organization System  (VSM System 1 – Operations)
 |
 +-- [A] Work Organization & Registration
 |     \_ Action Constructs (tasks, projects, routines, commitments,
 |        initiatives, objectives) + dependency graph + effort/capacity
 |        Operates OVER PRS records (single source of truth) + a thin
 |        operational extension (dependencies, estimates, scheduling).
 |
 +-- [B] Work Calendarization  — the calendar system
 |     \_ Concrete temporal scheduling: deadlines -> dated blocks;
 |        conflict detection; workload vs. capacity; recurrence expansion.
 |
 +-- [D] Execution & Actuals  — the work-session system
 |     \_ Start/stop timer + manual entry; one running session at a time;
 |        a session stands on its own (description + time); action/block are
 |        optional links. Where [B] reasons over intended time, [D] records
 |        actual time.
 |
 +-- [C] Platforms Integration
      \_ Adapters that normalize external systems into PWOS terms.
         Primary: Google Calendar (OAuth 2.0, two-way sync).
         Future: task tools, communication sources, other calendars.
```

| Component | Role | Owns | Does NOT own |
| --- | --- | --- | --- |
| **[A] Work Organization & Registration** | The action hierarchy — "what to do" | Action constructs, dependency graph, effort estimates, logical ordering | The underlying record store (PRS owns that) |
| **[B] Work Calendarization** | Temporal coordination — "when, against the real calendar" | Scheduled blocks, recurrence expansion, conflict detection, workload | The authoritative external calendar (the platform owns that; this mirrors it) |
| **[D] Execution & Actuals** | The actuals layer — "what really happened" | Work sessions (start/stop, actual effort, outcomes), the block↔session deviation | The durable execution *event stream* (that remains PRS-backed; PWOS holds the operational session object) |
| **[C] Platforms Integration** | The boundary with the outside world — "how it connects" | Adapters, credentials, sync model, field mapping | The semantics of action (A), time (B), or actuals (D) |

> [B] and [C] together realize what the original PWOS formulation called *"Work
> Calendarization"*: [C] brings the platform's calendar in, [B] reasons over it.

## Formulation

> How to think about a `Personal Work Organization System`?

A `Personal Work Organization System` is a technical object with the role of
externalizing **the agent's operative action** to scaffold extended agency:

- preserve action continuity,
- stabilize the work inventory as an intelligible structure,
- reduce action discovery and resumption cost,
- maintain coordination of dependencies across constructs and across domains,
- keep the internal operative model synchronized with the external platforms the
  agent actually operates through,
- and support consistent, capacity-aware, policy-compliant execution.

### What is an Action Construct? What is its nature?

#### Principle

> An action construct is any *structured unit of work* whose organization,
> ordering, or temporal placement changes what the agent can or should do, and
> when.

> PWOS should organize any action construct whose unorganized, forgotten, or
> unmapped state would degrade the agent's ability to execute effectively. The
> objective is not exhaustive task hoarding, but selective registration of
> **operationally relevant action**.

Conversely, a construct should generally not be registered when it is:

- Ephemeral and never recurs (a throwaway action with no durable role).
- Trivial enough to hold in working memory without loss.
- Fully internal to a single construct already registered (a sub-step of a task
  that needs no independent tracking).
- Operationally irrelevant to current or foreseeable objectives.
- More costly to maintain than the value it provides.

#### Action Construct Kind Taxonomy

> What classes of action construct should the system recognize?

> Action constructs are a *subset* of PRS records: those whose `record_type` is
> action-bearing. PWOS does not redefine these; it manages them. The kind is
> derived from the record's `record_type` and its `strategicMetadata`.

| Kind | Origin (`record_type`) | Description | Example Instances |
| --- | --- | --- | --- |
| **Routine** | `Procedure` / recurring `Task` | A repeating operational process with a cadence. | Weekly review; daily standup note; nightly backup. |
| **Task** | `Task` | The atomic unit of actionable work — a single discrete step. | "Implement search index"; "Reply to reviewer." |
| **Project** | `Project` | A coordinated collection of tasks with a shared outcome. | Personal Recording System; PWOS itself. |
| **Commitment** | `Commitment` | A promise or obligation to an external party — carries a deadline. | "Deliver draft by Friday." |
| **Initiative** | `Goal` (with `strategicMetadata.initiative`) | A multi-project effort advancing an objective. | "Build the Autoregia operational core." |
| **Objective** | `Goal` (with `strategicMetadata.objective`) | The strategic outcome the work serves. | "Achieve a viable personal operating system." |

> The **action hierarchy** falls out of the existing `strategicMetadata` block
> (Objective → Initiative → Project → Task / Routine), so PWOS renders a hierarchy
> that PRS already stores but does not steer.

### What should be the structure of such **action construct**?

> An action construct is a PRS record of an action-bearing type, *plus* a thin
> PWOS operational extension. PRS remains the single source of truth for the
> record's content and metadata; PWOS adds only what PRS has no reason to store:
> execution-specific structure.

#### Inherited from the PRS record (owned by PRS)

| Field | Description | Example |
| --- | --- | --- |
| **Record Id** | Globally unique identifier (the PRS record id). | `REC-2026-00042`. |
| **Content / Detail** | What the work is. | "Implement search index." |
| **Record Type** | Determines the action-construct kind (see taxonomy). | `Task`, `Project`, `Commitment`. |
| **Operational Metadata** | `status` (Draft/Active/Pending/Blocked/Completed/Archived/Scheduled/Cancelled), `priority` (Critical/High/Medium/Low), `owner`, `project`, `workflow_state` (Planned/In Progress/Under Review/Approved/Deprecated). | `status: Active`, `priority: High`. |
| **Temporal Metadata** | `deadline`, `horizon` (Immediate/Short-term/Medium-term/Long-term), `relevance`, `recurrence` (None/Daily/Weekly/Monthly/Yearly/Custom), `validity`. | `deadline`, `recurrence: Weekly`. |
| **Strategic Metadata** | `goal`, `objective`, `initiative`, `capability` — places the construct in the action hierarchy. | `objective: O-1`, `project: P-PRS`. |
| **Classification** | `domain`, `subject`, `tags`, `state_class`. | `domain: Software Engineering`. |
| **Relational (links)** | `[{target, type}]` — general graph links to other records. | `[{REC-104, depends-on}]`. |
| **Annotation Log** | Append-only commentary without mutating content. | Reflections, progress notes. |

#### Added by PWOS (the operational extension)

| Field | Description | Example |
| --- | --- | --- |
| **Action Id** | PWOS-local identifier for the managed action (may alias the record id). | `ACT-2026-00042`. |
| **Effort Estimate** | Estimated cost to complete (duration or abstract points) and the unit. | `{value: 2.5, unit: "hours", confidence: Medium}`. |
| **Dependencies** | Ordered edges to other constructs or external resources (see Action Construct Link). | `[{ACT-7, blocked-by}, {OBJ-3, uses-capability}]`. |
| **Scheduling State** | Whether and how the construct is placed in time by component [B]. | `unscheduled`, `scheduled`, `deferred`, `in-progress`, `done`. |
| **Scheduled Occurrences** | Expanded instances for recurring constructs (component [B] computes these). | `[{starts_at, ends_at, calendar_block_id}]`. |
| **Capacity Profile** | The resource the construct consumes (time, focus, energy band) — used for workload checks. | `{resource: focus, band: deep}`. |
| **External Mappings** | Links to platform objects maintained by component [C] (e.g., a Google Calendar event id). | `[{platform: google-calendar, external_id: "evt_123", sync_state: synced}]`. |
| **Execution Log** | A stream of execution events. Each event is itself a PRS record (`Event`/`Observation`) linked back to the construct; PWOS does not duplicate it. | `→ REC-2026-00099 (started)`. |

> The execution log is *not* a PWOS-owned store. It is the set of PRS records that
> reference the action construct. PWOS reads them; Audit (S3*) reasons over them.
> The operational object a user interacts with live — the **work session** (start/
> stop, actual effort, outcome) — *is* a PWOS extension entity (Component [D]),
> like a block; on completion a session may emit/link a PRS record, so the durable
> trace remains PRS-backed for audit while the live object stays operable.

### Action Construct Link

> How can the action constructs be linked?

> PWOS uses the PRS link vocabulary for general relationships, and adds an
> execution-specific edge set for the dependency and scheduling graph.

| Category | Link | Description |
| --- | --- | --- |
| **Structural** | `part-of` | Construct belongs to a larger aggregate (task → project). |
| **Structural** | `contains` | Construct structurally includes subordinate constructs. |
| **Structural** | `implements-objective` | Realizes an objective, initiative, or goal. |
| **Dependency** | `depends-on` | Requires another construct or resource to be available first. |
| **Dependency** | `blocked-by` | Cannot progress until another construct or condition is resolved. |
| **Dependency** | `required-by` | Another construct depends on this one. |
| **Dependency** | `enables` | Completing this unlocks another construct. |
| **Capability** | `uses-capability` | Consumes a capability cataloged in **PTOCS** (→ `OBJ-*`). |
| **Capability** | `fulfills-commitment` | Discharges a `Commitment` record. |
| **Governance** | `governed-by` | Subject to a **PPS** policy or constraint (→ `pp-*`). |
| **Scheduling** | `scheduled-in` | Placed in a calendar block (component [B]); maps to a calendar item. |
| **Scheduling** | `recurs-from` | This occurrence repeats according to a prior one. |
| **Provenance** | `spawned-from` | Originated operationally from another activity (e.g., a meeting record). |
| **Platform** | `mirrors-external` | This construct is synchronized with an external platform object (component [C]). |

### Classification Metadata

> How to classify the **action construct**?

#### Dimension

| Classification Dimension | Purpose | Field Set |
| --- | --- | --- |
| **Kind** | What class of action is this? | Kind (derived from `record_type` + `strategicMetadata`). |
| **Operational** | How is this action managed or executed? | Status, Priority, Owner, Workflow State, Scheduling State. |
| **Strategic** | Where does this sit in the action hierarchy? | Objective, Initiative, Project, Capability, Theme. |
| **Temporal** | How is this situated in time? | Deadline, Horizon, Recurrence, Validity, Scheduled Occurrences. |
| **Capacity** | What does this action cost? | Effort Estimate, Capacity Profile (resource, band). |
| **Domain** | What domain of life does this belong to? | Domain, Subject, Tags. |

#### Field Set

| Dimension | Field | Allowed Value Set |
| --- | --- | --- |
| **Kind** | Kind | Routine, Task, Project, Commitment, Initiative, Objective |
| **Operational** | Status *(from PRS)* | Draft, Active, Pending, Blocked, Completed, Archived, Scheduled, Cancelled |
| | Priority *(from PRS)* | Critical, High, Medium, Low |
| | Workflow State *(from PRS)* | Planned, In Progress, Under Review, Approved, Deprecated |
| | Scheduling State *(PWOS)* | unscheduled, scheduled, deferred, in-progress, done |
| **Strategic** | Objective *(from PRS `strategicMetadata`)* | Objective identifier |
| | Initiative *(from PRS `strategicMetadata`)* | Initiative identifier |
| | Project *(from PRS)* | Project identifier |
| **Temporal** | Horizon *(from PRS)* | Immediate, Short-term, Medium-term, Long-term |
| | Recurrence *(from PRS)* | None, Daily, Weekly, Monthly, Yearly, Custom |
| | Validity *(from PRS)* | Permanent, Temporary, Expired |
| | Deadline *(from PRS)* | ISO 8601 timestamp or null |
| **Capacity** | Effort Estimate | `{value, unit: hours|points|sessions, confidence: Low|Medium|High}` |
| | Capacity Profile | `{resource: time|focus|energy|attention, band: deep|shallow|low}` |
| **Domain** | Domain *(from PRS)* | Software Engineering, Health, Finance, Research, ... |
| | Tags *(from PRS)* | Free-form tags |

## Work Calendarization (Component B)

> Component [B] is the **calendar system** inside PWOS. It takes the logical action
> structure built by [A] and resolves it against a concrete timeline, detecting
> conflicts and checking the result against measured capacity.

### Calendar Model

> A **calendar block** is the atomic temporal unit produced by [B]. It is a concrete
> placement of work (or a commitment) on the timeline.

| Field | Description | Example |
| --- | --- | --- |
| **Block Id** | Unique identifier for the scheduled occurrence. | `BLK-2026-06-28-001`. |
| **Action Id** | The action construct this block realizes. | `ACT-2026-00042`. |
| **Starts At / Ends At** | Concrete placement on the timeline. | ISO 8601 timestamps. |
| **All-Day** | Whether the block is a date, not a time range. | `true` / `false`. |
| **Calendar Id** | Which calendar this block belongs to (see Platforms Integration). | `primary`, `work`, `personal`. |
| **Recurrence Source** | If this block was generated from a recurring construct, the construct id and rule. | `{action_id, rule: FREQ=WEEKLY}`. |
| **External Mapping** | The platform object this block mirrors (component [C]). | `{platform: google-calendar, external_id}`. |
| **Conflict Flags** | Detected conflicts (double-booking, overload, policy violation). | `[{kind: overlap, with: BLK-…}]`. |
| **Status** | tentative, confirmed, cancelled, completed. | `confirmed`. |

### Functionality

- **Recurrence expansion** — expand a construct's `recurrence` rule into concrete
  dated blocks over a horizon window.
- **Deadline projection** — place a deadline-anchored block backwards from its
  `deadline` using its effort estimate.
- **Conflict detection** — detect temporal overlaps between blocks and overload
  relative to capacity (component [B] vs. measured capacity from PRS/PKTS).
- **Policy gating** — before confirming a block, check it against applicable **PPS**
  policies (e.g., a deep-work block scheduled at 02:00 violates a Sleep Policy).
- **Workload view** — aggregate scheduled effort per day/week against measured
  throughput (the S1↔S3 capacity channel).

> [B] is *not* an authoritative calendar store. Authoritative temporal truth for
> external commitments lives in the platform (Google Calendar). [B] mirrors and
> reasons; [C] keeps the mirror in sync.

## Execution & Actuals (Component D)

> Component [D] is the **actuals layer** inside PWOS. Where [B] reasons over
> *intended* time (blocks), [D] records *actual* time (work sessions). It is what
> turns PWOS from an open-loop planner into a closed-loop operations system: the
> gap between a block and the sessions that realize it is the deviation signal
> that Audit (S3\*) reasons over and Adaptation (PRAS) reflects on.

### Work Session Model

> A **work session** is the atomic execution unit: a time-tracker entry — a span
> of real work described in free text, with an optional link to an action (and
> optionally to the block it realizes). It does not require an action; it stands
> on its description and its time span.

| Field | Description | Example |
| --- | --- | --- |
| **Session Id** | Unique identifier. | `SES-2026-00042`. |
| **Description** | The session's title — what was worked on. Primary field. | "Component D backend." |
| **Started At / Ended At** | The real span. `ended_at` is null while a timer runs. | ISO 8601 timestamps. |
| **Status** | `active` (running), `completed`, `abandoned`. | `completed`. |
| **Action Id** | *Optional* link to an action (FK to `ACT-`). | `ACT-2026-00009`. |
| **Block Id** | *Optional* link to the planned block this session realizes (FK to `BLK-`). | `BLK-2026-00002`. |
| **Capacity** | Actual `{resource, band}` consumed; defaults from the action's profile when linked. | `{resource: focus, band: deep}`. |
| **Source** | `timer`, `manual`, or `platform`. | `timer`. |

### Functionality

- **Timer** — a persistent focus bar holds the single running session; start
  from a free-text "what are you working on?" (an action link is optional), stop
  with an optional closing note. One session at a time (starting a new one stops
  the previous).
- **Manual entry** — backfill a session with explicit start/end times.
- **Actuals vs Estimates** — sum session durations per action and compare to its
  `effort_estimate`; the accuracy ratio calibrates future planning.
- **Totals** — aggregate actual time by day / action / project over a window
  (the S1↔S3 measured-throughput channel).
- **Deviation** — when `block_id` is set, compare the session's real duration to
  the block's planned duration; the delta is the feedback signal.

> [D] does not itself own the durable execution *event stream* — that remains
> PRS-backed (the spec's "Execution Log"). It owns the operational session object
> the agent starts and stops. On completion a session may link a PRS record so
> the trace is durable; a future `AdaptationEnacted`/`ExecutionFinished` event on
> the [ISCB](../iscb/spec.md) bus will carry enactment across systems.

## Platforms Integration (Component C)

> Component [C] is the boundary between PWOS and the external systems the agent
> operates through. Each platform is wrapped by an **adapter** that normalizes the
> platform's objects into PWOS terms (action constructs and calendar blocks) and
> keeps them synchronized.

### Platform: Google Calendar (primary)

Google Calendar is the first platform. It provides the authoritative external
calendar that [B] mirrors and that [A] commitments are checked against.

#### Authentication

- **Protocol:** OAuth 2.0 (Google API).
- **Scopes:** `https://www.googleapis.com/auth/calendar` (read/write) — the minimum
  scope required for two-way sync. Read-only deployments may use `calendar.readonly`.
- **Credentials:** a Google Cloud OAuth **client secret** (`client_secret.json`),
  provided by the agent's Google Cloud project. **Never committed to the repository.**
- **Token storage:** OAuth refresh + access tokens stored in the PWOS local store
  (SQLite), encrypted at rest. The first run performs an interactive consent flow;
  subsequent runs use the refresh token.

> The agent must create a Google Cloud project, enable the Google Calendar API,
> create an OAuth 2.0 Client ID (Desktop app type), and download the client secret.
> Setup steps are documented in the PWOS README; the credentials are brought in
> out-of-band.

#### Sync Model

- **Direction:** **two-way** by default. Constructs created/scheduled in PWOS are
  pushed to Google; events changed in Google are pulled into PWOS.
- **Calendar selection:** the agent selects which Google calendars to sync (e.g.,
  `primary`, `work`, `personal`). Each is mapped to a PWOS `calendar_id`.
- **Change detection:**
  - **Polling (baseline):** periodic `events.list` with `syncToken` incremental
    sync (Google's `nextSyncToken` / `pageToken`) to fetch only changes.
  - **Push (optional, future):** Google Calendar push notifications (`watch` /
    `channels`) for near-real-time webhooks, requiring a public callback endpoint.
- **Conflict resolution:** each synced object carries a `sync_state`
  (`synced` / `dirty-local` / `dirty-remote` / `conflict`). On conflict, the
  *local* (agent-authored) change is preferred for PWOS-originated fields; the
  *remote* (platform) change is preferred for platform-originated fields; ties are
  surfaced to the agent for resolution.

#### Field Mapping — Google Calendar ↔ Autoregia

| Google Calendar (`events`) | Autoregia (PWOS) | Notes |
| --- | --- | --- |
| `id` | `External Mappings[].external_id` | Stable platform identity. |
| `summary` | record `content` | The action title. |
| `description` | record `detail` | Extended context. |
| `start` / `end` (`dateTime` or `date`) | block `starts_at` / `ends_at`, `all_day` | Temporal placement. |
| `recurrence` (`RRULE`) | record `recurrence` + expanded blocks | [B] expands locally. |
| `status` (`confirmed`/`tentative`/`cancelled`) | block `status` | Map directly. |
| `attendees` | linked `Commitment` / `Meeting` records | Become social-state records. |
| `reminders` | → Notification System (S2) | Handled downstream. |
| `extendedProperties` (private) | PWOS action id, scheduling state, domain | Carries the Autoregia back-reference so round-trips are unambiguous. |
| `calendarId` | `calendar_id` | Which calendar. |
| `colorId` | domain / capacity-band color (optional) | Cosmetic alignment. |

#### Future Platforms

The adapter interface is defined so that additional platforms can be added without
disturbing [A] or [B]: task tools (Todoist, etc.), communication sources (email
deadlines), and other calendars (iCal feeds). Each adapter implements: *list
objects, normalize to PWOS terms, push local changes, pull remote changes*.

## Evaluation

> How to evaluate a Personal Work Organization System?

| Criterion | Indicator | Description |
| --- | --- | --- |
| Execution Throughput | Completion Rate | Share of scheduled action constructs completed within their horizon |
| Execution Throughput | Throughput Stability | Variance of completion rate over time |
| Dependency Visibility | Critical-Path Visibility | Ability to identify the chain blocking a desired outcome |
| Dependency Visibility | Blocker Resolution Latency | Time to resolve a blocking dependency |
| Capacity Adherence | Overload Frequency | How often scheduled load exceeds measured capacity |
| Capacity Adherence | Estimate Accuracy | Ratio of estimated effort to actual (from execution log / PKTS) |
| Commitment Reliability | Deadline Adherence | Share of commitments met by their deadline |
| Commitment Reliability | Slippage Detection | Ability to detect deadline drift early |
| Calendar Sync Integrity | Sync Drift | Latency and divergence between PWOS and the external calendar |
| Calendar Sync Integrity | Conflict-Free Sync | Rate of unresolved sync conflicts |
| Conflict Detection | Collision Detection | Ability to identify temporal overlaps before they occur |
| Coordination Coherence | Cross-Domain Harmonization | Degree to which work across domains is de-conflicted |
| Policy Compliance | Policy Adherence | Share of scheduled blocks compliant with applicable PPS policies |
| Policy Compliance | Constraint Visibility | Visibility of operational, temporal, and cognitive constraints |
| Operational Continuity | Restart Latency | Time to resume an interrupted action using its context |
| Resumption | Context Availability | Availability of context needed to resume a construct |
| Strategic Alignment | Objective Backing | Share of active objectives backed by scheduled action |
| Auditability | Execution Traceability | Ability to reconstruct what was done, when, and why |
| Usability | Capture Friction | Effort to register and schedule action without disrupting work |
| Viability Contribution | Operating Stability | Overall contribution to sustainable personal execution |

## Implementation

### Functionality Set

- **Work Organization & Registration ([A])**
  - Action Construct: register, edit, annotate, search, pin/unpin.
  - Action Hierarchy: render and navigate Objective → Initiative → Project → Task / Routine.
  - Dependency Graph: add/remove edges; compute blockers, critical path, "what's unblocked now."
  - Capacity: set effort estimate and capacity profile; compare to measured capacity.
  - Derivative: JSON export & import (merge-by-id); append-only annotation log.
- **Work Calendarization ([B])**
  - Recurrence expansion; deadline projection.
  - Conflict detection (overlap, overload, policy violation).
  - Workload view (effort per period vs. measured throughput).
  - Block lifecycle: tentative → confirmed → completed.
- **Execution & Actuals ([D])**
  - Work sessions: timer start/stop (one running session) and manual entry.
  - Actuals vs estimates per action; totals by day / action / project.
  - Block↔session deviation (the feedback signal to S3\* / PRAS).
  - Focus bar (live timer) in the header; session log grouped by day.
- **Platforms Integration ([C])**
  - Google Calendar: OAuth consent, calendar listing/selection, two-way sync
    (incremental polling), create/update/delete with round-trip field mapping,
    conflict surfacing.
  - Adapter interface for future platforms.
- **Complementary Functionality**
  - Next-action surface (unblocked, in-horizon, capacity-available constructs).
  - Command palette (`Ctrl/Cmd+K`), quick capture.
  - Cross-links to PRS records, PTOCS capabilities, PPS policies.

### Technical Element Set

| Layer | Recommendation |
| --- | --- |
| Storage | JSON + SQLite (records live in PRS; PWOS extension tables: dependencies, blocks, external mappings, sync state) |
| API | Simple Python Flask |
| UI | CSS, JS, HTML (can use libraries, not frameworks) |
| Analysis / Charts | Apache ECharts (within the design system) |
| Platform Auth (Google) | OAuth 2.0 via `google-auth` / `google-api-python-client`; tokens in SQLite, encrypted at rest |

#### AI Integration

> AI mechanisms are not standalone features; they are integrated capabilities that
> augment work-organization workflows through suggestions, automation, assistance,
> and AI-first workflows where appropriate (effort estimation, dependency
> inference, scheduling suggestions, conflict-aware next-action proposals).

#### UI / UX Guiding Principle

> The interface follows the **Autoregia UI specification** ([`../ui.spec`](../ui.spec)):
> visually calm, consistent, and minimal, with an elegant, timeless, Oxford-inspired
> aesthetic. Every surface must converge on the shared design tokens, typography,
> component grammar, and interaction model defined there. This document does not
> re-specify the UI layer; `ui.spec` is normative.

## References

- [Agency — Execution Architecture](https://bremontix.xyz/lab/ar/Locus-Social-Realitatis/Onto/Guide/Agency/#execution-architecture) — the originating execution-architecture reference.
- [Autoregia](../../README.md) — workspace overview & VSM mapping.
- [PRS — spec](../prs/spec.md) / [schema](../prs/schema.json) — sibling recording system; PWOS operates over its action-bearing records.
- [PTOCS — spec](../ptocs/spec.md) — capability catalog referenced by `uses-capability` edges.
- [PPS — README](../../pps/README.md) — policy corpus referenced by `governed-by` edges.
- [Autoregia UI Specification](../ui.spec) — canonical, project-wide UI standard.
- [Google Calendar API — Events](https://developers.google.com/calendar/api/v3/reference/events) — authoritative calendar resource model.
- [Google OAuth 2.0 for Mobile & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app) — authentication protocol.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
