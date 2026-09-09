"""
The Loop — Autoregia Control-Loop Dashboard (Mock API + static host)

A read-only whole-PVSM analytical surface: it composes the substance of
every cooperating organ (PRS records, AOOS actions/sessions, AWES
executions, PRAS deliberations, the PEB event stream, ASRS consistency,
and the agent's essential variables) into the indicators that only exist
at the level of the *entire* control loop (cycle-time, closed-loop ratio,
cascade traceability, coordination health, viability balance, …).

The dataset is a deterministic mock (loop/data/gen_mock.py). The server
serves the raw substrate plus a few convenience aggregates; every
indicator is derived client-side in static/js/store.js so the window
selector is instant. Posture: read-only (S3* Audit / S4 Intelligence).

Run (standalone):  python3 loop/server.py
Open:              http://localhost:5006
Mounted (unified): served under /loop/ by ../app.py  (port 8080)
"""
import json, os
from flask import Flask, jsonify, send_from_directory, Response, request

app = Flask(__name__, static_folder="static")
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_loop.json")


def load_dataset():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            return json.load(f)
    return {"generated_at": None, "records": [], "actions": [], "sessions": [],
            "executions": [], "deliberations": [], "chains": [], "events": [],
            "essential_variables": [], "consistency_violations": [], "orgs": {},
            "vsm_levels": [], "window": {}}


def _counts(d):
    """Headline counts for the dataset (window-agnostic summary)."""
    return {
        "records": len(d.get("records", [])),
        "actions": len(d.get("actions", [])),
        "sessions": len(d.get("sessions", [])),
        "executions": len(d.get("executions", [])),
        "deliberations": len(d.get("deliberations", [])),
        "chains": len(d.get("chains", [])),
        "events": len(d.get("events", [])),
        "closed_chains": sum(1 for c in d.get("chains", []) if c.get("closed")),
    }


@app.route("/api/dataset", methods=["GET"])
def get_dataset():
    """The full raw substrate — every indicator is computed from this."""
    d = load_dataset()
    return jsonify(d)


@app.route("/api/summary", methods=["GET"])
def get_summary():
    """Headline counts + window metadata (convenience for the header)."""
    d = load_dataset()
    return jsonify({"generated_at": d.get("generated_at"),
                    "window": d.get("window", {}),
                    "counts": _counts(d),
                    "orgs": d.get("orgs", {})})


@app.route("/api/orgs", methods=["GET"])
def get_orgs():
    return jsonify(load_dataset().get("orgs", {}))


@app.route("/api/export", methods=["GET"])
def export_data():
    d = load_dataset()
    return Response(json.dumps(d, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=loop_export.json"})


@app.route("/data/<path:path>")
def data_files(path):
    return send_from_directory(os.path.join(os.path.dirname(__file__), "data"), path)


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


DEFAULT_PORT = int(os.environ.get("LOOP_PORT", "5006"))

if __name__ == "__main__":
    print("The Loop — Autoregia Control-Loop Dashboard (mock data)")
    print(f"   dataset: {DATA_PATH}")
    print(f"   Open: http://localhost:{DEFAULT_PORT}")
    app.run(debug=True, port=DEFAULT_PORT, host="0.0.0.0")
