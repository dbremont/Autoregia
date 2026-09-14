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
# Pin the sources policy file to the bundled seed so tests always see the
# historical 25-handle set, independent of a repo config/peos_sources.json
# (and so the env-override resolution path itself is what gets exercised).
os.environ["PEOS_SOURCES_FILE"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "nitter_handles.json")

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

import sys  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import peos.server as srv  # noqa: E402
import peos.sources as src_pkg  # noqa: E402
from peos.sources import hackernews, lobsters, reddit_rss, gdelt, mastodon, nitter  # noqa: E402
from peos.sources import arxiv as peos_arxiv  # noqa: E402
from peos.sources import biorxiv as peos_biorxiv  # noqa: E402
from peos.sources import crossref as peos_crossref  # noqa: E402
from peos.sources import openalex as peos_openalex  # noqa: E402
from peos.sources import rss as peos_rss  # noqa: E402
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


def test_nitter_parse_and_at_strip(monkeypatch):
    class _Feed:
        entries = [{
            "id": "1234567890",
            "title": "teortexasTex: first line of the tweet text",
            "link": "https://nitter.net/teortexasTex/status/1234567890#m",
            "author": "@teortexasTex",
            "summary": "<p>full tweet <a>body</a> text</p>",
            "published_parsed": (2026, 7, 19, 12, 0, 0, 0, 0, 0),  # 1784553600
        }]
    monkeypatch.setattr(nitter, "get_feed", lambda *a, **k: _Feed())
    obs = nitter.NitterSource().poll(
        Topic("n-t", "nitter", "@teortexasTex"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source == "nitter" and o.source_type == "post"
    assert o.native_id == "1234567890"                      # guid used; globally unique on X
    assert o.native_url == "https://twitter.com/teortexasTex/status/1234567890"
    assert o.author == "teortexasTex"                       # @ stripped
    assert o.title == "first line of the tweet text"        # handle prefix stripped
    assert o.body == "full tweet body text"                 # html stripped
    assert o.observed_at_ms > 0


def test_nitter_retweet_uses_original_author(monkeypatch):
    # Nitter surfaces retweets with the original author in dc:creator and the
    # status id is the original tweet's. The watched handle appears only in the
    # "RT by @<handle>:" title prefix.
    class _Feed:
        entries = [{
            "id": "2074973674332123157",
            "title": "RT by @karpathy: Rewriting Bun in Rust https://bun.com/x",
            "link": "https://nitter.net/jarredsumner/status/2074973674332123157#m",
            "author": "@jarredsumner",
            "summary": "<p>Rewriting Bun in Rust</p>",
            "published_parsed": (2026, 7, 8, 21, 47, 29, 0, 0, 0),
        }]
    monkeypatch.setattr(nitter, "get_feed", lambda *a, **k: _Feed())
    obs = nitter.NitterSource().poll(
        Topic("n-rt", "nitter", "karpathy"), since_ms=None)
    assert len(obs) == 1
    o = obs[0]
    assert o.native_id == "2074973674332123157"
    assert o.author == "jarredsumner"                       # original author, not watcher
    assert o.native_url == "https://twitter.com/jarredsumner/status/2074973674332123157"
    assert o.title.startswith("Rewriting Bun in Rust")      # "RT by @karpathy:" stripped
    assert o.raw["watched_handle"] == "karpathy"


def test_nitter_multi_instance_failover(monkeypatch):
    # Pin the instance list so the test exercises failover logic itself,
    # independent of the shipped default order.
    monkeypatch.setenv("PEOS_NITTER_INSTANCES", "nitter.net,nitter.privacydev.net")
    calls = []

    def fake(url, *a, **k):
        calls.append(url)
        if "nitter.net/" in url:
            raise RuntimeError("connection refused")        # primary down
        # second instance serves one tweet
        class _Feed:
            entries = [{
                "link": "https://nitter.privacydev.net/karpathy/status/999",
                "title": "karpathy: hello world",
                "summary": "<p>hello</p>",
                "published_parsed": (2026, 7, 19, 12, 0, 0, 0, 0, 0),
            }]
        return _Feed()

    monkeypatch.setattr(nitter, "get_feed", fake)
    src = nitter.NitterSource()
    assert len(src.instances) >= 2                            # multi-instance configured
    obs = src.poll(Topic("n-m", "nitter", "karpathy"), since_ms=None)
    assert len(obs) == 1 and obs[0].native_id == "999"
    # the failing primary was tried and skipped, the second succeeded
    assert any("nitter.net" in c for c in calls)
    assert any("nitter.privacydev.net" in c for c in calls)


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


# ── DB-resident search (ddoc views + Mango) ──────────────────────────────────
def _obs(n, **kw):
    d = {"source": "hackernews", "source_type": "story", "native_id": f"S{n}",
         "native_url": f"u{n}", "observed_at_ms": 1000 + n, "author": "ann",
         "title": f"title {n}", "body": f"body {n}", "topics": ["t"]}
    d.update(kw)
    return d


def _ingest(client, *obs):
    r = client.post("/api/ingest", json={"observations": list(obs)})
    assert r.status_code == 202


def test_ensure_search_layer_idempotent():
    srv._ensure_search_layer()
    srv._ensure_search_layer()                      # second call: no-op
    ddoc = srv.store.get("_design/" + srv._SEARCH_DDOC)
    assert ddoc and set(srv._SEARCH_VIEWS) <= set(ddoc.get("views", {}))


def test_search_token_prefix_and(client):
    _ingest(client,
            _obs(1, title="Transformers explained", body="attention layers",
                 observed_at_ms=2000),
            _obs(2, title="transformer scaling laws", body="compute",
                 observed_at_ms=3000, topics=["t2"]),
            _obs(3, title="Rust rewriting Bun", body="zig considered",
                 observed_at_ms=4000))
    # exact token: both transformer docs
    r = client.get("/api/search?q=transformer").get_json()["items"]
    assert {d["native_id"] for d in r} == {"S1", "S2"}
    # prefix: same docs again
    r = client.get("/api/search?q=trans").get_json()["items"]
    assert {d["native_id"] for d in r} == {"S1", "S2"}
    # multi-token AND: only the doc with both 'transformer' and 'scal'
    r = client.get("/api/search?q=transformer+scal").get_json()["items"]
    assert {d["native_id"] for d in r} == {"S2"}


def test_search_structured_filters(client):
    _ingest(client,
            _obs(1, source="lobsters", observed_at_ms=2000),
            _obs(2, source="hackernews", topics=["only-here"],
                 observed_at_ms=3000),
            _obs(3, observed_at_ms=5000))
    assert {d["native_id"] for d in
            client.get("/api/search?source=lobsters").get_json()["items"]} == {"S1"}
    assert {d["native_id"] for d in
            client.get("/api/search?topic=only-here").get_json()["items"]} == {"S2"}
    assert {d["native_id"] for d in
            client.get("/api/search?since_ms=2500").get_json()["items"]} == {"S2", "S3"}
    # q + structured filter compose
    r = client.get("/api/search?q=title&source=hackernews").get_json()["items"]
    assert {d["native_id"] for d in r} == {"S2", "S3"}


def test_search_recency_and_score(client):
    _ingest(client, _obs(1, observed_at_ms=1000, score=5),
            _obs(2, observed_at_ms=9000, score=0))
    r = client.get("/api/search?sort=recent&limit=1").get_json()["items"]
    assert r[0]["native_id"] == "S2"                # newest first
    r = client.get("/api/search?sort=score&limit=2").get_json()["items"]
    assert r[0]["native_id"] == "S1"                # score beats recency


def test_search_short_q_substring_fallback(client):
    _ingest(client, _obs(1, title="a bug in the matrix"),
            _obs(2, title="unrelated"))
    r = client.get("/api/search?q=a+bug").get_json()["items"]
    assert {d["native_id"] for d in r} == {"S1"}


def test_search_paging(client):
    _ingest(client, *[_obs(i, observed_at_ms=1000 + i) for i in range(1, 6)])
    p1 = client.get("/api/search?limit=2").get_json()
    assert [d["native_id"] for d in p1["items"]] == ["S5", "S4"]   # newest first
    assert p1["has_more"] is True and p1["page"] == 1
    p2 = client.get("/api/search?limit=2&offset=2").get_json()
    assert [d["native_id"] for d in p2["items"]] == ["S3", "S2"]
    assert p2["has_more"] is True and p2["page"] == 2
    p3 = client.get("/api/search?limit=2&offset=4").get_json()
    assert [d["native_id"] for d in p3["items"]] == ["S1"]
    assert p3["has_more"] is False
    p4 = client.get("/api/search?limit=2&offset=9").get_json()
    assert p4["items"] == [] and p4["has_more"] is False
    # q path pages too (5 docs contain 'title' in title/body)
    pq = client.get("/api/search?q=title&limit=2&offset=2").get_json()
    assert len(pq["items"]) == 2 and pq["has_more"] is True


def test_search_matches_legacy_endpoint(client):
    _ingest(client,
            _obs(1, title="Rust release", body="rc info", source="lobsters",
                 observed_at_ms=2000),
            _obs(2, title="Other", body="python note",
                 observed_at_ms=3000))
    for params in ("?q=rust", "?source=lobsters", "?topic=t", "?since_ms=2500",
                   "?limit=1"):
        legacy = client.get(f"/api/observations{params}").get_json()
        modern = client.get(f"/api/search{params}").get_json()["items"]
        assert {d["id"] for d in legacy} == {d["id"] for d in modern}, params



# ── paper sources (arXiv · OpenAlex · Crossref · bioRxiv · generic RSS) ──────
def test_paper_sources_registered():
    for name in ("arxiv", "openalex", "crossref", "biorxiv", "rss"):
        assert name in src_pkg.SOURCE_REGISTRY
        assert any(m["name"] == name for m in src_pkg.SOURCE_META)


def test_arxiv_parse(monkeypatch):
    class F:
        entries = [{
            "id": "http://arxiv.org/abs/2609.11873v1",
            "title": " Recursive Self-Improvement ",
            "summary": "<p>An abstract.</p>",
            "published_parsed": (2026, 9, 13, 12, 0, 0, 0, 0, 0),
            "authors": [{"name": "Yi Duan"}, {"name": "Ying Liu"}],
        }]
    monkeypatch.setattr(peos_arxiv, "_throttle", lambda: None)
    monkeypatch.setattr(peos_arxiv, "get_feed", lambda url, **k: F())
    obs = peos_arxiv.ArxivSource().poll(Topic("arxiv-t", "arxiv", "cat:cs.AI"), None)
    assert len(obs) == 1
    o = obs[0]
    assert o.source_type == "paper" and o.native_id == "2609.11873"
    assert o.native_url == "https://arxiv.org/abs/2609.11873"
    assert "<p>" not in o.body and o.author == "Yi Duan"
    obs2 = peos_arxiv.ArxivSource().poll(
        Topic("arxiv-t", "arxiv", "q"), 9_999_999_999_999)
    assert obs2 == []


def test_arxiv_throttle(monkeypatch):
    sleeps = []
    monkeypatch.setattr(peos_arxiv.time, "sleep", lambda s: sleeps.append(s))
    monkeypatch.setattr(peos_arxiv.time, "time", lambda: 100.0)
    peos_arxiv._LAST_REQUEST[0] = 99.0
    peos_arxiv._throttle()
    assert sleeps == [2.0] and peos_arxiv._LAST_REQUEST[0] == 100.0


def test_openalex_parse(monkeypatch):
    data = {"results": [{
        "doi": "https://doi.org/10.1111/ABC.2", "display_name": "Federated Learning",
        "abstract_inverted_index": {"Learning": [1], "Federated": [0]},
        "publication_date": "2026-09-01",
        "authorships": [{"author": {"display_name": "A. Author"}}],
        "cited_by_count": 7, "id": "https://openalex.org/W1",
        "primary_location": {"source": {"display_name": "Nature"}},
    }]}
    monkeypatch.setattr(peos_openalex, "get_json", lambda url, **k: data)
    obs = peos_openalex.OpenAlexSource().poll(
        Topic("oa", "openalex", "federated learning"), None)
    o = obs[0]
    assert o.native_id == "10.1111/abc.2" and o.body == "Federated Learning"
    assert o.score == 7 and o.author == "A. Author"


def test_crossref_parse(monkeypatch):
    data = {"message": {"items": [{
        "DOI": "10.5555/XYZ.1", "title": ["A Journal Paper"],
        "abstract": "<jats:p>Plain body text</jats:p>",
        "author": [{"given": "Ada", "family": "Lovelace"}],
        "created": {"date-time": "2026-09-05T10:00:00Z"},
        "container-title": ["Journal"], "URL": "https://doi.org/10.5555/xyz.1",
    }]}}
    monkeypatch.setattr(peos_crossref, "get_json", lambda url, **k: data)
    obs = peos_crossref.CrossrefSource().poll(
        Topic("cr", "crossref", "papers"), None)
    o = obs[0]
    assert o.native_id == "10.5555/xyz.1" and o.author == "Ada Lovelace"
    assert "jats:" not in o.body and o.body == "Plain body text"
    assert o.observed_at_ms > 1_700_000_000_000


def test_biorxiv_parse(monkeypatch):
    pages = [
        {"collection": [
            {"doi": "10.1101/2026.09.01.1", "title": "Cell atlas",
             "abstract": "tissue", "date": "2026-09-01",
             "category": "genomics", "authors": "Li; Wang"},
            {"doi": "10.1101/2026.09.02.2", "title": "Protein folding",
             "abstract": "x", "date": "2026-09-02",
             "category": "structbio", "authors": "Kim"},
        ], "messages": [{"cursor": 2, "count": 2}]},
        {"collection": [], "messages": [{"cursor": 2, "count": 0}]},
    ]
    seq = iter(pages)
    monkeypatch.setattr(peos_biorxiv, "get_json", lambda url, **k: next(seq))
    obs = peos_biorxiv.BiorxivSource().poll(
        Topic("bx", "biorxiv", "atlas"), None)
    assert len(obs) == 1 and obs[0].native_id == "10.1101/2026.09.01.1"
    assert obs[0].author == "Li"


def test_rss_parse(monkeypatch):
    class F:
        entries = [{
            "id": "https://doi.org/10.1093/nature/1", "title": "News feature",
            "summary": "<p>n body</p>", "link": "https://www.nature.com/articles/x",
            "published_parsed": (2026, 9, 12, 9, 0, 0, 0, 0, 0),
        }]
    monkeypatch.setattr(peos_rss, "get_feed", lambda url, **k: F())
    obs = peos_rss.RssSource().poll(
        Topic("rs", "rss", "https://www.nature.com/nature.rss"), None)
    assert obs[0].native_id == "https://doi.org/10.1093/nature/1"
    assert obs[0].native_url.endswith("/x")
    # a non-URL query is a config error, not a fetch: no observations
    assert peos_rss.RssSource().poll(Topic("rs", "rss", "not-a-url"), None) == []
