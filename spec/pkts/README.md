# Personal Keyword Tracking System (PKTS)

> PKTS is the **Personal Keyword Tracking System** — an Autoregia sub-project within the **Accounting System** (VSM System 3 – Audit / Accounting). It tracks resource usage and keyword attention over time, complementing the [Personal Recording System (PRS)](../prs/README.md).

> This sub-project is currently a skeleton. Conceptual foundations, architecture, and implementation are to be developed here.

Parts:

- Client
- Data Capturing
- Data Ingestion and Storage

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Sibling sub-project:** [PRS](../prs/README.md) — the recording system for externalized state.
- **Shared schema:** [`records_schema.json`](../records_schema.json) — the atomic record unit shared across PRS and PKTS.
- **Decision log:** [`logos.log.md`](../logos.log.md) — conceptual and design rationale.
- **Project index:** [`index.html`](../index.html) — the Autoregia landing page.

## Scope (to be elaborated)

PKTS addresses the **keyword/attention accounting** dimension of self-management:

- Track the recurrence, intensity, and grouping of topics and keywords over time.
- Quantify how attention (time, energy) is distributed across domains.
- Surface attention drift, recurring themes, and emerging interests.
- Provide inputs to the Intelligence System (System 4) for review and adaptation.

## Planned Structure

```
pkts/
├── README.md   # this document
├── spec.md     # (planned) conceptual foundations & architecture
└── ...         # (planned) implementation
```

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
