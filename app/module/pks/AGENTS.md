# AGENTS.md — PKS (Personal Knowledge System)

## Purpose

The Agent Knowledge substrate: a landing plate, the Lebrija Spanish trainer,
and the **Naturgnosis Index** — one universal space aggregating Naturgnosis's
five graph spaces, with an editable node overlay (add / change / remove) that
will migrate to Epistecnica after Naturgnosis freezes. Spec: `spec/pks/`.

## Layout

- `server.py` — Flask app mounted at `/pks/`; serves the plate, the trainer,
  the snapshot JSON, and the node overlay + legacy notes APIs.
- `static/index.html` — PKS landing plate.
- `static/naturgnosis/index.html` — the universal index (deck.gl canvas,
  restyled to Autoregia tokens) + `vendor/` renderer copies.
- `learn/lebrija/` — vendored Spanish norma-culta trainer (upstream code; keep
  its paths under `/pks/learn/lebrija/`).
- `data/naturgnosis-index.json` + `naturgnosis-layout.json` — committed
  snapshot (16,165 nodes, five spaces) with a `snapshot` provenance block.
- `bin/snapshot_naturgnosis.py` — rebuilds the snapshot from the committed
  Naturgnosis mirrors and validates completeness.
- `test_pks.py` — snapshot + node overlay + notes API tests (CouchDB required;
  `pks_test_` prefix).

## Commands

```sh
python3 app/module/pks/server.py                  # standalone on :5007
AUTOREGIA_PORT=8090 python3 app/app.py            # mounted at /pks/
python3 app/module/pks/bin/snapshot_naturgnosis.py  # refresh the snapshot
python3 app/module/pks/bin/snapshot_naturgnosis.py --check-live http://127.0.0.1:8011
env/bin/python -m pytest app/module/pks/test_pks.py
```

## Invariants

- **Do not snapshot the live Naturgnosis CouchDB.** It has stale docs
  (import duplicates, the dropped Bottema monograph, legal/rights artifacts
  moved back to Social). Build from the committed
  `app/data/universal-{graph,layout}.json`; the builder fails on incomplete
  data. `--check-live` only *reports* drift.
- **The snapshot is immutable; nodes are editable through an overlay.** Never
  edit `data/naturgnosis-index.json` by hand. CouchDB `pks` docs:
  - node add/edit: `{id: "node-<uid>", kind: "node", uid, space, name,
    category, layer, description, tags, origin: "local"|"override", x, y}`
  - base deletion: `{id: "tombstone-<uid>", kind: "tombstone", uid, space}`
  The client merges snapshot + overlay − tombstones. Local nodes carry their
  own `x,y`; base overrides keep the snapshot layout.
- **`uid = "<space>:<source_id>"`.** The five spaces are `social`, `research`,
  `technique`, `epistemica`, `nature`. New nodes mint `<space>:<slug>` (suffix
  on collision). `space` and `uid` are immutable after creation. Every node
  keeps its `source` (badge, colour, filter).
- **Node UI is a state machine in the detail panel.** `VIEW` shows content +
  **Edit/Delete after the content**; `EDIT` shows the form + **Save/Cancel**;
  `ADD` is the empty form. `+ Node` (canvas, always active) starts `ADD`.
  Save writes the node (`POST`/`PUT`), Delete confirms and writes a
  tombstone/removes the local doc. No modal, no inline edit outside `EDIT`.
- **Keybindings + help.** One `KEYMAP` array drives both the help modal and the
  handler: `/` search, `R` random visible node, `A/E/D` add/edit/delete,
  `F` fit, `O` overview, `1–5` toggle a space, `S/X` all/none, `?` help,
  `Esc` close/cancel, `⌘/Ctrl+↵` save the open form. Keys are ignored while
  typing in inputs; modifier combos are left to the browser. The `?` control
  sits next to `+ Node` in the canvas-tools cluster.
- **Node API** (relative to `/pks`): `GET /api/nodes/overlay`,
  `POST /api/nodes`, `PUT/DELETE /api/nodes/<uid>`,
  `GET /api/nodes/export?format=json|md`, `GET /api/health`. Unknown uids are
  404; `space` changes are 400. The **export nodes** links live in the
  snapshot overview modal footer.
- **Legacy notes API** (`/api/notes`) remains for previously authored
  annotations and is intentionally excluded from the node UI; node docs must
  never leak into it (`id` prefix `note-`).
- **Export** lives in the canvas-tools cluster (`⇩ Export`, next to fit):
  a two-option menu for the node overlay (JSON / Markdown) using
  `/api/nodes/export`. The overview modal keeps the same links.
- **Viewer assets:** the deck.gl renderer (`static/naturgnosis/vendor/`) is a
  copy of Naturgnosis's `socio-graph.js` with light-theme label/edge colours
  and an `annotatedSet` gold-ring layer (used here for local/edited nodes).
  `prefix_assets.py` skips `vendor/`.
- **No source deep links.** The space identity is carried by the `space:id`
  badge (`social:10`), not by a link into the frozen Naturgnosis deployment.
- **Design:** light Autoregia tokens only (`/ui/css/{tokens,fonts,base}.css`);
  no CDN fonts, no dark theme.
- The PKS mount is a real `SUBSYSTEMS` entry — do not reintroduce `/pks/`
  plate routes in `app/app.py`.
