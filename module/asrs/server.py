"""
Agent Self Representation System (ASRS) — Server.

ASRS is the integration layer of the agent's self-representation: it composes
the **World** boundary (External, Internal), the **Model** (PWMS — the external
world ontology), the **Self Model** (PSMS — the typed model of the agent), and
the **Policy System** (PPS — the normative layer) into one coherent structure.

This reference implementation serves a seed self-representation (data/seed.json)
and exposes it as JSON, plus a **consistency check** — the generative function
that detects when the represented self is internally inconsistent (resource
over-allocation, constraint violation, value/belief drift).

Run (standalone):  python3 asrs/server.py
Open:              http://localhost:5007
Under app.py:      mounted at /asrs/  (http://localhost:8080/asrs/)
"""
import json
import os

from flask import Flask, jsonify, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="/static")


def _load_seed():
    path = os.path.join(DATA_DIR, "seed.json")
    if not os.path.isfile(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


REP = _load_seed()


# ── consistency check ──────────────────────────────────────────────────────
def run_consistency_check(rep):
    """Examine the self-representation for internal inconsistency.

    Three checks, each derived from the spec's generative function:
      1. resource over-allocation — commitments drawing on a resource exceed
         its capacity;
      2. constraint violation     — a commitment explicitly violates a standing
         self-model constraint;
      3. value / belief drift     — a held belief conflicts with a declared
         policy stance.
    """
    findings = []
    self_model = rep.get("self", {})

    # 1. resource over-allocation
    resources = {r["id"]: r for r in self_model.get("resources", []) if "id" in r}
    usage = {}
    for c in self_model.get("commitments", []):
        rid = c.get("draws_on")
        if rid in resources:
            usage.setdefault(rid, 0)
            usage[rid] += c.get("cost", 0)
    for rid, total in usage.items():
        r = resources[rid]
        cap = r.get("capacity", 0)
        if total > cap:
            findings.append({
                "kind": "over-allocation",
                "severity": "high",
                "resource": r["name"],
                "used": total,
                "capacity": cap,
                "over_by": total - cap,
                "message": (
                    f"{r['name']} over-allocated: {total} {r.get('unit','')} committed "
                    f"against a capacity of {cap} ({total - cap} over)."
                ),
            })

    # 2. constraint violation
    constraints = {k["id"]: k for k in self_model.get("constraints", []) if "id" in k}
    for c in self_model.get("commitments", []):
        cid = c.get("violates")
        if cid and cid in constraints:
            k = constraints[cid]
            findings.append({
                "kind": "constraint-violation",
                "severity": "high",
                "commitment": c["name"],
                "constraint": k["name"],
                "message": (
                    f"Commitment “{c['name']}” violates constraint “{k['name']}” "
                    f"({k.get('rule','')})."
                ),
            })

    # 3. value / belief drift
    for b in self_model.get("beliefs", []):
        if b.get("conflicts_with"):
            findings.append({
                "kind": "value-drift",
                "severity": "medium",
                "belief": b.get("claim", ""),
                "conflicts_with": b["conflicts_with"],
                "message": (
                    f"Held belief “{b.get('claim','')}” conflicts with declared "
                    f"policy stance “{b['conflicts_with']}”."
                ),
            })

    return {
        "ok": len(findings) == 0,
        "count": len(findings),
        "findings": findings,
    }


CHECK = run_consistency_check(REP)


# ── API ────────────────────────────────────────────────────────────────────
@app.route("/api/representation")
def api_representation():
    """The full integrated self-representation: World + Model + Self + Policy."""
    return jsonify({
        "meta": REP.get("_meta", {}),
        "world": REP.get("world", {}),
        "model": REP.get("model", {}),
        "self": REP.get("self", {}),
        "policy": REP.get("policy", {}),
    })


@app.route("/api/world")
def api_world():
    return jsonify(REP.get("world", {}))


@app.route("/api/model")
def api_model():
    return jsonify(REP.get("model", {}))


@app.route("/api/self")
def api_self():
    return jsonify(REP.get("self", {}))


@app.route("/api/policy")
def api_policy():
    return jsonify(REP.get("policy", {}))


@app.route("/api/check")
def api_check():
    """The consistency check over the self-representation."""
    return jsonify(CHECK)


# ── Pages ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(STATIC_DIR, path)


if __name__ == "__main__":
    print("Agent Self Representation System (ASRS)")
    print(f"  parts: world, model (PWMS), self (PSMS), policy (PPS)")
    print(f"  consistency check: {CHECK['count']} finding(s)")
    app.run(debug=True, port=5007)
