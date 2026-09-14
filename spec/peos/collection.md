# PEOS Collection Policy

How PEOS collects what *other agents* say about the world. This document is
binding for every source adapter and every way of triggering collection
(manual polls today, automation later — see
[`automation.md`](automation.md) for the future mechanism).

Status: **in force** (2026-09). Companion documents:
[`policy.md`](policy.md) (the tracked-sources file),
[`spec.md`](spec.md) (Decision 3 — source policy),
[`../peos/README.md`](../../app/module/peos/README.md).

## Scope and grounding principles

1. **Public, no-auth feeds only.** No scraping behind logins, no API keys for
   paid tiers, no circumvention of authentication. If a feed requires a
   session token to serve an individual user's view, PEOS does not use it.
2. **Personal scope.** Collected observations live in this deployment's
   CouchDB and serve this agent's orientation. Nothing is republished;
   nothing is shared onward.
3. **Attribution.** Every observation keeps a pointer to its origin
   (`native_url` is rewritten to the canonical site — e.g. tweets to
   `twitter.com/…/status/…` — regardless of which mirror served it).
4. **Minimum footprint.** Free mirrors and public APIs are volunteered
   infrastructure. Collection volume is bounded by the rules below; when in
   doubt, poll slower.

## Rule → mechanism table (auditable against code)

| Rule | Mechanism | Where |
|---|---|---|
| Poll slowly by default | per-source `default_interval_s` (nitter: 1800 s — "use the RSS, slowly"; arXiv/OpenAlex/Crossref: 6 h; bioRxiv: daily; generic rss: 12 h); topic `interval_s: 0` means "source default" | `sources/*.py`, `poll_one()` |
| Respect documented API floors | arXiv: **one request per 3 seconds minimum**, enforced module-wide in the adapter | `sources/arxiv.py` `_throttle()` |
| Identify to polite APIs | OpenAlex and Crossref accept a `mailto` parameter (env `PEOS_CONTACT_EMAIL`) that puts us in their polite pool | `sources/openalex.py`, `sources/crossref.py` |
| Never refetch what the DB has | incremental cursors: each topic's `STATE-<id>` doc stores `last_fetched_ms`; sources filter by `since_ms`; observations dedup by `sha1(source:native_id)` | `server.py` `poll_one()`, `sources/base.py` `obs_id()` |
| Progress is resumable | cursors live as CouchDB documents, not in memory — restarts never rewind | `STATE-` docs |
| Mirror load is spread | nitter fails over through an ordered instance list, live mirrors first (probed 2026-09-13); dead mirrors are *removed*, not retried forever | `sources/nitter.py`, `config/peos_sources.json` `settings.nitter_instances` |
| Errors are not hammering opportunities | failed polls record `last_error` / `error_count` on the cursor; repeated failures must not trigger tighter retries | `poll_one()` state update |
| Manual polls are the exception | the UI "poll" button (and `POST /api/poll` with `force: true`) bypasses the interval gate — use sparingly, never in loops | `POST /api/poll` |
| Be honest about the client | some free feeds (GDELT, Reddit) block non-browser User-Agents; the browser-like UA is required for parity with real readers and is overridable via `PEOS_USER_AGENT` | `sources/http_util.py` |
| Collection only writes locally | polls write observations + cursors into this deployment's CouchDB; no third-party calls beyond the feed fetch itself | `Store`, `poll_one()` |

## Manual mode (current)

Today there is **no automatic collection**. Data enters the database only
when a poll runs: the Sources view's per-source "poll" button, or an explicit
`POST /api/poll`. The tracked sources live in
[`config/peos_sources.json`](../../config/peos_sources.json) (desired state);
the DB holds the topics, the cursors, and the observations (actual state).

Scientific-paper sources (arXiv, OpenAlex, Crossref, bioRxiv, generic journal
RSS) follow the same rules; alphaXiv is **deferred** as a poll source — its
programmatic surface is an MCP server (auth + assistant quota), better suited
to a future ATE agent tool than to the slow-poll collector.

Even in manual mode, the table above applies in full: a poll fetches only
what is new since the cursor, so repeated polls are cheap for the source and
idempotent for the database.

## Hygiene practices

- Before bulk-enabling new sources, check the mirror/service is healthy
  (nitter uptime: `status.d420.de`; instance list: the *shitter* wiki).
- When a source starts failing consistently, prefer *disabling the topic*
  (enabled → false in the sources file, then a sync) over retrying harder.
- Keep default intervals; shorten only with a reason recorded in the topic's
  `note`.
