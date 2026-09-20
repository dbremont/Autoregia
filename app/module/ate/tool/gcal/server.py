"""
General Connector Abstraction Layer (GCAL) — design plate.

GCAL is designed, not yet implemented (spec/gcal/spec.md). This server
exists only to serve the design plate under the ATE toolbox mount; it
exposes no API, no storage, and no connectors.

Mounted (unified): /ate/tool/gcal/  (via ../server.py TOOLS)
Standalone:        python3 gcal/server.py
"""
import os

from flask import Flask, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=os.path.join(HERE, "static"))


@app.route("/")
def index():
    return send_from_directory(os.path.join(HERE, "static"), "index.html")


if __name__ == "__main__":
    print("GCAL — General Connector Abstraction Layer (design plate)")
    print("   Open: http://localhost:5013")
    app.run(port=5013)
