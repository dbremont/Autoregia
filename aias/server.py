"""
Agent Intent Aid System (AIAS) — API Server.

Realizes the Intent Management stage of the control loop: maintains the
Intent Store (candidate, active, and historical intentions) and exposes the
Active Intent Set that directs planning (AOOS) and execution (AWES).

Persisted in CouchDB (db ``aias``); seeded from data/mock_intents.json on
first run against an empty database. The public API shape mirrors the other
Autoregia sub-systems.

Run:   python3 aias/server.py
Open:  http://localhost:5000
"""

import json, os, sys, uuid
from datetime import datetime, timezone
from collections import Counter

from flask import Flask, jsonify, request, send_from_directory, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store

app = Flask(__name__, static_folder="static")
SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_intents.json")
store = Store("aias", seed_paths=[SEED_PATH])


SOURCES = ["Problem", "Opportunity", "Commitment", "Request",
           "Identity", "Habit", "Curiosity"]
PRIORITIES = ["Critical", "High", "Medium", "Low"]
STATUSES = ["Generated", "Evaluated", "Selected", "Committed", "In Progress",
            "Paused", "Needs Review", "Deferred", "Blocked",
            "Completed", "Cancelled", "Superseded", "Merged"]
CONFIDENCES = ["Very Low", "Low", "Medium", "High", "Very High"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def _intent_id():
    return f"INT-{datetime.now(timezone.utc).strftime('%Y')}-{uuid.uuid4().hex[:4].upper()}"


def _normalize(data, existing=None):
    """Build/merge an intent document from request JSON."""
    doc = dict(existing) if existing else {}
    doc["description"] = data.get("description", doc.get("description", "")).strip()
    doc["source"] = data.get("source", doc.get("source", "Problem"))
    doc["priority"] = data.get("priority", doc.get("priority", "Medium"))
    doc["status"] = data.get("status", doc.get("status", "Generated"))
    doc["confidence"] = data.get("confidence", doc.get("confidence", "Medium"))
    doc["expected_value"] = data.get("expected_value", doc.get("expected_value", ""))
    doc["deadline"] = data.get("deadline", doc.get("deadline"))
    doc["owner"] = data.get("owner", doc.get("owner", "Self"))
    doc["constraints"] = data.get("constraints", doc.get("constraints", []))
    doc["dependencies"] = data.get("dependencies", doc.get("dependencies", []))
    doc["review_schedule"] = data.get("review_schedule", doc.get("review_schedule"))
    doc["termination_condition"] = data.get(
        "termination_condition", doc.get("termination_condition", ""))
    doc["notes"] = doc.get("notes", [])
    doc["updated_at"] = now_iso()
    if not existing:
        doc["id"] = data.get("id") or _intent_id()
        doc["created_at"] = doc["updated_at"]
    return doc


# ── intents CRUD ────────────────────────────────────────────────────────────
@app.route("/api/intents", methods=["GET"])
def list_intents():
    intents = store.all()
    status = request.args.get("status")
    source = request.args.get("source")
    priority = request.args.get("priority")
    q = request.args.get("q", "").lower().strip()
    out = intents
    if status:
        out = [i for i in out if i.get("status") == status]
    if source:
        out = [i for i in out if i.get("source") == source]
    if priority:
        out = [i for i in out if i.get("priority") == priority]
    if q:
        out = [i for i in out if q in i.get("description", "").lower()
               or q in i.get("expected_value", "").lower()
               or q in i.get("id", "").lower()
               or any(q in str(d).lower() for d in i.get("dependencies", []))]
    out.sort(key=lambda i: (PRIORITIES.index(i.get("priority", "Medium"))
                            if i.get("priority") in PRIORITIES else 99,
                            i.get("created_at", "")))
    return jsonify(out)


@app.route("/api/intents/<intent_id>", methods=["GET"])
def get_intent(intent_id):
    doc = store.get(intent_id)
    return jsonify(doc) if doc else (jsonify({"error": "Intent not found"}), 404)


@app.route("/api/intents", methods=["POST"])
def create_intent():
    data = request.get_json() or {}
    doc = _normalize(data)
    if not doc["description"]:
        return jsonify({"error": "description is required"}), 400
    saved = store.put(doc)
    return jsonify(saved), 201


@app.route("/api/intents/<intent_id>", methods=["PUT"])
def update_intent(intent_id):
    existing = store.get(intent_id)
    if existing is None:
        return jsonify({"error": "Intent not found"}), 404
    data = request.get_json() or {}
    prev_status = existing.get("status")
    doc = _normalize(data, existing=existing)
    saved = store.put(doc)
    # If the status changed, append an automatic revision-log entry.
    if prev_status and data.get("status") and data.get("status") != prev_status:
        _append_note(saved, kind="transition",
                     text=f"{prev_status} → {data['status']}")
        saved = store.put(saved)
    return jsonify(saved)


@app.route("/api/intents/<intent_id>", methods=["DELETE"])
def delete_intent(intent_id):
    removed = store.delete(intent_id)
    if not removed:
        return jsonify({"error": "Intent not found"}), 404
    return jsonify({"ok": True, "id": intent_id})


@app.route("/api/intents/<intent_id>/notes", methods=["POST"])
def add_note(intent_id):
    existing = store.get(intent_id)
    if existing is None:
        return jsonify({"error": "Intent not found"}), 404
    data = request.get_json() or {}
    note = _append_note(existing,
                        kind=data.get("kind", "comment"),
                        text=data.get("text", ""),
                        author=data.get("author", "Self"))
    store.put(existing)
    return jsonify(note), 201


def _append_note(doc, kind, text, author="Self"):
    note = {
        "id": f"n-{uuid.uuid4().hex[:6]}",
        "at": now_iso(),
        "author": author,
        "kind": kind,
        "text": text,
    }
    doc.setdefault("notes", []).append(note)
    doc["updated_at"] = now_iso()
    return note


# ── dashboard / search / taxonomy ───────────────────────────────────────────
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    intents = store.all()
    by_status = Counter(i.get("status", "Unknown") for i in intents)
    by_source = Counter(i.get("source", "Unknown") for i in intents)
    by_priority = Counter(i.get("priority", "Unknown") for i in intents)

    ACTIVE = {"Selected", "Committed", "In Progress"}
    active_set = [i for i in intents if i.get("status") in ACTIVE]
    triage = [i for i in intents if i.get("status") in {"Generated", "Evaluated"}]
    monitoring = [i for i in intents if i.get("status") in
                  {"Paused", "Needs Review", "Deferred", "Blocked"}]
    retrospective = [i for i in intents if i.get("status") in
                     {"Completed", "Cancelled", "Superseded", "Merged"}]

    with_deadline = [i for i in active_set if i.get("deadline")]
    return jsonify({
        "total": len(intents),
        "active": len(active_set),
        "triage": len(triage),
        "monitoring": len(monitoring),
        "retrospective": len(retrospective),
        "critical_active": sum(1 for i in active_set if i.get("priority") == "Critical"),
        "high_active": sum(1 for i in active_set if i.get("priority") == "High"),
        "with_deadline": len(with_deadline),
        "with_notes": sum(1 for i in intents if i.get("notes")),
        "by_status": dict(by_status),
        "by_source": dict(by_source),
        "by_priority": dict(by_priority),
    })


@app.route("/api/taxonomy", methods=["GET"])
def taxonomy():
    return jsonify({"sources": SOURCES, "priorities": PRIORITIES,
                    "statuses": STATUSES, "confidences": CONFIDENCES})


@app.route("/api/search", methods=["GET"])
def search_intents():
    intents = store.all()
    q = request.args.get("q", "").lower().strip()
    if not q:
        return jsonify([])
    results = []
    for i in intents:
        score = 0
        if q in i.get("description", "").lower():
            score += 10
        if q in i.get("expected_value", "").lower():
            score += 5
        if q in i.get("id", "").lower():
            score += 8
        if q in i.get("source", "").lower():
            score += 3
        if any(q in str(d).lower() for d in i.get("dependencies", [])):
            score += 4
        if score > 0:
            results.append({**i, "_score": score})
    results.sort(key=lambda x: x["_score"], reverse=True)
    return jsonify(results[:25])


@app.route("/api/export", methods=["GET"])
def export_data():
    intents = store.all()
    return Response(json.dumps(intents, indent=2, default=str),
                    mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=aias_export.json"})


@app.route("/api/import", methods=["POST"])
def import_data():
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"error": "Expected JSON array"}), 400
    imported = 0
    for item in data:
        if item.get("id") and not store.exists(item["id"]):
            store.put(item)
            imported += 1
    return jsonify({"imported": imported, "total": store.count()})


# ── static ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    print("AIAS — Agent Intent Aid System")
    app.run(debug=True, port=5000, host="0.0.0.0")
