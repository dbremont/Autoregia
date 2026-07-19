"""Personal External Observation System (PEOS) — API Server.

A perception sub-system that collects what *other agents* say about the world
from free public feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT) and
persists each item in CouchDB (db ``peos``) as an ``observational`` event —
the PWMS event-type defined as "a reading the agent actively takes".

Three document kinds live in the same store, discriminated by ``doc_type``:

* ``topic``        — a watched query (managed at runtime via the API)
* ``observation``  — one collected item (written by ``/api/ingest`` or poll)
* ``state``        — per-topic poll cursor (last fetched/observed, last error)

The :mod:`peos.collector` daemon is a separate process that drives polling via
this HTTP API, so only the server process touches CouchDB.

Mounted under ``/peos/`` by the unified dispatcher (``app.py``).

Run:   python3 app.py                       (unified dispatcher, port 8080)
       python3 peos/collector.py            (poller daemon — second terminal)
Open:  http://localhost:8080/peos/
"""
import json
import os
import sys
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store, StoreError

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from peos import analytics, clustering
from peos.sources import SOURCE_META, SOURCE_REGISTRY
from peos.sources.base import Topic, now_ms, obs_id, slugify

app = Flask(__name__, static_folder="static")
_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SEED_PATH = os.path.join(_DATA_DIR, "mock_topics.json")
NITTER_SEED_PATH = os.path.join(_DATA_DIR, "nitter_handles.json")
with open(os.path.join(_DATA_DIR, "vader.json"), "r", encoding="utf-8") as _fh:
    VADER = json.load(_fh)
with open(os.path.join(_DATA_DIR, "stopwords-en.json"), "r", encoding="utf-8") as _fh:
    STOPWORDS = json.load(_fh)
store = Store("peos", seed_paths=[SEED_PATH, NITTER_SEED_PATH])
CLUSTERS_DOC_ID = "CLUSTERS-current"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _topic_doc_id(topic_id: str) -> str:
    return f"TOPIC-{topic_id}"


def _state_doc_id(topic_id: str) -> str:
    return f"STATE-{topic_id}"


def _all_topics() -> list[dict]:
    return [d for d in store.all() if d.get("doc_type") == "topic"]


def _write_observations(docs: list[dict]) -> tuple[int, int]:
    """Persist observation docs, merging duplicate items (union of topic tags).

    Returns ``(newly_written, merged_into_existing)``.
    """
    written = merged = 0
    for d in docs:
        doc_id = d.get("id") or obs_id(d["source"], d["native_id"])
        existing = store.get(doc_id)
        if existing:
            existing["topics"] = list(dict.fromkeys(
                (existing.get("topics") or []) + (d.get("topics") or [])
            ))
            # keep the richer body / a missing title
            if d.get("body") and len(d["body"]) > len(existing.get("body") or ""):
                existing["body"] = d["body"]
            if d.get("title") and not existing.get("title"):
                existing["title"] = d["title"]
            store.put(existing)
            merged += 1
        else:
            d = dict(d)
            d["id"] = doc_id
            d["doc_type"] = "observation"
            d["event_type"] = "observational"
            store.put(d)
            written += 1
    return written, merged


# ── health & catalogue ───────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    try:
        return jsonify({
            "ok": True,
            "db": store.db_name,
            "docs": store.count(),
            "sources": [s["name"] for s in SOURCE_META],
        })
    except StoreError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.route("/api/sources")
def sources():
    return jsonify(SOURCE_META)


# ── topics: runtime CRUD (the configured "tools" the agent watches) ─────────
@app.route("/api/topics", methods=["GET"])
def get_topics():
    topics = _all_topics()
    if request.args.get("enabled") in ("1", "true", "True"):
        topics = [t for t in topics if t.get("enabled", True)]
    topics.sort(key=lambda t: (t.get("source", ""), t.get("topic_id", "")))
    return jsonify(topics)


@app.route("/api/topics", methods=["POST"])
def create_topic():
    data = request.get_json(silent=True) or {}
    source = (data.get("source") or "").strip()
    query = (data.get("query") or "").strip()
    if source not in SOURCE_REGISTRY:
        return jsonify({"error": f"unknown source '{source}'",
                        "known": list(SOURCE_REGISTRY)}), 400
    if not query:
        return jsonify({"error": "query is required"}), 400
    topic_id = (data.get("topic_id") or slugify(f"{source}-{query}"))[:60]
    doc_id = _topic_doc_id(topic_id)
    if store.exists(doc_id):
        return jsonify({"error": "topic already exists", "topic_id": topic_id}), 409
    doc = {
        "id": doc_id,
        "doc_type": "topic",
        "topic_id": topic_id,
        "source": source,
        "query": query,
        "interval_s": int(data.get("interval_s") or 0),
        "enabled": bool(data.get("enabled", True)),
        "note": data.get("note", ""),
        "created_at": now_iso(),
    }
    return jsonify(store.put(doc)), 201


