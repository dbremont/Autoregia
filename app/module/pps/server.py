"""
Personal Policy System (PPS) — Server.

The policy documents *are* the data: a set of HTML files under ./policies/.
This server indexes them at startup (parsing <meta> tags and body text) to
provide a scored search over the corpus, and a listing for the main entry.

Run:   python3 pps/server.py
Open:  http://localhost:5004
"""
import os
import re
import html as _html
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POLICIES_DIR = os.path.join(BASE_DIR, "policies")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")

_META_RE = re.compile(r'<meta\s+name="pp-([a-z]+)"\s+content="([^"]*)"\s*/?>', re.I)
_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _first_paragraph(doc_html):
    """Fallback summary: text of the first <p> after the lede."""
    p = re.search(r"<p[^>]*>(.*?)</p>", doc_html, re.I | re.S)
    if not p:
        return ""
    return _strip_tags(p.group(1))[:200]


def _strip_tags(s):
    return _WS_RE.sub(" ", _TAG_RE.sub("", s)).strip()


def index_policies():
    """Walk ./policies/*.html and build a minimal in-memory index for search."""
    docs = []
    if not os.path.isdir(POLICIES_DIR):
        return docs
    for name in sorted(os.listdir(POLICIES_DIR)):
        if not name.endswith(".html"):
            continue
        path = os.path.join(POLICIES_DIR, name)
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        meta = dict(_META_RE.findall(raw))
        title = meta.get("title") or ""
        if not title:
            t = _TITLE_RE.search(raw)
            title = _strip_tags(t.group(1)) if t else os.path.splitext(name)[0].title()
        summary = meta.get("summary") or _first_paragraph(raw)
        tags = [t.strip() for t in meta.get("tags", "").split(",") if t.strip()]
        domain = meta.get("domain") or "General"
        body_text = _strip_tags(raw)
        slug = os.path.splitext(name)[0]
        is_charter = slug == "charter"
        docs.append({
            "path": f"/policies/{name}",
            "slug": slug,
            "name": name,
            "title": _html.unescape(title),
            "summary": _html.unescape(summary),
            "domain": domain,
            "tags": tags,
            "text": body_text,
            "is_charter": is_charter,
        })
    return docs


DOCS = index_policies()
DOCS_BY_PATH = {d["path"]: d for d in DOCS}


def _score(doc, q):
    """Score a document against a query; returns (score, snippet)."""
    ql = q.lower()
    score = 0
    if ql in doc["title"].lower():
        score += 10
    if ql in doc["domain"].lower():
        score += 3
    if any(ql in t.lower() for t in doc["tags"]):
        score += 7
    if ql in doc["summary"].lower():
        score += 6
    body = doc["text"].lower()
    if ql in body:
        score += 3
    # snippet around first match in the body
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
@app.route("/api/policies")
def api_policies():
    """Listing for the main entry (no body text — light payload)."""
    return jsonify([
        {k: d[k] for k in ("path", "slug", "title", "summary", "domain", "tags", "is_charter")}
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


@app.route("/policies/<path:filename>")
def serve_policy(filename):
    return send_from_directory(POLICIES_DIR, filename)


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(STATIC_DIR, path)
