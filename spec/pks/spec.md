# Personal Knowledge System

> This document will establish the conceptual foundations, data model, functionality,
> and design of a **Personal Knowledge System (PKS)**. A PKS is a technical object
> engineered to `externalize knowledge` — it holds the corpus of what the agent
> knows: concepts, episteme, and technique; it indexes that corpus and makes it
> retrievable for understanding and action.

> Within the Autoregia Personal Viable System Model (PVSM), PKS is the
> **Agent Knowledge** substrate: the third agent-side element of the loop, beside
> the Agent (AGS · GIS) and Capability Growth (ACSMS). Where the
> [GIS](../gis/) indexes *everything the agent knows and uses* — the entry
> point — PKS is the knowledge itself: the structured corpus the index points
> into.

## Concept

Knowledge, for an agent, is the set of epistemic elements that make reality
navigable — that render the world intelligible as a domain of understanding and
action. PKS will hold those elements as a typed, linked corpus: each element
declared, related to others, and connected to the activity systems where it is
used. Its design is not yet written.

## Status

**Active — first working surface.** PKS is mounted at `/pks/` as a real
sub-system. It hosts the landing plate, the Lebrija trainer
(`/pks/learn/lebrija/`), and the **Naturgnosis Index**
(`/pks/naturgnosis/`).

## Naturgnosis Index

The first materialization of the corpus is a frozen snapshot of Naturgnosis —
the sibling project that formalizes the epistemic elements and the world's
technique and episteme. Naturgnosis's five graph spaces (Social, Research,
Technique, Epistemic, Nature) are merged into one universal space; every node
keeps the space it belongs to.

- **Immutable snapshot.** `data/naturgnosis-index.json` (16,165 nodes) +
  `data/naturgnosis-layout.json`, taken from the committed Naturgnosis mirrors
  at a recorded commit, with a completeness gate in
  `bin/snapshot_naturgnosis.py` (counts, unique uids, layout coverage, edge
  targets). The live Naturgnosis CouchDB is deliberately not used: it carries
  stale docs removed or renamed in the repository.
- **Node overlay.** The 16,165 snapshot nodes are immutable, but the index is
  editable through an overlay stored in the `pks` CouchDB database:
  additions (`origin: local`), edits of base nodes (`origin: override`), and
  deletions (tombstones). Nodes are written from the detail panel's state
  machine (`VIEW → EDIT → Save/Cancel`; `+ Node → ADD`), and the overlay
  exports as JSON/Markdown for Epistecnica.
- **Why.** Naturgnosis will freeze and its notes move to Epistecnica; PKS is
  the editable index that survives the freeze, keeping each node anchored to
  the space it came from.

The snapshot is evidence; the node overlay is judgement. That separation is
deliberate: the base corpus is never rewritten, while additions, changes, and
removals remain attributable and exportable.

## References

- **Naturgnosis** — formalizes the epistemic elements that enable an agent to
  navigate reality, especially social reality; an index of the world's
  technique and episteme: <https://github.com/csiglab/Naturgnosis>
- **Epistecnica** — a unified framework for the two fundamental dimensions of
  human agency: knowing (Epistemica) and acting (Tecnica):
  <https://github.com/dbremont/Epistecnica>
