# Personal Reflection & Adaptation System (PRAS)

> PRAS is the **Personal Reflection & Adaptation System** — the Autoregia **Intelligence / Feedback** component. It is the stage of the control loop where the agent *observes the consequences of what it executed, makes sense of the gap between intention and outcome, and adapts its internal models, goals, and policies accordingly.*

> Where the [Personal Recording System (PRS)](../prs/) externalizes **state** and the [Personal Policy System (PPS)](../../pps/README.md) externalizes **direction**, PRAS externalizes **deliberation**: the structured reasoning that turns experience into revision. It is the cybernetic **Feedback** path of the [Personal Viable System Model](../about.md) — the arc that re-enters the deliberative cycle and keeps the system learning.

> **Mapping.** Within the PVSM, PRAS instantiates the **Feedback** stage of the agent control loop and maps to **VSM System 4 – Intelligence** (the layer that scans, learns, anticipates, and *adapts the system to change*). Deviation detection overlaps **S3\* Audit**; the *correction* that a deliberation proposes is handed to **S3 Control** (the regulator) and to the operational systems to enact.

## Formulation

> How to think about a `Personal Reflection & Adaptation System`?

A `Personal Reflection & Adaptation System` is a technical object with the role of externalizing **reflective and adaptive processes** to scaffold extended agency:

- preserve the reasoning behind change (so revision is never arbitrary or invisible),
- surface deviation between intention and outcome,
- stabilize lessons, hypotheses, and decisions-in-formation before they harden into policy,
- and convert experience into deliberate adaptation rather than drift.

### The Deliberation — the atomic unit

The atomic unit of PRAS is a **deliberation**: a single, self-contained reflection that captures the move from *observation* to *proposed adaptation*. A deliberation is not a diary entry and not a policy; it is the **reasoning in between** — the sense-making that decides whether and how the agent should change.

A deliberation carries:

- an **observation** — what was noticed (a deviation, a pattern, a result, a surprise),
- a **deliberation** — the reasoning about *why* it happened and what it means,
- an **adaptation** — the proposed change to a model, a goal, a practice, or a policy, and
- a **destination** — the system the adaptation should feed (PPS for policy, AOOS for corrective action, PRS for the record, PTOCS for capability).

### The Deliberation Lifecycle

A deliberation is a *living* object. It matures along a lifecycle that mirrors the feedback arc itself:

| Status | Meaning |
| --- | --- |
| **open** | Under active reflection — the observation is recorded; sense-making is in progress. |
| **concluded** | Reflection complete — an adaptation has been proposed and the reasoning is settled. |
| **enacted** | The adaptation has been applied — fed into its destination system (e.g. a policy amended in PPS, a corrective action registered in AOOS). |
| **superseded** | Replaced by a later deliberation that refines or reverses it. |

The transition **concluded → enacted** is the precise point at which PRAS *feeds the policy system* (and the others). Until enactment, an adaptation is a hypothesis about how to improve; enactment makes it operational and leaves a trace.

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Loop stage:** Feedback (outer arc) — *observe consequences → regulate the deliberative cycle*.
- **VSM level:** System 4 – Intelligence (with deviation detection overlapping S3\* Audit).
- **Upstream (what PRAS reads):** the [PRS](../prs/) (records of what happened), [AOOS](../aoos/) analytics (deviations against goals), [PTOCS](../ptocs/) (the capability set), [PKTS](../pkts/) (attention/telemetry signals).
- **Downstream (what PRAS feeds):** the [PPS](../../pps/README.md) (policy amendments), [AOOS](../aoos/) (corrective actions), [PRS](../prs/) (the deliberation itself becomes a record), [PTOCS](../ptocs/) (capability revisions).

> The functional specification, data model, and deliberation schema live in [`spec.md`](spec.md). The prototype implementation lives at [`../../pras/`](../../prs/) (`pras/server.py`).
