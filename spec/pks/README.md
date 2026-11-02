# Personal Knowledge System

> A **Personal Knowledge System (PKS)** is a technical object engineered to
> `externalize knowledge` — it holds the corpus of what the agent knows:
> concepts, episteme, and technique, indexed and retrievable for understanding
> and action.

Within the Autoregia Personal Viable System Model (PVSM), PKS is the
**Agent Knowledge** substrate of the control loop.

## Status

**Active — first working surface.** PKS is mounted as a real sub-system:

    /pks/                    landing plate
    /pks/naturgnosis/        Naturgnosis Index (one universal space)
    /pks/learn/lebrija/      Spanish norma-culta trainer

- Concept and data model: [spec.md](spec.md)
- Epistemic lineage: [Naturgnosis](https://github.com/csiglab/Naturgnosis),
  [Epistecnica](https://github.com/dbremont/Epistecnica)

## Naturgnosis Index

Naturgnosis is being frozen. Its universal viewer (`/note/data/meta/graph/`,
built from `app/data/universal-graph.json`) aggregates the five graph spaces —
Social, Research, Technique, Epistemic, Nature — into one read-only canvas.
PKS hosts that canvas as a **space of spaces**:

- **Snapshot:** `app/module/pks/data/naturgnosis-index.json` (16,165 nodes) +
  `naturgnosis-layout.json`, committed with provenance
  (`source_commit`, `source_generated`). The snapshot is immutable.
- **Completion gate:** `bin/snapshot_naturgnosis.py` rebuilds it from the
  *committed* Naturgnosis mirrors and refuses to write unless per-space counts,
  uid uniqueness, layout coverage, and edge targets all check out. It never
  imports the live Naturgnosis CouchDB — that DB carries stale docs (import
  duplicates, the dropped Bottema monograph, artifacts moved back to Social).
- **Node overlay:** each node keeps the space it belongs to (badge, colour,
  filter, `space:id` identity). The 16,165 snapshot nodes stay immutable; PKS
  stores an overlay in CouchDB (`pks` DB) of **local** nodes, **overrides** of
  base nodes, and **tombstones** for deletions. The panel is a state machine:
  `VIEW` shows content with **Edit/Delete after the content**; `EDIT` shows the
  form with **Save/Cancel**; `ADD` (the always-active `+ Node` canvas control)
  is the empty form. Save writes the node; Delete removes a local node or
  tombstones a base node. The overlay exports as JSON or Markdown for the
  Epistecnica hand-off, and local/edited nodes carry a gold ring. There is no
  link back to the frozen Naturgnosis deployment; the `space:id` badge carries
  provenance.

The source corpus is frozen; the node overlay is the living layer that migrates.
