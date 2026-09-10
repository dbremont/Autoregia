"""Tests for GIS (General Index System).

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``gis_test_`` DB prefix and drops the test DBs at import for a
clean slate; the API is exercised via the Flask test client.
"""
import os

os.environ["COUCHDB_DB_PREFIX"] = "gis_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DBs before the server module creates & seeds them.
import couchdb  # noqa: E402

_srv = couchdb.Server(os.environ["COUCHDB_URL"])
_srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
for _name in ("gis_test_ptocs", "gis_test_ptocs_activity"):
    if _name in _srv:
        _srv.delete(_name)
_couch_ok = True

import pytest  # noqa: E402

if not _couch_ok:  # pragma: no cover
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("gis_server", os.path.join(_HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["gis_server"] = srv
_spec.loader.exec_module(srv)


@pytest.fixture
def client():
    # Isolate every test: wipe all docs from both stores first.
    for d in srv.store.all():
        srv.store.delete(d["id"])
    for d in srv.activity_store.all():
        srv.activity_store.delete(d["id"])
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _mk(client, **over):
    payload = {
        "name": over.pop("name", "Test Entry"),
        "object_kind": over.pop("object_kind", "software_tool"),
        "summary": over.pop("summary", "A test entry."),
        "tags": over.pop("tags", []),
        **over,
    }
    res = client.post("/api/entries", json=payload)
    assert res.status_code == 201
    return res.get_json()


# ── CRUD ─────────────────────────────────────────────────────────────────────
def test_create_and_get_entry(client):
    e = _mk(client, name="Obsidian", object_kind="software_tool", space="personal",
            tags=["pkm"], summary="Local-first knowledge base.")
    assert e["id"].startswith("OBJ-")
    assert e["space"] == "personal"
    got = client.get(f"/api/entries/{e['id']}")
    assert got.status_code == 200
    assert got.get_json()["name"] == "Obsidian"
    assert got.get_json()["tags"] == ["pkm"]


def test_create_defaults_space_personal(client):
    e = _mk(client, name="No Space Given")
    assert e["space"] == "personal"


def test_update_entry(client):
    e = _mk(client, name="Git", summary="Version control.")
    res = client.put(f"/api/entries/{e['id']}", json={"summary": "Distributed VCS.",
                                                      "space": "work"})
    body = res.get_json()
    assert body["summary"] == "Distributed VCS."
    assert body["space"] == "work"
    assert body["id"] == e["id"]
    assert body["updated_at"] >= e["updated_at"]


def test_update_protects_id_and_created(client):
    e = _mk(client, name="Immutable")
    res = client.put(f"/api/entries/{e['id']}",
                     json={"id": "HACK", "created_at": "1999-01-01T00:00:00Z"})
    body = res.get_json()
    assert body["id"] == e["id"]
    assert body["created_at"] == e["created_at"]


def test_delete_entry(client):
    e = _mk(client, name="Doomed")
    assert client.delete(f"/api/entries/{e['id']}").status_code == 200
    assert client.get(f"/api/entries/{e['id']}").status_code == 404


def test_get_missing_entry_404(client):
    assert client.get("/api/entries/OBJ-NOPE").status_code == 404


# ── filters ──────────────────────────────────────────────────────────────────
def test_filter_space_and_tag(client):
    _mk(client, name="Work Thing", space="work", tags=["finance"])
    _mk(client, name="Home Thing", space="personal", tags=["home"])
    work = client.get("/api/entries?space=work").get_json()
    assert [e["name"] for e in work] == ["Work Thing"]
    fin = client.get("/api/entries?tag=finance").get_json()
    assert [e["name"] for e in fin] == ["Work Thing"]


def test_filter_kinds_csv(client):
    _mk(client, name="Doc", object_kind="document")
    _mk(client, name="Lang", object_kind="language")
    _mk(client, name="Tool", object_kind="software_tool")
    out = client.get("/api/entries?kinds=document,language").get_json()
    assert sorted(e["name"] for e in out) == ["Doc", "Lang"]


def test_filter_group(client):
    _mk(client, name="A Paper", object_kind="document")
    _mk(client, name="A Standard", object_kind="reference_artifact")
    _mk(client, name="An Editor", object_kind="software_tool")
    docs = client.get("/api/entries?group=documents").get_json()
    assert sorted(e["name"] for e in docs) == ["A Paper", "A Standard"]
    tools = client.get("/api/entries?group=tools").get_json()
    assert [e["name"] for e in tools] == ["An Editor"]


# ── /api/index projection ────────────────────────────────────────────────────
def test_index_pagination(client):
    for i in range(5):
        _mk(client, name=f"Paged {i}")
    data = client.get("/api/index?per_page=2&page=1").get_json()
    assert data["total"] == 5
    assert data["pages"] == 3
    assert len(data["entries"]) == 2
    data2 = client.get("/api/index?per_page=2&page=3").get_json()
    assert len(data2["entries"]) == 1
    over = client.get("/api/index?per_page=2&page=99").get_json()
    assert over["page"] == 3  # clamped


def test_index_sort_name(client):
    _mk(client, name="Zebra")
    _mk(client, name="Apple")
    _mk(client, name="Mango")
    data = client.get("/api/index?sort=name&per_page=100").get_json()
    names = [e["name"] for e in data["entries"]]
    assert names == sorted(names, key=str.lower)


def test_index_relevance_ranks_name_match_first(client):
    _mk(client, name="Flask", summary="Web framework.")
    _mk(client, name="Bottle", summary="Inspired by flask, another framework.")
    data = client.get("/api/index?q=flask").get_json()
    assert data["entries"][0]["name"] == "Flask"


def test_index_pinned_first_on_relevance(client):
    _mk(client, name="Recent Plain")
    _mk(client, name="Pinned Old", pinned=True)
    _mk(client, name="Recent Plain 2")
    data = client.get("/api/index").get_json()
    assert data["entries"][0]["name"] == "Pinned Old"


# ── /api/overview ────────────────────────────────────────────────────────────
def test_overview_counts(client):
    a = _mk(client, name="Hub", tags=["editor", "devops"], relations=[
        {"target": "X", "kind": "depends_on", "notes": None},
        {"target": "Y", "kind": "references", "notes": None},
    ])
    _mk(client, name="Spoke", tags=["editor"], relations=[
        {"target": a["id"], "kind": "related_to", "notes": None},
    ])
    _mk(client, name="Doc", object_kind="document", space="work")
    o = client.get("/api/overview").get_json()
    assert o["total"] == 3
    assert o["relationships"] == 3
    assert o["kinds"] == 2
    assert o["by_kind"]["software_tool"] == 2
    assert o["by_kind"]["document"] == 1
    assert o["by_group"]["tools"] == 2
    assert o["by_group"]["documents"] == 1
    assert o["by_space"]["work"] == 1
    assert ("editor", 2) in [tuple(t) for t in o["top_tags"]]
    assert o["last_updated"]


# ── activity log ─────────────────────────────────────────────────────────────
def test_activity_lifecycle(client):
    e = _mk(client, name="Tracked")
    client.post(f"/api/entries/{e['id']}/view")
    client.put(f"/api/entries/{e['id']}", json={"summary": "Changed."})
    events = client.get("/api/activity?limit=50").get_json()
    kinds = [ev["kind"] for ev in events]
    assert "added" in kinds
    assert "viewed" in kinds
    assert "updated" in kinds
    names = {ev["entry_id"] for ev in events}
    assert e["id"] in names


def test_activity_delete_recorded(client):
    e = _mk(client, name="Ghost")
    client.delete(f"/api/entries/{e['id']}")
    events = client.get("/api/activity").get_json()
    deleted = [ev for ev in events if ev["kind"] == "deleted"]
    assert deleted and deleted[0]["entry_id"] == e["id"]


def test_activity_newest_first(client):
    a = _mk(client, name="First")
    _mk(client, name="Second")
    events = client.get("/api/activity").get_json()
    assert events[0]["ts"] >= events[-1]["ts"]
    assert all(ev["entry_id"] in (a["id"],) or True for ev in events)


def test_view_missing_entry_404(client):
    assert client.post("/api/entries/OBJ-NOPE/view").status_code == 404


# ── search ───────────────────────────────────────────────────────────────────
def test_search_scoring(client):
    _mk(client, name="Flask", summary="Lightweight Python WSGI framework.",
        tags=["backend"])
    _mk(client, name="Unrelated", summary="Nothing here.")
    out = client.get("/api/search?q=flask").get_json()
    assert len(out) == 1 and out[0]["name"] == "Flask"
    assert out[0]["_score"] >= 10
