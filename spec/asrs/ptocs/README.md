# Personal Technical Object Catalog System (PTOCS)

> PTOCS is the **Personal Technical Object Catalog System** — an Autoregia sub-project within the **Intelligence System** (VSM System 4 – Intelligence). It builds and maintains a **catalog of the technical objects** (software, services, hardware, references, capabilities, and infrastructure) the agent uses in daily life, enabling their persistent recording, discovery, retrieval, navigation, and analysis over time.

> A technical object is any *made thing* the agent depends on to perceive, reason, decide, coordinate, or act. PTOCS externalizes **capability awareness**: what is available, where it lives, how it fits, what it depends on, and where the gaps are.

> This sub-project is currently a **specification skeleton**. Conceptual foundations, architecture, and data model are established here ([`spec.md`](spec.md)); the entry schema is [`schema.json`](schema.json); the machine-readable manifest is [`spec.json`](spec.json).

## Parts

- **Catalog** — the registry of technical object entries (the core data).
- **Retrieval & Navigation** — search, browse, capability discovery, and cross-references between entries.
- **Statistical Overlay (Analysis)** — analytical/statistical projections computed over the catalog (coverage, gaps, redundancy, dependency exposure, ecosystem health).

## Functionality

- **Insert** — register a new technical object entry.
- **Update** — revise an existing entry (provenance-preserving).
- **Delete** — retire or remove an entry from the catalog.
- **Retrieval** — search, browse, and navigate the catalog; discover tools by name, keyword, domain, or capability.
- **Statistical Overlay (Analysis)** — quantitative projections over the catalog (see [`spec.md`](spec.md) §Statistical Overlay).

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Intelligence System** (VSM System 4 – Intelligence) — scans, indexes, and reasons over the agent's available technical capabilities. Also feeds the **Inventory System** (resource visibility).
- **Sibling sub-projects:**
  - [PRS](../../README.md) — the recording system for externalized state.
  - [PKTS](../../README.md) — keyword/attention accounting.
- **Shared UI standard:** [`spec/ui.spec`](../ui.spec) — the canonical, project-wide UI specification every Autoregia tool must converge on.
- **Decision log:** [`logos.log.md`](../../logos.log.md) — conceptual and design rationale.
- **Project index:** [`index.html`](../../index.html) — the Autoregia landing page.

## Scope

PTOCS addresses the **capability indexing & discovery** dimension of self-management:

- Maintain a structured registry of the technical objects the agent relies on.
- Classify objects by kind, domain, capability served, hosting model, and lifecycle state.
- Capture provenance (origin, vendor, version, license, acquisition) and usage (interface, install, config, docs).
- Record relationships between objects (`depends-on`, `integrates-with`, `alternative-to`, `complements`, `supersedes`, …).
- Enable efficient discovery of the capabilities available to the agent for a given task or objective.
- Provide a **Statistical Overlay** that reveals coverage gaps, redundant capabilities, dependency exposure, and ecosystem health — feeding the Intelligence System's review and adaptation.
- Stay focused on *cataloging tools/objects*; daily links, papers, and notes belong to the [PRS](../../README.md).

## Planned Structure

```
ptocs/
├── README.md     # this document (about)
├── spec.md       # conceptual foundations, functionality, data model
├── schema.json   # JSON Schema for a PTOCS catalog entry
└── spec.json     # machine-readable spec manifest
```

```
ptocs/            # (planned) implementation
├── server.py
├── static/       # UI (HTML/CSS/JS per spec/ui.spec)
└── data/         # catalog store (JSON + SQLite)
```

## References

- [csiglab/Index](https://github.com/csiglab/Index) — the originating "Tool Index" concept and reference spec.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.so/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [Autoregia UI Specification](../ui.spec)