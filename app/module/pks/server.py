"""
Personal Knowledge System (PKS) — the agent's knowledge substrate.

Holds two things:

* the **PKS landing plate** (``/pks/``) and its learning surfaces
  (``/pks/learn/lebrija/``);
* the **Naturgnosis Index** (``/pks/naturgnosis/``) — one universal space that
  aggregates the five Naturgnosis graph spaces (social, research, technique,
  epistemica, nature). Every node keeps the space it belongs to. The snapshot
  (``data/naturgnosis-index.json`` + layout) is immutable; node additions,
  edits, and deletions are stored as an overlay in CouchDB (``pks`` db) and
  export to Epistecnica.

Node overlay API (relative to the ``/pks`` mount):

    GET    /api/nodes/overlay         added/edited nodes + tombstones
    POST   /api/nodes                 create a node {space, name, category, layer, description, tags, x, y}
    PUT    /api/nodes/<uid>           edit a node (override base or update local)
    DELETE /api/nodes/<uid>           delete a node (remove local doc or tombstone base)
    GET    /api/nodes/export          ?format=json|md — Epistecnica hand-off
    GET    /api/health                snapshot + overlay + CouchDB status

Legacy notes API (kept for previously authored annotations):

    GET    /api/notes                 all notes; ?uid=<uid> filters one node
    POST   /api/notes                 {uid, body}
    PUT    /api/notes/<note_id>       {body}
    DELETE /api/notes/<note_id>
    GET    /api/notes/export          ?format=json|md

Run standalone:  python3 pks/server.py
Open:            http://localhost:5007
Mounted:         /pks/ by ../app.py (port 8080)
"""
import json
import os
import re
import sys
import unicodedata
import uuid
from datetime import datetime, timezone

from flask import Flask, Response, jsonify, redirect, request, send_from_directory

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(os.path.dirname(MODULE_DIR))
sys.path.insert(0, APP_DIR)

from support.storage import Store  # noqa: E402

STATIC_DIR = os.path.join(MODULE_DIR, "static")
VIEWER_DIR = os.path.join(STATIC_DIR, "naturgnosis")
DATA_DIR = os.path.join(MODULE_DIR, "data")
LEARN_DIR = os.path.join(MODULE_DIR, "learn")

GRAPH_PATH = os.path.join(DATA_DIR, "naturgnosis-index.json")
LAYOUT_PATH = os.path.join(DATA_DIR, "naturgnosis-layout.json")
SPACES = ("social", "research", "technique", "epistemica", "nature")

app = Flask(__name__, static_folder="static")


# ── snapshot ────────────────────────────────────────────────────────────────
_snapshot = None


