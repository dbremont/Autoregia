# WOS Automation — Recommended Architecture

The future mechanism for feeding the database. Collection today is **manual**
(see [`collection.md`](collection.md)); this document fixes the target
architecture so the eventual implementation is a matter of executing a decided
design, not a new debate.

Status: **proposal** (2026-09). Not implemented yet. Companion documents:
[`collection.md`](collection.md) (binding policy — automation must enforce
every rule there), [`policy.md`](policy.md) (tracked-sources file),
[`spec.md`](spec.md).

## Invariants any mechanism must keep

1. Only the server process writes to CouchDB; automation drives it (HTTP API
   or in-process call), it never opens its own write path.
2. Every fetch is incremental (`STATE-` cursors) and deduped
   (`sha1(source:native_id)`) — restarts and crashes never rewind or duplicate.
3. Every politeness rule in [`collection.md`](collection.md) is enforced by
   code, not by convention.
4. The seed file (`config/seed.json`) is the *poll-set configuration*; the
   database holds the *actual state* (cursors + observations). The server
   re-reads the file per catalogue request — edits apply immediately and no
   reconcile step is needed; history is never deleted.

## Phase 2 — embedded feeder (next implementation step)

A background thread inside the WOS server process. Chosen over a second
container process because Autoregia deploys as one Flask app (`Dockerfile CMD
python app/app.py`) and no process-supervision change is desired.

```
server.py (startup)
  └─ feeder thread (daemon)
       every WOS_SWEEP_S (60 s):
         specs ← enabled sources (in-process, no HTTP self-call)
         for spec in due(spec, state_cursor):        # max ~10 per sweep
             poll_one(spec)                           # existing code path
```

- **Due gating**: `(now − last_fetched_ms) ≥ interval_eff`, where
  `interval_eff = (spec.interval_s or source default) × backoff × jitter`.
- **Backoff**: `min(2 ** error_count, 48)` — consecutive errors double the
  wait up to ~24 h at the nitter default; success resets `error_count`.
  (The cursor already tracks `error_count`; automation only reads it.)
- **Jitter**: ±10% per spec, so cohorts never poll in lockstep.
- **Per-sweep cap** (~10 sources, oldest-fetched first): after downtime or a
  bulk import, recovery is spread over minutes instead of stampeding mirrors.
- **Nitter respect**: stop at the first mirror that answers; `WOS_NITTER_ALL=1`
  restores the recall-maximizing all-mirrors sweep for rare backfills.
- **Kill switch**: `WOS_FEEDER=0` disables the thread (local dev against a
  live deployment, debugging).
- Start after `_ensure_search_layer()`; log each sweep's summary line.

Effort estimate: ~100 lines + tests; no Dockerfile or infra changes.

## Phase 3 — the sophisticated mechanism (later)

Only if/when Phase 2's single thread becomes the bottleneck:

- **Standalone scheduler** (the `collector.py` pattern, kept): a separate
  process driving the server over HTTP — survives server restarts, can live
  on another host, and makes "automation down" observable as a distinct
  failure mode.
- **Per-source workers + queue**: due specs are pushed onto a bounded queue;
  workers fetch in parallel with per-source concurrency limits (RSS feeds:
  1). The server-side `poll_one` stays the only writer.
- **Circuit breakers per source**: a source failing N consecutive polls is
  opened (no fetches) for a cooldown, surfaced in the Sources view as a
  state chip, and half-open probes resume it.
- **Self-hosted nitter instance** (see the *shitter* wiki self-hosting
  guide): removes dependence on volunteer mirrors for the highest-volume
  source; the public instance list becomes fallback.
- **Observability**: poll outcomes (per sweep: due/fetched/failed/backed-off)
  as documents in a `wos_activity` log and rolled up on the LOOP dashboard;
  source latency and error rates visible per mirror.
- **Config reload**: the server re-reads the seed file on every catalogue
  request, so file edits apply immediately — no daemon restart, no DB
  reconcile step; cursors of retired specs simply go quiet (never deleted).

## Decision record

| Date | Decision |
|---|---|
| 2026-09 | Manual polls only; automation deferred (this document records the target design). |
| 2026-09 | Search executes inside CouchDB (ddoc `wos-search` + Mango indexes, created idempotently at startup) — `/api/search`. |
| 2026-09-13 | Nitter instance list probed and rebuilt (live mirrors first; dead mirrors removed). |
| 2026-09-14 | Scientific-paper sources added: arXiv, OpenAlex, Crossref, bioRxiv, generic RSS (`source_type="paper"`). alphaXiv deferred — MCP surface (auth + assistant quota) fits a future ATE agent tool, not the poll collector. |
