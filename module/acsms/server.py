"""
Agent Capability Self Management System (ACSMS) — Server.

Serves the ACSMS landing page: the entry point for the agent's improvement
engine — the substrate system that manages the deliberate growth of the
agent's own capabilities (see spec/acsms/README.md).

This is a static prototype: no API and no store yet. The improvement
lifecycle (Detect → Deliberate → Commit → Practice → Evidence → Consolidate
→ Review → Cull) will be materialized here in a later revision.

Run (standalone):  python3 acsms/server.py
Open:              http://localhost:5009
Under app.py:      mounted at /acsms/  (http://localhost:8081/acsms/)
"""
import os

from flask import Flask, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR)


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(STATIC_DIR, path)


if __name__ == "__main__":
    print("ACSMS — Agent Capability Self Management System")
    app.run(debug=True, port=5009, host="0.0.0.0")
