"""
General Integration Abstraction Layer (GIAL) — design plate.

GIAL is designed, not yet implemented (spec/gial/spec.md). This server
exists only to serve the design plate under the ATE toolbox mount; it
exposes no API, no storage, and no integrations.

Mounted (unified): /ate/tool/gial/  (via ../server.py TOOLS)
Standalone:        python3 gial/server.py
"""
import os

from flask import Flask, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=os.path.join(HERE, "static"))


@app.route("/")
def index():
    return send_from_directory(os.path.join(HERE, "static"), "index.html")


if __name__ == "__main__":
    print("GIAL — General Integration Abstraction Layer (design plate)")
    print("   Open: http://localhost:5013")
    app.run(port=5013)
