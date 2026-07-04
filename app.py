"""
Autoregia — unified application server.

A single entry point that composes every sub-system (PRS, PKTS, PTOCS, PPS,
PWOS) under path prefixes on one port. Each sub-system keeps its own Flask
app and static assets; this module loads them and mounts them via a small
WSGI dispatcher, and serves the Autoregia landing page plus a unified API
index at the root.

    /            landing page (Autoregia index)
    /api/        unified index of sub-systems
    /prs/...     Personal Recording System         (VSM System 1 — Perception)
    /pkts/...    Personal Keyword Tracking System  (Perception / audit)
    /ptocs/...   Personal Technical Object Catalog (Situation Model)
    /pps/...     Personal Policy System            (System 5 — Policy)
    /pwos/...    Personal Work Organization System (System 1 — Operations)
    /awes/...    Automated Work Execution System    (System 1 — Execution)
    /pras/...    Personal Reflection & Adaptation  (System 4 — Intelligence / Feedback)
    /asrs/...    Agent Self Representation System  (System 5 — representational substrate)

Sub-systems are not independent apps: they are functional organs of one
system, surfaced here through one router.

Run:   python3 app.py
Open:  http://localhost:8080
"""
import importlib.util
import os
import sys

from flask import Flask, jsonify, send_from_directory

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = int(os.environ.get("AUTOREGIA_PORT", "8080"))

app = Flask(__name__, static_folder=None)


# ── load each sub-system's Flask app from its server.py ─────────────────────
def _load_app(module_name, server_rel_path):
    """Import a sub-system's server.py and return its Flask ``app`` object.

    The module is registered in ``sys.modules`` before execution so that
    Flask's ``root_path`` detection resolves each tool's directory correctly
    (otherwise ``app.static_folder`` would point at the repo root).
    """
    spec = importlib.util.spec_from_file_location(
        module_name, os.path.join(ROOT, server_rel_path))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod.app


# (url-prefix, human name, server.py path). Prefixes are also baked into each
# tool's static assets, so renaming one here requires re-running the asset
# prefixing pass (see tools/prefix_assets.py).
SUBSYSTEMS = [
    ("prs", "Personal Recording System", "prs/server.py"),
    ("pkts", "Personal Keyword Tracking System", "pkts/server.py"),
    ("ptocs", "Personal Technical Object Catalog System", "ptocs/server.py"),
    ("pps", "Personal Policy System", "pps/server.py"),
    ("pwos", "Personal Work Organization System", "pwos/server.py"),
    ("awes", "Automated Work Execution System", "awes/server.py"),
    ("pras", "Personal Reflection & Adaptation System", "pras/server.py"),
    ("asrs", "Agent Self Representation System", "asrs/server.py"),
]

MOUNTS = {prefix: _load_app(f"{prefix}_server", rel)
          for prefix, _, rel in SUBSYSTEMS}


# ── root routes ─────────────────────────────────────────────────────────────
@app.route("/api/")
@app.route("/api")
def api_index():
    """Unified entry point: the catalogue of Autoregia's sub-systems."""
    return jsonify({
        "system": "Autoregia",
        "subsystems": [
            {"id": prefix, "name": name, "href": f"/{prefix}/"}
            for prefix, name, _ in SUBSYSTEMS
        ],
    })


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/about.html")
def about():
    return send_from_directory(ROOT, "about.html")

@app.route("/img/<path:filename>")
def control_loop(filename):
    return send_from_directory(ROOT, f"img/{filename}")


@app.route("/docs.html")
def docs():
    return send_from_directory(ROOT, "docs.html")


# ── WSGI dispatcher: mount each tool under /<prefix>/ ───────────────────────
class _SubsystemMount:
    """Mount sub-apps at path prefixes.

    A bare prefix (``/prs``) is redirected to ``/prs/`` so that the sub-app's
    page is served at a directory URL; this keeps any relative references
    inside the tool resolving against ``/<prefix>/``.
    """

    def __init__(self, root_wsgi, mounts):
        self.root = root_wsgi
        # Longest prefix first so a shorter prefix never shadows a longer one.
        self.mounts = sorted(mounts.items(), key=lambda kv: len(kv[0]), reverse=True)

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "") or "/"
        for prefix, sub in self.mounts:
            mount = "/" + prefix
            if path == mount:
                start_response("302 Found", [("Location", mount + "/")])
                return [b""]
            if path.startswith(mount + "/"):
                environ["SCRIPT_NAME"] = (environ.get("SCRIPT_NAME") or "") + mount
                environ["PATH_INFO"] = path[len(mount):] or "/"
                return sub(environ, start_response)
        return self.root(environ, start_response)


app.wsgi_app = _SubsystemMount(app.wsgi_app, MOUNTS)


if __name__ == "__main__":
    print("Autoregia — unified server")
    for prefix, name, _ in SUBSYSTEMS:
        print(f"   /{prefix:<7} {name}")
    print(f"   /api/    sub-system index")
    print(f"   Open: http://localhost:{DEFAULT_PORT}")
    app.run(debug=True, port=DEFAULT_PORT, host="0.0.0.0")
