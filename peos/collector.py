"""Personal External Observation System (PEOS) — poller daemon.

A long-running process that sweeps the watched topics (via the PEOS HTTP API)
every ``SWEEP_INTERVAL`` seconds and triggers a poll for each topic whose
interval has elapsed. All persistence stays in the server process; this daemon
is a pure HTTP client.

Run:   python3 app.py                (unified server, incl. /peos/)
       python3 peos/collector.py     (this daemon — second terminal)

Env:
    PEOS_BASE_URL      default http://localhost:8080
    PEOS_SWEEP_S       default 60  (seconds between sweeps)
"""
from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from peos.sources.http_util import get_json, post_json

BASE_URL = os.environ.get("PEOS_BASE_URL", "http://localhost:8080/peos").rstrip("/")
SWEEP_S = int(os.environ.get("PEOS_SWEEP_S", "60"))


def _due(topic: dict, interval_by_source: dict[str, int]) -> bool:
    src = topic.get("source", "")
    interval = topic.get("interval_s") or interval_by_source.get(src, 1800)
    state = get_json(f"{BASE_URL}/api/state", params={"topic": topic["topic_id"]})
    state = state[0] if state else {}
    last = state.get("last_fetched_ms") or 0
    return (now_ms() - last) >= interval * 1000


def now_ms() -> int:
    return int(time.time() * 1000)


def sweep() -> None:
    intervals = {s["name"]: s["default_interval_s"]
                 for s in get_json(f"{BASE_URL}/api/sources")}
    topics = get_json(f"{BASE_URL}/api/topics", params={"enabled": "true"})
    for topic in topics:
        try:
            if not _due(topic, intervals):
                continue
            res = post_json(f"{BASE_URL}/api/poll", json_body={"topic_id": topic["topic_id"]})
            print(f"[peos] {topic['source']}/{topic['topic_id']}: {res}")
        except Exception as exc:
            print(f"[peos] poll {topic.get('topic_id')} failed: {exc}")


def main() -> None:
    print(f"[peos] collector → {BASE_URL} (sweep every {SWEEP_S}s)")
    while True:
        try:
            sweep()
        except Exception as exc:
            print(f"[peos] sweep error: {exc}")
        time.sleep(SWEEP_S)


if __name__ == "__main__":
    main()
