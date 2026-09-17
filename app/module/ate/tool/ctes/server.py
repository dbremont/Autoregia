"""
Computation Task Execution System (CTES) — design plate.

CTES is designed, not yet implemented (spec/ctes/spec.md). This server
exists only to serve the design plate under the ATE toolbox mount; it
exposes no API, no queue, no workers, and no task state.

Mounted (unified): /ate/tool/ctes/  (via ../server.py TOOLS)
Standalone:        python3 ctes/server.py
"""
import os

from flask import Flask, send_from_directory

HERE = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=os.path.join(HERE, "static"))


@app.route("/")
def index():
    return send_from_directory(os.path.join(HERE, "static"), "index.html")


if __name__ == "__main__":
    print("CTES — Computation Task Execution System (design plate)")
    print("   Open: http://localhost:5015")
    app.run(port=5015)
