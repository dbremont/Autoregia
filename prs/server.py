"""
Personal Recording System — API Server.

Flask backend persisting PRS records in CouchDB (db ``prs``). The public API
shape is unchanged from the earlier mock prototype; records are seeded from
data/mock_records.json on first run against an empty database.

Run:   python3 prs/server.py
Open:  http://localhost:5000
"""

import json, os, sys, uuid
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_from_directory, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store

app = Flask(__name__, static_folder="static")
SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_records.json")
store = Store("prs", seed_paths=[SEED_PATH])


def load_records():
    return store.all()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@app.route("/api/records", methods=["GET"])
def get_records():
    records = load_records()
    record_type = request.args.get("type")
    status = request.args.get("status")
    search = request.args.get("q", "").lower()
    domain = request.args.get("domain")
    filtered = records
    if record_type:
        filtered = [r for r in filtered if r.get("record_type") == record_type]
    if status:
        filtered = [r for r in filtered if r.get("status") == status]
    if domain:
        filtered = [r for r in filtered if r.get("domain") == domain]
    if search:
        filtered = [r for r in filtered if search in r.get("content", "").lower() or search in r.get("detail", "").lower() or any(search in t.lower() for t in r.get("tags", []))]
    return jsonify(filtered)


@app.route("/api/records/<record_id>", methods=["GET"])
def get_record(record_id):
    record = store.get(record_id)
    return jsonify(record) if record else (jsonify({"error": "Record not found"}), 404)


@app.route("/api/records", methods=["POST"])
def create_record():
    data = request.get_json()
    now = now_iso()
    record = {
        "id": data.get("id", f"REC-{now[:4]}-{uuid.uuid4().hex[:5]}"),
        "record_type": data.get("record_type", "Idea"),
        "state_class": data.get("state_class", "Internal Cognitive"),
        "content": data.get("content", ""),
        "detail": data.get("detail", ""),
        "created_at": now, "updated_at": now,
        "status": data.get("status", "Draft"),
        "priority": data.get("priority", "Medium"),
        "confidence": data.get("confidence", "Medium"),
        "evidence_level": data.get("evidence_level", "Anecdotal"),
        "source_type": data.get("source_type", "Personal Memory"),
        "domain": data.get("domain", "General"),
        "subject": data.get("subject", ""),
        "tags": data.get("tags", []),
        "project": data.get("project"),
        "owner": data.get("owner", "Self"),
        "horizon": data.get("horizon", "Short-term"),
        "relevance": data.get("relevance", "Current"),
        "verification_status": data.get("verification_status", "Unverified"),
        "workflow_state": data.get("workflow_state", "Planned"),
        "recurrence": data.get("recurrence", "None"),
        "validity": data.get("validity", "Temporary"),
        "deadline": data.get("deadline"),
        "annotations": [], "links": data.get("links", []),
    }
    saved = store.put(record)
    return jsonify(saved), 201


@app.route("/api/records/<record_id>", methods=["PUT"])
def update_record(record_id):
    record = store.get(record_id)
    if record is None:
        return jsonify({"error": "Record not found"}), 404
    data = request.get_json()
    record.update(data)
    record["updated_at"] = now_iso()
    saved = store.put(record)
    return jsonify(saved)


@app.route("/api/records/<record_id>/annotations", methods=["POST"])
def add_annotation(record_id):
    record = store.get(record_id)
    if record is None:
        return jsonify({"error": "Record not found"}), 404
    data = request.get_json()
    annotation = {"id": f"ann-{uuid.uuid4().hex[:6]}", "created_at": now_iso(), "author": data.get("author", "Self"), "kind": data.get("kind", "comment"), "text": data.get("text", ""), "state": "active"}
    record.setdefault("annotations", []).append(annotation)
    record["updated_at"] = now_iso()
    store.put(record)
    return jsonify(annotation), 201


from collections import Counter

@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    records = load_records()
    type_counts = Counter(r.get("record_type", "Unknown") for r in records)
    status_counts = Counter(r.get("status", "Unknown") for r in records)
    priority_counts = Counter(r.get("priority", "Unknown") for r in records)
    domain_counts = Counter(r.get("domain", "Unknown") for r in records)
    total = len(records)
    activity_months = {}
    for r in records:
        month = r.get("created_at", "")[:7]
        if month: activity_months[month] = activity_months.get(month, 0) + 1
    return jsonify({"total_records": total, "by_type": dict(type_counts), "by_status": dict(status_counts), "by_priority": dict(priority_counts), "by_domain": dict(domain_counts), "with_deadlines": sum(1 for r in records if r.get("deadline")), "with_annotations": sum(1 for r in records if r.get("annotations")), "with_links": sum(1 for r in records if r.get("links")), "activity_by_month": dict(sorted(activity_months.items()))})


@app.route("/api/search", methods=["GET"])
def search_records():
    records = load_records()
    q = request.args.get("q", "").lower().strip()
    if not q: return jsonify([])
    results = []
    for r in records:
        score = 0
        if q in r.get("content", "").lower(): score += 10
        if q in r.get("detail", "").lower(): score += 5
        for t in r.get("tags", []):
            if q in t.lower(): score += 7
        if q in r.get("subject", "").lower(): score += 3
        if q in r.get("domain", "").lower(): score += 2
        if q in r.get("record_type", "").lower(): score += 2
        if q in r.get("id", "").lower(): score += 8
        if score > 0: results.append({**r, "_search_score": score})
    results.sort(key=lambda x: x["_search_score"], reverse=True)
    return jsonify(results)


@app.route("/api/export", methods=["GET"])
def export_data():
    records = load_records()
    response = Response(json.dumps(records, indent=2, default=str), mimetype="application/json", headers={"Content-Disposition": "attachment;filename=prs_export.json"})
    return response


@app.route("/api/import", methods=["POST"])
def import_data():
    data = request.get_json()
    if isinstance(data, list):
        imported = 0
        for item in data:
            if item.get("id") and not store.exists(item["id"]):
                store.put(item)
                imported += 1
        return jsonify({"imported": imported, "total": store.count()})
    return jsonify({"error": "Expected JSON array"}), 400


@app.route("/")
def index(): return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path): return send_from_directory(app.static_folder, path)
