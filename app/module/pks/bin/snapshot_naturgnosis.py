#!/usr/bin/env python3
"""Snapshot the Naturgnosis universal index into PKS.

Naturgnosis is frozen: its universal viewer (``app/data/universal-graph.json`` +
``app/data/universal-layout.json``) is the authoritative, curated corpus. This
script copies those two files into PKS, adds a provenance block, and refuses to
write a snapshot that is not internally complete.

Completeness gate (fails loudly):

* every source space in ``counts`` has exactly that many nodes;
* every ``uid`` is unique;
* every node has layout coordinates;
* every intra-dataset ``targets`` uid exists.

Do **not** snapshot the live Naturgnosis CouchDB: it carries stale docs that
were removed or renamed in the repository (import duplicates, the dropped
Bottema monograph, the legal/rights artifacts moved back to Social). The
committed mirrors are the freeze source. Use ``--check-live URL`` to print that
delta without importing it.

Usage:

    python3 app/module/pks/bin/snapshot_naturgnosis.py \
        --source ~/Code/Laboratorium/Research/Naturgnosis

    # optional drift report against the running Naturgnosis server
    python3 app/module/pks/bin/snapshot_naturgnosis.py --check-live http://127.0.0.1:8011
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent          # app/module/pks
SPACES = ("social", "research", "technique", "epistemica", "nature")
GRAPH_NAME = "naturgnosis-index.json"
LAYOUT_NAME = "naturgnosis-layout.json"


def default_source() -> Path:
    env = os.environ.get("NATURGNOSIS_DIR")
    if env:
        return Path(env).expanduser()
    return Path.home() / "Code" / "Laboratorium" / "Research" / "Naturgnosis"


def git_commit(repo: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def validate(payload: dict, layout: dict) -> dict:
    nodes = payload.get("nodes") or []
    counts = payload.get("counts") or {}
    errors = []

    actual = {}
    uids = set()
    for node in nodes:
        src = node.get("source")
        actual[src] = actual.get(src, 0) + 1
        uid = node.get("uid")
        if not uid:
            errors.append("node without uid")
        elif uid in uids:
            errors.append(f"duplicate uid: {uid}")
        uids.add(uid)

    for space in SPACES:
        if actual.get(space, 0) != counts.get(space):
            errors.append(
                f"{space}: counts says {counts.get(space)!r}, found {actual.get(space, 0)}"
            )
        if not actual.get(space):
            errors.append(f"{space}: no nodes")

    missing_layout = sorted(u for u in uids if u not in layout)
    if missing_layout:
        errors.append(f"{len(missing_layout)} nodes without layout, e.g. {missing_layout[:3]}")

    dangling = []
    for node in nodes:
        for target in node.get("targets") or []:
            if target not in uids:
                dangling.append((node.get("uid"), target))
    if dangling:
        errors.append(f"{len(dangling)} dangling targets, e.g. {dangling[:3]}")

    if errors:
        raise SystemExit("snapshot incomplete:\n  - " + "\n  - ".join(errors))

    return {"nodes": len(nodes), "spaces": actual, "layout": len(layout)}


def live_delta(base_url: str, snapshot: dict) -> dict:
    """Report docs present live but absent from the committed snapshot."""
    snap = {}
    for node in snapshot.get("nodes") or []:
        snap.setdefault(node["source"], set()).add(str(node["source_id"]))

    report = {}
    for space in SPACES:
        url = base_url.rstrip("/") + f"/api/graph?dataset={space}"
        try:
            with urllib.request.urlopen(url, timeout=60) as fh:
                data = json.load(fh)
        except Exception as exc:
            report[space] = {"error": str(exc)}
            continue
        nodes = data if isinstance(data, list) else data.get("nodes", data.get("items", []))
        live = {str(n.get("id")) for n in nodes if isinstance(n, dict) and n.get("id") is not None}
        report[space] = {
            "live": len(live),
            "snapshot": len(snap.get(space, ())),
            "live_only": sorted(live - snap.get(space, set())),
            "snapshot_only": sorted(snap.get(space, set()) - live),
        }
    return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=default_source(),
                        help="Naturgnosis repository root (default: $NATURGNOSIS_DIR)")
    parser.add_argument("--check-live", metavar="URL", default=None,
                        help="report live-vs-snapshot drift against a Naturgnosis server")
    args = parser.parse_args(argv)

    source = args.source.expanduser().resolve()
    graph_src = source / "app" / "data" / "universal-graph.json"
    layout_src = source / "app" / "data" / "universal-layout.json"
    for path in (graph_src, layout_src):
        if not path.is_file():
            raise SystemExit(f"missing {path} — run `make universal-index` in Naturgnosis first")

    payload = load_json(graph_src)
    layout = load_json(layout_src)
    summary = validate(payload, layout)

    if args.check_live:
        delta = live_delta(args.check_live, payload)
        print("live-vs-snapshot drift (stale live docs are not imported):")
        for space, row in delta.items():
            if "error" in row:
                print(f"  {space}: {row['error']}")
            elif row["live_only"] or row["snapshot_only"]:
                print(f"  {space}: live={row['live']} snapshot={row['snapshot']} "
                      f"live-only={row['live_only']} snapshot-only={row['snapshot_only']}")
            else:
                print(f"  {space}: identical ({row['live']})")

    payload["snapshot"] = {
        "taken_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_repo": "csiglab/Naturgnosis",
        "source_commit": git_commit(source),
        "source_generated": payload.get("generated", ""),
        "source_files": {
            "graph": "app/data/universal-graph.json",
            "layout": "app/data/universal-layout.json",
        },
        "spaces": list(SPACES),
        "note": (
            "Frozen Naturgnosis corpus. Curation notes live in the PKS CouchDB "
            "(`pks` db) and export to Epistecnica; this snapshot is immutable."
        ),
    }

    db_out = REPO / "data"
    db_out.mkdir(parents=True, exist_ok=True)
    (db_out / GRAPH_NAME).write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (db_out / LAYOUT_NAME).write_text(
        json.dumps(layout, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"wrote {db_out / GRAPH_NAME} ({summary['nodes']:,} nodes)")
    for space, n in summary["spaces"].items():
        print(f"  {space:12s} {n:>6,}")
    print(f"layout entries: {summary['layout']:,}")
    print(f"source commit:  {payload['snapshot']['source_commit'][:12] or 'unknown'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
