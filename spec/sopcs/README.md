# Standard Operating Procedure Catalog System

> A **Standard Operating Procedure Catalog System (SOPCS)** is a technical
> object engineered to `store, retrieve, and maintain standard operating
> procedures` — the written, reviewable way things are done, held as
> first-class documents with a lifecycle instead of as habit.

Within the Autoregia Personal Viable System Model (PVSM), SOPCS is a tool
of the **Agent Toolbox Ecosystem (ATE)** — the procedure-knowledge layer:
where [CTES](../ctes/) runs the work, SOPCS holds the *how* of the work
that must be repeatable. It is deliberately a catalog, not a wiki: each
document is one procedure with an owner's lifecycle (draft → active →
deprecated), full-text and semantic retrieval, and an audited mutation
trail.

## Status

**Implemented** — a WOS-style working app: the library (pagination,
status/tag facets, reading time, sort), the reader (rendered markdown via
the shared renderer, sticky TOC, metadata), the editor (Write/Preview
toggle, markdown toolbar, figure insertion via picker/paste/drag-drop as
CouchDB attachments), lexical search inside CouchDB, optional semantic
search (fastembed, graceful degradation), audit, and self monitoring:

    /ate/tool/sopcs/

- Full design: [spec.md](spec.md)
- Sibling execution tool: [CTES](../ctes/)
- Dependability context: [Dependability — Fault Tolerance & Continuity](../dependability.md)
