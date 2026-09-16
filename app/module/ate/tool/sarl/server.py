"""
Sistema Asistencia de Revisión Lingüística (SARL) — design plate.

SARL is designed, not yet implemented (spec/sarl/spec.md). This server
exists only to serve the design plate under the ATE toolbox mount; it
exposes no API, no storage, and no review engine.

Mounted (unified): /ate/tool/sarl/  (via ../server.py TOOLS)
Standalone:        python3 sarl/server.py
"""
import os

from flask import Flask, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=os.path.join(HERE, "static"))


@app.route("/")
def index():
    return send_from_directory(os.path.join(HERE, "static"), "index.html")


if __name__ == "__main__":
    print("SARL — Sistema Asistencia de Revisión Lingüística (design plate)")
    print("   Open: http://localhost:5014")
    app.run(port=5014)
