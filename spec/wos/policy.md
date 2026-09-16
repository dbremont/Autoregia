# WOS Seed — the poll-specs file

This is the policy specification for **`app/module/wos/config/seed.json`**:
the file that defines what WOS polls. It lives inside the module (next to the
code it configures) and is **committed** — curating what the agent observes is
a data edit, not a code edit.

Status: **adopted** (2026-09, revised 2026-09-16). Companion to
[`spec.md`](spec.md), [`collection.md`](collection.md) (collection etiquette)
and [`../../app/module/wos/README.md`](../../app/module/wos/README.md).

## Purpose

- One human-editable registry of the sources WOS watches (today: mostly
  Nitter handles plus paper/RSS feeds; anything in `SOURCE_REGISTRY`).
- The file is the **single source of truth** for the poll set: the server
  reads it directly — sources are *not* stored as CouchDB documents.
- **No topic semantics.** A spec is a plain poll instruction; classifying
  observations into topics belongs to the downstream processing pipeline.

## Location & resolution

WOS resolves the file in this order (first hit wins):

1. `WOS_SOURCES_FILE` env var — a path (used by the test suite).
2. `app/module/wos/config/seed.json` — the canonical file, **committed**.

The server re-reads the file on every `/api/sources` (and once at import for
`settings`); edits take effect without restarting, no sync step needed.

## Schema

```jsonc
{
  "version": 1,
  "updated_at": "2026-09-16T00:00:00Z",
  "description": "…",
  "settings": {
    // ordered by reliability; first entry is the primary mirror.
    // Precedence: WOS_NITTER_INSTANCES env > this list > code default.
    "nitter_instances": ["nitter.net", "nitter.click", "xcancel.com"]
  },
  "sources": [
    {
      "id": "nitter-karpathy",       // stable key: <source>-<query>; drives STATE-<id>
      "source": "nitter",
      "query": "karpathy",           // handle without @ (semantics per source kind)
      "interval_s": 0,               // 0 → source default (1800 s for nitter)
      "enabled": true
    }
  ]
}
```

Query semantics per source kind: free-text search (hackernews, lobsters,
gdelt, crossref, openalex), subreddit (reddit), hashtag (mastodon), X handle
(nitter), full feed URL (rss), arXiv API syntax (arxiv), `all` or substring
filter (biorxiv).

## Semantics

- The file is **actual configuration**, not desired state to reconcile: the
  collector sweeps `GET /api/sources?enabled=true` and polls by `id`.
- `enabled: false` specs stay listed but are not swept (paused, not forgotten).
- The nitter instance list under `settings` feeds `WOS_NITTER_INSTANCES`
  (env wins) so mirror ordering is data, not code.
- Observations carry **no** topic tags; poll cursors (`STATE-<id>`) key on the
  spec `id`.

## Editing rules

- Adding a source: append a spec following the schema; keep
  `id` = `<source>-<query>` and make it unique.
- Retiring a source: remove it from the file (the server picks it up on the
  next `/api/sources` read; its `STATE-` cursor may linger harmlessly).
- Reordering `settings.nitter_instances` is allowed; keep the most reliable
  mirror first.
- Update `updated_at`; keep JSON valid (`python3 -m json.tool`).

## Operations notes

- Sources must remain **free and no-auth** (spec.md, Decision 3). Nitter
  mirrors come and go; the canonical list of live instances is maintained by
  the community at the *shitter* wiki (codeberg.org/mv12star/shitter/wiki/
  Instances), with uptime at status.d420.de — check them when polls start
  failing. The shipped list is the 2026-09-16 normalized set:
  `nitter.net`, `nitter.click`, `xcancel.com`.
- Politeness: the nitter source defaults to a 1800 s interval; keep
  `interval_s: 0` unless a source asks otherwise.
- Tweet `native_url`s are rewritten to `twitter.com/…/status/…`, so stored
  observations stay mirror-independent.