@app.route("/api/topics/<topic_id>", methods=["PATCH"])
def update_topic(topic_id):
    doc = store.get(_topic_doc_id(topic_id))
    if not doc:
        return jsonify({"error": "topic not found"}), 404
    data = request.get_json(silent=True) or {}
    for key in ("query", "interval_s", "enabled", "note"):
        if key in data:
            doc[key] = data[key]
    return jsonify(store.put(doc))


@app.route("/api/topics/<topic_id>", methods=["DELETE"])
def delete_topic(topic_id):
    doc_id = _topic_doc_id(topic_id)
    if not store.exists(doc_id):
        return jsonify({"error": "topic not found"}), 404
    store.delete(doc_id)
    if store.exists(_state_doc_id(topic_id)):
        store.delete(_state_doc_id(topic_id))
    return jsonify({"deleted": topic_id})


# ── observations: read ───────────────────────────────────────────────────────
@app.route("/api/observations", methods=["GET"])
def get_observations():
    source = request.args.get("source")
    topic = request.args.get("topic")
    cluster = request.args.get("cluster")
    since_ms = request.args.get("since_ms")
    q = request.args.get("q", "").lower().strip()
    try:
        limit = min(int(request.args.get("limit") or 200), 1000)
    except ValueError:
        limit = 200

    docs = [d for d in store.all() if d.get("doc_type") == "observation"]
    if source:
        docs = [d for d in docs if d.get("source") == source]
    if cluster:
        cmap = _clusters_doc().get("assignments", {})
        docs = [d for d in docs
                if (cmap.get(d.get("id"), {}).get("cluster_id") == cluster)]
    if topic:
        docs = [d for d in docs if topic in (d.get("topics") or [])]
    if since_ms:
        try:
            cut = int(since_ms)
            docs = [d for d in docs if (d.get("observed_at_ms") or 0) >= cut]
        except ValueError:
            pass
    if q:
        docs = [d for d in docs
                if q in (d.get("title", "") + d.get("body", "")
                         + d.get("author", "")).lower()]
    docs.sort(key=lambda d: d.get("observed_at_ms") or 0, reverse=True)
    return jsonify(docs[:limit])


# ── observations: write (collector -> store) ─────────────────────────────────
@app.route("/api/ingest", methods=["POST"])
def ingest():
    data = request.get_json(silent=True) or {}
    observations = data.get("observations")
    if not isinstance(observations, list):
        return jsonify({"error": "body must contain an observations[] array"}), 400
    written, merged = _write_observations(observations)
    return jsonify({"written": written, "merged": merged,
                    "total": len(observations)}), 202


# ── poll cursors ─────────────────────────────────────────────────────────────
@app.route("/api/state", methods=["GET"])
def get_state():
    states = [d for d in store.all() if d.get("doc_type") == "state"]
    topic = request.args.get("topic")
    if topic:
        states = [s for s in states if s.get("topic_id") == topic]
    return jsonify(states)


@app.route("/api/state", methods=["POST"])
def upsert_state():
    data = request.get_json(silent=True) or {}
    topic_id = data.get("topic_id")
    if not topic_id:
        return jsonify({"error": "topic_id required"}), 400
    doc_id = _state_doc_id(topic_id)
    doc = store.get(doc_id) or {
        "id": doc_id, "doc_type": "state", "topic_id": topic_id,
    }
    for key in ("last_fetched_ms", "last_observed_ms", "last_error",
                "error_count", "fetched_count"):
        if key in data:
            doc[key] = data[key]
    store.put(doc)
    return jsonify(store.get(doc_id)), 202


