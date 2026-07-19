# Personal External Observation System

> This document establishes the conceptual foundations, data model, functionality,
> and implementation of a **Personal External Observation System (PEOS)**. A PEOS
> is a technical object engineered to `externalize the perception of the external
> world` — it watches what *other agents* say about the world on free public feeds,
> persists each item as a durable observation, and projects sense-making
> aggregates (volume, spikes, trending terms, tone, topic clusters) over the
> collected corpus.

> Within the Autoregia Personal Viable System Model (PVSM), PEOS is the
> **external sense organ** — the **Perception** stage of the agent control loop
> restricted to the *external* half of the `World = (External, Internal)`
> boundary. It maps to **VSM System 4 – Intelligence**: it is the input surface
> that scans the environment so that the rest of the system can synthesize,
> anticipate, and adapt. Where the [PRS](../prs/) records *internal* events (what
> the agent itself does, thinks, decides), PEOS records *external* events (what
> other agents publish about the world).

Fundamentally, a PEOS exists to maintain persistent representations of the
**external-world signals** relevant for effective orientation. These include:

- **Topics** — the watched queries (a search string, a subreddit, a hashtag) the
  agent has declared worth following. A topic is the unit of attention PEOS pays
  to the outside world.
- **Observations** — the atomic collected items: one comment, post, story, or
  article fetched from a source, normalized to a common shape, and persisted as
  an `observational` event (the [PWMS](../asrs/pwms/) event-type defined as *"a
  reading the agent actively takes"*).
- **Poll Cursors** — the per-topic state (last fetched, last observed, last
  error) that makes polling resumable, idempotent, and self-backing-off.
- **Sense-making Aggregates** — derived projections over the corpus (volume,
  spikes, trending terms, hot-now, topic clusters, tone, co-occurrence) that turn
  raw observations into an orienting picture of what the world is saying.

By preserving these across time, a PEOS functions as an externalized **perceptual
substrate**, reducing attention loss to ephemeral feeds, improving continuity of
environmental awareness, and giving the higher regulatory systems (Control S3,
Intelligence S4, Policy S5) a concrete object to reason over.

## Internal Composition

> PEOS is a single System 4 composite of four cooperating components. The
> conceptual separation is real; the deployment boundary is one project (a Flask
> API server + a separate poller daemon).

```
PEOS — Personal External Observation System  (VSM System 4 – Intelligence, sensing)
 |
 +-- [S] Sources  — the feed adapters
 |     \_ One adapter per public feed (Hacker News, Lobsters, Reddit, Mastodon,
 |        GDELT). Each implements a common Source protocol and returns normalized
 |        Observations. Sources are deliberately free / no-auth so the sense
 |        organ has no single point of failure or paywall dependency.
 |
 +-- [C] Collector  — the poller daemon
 |     \_ A long-running process that sweeps the watched topics every few
 |        seconds and triggers a poll for each topic whose interval has elapsed.
 |        Pure HTTP client; it never touches the store directly — it drives the
 |        server via the API, matching the PKTS / PAIS daemon pattern.
 |
 +-- [P] Persistence  — the observational store
 |     \_ A CouchDB database (``peos``) holding three document kinds
 |        (``topic`` / ``observation`` / ``state``) plus a single clusters doc.
 |        Only the server process writes; the collector and UI are clients. The
 |        store doubles as a natural dedup table: the same item fetched twice
 |        (or matching two topics) collapses to one observation with a unioned
 |        topic-tag set.
 |
 +-- [A] Analytics  — the sense-making blob
       \_ Pure stdlib aggregations over the observation corpus (volume, spikes,
          trending, hot-now, tone, co-occurrence, topic clusters) plus an
          optional embeddings-based clustering backend. Computed on demand and
          served as one JSON blob to the UI; nothing mutates the observations.
```

| Component | Role | Owns | Does NOT own |
| --- | --- | --- | --- |
| **[S] Sources** | The sense organs — "what is out there" | Feed parsing, normalization to `Observation`, source-specific `query` semantics | Polling cadence (that is [C]'s job) or persistence (that is [P]'s job) |
| **[C] Collector** | The attention scheduler — "when to look again" | Sweep loop, due-gating per topic interval, retry/backoff signalling via state | The store or the source internals |
| **[P] Persistence** | The perceptual memory — "what was seen" | The three document kinds, the dedup/merge semantics, the poll cursors | The meaning of the observations (analytics owns that) |
| **[A] Analytics** | The sense-making layer — "what does it add up to" | Volume, spikes, trending, tone, clusters — projections over the corpus | The observations themselves (those are [P]'s job) |

## Formulation

> How to think about a `Personal External Observation System`?

A `Personal External Observation System` is a technical object with the role of
externalizing **the agent's perception of the external world** to scaffold
extended agency:

- **perceive without presence** — capture what is being said on feeds the agent
  is not currently watching by hand,
- **persist what is ephemeral** — feed items scroll away in minutes; a PEOS keeps
  the ones the agent declared relevant,
- **deduplicate without loss** — the same item seen via two topics collapses to
  one observation carrying both topic tags,
- **sense-make without bias** — project volume, trend, tone, and cluster
  aggregates over the corpus as data, not as gut feeling.

### What Is an Observation? What is its nature?

#### Principle

> An **observation** is one reading the agent actively takes of what *another
> agent* has published about the world. It is the atomic unit carried by PEOS,
> and it is typed as an `observational` event in the [PWMS](../asrs/pwms/) event
> taxonomy — distinct from `occurrence`, `outcome`, and `trigger`.

> A PEOS should collect any external utterance whose disappearance would degrade
> the agent's situational awareness. The objective is not exhaustive scraping of
> every feed, but selective persistence of what the agent has declared worth
> watching (a topic).

Conversely, an item should generally *not* be collected when it is:

- **Internal to the agent** — the agent's own thoughts, decisions, and actions
  belong to the [PRS](../prs/), not PEOS.
- **Unwatched** — PEOS only collects what a declared topic matches; it is not an
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

Each source interprets the topic `query` field in its own idiom:

| Source | `query` meaning | Example |
| --- | --- | --- |
| Hacker News (Algolia) | free-text search over comments | `rust async` |
| Lobsters | keyword filter, or `t:<tag>` for a tag feed | `programming` / `t:rust` |
| Reddit | subreddit name (with or without `r/`) | `worldnews` / `r/worldnews` |
| Mastodon | hashtag (with or without `#`) | `AI` / `#AI` |
| GDELT (DOC 2.0) | news query | `artificial intelligence` |
| Nitter | Twitter/X handle (with or without `@`) | `teortexasTex` / `@teortexasTex` |

## Data Model

> PEOS shares a single CouchDB database (`peos`, optionally prefixed via
> `COUCHDB_DB_PREFIX`). Documents are discriminated by `doc_type`. Field naming
> is snake_case. All timestamps are epoch milliseconds (`*_ms`) unless suffixed
> otherwise.

### Topic

A **topic** is a watched query — the unit of attention PEOS pays to the outside
world. Managed at runtime via the API.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable doc id (`TOPIC-<topic_id>`). | `TOPIC-hackernews-rust` |
| `doc_type` | `string` | Always `"topic"`. | `"topic"` |
| `topic_id` | `string` | Slug-derived identifier unique per `(source, query)`. | `hackernews-rust` |
| `source` | `string` | Source name (must exist in the source registry). | `hackernews` |
| `query` | `string` | Source-specific query (see Query Semantics). | `rust async` |
| `interval_s` | `int` | Poll interval override; `0` = use the source default. | `900` |
| `enabled` | `bool` | Whether the collector polls this topic. | `true` |
| `note` | `string` | Free-form human note about why this topic is watched. | `"track rust ecosystem"` |
| `created_at` | `datetime` | ISO 8601 timestamp. | `2026-07-19T12:00:00Z` |

### Observation

An **observation** is one collected item — the atomic `observational` event.
Document id is `obs_id(source, native_id)` so the same item fetched twice or
matched by two topics collapses to a single doc.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable doc id (`OBS-<sha1(source:native_id)[:24]>`). | `OBS-9f3c1a...` |
| `doc_type` | `string` | Always `"observation"`. | `"observation"` |
| `event_type` | `string` | Always `"observational"` (PWMS event taxonomy). | `"observational"` |
| `source` | `string` | Originating feed. | `hackernews` |
| `source_type` | `enum` | `comment` \| `story` \| `post` \| `article`. | `comment` |
| `native_id` | `string` | Source-native identifier. | `391` |
| `native_url` | `string` | Canonical URL back to the source item. | `https://news.ycombinator.com/item?id=391` |
| `observed_at_ms` | `int` | When the item was *published* (source-native), epoch ms. | `1750000000000` |
| `captured_at_ms` | `int` | When PEOS *fetched* it, epoch ms. | `1750000600000` |
| `author` | `string` | Source-native author handle. | `alice` |
| `title` | `string` | Optional title (stories / articles). | `Rust 2025` |
| `body` | `string` | Item body text (HTML stripped, decoded). | `great point` |
| `topics` | `string[]` | Topic tags this item matched (unioned on dedup). | `["hackernews-rust", "topic-B"]` |
| `score` | `int?` | Source-native relevance signal (points, favourites+boosts). | `42` |
| `language` | `string?` | ISO language code when the source provides one. | `eng` |
| `raw` | `object` | The original source payload, preserved for audit. | `{...}` |

#### Dedup / Merge Semantics

When an incoming observation shares an `id` with an existing doc:

- the `topics` arrays are **unioned** (preserving order, deduped),
- the **richer** `body` wins (longer non-empty body is kept),
- a **missing** `title` is back-filled from the incoming item,
- nothing else is overwritten — the original capture is preserved.

This makes the store a natural dedup table: the same HN comment matched by a
`rust` topic and later by an `async` topic becomes one observation tagged with
both, rather than two copies.

### State (poll cursor)

A **state** document is the per-topic poll cursor — what makes polling resumable
and self-backing-off.

| Field | Type | Description | Example |
| --- | --- | --- | --- |
| `id` | `string` | Stable doc id (`STATE-<topic_id>`). | `STATE-hackernews-rust` |
| `doc_type` | `string` | Always `"state"`. | `"state"` |
| `topic_id` | `string` | Owning topic. | `hackernews-rust` |
| `last_fetched_ms` | `int` | When the topic was last polled (success or failure). | `1750000600000` |
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

> A PEOS implementation is evaluated against the following criteria.

| Criterion | Description | Measure |
| --- | --- | --- |
| **Perceptual Coverage** | The set of watched topics covers the domains the agent declared relevant | Share of declared domains with at least one active topic |
| **Source Independence** | No single feed's outage or paywall silently blinds the agent | All sources are free, no-auth, and independently reachable |
| **Capture Continuity** | Polling is resumable across restarts and failures | Per-topic `state` cursor survives restarts; gap-free since the last `observed_at_ms` |
| **Dedup Correctness** | The same item fetched twice or via two topics never produces two docs | `(source, native_id)` is the dedup key; topic tags union |
| **Backoff Hygiene** | A failing source does not DOS itself or the store | `error_count` + `last_error` recorded; interval respected; partial junk never persisted |
| **Sense-Making Legibility** | The corpus is reducible to an orienting picture, not a wall of items | Volume, spikes, trending, tone, clusters all computable from the store |
| **Provenance Preservation** | Every observation carries its origin and the raw source payload | `source`, `native_id`, `native_url`, `raw` always present |
| **Polling Efficiency** | The collector respects per-topic intervals and only fetches when due | Due-gating via `last_fetched_ms` + `interval_s` |
| **Cost of Attention** | Adding / removing / disabling a watched topic is a data edit, not a code change | Runtime CRUD via the API; no daemon restart needed |
| **Store Isolation** | Only the server process touches CouchDB; clients drive it via HTTP | Collector and UI are pure HTTP clients |

## Implementation

> PEOS is **materialized** as a working prototype in [`peos/`](../../peos/). It is
> mounted under `/peos/` by the unified dispatcher ([`app.py`](../../app.py)) and
> shares the project-wide CouchDB store with the other Autoregia sub-systems.

### Functionality Set

PEOS exposes four functional layers over its store:

- **Catalogue** — `GET /api/sources`, `GET /api/health`, `GET /api/dashboard/stats`.
- **Topics (CRUD)** — `GET / POST /api/topics`, `PATCH / DELETE /api/topics/<id>`.
  Topics are the runtime-managed "tools" the agent watches.
- **Observations (read)** — `GET /api/observations` with filters `source`,
  `topic`, `cluster`, `since_ms`, `q`, `limit`. `GET /api/export` for the full
  dump.
- **Observations (write)** — `POST /api/ingest` (collector → store, with
  dedup/merge); `POST /api/poll` for on-demand or daemon-driven polls that
  fetch + persist + advance the cursor in one call.
- **State (poll cursors)** — `GET / POST /api/state`.
- **Sense-making** — `GET /api/analytics` (the master blob: volume, spikes,
  hot-now, trending, sankey, co-occurrence, top terms/bigrams, tone, clusters);
  `GET /api/lexicon` (stopwords + VADER lexicon, single source of truth served to
  the browser); `GET / POST /api/clusters` (batch topic clustering).

### Technical Element Set

| Layer | Choice | Notes |
| --- | --- | --- |
| Storage | CouchDB | DB `peos` (shared with PRS / PKTS / PAIS); doc-type discrimination; natural dedup by doc id |
| API | Python Flask | Mounted under `/peos/` by `app.py`; only process that touches CouchDB |
| Collector | `peos/collector.py` | Long-running poller daemon; pure HTTP client of the API; sweep every `PEOS_SWEEP_S` seconds |
| Sources | `peos/sources/` | One module per feed implementing the `Source` protocol; explicit registry in `sources/__init__.py` |
| Analytics | `peos/analytics.py` | Pure stdlib aggregations (O(n) or O(n·k)); no DB access |
| Clustering | `peos/clustering.py` | Auto-detected backend: `fastembed` MiniLM/BGE-small embeddings (semantic, default) → TF-IDF lexical (numpy-only fallback) |
| UI | HTML/CSS/JS | `peos/static/index.html` minimal viewer; follows the project UI spec |
| Port | `5010` standalone, `/peos/` mounted | Unified dispatcher serves all sub-systems on `8080` |

### Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD` | `localhost:5984` / `admin` / `admin` | shared store |
| `COUCHDB_DB_PREFIX` | `""` | prepend to every db name (e.g. `dev_`) |
| `PEOS_BASE_URL` | `http://localhost:8080/peos` | collector → server |
| `PEOS_SWEEP_S` | `60` | seconds between collector sweeps |
| `PEOS_MASTODON_INSTANCES` | `mastodon.social,fosstodon.org,hachyderm.io` | comma list |
| `PEOS_MASTODON_ACCESS_TOKEN` | _(empty)_ | optional, for instances that require auth |
| `PEOS_USER_AGENT` | _(browser-like)_ | override the HTTP User-Agent |
| `PEOS_CLUSTER_BACKEND` | `auto` | `auto` \| `embeddings` \| `lexical` |

### Prototype

The prototype in [`peos/`](../../peos/) implements the full spec above. Run:

```bash
python3 app.py                 # unified server (mounts /peos/)
python3 peos/collector.py      # poller daemon — second terminal
# open http://localhost:8080/peos/
```

Tests use an isolated `peos_test_` CouchDB prefix and test the source modules
offline by mocking the shared HTTP helpers:

```bash
python3 -m pytest peos/test_peos.py -v
```

## Decisions

> Foundational decisions locked for this draft.

1. **Slot.** PEOS realizes the **Perception** stage of the agent control loop on
   the *external* half of the `World` boundary, and maps to **VSM System 4 –
   Intelligence** (the sensing / scanning input surface). The [PRS](../prs/) is
   its complement on the *internal* half.
2. **Event type.** Every observation is persisted with `event_type =
   "observational"` — the [PWMS](../asrs/pwms/) event-type defined as *"a reading
   the agent actively takes"*.
3. **Source policy.** Sources must be **free and no-auth**. Twitter/X is reached
   via **Nitter RSS mirrors** (`PEOS_NITTER_INSTANCES`) rather than the official
   API (which has no realistic free read tier). The canonical `nitter.net` is
   intermittent, so the Nitter source is multi-instance by design: it tries each
   configured mirror and skips failures, keeping the sense organ operational as
   long as at least one mirror is up. Tweet `status_id`s are globally unique on
   X, so they serve as the natural dedup key.
4. **Single store, three doc kinds.** `topic`, `observation`, and `state` share
   one CouchDB database, discriminated by `doc_type`. Only the server writes; the
   collector is a pure HTTP client.
5. **Dedup by construction.** The doc id is `sha1(source:native_id)`; the store
   is the dedup table. Re-fetching the same item or matching it via a second
   topic merges (unions topic tags, keeps the richer body) rather than
   duplicating.
6. **Polling is data-driven.** Adding, removing, disabling, or re-cadencing a
   topic is a runtime API edit — no daemon restart, no code change.
7. **Clustering is batch.** A single `CLUSTERS-current` assignment doc holds the
   latest clustering; analytics joins observations to clusters at read time. No
   per-observation mutation.

## Open Questions

1. **Sync vs async delivery into the Situation Model.** PEOS persists
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
   poll; should there be a per-topic write-rate cap or a sampling policy when the
   corpus grows beyond personal scale?
5. **Retention.** Observations are kept indefinitely today. What is the policy
   when the corpus exceeds personal scale (tens of thousands → millions)?

## References

- [Autoregia](../../README.md) — workspace overview & VSM mapping.
- [PVSM — Specification](../README.md) — agent control loop & VSM framing.
- [PRS — spec](../prs/spec.md) — the *internal*-events complement; PEOS records
  the *external* half. Same store, sibling event types.
- [PWMS — README](../asrs/pwms/README.md) — origin of the `observational`
  event type; the world model PEOS populates instances of.
- [PEB — spec](../iscb/spec.md) — the bus that will carry
  `ObservationIngested` reactions into the Situation Model.
- [PTOCS — spec](../asrs/ptocs/spec.md) — sibling Intelligence sub-system
  (catalog of capabilities); shares the analytics-overlay pattern.
- [Autoregia UI Specification](../ui.spec) — canonical, project-wide UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
