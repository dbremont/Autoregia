"""
Personal Technical Object Catalog System (PTOCS) — Mock API Server.

Flask backend serving the PTOCS catalog (conforming to spec/ptocs/schema.json)
for the PTOCS web client. Implements the catalog layer (CRUD), retrieval &
navigation (search/browse), and the Statistical Overlay (analysis).

Run:   python3 ptocs/server.py
Open:  http://localhost:5003
"""
import json, os, uuid
from datetime import datetime, timezone
from collections import Counter, defaultdict
from flask import Flask, jsonify, request, send_from_directory, Response

app = Flask(__name__, static_folder="static")
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "mock_entries.json")


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_entries():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            return json.load(f)
    return []


def save_entries(entries):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w") as f:
        json.dump(entries, f, indent=2, default=str)


def _parse_ts(s):
    s = (s or "").replace("Z", "+00:00")
    return datetime.fromisoformat(s)


def _slug(name):
    return "".join(c.lower() if c.isalnum() or c == "-" else "-"
                   for c in (name or "untitled")).strip("-")


def _empty_provenance():
    return {"source_url": None, "vendor": None, "version": None,
            "license": None, "acquired_at": None}


def _matches(e, q):
    fields = ["name", "summary", "detail", "purpose", "function",
              "category", "domain", "id"]
    if any(q in (e.get(f) or "").lower() for f in fields):
        return True
    if any(q in (a or "").lower() for a in e.get("aliases", [])):
        return True
    if any(q in (k or "").lower() for k in e.get("keywords", [])):
        return True
    if any(q in (t or "").lower() for t in e.get("tags", [])):
        return True
    return False


def _score(e, q):
    score = 0
    if q in (e.get("name") or "").lower():
        score += 10
    if q in (e.get("summary") or "").lower():
        score += 6
    if q in (e.get("purpose") or "").lower():
        score += 5
    if q in (e.get("function") or "").lower():
        score += 5
    if q in (e.get("detail") or "").lower():
        score += 3
    if any(q in (a or "").lower() for a in e.get("aliases", [])):
        score += 7
    if any(q in (k or "").lower() for k in e.get("keywords", [])):
        score += 6
    if any(q in (t or "").lower() for t in e.get("tags", [])):
        score += 4
    if q in (e.get("category") or "").lower():
        score += 4
    if q in (e.get("domain") or "").lower():
        score += 3
    if q in (e.get("id") or "").lower():
        score += 8
    return score


def _apply_filters(entries, args):
    kind = args.get("kind")
    domain = args.get("domain")
    status = args.get("status")
    priority = args.get("priority")
    system = args.get("system")
    category = args.get("category")
    hosting = args.get("hosting")
    q = args.get("q", "").lower().strip()
    out = entries
    if kind:
        out = [e for e in out if e.get("object_kind") == kind]
    if domain:
        out = [e for e in out if e.get("domain") == domain]
    if status:
        out = [e for e in out if e.get("status") == status]
    if priority:
        out = [e for e in out if e.get("priority") == priority]
    if system:
        out = [e for e in out
               if e.get("strategic", {}).get("system_served") == system]
    if category:
        out = [e for e in out if e.get("category") == category]
    if hosting:
        out = [e for e in out if e.get("hosting_model") == hosting]
    if args.get("pinned", "").lower() == "true":
        out = [e for e in out if e.get("pinned", False)]
    if q:
        out = [e for e in out if _matches(e, q)]
    return out


# ── Catalog CRUD ───────────────────────────────────────────────────────────
@app.route("/api/entries", methods=["GET"])
def get_entries():
    return jsonify(_apply_filters(load_entries(), request.args))


@app.route("/api/entries/<entry_id>", methods=["GET"])
def get_entry(entry_id):
    e = next((x for x in load_entries() if x["id"] == entry_id), None)
    return jsonify(e) if e else (jsonify({"error": "Entry not found"}), 404)