def snapshot():
    """Load the immutable Naturgnosis snapshot once (process lifetime)."""
    global _snapshot
    if _snapshot is None:
        with open(GRAPH_PATH, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
        _snapshot = {
            "payload": payload,
            "uids": {n["uid"] for n in payload.get("nodes", [])},
            "names": {n["uid"]: n.get("name", "") for n in payload.get("nodes", [])},
            "nodes": {n["uid"]: n for n in payload.get("nodes", [])},
        }
    return _snapshot


# ── notes store (lazy: the index stays readable when CouchDB is down) ───────
_store = None
_store_error = None


def store():
    """Return (Store, None) or (None, error message). Retries after failure."""
    global _store, _store_error
    if _store is not None:
        return _store, None
    try:
        _store = Store("pks")
        _store_error = None
        return _store, None
    except Exception as exc:  # pragma: no cover - depends on deployment
        _store_error = str(exc)
        return None, f"CouchDB unavailable: {_store_error}"


def _store_or_503():
    db, err = store()
    if db is None:
        return None, (jsonify({"error": err}), 503)
    return db, None


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── node overlay helpers ────────────────────────────────────────────────────
def _slug(text, limit=80):
    """ASCII slug used to mint a uid for a new node."""
    norm = unicodedata.normalize("NFKD", text or "")
    ascii_text = norm.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    return (slug[:limit].rstrip("-") or "node")


def _norm_tags(raw):
    """Accept a list or a comma-separated string; return unique strings."""
    if isinstance(raw, str):
        raw = raw.split(",")
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        tag = str(item).strip()
        if tag and tag not in out:
            out.append(tag)
    return out[:24]


def _coord(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _overlay(db):
    """Return ({uid: node_doc}, {uid: tombstone_doc}) for the pks DB."""
    nodes, tombstones = {}, {}
    for doc in db.all():
        if doc.get("kind") == "node":
            nodes[doc["uid"]] = doc
        elif doc.get("kind") == "tombstone":
            tombstones[doc["uid"]] = doc
    return nodes, tombstones


def _base_node(uid):
    return snapshot()["nodes"].get(uid)


def _effective(uid, overlay_nodes, tombstones):
    """Base record merged with its overlay, or None when deleted/unknown."""
    if uid in tombstones:
        return None
    base = _base_node(uid)
    over = overlay_nodes.get(uid)
    if base is None and over is None:
        return None
    source = (base or over).get("source") or (base or over).get("space")
    record = {
        "uid": uid,
        "space": source,
        "name": (over or {}).get("name", (base or {}).get("name", "")),
        "category": (over or {}).get("category", (base or {}).get("category", "")),
        "layer": (over or {}).get("layer", (base or {}).get("layer", "")),
        "description": (over or {}).get("description", (base or {}).get("description", "")),
        "tags": (over or {}).get("tags", (base or {}).get("tags", [])),
        "origin": "local" if base is None else ((over or {}).get("origin") or "base"),
    }
    if base is None:
        record["x"] = (over or {}).get("x", 0)
        record["y"] = (over or {}).get("y", 0)
    return record



# ── pages ───────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/naturgnosis")
def naturgnosis_redirect():
    return redirect("/pks/naturgnosis/")


@app.route("/naturgnosis/")
def naturgnosis():
    return send_from_directory(VIEWER_DIR, "index.html")


@app.route("/naturgnosis/<path:name>")
def naturgnosis_assets(name):
    # Dotfiles are never served.
    if name.startswith(".") or "/." in name:
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(VIEWER_DIR, name)


@app.route("/learn/lebrija")
@app.route("/learn/lebrija/")
def learn_lebrija():
    return redirect("/pks/learn/lebrija/index.html")


@app.route("/learn/")
@app.route("/learn/<path:name>")
def learn(name="index.html"):
    if name.startswith(".") or "/." in name:
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(LEARN_DIR, name)


# ── snapshot data ───────────────────────────────────────────────────────────
@app.route("/data/<path:name>")
def data(name):
    if name.startswith(".") or "/." in name:
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(DATA_DIR, name)


# ── node overlay API ────────────────────────────────────────────────────────
@app.route("/api/nodes/overlay", methods=["GET"])
def node_overlay():
    db, err = _store_or_503()
    if err:
        return err
    nodes, tombstones = _overlay(db)
    return jsonify({
        "nodes": sorted(nodes.values(), key=lambda d: (d.get("space", ""), d.get("name", ""))),
        "tombstones": sorted(tombstones.values(), key=lambda d: d.get("uid", "")),
        "count": len(nodes),
        "deleted": len(tombstones),
    })


@app.route("/api/nodes", methods=["POST"])
def create_node():
    db, err = _store_or_503()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    space = str(body.get("space") or "").strip()
    name = str(body.get("name") or "").strip()
    if space not in SPACES:
        return jsonify({"error": f"unsupported space: {space or '(missing)'}"}), 400
    if not name:
        return jsonify({"error": "name is required"}), 400

    nodes, tombstones = _overlay(db)
    used = set(snapshot()["uids"]) | set(nodes) | set(tombstones)
    slug = _slug(name)
    uid = f"{space}:{slug}"
    n = 2
    while uid in used:
        uid = f"{space}:{slug}-{n}"
        n += 1

    ts = now_iso()
    doc = {
        "id": "node-" + uid,
        "kind": "node",
        "uid": uid,
        "space": space,
        "name": name,
        "category": str(body.get("category") or ""),
        "layer": str(body.get("layer") or ""),
        "description": str(body.get("description") or ""),
        "tags": _norm_tags(body.get("tags")),
        "origin": "local",
        "x": _coord(body.get("x")),
        "y": _coord(body.get("y")),
        "created_at": ts,
        "updated_at": ts,
    }
    return jsonify(db.put(doc)), 201


@app.route("/api/nodes/export", methods=["GET"])
def export_nodes():
    db, err = _store_or_503()
    if err:
        return err
    nodes, tombstones = _overlay(db)
    rows = sorted(nodes.values(), key=lambda d: (d.get("space", ""), d.get("name", "")))
    fmt = (request.args.get("format") or "json").lower()
    if fmt == "md":
        lines = ["# PKS · Naturgnosis node overlay", "",
                 f"Exported {now_iso()} — hand-off corpus for Epistecnica.", ""]
        current = None
        for node in rows:
            if node.get("space") != current:
                current = node.get("space")
                lines += ["", f"## {current}", ""]
            lines.append(f"### {node.get('name') or '(unnamed)'}")
            lines.append(f"`{node.get('uid')}` · {node.get('origin', '')}")
            if node.get("category") or node.get("layer"):
                lines.append(f"_{node.get('category', '')} · {node.get('layer', '')}_")
            if node.get("tags"):
                lines.append("Tags: " + ", ".join(node["tags"]))
            lines.append("")
            lines.append(node.get("description", "") or "")
            lines.append("")
        if tombstones:
            lines += ["", "## Deleted", ""]
            for uid in sorted(tombstones):
                lines.append(f"- `{uid}`")
        body = "\n".join(lines)
        return Response(body, mimetype="text/markdown",
                        headers={"Content-Disposition":
                                 "attachment;filename=pks-naturgnosis-nodes.md"})
    return Response(json.dumps({
        "exported_at": now_iso(),
        "nodes": rows,
        "tombstones": sorted(tombstones.values(), key=lambda d: d.get("uid", "")),
    }, ensure_ascii=False, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition":
                 "attachment;filename=pks-naturgnosis-nodes.json"})


@app.route("/api/nodes/<path:uid>", methods=["PUT"])
def update_node(uid):
    db, err = _store_or_503()
    if err:
        return err
    nodes, tombstones = _overlay(db)
    current = _effective(uid, nodes, tombstones)
    if current is None:
        return jsonify({"error": "node not found"}), 404

    body = request.get_json(silent=True) or {}
    space = str(body.get("space") or current["space"]).strip()
    if space != current["space"]:
        return jsonify({"error": "space cannot be changed"}), 400
    name = str(body.get("name", current["name"]) or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    existing = nodes.get(uid)
    doc = {
        "id": "node-" + uid,
        "kind": "node",
        "uid": uid,
        "space": current["space"],
        "name": name,
        "category": str(body.get("category", current["category"]) or ""),
        "layer": str(body.get("layer", current["layer"]) or ""),
        "description": str(body.get("description", current["description"]) or ""),
        "tags": _norm_tags(body.get("tags", current["tags"])),
        "origin": "local" if _base_node(uid) is None else "override",
        "updated_at": now_iso(),
        "created_at": (existing or {}).get("created_at") or now_iso(),
    }
    if "x" in body:
        doc["x"] = _coord(body.get("x"))
    elif existing and "x" in existing:
        doc["x"] = existing["x"]
    if "y" in body:
        doc["y"] = _coord(body.get("y"))
    elif existing and "y" in existing:
        doc["y"] = existing["y"]
    return jsonify(db.put(doc))


@app.route("/api/nodes/<path:uid>", methods=["DELETE"])
def delete_node(uid):
    db, err = _store_or_503()
    if err:
        return err
    nodes, tombstones = _overlay(db)
    if uid in tombstones:
        return jsonify({"error": "node not found"}), 404
    base = _base_node(uid)
    local = nodes.get(uid)
    if base is None and local is None:
        return jsonify({"error": "node not found"}), 404

    # Remove any annotations that pointed at the node.
    for doc in db.all():
        if str(doc.get("id", "")).startswith("note-") and doc.get("uid") == uid:
            db.delete(doc["id"])

    if base is None:
        db.delete("node-" + uid)
        return jsonify({"deleted": uid, "kind": "local"})

    # Base node: drop the override (if any) and leave a tombstone.
    db.delete("node-" + uid)
    doc = {
        "id": "tombstone-" + uid,
        "kind": "tombstone",
        "uid": uid,
        "space": base.get("source", uid.split(":", 1)[0]),
        "created_at": now_iso(),
    }
    db.put(doc)
    return jsonify({"deleted": uid, "kind": "base"})


# ── notes API ───────────────────────────────────────────────────────────────
@app.route("/api/notes", methods=["GET"])
def list_notes():
    db, err = _store_or_503()
    if err:
        return err
    uid = (request.args.get("uid") or "").strip()
    notes = [n for n in db.all() if str(n.get("id", "")).startswith("note-")]
    if uid:
        notes = [n for n in notes if n.get("uid") == uid]
    notes.sort(key=lambda n: (n.get("created_at") or "", n.get("id") or ""))
    return jsonify({"notes": notes, "count": len(notes)})


@app.route("/api/notes", methods=["POST"])
def create_note():
    db, err = _store_or_503()
    if err:
        return err
    body = request.get_json(silent=True) or {}
    uid = str(body.get("uid") or "").strip()
    text = str(body.get("body") or "").strip()
    if not uid or not text:
        return jsonify({"error": "uid and a non-empty body are required"}), 400
    if uid not in snapshot()["uids"]:
        return jsonify({"error": f"unknown node uid: {uid}"}), 404
    space = uid.split(":", 1)[0]
    if space not in SPACES:
        return jsonify({"error": f"unsupported space: {space}"}), 400
    ts = now_iso()
    doc = {
        "id": "note-" + uuid.uuid4().hex,
        "uid": uid,
        "space": space,
        "name": snapshot()["names"].get(uid, ""),
        "body": text,
        "created_at": ts,
        "updated_at": ts,
    }
    return jsonify(db.put(doc)), 201


@app.route("/api/notes/export", methods=["GET"])
def export_notes():
    db, err = _store_or_503()
    if err:
        return err
    notes = [n for n in db.all() if str(n.get("id", "")).startswith("note-")]
    notes.sort(key=lambda n: (n.get("space") or "", n.get("uid") or "",
                              n.get("created_at") or ""))
    fmt = (request.args.get("format") or "json").lower()
    if fmt == "md":
        lines = ["# PKS · Naturgnosis notes", "",
                 f"Exported {now_iso()} — hand-off corpus for Epistecnica.", ""]
        current = None
        for note in notes:
            if note.get("space") != current:
                current = note.get("space")
                lines += ["", f"## {current}", ""]
            lines.append(f"### {note.get('name') or '(unnamed)'}")
            lines.append(f"`{note.get('uid')}` · updated {note.get('updated_at', '')}")
            lines.append("")
            lines.append(note.get("body", ""))
            lines.append("")
        body = "\n".join(lines)
        return Response(body, mimetype="text/markdown",
                        headers={"Content-Disposition":
                                 "attachment;filename=pks-naturgnosis-notes.md"})
    return Response(json.dumps({"exported_at": now_iso(), "notes": notes},
                               ensure_ascii=False, indent=2),
                    mimetype="application/json",
                    headers={"Content-Disposition":
                             "attachment;filename=pks-naturgnosis-notes.json"})


@app.route("/api/notes/<note_id>", methods=["PUT"])
def update_note(note_id):
    db, err = _store_or_503()
    if err:
        return err
    existing = db.get(note_id)
    if not existing:
        return jsonify({"error": "note not found"}), 404
    body = request.get_json(silent=True) or {}
    text = str(body.get("body") or "").strip()
    if not text:
        return jsonify({"error": "body must not be empty"}), 400
    existing["body"] = text
    existing["updated_at"] = now_iso()
    return jsonify(db.put(existing))


@app.route("/api/notes/<note_id>", methods=["DELETE"])
def delete_note(note_id):
    db, err = _store_or_503()
    if err:
        return err
    if not db.delete(note_id):
        return jsonify({"error": "note not found"}), 404
    return jsonify({"deleted": note_id})


# ── health ──────────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    payload = snapshot()["payload"]
    db, err = store()
    overlay_nodes, tombstones = _overlay(db) if db is not None else ({}, {})
    notes = [n for n in db.all() if str(n.get("id", "")).startswith("note-")] if db is not None else []
    return jsonify({
        "status": "ok" if db is not None else "degraded",
        "service": "pks",
        "snapshot": payload.get("snapshot", {}),
        "counts": payload.get("counts", {}),
        "nodes": len(payload.get("nodes", [])),
        "overlay_nodes": len(overlay_nodes),
        "tombstones": len(tombstones),
        "notes": len(notes),
        "couchdb": "ok" if db is not None else err,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PKS_PORT", "5007")), debug=False)
