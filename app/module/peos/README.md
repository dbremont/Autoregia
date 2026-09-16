# PEOS — Personal External Observation System

> PEOS is the **Personal External Observation System** — the Autoregia
> **perception** sub-system that collects what *other agents* say about the world
> from free, no-auth public feeds and persists each item in **CouchDB** (db
> `peos`) as an `observational` event — the [AGS](/about.html#elements) `observational` event-type
> defined as *"a reading the agent actively takes."*

> It is the **external-world sense organ** of the agent. Where the
> [PBS](../pbs/) records *internal* events (what the agent itself does, thinks,
> decides), PEOS records *external* events (what other agents publish about the
> world). Together they feed the Situation Model.

```
PBS  ←  internal events    (the agent's own states)
PEOS ←  external events    (what HN, Reddit, Mastodon, GDELT, Lobsters say)
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **external-world perception** — the input surface that scans the
  environment so the rest of the system can synthesize, anticipate, and adapt.
- **Loop stage:** **Perception** (restricted to the *external* half of the
  `World = (External, Internal)` boundary).
- **VSM level:** **System 4 – Intelligence** (environment scanning).
- **Complement:** [PBS](../pbs/) — the *internal*-events recording system.
- **Specification:** see [`spec/peos/spec.md`](../spec/peos/spec.md) for the
  conceptual foundations, data model, evaluation, and decisions.

## Sources (all free, no paid keys)

| Source | Feed | Auth | `query` meaning |
|---|---|---|---|
| **Hacker News** | Algolia `/search_by_date` | none | search string (comments) |
| **Lobsters** | `/newest.json`, `/t/<tag>.json` | none | keyword, or `t:<tag>` for a tag feed |
| **Reddit** | `/r/<sub>/.rss` | none | subreddit (`worldnews` or `r/worldnews`) |
| **Mastodon** | `/api/v1/timelines/tag/<tag>` | none (token optional) | hashtag (`AI` or `#AI`) |
| **GDELT** | DOC 2.0 `artlist` | none | news query (e.g. `artificial intelligence`) |
| **Nitter** | `/<handle>/rss` (multi-instance) | none | Twitter/X handle (`teortexasTex` or `@teortexasTex`) |
| **arXiv** | Atom API `export.arxiv.org/api/query` | none (1 req / 3 s enforced) | arXiv search syntax (`cat:cs.LG`, `all:scaling laws`) |
| **OpenAlex** | Graph API `/works` | none (`mailto` polite pool via `PEOS_CONTACT_EMAIL`) | free-text search (`large language models`) |
| **Crossref** | REST `/works` | none (`mailto` polite pool) | free-text search (`economics machine learning`) |
| **bioRxiv** | `api.biorxiv.org/details/…` date cursor | none | `all`, or a title/category substring filter |
| **RSS (generic)** | any RSS/Atom feed URL | none | full feed URL (Nature, NBER, any journal) |

> **Twitter/X via Nitter mirrors.** The official X API has no realistic free
> read tier, so PEOS goes through community-run Nitter instances (env
> `PEOS_NITTER_INSTANCES`; `xcancel.com` is the default primary —
> `nitter.net` has been intermittent since early 2024). The source tries each
> configured instance and skips failures, so a healthy mirror keeps the sense
> organ operational. Click-through `native_url`s are rewritten to
> `twitter.com`. The tracked handles live in the sources policy file
> [`config/peos_sources.json`](../../../config/peos_sources.json) (126
> handles; policy spec: [`spec/peos/policy.md`](../../../spec/peos/policy.md));
> the bundled [`data/nitter_handles.json`](data/nitter_handles.json) is only
> the fallback seed. Reconcile a running DB with the file via
> [`sync_sources.py`](sync_sources.py).

## Architecture

```
peos/
├── server.py          Flask API + CouchDB persistence (owns the `peos` db)
├── collector.py       poller daemon (pure HTTP client → server)
├── analytics.py       pure sense-making aggregations over the corpus
├── clustering.py      batch topic clustering (embeddings / lexical)
├── sources/
│   ├── base.py        Topic / Observation dataclasses, Source protocol
│   ├── http_util.py   get_json / get_feed / time + html helpers, UA
│   ├── hackernews.py  lobsters.py  reddit_rss.py  mastodon.py  gdelt.py  nitter.py
├── data/mock_topics.json       seed topics (seeded into CouchDB on first run)
├── data/nitter_handles.json    curated Twitter/X handles (seeded on first run)
└── static/index.html       minimal viewer
```

Three document kinds share the `peos` CouchDB database, discriminated by
`doc_type`:

- `topic` — a watched query (managed at runtime via the API)
- `observation` — one collected item (`event_type: "observational"`)
- `state` — per-topic poll cursor (`last_fetched_ms`, `last_observed_ms`, …)

Only the server process touches CouchDB; the collector drives everything via
HTTP, matching the PKTS/PWTS daemon pattern.

## Run

```bash
python3 app.py                 # unified server (mounts /peos/)
python3 peos/collector.py      # poller daemon — second terminal
# open http://localhost:8080/peos/
```

CouchDB must be reachable (`COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD`,
defaults `http://localhost:5984` / `admin` / `admin`).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/peos/api/health` | store status |
| GET | `/peos/api/sources` | registered sources + default intervals |
| GET / POST | `/peos/api/topics` | list / create watched topics |
| PATCH / DELETE | `/peos/api/topics/<id>` | update / remove a topic |
| GET | `/peos/api/observations?source=&topic=&since_ms=&q=&limit=` | read stream (legacy full-scan) |
| GET | `/peos/api/search?q=&source=&topic=&cluster=&since_ms=&sort=&limit=` | search — executes inside CouchDB (ddoc views + Mango) |
| POST | `/peos/api/ingest` | write observations (collector → store) |
| GET / POST | `/peos/api/state` | poll cursors |
| POST | `/peos/api/poll` | `{"topic_id": "...", "force": false}` poll now |
| GET | `/peos/api/dashboard/stats` | counts by source |

> **Search & collection.** `/api/search` runs entirely in CouchDB: a design
> doc (`peos-search` — views `by_time` / `by_source` / `by_topic` / `token`)
> and Mango indexes are created idempotently at startup, so queries never
> scan in Python. Collection is **manual** today (poll buttons / `POST
> /api/poll`) and bound by the rules in
> [`spec/peos/collection.md`](../../../spec/peos/collection.md); the target
> automation design lives in
> [`spec/peos/automation.md`](../../../spec/peos/automation.md).

## Configuration

| Env | Default | |
|---|---|---|
| `COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD` | `localhost:5984` / `admin` / `admin` | shared store |
| `COUCHDB_DB_PREFIX` | `""` | prepend to every db name (e.g. `dev_`) |
| `PEOS_BASE_URL` | `http://localhost:8080/peos` | collector → server |
| `PEOS_SWEEP_S` | `60` | seconds between collector sweeps |
| `PEOS_MASTODON_INSTANCES` | `mastodon.social,fosstodon.org,hachyderm.io` | comma list |
| `PEOS_MASTODON_ACCESS_TOKEN` | _(empty)_ | optional, for instances that require auth |
| `PEOS_NITTER_INSTANCES` | `xcancel.com,nitter.net,nitter.privacydev.net,nitter.poast.org` | comma list; `config/peos_sources.json` `settings.nitter_instances` seeds it, env wins |
| `PEOS_SOURCES_FILE` | `config/peos_sources.json` | sources policy file (desired state); see `spec/peos/policy.md` |
| `PEOS_USER_AGENT` | _(browser-like)_ | override the HTTP User-Agent |

## Tests

```bash
python3 -m pytest peos/test_peos.py -v
```

Uses an isolated `peos_test_` CouchDB prefix; source modules are tested offline
by mocking the HTTP helpers.

## References

- [PEOS — specification](../spec/peos/spec.md) — conceptual foundations, data model, evaluation, decisions.
- [Autoregia](../README.md) — workspace overview & VSM mapping.
- [PBS — spec](../spec/pbs/spec.md) — the *internal*-events complement.
- [AGS](/about.html#elements) — origin of the `observational` event type.
- [Autoregia UI Specification](../spec/ui.spec) — canonical UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