@app.route("/api/entries", methods=["POST"])
def create_entry():
    data = request.get_json() or {}
    entries = load_entries()
    ts = now_iso()
    entry = {
        "id": data.get("id") or f"OBJ-{ts[:4]}-{uuid.uuid4().hex[:5].upper()}",
        "name": data.get("name", "Untitled"),
        "slug": data.get("slug") or _slug(data.get("name", "untitled")),
        "aliases": data.get("aliases", []),
        "summary": data.get("summary", ""),
        "detail": data.get("detail", ""),
        "purpose": data.get("purpose", ""),
        "function": data.get("function", ""),
        "object_kind": data.get("object_kind", "software_tool"),
        "category": data.get("category"),
        "domain": data.get("domain"),
        "keywords": data.get("keywords", []),
        "tags": data.get("tags", []),
        "provenance": data.get("provenance", _empty_provenance()),
        "status": data.get("status", "provisional"),
        "priority": data.get("priority", "medium"),
        "owner": data.get("owner", "self"),
        "pinned": bool(data.get("pinned", False)),
        "workflow_state": data.get("workflow_state", "candidate"),
        "lifecycle_state": data.get("lifecycle_state", "provisional"),
        "hosting_model": data.get("hosting_model", "local"),
        "access_model": data.get("access_model", "free"),
        "cost": data.get("cost", {"kind": "free", "currency": None,
                                  "amount": None, "period": None, "notes": None}),
        "usage": data.get("usage", {"interface": "none", "install": None,
                                    "config": None, "docs_url": None,
                                    "invocation": None}),
        "epistemic": data.get("epistemic", {"fit_confidence": "medium",
                                            "evidence_level": "anecdotal",
                                            "rating": None}),
        "strategic": data.get("strategic", {"system_served": None,
                                            "goal": None, "objective": None,
                                            "capability": None,
                                            "initiative": None}),
        "relations": data.get("relations", []),
        "annotations": data.get("annotations", []),
        "created_at": data.get("created_at", ts),
        "updated_at": ts,
        "last_used_at": data.get("last_used_at"),
    }
    entries.append(entry)
    save_entries(entries)
    return jsonify(entry), 201


@app.route("/api/entries/<entry_id>", methods=["PUT"])
def update_entry(entry_id):
    entries = load_entries()
    idx = next((i for i, e in enumerate(entries) if e["id"] == entry_id), None)
    if idx is None:
        return jsonify({"error": "Entry not found"}), 404
    data = request.get_json() or {}
    protected = {"id", "created_at"}
    entry = entries[idx]
    for k, v in data.items():
        if k in protected:
            continue
        entry[k] = v
    entry["updated_at"] = now_iso()
    save_entries(entries)
    return jsonify(entry)


