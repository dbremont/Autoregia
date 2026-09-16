"""World Observation System (WOS) — poller daemon.

A long-running process that sweeps the configured source specs (via the WOS
HTTP API) every ``SWEEP_INTERVAL`` seconds and triggers a poll for each spec
whose interval has elapsed. All persistence stays in the server process; this
daemon is a pure HTTP client. Topic assignment is *not* a concern here — the
daemon just polls sources; the downstream processing pipeline classifies.

Run:   python3 app.py                (unified server, incl. /wos/)
       python3 wos/collector.py     (this daemon — second terminal)

Env:
    WOS_BASE_URL      default http://localhost:8080
    WOS_SWEEP_S       default 60  (seconds between sweeps)
"""
from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from wos.sources.http_util import get_json, post_json

BASE_URL = os.environ.get("WOS_BASE_URL", "http://localhost:8080/wos").rstrip("/")
SWEEP_S = int(os.environ.get("WOS_SWEEP_S", "60"))


def _due(spec: dict, interval_by_source: dict[str, int]) -> bool:
    src = spec.get("source", "")
    interval = spec.get("interval_s") or interval_by_source.get(src, 1800)
    state = get_json(f"{BASE_URL}/api/state",
                     params={"source_id": spec["id"]})
    state = state[0] if state else {}
    last = state.get("last_fetched_ms") or 0
    return (now_ms() - last) >= interval * 1000


def now_ms() -> int:
    return int(time.time() * 1000)


def sweep() -> None:
    intervals = {s["name"]: s["default_interval_s"]
                 for s in get_json(f"{BASE_URL}/api/source-types")}
    specs = get_json(f"{BASE_URL}/api/sources", params={"enabled": "true"})
    for spec in specs:
        try:
            if not _due(spec, intervals):
                continue
            res = post_json(f"{BASE_URL}/api/poll", json_body={"id": spec["id"]})
            print(f"[wos] {spec['source']}/{spec['id']}: {res}")
        except Exception as exc:
            print(f"[wos] poll {spec.get('id')} failed: {exc}")


def main() -> None:
    print(f"[wos] collector → {BASE_URL} (sweep every {SWEEP_S}s)")
    while True:
        try:
            sweep()
        except Exception as exc:
            print(f"[wos] sweep error: {exc}")
        time.sleep(SWEEP_S)


if __name__ == "__main__":
    main()
