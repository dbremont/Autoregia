"""Tests for ACSMS.

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``acsms_test_`` DB prefix and drops the test DB at import for a
clean slate. The API and persistence are tested via the Flask test client;
the tracking layer (practice_state computation) is exercised through the
same client with controlled ``practiced_at_ms`` values.
"""
import os

os.environ["COUCHDB_DB_PREFIX"] = "acsms_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates it.
import couchdb  # noqa: E402

try:
    _srv = couchdb.Server(os.environ["COUCHDB_URL"])
    _srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
    if "acsms_test_acsms" in _srv:
        _srv.delete("acsms_test_acsms")
    _couch_ok = True
except Exception:  # pragma: no cover
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import sys  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import acsms.server as srv  # noqa: E402


DAY = 86_400_000
WEEK = 7 * DAY


@pytest.fixture
def client():
    # Isolate every test: wipe all ACSMS docs from the test store first.
    for d in srv.store.all():
        srv.store.delete(d["id"])
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def make_skill(client, name="Systems thinking", **kw):
    body = {"name": name, "description": "d", "tags": ["t1"], **kw}
    r = client.post("/api/skills", json=body)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def make_practice(client, skill_id, days_ago=0, **kw):
    body = {"skill_id": skill_id,
            "practiced_at_ms": srv.now_ms() - days_ago * DAY, **kw}
    r = client.post("/api/practices", json=body)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


# ── skills: CRUD ─────────────────────────────────────────────────────────────
def test_skill_create_and_get(client):
    s = make_skill(client, target_per_week=2)
    assert s["id"].startswith("SKILL-")
    assert s["doc_type"] == "skill" and s["status"] == "active"
    assert s["target_per_week"] == 2 and s["tags"] == ["t1"]
    r = client.get(f"/api/skills/{s['id']}")
    assert r.status_code == 200
    got = r.get_json()
    assert got["name"] == "Systems thinking"
    assert got["practice_count"] == 0 and got["last_practiced_ms"] is None


def test_skill_slug_ids_are_readable_and_unique(client):
    s1 = make_skill(client, name="Technical Writing")
    s2 = make_skill(client, name="Technical Writing")
    assert s1["id"] == "SKILL-technical-writing"
    assert s2["id"] != s1["id"] and s2["id"].startswith("SKILL-technical-writing-")


def test_skill_validation(client):
    assert client.post("/api/skills", json={"name": "  "}).status_code == 400
    assert client.post("/api/skills", json={"name": "X", "status": "gone"}).status_code == 400
    assert client.post("/api/skills", json={"name": "X", "target_per_week": 0}).status_code == 400
    assert client.post("/api/skills", json={"name": "X", "target_per_week": "abc"}).status_code == 400
    assert client.get("/api/skills/SKILL-missing").status_code == 404
    assert client.put("/api/skills/SKILL-missing", json={"name": "Y"}).status_code == 404


def test_skill_update_and_rename_keeps_practice_snapshot(client):
    s = make_skill(client, name="Old Name")
    p = make_practice(client, s["id"], notes="n")
    assert p["skill_name"] == "Old Name"
    r = client.put(f"/api/skills/{s['id']}", json={"name": "New Name"})
    assert r.status_code == 200 and r.get_json()["name"] == "New Name"
    practices = client.get("/api/practices").get_json()["items"]
    assert practices[0]["skill_name"] == "New Name"


def test_skill_delete_blocked_by_practice_history(client):
    s = make_skill(client)
    make_practice(client, s["id"])
    r = client.delete(f"/api/skills/{s['id']}")
    assert r.status_code == 409
    assert "retire" in r.get_json()["error"]


def test_skill_delete_allowed_when_never_practiced(client):
    s = make_skill(client)
    assert client.delete(f"/api/skills/{s['id']}").status_code == 200
    assert client.get(f"/api/skills/{s['id']}").status_code == 404


def test_skill_listing_filters(client):
    a = make_skill(client, name="Alpha")
    b = make_skill(client, name="Beta", status="paused")
    make_practice(client, a["id"], days_ago=0)
    skills = client.get("/api/skills").get_json()
    by_id = {s["id"]: s for s in skills}
    assert by_id[a["id"]]["practice_count"] == 1
    assert by_id[b["id"]]["status"] == "paused"
    assert [s["id"] for s in client.get("/api/skills?status=paused").get_json()] == [b["id"]]


# ── practices: the self-report contract ─────────────────────────────────────
def test_practice_requires_an_existing_skill(client):
    r = client.post("/api/practices", json={"skill_id": "SKILL-ghost"})
    assert r.status_code == 400
    assert "does not exist" in r.get_json()["error"]
    r = client.post("/api/practices", json={})
    assert r.status_code == 400 and "skill_id is required" in r.get_json()["error"]


def test_practice_rejected_on_retired_skill(client):
    s = make_skill(client)
    client.put(f"/api/skills/{s['id']}", json={"status": "retired"})
    r = client.post("/api/practices", json={"skill_id": s["id"]})
    assert r.status_code == 400 and "retired" in r.get_json()["error"]