@app.route("/api/entries/<entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    entries = load_entries()
    idx = next((i for i, e in enumerate(entries) if e["id"] == entry_id), None)
    if idx is None:
        return jsonify({"error": "Entry not found"}), 404
    removed = entries.pop(idx)
    save_entries(entries)
    return jsonify({"deleted": removed["id"]})


@app.route("/api/entries/<entry_id>/annotations", methods=["POST"])
def add_annotation(entry_id):
    entries = load_entries()
    e = next((x for x in entries if x["id"] == entry_id), None)
    if e is None:
        return jsonify({"error": "Entry not found"}), 404
    data = request.get_json() or {}
    ann = {
        "id": data.get("id") or f"ann-{uuid.uuid4().hex[:6]}",
        "created_at": data.get("created_at", now_iso()),
        "author": data.get("author", "self"),
        "kind": data.get("kind", "comment"),
        "text": data.get("text", ""),
        "state": data.get("state", "open"),
    }
    e.setdefault("annotations", []).append(ann)
    e["updated_at"] = now_iso()
    save_entries(entries)
    return jsonify(ann), 201


@app.route("/api/entries/<entry_id>/pin", methods=["POST"])
def toggle_pin(entry_id):
    """Toggle the `pinned` flag on an entry (promote to Dashboard quick-access)."""
    entries = load_entries()
    e = next((x for x in entries if x["id"] == entry_id), None)
    if e is None:
        return jsonify({"error": "Entry not found"}), 404
    e["pinned"] = not bool(e.get("pinned", False))
    e["updated_at"] = now_iso()
    save_entries(entries)
    return jsonify({"id": e["id"], "pinned": e["pinned"]})


@app.route("/api/entries/<entry_id>/relations", methods=["GET"])
def get_entry_relations(entry_id):
    """Resolved relationship graph for one entry (outgoing + incoming)."""
    entries = load_entries()
    e = next((x for x in entries if x["id"] == entry_id), None)
    if e is None:
        return jsonify({"error": "Entry not found"}), 404
    by_id = {x["id"]: x for x in entries}
    by_name = {x["name"].lower(): x for x in entries}

    def lookup(t):
        return by_id.get(t) or by_name.get(t.lower())

    outgoing = []
    for r in e.get("relations", []):
        tgt = lookup(r.get("target"))
        outgoing.append({
            "kind": r["kind"], "notes": r.get("notes"),
            "target_id": tgt["id"] if tgt else r.get("target"),
            "target_name": tgt["name"] if tgt else r.get("target"),
            "direction": "out",
        })
    incoming = []
    for other in entries:
        if other["id"] == entry_id:
            continue
        for r in other.get("relations", []):
            tgt = lookup(r.get("target"))
            if tgt and tgt["id"] == entry_id:
                incoming.append({
                    "kind": r["kind"], "notes": r.get("notes"),
                    "source_id": other["id"], "source_name": other["name"],
                    "direction": "in",
                })
    return jsonify({"outgoing": outgoing, "incoming": incoming})


# ── Retrieval & Navigation ─────────────────────────────────────────────────
@app.route("/api/search", methods=["GET"])
def search():
    q = request.args.get("q", "").lower().strip()
    if not q:
        return jsonify([])
    results = []
    for e in load_entries():
        score = _score(e, q)
        if score > 0:
            results.append({**e, "_score": score})
    results.sort(key=lambda x: x["_score"], reverse=True)
    return jsonify(results)


@app.route("/api/browse", methods=["GET"])
def browse():
    """Faceted counts for the browse pivot view."""
    entries = load_entries()
    dims = {
        "object_kind": Counter(e.get("object_kind", "?") for e in entries),
        "domain": Counter(e.get("domain") or "Unspecified" for e in entries),
        "category": Counter(e.get("category") or "unspecified" for e in entries),
        "status": Counter(e.get("status", "?") for e in entries),
        "priority": Counter(e.get("priority", "?") for e in entries),
        "system_served": Counter(
            e.get("strategic", {}).get("system_served") or "unassigned"
            for e in entries),
        "hosting_model": Counter(e.get("hosting_model", "?") for e in entries),
        "access_model": Counter(e.get("access_model", "?") for e in entries),
        "lifecycle_state": Counter(e.get("lifecycle_state", "?") for e in entries),
    }
    return jsonify({k: dict(v) for k, v in dims.items()})


# ── Dashboard stats ────────────────────────────────────────────────────────
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    entries = load_entries()
    total = len(entries)
    return jsonify({
        "total": total,
        "by_kind": dict(Counter(e.get("object_kind", "?") for e in entries)),
        "by_status": dict(Counter(e.get("status", "?") for e in entries)),
        "by_priority": dict(Counter(e.get("priority", "?") for e in entries)),
        "by_domain": dict(Counter(e.get("domain") or "Unspecified" for e in entries)),
        "by_system": dict(Counter(
            e.get("strategic", {}).get("system_served") or "unassigned"
            for e in entries)),
        "by_hosting": dict(Counter(e.get("hosting_model", "?") for e in entries)),
        "active": sum(1 for e in entries if e.get("status") == "active"),
        "critical": sum(1 for e in entries if e.get("priority") == "critical"),
        "with_relations": sum(1 for e in entries if e.get("relations")),
        "with_annotations": sum(1 for e in entries if e.get("annotations")),
        "pinned_count": sum(1 for e in entries if e.get("pinned", False)),
        "pinned": [{"id": e["id"], "name": e["name"],
                    "object_kind": e.get("object_kind")}
                   for e in entries if e.get("pinned", False)],
        "deprecated_retired": sum(1 for e in entries
                                  if e.get("status") in ("deprecated", "retired")),
    })


def _max_depth(depends_on):
    """Longest depends_on chain (memoized DFS)."""
    memo = {}

    def d(node, seen):
        if node in memo:
            return memo[node]
        if node in seen:
            return 0
        seen.add(node)
        children = depends_on.get(node, [])
        depth = 1 + max((d(c, seen) for c in children), default=0)
        seen.discard(node)
        memo[node] = depth
        return depth

    return max((d(n, set()) for n in depends_on), default=0)


# ── Statistical Overlay (analysis) ─────────────────────────────────────────
@app.route("/api/analysis", methods=["GET"])
def analysis():
    """The full Statistical Overlay projection over the catalog."""
    entries = load_entries()
    by_id = {e["id"]: e for e in entries}
    total = len(entries) or 1

    # Coverage & composition
    coverage = {
        "by_kind": dict(Counter(e.get("object_kind", "?") for e in entries)),
        "by_domain": dict(Counter(e.get("domain") or "Unspecified" for e in entries)),
        "by_category": dict(Counter(e.get("category") or "unspecified" for e in entries)),
        "by_system": dict(Counter(
            e.get("strategic", {}).get("system_served") or "unassigned"
            for e in entries)),
        "by_hosting": dict(Counter(e.get("hosting_model", "?") for e in entries)),
    }

    # Capability-gap analysis (capabilities with few/weak active coverage)
    cap_counts = Counter(e.get("category") for e in entries
                         if e.get("status") == "active")
    capability_gaps = [{"capability": c, "count": n}
                       for c, n in sorted(cap_counts.items(), key=lambda x: x[1])]

    # Redundancy / overlap (alternative_to & duplicates clusters)
    alt_clusters = defaultdict(set)
    for e in entries:
        for r in e.get("relations", []):
            if r["kind"] in ("alternative_to", "duplicates"):
                t = by_id.get(r["target"])
                if t:
                    alt_clusters[e["category"]].add(e["id"])
                    alt_clusters[e["category"]].add(t["id"])
    redundancy = [{"capability": c, "members": sorted(m), "size": len(m)}
                  for c, m in alt_clusters.items() if len(m) > 1]

    # Dependency graph analytics
    fan_out = {e["id"]: 0 for e in entries}
    fan_in = {e["id"]: 0 for e in entries}
    depends_on = defaultdict(list)
    for e in entries:
        deps = [r["target"] for r in e.get("relations", []) if r["kind"] == "depends_on"]
        fan_out[e["id"]] = len(deps)
        for d in deps:
            tgt = by_id.get(d)
            if tgt:
                fan_in[tgt["id"]] += 1
                depends_on[e["id"]].append(tgt["id"])
    spofs = [{"id": i, "name": by_id[i]["name"], "dependents": fan_in[i]}
             for i in sorted(fan_in, key=lambda x: fan_in[x], reverse=True)
             if fan_in[i] >= 2][:8]
    dependency = {
        "max_depth": _max_depth(depends_on),
        "fan_out": dict(fan_out), "fan_in": dict(fan_in),
        "single_points_of_failure": spofs,
    }

    # Cost exposure
    recurring = defaultdict(float)
    total_recurring = 0.0
    paid_count = 0
    for e in entries:
        c = e.get("cost", {}) or {}
        kind = c.get("kind")
        amt = c.get("amount")
        if amt and kind in ("subscription", "usage_based"):
            total_recurring += amt
            recurring[c.get("currency") or "USD"] += amt
        if kind in ("subscription", "usage_based", "paid", "one_time"):
            paid_count += 1
    cost = {
        "total_recurring": round(total_recurring, 2),
        "by_currency": {k: round(v, 2) for k, v in recurring.items()},
        "paid_count": paid_count,
        "free_count": sum(1 for e in entries
                          if (e.get("cost", {}) or {}).get("kind") == "free"),
        "by_kind": dict(Counter((e.get("cost", {}) or {}).get("kind", "free")
                                for e in entries)),
    }

    # Lifecycle / freshness
    now = datetime.now(timezone.utc)
    stale = []
    for e in entries:
        lu = e.get("last_used_at")
        if not lu:
            continue
        try:
            days_ago = (now - _parse_ts(lu)).days
        except Exception:
            days_ago = None
        if days_ago is not None and days_ago > 30 and e.get("status") == "active":
            stale.append({"id": e["id"], "name": e["name"], "days": days_ago})
    stale.sort(key=lambda x: x["days"], reverse=True)
    lifecycle = {
        "distribution": dict(Counter(e.get("lifecycle_state", "?") for e in entries)),
        "stale_active": stale[:10],
        "deprecated_backlog": sum(1 for e in entries
                                  if e.get("status") in ("deprecated", "retired", "backup")),
    }

    # Ecosystem health
    orphans = [{"id": e["id"], "name": e["name"]}
               for e in entries if not e.get("relations")]
    vendor_counts = Counter(e.get("provenance", {}).get("vendor")
                            for e in entries if e.get("provenance", {}).get("vendor"))
    license_counts = Counter(e.get("provenance", {}).get("license")
                             for e in entries if e.get("provenance", {}).get("license"))
    top_vendor_share = round(max(vendor_counts.values()) / total, 3) if vendor_counts else 0.0
    health = {
        "orphans": orphans,
        "top_vendor": vendor_counts.most_common(1)[0][0] if vendor_counts else None,
        "top_vendor_share": top_vendor_share,
        "license_concentration": dict(license_counts.most_common(5)),
        "vendor_concentration": dict(vendor_counts.most_common(5)),
    }

    # Provenance & trust
    trust = {
        "by_evidence": dict(Counter(
            e.get("epistemic", {}).get("evidence_level", "none") for e in entries)),
        "by_fit": dict(Counter(
            e.get("epistemic", {}).get("fit_confidence", "medium") for e in entries)),
        "under_validated": [
            {"id": e["id"], "name": e["name"],
             "evidence": e.get("epistemic", {}).get("evidence_level"),
             "fit": e.get("epistemic", {}).get("fit_confidence")}
            for e in entries
            if e.get("epistemic", {}).get("evidence_level") in ("none", "anecdotal")
        ],
    }

    return jsonify({
        "total": len(entries),
        "coverage": coverage,
        "capability_gaps": capability_gaps,
        "redundancy": redundancy,
        "dependency": dependency,
        "cost": cost,
        "lifecycle": lifecycle,
        "health": health,
        "trust": trust,
    })


# ── Derivative: export / import ────────────────────────────────────────────
@app.route("/api/export", methods=["GET"])
def export_data():
    entries = load_entries()
    return Response(json.dumps(entries, indent=2, default=str),
                    mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=ptocs_export.json"})


@app.route("/api/import", methods=["POST"])
def import_data():
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({"error": "Expected JSON array"}), 400
    entries = load_entries()
    existing = {e["id"] for e in entries}
    imported = 0
    for item in data:
        if item.get("id") and item["id"] not in existing:
            entries.append(item)
            existing.add(item["id"])
            imported += 1
    save_entries(entries)
    return jsonify({"imported": imported, "total": len(entries)})


# ── Static serving ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("PTOCS_PORT", "5003"))
    print("Personal Technical Object Catalog System — Prototype Server")
    print(f"   Data: {DATA_PATH}")
    print(f"   Entries: {len(load_entries())}")
    app.run(debug=True, port=port, host="0.0.0.0")
