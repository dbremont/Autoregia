"""
PWOS deterministic mock-data generator.

Produces two seed datasets conforming to spec/pwos/schema.json:
  - data/mock_actions.json  -> Action Constructs (Component A)
  - data/mock_blocks.json   -> Calendar Blocks  (Component B)

Run:   python3 pwos/data/gen_mock.py
"""
import json
import os
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(__file__)
ACTIONS_PATH = os.path.join(HERE, "mock_actions.json")
BLOCKS_PATH = os.path.join(HERE, "mock_blocks.json")

# Deterministic reference "now" (midnight) so day*24+h lands at the intended hour.
BASE = datetime(2026, 6, 29, 0, 0, 0, tzinfo=timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def hours(h):
    return iso(BASE + timedelta(hours=h))


def dep(target, kind, notes=None):
    d = {"target": target, "kind": kind}
    if notes:
        d["notes"] = notes
    return d


def action(idx, record_id, kind, scheduling="unscheduled",
           effort=None, deps=None, strategic=None, capacity=None):
    return {
        "id": f"ACT-2026-{idx:05d}",
        "record_id": record_id,
        "kind": kind,
        "scheduling_state": scheduling,
        "effort_estimate": effort,
        "capacity_profile": capacity or {"resource": "focus", "band": "deep"},
        "dependencies": deps or [],
        "external_mappings": [],
        "pinned": False,
        "strategic": strategic or {},
        "annotations": [],
        "created_at": hours(-240 + idx),
        "updated_at": hours(-idx),
    }


def block(idx, action_id, start_h, dur_h, calendar_id="work",
          status="confirmed", title=None, domain=None, recurrence=None):
    start = BASE + timedelta(hours=start_h)
    end = start + timedelta(hours=dur_h)
    return {
        "id": f"BLK-2026-{idx:05d}",
        "action_id": action_id,
        "starts_at": iso(start),
        "ends_at": iso(end),
        "all_day": False,
        "calendar_id": calendar_id,
        "recurrence_source": recurrence,
        "external_mapping": None,
        "conflict_flags": [],
        "status": status,
        "title": title,
        "domain": domain,
    }


def generate_actions():
    return [
        action(1, "REC-2026-00001", "Objective", scheduling="in-progress",
               strategic={"objective": "O-1"}),
        action(2, "REC-2026-00006", "Initiative", scheduling="in-progress",
               strategic={"objective": "O-1", "initiative": "I-1"},
               deps=[dep("ACT-2026-00001", "implements-objective")]),
        action(3, "REC-2026-00003", "Project", scheduling="in-progress",
               effort={"value": 80, "unit": "hours", "confidence": "High"},
               strategic={"objective": "O-1", "initiative": "I-1", "project": "P-PRS"},
               deps=[dep("ACT-2026-00002", "part-of")]),
        action(4, "REC-2026-00009", "Project", scheduling="in-progress",
               effort={"value": 120, "unit": "hours", "confidence": "Medium"},
               strategic={"objective": "O-1", "initiative": "I-1", "project": "P-PWOS"},
               deps=[dep("ACT-2026-00002", "part-of")]),
        action(5, "REC-2026-00002", "Task", scheduling="done",
               effort={"value": 6, "unit": "hours", "confidence": "High"},
               strategic={"project": "P-PRS"},
               deps=[dep("ACT-2026-00003", "part-of")]),
        action(6, "REC-2026-00011", "Task", scheduling="done",
               effort={"value": 3, "unit": "hours", "confidence": "High"},
               strategic={"project": "P-PRS"},
               deps=[dep("ACT-2026-00003", "part-of")]),
        action(7, "REC-2026-00020", "Task", scheduling="in-progress",
               effort={"value": 4, "unit": "hours", "confidence": "Medium"},
               strategic={"project": "P-PRS"},
               deps=[dep("ACT-2026-00003", "part-of"), dep("OBJ-2026-00005", "uses-capability")]),
        action(8, "REC-2026-00024", "Task", scheduling="done",
               effort={"value": 5, "unit": "hours", "confidence": "High"},
               strategic={"project": "P-PWOS"},
               deps=[dep("ACT-2026-00004", "part-of")]),
        action(9, "REC-2026-00025", "Task", scheduling="in-progress",
               effort={"value": 8, "unit": "hours", "confidence": "Medium"},
               strategic={"project": "P-PWOS"},
               deps=[dep("ACT-2026-00004", "part-of"), dep("ACT-2026-00008", "depends-on")]),
        action(10, "REC-2026-00026", "Task", scheduling="unscheduled",
               effort={"value": 10, "unit": "hours", "confidence": "Low"},
               capacity={"resource": "focus", "band": "deep"},
               strategic={"project": "P-PWOS"},
               deps=[dep("ACT-2026-00009", "blocked-by"), dep("pp-health", "governed-by")]),
        action(11, "REC-2026-00030", "Commitment", scheduling="scheduled",
               effort={"value": 4, "unit": "hours", "confidence": "High"},
               strategic={"project": "P-PRS"},
               deps=[dep("ACT-2026-00007", "fulfills-commitment")]),
        action(12, "REC-2026-00040", "Routine", scheduling="scheduled",
               effort={"value": 1.5, "unit": "hours", "confidence": "High"},
               capacity={"resource": "time", "band": "shallow"},
               deps=[dep("pp-conduct", "governed-by")]),
        action(13, "REC-2026-00050", "Task", scheduling="deferred",
               effort={"value": 3, "unit": "hours", "confidence": "Low"},
               strategic={"project": "P-PWOS"},
               deps=[dep("ACT-2026-00009", "blocked-by"), dep("ACT-2026-00010", "blocked-by")]),
    ]


def generate_blocks():
    bs = []
    i = 1
    for day in range(0, 5):  # Mon..Fri deep-work blocks
        bs.append(block(i, "ACT-2026-00009", start_h=day * 24 + 9, dur_h=2.5,
                        status="confirmed", title="PWOS API build",
                        domain="Software Engineering"))
        i += 1
    bs.append(block(i, "ACT-2026-00007", start_h=2 * 24 + 14, dur_h=1.5,
                    status="confirmed", title="Relationship graph",
                    domain="Software Engineering")); i += 1
    bs.append(block(i, "ACT-2026-00011", start_h=4 * 24 + 10, dur_h=2,
                    status="confirmed", title="PRS review draft",
                    domain="Software Engineering")); i += 1
    bs.append(block(i, "ACT-2026-00012", start_h=6 * 24 + 18, dur_h=1.5,
                    status="confirmed", title="Weekly review",
                    domain="Management",
                    recurrence={"action_id": "ACT-2026-00012", "rule": "FREQ=WEEKLY"})); i += 1
    # deliberate overlap to exercise conflict detection
    bs.append(block(i, "ACT-2026-00009", start_h=2 * 24 + 9, dur_h=2.5,
                    status="tentative", title="PWOS API build (dup)",
                    domain="Software Engineering")); i += 1
    return bs


def main():
    actions = generate_actions()
    blocks = generate_blocks()
    with open(ACTIONS_PATH, "w") as f:
        json.dump(actions, f, indent=2)
    with open(BLOCKS_PATH, "w") as f:
        json.dump(blocks, f, indent=2)
    print(f"Wrote {len(actions)} actions -> {ACTIONS_PATH}")
    print(f"Wrote {len(blocks)} blocks  -> {BLOCKS_PATH}")

    # Optional schema validation if jsonschema is available
    try:
        from jsonschema import Draft202012Validator
        schema = json.load(open(os.path.join(HERE, "..", "..", "spec", "pwos", "schema.json")))
        for a in actions:
            wrap = {"$defs": schema["$defs"], "$ref": "#/$defs/actionConstruct"}
            Draft202012Validator(wrap).validate(a)
        for b in blocks:
            wrap = {"$defs": schema["$defs"], "$ref": "#/$defs/calendarBlock"}
            Draft202012Validator(wrap).validate(b)
        print("Schema validation: all entries conform to spec/pwos/schema.json")
    except ImportError:
        print("jsonschema not installed; skipped validation")


if __name__ == "__main__":
    main()