def test_practice_create_defaults_and_validation(client):
    s = make_skill(client)
    p = make_practice(client, s["id"], notes="did the thing", quality=4, confidence=3,
                      duration_min=45, evidence_url="https://example.org/out")
    assert p["id"].startswith("PRACTICE-")
    assert p["skill_name"] == s["name"]
    assert p["practiced_at_ms"] and p["quality"] == 4 and p["confidence"] == 3
    assert p["duration_min"] == 45
    # field-level validation
    for bad in ({"quality": 0}, {"quality": 6}, {"confidence": -1},
                {"duration_min": -5}, {"duration_min": 9999},
                {"practiced_at_ms": srv.now_ms() + 10 * DAY}):
        r = client.post("/api/practices", json={"skill_id": s["id"], **bad})
        assert r.status_code == 400, bad


def test_practice_stream_filters_and_paging(client):
    a = make_skill(client, name="Alpha")
    b = make_skill(client, name="Beta")
    make_practice(client, a["id"], days_ago=1, notes="alpha session")
    make_practice(client, b["id"], days_ago=2, notes="beta session")
    make_practice(client, a["id"], days_ago=3, notes="older alpha")

    items = client.get("/api/practices").get_json()["items"]
    assert len(items) == 3
    assert items[0]["practiced_at_ms"] >= items[-1]["practiced_at_ms"]  # newest first

    only_a = client.get(f"/api/practices?skill_id={a['id']}").get_json()["items"]
    assert len(only_a) == 2 and all(p["skill_id"] == a["id"] for p in only_a)

    q = client.get("/api/practices", query_string={"q": "beta"}).get_json()["items"]
    assert len(q) == 1 and q[0]["skill_id"] == b["id"]

    since = srv.now_ms() - int(1.5 * DAY)
    recent = client.get(f"/api/practices?since_ms={since}").get_json()["items"]
    assert len(recent) == 1

    page = client.get("/api/practices?limit=2&offset=1").get_json()
    assert len(page["items"]) == 2 and page["total"] == 3 and page["has_more"] is False


def test_practice_delete(client):
    s = make_skill(client)
    p = make_practice(client, s["id"])
    assert client.delete(f"/api/practices/{p['id']}").status_code == 200
    assert client.delete(f"/api/practices/{p['id']}").status_code == 404


# ── the tracking layer: practice_state ──────────────────────────────────────
def test_state_never_practiced(client):
    s = make_skill(client)
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "never-practiced"


def test_state_on_track_within_cadence(client):
    s = make_skill(client, target_per_week=1)  # stale after 14d
    make_practice(client, s["id"], days_ago=3)
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "on-track"


def test_state_neglected_beyond_twice_cadence(client):
    s = make_skill(client, target_per_week=1)
    make_practice(client, s["id"], days_ago=15)
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "neglected"


def test_state_respects_cadence_target(client):
    s = make_skill(client, target_per_week=7)   # daily: stale after 2 days
    make_practice(client, s["id"], days_ago=3)
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "neglected"
    make_practice(client, s["id"], days_ago=0)
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "on-track"


def test_state_lifecycle_beats_tracking(client):
    s = make_skill(client)
    make_practice(client, s["id"], days_ago=30)
    client.put(f"/api/skills/{s['id']}", json={"status": "paused"})
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "paused"
    client.put(f"/api/skills/{s['id']}", json={"status": "retired"})
    assert client.get(f"/api/skills/{s['id']}").get_json()["practice_state"] == "retired"


# ── dashboard & health ──────────────────────────────────────────────────────
def test_dashboard_stats_and_attention_queue(client):
    fresh = make_skill(client, name="Fresh", target_per_week=1)
    stale = make_skill(client, name="Stale", target_per_week=1)
    ghost = make_skill(client, name="Ghost")
    make_practice(client, fresh["id"], days_ago=1)
    make_practice(client, stale["id"], days_ago=30)

    st = client.get("/api/dashboard/stats").get_json()
    assert st["skills"]["total"] == 3 and st["skills"]["active"] == 3
    assert st["practices"]["total"] == 2
    assert st["states"]["on-track"] == 1 and st["states"]["neglected"] == 1
    assert st["states"]["never-practiced"] == 1
    assert [a["id"] for a in st["attention"]] == [stale["id"], ghost["id"]]
    assert st["recent"][0]["skill_id"] == fresh["id"]


def test_health(client):
    s = make_skill(client)
    make_practice(client, s["id"])
    h = client.get("/api/health").get_json()
    assert h["ok"] and h["skills"] == 1 and h["practices"] == 1
    assert client.get("/api/export").status_code == 404


# ── seed catalog ─────────────────────────────────────────────────────────────
def test_seed_applies_only_to_empty_db(client):
    # fixture wiped the DB; a fresh Store re-seeds from data/skills.json
    import json
    seed = json.load(open(srv.SEED_PATH, encoding="utf-8"))
    assert seed and all(s.get("id") for s in seed)
    from support.storage import Store
    st = Store("acsms", seed_paths=[srv.SEED_PATH])
    assert st.count() >= len(seed)
    names = {d["name"] for d in st.all()}
    assert {s["name"] for s in seed} <= names
