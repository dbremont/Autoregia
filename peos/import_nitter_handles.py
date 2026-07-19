"""Bulk-import Twitter/X handles from ``data/nitter_handles.json`` into PEOS.

The handles file is normally seeded into CouchDB on the *first* run of the
server (when the DB is still empty). This helper is for the more common case:
the DB already exists, and you want to register the handles (or a subset of
them) as runtime topics via the API — exactly as if you had POSTed each one by
hand.

Usage::

    python3 peos/import_nitter_handles.py                 # all enabled handles
    python3 peos/import_nitter_handles.py karpathy sama   # just these handles
    PEOS_BASE_URL=http://host:8080/peos python3 peos/import_nitter_handles.py

Idempotent: a handle that already exists as a topic is reported and skipped
(the API returns 409, which we treat as success).
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from peos.sources.http_util import get_json, post_json  # noqa: E402

BASE_URL = os.environ.get("PEOS_BASE_URL", "http://localhost:8080/peos").rstrip("/")
HANDLES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "data", "nitter_handles.json")


def main(argv: list[str]) -> int:
    only = set(a.lstrip("@") for a in argv[1:])
    with open(HANDLES_PATH, "r", encoding="utf-8") as fh:
        seeds = json.load(fh)

    existing = {t["topic_id"] for t in get_json(f"{BASE_URL}/api/topics")}
    created = skipped = failed = 0
    for seed in seeds:
        if not seed.get("enabled", True):
            continue
        handle = (seed.get("query") or "").lstrip("@")
        if only and handle not in only:
            continue
        if seed["topic_id"] in existing:
            print(f"[skip] {handle} (topic already exists)")
            skipped += 1
            continue
        body = {"source": "nitter", "query": handle,
                "topic_id": seed.get("topic_id"),
                "note": seed.get("note", ""),
                "enabled": True}
        try:
            r = post_json(f"{BASE_URL}/api/topics", json_body=body)
            print(f"[ok]   {handle} -> {r['topic_id']}")
            created += 1
        except Exception as exc:
            print(f"[fail] {handle}: {exc}")
            failed += 1

    print(f"\ncreated={created} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
