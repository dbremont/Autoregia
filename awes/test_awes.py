"""Tests for AWES — Automated Work Execution System."""
import json
import pytest
from server import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

class TestEnvironments:
    def test_list_environments(self, client):
        res = client.get("/api/environments")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert isinstance(data, list)
        assert len(data) >= 2
        ids = [e["env_id"] for e in data]
        assert "ENV-SHELL-001" in ids
        assert "ENV-PYTHON-001" in ids

    def test_get_environment(self, client):
        res = client.get("/api/environments/ENV-SHELL-001")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["env_id"] == "ENV-SHELL-001"
        assert data["env_type"] == "shell"

    def test_get_environment_not_found(self, client):
        res = client.get("/api/environments/ENV-NONEXIST")
        assert res.status_code == 404

    def test_register_environment(self, client):
        res = client.post("/api/environments", json={
            "name": "Node.js",
            "env_type": "shell",
            "runtime": "node",
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["name"] == "Node.js"
        assert data["env_type"] == "shell"
        assert data["status"] == "ready"

class TestExecute:
    def test_execute_shell_command_success(self, client):
        res = client.post("/api/execute", json={
            "payload": "echo hello",
            "work_type": "command",
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["status"] == "completed"
        assert data["exit_code"] == 0
        assert "hello" in data["stdout"]

    def test_execute_shell_command_failure(self, client):
        res = client.post("/api/execute", json={
            "payload": "exit 42",
            "work_type": "command",
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["status"] == "failed"
        assert data["exit_code"] == 42

    def test_execute_python_script(self, client):
        res = client.post("/api/execute", json={
            "payload": "print(2 + 2)",
            "work_type": "python",
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["status"] == "completed"
        assert "4" in data["stdout"]

    def test_execute_empty_payload(self, client):
        res = client.post("/api/execute", json={
            "payload": "",
        })
        assert res.status_code == 400

    def test_execute_timeout(self, client):
        res = client.post("/api/execute", json={
            "payload": "sleep 10",
            "work_type": "command",
            "timeout_s": 1,
        })
        assert res.status_code == 201
        data = json.loads(res.data)
        assert data["status"] == "timed_out"

    def test_execute_nonexistent_environment(self, client):
        res = client.post("/api/execute", json={
            "payload": "echo hello",
            "env_id": "ENV-NONEXIST",
        })
        assert res.status_code == 400

class TestSessions:
    def test_list_sessions(self, client):
        client.post("/api/execute", json={"payload": "echo test"})
        res = client.get("/api/sessions")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert len(data) >= 1

    def test_get_session(self, client):
        exec_res = client.post("/api/execute", json={"payload": "echo getme"})
        session_id = json.loads(exec_res.data)["session_id"]
        res = client.get(f"/api/sessions/{session_id}")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert data["session_id"] == session_id

    def test_get_session_not_found(self, client):
        res = client.get("/api/sessions/EXE-NONEXIST")
        assert res.status_code == 404

    def test_clear_sessions(self, client):
        client.post("/api/execute", json={"payload": "echo clear"})
        res = client.delete("/api/sessions")
        assert res.status_code == 200
        res2 = client.get("/api/sessions")
        data = json.loads(res2.data)
        assert len(data) == 0

class TestAPIIndex:
    def test_api_index(self, client):
        res = client.get("/api")
        assert res.status_code == 200
        data = json.loads(res.data)
        assert "AWES" in data["name"]