# ── on-demand / daemon-driven poll ───────────────────────────────────────────
def poll_one(topic_doc: dict) -> dict:
    """Poll a single topic now, write observations + update its state cursor.

    Honours the per-topic interval (returns ``skipped`` when not yet due) so a
    daemon can simply call this for every enabled topic each sweep.
    """
    topic = Topic.from_doc(topic_doc)
    src = SOURCE_REGISTRY.get(topic.source)
    if src is None:
        return {"topic_id": topic.topic_id, "error": f"unknown source '{topic.source}'"}

    interval = topic.interval_s or src.default_interval_s
    state_id = _state_doc_id(topic.topic_id)
    state = store.get(state_id) or {
        "id": state_id, "doc_type": "state", "topic_id": topic.topic_id,
    }
    cur_ms = now_ms()
    last_fetched = state.get("last_fetched_ms") or 0
    if cur_ms - last_fetched < interval * 1000:
        return {"topic_id": topic.topic_id, "source": topic.source,
                "skipped": "not due",
                "next_in_s": max(0, interval - (cur_ms - last_fetched) // 1000)}

    since_ms = state.get("last_observed_ms") or None
    try:
        observations = src.poll(topic, since_ms)
    except Exception as exc:  # transport / parse error → record + back off
        state["last_fetched_ms"] = cur_ms
        state["last_error"] = str(exc)
        state["error_count"] = (state.get("error_count") or 0) + 1
        store.put(state)
        return {"topic_id": topic.topic_id, "source": topic.source,
                "error": str(exc)}

    docs = [ob.to_doc() for ob in observations]
    written, merged = _write_observations(docs)

    max_obs = state.get("last_observed_ms") or 0
    for d in docs:
        if (d.get("observed_at_ms") or 0) > max_obs:
            max_obs = d["observed_at_ms"]
    state["last_fetched_ms"] = cur_ms
    state["last_error"] = None
    state["error_count"] = 0
    state["fetched_count"] = (state.get("fetched_count") or 0) + 1
    if max_obs:
        state["last_observed_ms"] = max_obs
    store.put(state)
    return {"topic_id": topic.topic_id, "source": topic.source,
            "fetched": len(docs), "written": written, "merged": merged}


@app.route("/api/poll", methods=["POST"])
def poll():
    """Poll a single topic. Body: ``{"topic_id": "...", "force": false}``.

    ``force`` bypasses the interval gate by zeroing the cursor's
    ``last_fetched_ms`` for this one call.
    """
    data = request.get_json(silent=True) or {}
    topic_id = data.get("topic_id")
    topic_doc = store.get(_topic_doc_id(topic_id)) if topic_id else None
    if not topic_doc:
        return jsonify({"error": "topic not found"}), 404
    if data.get("force"):
        state_id = _state_doc_id(topic_id)
        state = store.get(state_id)
        if state:
            state["last_fetched_ms"] = 0
            store.put(state)
    return jsonify(poll_one(topic_doc))


# ── clusters: batch topic clustering ──────────────────────────────────────────
def _clusters_doc() -> dict:
    return store.get(CLUSTERS_DOC_ID) or {
        "id": CLUSTERS_DOC_ID, "doc_type": "clusters",
        "assignments": {}, "meta": {"backend": "none", "k": 0, "updated_at_ms": 0},
    }


@app.route("/api/clusters", methods=["GET"])
def get_clusters():
    cd = _clusters_doc()
    return jsonify({"meta": cd.get("meta", {}),
                    "k": len({a.get("cluster_id") for a in cd.get("assignments", {}).values()}),
                    "assignments": cd.get("assignments", {})})


@app.route("/api/cluster", methods=["POST"])
def recompute_clusters():
    """Recompute topic clusters over the whole corpus (batch; may take a few
    seconds the first time while the embedding model downloads)."""
    k = request.get_json(silent=True) or {}
    obs = [d for d in store.all() if d.get("doc_type") == "observation"]
    result = clustering.compute_clusters(obs, k=k.get("k"))
    doc = {
        "id": CLUSTERS_DOC_ID, "doc_type": "clusters",
        "assignments": result["assignments"], "meta": result["meta"],
    }
    store.put(doc)
    return jsonify({"ok": True, **result["meta"],
                    "assigned": len(result["assignments"])}), 202


# ── analytics: the sense-making blob ─────────────────────────────────────────
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    obs = [d for d in store.all() if d.get("doc_type") == "observation"]
    # time window
    try:
        window_h = float(request.args.get("hours", "0"))
    except ValueError:
        window_h = 0
    if window_h > 0:
        cut = now_ms() - int(window_h * 3_600_000)
        obs = [o for o in obs if (o.get("observed_at_ms") or 0) >= cut]
    topic = request.args.get("topic")
    if topic:
        obs = [o for o in obs if topic in (o.get("topics") or [])]
    assignments = _clusters_doc().get("assignments", {})
    blob = analytics.compute(obs, VADER, cluster_assignments=assignments)
    return jsonify(blob)


@app.route("/api/lexicon", methods=["GET"])
def get_lexicon():
    """Stopwords + VADER lexicon (single source of truth, served to the browser)."""
    return jsonify({"stopwords": STOPWORDS, "vader": VADER})


# ── dashboard ────────────────────────────────────────────────────────────────
@app.route("/api/dashboard/stats")
def stats():
    docs = store.all()
    obs = [d for d in docs if d.get("doc_type") == "observation"]
    topics = [d for d in docs if d.get("doc_type") == "topic"]
    by_source: dict[str, int] = {}
    for o in obs:
        by_source[o.get("source", "?")] = by_source.get(o.get("source", "?"), 0) + 1
    latest = max((o.get("observed_at_ms") or 0) for o in obs) if obs else 0
    return jsonify({
        "observations": len(obs),
        "topics": len(topics),
        "topics_enabled": sum(1 for t in topics if t.get("enabled", True)),
        "by_source": by_source,
        "latest_observed_ms": latest,
    })


@app.route("/api/export", methods=["GET"])
def export_data():
    docs = store.all()
    obs = [d for d in docs if d.get("doc_type") == "observation"]
    obs.sort(key=lambda d: d.get("observed_at_ms") or 0, reverse=True)
    return jsonify({
        "generated_at": now_iso(),
        "topics": _all_topics(),
        "observations": obs,
    })


# ── UI ───────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5010, debug=True)
