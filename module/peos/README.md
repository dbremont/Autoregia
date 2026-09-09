# PEOS — Personal External Observation System

> PEOS is the **Personal External Observation System** — the Autoregia
> **perception** sub-system that collects what *other agents* say about the world
> from free, no-auth public feeds and persists each item in **CouchDB** (db
> `peos`) as an `observational` event — the [PWMS](../spec/asrs/pwms/) event-type
> defined as *"a reading the agent actively takes."*

> It is the **external-world sense organ** of the agent. Where the
> [PRS](../prs/) records *internal* events (what the agent itself does, thinks,
> decides), PEOS records *external* events (what other agents publish about the
> world). Together they feed the Situation Model.

```
PRS  ←  internal events    (the agent's own states)
PEOS ←  external events    (what HN, Reddit, Mastodon, GDELT, Lobsters say)
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **external-world perception** — the input surface that scans the
  environment so the rest of the system can synthesize, anticipate, and adapt.
- **Loop stage:** **Perception** (restricted to the *external* half of the
  `World = (External, Internal)` boundary).
- **VSM level:** **System 4 – Intelligence** (environment scanning).
- **Complement:** [PRS](../prs/) — the *internal*-events recording system.
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

> **Twitter/X via Nitter mirrors.** The official X API has no realistic free
> read tier, so PEOS goes through community-run Nitter instances (env
> `PEOS_NITTER_INSTANCES`). Instances come and go and the canonical
> `nitter.net` has been intermittent since early 2024; the source tries each
> configured instance and skips failures, so a healthy mirror keeps the sense
> organ operational. Click-through `native_url`s are rewritten to
> `twitter.com`. A curated seed set of ~25 handles (teortexasTex, tphuang,
> karpathy, 3blue1brown, TerenceTao, bcantrill, …) is in
> [`data/nitter_handles.json`](data/nitter_handles.json).

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
| `PEOS_NITTER_INSTANCES` | `nitter.net,nitter.privacydev.net,nitter.poast.org` | comma list; primary often down — list alternates |
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
- [PRS — spec](../spec/prs/spec.md) — the *internal*-events complement.
- [PWMS — README](../spec/asrs/pwms/README.md) — origin of the `observational` event type.
- [Autoregia UI Specification](../spec/ui.spec) — canonical UI standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
