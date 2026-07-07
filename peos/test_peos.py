"""Tests for PEOS.

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``peos_test_`` DB prefix and drops the test DB at import for a clean
slate. Source modules are tested offline by monkeypatching the shared HTTP
helper; the API and persistence are tested via the Flask test client.
"""
import os

os.environ["COUCHDB_DB_PREFIX"] = "peos_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates & seeds it.
import couchdb  # noqa: E402

try:
    _srv = couchdb.Server(os.environ["COUCHDB_URL"])
    _srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
    if "peos_test_peos" in _srv:
        _srv.delete("peos_test_peos")
    _couch_ok = True
except Exception as _exc:  # pragma: no cover
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import peos.server as srv  # noqa: E402
import peos.sources as src_pkg  # noqa: E402
from peos.sources import hackernews, lobsters, reddit_rss, gdelt, mastodon  # noqa: E402
from peos.sources.base import Topic, Observation, obs_id  # noqa: E402


@pytest.fixture
def client():
    # Isolate every test: wipe all PEOS docs from the test store first.
    for d in srv.store.all():
        srv.store.delete(d["id"])
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ── source parsing (offline) ─────────────────────────────────────────────────
def test_hackernews_parse(monkeypatch):
    monkeypatch.setattr(hackernews, "get_json", lambda *a, **k: {"hits": [
        {"objectID": "391", "author": "alice", "created_at_i": 1750000000,
         "comment_text": "great point", "story_title": "Rust 2025", "points": 42},
    ]})
    obs = hackernews.HackerNewsSource().poll(
        Topic("hn-t", "hackernews", "rust"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source == "hackernews" and o.source_type == "comment"
    assert o.native_id == "391" and o.author == "alice"
    assert o.observed_at_ms == 1750000000 * 1000
    assert o.body == "great point" and o.score == 42
    assert "hn-t" in o.topics


def test_lobsters_parse(monkeypatch):
    monkeypatch.setattr(lobsters, "get_json", lambda *a, **k: [
        {"short_id": "abc1", "title": "A post", "score": 7, "tags": ["programming"],
         "created_at": "2025-07-05T12:00:00.000-05:00",
         "submitter_user": "bob", "description": "body text"},
    ])
    obs = lobsters.LobstersSource().poll(
        Topic("lob-t", "lobsters", "programming"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source_type == "story" and o.native_id == "abc1"
    assert o.author == "bob" and o.title == "A post"
    assert o.observed_at_ms > 0


def test_reddit_parse(monkeypatch):
    class _Feed:
        entries = [{
            "id": "t3_x", "link": "https://www.reddit.com/r/worldnews/comments/x/event",
            "title": "World event", "summary": "<p>details</p>", "author": "/u/red",
            "published_parsed": (2025, 6, 16, 10, 13, 20, 0, 0, 0),  # 1750000000
        }]
    monkeypatch.setattr(reddit_rss, "get_feed", lambda *a, **k: _Feed())
    obs = reddit_rss.RedditSource().poll(
        Topic("r-t", "reddit", "r/worldnews"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source_type == "post" and o.native_id == "x"
    assert o.observed_at_ms > 0
    assert o.body == "details" and o.author == "red"


def test_gdelt_parse(monkeypatch):
    monkeypatch.setattr(gdelt, "get_json", lambda *a, **k: {"articles": [
        {"url": "https://news.example/a", "title": "AI boom", "domain": "news.example",
         "seendate": "20250706T120000Z", "language": "eng"},
    ]})
    obs = gdelt.GDELTSource().poll(
        Topic("g-t", "gdelt", "artificial intelligence"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source_type == "article" and o.author == "news.example"
    assert o.observed_at_ms > 0 and o.language == "eng"


def test_mastodon_strips_html_and_multi_instance(monkeypatch):
    seen = []

    def fake(url, params=None, headers=None, timeout=20):
        seen.append(url)
        return [{"id": "1", "created_at": "2025-07-06T12:00:00.000Z",
                 "url": "https://inst1/@a/1", "account": {"acct": "a"},
                 "content": "<p>hello <a>world</a></p>",
                 "favourites_count": 2, "reblogs_count": 1, "language": "en"}]

    monkeypatch.setattr(mastodon, "get_json", fake)
    obs = mastodon.MastodonSource().poll(
        Topic("m-t", "mastodon", "#AI"), since_ms=None)
    assert len(obs) == len(mastodon.MastodonSource().instances)
    o = obs[0]
    assert o.body == "hello world"              # html stripped
    assert o.score == 3 and o.native_id.endswith(":1")


def test_since_ms_filter(monkeypatch):
    monkeypatch.setattr(lobsters, "get_json", lambda *a, **k: [
        {"short_id": "old", "created_at": "2020-01-01T00:00:00.000+00:00", "title": "old"},
        {"short_id": "new", "created_at": "2099-01-01T00:00:00.000+00:00", "title": "new"},
    ])
    # tag query (`t:`) skips keyword filtering so only since_ms applies
    obs = lobsters.LobstersSource().poll(
        Topic("t", "lobsters", "t:any"), since_ms=1700000000000)
    assert [o.native_id for o in obs] == ["new"]


# ── dedup id ─────────────────────────────────────────────────────────────────
def test_obs_id_stable():
    a = obs_id("hackernews", "391")
    b = obs_id("hackernews", "391")
    c = obs_id("lobsters", "391")
    assert a == b and a != c


# ── API + persistence ────────────────────────────────────────────────────────
def test_topics_crud(client):
    r = client.post("/api/topics", json={"source": "lobsters", "query": "rust"})
    assert r.status_code == 201
    tid = r.get_json()["topic_id"]
    assert tid.startswith("lobsters-rust")

    # duplicate rejected
    assert client.post("/api/topics",
                       json={"source": "lobsters", "query": "rust"}).status_code == 409

    # unknown source rejected
    assert client.post("/api/topics",
                       json={"source": "nope", "query": "x"}).status_code == 400

    listing = client.get("/api/topics").get_json()
    assert any(t["topic_id"] == tid for t in listing)

    # patch (disable)
    p = client.patch(f"/api/topics/{tid}", json={"enabled": False})
    assert p.get_json()["enabled"] is False

    # delete
    assert client.delete(f"/api/topics/{tid}").status_code == 200
    assert client.delete(f"/api/topics/{tid}").status_code == 404


def test_ingest_and_merge(client):
    ob = {"source": "hackernews", "source_type": "comment", "native_id": "500",
          "native_url": "https://hn/x", "observed_at_ms": 1750000000000,
          "author": "a", "title": "T", "body": "short", "topics": ["topic-A"]}
    r = client.post("/api/ingest", json={"observations": [ob]})
    j = r.get_json()
    assert j["written"] == 1 and j["merged"] == 0

    # same item, second topic tag → merge, not duplicate
    ob2 = dict(ob)
    ob2["topics"] = ["topic-B"]
    ob2["body"] = "a longer body than short"
    r2 = client.post("/api/ingest", json={"observations": [ob2]}).get_json()
    assert r2["written"] == 0 and r2["merged"] == 1

    res = client.get("/api/observations").get_json()
    assert len(res) == 1
    o = res[0]
    assert set(o["topics"]) == {"topic-A", "topic-B"}      # unioned
    assert o["body"] == "a longer body than short"          # richer body kept
    assert o["event_type"] == "observational"


def test_observations_filtering(client):
    base = {"source": "lobsters", "source_type": "story", "native_id": "N1",
            "native_url": "u", "observed_at_ms": 1000, "author": "bob",
            "title": "Rust release", "body": "rc info", "topics": ["t1"]}
    base2 = {"source": "hackernews", "source_type": "comment", "native_id": "N2",
             "native_url": "u2", "observed_at_ms": 2000, "author": "ann",
             "title": "Other", "body": "python note", "topics": ["t2"]}
    client.post("/api/ingest", json={"observations": [base, base2]})

    assert len(client.get("/api/observations?source=lobsters").get_json()) == 1
    assert len(client.get("/api/observations?topic=t2").get_json()) == 1
    assert len(client.get("/api/observations?q=rust").get_json()) == 1
    assert len(client.get("/api/observations?since_ms=1500").get_json()) == 1
    assert len(client.get("/api/observations?limit=1").get_json()) == 1


def test_state_upsert(client):
    r = client.post("/api/state", json={"topic_id": "x", "last_observed_ms": 123})
    assert r.status_code == 202
    s = client.get("/api/state?topic=x").get_json()
    assert s[0]["last_observed_ms"] == 123


# ── poll_one: due-skip + fetch ───────────────────────────────────────────────
class _FakeSource:
    name = "hackernews"
    default_interval_s = 100000  # large so the due-gate is explicit via state
    polled = False

    def poll(self, topic, since_ms):
        _FakeSource.polled = True
        return [Observation(source="hackernews", source_type="comment",
                            native_id="777", native_url="https://hn/777",
                            observed_at_ms=1750000000000, author="z",
                            title="hi", body="hey", topics=[topic.topic_id])]


def test_poll_one_skips_when_not_due(client, monkeypatch):
    monkeypatch.setitem(src_pkg.SOURCE_REGISTRY, "hackernews", _FakeSource())
    client.post("/api/topics", json={"source": "hackernews", "query": "qq"})
    tid = "hackernews-qq"
    # prime state as recently fetched → not due
    client.post("/api/state", json={"topic_id": tid, "last_fetched_ms": srv.now_ms()})
    _FakeSource.polled = False
    res = client.post("/api/poll", json={"topic_id": tid}).get_json()
    assert res.get("skipped") == "not due"
    assert _FakeSource.polled is False
    assert len(client.get("/api/observations").get_json()) == 0


def test_poll_one_fetches_and_persists(client, monkeypatch):
    monkeypatch.setitem(src_pkg.SOURCE_REGISTRY, "hackernews", _FakeSource())
    client.post("/api/topics", json={"source": "hackernews", "query": "pp"})
    tid = "hackernews-pp"
    # force clears last_fetched_ms → due now
    res = client.post("/api/poll", json={"topic_id": tid, "force": True}).get_json()
    assert res.get("written") == 1 and _FakeSource.polled is True
    obs = client.get("/api/observations").get_json()
    assert len(obs) == 1 and obs[0]["native_id"] == "777"
    st = client.get(f"/api/state?topic={tid}").get_json()
    assert st[0]["last_observed_ms"] == 1750000000000
    assert st[0]["error_count"] == 0


def test_health_and_stats(client):
    assert client.get("/api/health").get_json()["ok"] is True
    s = client.get("/api/dashboard/stats").get_json()
    assert "observations" in s and "by_source" in s


# ── analytics module (pure functions) ─────────────────────────────────────────
import peos.analytics as A  # noqa: E402


def _obs_list():
    base = 1750000000000
    out = []
    words = [("apple iphone", "hackernews"), ("russia ukraine war", "gdelt"),
             ("llm model ai", "lobsters"), ("apple iphone", "reddit"),
             ("climate policy", "gdelt"), ("llm embedding model", "hackernews")]
    for i, (text, src) in enumerate(words * 4):
        out.append({"id": f"OBS-{i}", "source": src, "source_type": "post",
                    "title": text, "body": "", "observed_at_ms": base + i * 3600_000,
                    "topics": [src + "-t"], "author": "x"})
    return out


def test_tokenize_scrubs_urls_and_entities():
    toks = set(A.tokenize("visit https://x.com/a &amp; &#x2f; stay"))
    # URL fragments and HTML-entity artifacts must be gone
    assert toks.isdisjoint({"https", "com", "x2f", "amp", "x", "a"})
    # legitimate words survive
    assert "visit" in toks and "stay" in toks
    assert "apple" in A.tokenize("Apple iPhone reviews")


def test_volume_series_and_spikes():
    vol = A.volume_series(_obs_list())
    assert vol["bucket"] in ("day", "hour")
    assert vol["buckets"] and vol["series"]
    assert sum(vol["total"]) == len(_obs_list())
    # spike_scores returns a list (may be empty on this small set)
    assert isinstance(A.spike_scores(vol), list)


def test_top_terms_and_bigrams():
    obs = _obs_list()
    names = [t["name"] for t in A.top_terms(obs)]
    assert "apple" in names and "iphone" in names
    big = [t["name"] for t in A.top_bigrams(obs)]
    assert any("apple iphone" == b for b in big)


def test_sankey_and_cooccurrence():
    obs = _obs_list()
    sk = A.topic_source_sankey(obs)
    assert sk["nodes"] and sk["links"]
    g = A.cooccurrence_graph(obs, max_nodes=20, min_edge=2)
    assert g["nodes"] and any(l["source"] == "apple" and l["target"] == "iphone"
                              for l in g["links"])


def test_tone_aggregates():
    t = A.tone_aggregates([{"title": "this is great and wonderful", "body": "", "source": "x"},
                           {"title": "terrible awful broken", "body": "", "source": "y"}], A._lex_for_test())
    assert -1.0 <= t["mean"] <= 1.0
    assert "x" in t["by_source"]


def _lex_for_test():  # noqa: D401
    return {"great": 3.0, "wonderful": 3.0, "terrible": -3.0, "awful": -3.0, "broken": -2.0}
A._lex_for_test = _lex_for_test  # type: ignore


def test_compute_blob_shape():
    blob = A.compute(_obs_list(), {"great": 3.0})
    for k in ("volume", "spikes", "hot_now", "trending", "sankey",
              "cooccurrence", "top_terms", "top_bigrams", "tone", "clusters", "sources"):
        assert k in blob


# ── clustering module ─────────────────────────────────────────────────────────
import peos.clustering as CL  # noqa: E402


def test_clusters_too_few_items():
    res = CL.compute_clusters([{"id": "a", "title": "x"}])
    assert res["assignments"] == {} and res["meta"]["backend"] == "none"


def test_clusters_lexical_backend_groups_related():
    obs = []
    seeds = [("apple iphone macbook", "a"), ("russia ukraine war", "b"),
             ("rust compiler async", "c")] * 8
    for i, (text, k) in enumerate(seeds):
        obs.append({"id": f"o{i}", "title": text, "body": "", "source": "s"})
    res = CL.compute_clusters(obs, k=3)
    assert res["meta"]["k"] >= 2
    assert len(res["assignments"]) == len(obs)
    labels = {a["cluster_id"] for a in res["assignments"].values()}
    assert len(labels) >= 2


# ── new endpoints ─────────────────────────────────────────────────────────────
def test_lexicon_endpoint(client):
    L = client.get("/api/lexicon").get_json()
    assert "stopwords" in L and "vader" in L and len(L["vader"]) > 50


def test_analytics_endpoint(client):
    # ingest a few items then request analytics
    items = [{"source": "hackernews", "source_type": "comment", "native_id": str(i),
              "native_url": "u", "observed_at_ms": 1750000000000 + i * 3600000,
              "author": "a", "title": "apple iphone" if i % 2 else "climate policy",
              "body": "", "topics": ["t"]} for i in range(8)]
    client.post("/api/ingest", json={"observations": items})
    a = client.get("/api/analytics").get_json()
    assert a["n"] == 8 and a["volume"]["buckets"]
    assert any(t["name"] == "apple" for t in a["top_terms"])


def test_clusters_endpoints(client):
    # empty store → k=0
    assert client.get("/api/clusters").get_json()["k"] == 0

