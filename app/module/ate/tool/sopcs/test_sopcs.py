"""Tests for SOPCS — Standard Operating Procedure Catalog System.

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``sopcs_test_`` DB prefix — dropped at import for a clean slate —
and forces the lexical embed backend so tests are hermetic (no fastembed,
no model download). The graceful 501 path for semantic search is asserted
exactly because of that.

Covers the catalog: CRUD + validation, derived fields (outline/TOC,
reading time), pagination and filters, lexical search (AND semantics,
prefix matching), the semantic-unavailable contract, image upload/serve
as CouchDB attachments, audit, and the self/API surfaces.
"""
import io
import os

os.environ["COUCHDB_DB_PREFIX"] = "sopcs_test_"
os.environ["SOPCS_EMBED_BACKEND"] = "lexical"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates & seeds it.
import couchdb  # noqa: E402

_srv = couchdb.Server(os.environ["COUCHDB_URL"])
_srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
try:
    if "sopcs_test_sopcs" in _srv:
        _srv.delete("sopcs_test_sopcs")
    _couch_ok = True
except Exception:  # pragma: no cover - CouchDB unreachable
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:  # pragma: no cover
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("sopcs_server", os.path.join(_HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["sopcs_server"] = srv
_spec.loader.exec_module(srv)


@pytest.fixture
def client():
    # Fresh catalog per test: drop all application docs, re-seed the three
    # fixtures unconditionally (design docs and Mango indexes survive the
    # wipe — store.all() skips _design/*, so _maybe_seed's emptiness guard
    # would wrongly refuse; seed() re-adds only missing ids).
    for d in srv.store.all():
        srv.store.delete(d["id"])
    srv.store.seed([srv.SEED_PATH])
    srv._refresh_seed_derived()   # raw fixtures → computed words/toc/summary
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _mk(client, **over):
    payload = {
        "title": over.pop("title", "Deploying the Widget"),
        "body": over.pop("body", "# Deploy\n\nRun the deploy script with care."),
        **over,
    }
    return client.post("/api/docs", json=payload)


# ── catalog: CRUD + derived fields ───────────────────────────────────────────
class TestCatalog:
    def test_seeded_docs_present(self, client):
        res = client.get("/api/docs")
        assert res.status_code == 200
        data = res.get_json()
        assert data["total"] == 3
        ids = {d["id"] for d in data["items"]}
        assert {"deploy-autoregia", "commit-workflow", "couchdb-reseed"} <= ids
        first = data["items"][0]
        assert "reading_minutes" in first and "updated_at" in first
        assert "body" not in first          # metadata-first projection

    def test_create_get_update_delete(self, client):
        res = _mk(client, id="deploy-widget", tags=["ops", "Docker"])
        assert res.status_code == 201
        doc = res.get_json()
        assert doc["id"] == "deploy-widget"
        assert doc["tags"] == ["ops", "docker"]      # normalized + deduped
        assert doc["status"] == "draft"
        assert doc["words"] > 0 and doc["reading_minutes"] >= 1
        assert doc["toc"][0]["anchor"] == "h-1"

        got = client.get("/api/docs/deploy-widget")
        assert got.status_code == 200
        assert "# Deploy" in got.get_json()["body"]

        upd = client.put("/api/docs/deploy-widget", json={"status": "active"})
        assert upd.status_code == 200
        assert upd.get_json()["status"] == "active"
        assert upd.get_json()["created_at"] == doc["created_at"]

        assert client.delete("/api/docs/deploy-widget").status_code == 200
        assert client.get("/api/docs/deploy-widget").status_code == 404
        assert client.delete("/api/docs/deploy-widget").status_code == 404

    def test_create_auto_id_from_title(self, client):
        res = _mk(client, title="Reviewing The Ledger Weekly")
        assert res.status_code == 201
        assert res.get_json()["id"] == "reviewing-the-ledger-weekly"

    def test_create_requires_title_and_body(self, client):
        assert client.post("/api/docs", json={"title": "No body"}).status_code == 400
        assert client.post("/api/docs", json={"body": "no title"}).status_code == 400

    def test_create_rejects_bad_id_and_status(self, client):
        res = _mk(client, id="Bad_ID")
        assert res.status_code == 400
        assert "invalid id" in res.get_json()["error"]
        res = _mk(client, status="sideways")
        assert res.status_code == 400
        res = _mk(client, tags="not-a-list-but-string")   # strings are accepted
        assert res.status_code == 201
        assert res.get_json()["tags"] == ["not-a-list-but-string"]

    def test_create_duplicate_conflicts(self, client):
        assert _mk(client, id="dup-sop").status_code == 201
        assert _mk(client, id="dup-sop").status_code == 409

    def test_derived_fields_match_content(self, client):
        body = ("# Top\n\nintro\n\n## One\n\nalpha\n\n### Deep\n\nbeta\n\n"
                "#### Four\n\ngamma\n\n##### Five\ndelta")
        res = _mk(client, body=body)
        doc = res.get_json()
        # anchors count ALL headings; levels above 4 are not listed
        assert [(h["level"], h["anchor"]) for h in doc["toc"]] == [
            (1, "h-1"), (2, "h-2"), (3, "h-3"), (4, "h-4")]
        assert doc["reading_minutes"] == 1
        long_body = "word " * 500          # 500+ words → at least 3 minutes at 200 wpm
        res = _mk(client, body="# Long\n\n" + long_body)
        assert res.get_json()["reading_minutes"] >= 3

    def test_summary_derived_from_body(self, client):
        res = _mk(client, body="# T\n\nFirst presentable line here.\n\nMore.")
        assert res.get_json()["summary"] == "First presentable line here."


# ── pagination + filters ─────────────────────────────────────────────────────
class TestListing:
    def test_pagination_windows(self, client):
        for i in range(15):
            _mk(client, id=f"page-sop-{i:02d}", title=f"Page SOP {i:02d}")
        res = client.get("/api/docs?per_page=5&page=1")
        data = res.get_json()
        assert len(data["items"]) == 5
        assert data["total"] == 18            # 15 + 3 seeds
        assert data["pages"] == 4 and data["has_more"] is True
        page2 = client.get("/api/docs?per_page=5&page=2").get_json()
        assert [d["id"] for d in page2["items"]] != [d["id"] for d in data["items"]]
        last = client.get("/api/docs?per_page=5&page=4").get_json()
        assert len(last["items"]) == 3 and last["has_more"] is False

    def test_sort_orders(self, client):
        data = client.get("/api/docs?sort=title&per_page=100").get_json()
        titles = [d["title"] for d in data["items"]]
        assert titles == sorted(titles)
        data = client.get("/api/docs?sort=updated&per_page=100").get_json()
        stamps = [d["updated_at"] for d in data["items"]]
        assert stamps == sorted(stamps, reverse=True)
        assert client.get("/api/docs?sort=sideways").status_code == 400

    def test_status_and_tag_filters(self, client):
        _mk(client, id="flt-draft", status="draft", tags=["fish"])
        _mk(client, id="flt-active", status="active", tags=["fish", "chips"])
        draft = client.get("/api/docs?status=draft").get_json()
        assert {d["id"] for d in draft["items"]} >= {"flt-draft", "couchdb-reseed"}
        assert all(d["status"] == "draft" for d in draft["items"])
        chips = client.get("/api/docs?tag=chips").get_json()
        assert [d["id"] for d in chips["items"]] == ["flt-active"]
        assert client.get("/api/docs?status=nope").status_code == 400

    def test_tags_facet(self, client):
        _mk(client, id="facet-sop", tags=["alpha", "beta"])
        _mk(client, id="facet-sop-2", tags=["alpha"])
        tags = {t["tag"]: t["count"] for t in client.get("/api/tags").get_json()}
        assert tags["alpha"] == 2 and tags["beta"] == 1 and tags["git"] == 1


# ── search ───────────────────────────────────────────────────────────────────
class TestSearch:
    def test_lexical_single_token(self, client):
        res = client.get("/api/search?q=couchdb")
        assert res.status_code == 200
        data = res.get_json()
        assert data["mode"] == "lexical"
        ids = {d["id"] for d in data["items"]}
        assert {"couchdb-reseed", "deploy-autoregia"} <= ids
        assert all(d["score"] >= 1 for d in data["items"])

    def test_lexical_and_semantics(self, client):
        # both tokens must occur in the same document
        data = client.get("/api/search?q=couchdb database").get_json()
        assert {d["id"] for d in data["items"]} == {"couchdb-reseed"}
        data = client.get("/api/search?q=couchdb ritual").get_json()
        assert data["items"] == []

    def test_lexical_prefix_matching(self, client):
        data = client.get("/api/search?q=deplo").get_json()
        assert {d["id"] for d in data["items"]} >= {"deploy-autoregia"}

    def test_lexical_with_filters(self, client):
        data = client.get("/api/search?q=couchdb&status=draft").get_json()
        assert [d["id"] for d in data["items"]] == ["couchdb-reseed"]
        data = client.get("/api/search?q=couchdb&tag=maintenance").get_json()
        assert [d["id"] for d in data["items"]] == ["couchdb-reseed"]

    def test_empty_q_returns_recent(self, client):
        data = client.get("/api/search?q=").get_json()
        assert data["total"] >= 3
        stamps = [d["updated_at"] for d in data["items"]]
        assert stamps == sorted(stamps, reverse=True)

    def test_semantic_unavailable_is_501(self, client):
        res = client.get("/api/search?q=anything&mode=semantic")
        assert res.status_code == 501
        body = res.get_json()
        assert "unavailable" in body["error"]
        assert body["backend"]["available"] is False

    def test_mode_auto_falls_back_to_lexical(self, client):
        data = client.get("/api/search?q=couchdb&mode=auto").get_json()
        assert data["mode"] == "lexical"
        assert data["items"]

    def test_bad_mode_rejected(self, client):
        assert client.get("/api/search?q=x&mode=psychic").status_code == 400

    def test_reindex_unavailable_is_501(self, client):
        res = client.post("/api/reindex")
        assert res.status_code == 501
        assert "fastembed" in res.get_json()["error"]


# ── images (CouchDB attachments) ─────────────────────────────────────────────
class TestImages:
    PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64

    def test_upload_serve_roundtrip(self, client):
        res = client.post("/api/images", data={
            "file": (io.BytesIO(self.PNG), "deploy diagram.png", "image/png")})
        assert res.status_code == 201
        img = res.get_json()
        assert img["id"].startswith("img-")
        assert img["content_type"] == "image/png"
        assert img["markdown"] == f"![deploy diagram]({img['url']})"

        got = client.get(img["url"])
        assert got.status_code == 200
        assert got.content_type == "image/png"
        assert got.data == self.PNG
        assert "immutable" in got.headers.get("Cache-Control", "")

    def test_upload_validation(self, client):
        assert client.post("/api/images", data={
            "file": (io.BytesIO(b"hello"), "x.txt", "text/plain")}).status_code == 415
        assert client.post("/api/images", data={
            "file": (io.BytesIO(b""), "empty.png", "image/png")}).status_code == 400
        assert client.post("/api/images", data={}).status_code == 400
        assert client.get("/api/images/img-doesnotexist").status_code == 404

    def test_attachment_survives_doc_reads(self, client):
        res = client.post("/api/images", data={
            "file": (io.BytesIO(self.PNG), "a.png", "image/png")})
        img = res.get_json()
        raw = srv.store.get(img["id"])
        assert raw["type"] == "image" and raw["size"] == len(self.PNG)


# ── revision history: snapshots, diff, restore ───────────────────────────────
class TestRevisions:
    def test_create_snapshots_rev1(self, client):
        res = _mk(client, id="rev-sop", body="# One\n\nfirst words")
        assert res.get_json()["revision"] == 1
        revs = client.get("/api/docs/rev-sop/revisions").get_json()
        assert [r["seq"] for r in revs] == [1]
        assert revs[0]["comment"] == "initial version"
        snap = client.get("/api/docs/rev-sop/revisions/1").get_json()["snapshot"]
        assert snap["body"] == "# One\n\nfirst words"

    def test_seeds_get_initial_revisions(self, client):
        revs = client.get("/api/docs/deploy-autoregia/revisions").get_json()
        assert [r["seq"] for r in revs] == [1]
        got = client.get("/api/docs/deploy-autoregia").get_json()
        assert got["revision"] == 1

    def test_update_snapshots_and_counts(self, client):
        _mk(client, id="rev-count", body="v1 body")
        r = client.put("/api/docs/rev-count",
                       json={"body": "v1 body\n\nv2 line", "comment": "expand"})
        assert r.get_json()["revision"] == 2
        # a no-change save must not create a revision
        r = client.put("/api/docs/rev-count", json={"body": "v1 body\n\nv2 line"})
        assert r.get_json()["revision"] == 2
        revs = client.get("/api/docs/rev-count/revisions").get_json()
        assert [r["seq"] for r in revs] == [2, 1]
        assert revs[0]["comment"] == "expand"
        assert revs[1]["comment"] == "initial version"

    def test_diff_older_to_newer(self, client):
        _mk(client, id="diff-sop", body="# D\n\nalpha\n\nbeta")
        client.put("/api/docs/diff-sop", json={"body": "# D\n\nalpha changed\n\nbeta\n\ngamma"})
        d = client.get("/api/docs/diff-sop/revisions/2/diff").get_json()
        assert d["from_label"] == "rev 1" and d["to_label"] == "rev 2"
        assert d["changed"] is True
        assert "+gamma" in d["diff"] and "-alpha" in d["diff"] and "+alpha changed" in d["diff"]

    def test_diff_rev1_against_empty(self, client):
        _mk(client, id="first-sop", body="# A\n\nb\nc")
        d = client.get("/api/docs/first-sop/revisions/1/diff").get_json()
        assert d["from_label"] == "empty"
        added = [l for l in d["diff"].splitlines()
                 if l.startswith("+") and not l.startswith("+++")]
        assert added == ["+# A", "+", "+b", "+c"]   # whole document added

    def test_diff_against_latest(self, client):
        _mk(client, id="late-sop", body="first")
        client.put("/api/docs/late-sop", json={"body": "second"})
        d = client.get("/api/docs/late-sop/revisions/1/diff?against=latest").get_json()
        assert d["to_label"] == "current"
        assert "+second" in d["diff"] and "-first" in d["diff"]

    def test_diff_unknown_revisions_404(self, client):
        _mk(client, id="d404")
        assert client.get("/api/docs/d404/revisions/9/diff").status_code == 404
        assert client.get("/api/docs/d404/revisions/9").status_code == 404
        assert client.get("/api/docs/ghost/revisions").status_code == 404

    def test_restore_is_forward_only(self, client):
        _mk(client, id="restore-sop", body="the original body")
        client.put("/api/docs/restore-sop", json={"body": "an edited body"})
        r = client.post("/api/docs/restore-sop/restore", json={"seq": 1})
        assert r.status_code == 200
        doc = r.get_json()
        assert doc["body"] == "the original body"
        assert doc["revision"] == 3                 # restore creates a new revision
        revs = client.get("/api/docs/restore-sop/revisions").get_json()
        assert [x["seq"] for x in revs] == [3, 2, 1]
        assert "restored revision 1" in revs[0]["comment"]
        actions = client.get("/api/audit?action=sop.restore").get_json()
        assert actions[0]["entity_id"] == "restore-sop"
        assert actions[0]["details"]["restored_seq"] == 1

    def test_restore_rejects_unknown_seq(self, client):
        _mk(client, id="r404")
        assert client.post("/api/docs/r404/restore", json={"seq": 7}).status_code == 404
        assert client.post("/api/docs/r404/restore", json={}).status_code == 400

    def test_delete_cascades_revisions(self, client):
        _mk(client, id="cascade-sop", body="one")
        client.put("/api/docs/cascade-sop", json={"body": "two"})
        res = client.delete("/api/docs/cascade-sop")
        assert res.get_json()["revisions_purged"] == 2
        assert client.get("/api/docs/cascade-sop/revisions").status_code == 404
        leftovers = [d for d in srv.store.find({"type": "revision"})
                     if d.get("sop_id") == "cascade-sop"]
        assert leftovers == []


# ── dashboard overview ───────────────────────────────────────────────────────
class TestOverview:
    def test_overview_payload(self, client):
        _mk(client, id="ov-sop", body="x " * 250, status="active", tags=["ov"])
        ov = client.get("/api/overview").get_json()
        assert ov["catalog"]["sops"] == 4
        assert ov["catalog"]["by_status"]["active"] == 3
        assert ov["catalog"]["words"] >= 250
        assert ov["revisions"]["total"] == 4         # 3 seed revs + ov-sop create
        assert len(ov["activity"]) == 30
        assert any(a["count"] > 0 for a in ov["activity"])
        assert ov["top_tags"][0]["count"] >= 1
        assert ov["retrieval"]["embeddings"]["sops"] == 4
        assert ov["retrieval"]["embeddings"]["backend"]["available"] is False

    def test_overview_flags_stale_actives(self, client):
        # push one seed's updated_at beyond the stale window
        doc = srv.store.get("deploy-autoregia")
        old = (srv.datetime.now(tz=srv.timezone.utc) - srv.timedelta(days=120)) \
            .isoformat().replace("+00:00", "Z")
        doc["updated_at"] = old
        srv.store.put(doc)
        ov = client.get("/api/overview").get_json()
        stale_ids = {d["id"] for d in ov["stale_active"]}
        assert "deploy-autoregia" in stale_ids


# ── semantic clusters (the dashboard topic graph) ────────────────────────────
def _numpy_ok():
    import importlib.util
    return importlib.util.find_spec("numpy") is not None


class TestClusters:
    def test_absent_map_is_graceful(self, client):
        res = client.get("/api/clusters")
        assert res.status_code == 200
        meta = res.get_json()["meta"]
        assert meta["backend"] == "none"
        assert "not computed" in meta["reason"]

    def test_compute_without_backend_is_501(self, client):
        for i in range(6):                     # enough docs to be clusterable
            _mk(client, id=f"cl-sop-{i}", title=f"Cluster Probe {i}",
                 body=f"Topic body number {i} with distinct phrasing.")
        res = client.post("/api/clusters")
        if _numpy_ok():
            assert res.status_code == 200      # lexical TF-IDF fallback works
            return
        assert res.status_code == 501
        meta = res.get_json()["meta"]
        assert meta["backend"] == "none"
        assert "numpy" in meta["reason"]

    @pytest.mark.skipif(not _numpy_ok(),
                        reason="numpy not installed — lexical fallback unavailable")
    class TestComputed:
        def test_compute_stores_and_returns_map(self, client):
            for i in range(7):
                _mk(client, id=f"cc-sop-{i}", title=f"Compute Probe {i}",
                     body=f"Distinct procedural body sample {i} about topic area {i % 3}.")
            res = client.post("/api/clusters")
            assert res.status_code == 200
            body = res.get_json()
            assert body["meta"]["backend"] in ("lexical", "embeddings")
            assert body["meta"]["n"] == 10
            assert set(body["assignments"]) >= {f"cc-sop-{i}" for i in range(7)}
            node = body["assignments"]["cc-sop-0"]
            assert node["cluster"].startswith("c") and "label" in node
            assert -1 <= node["x"] <= 1 and -1 <= node["y"] <= 1
            assert isinstance(body["edges"], list)
            # GET returns the stored map
            got = client.get("/api/clusters").get_json()
            assert got["meta"]["backend"] == body["meta"]["backend"]
            assert got["assignments"]["cc-sop-1"]["title"] == "Compute Probe 1"

    def test_too_few_sops(self, client):
        for d in client.get("/api/docs?per_page=100").get_json()["items"]:
            client.delete(f"/api/docs/{d['id']}")
        _mk(client, id="tiny-sop")
        res = client.post("/api/clusters")
        assert res.get_json()["meta"]["reason"].startswith("too few")


# ── audit + surfaces ─────────────────────────────────────────────────────────
class TestAuditAndSurfaces:
    def test_mutations_are_audited(self, client):
        _mk(client, id="audit-sop")
        actions = [e["action"] for e in client.get("/api/audit?action=sop.create").get_json()]
        assert "sop.create" in actions
        client.delete("/api/docs/audit-sop")
        assert client.get("/api/audit?action=sop.delete").get_json()[0]["entity_id"] == "audit-sop"

    def test_api_index(self, client):
        res = client.get("/api")
        assert res.status_code == 200
        data = res.get_json()
        assert data["name"].startswith("SOPCS")
        assert data["search_backend"]["available"] is False   # lexical-forced in tests

    def test_self_blob(self, client):
        blob = client.get("/api/self").get_json()
        assert blob["store"]["db"].endswith("sopcs")
        assert blob["catalog"]["sops"] >= 3
        assert blob["catalog"]["by_status"].get("active", 0) >= 1
        assert blob["embeddings"]["backend"]["available"] is False
        assert "uptime_s" in blob

    def test_plate_served(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert b"SOPCS" in res.data
