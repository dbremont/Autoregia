# WOS — World Observation System

> WOS is the **World Observation System** — the Autoregia
> **perception** sub-system that collects what *other agents* say about the world
> from free, no-auth public feeds and persists each item in **CouchDB** (db
> `wos`) as an `observational` event — the [AGS](/about.html#elements) `observational` event-type
> defined as *"a reading the agent actively takes."*

> It is the **external-world sense organ** of the agent. Where the
> [MAD](../mad/) records *internal* events (what the agent itself does, thinks,
> decides), WOS records *external* events (what other agents publish about the
> world). Together they feed the Situation Model.

```
MAD  ←  internal events    (the agent's own states)
WOS ←  external events    (what HN, Reddit, Mastodon, GDELT, Lobsters say)
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **external-world perception** — the input surface that scans the
  environment so the rest of the system can synthesize, anticipate, and adapt.
- **Loop stage:** **Perception** (restricted to the *external* half of the
  `World = (External, Internal)` boundary).
- **VSM level:** **System 4 – Intelligence** (environment scanning).
- **Complement:** [MAD](../mad/) — the *internal*-events recording system.
- **Specification:** see [`spec/wos/spec.md`](../spec/wos/spec.md) for the
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
| **OpenAlex** | Graph API `/works` | none (`mailto` polite pool via `WOS_CONTACT_EMAIL`) | free-text search (`large language models`) |
| **Crossref** | REST `/works` | none (`mailto` polite pool) | free-text search (`economics machine learning`) |
| **bioRxiv** | `api.biorxiv.org/details/…` date cursor | none | `all`, or a title/category substring filter |
| **RSS (generic)** | any RSS/Atom feed URL | none | full feed URL (Nature, NBER, any journal) |

> **Twitter/X via Nitter mirrors.** The official X API has no realistic free
> read tier, so WOS goes through community-run Nitter instances (env
> `WOS_NITTER_INSTANCES`; normalized primary set: `nitter.net`,
> `nitter.click`, `xcancel.com`). The source tries each configured instance
> and skips failures, so a healthy mirror keeps the sense organ operational.
> Click-through `native_url`s are rewritten to `twitter.com`. The watched
> sources live in the seed file
> [`config/seed.json`](config/seed.json) (181 poll specs; policy spec:
> [`spec/wos/policy.md`](../../../spec/wos/policy.md)). Topic assignment does
> **not** happen at collection time — observations are stored unclassified;
> that is the downstream processing pipeline's job.

## Architecture

```
wos/
├── server.py          Flask API + CouchDB persistence (owns the `wos` db)
├── collector.py       poller daemon (pure HTTP client → server)
├── analytics.py       pure sense-making aggregations over the corpus
├── clustering.py      batch semantic clustering (embeddings / lexical)
├── sources/
│   ├── base.py        Observation dataclass, Source protocol
│   ├── http_util.py   get_json / get_feed / time + html helpers, UA
│   ├── hackernews.py  lobsters.py  reddit_rss.py  mastodon.py  gdelt.py  nitter.py
├── config/seed.json   the poll specs (the watched sources — data, not code)
├── data/vader.json  stopwords-en.json   lexicons for tone analysis
└── static/index.html       minimal viewer
```

Two document kinds share the `wos` CouchDB database, discriminated by
`doc_type`:

- `observation` — one collected item (`event_type: "observational"`)
- `state` — per-source poll cursor (`last_fetched_ms`, `last_observed_ms`, …)

The watched sources are **not** documents: the server reads them from
`config/seed.json` (re-read on every `/api/sources` call).

Only the server process touches CouchDB; the collector drives everything via
HTTP, matching the PKTS/PWTS daemon pattern.

## Run

```bash
python3 app.py                 # unified server (mounts /wos/)
python3 wos/collector.py      # poller daemon — second terminal
# open http://localhost:8080/wos/
```

CouchDB must be reachable (`COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD`,
defaults `http://localhost:5984` / `admin` / `admin`).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/wos/api/health` | store status |
| GET | `/wos/api/sources` | the configured poll specs (`?enabled=true` to filter) |
| GET | `/wos/api/source-types` | registered source kinds + default intervals |
| GET | `/wos/api/observations?source=&since_ms=&q=&limit=` | read stream (legacy full-scan) |
| GET | `/wos/api/search?q=&source=&cluster=&since_ms=&sort=&limit=` | search — executes inside CouchDB (ddoc views + Mango) |
| POST | `/wos/api/ingest` | write observations (collector → store) |
| GET / POST | `/wos/api/state` | poll cursors |
| POST | `/wos/api/poll` | `{"id": "...", "force": false}` poll a configured spec now |
| GET | `/wos/api/dashboard/stats` | counts by source |

> **Search & collection.** `/api/search` runs entirely in CouchDB: a design
> doc (`wos-search` — views `by_time` / `by_source` / `token`)
> and Mango indexes are created idempotently at startup, so queries never
> scan in Python. Collection is **manual** today (poll buttons / `POST
> /api/poll`) and bound by the rules in
> [`spec/wos/collection.md`](../../../spec/wos/collection.md); the target
> automation design lives in
> [`spec/wos/automation.md`](../../../spec/wos/automation.md).

## Configuration

| Env | Default | |
|---|---|---|
| `COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD` | `localhost:5984` / `admin` / `admin` | shared store |
| `COUCHDB_DB_PREFIX` | `""` | prepend to every db name (e.g. `dev_`) |
| `WOS_BASE_URL` | `http://localhost:8080/wos` | collector → server |
| `WOS_SWEEP_S` | `60` | seconds between collector sweeps |
| `WOS_MASTODON_INSTANCES` | `mastodon.social,fosstodon.org,hachyderm.io` | comma list |
| `WOS_MASTODON_ACCESS_TOKEN` | _(empty)_ | optional, for instances that require auth |
| `WOS_NITTER_INSTANCES` | `nitter.net,nitter.click,xcancel.com` | comma list; `config/seed.json` `settings.nitter_instances` seeds it, env wins |
| `WOS_SOURCES_FILE` | `app/module/wos/config/seed.json` | seed file override (poll specs); see `spec/wos/policy.md` |
| `WOS_USER_AGENT` | _(browser-like)_ | override the HTTP User-Agent |

## Tests

```bash
python3 -m pytest wos/test_wos.py -v
```

Uses an isolated `wos_test_` CouchDB prefix; source modules are tested offline
by mocking the HTTP helpers.

## References

- [WOS — specification](../spec/wos/spec.md) — conceptual foundations, data model, evaluation, decisions.
- [Autoregia](../README.md) — workspace overview & VSM mapping.
- [MAD — spec](../spec/mad/spec.md) — the *internal*-events complement.
- [AGS](/about.html#elements) — origin of the `observational` event type.
- [Autoregia UI Specification](../spec/ui.spec) — canonical UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
