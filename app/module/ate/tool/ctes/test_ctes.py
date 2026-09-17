"""Tests for CTES — Computation Task Execution System.

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``ctes_test_`` DB prefix — dropped at import for a clean slate — and
forces the ``subprocess`` execution backend so no docker image is needed.

Covers the phase 2 app shell: handle lifecycle (register, update, activate/
inactivate, delete), task specs and emit, audit, settings, self monitoring,
export, and the run journal.
"""
import json
import os
import shutil

os.environ["COUCHDB_DB_PREFIX"] = "ctes_test_"
os.environ["CTES_EXEC_BACKEND"] = "subprocess"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates & seeds it.
import couchdb  # noqa: E402

_srv = couchdb.Server(os.environ["COUCHDB_URL"])
_srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
try:
    if "ctes_test_ctes" in _srv:
        _srv.delete("ctes_test_ctes")
    _couch_ok = True
except Exception:  # pragma: no cover - CouchDB unreachable
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:  # pragma: no cover
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("ctes_server", os.path.join(_HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["ctes_server"] = srv
_spec.loader.exec_module(srv)


@pytest.fixture
def client():
    # Fresh register + empty history per test; handles restored from the
    # packages/ manifests (which also re-establishes the seeded pair).
    for d in srv.store.all():
        srv.store.delete(d["id"])
    srv.scan_packages()
    srv._ensure_settings_doc()
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _register(client, **over):
    payload = {
        "id": over.pop("id", "echo-test"),
        "entry_point": over.pop("entry_point", "main:run"),
        "name": over.pop("name", "Echo Test"),
        "description": over.pop("description", "Test-only handle."),
        **over,
    }
    return client.post("/api/handles", json=payload)


def _cleanup_pkg(handle_id):
    pkg = os.path.join(srv.PACKAGES_DIR, handle_id)
    if os.path.isdir(pkg):
        shutil.rmtree(pkg)


# ── the register ─────────────────────────────────────────────────────────────
class TestRegister:
    def test_seeded_handles_present(self, client):
        res = client.get("/api/handles")
        assert res.status_code == 200
        data = res.get_json()
        ids = {h["id"] for h in data}
        assert {"hello", "sleepy"} <= ids
        hello = next(h for h in data if h["id"] == "hello")
        assert hello["entry_point"] == "main:run"
        assert hello["code_path"] == "packages/hello"

    def test_register_creates_skeleton_and_doc(self, client):
        res = _register(client)
        assert res.status_code == 201
        doc = res.get_json()
        assert doc["id"] == "echo-test"
        assert doc["type"] == "handle"
        try:
            pkg = os.path.join(srv.PACKAGES_DIR, "echo-test")
            assert os.path.isfile(os.path.join(pkg, "manifest.json"))
            assert os.path.isfile(os.path.join(pkg, "main.py"))
            detail = client.get("/api/handles/echo-test")
            assert detail.status_code == 200
            assert detail.get_json()["code_on_disk"] is True
        finally:
            _cleanup_pkg("echo-test")

    def test_register_rejects_bad_id(self, client):
        res = _register(client, id="Bad_ID")
        assert res.status_code == 400
        assert "invalid handle id" in res.get_json()["error"]

    def test_register_rejects_bad_entry_point(self, client):
        res = _register(client, entry_point="mainrun")
        assert res.status_code == 400
        assert "entry_point" in res.get_json()["error"]

    def test_register_duplicate_conflicts(self, client):
        try:
            assert _register(client).status_code == 201
            assert _register(client).status_code == 409
        finally:
            _cleanup_pkg("echo-test")

    def test_delete_purges_doc_and_code(self, client):
        try:
            assert _register(client).status_code == 201
            res = client.delete("/api/handles/echo-test")
            assert res.status_code == 200
            assert client.get("/api/handles/echo-test").status_code == 404
            assert not os.path.isdir(os.path.join(srv.PACKAGES_DIR, "echo-test"))
        finally:
            _cleanup_pkg("echo-test")

    def test_scan_picks_up_manifest(self, client):
        try:
            # Register, then remove only the register doc (the manifest file
            # stays on disk — a doc delete purges the code, a store delete
            # does not), and let the scan re-import it.
            assert _register(client).status_code == 201
            srv.store.delete("echo-test")
            assert client.get("/api/handles/echo-test").status_code == 404
            res = client.post("/api/handles/scan")
            assert res.status_code == 200
            assert "echo-test" in res.get_json()["handles"]
            assert client.get("/api/handles/echo-test").status_code == 200
        finally:
            _cleanup_pkg("echo-test")


# ── runs ─────────────────────────────────────────────────────────────────────
class TestRuns:
    def test_run_hello_completed(self, client):
        res = client.post("/api/runs", json={
            "handle_id": "hello", "input": {"name": "ctes"}})
        assert res.status_code == 201
        run = res.get_json()
        assert run["status"] == "completed"
        assert run["backend"] == "subprocess"
        assert run["result"]["message"] == "hello, ctes"
        assert run["exit_code"] == 0
        assert run["handle_id"] == "hello"

    def test_run_unknown_handle(self, client):
        res = client.post("/api/runs", json={"handle_id": "nope"})
        assert res.status_code == 404

    def test_run_missing_code_conflicts(self, client):
        try:
            assert _register(client).status_code == 201
            _cleanup_pkg("echo-test")
            res = client.post("/api/runs", json={"handle_id": "echo-test"})
            assert res.status_code == 409
            assert "missing on disk" in res.get_json()["error"]
        finally:
            client.delete("/api/handles/echo-test")

    def test_run_import_failure(self, client):
        try:
            res = _register(client, id="broken-h",
                            entry_point="definitely_missing_module:run")
            assert res.status_code == 201
            run = client.post("/api/runs", json={"handle_id": "broken-h"})
            assert run.status_code == 201
            body = run.get_json()
            assert body["status"] == "failed"
            assert "cannot import" in body["error"]
            assert body["exit_code"] == 1
        finally:
            _cleanup_pkg("broken-h")
            client.delete("/api/handles/broken-h")

    def test_run_payload_invalid_json_shape(self, client):
        res = client.post("/api/runs", json={"handle_id": "hello", "input": "str"})
        assert res.status_code == 400

    def test_run_timeout(self, client):
        res = client.post("/api/runs", json={
            "handle_id": "sleepy", "input": {"seconds": 6}, "timeout_s": 1})
        assert res.status_code == 201
        run = res.get_json()
        assert run["status"] == "timed_out"
        assert run["exit_code"] is None
        assert "timed out" in run["error"]

    def test_run_history_listing_and_filters(self, client):
        client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        client.post("/api/runs", json={
            "handle_id": "sleepy", "input": {"seconds": 0}})
        res = client.get("/api/runs")
        assert res.status_code == 200
        assert len(res.get_json()) == 2
        by_handle = client.get("/api/runs?handle_id=hello").get_json()
        assert {r["handle_id"] for r in by_handle} == {"hello"}
        done = client.get("/api/runs?status=completed").get_json()
        assert len(done) == 2
        run_id = done[0]["id"]
        assert client.get(f"/api/runs/{run_id}").status_code == 200
        assert client.get("/api/runs/RUN-nonexist").status_code == 404

    def test_clear_runs(self, client):
        client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        res = client.delete("/api/runs")
        assert res.status_code == 200
        assert res.get_json()["deleted"] >= 1
        assert client.get("/api/runs").get_json() == []


# ── api index ────────────────────────────────────────────────────────────────
class TestIndex:
    def test_api_index(self, client):
        res = client.get("/api")
        assert res.status_code == 200
        data = res.get_json()
        assert data["name"].startswith("CTES")
        assert "backends" in data

    def test_plate_served(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert b"CTES" in res.data


# ── docker backend (skipped without the CLI + base image) ───────────────────
def _docker_ready():
    return srv.backends.docker_image_ready()


@pytest.mark.skipif(not _docker_ready(),
                    reason="docker CLI or python:3.12-alpine image not available")
class TestDockerBackend:
    def test_run_hello_in_container(self, client):
        res = client.post("/api/runs", json={
            "handle_id": "hello", "input": {"name": "container"},
            "backend": "docker"})
        assert res.status_code == 201
        run = res.get_json()
        assert run["backend"] == "docker"
        assert run["status"] == "completed"
        assert run["result"]["message"] == "hello, container"


# ── phase 2: handle lifecycle ────────────────────────────────────────────────
class TestHandleLifecycle:
    def test_list_includes_status_and_stats(self, client):
        data = client.get("/api/handles").get_json()
        hello = next(h for h in data if h["id"] == "hello")
        assert hello["status"] == "active"
        assert hello["code_on_disk"] is True
        assert hello["stats"]["total"] == 0

    def test_register_creates_audit_record(self, client):
        try:
            _register(client)
            audit = client.get("/api/audit?action=handle.register").get_json()
            assert len(audit) == 1
            assert audit[0]["entity_id"] == "echo-test"
            assert audit[0]["entity_type"] == "handle"
        finally:
            _cleanup_pkg("echo-test")

    def test_update_rewrites_manifest_and_audits(self, client):
        try:
            assert _register(client).status_code == 201
            res = client.put("/api/handles/echo-test", json={
                "description": "Updated description.", "timeout_s": 90})
            assert res.status_code == 200
            doc = res.get_json()
            assert doc["description"] == "Updated description."
            assert doc["timeout_s"] == 90
            manifest = json.load(open(os.path.join(
                srv.PACKAGES_DIR, "echo-test", "manifest.json"), encoding="utf-8"))
            assert manifest["description"] == "Updated description."
            audit = client.get("/api/audit?action=handle.update").get_json()
            assert len(audit) == 1
            assert "timeout_s" in audit[0]["details"]["changes"]
            res = client.put("/api/handles/echo-test", json={"timeout_s": "x"})
            assert res.status_code == 400
        finally:
            _cleanup_pkg("echo-test")

    def test_inactivate_blocks_runs_then_activate_restores(self, client):
        res = client.post("/api/handles/hello/status", json={"status": "inactive"})
        assert res.status_code == 200
        assert res.get_json()["status"] == "inactive"
        blocked = client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        assert blocked.status_code == 409
        assert "inactive" in blocked.get_json()["error"]
        res = client.post("/api/handles/hello/status", json={"status": "active"})
        assert res.get_json()["status"] == "active"
        ok = client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        assert ok.get_json()["status"] == "completed"
        actions = [e["action"] for e in
                   client.get("/api/audit?action=handle.inactivate").get_json()]
        assert "handle.inactivate" in actions
        assert client.post("/api/handles/hello/status",
                           json={"status": "sideways"}).status_code == 400

    def test_delete_purges_doc_and_code_keeps_runs(self, client):
        try:
            assert _register(client).status_code == 201
            run = client.post("/api/runs", json={"handle_id": "echo-test"})
            assert run.status_code == 201
            res = client.delete("/api/handles/echo-test")
            assert res.status_code == 200
            assert res.get_json()["files_purged"] >= 2
            assert client.get("/api/handles/echo-test").status_code == 404
            assert not os.path.isdir(os.path.join(srv.PACKAGES_DIR, "echo-test"))
            past = client.get(f"/api/runs/{run.get_json()['id']}")
            assert past.status_code == 200  # journal survives the delete
            audit = client.get("/api/audit?action=handle.delete").get_json()
            assert audit[0]["entity_id"] == "echo-test"
            assert client.delete("/api/handles/echo-test").status_code == 404
        finally:
            _cleanup_pkg("echo-test")

    def test_file_viewer_reads_and_contains(self, client):
        res = client.get("/api/handles/hello/files/main.py")
        assert res.status_code == 200
        assert "def run(payload)" in res.get_json()["content"]
        assert client.get("/api/handles/hello/files/nope.py").status_code == 404
        esc = client.get("/api/handles/hello/files/../../server.py")
        assert esc.status_code in (403, 404)
        assert client.get("/api/handles/ghost/files/main.py").status_code == 404


# ── phase 2: task specs ──────────────────────────────────────────────────────
class TestTaskSpecs:
    def _mk(self, client, **over):
        payload = {
            "objective": over.pop("objective", "Greet the operator"),
            "handler_id": over.pop("handler_id", "hello"),
            "payload": over.pop("payload", {"name": "spec"}),
            "expected_output": over.pop("expected_output", "a greeting"),
            **over,
        }
        return client.post("/api/tasks", json=payload)

    def test_create_get_list_delete(self, client):
        res = self._mk(client)
        assert res.status_code == 201
        spec = res.get_json()
        assert spec["id"].startswith("TASK-")
        assert spec["constraints"]["timeout_s"] is None  # unset → handle/settings default at emit
        got = client.get(f"/api/tasks/{spec['id']}")
        assert got.status_code == 200
        assert got.get_json()["handler"]["id"] == "hello"
        assert len(client.get("/api/tasks").get_json()) == 1
        assert client.delete(f"/api/tasks/{spec['id']}").status_code == 200
        assert client.get(f"/api/tasks/{spec['id']}").status_code == 404

    def test_create_requires_handler_and_objective(self, client):
        res = self._mk(client, handler_id="ghost")
        assert res.status_code == 400
        res = self._mk(client, objective="")
        assert res.status_code == 400
        res = client.post("/api/tasks", json={"objective": "x"})
        assert res.status_code == 400

    def test_update(self, client):
        spec = self._mk(client).get_json()
        res = client.put(f"/api/tasks/{spec['id']}", json={
            "objective": "Greet the operator loudly", "priority": "high"})
        assert res.status_code == 200
        assert res.get_json()["objective"] == "Greet the operator loudly"
        assert res.get_json()["priority"] == "high"
        assert client.put(f"/api/tasks/{spec['id']}",
                          json={"priority": "urgent"}).status_code == 400

    def test_emit_runs_and_links_spec(self, client):
        spec = self._mk(client).get_json()
        res = client.post(f"/api/tasks/{spec['id']}/emit", json={
            "payload": {"name": "emitted"}})
        assert res.status_code == 201
        run = res.get_json()
        assert run["status"] == "completed"
        assert run["task_spec_id"] == spec["id"]
        assert run["result"]["message"] == "hello, emitted"
        assert run["spec"]["objective"] == "Greet the operator"
        assert run["code_sha256"] and len(run["code_sha256"]) == 64
        assert run["code_files"] >= 2
        audit = client.get("/api/audit?action=spec.emit").get_json()
        assert len(audit) == 1

    def test_emit_async_not_implemented(self, client):
        spec = self._mk(client).get_json()
        client.put(f"/api/tasks/{spec['id']}", json={"temporal_mode": "async"})
        res = client.post(f"/api/tasks/{spec['id']}/emit")
        assert res.status_code == 501

    def test_emit_with_inactive_handler_blocked(self, client):
        spec = self._mk(client).get_json()
        client.post("/api/handles/hello/status", json={"status": "inactive"})
        res = client.post(f"/api/tasks/{spec['id']}/emit")
        assert res.status_code == 409


# ── phase 2: settings ────────────────────────────────────────────────────────
class TestSettings:
    def test_get_returns_defaults_and_env(self, client):
        res = client.get("/api/settings")
        assert res.status_code == 200
        body = res.get_json()
        assert body["settings"]["default_backend"] == "auto"
        assert body["environment"]["db"].endswith("ctes")

    def test_put_updates_and_audits(self, client):
        res = client.put("/api/settings", json={
            "default_timeout_s": 120, "default_backend": "subprocess"})
        assert res.status_code == 200
        assert res.get_json()["default_timeout_s"] == 120
        audit = client.get("/api/audit?action=settings.update").get_json()
        assert audit[0]["details"]["changes"]["default_timeout_s"]["to"] == 120

    def test_put_rejects_invalid(self, client):
        assert client.put("/api/settings",
                          json={"default_backend": "quantum"}).status_code == 400
        assert client.put("/api/settings",
                          json={"default_timeout_s": "soon"}).status_code == 400
        assert client.put("/api/settings",
                          json={"run_retention": -5}).status_code == 200  # clamped
        assert client.get("/api/settings").get_json()["settings"]["run_retention"] == 0

    def test_run_retention_prunes(self, client):
        client.put("/api/settings", json={"run_retention": 3})
        for i in range(5):
            client.post("/api/runs", json={"handle_id": "hello",
                                           "input": {"n": i}})
        runs = client.get("/api/runs?limit=200").get_json()
        assert len(runs) == 3
        inputs = sorted(r["input"]["n"] for r in runs)
        assert inputs == [2, 3, 4]  # newest kept


# ── phase 2: self monitoring + export ────────────────────────────────────────
class TestSelfAndExport:
    def test_self_blob(self, client):
        client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        res = client.get("/api/self")
        assert res.status_code == 200
        blob = res.get_json()
        assert blob["store"]["db"].endswith("ctes")
        assert blob["register"]["active"] >= 2
        assert blob["runs"]["total"] >= 1
        assert "uptime_s" in blob
        assert "default" in blob["backends"]

    def test_export_bundle(self, client):
        client.post("/api/runs", json={"handle_id": "hello", "input": {}})
        res = client.get("/api/export")
        assert res.status_code == 200
        bundle = res.get_json()
        assert any(h["id"] == "hello" for h in bundle["handles"])
        assert len(bundle["runs"]) >= 1
        assert "settings" in bundle
