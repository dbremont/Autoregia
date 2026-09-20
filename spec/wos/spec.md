# World Observation System

> This document establishes the conceptual foundations, data model, functionality,
> and implementation of a **World Observation System (WOS)**. A WOS
> is a technical object engineered to `externalize the perception of the external
> world` — it watches what *other agents* say about the world on free public feeds,
> persists each item as a durable observation, and projects sense-making
> aggregates (volume, spikes, trending terms, tone, semantic clusters) over the
> collected corpus.

> Within the Autoregia Personal Viable System Model (PVSM), WOS is the
> **external sense organ** — the **Perception** stage of the agent control loop
> restricted to the *external* half of the `World = (External, Internal)`
> boundary. It maps to **VSM System 4 – Intelligence**: it is the input surface
> that scans the environment so that the rest of the system can synthesize,
> anticipate, and adapt. Where the [MAD](../mad/) records *internal* events (what
> the agent itself does, thinks, decides), WOS records *external* events (what
> other agents publish about the world).

Fundamentally, a WOS exists to maintain persistent representations of the
**external-world signals** relevant for effective orientation. These include:

- **Sources** — the watched poll specs (a handle, a search string, a subreddit,
  a feed URL) the agent has declared worth following, listed in
  `config/seed.json`. A source spec is the unit of attention WOS pays to the
  outside world; classifying what it yields into topics is the job of the
  downstream processing pipeline, not of collection.
