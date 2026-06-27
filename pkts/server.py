"""
Personal Keyword Tracking System (PKTS) — Mock API Server
Flask backend serving the mock keystroke dataset (conforming to
spec/pkts/schema.json) for the PKTS analysis web client.

Run:  python3 pkts/server.py
Open: http://localhost:5002
"""
import json, os
from flask import Flask, jsonify, request, send_from_directory, Response

app = Flask(__name__, static_folder="static")
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_keystrokes.json")


def load_dataset():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            return json.load(f)
    return {"generated_at": None, "sessions": [], "events": []}


@app.route("/api/keystrokes", methods=["GET"])
def get_keystrokes():
    data = load_dataset()
    session = request.args.get("session")
    events = data.get("events", [])
    if session:
        events = [e for e in events if e.get("session_id") == session]
    return jsonify({"generated_at": data.get("generated_at"),
                    "sessions": data.get("sessions", []), "events": events})


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    return jsonify(load_dataset().get("sessions", []))


@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    data = load_dataset()
    events = data.get("events", [])
    sessions = data.get("sessions", [])
    dwells = [e["timing"]["hold_time_ms"] for e in events if e["timing"].get("hold_time_ms") is not None]
    mean_dwell = sum(dwells) / len(dwells) if dwells else 0
    return jsonify({
        "total_keystrokes": len(events),
        "session_count": len(sessions),
        "mean_dwell_ms": round(mean_dwell, 1),
        "sessions": [{"session_id": s["session_id"], "event_count": s["event_count"]} for s in sessions],
    })


@app.route("/api/export", methods=["GET"])
def export_data():
    data = load_dataset()
    return Response(json.dumps(data, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=pkts_export.json"})


@app.route("/data/<path:path>")
def data_files(path):
    return send_from_directory(os.path.join(os.path.dirname(__file__), "data"), path)


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    d = load_dataset()
    port = int(os.environ.get("PKTS_PORT", "5001"))
    print("Personal Keyword Tracking System — Prototype Server")
    print(f"   Data: {DATA_PATH}")
    print(f"   Events: {len(d.get('events', []))} · Sessions: {len(d.get('sessions', []))}")
    app.run(debug=True, port=port, host="0.0.0.0")
