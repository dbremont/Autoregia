"""Reconcile the PEOS sources policy file into a running server as topics.

The sources policy file (``config/peos_sources.json`` — see
``spec/peos/policy.md``) is the *desired-state* list of tracked sources. It is
seeded into CouchDB only on the *first* run of the server (when the DB is
empty). This helper covers the common case: the DB already exists, and you
want to reconcile it with the file via the HTTP API — exactly as if you had
POSTed each topic by hand. It never deletes anything; observations and
history are never touched.

Usage::

    python3 peos/sync_sources.py                    # create missing topics
    python3 peos/sync_sources.py karpathy probnstat # just these queries
    python3 peos/sync_sources.py --dry-run          # show, don't change
    python3 peos/sync_sources.py --prune            # also disable topics absent
                                                    # from the file (per source
                                                    # kind the file manages)
    PEOS_BASE_URL=http://host:8081/peos python3 peos/sync_sources.py

File resolution (same as the server): ``PEOS_SOURCES_FILE`` > repo
``config/peos_sources.json`` > bundled ``data/nitter_handles.json``. Both the
policy shape (``{"sources": [...]}``) and the legacy bare list are accepted.

Idempotent: a topic that already exists is reported and skipped (the API
returns 409, which we treat as success). ``--prune`` only *disables* — it
never deletes.
"""
from __future__ import annotations

import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
sys.path.insert(0, os.path.dirname(os.path.dirname(_HERE)))
from peos.sources.http_util import get_json, patch_json, post_json  # noqa: E402

BASE_URL = os.environ.get("PEOS_BASE_URL", "http://localhost:8080/peos").rstrip("/")
BUNDLED_SEED = os.path.join(_HERE, "data", "nitter_handles.json")
DEFAULT_POLICY = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(_HERE))),
    "config", "peos_sources.json")


def resolve_sources_file() -> str:
    path = os.environ.get("PEOS_SOURCES_FILE") or DEFAULT_POLICY
    if os.path.isfile(path):
        return path
    if os.environ.get("PEOS_SOURCES_FILE"):
        print(f"[warn] PEOS_SOURCES_FILE={path} not found; using bundled seed")
    return BUNDLED_SEED


def load_sources(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, dict):
        data = data.get("sources", [])
    return [d for d in data if d.get("source")]


def main(argv: list[str]) -> int:
    prune = "--prune" in argv
    dry = "--dry-run" in argv
    only = {a.lstrip("@") for a in argv[1:] if not a.startswith("--")}

    path = resolve_sources_file()
    seeds = load_sources(path)
    kinds = sorted({s["source"] for s in seeds})
    print(f"[file] {path}: {len(seeds)} sources ({', '.join(kinds)})")

    existing = {t["topic_id"]: t for t in get_json(f"{BASE_URL}/api/topics")}
    created = skipped = pruned = failed = 0
    for seed in seeds:
        if not seed.get("enabled", True):
            continue
        src = seed.get("source")
        query = (seed.get("query") or "").lstrip("@")
        if only and query not in only and seed["topic_id"] not in only:
            continue
        if seed["topic_id"] in existing:
            print(f"[skip] {src}/{query} (topic already exists)")
            skipped += 1
            continue
        body = {"source": src, "query": query,
                "topic_id": seed.get("topic_id"),
                "name": seed.get("name", ""),
                "domain": seed.get("domain", ""),
                "note": seed.get("note", ""),
                "enabled": True}
        if dry:
            print(f"[dry]  {src}/{query} -> create {body['topic_id']}")
            created += 1
            continue
        try:
            r = post_json(f"{BASE_URL}/api/topics", json_body=body)
            print(f"[ok]   {src}/{query} -> {r['topic_id']}")
            created += 1
        except Exception as exc:
            print(f"[fail] {src}/{query}: {exc}")
            failed += 1

    if prune:
        file_ids = {s["topic_id"] for s in seeds}
        managed = {s["source"] for s in seeds}   # only prune kinds the file manages
        for tid, topic in existing.items():
            if topic.get("source") not in managed or tid in file_ids:
                continue
            if not topic.get("enabled", True):
                continue
            if dry:
                print(f"[dry]  {tid} -> disable (absent from policy file)")
                pruned += 1
                continue
            try:
                patch_json(f"{BASE_URL}/api/topics/{tid}",
                           json_body={"enabled": False})
                print(f"[prune] {tid} disabled")
                pruned += 1
            except Exception as exc:
                print(f"[fail] {tid}: {exc}")
                failed += 1

    print(f"\ncreated={created} skipped={skipped} pruned={pruned} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
