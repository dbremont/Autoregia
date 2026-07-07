# PEOS — Personal External Observation System

A **perception** sub-system that collects what *other agents* say about the world
from free, no-auth public feeds and persists each item in **CouchDB** (db `peos`)
as an `observational` event — the PWMS event-type defined as *"a reading the
agent actively takes."* It is the external-world sense organ of the world model.

```
PR-Recording (PRS)  ←  internal events
PEOS                ←  external events: what other agents (HN, Reddit, …) say
```

## Sources (all free, no paid keys)

| Source | Feed | Auth | `query` meaning |
|---|---|---|---|
| **Hacker News** | Algolia `/search_by_date` | none | search string (comments) |
| **Lobsters** | `/newest.json`, `/t/<tag>.json` | none | keyword, or `t:<tag>` for a tag feed |
| **Reddit** | `/r/<sub>/.rss` | none | subreddit (`worldnews` or `r/worldnews`) |
| **Mastodon** | `/api/v1/timelines/tag/<tag>` | none (token optional) | hashtag (`AI` or `#AI`) |
| **GDELT** | DOC 2.0 `artlist` | none | news query (e.g. `artificial intelligence`) |

> **Twitter/X is deliberately excluded** — it has no realistic free read access
> (Nitter is dead, the free API tier is post-only). See `spec/asrs/pwms/`.

## Architecture

```
peos/
├── server.py          Flask API + CouchDB persistence (owns the `peos` db)
├── collector.py       poller daemon (pure HTTP client → server)
├── sources/
│   ├── base.py        Topic / Observation dataclasses, Source protocol
│   ├── http_util.py   get_json / get_feed / time + html helpers, UA
│   ├── hackernews.py  lobsters.py  reddit_rss.py  mastodon.py  gdelt.py
├── data/mock_topics.json   seed topics (seeded into CouchDB on first run)
└── static/index.html       minimal viewer
```

Three document kinds share the `peos` CouchDB database, discriminated by
`doc_type`:

- `topic` — a watched query (managed at runtime via the API)
- `observation` — one collected item (`event_type: "observational"`)
- `state` — per-topic poll cursor (`last_fetched_ms`, `last_observed_ms`, …)

Only the server process touches CouchDB; the collector drives everything via
HTTP, matching the PKTS/PAIS daemon pattern.

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
| GET | `/peos/api/observations?source=&topic=&since_ms=&q=&limit=` | read stream |
| POST | `/peos/api/ingest` | write observations (collector → store) |
| GET / POST | `/peos/api/state` | poll cursors |
| POST | `/peos/api/poll` | `{"topic_id": "...", "force": false}` poll now |
| GET | `/peos/api/dashboard/stats` | counts by source |

## Configuration

| Env | Default | |
|---|---|---|
| `COUCHDB_URL` / `COUCHDB_USER` / `COUCHDB_PASSWORD` | `localhost:5984` / `admin` / `admin` | shared store |
| `COUCHDB_DB_PREFIX` | `""` | prepend to every db name (e.g. `dev_`) |
| `PEOS_BASE_URL` | `http://localhost:8080/peos` | collector → server |
| `PEOS_SWEEP_S` | `60` | seconds between collector sweeps |
| `PEOS_MASTODON_INSTANCES` | `mastodon.social,fosstodon.org,hachyderm.io` | comma list |
| `PEOS_MASTODON_ACCESS_TOKEN` | _(empty)_ | optional, for instances that require auth |
| `PEOS_USER_AGENT` | _(browser-like)_ | override the HTTP User-Agent |

## Tests

```bash
python3 -m pytest peos/test_peos.py -v
```

Uses an isolated `peos_test_` CouchDB prefix; source modules are tested offline
by mocking the HTTP helpers.
