"""
Personal Reflection & Adaptation System (PRAS) — Server.

The deliberations *are* the data: a set of HTML files under ./deliberations/.
This server indexes them at startup (parsing <meta name="pra-*"> tags and body
text) to provide a scored search over the corpus, and a listing for the main
entry. Mirrors the PPS "documents-as-data" model.

Within Autoregia, PRAS is the Feedback / Intelligence (VSM S4) component: its
deliberations mature along open -> concluded -> enacted, and at enactment they
feed the policy system (PPS) and the other sub-systems.

Run (standalone):  python3 pras/server.py
Open:              http://localhost:5006
Under app.py:      mounted at /pras/  (http://localhost:8080/pras/)
"""
import os
import re
import html as _html
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DELIB_DIR = os.path.join(BASE_DIR, "deliberations")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")

_META_RE = re.compile(r'<meta\s+name="pra-([a-z]+)"\s+content="([^"]*)"\s*/?>', re.I)
_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _first_paragraph(doc_html):
    p = re.search(r"<p[^>]*>(.*?)</p>", doc_html, re.I | re.S)
    if not p:
        return ""
    return _strip_tags(p.group(1))[:240]


def _strip_tags(s):
    return _WS_RE.sub(" ", _TAG_RE.sub("", s)).strip()


def index_deliberations():
    """Walk ./deliberations/*.html and build an in-memory index for search."""
    docs = []
    if not os.path.isdir(DELIB_DIR):
        return docs
    for name in sorted(os.listdir(DELIB_DIR)):
        if not name.endswith(".html"):
            continue
        path = os.path.join(DELIB_DIR, name)
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        meta = dict(_META_RE.findall(raw))
        title = meta.get("title") or ""
        if not title:
            t = _TITLE_RE.search(raw)
            title = _strip_tags(t.group(1)) if t else os.path.splitext(name)[0].title()
        summary = meta.get("summary") or _first_paragraph(raw)
        tags = [t.strip() for t in meta.get("tags", "").split(",") if t.strip()]
        feeds = [s.strip() for s in meta.get("feeds", "").split(",") if s.strip()]
        slug = os.path.splitext(name)[0]
        docs.append({
            "path": f"/deliberations/{name}",
            "slug": slug,
            "name": name,
            "title": _html.unescape(title),
            "summary": _html.unescape(summary),
            "domain": meta.get("domain") or "General",
            "type": meta.get("type") or "reflection",
            "status": meta.get("status") or "open",
            "date": meta.get("date") or "",
            "tags": tags,
            "feeds": feeds,
            "text": _strip_tags(raw),
            "is_practice": slug == "practice",
        })
    return docs


DOCS = index_deliberations()
DOCS_BY_PATH = {d["path"]: d for d in DOCS}

_STATUS_ORDER = {"open": 0, "concluded": 1, "enacted": 2, "superseded": 3}


def _score(doc, q):
    ql = q.lower()
    score = 0
    if ql in doc["title"].lower():
        score += 10
    if ql in doc["domain"].lower():
        score += 3
    if ql in doc["type"].lower():
        score += 4
    if ql in doc["status"].lower():
        score += 4
    if any(ql in t.lower() for t in doc["tags"]):
        score += 7
    if ql in doc["summary"].lower():
        score += 6
    body = doc["text"].lower()
    if ql in body:
        score += 3
    snippet = doc["summary"]
    idx = body.find(ql)
    if idx >= 0:
        start = max(0, idx - 60)
        end = min(len(doc["text"]), idx + len(q) + 80)
        snip = doc["text"][start:end].strip()
        prefix = "…" if start > 0 else ""
        suffix = "…" if end < len(doc["text"]) else ""
        snippet = prefix + snip + suffix
    return score, snippet


# ── API ────────────────────────────────────────────────────────────────────
@app.route("/api/deliberations")
def api_deliberations():
    """Listing for the main entry (no body text — light payload)."""
    return jsonify([
        {k: d[k] for k in ("path", "slug", "title", "summary", "domain",
                           "type", "status", "date", "tags", "feeds", "is_practice")}
        for d in DOCS
    ])


@app.route("/api/search")
def api_search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"query": "", "results": []})
    results = []
    for d in DOCS:
        score, snippet = _score(d, q)
        if score > 0:
            results.append({
                "path": d["path"],
                "title": d["title"],
                "domain": d["domain"],
                "type": d["type"],
                "status": d["status"],
                "tags": d["tags"],
                "snippet": snippet,
                "score": score,
            })
    results.sort(key=lambda r: r["score"], reverse=True)
    return jsonify({"query": q, "count": len(results), "results": results})


# ── Pages ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/deliberations/<path:filename>")
def serve_deliberation(filename):
    return send_from_directory(DELIB_DIR, filename)


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(STATIC_DIR, path)


if __name__ == "__main__":
    print("Personal Reflection & Adaptation System (PRAS)")
    print(f"  indexed {len(DOCS)} deliberation(s)")
    app.run(debug=True, port=5006)
