# Personal Policy System (PPS)

> PPS is the **Personal Policy System** — an Autoregia sub-project that implements the agent's **policy apparatus** (VSM System 5 – Policy). It sets long-term direction, charters identity and values, prioritises competing commitments, and issues the rules and constraints that govern the agent's behaviour.

> Where the **Situation Model** captures *how things are right now*, and **PSMS** captures *what the agent enduringly is*, PPS captures *what the agent ought to do and be* — the normative layer that turns self-knowledge into self-direction. It is the **regulatory counterpart** to the descriptive self model.

> The current implementation ([`pps/`](../../../pps/)) is a lightweight policy-document server: HTML pages under [`policies/`](../../../pps/policies/) with a charter as apex, full-text search, and a main-entry index. This spec describes the conceptual foundations; the implementation is already running.

## Formulation

> How to think about a `Personal Policy System`?

A `Personal Policy System` is a technical object with the role of externalising the agent's **normative self-direction** to scaffold extended agency:

- make identity, values, principles, and commitments explicit, inspectable, and revisable,
- provide the authoritative source of "what the agent stands for" — the criterion against which decisions, plans, and behaviour are evaluated,
- resolve conflicts among competing commitments and values through explicit prioritisation and reconciliation,
- and write its decisions into the **Self Model** (PSMS), so policy is not a separate silo but the governing layer of a unified self model.

### The Policy Apparatus — what it is

The policy apparatus is a **normative, declarative structure**: it says nothing about *what the agent is doing right now* (that is Control's job) or *what the agent enduringly is* (that is PSMS's job) — it says *what the agent should do, be, and prioritise*. It is the a priori rulebook that makes coherent self-governance possible.

PPS externalises this rulebook so it is no longer buried inside habit, assumption, or implicit preference. Making it explicit is what allows policy to be reviewed, revised, reconciled, and — crucially — **written into the self model** as structured, inspectable facets.

### Atomic Units

PPS operates with policy documents:

| Element | Role |
| --- | --- |
| **Charter** | The apex document — states identity, purpose, and the constitution from which every other policy derives. Links to every domain policy. |
| **Principle** | A fundamental truth or rule that guides behaviour across domains (e.g., "prefer async communication"). |
| **Value** | A ranked priority that informs trade-offs (e.g., "health > productivity"). |
| **Commitment** | A standing obligation the agent has taken on (e.g., "family dinner nightly"). |
| **Domain Policy** | A policy scoped to a specific domain — health, learning, conduct, finance, etc. — that derives from the charter and principles. |

A PPS policy, once issued, becomes an instance of a PSMS facet:
- the **Charter** populates PSMS's Identity facet,
- **Principles** and **Values** populate PSMS's Constraint facet,
- **Commitments** populate PSMS's Commitment facet.

### Generative function

Because policy is declarative and structured, it can **generate direction** rather than only describe it:

- derive **decision criteria** from ranked values (when values conflict, the rank tells the agent which way to lean),
- propose **policy revisions** when PRAS feedback reveals that actual behaviour consistently violates stated policy (the model says one thing, the data says another),
- and expose a **policy consistency check** — does a given plan or intention violate any standing principle or commitment?

## Relation to Autoregia

- **Parent:** [Autoregia](../../../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Policy System** (VSM System 5 – Policy) — the regulatory/normative apparatus that sets direction, identity, and constraints.
- **Loop stage:** feeds **Regulation** (policy is the standard against which behaviour is regulated) and **Learning** (policy is revised when it no longer serves the agent).
- **VSM level:** **System 5 – Policy** exclusively.
- **Foundational for (what assumes PPS):** [PSMS](../psms/) (PSMS's Identity, Commitment, and Constraint facets are written by PPS); **Control** (priorities and constraints inform scheduling); **Audit** (deviation detection compares behaviour to policy).
- **Adapted by (what revises PPS):** [PRAS](../../pras/) (feedback that triggers policy revision when actual behaviour diverges).
- **Implementation:** [`pps/`](../../../pps/) — Flask server, HTML policy documents, full-text search.

### Canonical Distinction from PSMS

PSMS and PPS both map to System 5 and both touch identity, commitments, and constraints. Their roles are complementary but distinct — see [PSMS README §Canonical Distinction from PPS](../psms/README.md#canonical-distinction-from-pps) for the full comparison table.

In short: **PPS is the agent's policy apparatus** — the active system that does the work of setting direction. **PSMS is the self model substrate** — the schema + registry that PPS operates on. PPS without PSMS would set policy without a coherent model of whom it governs; PSMS without PPS would be a static registry with no way to resolve conflicts or issue new direction.

## Scope

PPS addresses the **normative / policy** dimension of self-management:

- Maintain a set of policy documents: charter, principles, values, commitments, domain policies.
- Expose the policy set as the authoritative source of identity, values, and constraints.
- Provide search and cross-reference so policies are navigable and findable.
- Enable policy reconciliation (when commitments conflict, which takes priority?).
- Write policy decisions to PSMS as structured self-model facets.
- Stay at the *normative/regulatory* level — what the agent *should* do, not what it *is* doing (Control) or what it *is* (PSMS).

## Planned Evolution

The current implementation is a document server. Planned enhancements:

- **Policy reconciliation** — a mechanism for detecting and resolving conflicts between policies (e.g., "learning" says study 2h/day, "health" says sleep 8h — reconcile).
- **PSMS integration** — write charter → PSMS Identity, principles/values → PSMS Constraint, commitments → PSMS Commitment automatically.
- **Decision log** — record policy decisions and their rationale (when was a value re-ranked? why was a commitment added?).
- **Version history** — track revisions to each policy document over time.

## References

- [`about.md`](../../about.md) — the Autoregia model: agent, control loop, VSM, PVSM.
- [Personal Self Model System (PSMS)](../psms/) — the self model substrate; PPS writes its decisions to PSMS facets.
- [Personal World Model System (PWMS)](../pwms/) — the counterpart model of the external world.
- [Personal Recording System (PRS)](../../prs/) — records policy decisions and their rationale.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Autoregia UI Specification](../../ui.spec)
