# Agent Capability Self Management System (ACSMS)

> This document establishes the conceptual foundations of an **Agent Capability Self Management System (ACSMS)**. An ACSMS is a technical object engineered to `manage the deliberate growth of the agent's own capabilities` — continuously detecting capability gaps, maturing them into committed improvement programs, and consolidating demonstrated capability back into the agent's self-model and catalog.

Where the [Personal Recording System (PRS)](../prs/) externalizes **state** and the [Personal Policy System (PPS)](../../pps/) externalizes **direction**, ACSMS externalizes **development**: the standing function through which the agent increases what it can do. It is the inward-facing counterpart of external adaptation — the agent treating *itself* as the primary system worth improving.

## Formulation

> How to think about an `Agent Capability Self Management System`?

An ACSMS is best understood by analogy to an **athlete's training regime** or an organization's **R&D function**. Performance today is produced by the current capability set; a training regime exists to change that set deliberately — identifying weaknesses, scheduling practice, demanding evidence, and retiring what no longer serves. Likewise, an ACSMS does not perform the agent's work (that is [AWES](../awes/)) and does not choose what the agent values (that is PPS); it maintains the **pipeline that converts intent into capability**.

An ACSMS therefore:

- makes capability growth a **managed flow**, not an accident of whatever work happens to teach something,
- keeps improvement **resource-feasible** — every program competes for the same finite time and energy as everything else,
- demands **evidence over exposure** — a capability counts as gained when demonstrated by output, not when first encountered,
- and keeps the capability set **current** — consolidating what is held, reviewing what decays, and culling what no longer serves.

## Why a Dedicated System

The capability ledger and the improvement flow are different functions:

- [PTOCS](../asrs/ptocs/) **catalogs** capabilities — what exists, where it lives, where the gaps are. It is a *map*, not a *program*.
- [PRAS](../pras/) **proposes** adaptations — including "the agent should become able to X". It is *reasoning*, not *development*.
- [AIAS](../aias/) **commits** intentions — including improvement intents, but knows nothing of practice, evidence, or tier promotion.

Without a dedicated system, improvement remains latent: gaps are visible but unaddressed, learning happens by accident, consolidation decays unreviewed, and "knowing" silently drifts from "being able to". ACSMS closes that loop as a first-class function.

## Position in the Architecture

ACSMS is a **substrate** system: it sits beside [ASRS](../asrs/) and PTOCS in the agent's foundation, and is fed by the loop's feedback arc.

```
PRAS (adaptations) ──► ACSMS ──► AIAS  (improvement intents)
       PKTS (signals)    │
       PTOCS (gaps)      └──────► PSMS / PTOCS  (capability updates)
       PPS  (values)             ► PPS  (policy amendments, e.g. learning policy)
```

In VSM terms, ACSMS is **System 4 (Intelligence) directed inward**: where PEOS and PTOCS point System 4 at the external environment and the toolset, ACSMS points it at the agent itself — scanning the self for gaps and planning its development.

## Inputs

- **PRAS adaptations** — deliberations whose proposed change is a capability change (`feeds: acsms`).
- **PKTS signals** — behavioral drift, skill-acquisition evidence, attention patterns.
- **PTOCS capability-gap analysis** — objectives lacking supporting objects or skills.
- **PSMS capability facets** — the current tiers of what the agent holds.
- **PPS** — values, strategy, and the learning policy that governs promotion criteria.

## Outputs

- **Improvement intents → AIAS** — each accepted program becomes a committed, resource-feasible intent entering the Active Intent Set.
- **Capability updates → PSMS / PTOCS** — new `capability_skill` entries, tier promotions, and retirements, with the evidence that justifies them.
- **Policy amendments → PPS** — changes to how the agent learns (criteria, cadence, culling decisions).

## The Improvement Lifecycle

```
Detect ──► Deliberate ──► Commit ──► Practice ──► Evidence ──► Consolidate
                                                                     │
              Cull ◄──── Review ◄────────────────────────────────────┘
```

| Stage      | Function |
| ---------- | -------- |
| `Detect`     | A gap surfaces: from PTOCS analysis, PRAS reflection, PKTS drift, or PPS strategy. |
| `Deliberate` | The gap is argued into a program: scope, expected value, cost, and success evidence. |
| `Commit`     | The program enters AIAS as a committed intent — it now competes for real resources. |
| `Practice`   | Scheduled work happens (via AOOS/AWES): reading, building, doing, teaching. |
| `Evidence`   | Output is produced and judged. Exposure is not acquisition; output is the test. |
| `Consolidate`| Demonstrated capability is written back: PTOCS entry, PSMS tier promotion, spaced-review schedule. |
| `Review`     | Held capabilities are revisited on a spaced schedule; anything unrevisited is assumed to be decaying. |
| `Cull`       | Deprioritized capabilities are explicitly retired from active maintenance — the decision is recorded so it can be revisited. |

## Relations

- [PTOCS](../asrs/ptocs/) — the ledger ACSMS writes into; source of gap analysis and `capability_skill` entries.
- [ASRS / PSMS](../asrs/psms/) — the self-model facets (capability, resource, commitment) kept truthful by consolidation.
- [PRAS](../pras/) — upstream source of adaptation proposals (`feeds: acsms`).
- [AIAS](../aias/) — where improvement programs become committed, schedulable intents.
- [PPS](../../pps/) — the normative layer; its learning policy defines the tiers and promotion criteria ACSMS enforces.
- [PKTS](../pkts/) — longitudinal behavioral evidence for skill acquisition and decay.
