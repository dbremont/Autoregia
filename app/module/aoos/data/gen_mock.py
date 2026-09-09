"""
AOOS deterministic mock-data generator.

Produces seed datasets conforming to spec/aoos/schema.json:
  - data/mock_actions.json  -> Action Constructs (Component A)
  - data/mock_blocks.json   -> Calendar Blocks  (Component B)
  - data/mock_scratch.json  -> Scratchpad document (Component S — a single markdown working doc)

Run:   python3 aoos/data/gen_mock.py
"""
import json
import os
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(__file__)
ACTIONS_PATH = os.path.join(HERE, "mock_actions.json")
BLOCKS_PATH = os.path.join(HERE, "mock_blocks.json")
SCRATCH_PATH = os.path.join(HERE, "mock_scratch.json")

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
           effort=None, deps=None, strategic=None, capacity=None, goal=None):
    d = {
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
    if goal is not None:
        d["goal"] = goal
    return d


def _date(h):
    return hours(h)[:10]


def kr(krid, description, metric, target, current, unit, direction):
    """A Key Result — a measurable line item that rolls up into a goal."""
    return {"id": krid, "description": description, "metric": metric,
            "target": target, "current": current, "unit": unit, "direction": direction}


def goal(objective_id, metric, value, unit, direction, baseline, current,
         progress_pct, status, horizon, deadline_h, owner, krs, history):
    """Component G — the Goal Tracking extension on an Objective action.

    A goal binds a declared end (target) to a measured present (current) and
    decomposes into Key Results; progress_history feeds momentum."""
    return {
        "objective_id": objective_id,
        "target": {"metric": metric, "value": value, "unit": unit, "direction": direction},
        "baseline": baseline,
        "current": current,
        "progress_pct": progress_pct,
        "status": status,                       # on-track | at-risk | off-track | achieved | dormant
        "horizon": horizon,                     # quarterly | annual | long-term
        "deadline": hours(deadline_h) if deadline_h is not None else None,
        "owner": owner,
        "key_results": krs,
        "progress_history": [{"date": _date(h), "pct": p} for h, p in history],
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


def scratch(body, created_h, updated_h):
    """The singleton Scratchpad document (one persistent markdown working doc)."""
    return {
        "id": "SCR-SCRATCHPAD",
        "body": body,
        "shares": [],
        "created_at": hours(created_h),
        "updated_at": hours(updated_h),
    }


def generate_actions():
    return [
        action(1, "REC-2026-00001", "Objective", scheduling="in-progress",
               strategic={"objective": "O-1"},
               goal=goal("O-1", "Autoregia subsystems in production use", 5, "systems", "gte",
                         0, 3, 68, "on-track", "annual", 24 * 5, "Self",
                         [kr("KR-1", "PRS recording system live", "system live", 1, 1, "boolean", "gte"),
                          kr("KR-2", "AOOS operations system live", "system live", 1, 1, "boolean", "gte"),
                          kr("KR-3", "Goal tracking subsystem live", "system live", 1, 0, "boolean", "gte"),
                          kr("KR-4", "Loop dashboard live", "system live", 1, 1, "boolean", "gte")],
                         [(-240, 5), (-180, 20), (-120, 38), (-60, 55), (-7, 68)])),
        # ── additional tracked goals (Component G) ──
        action(14, "REC-2026-00060", "Objective", scheduling="in-progress",
               strategic={"objective": "O-2"},
               goal=goal("O-2", "Sustained deep-work cadence", 15, "hours/week", "gte",
                         4, 9, 45, "at-risk", "quarterly", 24 * 4, "Self",
                         [kr("KR-1", "Mean deep-work hours per week", "hours/week", 15, 9, "hours", "gte"),
                          kr("KR-2", "Weeks hitting target", "weeks", 8, 3, "weeks", "gte")],
                         [(-240, 30), (-180, 42), (-120, 50), (-60, 48), (-7, 45)])),
        action(15, "REC-2026-00061", "Objective", scheduling="in-progress",
               strategic={"objective": "O-3"},
               goal=goal("O-3", "Ship the Autoregia analytical dashboard", 1, "release", "gte",
                         0, 0.9, 90, "on-track", "quarterly", 24 * 3, "Self",
                         [kr("KR-1", "Intention↔reality gap panels", "panels", 6, 6, "panels", "gte"),
                          kr("KR-2", "Goal tracking in AOOS", "release", 1, 1, "boolean", "gte"),
                          kr("KR-3", "Goal analytics in overview", "release", 1, 0, "boolean", "gte")],
                         [(-180, 10), (-120, 35), (-60, 70), (-7, 90)])),
        action(16, "REC-2026-00062", "Objective", scheduling="in-progress",
               strategic={"objective": "O-4"},
               goal=goal("O-4", "Restore sleep & energy baseline", 7.5, "hours/night", "gte",
                         5.8, 6.3, 30, "off-track", "quarterly", 24 * 6, "Self",
                         [kr("KR-1", "Mean sleep per night", "hours", 7.5, 6.3, "hours", "gte"),
                          kr("KR-2", "Nights below 6h", "nights", 0, 4, "nights", "lte")],
                         [(-240, 55), (-180, 48), (-120, 40), (-60, 33), (-7, 30)])),
        action(17, "REC-2026-00063", "Objective", scheduling="in-progress",
               strategic={"objective": "O-5"},
               goal=goal("O-5", "Close the year financially solvent", 3, "months buffer", "gte",
                         1, 2, 55, "on-track", "annual", 24 * 30, "Self",
                         [kr("KR-1", "Runway in months", "months", 3, 2, "months", "gte"),
                          kr("KR-2", "Subscription audit complete", "boolean", 1, 1, "boolean", "gte")],
                         [(-240, 15), (-180, 28), (-120, 40), (-60, 50), (-7, 55)])),
        action(18, "REC-2026-00064", "Objective", scheduling="unscheduled",
               strategic={"objective": "O-6"},
               goal=goal("O-6", "Read 24 books this year", 24, "books", "gte",
                         0, 5, 20, "dormant", "annual", 24 * 30, "Self",
                         [kr("KR-1", "Books finished", "books", 24, 5, "books", "gte")],
                         [(-240, 8), (-180, 12), (-120, 16), (-60, 18), (-7, 20)])),
        action(2, "REC-2026-00006", "Initiative", scheduling="in-progress",
               strategic={"objective": "O-1", "initiative": "I-1"},
               deps=[dep("ACT-2026-00001", "implements-objective")]),
        action(3, "REC-2026-00003", "Project", scheduling="in-progress",
               effort={"value": 80, "unit": "hours", "confidence": "High"},
               strategic={"objective": "O-1", "initiative": "I-1", "project": "P-PRS"},
               deps=[dep("ACT-2026-00002", "part-of")]),
        action(4, "REC-2026-00009", "Project", scheduling="in-progress",
               effort={"value": 120, "unit": "hours", "confidence": "Medium"},
               strategic={"objective": "O-1", "initiative": "I-1", "project": "P-AOOS"},
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
               strategic={"project": "P-AOOS"},
               deps=[dep("ACT-2026-00004", "part-of")]),
        action(9, "REC-2026-00025", "Task", scheduling="in-progress",
               effort={"value": 8, "unit": "hours", "confidence": "Medium"},
               strategic={"project": "P-AOOS"},
               deps=[dep("ACT-2026-00004", "part-of"), dep("ACT-2026-00008", "depends-on")]),
        action(10, "REC-2026-00026", "Task", scheduling="unscheduled",
               effort={"value": 10, "unit": "hours", "confidence": "Low"},
               capacity={"resource": "focus", "band": "deep"},
               strategic={"project": "P-AOOS"},
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
               strategic={"project": "P-AOOS"},
               deps=[dep("ACT-2026-00009", "blocked-by"), dep("ACT-2026-00010", "blocked-by")]),
    ]


def generate_blocks():
    bs = []
    i = 1
    for day in range(0, 5):  # Mon..Fri deep-work blocks
        bs.append(block(i, "ACT-2026-00009", start_h=day * 24 + 9, dur_h=2.5,
                        status="confirmed", title="AOOS API build",
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
                    status="tentative", title="AOOS API build (dup)",
                    domain="Software Engineering")); i += 1
    return bs


def generate_scratch():
    return scratch(
        "# Scratchpad\n\n"
        "A single markdown working document \u2014 your short-term surface for whatever is in front of mind right now.\n\n"
        "## Today\n\n"
        "- [ ] sketch the dependency-graph query\n"
        "- [x] confirm the launch date\n"
        "- remember: the S1\u2013S3 channel maps onto block<->session deviation\n\n"
        "## Notes\n\n"
        "Drop anything here \u2014 headings, lists, `code`, links. Toggle **Preview** to read it rendered. "
        "Use **Share** to copy the markdown or download it.\n\n"
        "Math works too: the area of a circle is $A = \\pi r^2$, and\n\n"
        "$$\\int_0^1 x^2\\,dx = \\tfrac{1}{3}.$$\n\n"
        "> Short-term memory: edit freely, keep only what you need.",
        created_h=-72, updated_h=-8)


def main():
    actions = generate_actions()
    blocks = generate_blocks()
    scratch_doc = generate_scratch()
    with open(ACTIONS_PATH, "w") as f:
        json.dump(actions, f, indent=2)
    with open(BLOCKS_PATH, "w") as f:
        json.dump(blocks, f, indent=2)
    with open(SCRATCH_PATH, "w") as f:
        json.dump(scratch_doc, f, indent=2)
    print(f"Wrote {len(actions)} actions -> {ACTIONS_PATH}")
    print(f"Wrote {len(blocks)} blocks  -> {BLOCKS_PATH}")
    print(f"Wrote scratchpad document   -> {SCRATCH_PATH}")

    # Optional schema validation if jsonschema is available
    try:
        from jsonschema import Draft202012Validator
        schema = json.load(open(os.path.join(HERE, "..", "..", "spec", "aoos", "schema.json")))
        for a in actions:
            wrap = {"$defs": schema["$defs"], "$ref": "#/$defs/actionConstruct"}
            Draft202012Validator(wrap).validate(a)
        for b in blocks:
            wrap = {"$defs": schema["$defs"], "$ref": "#/$defs/calendarBlock"}
            Draft202012Validator(wrap).validate(b)
        wrap = {"$defs": schema["$defs"], "$ref": "#/$defs/scratchpad"}
        Draft202012Validator(wrap).validate(scratch_doc)
        print("Schema validation: all entries conform to spec/aoos/schema.json")
    except ImportError:
        print("jsonschema not installed; skipped validation")


if __name__ == "__main__":
    main()

