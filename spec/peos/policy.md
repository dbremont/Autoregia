# PEOS Sources Policy — the tracked-sources file

This is the policy specification for **`config/peos_sources.json`**: the file
that defines what PEOS tracks. It lives **outside the code tree**, at the
repository root, so curating what the agent observes is a data edit, not a
code edit.

Status: **adopted** (2026-09). Companion to [`spec.md`](spec.md) (Decision 3
— Source policy), [`collection.md`](collection.md) (collection etiquette) and
[`../peos/README.md`](../../app/module/peos/README.md).

## Purpose

- One human-editable registry of the sources PEOS watches (today: Nitter
  handles; tomorrow: any source in `SOURCE_REGISTRY`).
- The file doubles as the **seed** for fresh installs and the **desired
  state** for reconciling a running deployment.
- Decouples the tracking list from code releases: retargeting observation is
  a config commit, not a module change.

## Location & resolution

PEOS resolves the file in this order (first hit wins):

1. `PEOS_SOURCES_FILE` env var — a path, absolute or CWD-relative (used by
   the test suite to pin the bundled seed).
2. `config/peos_sources.json` at the repository root — the canonical file,
   **committed**.
3. Bundled fallback `app/module/peos/data/nitter_handles.json` — only for
   fresh checkouts; kept so a missing config file never breaks the server.

As with every PEOS seed, the file is applied to CouchDB **only when the DB is
empty** (repo invariant, see `AGENTS.md`). A running DB is reconciled via the
sync helper (below), never by re-seeding.

## Schema

```jsonc
{
  "version": 1,
  "updated_at": "2026-09-13T00:00:00Z",
  "description": "…",
  "settings": {
    // ordered by reliability; first entry is the primary mirror.
    // Precedence: PEOS_NITTER_INSTANCES env > this list > code default.
    "nitter_instances": ["xcancel.com", "nitter.net",
                         "nitter.privacydev.net", "nitter.poast.org"]
  },
  "sources": [
    {
      // Exact PEOS topic-doc schema, so the file is directly seedable:
      "id": "TOPIC-nitter-karpathy",
      "doc_type": "topic",
      "topic_id": "nitter-karpathy",   // convention: <source>-<query>
      "source": "nitter",
      "query": "karpathy",             // handle without @
      "interval_s": 0,                 // 0 → source default (1800 s)
      "enabled": true,
      "created_at": "2026-09-13T00:00:00Z",
      "name": "karpathy",              // display name
      "domain": "ml",                  // coarse topic tag (UI filter)
      "note": "…"                      // why this source is tracked
    }
  ]
}
```

`domain` vocabulary (advisory, not enforced): `ml`, `sw`, `stats`, `econ`,
`markets`, `geopolitics`, `politics`, `china`, `tech`, `science`, `bio`.

## Semantics

- The file is **desired state**; the CouchDB DB is **actual state** (topics +
  observations + poll cursors). There is no runtime watcher — reconciliation
  is explicit.
- `enabled: false` entries are recorded but not seeded/synced as active
  topics (paused, not forgotten).
- The nitter instance list under `settings` feeds `PEOS_NITTER_INSTANCES`
  (env wins) so mirror ordering is also data, not code.

## Sync workflow

```sh
python3 app/module/peos/sync_sources.py             # create missing topics
python3 app/module/peos/sync_sources.py --dry-run   # preview
python3 app/module/peos/sync_sources.py --prune     # disable topics absent
                                                             # from the file
PEOS_BASE_URL=http://localhost:8081/peos python3 …           # target a deployment
```

- Creates missing topics (skipping ones that exist — HTTP 409 is success).
- `--prune` **disables** (never deletes) nitter topics not in the file.
- Positional args filter to specific queries.
- Observations and history are never removed by a sync.

## Editing rules

- Adding a source: append a topic doc following the schema; keep
  `topic_id` = `<source>-<query>`; fill `name` / `domain` / `note`.
- Retiring a source: remove it from the file, then run a sync with
  `--prune` (it is disabled in the DB, not deleted).
- Reordering `settings.nitter_instances` is allowed; keep the most reliable
  mirror first.
- Update `updated_at`; keep JSON valid (`python3 -m json.tool`).

## Operations notes

- Sources must remain **free and no-auth** (spec.md, Decision 3). Nitter
  mirrors come and go; the canonical list of live instances is maintained by
  the community at the *shitter* wiki (codeberg.org/mv12star/shitter/wiki/
  Instances), with uptime at status.d420.de — check them when polls start
  failing. The shipped list was probed 2026-09-13; dead mirrors
  (`nitter.net`, `nitter.poast.org`, `nitter.privacydev.net`) were removed.
- Politeness: the nitter source defaults to a 1800 s interval; keep
  `interval_s: 0` unless a source asks otherwise.
- Tweet `native_url`s are rewritten to `twitter.com/…/status/…`, so stored
  observations stay mirror-independent.
