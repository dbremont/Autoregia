"""
Agent Toolbox Ecosystem (ATE) — the tools an agent uses to get work done.

Each tool provides a specific capability, extending what the agent can
accomplish. ATE is not an organ of the control loop itself: it is the
toolbox the agent opens when work must actually be done. Each tool is a
complete Flask sub-app that lives in ``tool/<id>/`` and is mounted here under
``/tool/<id>/``; the unified server (``app/app.py``) mounts ATE at
``/ate/``, so a tool's final URLs are ``/ate/tool/<id>/...``.

    /ate/               toolbox index (plate listing the tools)
    /ate/api/tools      machine-readable tool registry
    /ate/tool/awes/...  Automated Work Execution System

Adding a tool: create ``tool/<id>/`` with a ``server.py`` exposing a Flask
``app``, then add one entry to ``TOOLS`` (the mount is derived from it).

Run (standalone):  python3 ate/server.py
Mounted (unified): served under /ate/ by ../../app.py
"""
import importlib.util
import os
import sys

from flask import Flask, jsonify, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))


def _load_tool(module_name, rel_path):
    """Import a tool's server.py and return its Flask ``app``.

    Mirrors app/app.py's loader: the module is registered in ``sys.modules``
    before execution so Flask's ``root_path`` detection resolves the tool's
    own directory (otherwise ``static_folder`` would point at module/).
    """
    spec = importlib.util.spec_from_file_location(
        module_name, os.path.join(HERE, rel_path))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod.app


# The tool registry — one entry per tool under tool/. ``href`` is the final
# URL under the unified server; ``vsm`` names the VSM role the tool serves.
TOOLS = [
    {
        "id": "awes",
        "name": "Automated Work Execution System",
        "summary": ("Provisions computational environments, dispatches work "
                    "units, captures artifacts, and feeds results back into "
                    "the loop."),
        "vsm": "System 1 — Execution",
        "href": "/ate/tool/awes/",
    },
    {
        "id": "gial",
        "name": "General Integration Abstraction Layer",
        "summary": ("One abstraction for connections to external systems — "
                    "integrations, connections, actions, and logged "
                    "executions, in the n8n / Zapier tradition. Designed; "
                    "plate only."),
        "vsm": "Toolbox — Integration",
        "href": "/ate/tool/gial/",
    },
    {
        "id": "sarl",
        "name": "Sistema Asistencia de Revisión Lingüística",
        "summary": ("Verifies and corrects the linguistic, stylistic, "
                    "terminological, and orthotypographic aspects of a text — "
                    "evidence-cited findings, explicit dispositions, and a "
                    "corrected text with a change log. Designed; plate only."),
        "vsm": "Toolbox — Language Review",
        "href": "/ate/tool/sarl/",
    },
]

app = Flask(__name__, static_folder=None)


# ── tool mounting: /tool/<id>/* → tool/<id>/server.py ──────────────────────
class _ToolMount:
    """Mount tool apps under ``/tool/<id>``.

    Same contract as app/app.py's ``_SubsystemMount``: a bare prefix
    (``/tool/awes``) 302-redirects to the trailing-slash URL so relative
    references inside the tool resolve against ``/tool/<id>/``.
    """

    def __init__(self, root_wsgi, mounts):
        self.root = root_wsgi
        # Longest prefix first so a shorter prefix never shadows a longer one.
        self.mounts = sorted(mounts.items(), key=lambda kv: len(kv[0]), reverse=True)

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "") or "/"
        for tool_id, sub in self.mounts:
            mount = "/tool/" + tool_id
            if path == mount:
                start_response("302 Found", [("Location", mount + "/")])
                return [b""]
            if path.startswith(mount + "/"):
                environ["SCRIPT_NAME"] = (environ.get("SCRIPT_NAME") or "") + mount
                environ["PATH_INFO"] = path[len(mount):] or "/"
                return sub(environ, start_response)
        return self.root(environ, start_response)


app.wsgi_app = _ToolMount(app.wsgi_app, {
    t["id"]: _load_tool(f"ate_tool_{t['id']}", f"tool/{t['id']}/server.py")
    for t in TOOLS
})


# ── ATE's own routes ────────────────────────────────────────────────────────
@app.route("/api/tools")
def api_tools():
    """The machine-readable toolbox registry."""
    return jsonify({"system": "ATE", "tools": TOOLS})


@app.route("/")
def index():
    return send_from_directory(os.path.join(HERE, "static"), "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("ATE_PORT", "5020"))
    print("ATE — Agent Toolbox Ecosystem")
    for t in TOOLS:
        print(f"   /tool/{t['id']:<7} {t['name']}")
    print(f"   Open: http://localhost:{port}")
    app.run(debug=True, port=port, host="0.0.0.0")