- **Observations** — the atomic collected items: one comment, post, story, or
  article fetched from a source, normalized to a common shape, and persisted as
  an `observational` event (the [AGS](/about.html#elements) `observational` event-type defined as *"a
  reading the agent actively takes"*).
- **Poll Cursors** — the per-source state (last fetched, last observed, last
  error) that makes polling resumable, idempotent, and self-backing-off.
- **Sense-making Aggregates** — derived projections over the corpus (volume,
  spikes, trending terms, hot-now, semantic clusters, tone, co-occurrence) that turn
  raw observations into an orienting picture of what the world is saying.

By preserving these across time, a WOS functions as an externalized **perceptual
substrate**, reducing attention loss to ephemeral feeds, improving continuity of
environmental awareness, and giving the higher regulatory systems (Control S3,
Intelligence S4, Policy S5) a concrete object to reason over.

## Internal Composition

> WOS is a single System 4 composite of four cooperating components. The
> conceptual separation is real; the deployment boundary is one project (a Flask
> API server + a separate poller daemon).

```
WOS — World Observation System  (VSM System 4 – Intelligence, sensing)
 |
 +-- [S] Sources  — the feed adapters
 |     \_ One adapter per public feed (Hacker News, Lobsters, Reddit, Mastodon,
 |        GDELT). Each implements a common Source protocol and returns normalized
 |        Observations. Sources are deliberately free / no-auth so the sense
 |        organ has no single point of failure or paywall dependency.
 |
 +-- [C] Collector  — the poller daemon
 |     \_ A long-running process that sweeps the configured sources every few
 |        seconds and triggers a poll for each spec whose interval has elapsed.
 |        Pure HTTP client; it never touches the store directly — it drives the
 |        server via the API, matching the PKTS / PWTS daemon pattern.
 |
 +-- [P] Persistence  — the observational store
 |     \_ A CouchDB database (``wos``) holding two document kinds
 |        (``observation`` / ``state``) plus a single clusters doc.
 |        Only the server process writes; the collector and UI are clients. The
 |        store doubles as a natural dedup table: the same item fetched twice
 |        collapses to one observation.
 |
 +-- [A] Analytics  — the sense-making blob
       \_ Pure stdlib aggregations over the observation corpus (volume, spikes,
          trending, hot-now, tone, co-occurrence, semantic clusters) plus an
          optional embeddings-based clustering backend. Computed on demand and
          served as one JSON blob to the UI; nothing mutates the observations.
```

| Component | Role | Owns | Does NOT own |
| --- | --- | --- | --- |
| **[S] Sources** | The sense organs — "what is out there" | Feed parsing, normalization to `Observation`, source-specific `query` semantics | Polling cadence (that is [C]'s job) or persistence (that is [P]'s job) |
| **[C] Collector** | The attention scheduler — "when to look again" | Sweep loop, due-gating per source interval, retry/backoff signalling via state | The store or the source internals |
| **[P] Persistence** | The perceptual memory — "what was seen" | The document kinds, the dedup/merge semantics, the poll cursors | The meaning of the observations (analytics owns that) |
| **[A] Analytics** | The sense-making layer — "what does it add up to" | Volume, spikes, trending, tone, clusters — projections over the corpus | The observations themselves (those are [P]'s job) |

## Formulation

> How to think about a `World Observation System`?

A `World Observation System` is a technical object with the role of
externalizing **the agent's perception of the external world** to scaffold
extended agency:

- **perceive without presence** — capture what is being said on feeds the agent
  is not currently watching by hand,
- **persist what is ephemeral** — feed items scroll away in minutes; a WOS keeps
  the ones the agent declared relevant,
- **deduplicate without loss** — the same item fetched twice collapses to
  one observation (the richer body wins),
- **sense-make without bias** — project volume, trend, tone, and cluster
  aggregates over the corpus as data, not as gut feeling.

### What Is an Observation? What is its nature?

#### Principle

> An **observation** is one reading the agent actively takes of what *another
> agent* has published about the world. It is the atomic unit carried by WOS,
> and it is typed as an `observational` event in the [AGS](/about.html#elements) event
> taxonomy — distinct from `occurrence`, `outcome`, and `trigger`.

> A WOS should collect any external utterance whose disappearance would degrade
> the agent's situational awareness. The objective is not exhaustive scraping of
> every feed, but selective persistence of what the agent has declared worth
> watching (a source spec).

Conversely, an item should generally *not* be collected when it is:

- **Internal to the agent** — the agent's own thoughts, decisions, and actions
  belong to the [MAD](../mad/), not WOS.
- **Unwatched** — WOS only collects what a declared source spec matches; it is not an
  ambient firehose.
- **Behind a paywall or authenticated-only API** — sources must be free and
  no-auth so the sense organ remains operational (this is why Twitter/X is
  deliberately excluded).
- **A duplicate of an existing observation** — collapse by `(source,
  native_id)` into the existing doc.

#### (Case Set) When to register a source?

| Case | Description | Example |
| --- | --- | --- |
| **Free & no-auth** | The feed is reachable without paid keys or OAuth. | Hacker News Algolia, Lobsters, Reddit RSS, Mastodon public timelines, GDELT DOC 2.0, Nitter RSS mirrors. |
| **Utterance-bearing** | The feed carries what *other agents say* (comments, posts, articles, tweets), not just metadata. | HN comment threads, Reddit submissions, news articles, Twitter/X handles via Nitter. |
| **Resumable** | The feed supports a time cursor or `since` filter so polling is incremental. | Algolia `numericFilters`, GDELT `startdatetime`, Nitter `since`-via-`since_ms` filter, Mastodon `since_id` (future). |
| **Stable identifier** | Items carry a source-native id so dedup is deterministic. | HN `objectID`, Lobsters `short_id`, Reddit entry `id`, GDELT `url`, Nitter/X tweet `status_id`. |

Conversely, a feed should be rejected when it is paid-only, authenticated-only
below useful cadence, rate-limited below useful cadence with no free mirror, or
carries no utterance content (a metadata-only API).

### Source Query Semantics

Each source interprets the spec's `query` field in its own idiom:

| Source | `query` meaning | Example |
| --- | --- | --- |
| Hacker News (Algolia) | free-text search over comments | `rust async` |
| Lobsters | keyword filter, or `t:<tag>` for a tag feed | `programming` / `t:rust` |
| Reddit | subreddit name (with or without `r/`) | `worldnews` / `r/worldnews` |
| Mastodon | hashtag (with or without `#`) | `AI` / `#AI` |
| GDELT (DOC 2.0) | news query | `artificial intelligence` |
| Nitter | Twitter/X handle (with or without `@`) | `teortexasTex` / `@teortexasTex` |

## Data Model

> WOS shares a single CouchDB database (`wos`, optionally prefixed via
> `COUCHDB_DB_PREFIX`). Documents are discriminated by `doc_type`. Field naming
> is snake_case. All timestamps are epoch milliseconds (`*_ms`) unless suffixed
> otherwise.

### Source Spec

A **source spec** is a watched query — the unit of attention WOS pays to the
outside world. Specs live in `config/seed.json` (see
[`policy.md`](policy.md)); they are **not** CouchDB documents. The server
reads the file directly; there is no runtime CRUD.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable key, convention `<source>-<query>`; drives `STATE-<id>`. | `hackernews-rust` |
| `source` | `string` | Source name (must exist in the source registry). | `hackernews` |
| `query` | `string` | Source-specific query (see Query Semantics). | `rust async` |
| `interval_s` | `int` | Poll interval override; `0` = use the source default. | `900` |
| `enabled` | `bool` | Whether the collector polls this spec. | `true` |

### Observation

An **observation** is one collected item — the atomic `observational` event.
Document id is `obs_id(source, native_id)` so the same item fetched twice
collapses to a single doc.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable doc id (`OBS-<sha1(source:native_id)[:24]>`). | `OBS-9f3c1a...` |
| `doc_type` | `string` | Always `"observation"`. | `"observation"` |
| `event_type` | `string` | Always `"observational"` (AGS event taxonomy). | `"observational"` |
| `source` | `string` | Originating feed. | `hackernews` |
| `source_type` | `enum` | `comment` \| `story` \| `post` \| `article`. | `comment` |
| `native_id` | `string` | Source-native identifier. | `391` |
| `native_url` | `string` | Canonical URL back to the source item. | `https://news.ycombinator.com/item?id=391` |
| `observed_at_ms` | `int` | When the item was *published* (source-native), epoch ms. | `1750000000000` |
| `captured_at_ms` | `int` | When WOS *fetched* it, epoch ms. | `1750000600000` |
| `author` | `string` | Source-native author handle. | `alice` |
| `title` | `string` | Optional title (stories / articles). | `Rust 2025` |
| `body` | `string` | Item body text (HTML stripped, decoded). | `great point` |
| `score` | `int?` | Source-native relevance signal (points, favourites+boosts). | `42` |
| `language` | `string?` | ISO language code when the source provides one. | `eng` |
| `raw` | `object` | The original source payload, preserved for audit. | `{...}` |

#### Dedup / Merge Semantics

When an incoming observation shares an `id` with an existing doc:

- the **richer** `body` wins (longer non-empty body is kept),
- a **missing** `title` is back-filled from the incoming item,
- nothing else is overwritten — the original capture is preserved.

This makes the store a natural dedup table: re-fetching the same HN comment
yields one observation, not two copies. Observations carry **no** topic tags —
classification belongs to the downstream processing pipeline.

### State (poll cursor)

A **state** document is the per-source poll cursor — what makes polling resumable
and self-backing-off.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable doc id (`STATE-<source_id>`). | `STATE-hackernews-rust` |
| `doc_type` | `string` | Always `"state"`. | `"state"` |
| `source_id` | `string` | Owning source spec. | `hackernews-rust` |
| `last_fetched_ms` | `int` | When the source was last polled (success or failure). | `1750000600000` |
| `last_observed_ms` | `int` | Highest `observed_at_ms` seen so far (the `since` cursor). | `1750000000000` |
| `last_error` | `string?` | Last transport / parse error text; cleared on success. | `"HTTP 429"` |
| `error_count` | `int` | Consecutive failure count (for backoff). | `0` |
| `fetched_count` | `int` | Lifetime successful poll count. | `42` |

### Clusters (single assignment doc)

A **clusters** document holds the most recent batch clustering of the corpus.
Clustering is a batch job; the result is a single `{obs_id -> {cluster_id,
label}}` map joined to observations at read time — no per-observation mutation.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Always `CLUSTERS-current`. | `CLUSTERS-current` |
| `doc_type` | `string` | Always `"clusters"`. | `"clusters"` |
| `assignments` | `object` | `{obs_id: {cluster_id, label}}`. | `{"OBS-...": {"cluster_id": "c1", "label": "llm, model, ai"}}` |
| `meta` | `object` | `{backend, k, n, sizes, updated_at_ms}`. | `{"backend": "embeddings", "k": 5, "n": 1203, ...}` |

## Evaluation

> A WOS implementation is evaluated against the following criteria.

| Criterion | Description | Measure |
| --- | --- | --- |
| **Perceptual Coverage** | The set of watched sources covers the domains the agent declared relevant | Share of declared domains with at least one active source spec |
| **Source Independence** | No single feed's outage or paywall silently blinds the agent | All sources are free, no-auth, and independently reachable |
| **Capture Continuity** | Polling is resumable across restarts and failures | Per-source `state` cursor survives restarts; gap-free since the last `observed_at_ms` |
| **Dedup Correctness** | The same item fetched twice never produces two docs | `(source, native_id)` is the dedup key; richer body wins |
| **Backoff Hygiene** | A failing source does not DOS itself or the store | `error_count` + `last_error` recorded; interval respected; partial junk never persisted |
| **Sense-Making Legibility** | The corpus is reducible to an orienting picture, not a wall of items | Volume, spikes, trending, tone, clusters all computable from the store |
| **Provenance Preservation** | Every observation carries its origin and the raw source payload | `source`, `native_id`, `native_url`, `raw` always present |
| **Polling Efficiency** | The collector respects per-source intervals and only fetches when due | Due-gating via `last_fetched_ms` + `interval_s` |
| **Cost of Attention** | Adding / removing / disabling a watched source is a data edit, not a code change | Edit `config/seed.json`; the server re-reads it per request |
| **Store Isolation** | Only the server process touches CouchDB; clients drive it via HTTP | Collector and UI are pure HTTP clients |

## Implementation

> WOS is **materialized** as a working prototype in [`wos/`](../../wos/). It is
> mounted under `/wos/` by the unified dispatcher ([`app.py`](../../app.py)) and
> shares the project-wide CouchDB store with the other Autoregia sub-systems.

### Functionality Set

WOS exposes four functional layers over its store:

- **Catalogue** — `GET /api/sources` (the configured poll specs, from
  `config/seed.json`), `GET /api/source-types` (the adapter registry),
  `GET /api/health`, `GET /api/dashboard/stats`.
- **Observations (read)** — `GET /api/observations` with filters `source`,
  `cluster`, `since_ms`, `q`, `limit`.
- **Observations (write)** — `POST /api/ingest` (collector → store, with
  dedup/merge); `POST /api/poll` `{"id": ...}` for on-demand or daemon-driven
  polls that fetch + persist + advance the cursor in one call.
- **State (poll cursors)** — `GET / POST /api/state`.
- **Sense-making** — `GET /api/analytics` (the master blob: volume, spikes,
  hot-now, trending, co-occurrence, top terms/bigrams, tone, clusters);
  `GET /api/lexicon` (stopwords + VADER lexicon, single source of truth served to
  the browser); `GET / POST /api/clusters` (batch semantic clustering).

### Technical Element Set

| Layer | Choice | Notes |
| --- | --- | --- |
| Storage | CouchDB | DB `wos` (shared with MAD / PKTS / PWTS); doc-type discrimination; natural dedup by doc id |
| API | Python Flask | Mounted under `/wos/` by `app.py`; only process that touches CouchDB |
| Collector | `wos/collector.py` | Long-running poller daemon; pure HTTP client of the API; sweep every `WOS_SWEEP_S` seconds |
| Sources | `wos/sources/` | One module per feed implementing the `Source` protocol; explicit registry in `sources/__init__.py` |
| Analytics | `wos/analytics.py` | Pure stdlib aggregations (O(n) or O(n·k)); no DB access |
| Clustering | `wos/clustering.py` | Auto-detected backend: `fastembed` MiniLM/BGE-small embeddings (semantic, default) → TF-IDF lexical (numpy-only fallback) |
| UI | HTML/CSS/JS | `wos/static/index.html` minimal viewer; follows the project UI spec |
| Port | `5010` standalone, `/wos/` mounted | Unified dispatcher serves all sub-systems on `8080` |

### Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD` | `localhost:5984` / `admin` / `admin` | shared store |
| `COUCHDB_DB_PREFIX` | `""` | prepend to every db name (e.g. `dev_`) |
| `WOS_BASE_URL` | `http://localhost:8080/wos` | collector → server |
| `WOS_SWEEP_S` | `60` | seconds between collector sweeps |
| `WOS_MASTODON_INSTANCES` | `mastodon.social,fosstodon.org,hachyderm.io` | comma list |
| `WOS_MASTODON_ACCESS_TOKEN` | _(empty)_ | optional, for instances that require auth |
| `WOS_USER_AGENT` | _(browser-like)_ | override the HTTP User-Agent |
| `WOS_CLUSTER_BACKEND` | `auto` | `auto` \| `embeddings` \| `lexical` |

### Prototype

The prototype in [`wos/`](../../wos/) implements the full spec above. Run:

```bash
python3 app.py                 # unified server (mounts /wos/)
python3 wos/collector.py      # poller daemon — second terminal
# open http://localhost:8080/wos/
```

Tests use an isolated `wos_test_` CouchDB prefix and test the source modules
offline by mocking the shared HTTP helpers:

```bash
python3 -m pytest wos/test_wos.py -v
```

## Decisions

> Foundational decisions locked for this draft.

1. **Slot.** WOS realizes the **Perception** stage of the agent control loop on
   the *external* half of the `World` boundary, and maps to **VSM System 4 –
   Intelligence** (the sensing / scanning input surface). The [MAD](../mad/) is
   its complement on the *internal* half.
2. **Event type.** Every observation is persisted with `event_type =
   "observational"` — the [AGS](/about.html#elements) `observational` event-type
   defined as *"a reading the agent actively takes"*.
3. **Source policy.** Sources must be **free and no-auth**. Twitter/X is reached
   via **Nitter RSS mirrors** rather than the official API (which has no
   realistic free read tier). `xcancel.com`-class mirrors rotate; the source
   is multi-instance by design: it tries each configured mirror and skips
   failures, keeping the sense organ operational as long as at least one mirror
   is up. Tweet `status_id`s are globally unique on X, so they serve as the
   natural dedup key. The tracked sources and the mirror order live in the
   **seed file** `app/module/wos/config/seed.json` — see
   [`policy.md`](policy.md). Collection itself is bound by the etiquette rules
   in [`collection.md`](collection.md) (manual polls today; target automation
   in [`automation.md`](automation.md)).
4. **Single store, two doc kinds.** `observation` and `state` share one CouchDB
   database, discriminated by `doc_type`. Only the server writes; the collector
   is a pure HTTP client. Watched sources are *not* documents — they live in
   `config/seed.json`.
5. **Dedup by construction.** The doc id is `sha1(source:native_id)`; the store
   is the dedup table. Re-fetching the same item merges (keeps the richer
   body) rather than duplicating.
6. **Polling is data-driven.** Adding, removing, disabling, or re-cadencing a
   source is a file edit — no daemon restart, no code change; the server
   re-reads `config/seed.json` on every catalogue request.
7. **No topics at collection time.** Observations carry no topic tags; the
   poll set is plain `source` + `query` specs. Assigning topics / themes is
   the downstream processing pipeline's job, so collection stays semantic-free
   and swappable.
7. **Clustering is batch.** A single `CLUSTERS-current` assignment doc holds the
   latest clustering; analytics joins observations to clusters at read time. No
   per-observation mutation.

## Open Questions

1. **Sync vs async delivery into the Situation Model.** WOS persists
   observations; *who* reads them into the Situation Model, and on what cadence?
   (Likely a [PEB](../iscb/spec.md) reaction — `ObservationIngested →
   SituationModel.update` — but the route is not yet declared.)
2. **Source cursor strategy.** Mastodon polling currently re-fetches the window;
   switching to `since_id` would be cheaper. Generalize a `cursor_kind` per
   source (time vs id vs token)?
3. **Cluster refresh policy.** Clustering is currently on-demand (`POST
   /api/cluster`). Should it auto-refresh on a schedule, or on N new
   observations since the last run?
4. **Backpressure on burst sources.** GDELT and HN can return 50+ items per
   poll; should there be a per-source write-rate cap or a sampling policy when the
   corpus grows beyond personal scale?
5. **Retention.** Observations are kept indefinitely today. What is the policy
   when the corpus exceeds personal scale (tens of thousands → millions)?

## References

- [Autoregia](../../README.md) — workspace overview & VSM mapping.
- [PVSM — Specification](../README.md) — agent control loop & VSM framing.
- [MAD — spec](../mad/spec.md) — the *internal*-events complement; WOS records
  the *external* half. Same store, sibling event types.
- [AGS](/about.html#elements) — the grounding substrate (in the model); origin of
  the `observational` event type.
- [PEB — spec](../iscb/spec.md) — the bus that will carry
  `ObservationIngested` reactions into the Situation Model.
- [PTOCS — spec](../ptocs/spec.md) — sibling Intelligence sub-system
  (catalog of capabilities); shares the analytics-overlay pattern.
- [Autoregia UI Specification](../ui.spec) — canonical, project-wide UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
