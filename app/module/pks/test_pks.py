"""Tests for PKS (Personal Knowledge System) — Naturgnosis Index + notes.

Requires a running CouchDB on localhost:5984 (the project default). The notes
DB is isolated by prefix; the snapshot itself is a committed JSON file, so its
completeness is tested offline. The API is exercised via the Flask test client.
"""
import json
import os

os.environ["COUCHDB_DB_PREFIX"] = "pks_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

import couchdb  # noqa: E402

try:
    _srv = couchdb.Server(os.environ["COUCHDB_URL"])
    _srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
    _couch_ok = True
except Exception:  # pragma: no cover
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, APP_DIR)

_spec = importlib.util.spec_from_file_location("pks_server", os.path.join(HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["pks_server"] = srv
_spec.loader.exec_module(srv)

# The shared Store reads COUCHDB_DB_PREFIX once per process; other suites may
# have imported it first. Drop whatever effective pks DB this run will use.
from support.storage import couchdb_store  # noqa: E402

_DB = couchdb_store.DB_PREFIX + "pks"
if _DB in _srv:
    _srv.delete(_DB)


@pytest.fixture
def client():
    c = srv.app.test_client()
    db, err = srv.store()
    assert err is None, err
    for doc in db.all():
        db.delete(doc["id"])
    yield c


def _snapshot():
    with open(srv.GRAPH_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _layout():
    with open(srv.LAYOUT_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def test_snapshot_has_every_node_in_every_space():
    payload = _snapshot()
    nodes = payload["nodes"]
    counts = payload["counts"]

    assert payload["snapshot"]["source_repo"] == "csiglab/Naturgnosis"
    assert payload["snapshot"]["source_commit"]
    assert set(counts) == set(srv.SPACES)
    assert sum(counts.values()) == len(nodes) == 16165

    seen = set()
    actual = {s: 0 for s in srv.SPACES}
    for node in nodes:
        assert node["uid"] == f"{node['source']}:{node['source_id']}"
        assert node["uid"] not in seen
        seen.add(node["uid"])
        actual[node["source"]] += 1
    assert actual == counts


def test_snapshot_layout_and_edges_are_complete():
    nodes = _snapshot()["nodes"]
    layout = _layout()
    uids = {n["uid"] for n in nodes}

    assert len(layout) == len(uids)
    assert not (uids - set(layout))
    dangling = [t for n in nodes for t in n.get("targets", []) if t not in uids]
    assert dangling == []


def test_builder_refuses_an_incomplete_snapshot():
    spec = importlib.util.spec_from_file_location(
        "pks_snapshot", os.path.join(HERE, "bin", "snapshot_naturgnosis.py"))
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)

    payload = _snapshot()
    payload = {"counts": payload["counts"], "nodes": payload["nodes"][:-1]}
    with pytest.raises(SystemExit):
        builder.validate(payload, _layout())


def test_pages_and_data_are_served(client):
    assert client.get("/").status_code == 200
    assert client.get("/naturgnosis/").status_code == 200
    assert client.get("/naturgnosis/vendor/socio-graph.js").status_code == 200
    assert client.get("/learn/lebrija/index.html").status_code == 200
    data = client.get("/data/naturgnosis-index.json")
    assert data.status_code == 200
    assert data.get_json()["snapshot"]["source_commit"]


def test_health(client):
    doc = client.get("/api/health").get_json()
    assert doc["status"] == "ok"
    assert doc["nodes"] == 16165
    assert doc["counts"]["social"] == 7544
    assert doc["overlay_nodes"] == 0
    assert doc["tombstones"] == 0


def test_node_create_overlay_and_export(client):
    created = client.post("/api/nodes", json={
        "space": "social",
        "name": "Civic Trust Network",
        "category": "Institution",
        "layer": "Ontic",
        "description": "A local node added in PKS.",
        "tags": "trust, network",
        "x": 12.5,
        "y": -4,
    })
    assert created.status_code == 201
    node = created.get_json()
    assert node["uid"].startswith("social:")
    assert node["origin"] == "local"
    assert node["tags"] == ["trust", "network"]

    overlay = client.get("/api/nodes/overlay").get_json()
    assert overlay["count"] == 1
    assert overlay["deleted"] == 0
    assert overlay["nodes"][0]["uid"] == node["uid"]

    md = client.get("/api/nodes/export?format=md")
    assert md.status_code == 200
    assert b"Civic Trust Network" in md.data
    assert b"## social" in md.data

    exported = client.get("/api/nodes/export?format=json").get_json()
    assert exported["nodes"][0]["uid"] == node["uid"]


def test_node_edit_base_creates_override(client):
    edited = client.put("/api/nodes/social:10", json={
        "name": "Religious Organization (curated)",
        "description": "Edited in PKS.",
        "tags": ["curated"],
    })
    assert edited.status_code == 200
    doc = edited.get_json()
    assert doc["origin"] == "override"
    assert doc["space"] == "social"

    overlay = client.get("/api/nodes/overlay").get_json()
    assert overlay["count"] == 1
    assert overlay["nodes"][0]["uid"] == "social:10"
    assert overlay["nodes"][0]["origin"] == "override"

    # Space is immutable for an existing node.
    assert client.put("/api/nodes/social:10", json={"space": "nature", "name": "x"}).status_code == 400


def test_node_delete_base_writes_tombstone(client):
    assert client.delete("/api/nodes/social:10").status_code == 200
    overlay = client.get("/api/nodes/overlay").get_json()
    assert overlay["count"] == 0
    assert overlay["deleted"] == 1
    assert overlay["tombstones"][0]["uid"] == "social:10"

    assert client.delete("/api/nodes/social:10").status_code == 404


def test_node_delete_local_removes_doc(client):
    created = client.post("/api/nodes", json={"space": "nature", "name": "Ephemeral Node"})
    uid = created.get_json()["uid"]
    assert client.delete(f"/api/nodes/{uid}").status_code == 200
    overlay = client.get("/api/nodes/overlay").get_json()
    assert overlay["count"] == 0
    assert overlay["deleted"] == 0


def test_node_validation_and_slug_uniqueness(client):
    assert client.post("/api/nodes", json={"space": "nope", "name": "x"}).status_code == 400
    assert client.post("/api/nodes", json={"space": "social", "name": "   "}).status_code == 400
    assert client.put("/api/nodes/nope:missing", json={"name": "x"}).status_code == 404

    first = client.post("/api/nodes", json={"space": "social", "name": "Same Name"})
    second = client.post("/api/nodes", json={"space": "social", "name": "Same Name"})
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.get_json()["uid"] != second.get_json()["uid"]


def test_notes_crud_and_export(client):
    created = client.post("/api/notes", json={"uid": "social:10", "body": "Kept because it anchors civil society."})
    assert created.status_code == 201
    note = created.get_json()
    assert note["space"] == "social"
    assert note["name"] == "Religious Organization"

    listed = client.get("/api/notes?uid=social:10").get_json()
    assert listed["count"] == 1
    assert listed["notes"][0]["body"].startswith("Kept because")

    edited = client.put(f"/api/notes/{note['id']}", json={"body": "Edited rationale."})
    assert edited.status_code == 200
    assert edited.get_json()["body"] == "Edited rationale."

    md = client.get("/api/notes/export?format=md")
    assert md.status_code == 200
    assert b"Edited rationale." in md.data
    assert b"## social" in md.data

    exported = client.get("/api/notes/export?format=json").get_json()
    assert exported["notes"][0]["uid"] == "social:10"

    deleted = client.delete(f"/api/notes/{note['id']}")
    assert deleted.status_code == 200
    assert client.get("/api/notes").get_json()["count"] == 0


def test_note_validation(client):
    assert client.post("/api/notes", json={"uid": "nope:1", "body": "x"}).status_code == 404
    assert client.post("/api/notes", json={"uid": "social:10", "body": "   "}).status_code == 400
    assert client.put("/api/notes/missing", json={"body": "x"}).status_code == 404
    assert client.delete("/api/notes/missing").status_code == 404


def test_notes_are_scoped_by_uid(client):
    client.post("/api/notes", json={"uid": "social:10", "body": "social note"})
    client.post("/api/notes", json={"uid": "nature:point-charge-ontic-001", "body": "nature note"})

    only = client.get("/api/notes?uid=nature:point-charge-ontic-001").get_json()
    assert only["count"] == 1
    assert only["notes"][0]["space"] == "nature"
    assert client.get("/api/notes").get_json()["count"] == 2

    # Node overlay docs must never leak into the notes API.
    client.post("/api/nodes", json={"space": "social", "name": "Overlay Doc"})
    assert client.get("/api/notes").get_json()["count"] == 2
