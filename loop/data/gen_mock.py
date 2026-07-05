#!/usr/bin/env python3
"""
Deterministic whole-loop mock dataset generator for the Autoregia
Control-Loop Dashboard ("The Loop").

It synthesizes the cooperating organs' substance — PRS records, AOOS
action constructs + sessions, AWES executions, PRAS deliberations, the
PEB event stream, ASRS consistency violations, and the agent's
essential variables — woven into causally-linked chains so every
whole-loop indicator (cycle-time, closed-loop ratio, cascade
traceability, coordination health, viability balance, …) has
meaningful data.

The shape mirrors the specs (spec/about.md control loop; spec/iscb
event vocabulary & causal lineage; spec/pras lifecycle; spec/aoos
action/session model; spec/asrs substrates). It is mock: the metrics
are computed, not measured.

Run:   python3 loop/data/gen_mock.py
Writes: loop/data/mock_loop.json
"""
import json, random, os, hashlib
from datetime import datetime, timezone, timedelta

random.seed(20260704)

END = datetime(2026, 7, 4, 20, 0, tzinfo=timezone.utc)
DAYS = 120
START = END - timedelta(days=DAYS - 1)

# ── vocabularies (drawn from the specs) ─────────────────────────
RECORD_TYPES = ["Goal", "Decision", "Task", "Project", "Event", "Observation",
                "Hypothesis", "Question", "Principle", "Reference", "Procedure",
                "Meeting", "Idea", "Commitment", "Resource", "Opportunity", "Lesson"]
ACTION_BEARING = {"Task", "Project", "Commitment", "Goal", "Procedure"}
STATE_CLASSES = ["Internal Cognitive", "External World", "Social"]
DOMAINS = ["Software Engineering", "Research", "Health", "Finance", "Learning",
           "Relationships", "Infrastructure", "Writing"]
STATUSES = ["Draft", "Active", "Pending", "Blocked", "Completed", "Archived", "Cancelled"]
PRIORITIES = ["Critical", "High", "Medium", "Low"]
CONFIDENCE = ["Very Low", "Low", "Medium", "High", "Very High"]
EVIDENCE = ["None", "Anecdotal", "Observational", "Experimental", "Formal Proof"]
SOURCE_TYPES = ["Personal Memory", "Observation", "Measurement", "Document", "Expert", "External System"]
CAPACITY_BANDS = ["deep", "shallow", "low"]
WORK_TYPES = ["command", "script", "notebook"]
PEB_TYPES = ["RecordCreated", "ActionRegistered", "ActionScheduled", "ActionCompleted",
             "ExecutionFinished", "AdaptationEnacted", "ReactionFired", "ReactionSucceeded",
             "ReactionFailed", "ReactionSuppressed", "BlockConflictDetected",
             "KeywordThresholdCrossed", "PolicyChanged"]
ORG_ORIGIN = {"RecordCreated": "PRS", "ActionRegistered": "AOOS", "ActionScheduled": "AOOS",
              "ActionCompleted": "AOOS", "ExecutionFinished": "AWES",
              "AdaptationEnacted": "PRAS", "ReactionFired": "PEB", "ReactionSucceeded": "PEB",
              "ReactionFailed": "PEB", "ReactionSuppressed": "PEB",
              "BlockConflictDetected": "AOOS", "KeywordThresholdCrossed": "PKTS",
              "PolicyChanged": "PPS"}
DELIB_TYPES = ["review", "deviation", "retrospective", "hypothesis", "decision-in-formation"]
DELIB_DOMAINS = ["Method", "Work", "Health", "Learning", "Conduct", "Identity"]
FEEDS = ["pps", "aoos", "prs", "ptocs"]

SUBJECTS = {
    "Software Engineering": ["PRS prototype", "AOOS calendarization", "Loop dashboard", "PEB dispatcher", "search index", "schema migration"],
    "Research": ["attention economics", "control-theory review", "embedding drift", "causal inference primer"],
    "Health": ["sleep schedule", "cardio baseline", "nutrition logging"],
    "Finance": ["monthly close", "subscription audit", "tax estimate"],
    "Learning": ["linear algebra", "Spectral sequences", "Bayesian reasoning"],
    "Relationships": ["weekly call", "birthday plan"],
    "Infrastructure": ["backup rotation", "email deadline ingestion", "calendar sync"],
    "Writing": ["PVSM essay", "annual review", "weekly reflection"],
}
TAG_POOL = ["deep", "shallow", "eng", "health", "ops", "review", "bug", "design",
            "research", "admin", "auto", "manual"]


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def day_of(d):
    return (d - START).days

def is_weekend(d):
    return d.weekday() >= 5

def rid(prefix, n):
    return f"{prefix}-2026-{n:05d}"

def stable_id(prefix, i):
    h = hashlib.sha256(f"loop-{prefix}-{i}".encode()).hexdigest()[:8].upper()
    return f"{prefix}-{h}"


# ── per-day intensity (weekday/weekend rhythm + seasonality) ────
def day_weight(d):
    w = 0.45 if is_weekend(d) else 1.0
    # gentle mid-window peak
    prog = day_of(d) / DAYS
    season = 1.0 + 0.25 * math_sine(prog)
    return w * season * random.uniform(0.8, 1.2)

def math_sine(p):
    import math
    return math.sin(p * math.pi * 2.0)


def gen():
    records, actions, sessions, executions, deliberations = [], [], [], [], []
    events, chains, essential = [], [], []
    rc = ac = sc = ec = dc = evc = cc = 0

    # accumulators for essential variables
    daily_sessions = {}

    d = START
    week_counter = 0
    while d <= END:
        dw = day_weight(d)
        n_records = max(0, int(random.gauss(4.0, 1.3) * dw))
        day_records = []

        for _ in range(n_records):
            rc += 1
            rtype = weighted_record_type()
            domain = random.choice(DOMAINS)
            created = d + timedelta(hours=random.choice([8, 9, 10, 11, 13, 14, 15, 16, 19, 20, 21]),
                                    minutes=random.randint(0, 59))
            rec = {
                "id": rid("REC", rc),
                "record_type": rtype,
                "state_class": random.choice(STATE_CLASSES),
                "status": weighted_status(),
                "domain": domain,
                "subject": random.choice(SUBJECTS[domain]),
                "content": f"{rtype} — {random.choice(SUBJECTS[domain])}",
                "created_at": iso(created),
                "priority": weighted_priority(),
                "confidence": random.choice(CONFIDENCE),
                "evidence_level": weighted_evidence(),
                "source_type": random.choice(SOURCE_TYPES),
                "tags": random.sample(TAG_POOL, random.randint(1, 3)),
                "action_bearing": rtype in ACTION_BEARING,
            }
            if rtype in ("Commitment", "Task") and rec["status"] in ("Active", "Pending"):
                rec["deadline"] = iso(created + timedelta(days=random.randint(2, 21)))
            if rtype == "Goal":
                rec["target_pct"] = 100
                rec["progress_pct"] = random.randint(8, 96)
                rec["momentum"] = random.choices(["advancing", "stalled", "regressing"], weights=[5, 3, 2])[0]
            records.append(rec)
            day_records.append(rec)

            evc += 1
            events.append({
                "event_id": stable_id("EVT", evc),
                "type": "RecordCreated",
                "origin": "PRS",
                "occurred_at": iso(created),
                "causal_id": None,
                "correlation_id": None,
                "payload_type": rtype,
            })

        # ── actions from action-bearing records (Decision / Action Selection) ──
        for rec in day_records:
            if rec["action_bearing"] and random.random() < 0.6:
                ac += 1
                lag_h = random.uniform(1, 40)
                registered = rec_dt(rec) + timedelta(hours=lag_h)
                if registered > END:
                    registered = END - timedelta(hours=1)
                kind = {"Task": "Task", "Project": "Project", "Commitment": "Commitment",
                        "Goal": random.choice(["Objective", "Initiative"]),
                        "Procedure": "Routine"}[rec["record_type"]]
                status = weighted_action_status(kind)
                completed_at = None
                if status == "Completed":
                    completed_at = registered + timedelta(hours=random.uniform(4, 120))
                    if completed_at > END:
                        completed_at = END - timedelta(hours=2)
                act = {
                    "id": rid("ACT", ac),
                    "source_record": rec["id"],
                    "kind": kind,
                    "status": status,
                    "scheduling_state": {"Draft": "unscheduled", "Active": "scheduled",
                                         "Pending": "scheduled", "Blocked": "deferred",
                                         "Completed": "done", "Archived": "deferred",
                                         "Cancelled": "deferred"}[status],
                    "priority": rec["priority"],
                    "registered_at": iso(registered),
                    "deadline": rec.get("deadline"),
                    "completed_at": iso(completed_at) if completed_at else None,
                    "effort_estimate_h": round(random.uniform(0.5, 8.0), 1),
                    "project": random.choice(SUBJECTS[rec["domain"]]),
                    "domain": rec["domain"],
                }
                actions.append(act)
                rec["action_id"] = act["id"]
                evc += 1
                events.append({
                    "event_id": stable_id("EVT", evc),
                    "type": "ActionRegistered",
                    "origin": "AOOS",
                    "occurred_at": iso(registered),
                    "causal_id": ev_causal_for_record(events, rec["id"]),
                    "correlation_id": None,
                    "payload_type": kind,
                })
                act["_reg_event"] = events[-1]["event_id"]

                # ── sessions (Execution actuals) ──
                n_sess = 0 if status == "Cancelled" else (random.choice([0, 1, 1, 2, 3])
                                                          if status in ("Active", "Completed") else random.choice([0, 1]))
                act_sessions = []
                for _ in range(n_sess):
                    sc += 1
                    dur = max(10, int(random.gauss(75, 35)))
                    if status == "Completed" and completed_at:
                        sstart = completed_at - timedelta(minutes=dur + random.randint(0, 600))
                    else:
                        sstart = registered + timedelta(hours=random.uniform(0, 60))
                    if sstart < rec_dt(rec) or sstart > END:
                        continue
                    send = sstart + timedelta(minutes=dur)
                    sess = {
                        "id": rid("SES", sc),
                        "action_id": act["id"],
                        "started_at": iso(sstart),
                        "ended_at": iso(send),
                        "duration_min": dur,
                        "source": random.choice(["timer", "manual", "platform"]),
                        "capacity_band": weighted_band(),
                        "description": act["project"],
                        "domain": act["domain"],
                        "status": "completed",
                    }
                    sessions.append(sess)
                    act_sessions.append(sess)
                    daily_sessions.setdefault(sstart.date(), []).append(dur)
                    evc += 1
                    events.append({
                        "event_id": stable_id("EVT", evc),
                        "type": "ExecutionFinished",
                        "origin": "AWES" if random.random() < 0.3 else "AOOS",
                        "occurred_at": iso(send),
                        "causal_id": act["_reg_event"],
                        "correlation_id": None,
                        "payload_type": "session",
                    })
                    sess["_exec_event"] = events[-1]["event_id"]
                    # AWES execution record (subset)
                    if random.random() < 0.3:
                        ec += 1
                        executions.append({
                            "id": rid("EXE", ec),
                            "action_id": act["id"],
                            "session_id": sess["id"],
                            "started_at": iso(sstart),
                            "ended_at": iso(send),
                            "status": "completed",
                            "exit_code": 0,
                            "work_type": random.choice(WORK_TYPES),
                        })

                # ── closed-loop chain: session -> deliberation (Feedback) ──
                if act_sessions and random.random() < 0.5:
                    sess = random.choice(act_sessions)
                    cc += 1
                    corr = stable_id("THR", cc)
                    # tag the chain's events with the correlation id
                    for ev in events:
                        if ev["event_id"] in (ev_causal_for_record(events, rec["id"]),
                                              act["_reg_event"], sess.get("_exec_event")):
                            ev["correlation_id"] = corr
                    deliberation = make_deliberation(sess, act, rec, corr, dc, evc)
                    dc = deliberation["dc"]
                    evc = deliberation["evc"]
                    deliberations.append(deliberation["del"])
                    # closed-loop event
                    evc += 1
                    events.append({
                        "event_id": stable_id("EVT", evc),
                        "type": "AdaptationEnacted" if deliberation["del"]["status"] == "enacted"
                                else "ReactionFired",
                        "origin": "PRAS",
                        "occurred_at": iso(deliberation_dt(deliberation["del"])),
                        "causal_id": sess["_exec_event"],
                        "correlation_id": corr,
                        "payload_type": deliberation["del"]["type"],
                    })
                    chains.append({
                        "correlation_id": corr,
                        "started_at": rec["created_at"],
                        "perception": {"id": rec["id"], "type": rec["record_type"],
                                       "title": rec["content"], "organ": "PRS"},
                        "decision": {"id": act["id"], "kind": act["kind"],
                                     "title": act["project"], "organ": "AOOS"},
                        "execution": {"id": sess["id"], "duration_min": sess["duration_min"],
                                      "title": sess["description"], "organ": "AOOS/AWES"},
                        "feedback": {"id": deliberation["del"]["id"], "status": deliberation["del"]["status"],
                                     "type": deliberation["del"]["type"], "title": deliberation["del"]["title"],
                                     "organ": "PRAS"},
                        "closed": deliberation["del"]["status"] == "enacted",
                    })

        # ── weekly review deliberation (Feedback cadence) ──
        if d.weekday() == 6:  # Sunday
            week_counter += 1
            dc += 1
            dl = {
                "id": rid("DLB", dc),
                "type": "review",
                "status": "concluded" if random.random() < 0.2 else "enacted",
                "date": iso(d + timedelta(hours=18)),
                "domain": "Method",
                "feeds": random.sample(FEEDS, random.randint(1, 2)),
                "observation": f"Week {week_counter}: throughput summary and drift check.",
                "deliberation": "Steady cadence; one deviation on commitment deadlines.",
                "adaptation": "Re-baseline effort estimates for Commitments.",
                "source_session": None,
                "source_action": None,
                "correlation_id": None,
                "title": f"Week {week_counter} Review",
            }
            deliberations.append(dl)

        # ── essential variables for the day ──
        used = sum(daily_sessions.get(d.date(), [])) / 60.0
        cap = random.uniform(9.5, 12.5)
        energy = clamp(int(random.gauss(72 if not is_weekend(d) else 64, 14)), 15, 100)
        attention = clamp(int(random.gauss(68, 16)), 15, 100)
        sleep = round(random.gauss(7.0 if not is_weekend(d) else 7.8, 0.9), 1)
        essential.append({
            "date": d.date().isoformat(),
            "weekday": d.weekday(),
            "time_used_h": round(used, 1),
            "time_capacity_h": round(cap, 1),
            "energy": energy,
            "energy_floor": 40,
            "attention": attention,
            "attention_floor": 40,
            "focus_pct": clamp(int(random.gauss(55, 14)), 10, 95),
            "focus_floor": 30,
            "sleep_h": sleep,
            "sleep_floor": 6.5,
            "money_spent": round(random.uniform(0, 80) if not is_weekend(d) else random.uniform(10, 160), 1),
        })

        d += timedelta(days=1)

    # ── PEB coordination noise: reactions, a few failures / suppressions ──
    base_reactions = int(len(events) * 0.18)
    for _ in range(base_reactions):
        evc += 1
        rtype = random.choices(
            ["ReactionFired", "ReactionSucceeded", "ReactionFailed", "ReactionSuppressed",
             "BlockConflictDetected", "KeywordThresholdCrossed"],
            weights=[40, 40, 6, 5, 5, 4])[0]
        when = START + timedelta(seconds=random.randint(0, int((END - START).total_seconds())))
        events.append({
            "event_id": stable_id("EVT", evc),
            "type": rtype,
            "origin": ORG_ORIGIN.get(rtype, "PEB"),
            "occurred_at": iso(when),
            "causal_id": random.choice([e["event_id"] for e in events[-50:]]) if events else None,
            "correlation_id": None,
            "payload_type": rtype,
        })

    # ── environment: entities + the 4-type event stream ──
    entities = gen_entities()
    env_events = gen_env_events(sessions, entities)

    # ── ASRS consistency violations (substrate) ──
    consistency = gen_consistency(records, actions, deliberations)

    # ── prune internal helper keys ──
    for a in actions:
        a.pop("_reg_event", None)
    for s in sessions:
        s.pop("_exec_event", None)

    out = {
        "generated_at": iso(datetime.now(timezone.utc)),
        "window": {"start": START.date().isoformat(), "end": END.date().isoformat(), "days": DAYS},
        "orgs": ORGS,
        "vsm_levels": VSM_LEVELS,
        "records": records,
        "actions": actions,
        "sessions": sessions,
        "executions": executions,
        "deliberations": deliberations,
        "chains": chains,
        "events": events,
        "essential_variables": essential,
        "consistency_violations": consistency,
        "entities": entities,
        "environment_events": env_events,
    }
    path = os.path.join(os.path.dirname(__file__), "mock_loop.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print(f"Wrote whole-loop dataset -> {path}")
    print(f"  records={len(records)} actions={len(actions)} sessions={len(sessions)} "
          f"executions={len(executions)} deliberations={len(deliberations)}")
    print(f"  chains={len(chains)} events={len(events)} essential_days={len(essential)} "
          f"violations={len(consistency)}")
    print(f"  entities={len(entities)} environment_events={len(env_events)}")


# ── helpers ─────────────────────────────────────────────────────
ORG_ORIGIN.update({"ReactionFired": "PEB", "ReactionSucceeded": "PEB", "ReactionFailed": "PEB",
                   "ReactionSuppressed": "PEB"})

def ev_causal_for_record(events, rec_id):
    # no per-record event id stored; return None (chain correlation set later)
    return None

def rec_dt(rec):
    return datetime.fromisoformat(rec["created_at"].replace("Z", "+00:00"))

def deliberation_dt(dl):
    return datetime.fromisoformat(dl["date"].replace("Z", "+00:00"))

def make_deliberation(sess, act, rec, corr, dc, evc):
    dc += 1
    dtype = random.choices(DELIB_TYPES, weights=[10, 40, 12, 20, 18])[0]
    status = random.choices(["open", "concluded", "enacted", "superseded"],
                            weights=[12, 18, 60, 10])[0]
    ddate = datetime.fromisoformat(sess["ended_at"].replace("Z", "+00:00")) + timedelta(hours=random.uniform(2, 48))
    if ddate > END:
        ddate = END - timedelta(hours=1)
    obs = {
        "deviation": f"Estimated {act['effort_estimate_h']}h vs actual {sess['duration_min']/60:.1f}h on {act['project']}.",
        "review": f"Cycle review of {act['project']}.",
        "retrospective": f"Retrospective on {act['project']} execution.",
        "hypothesis": f"Deep-work blocks raise throughput on {act['domain']}.",
        "decision-in-formation": f"Whether to automate {act['project']}.",
    }[dtype]
    return {"dc": dc, "evc": evc, "del": {
        "id": rid("DLB", dc),
        "type": dtype,
        "status": status,
        "date": iso(ddate),
        "domain": random.choice(DELIB_DOMAINS),
        "feeds": random.sample(FEEDS, random.randint(1, 2)),
        "observation": obs,
        "deliberation": "Gap between intention and outcome examined for cause.",
        "adaptation": ("Re-baseline estimates; register corrective action." if status == "enacted"
                       else "Adaptation pending conclusion." ),
        "source_session": sess["id"],
        "source_action": act["id"],
        "correlation_id": corr,
        "title": f"{dtype} · {act['project']}",
    }}

def gen_consistency(records, actions, deliberations):
    violations = []
    # policy-vs-plan: a few Blocked actions governed-by policy
    blocked = [a for a in actions if a["status"] == "Blocked"]
    for a in blocked[:8]:
        violations.append({"kind": "policy-violation", "severity": "high",
                           "subject": a["id"], "detail": f"{a['project']} conflicts with Sleep Policy (scheduled off-hours).",
                           "detected_at": a["registered_at"]})
    # resource-overrun: essential variable days where time_used > capacity (added loosely)
    # model-vs-record: a few records with Very Low confidence + Disputed -> unresolved
    low = [r for r in records if r["confidence"] == "Very Low"]
    for r in low[:6]:
        violations.append({"kind": "epistemic-gap", "severity": "medium",
                           "subject": r["id"], "detail": f"{r['content']} recorded with Very Low confidence — unresolved.",
                           "detected_at": r["created_at"]})
    # identity-drift: deliberations superseded
    sup = [d for d in deliberations if d["status"] == "superseded"]
    for d in sup[:4]:
        violations.append({"kind": "identity-drift", "severity": "low",
                           "subject": d["id"], "detail": f"{d['title'] if 'title' in d else d['type']} superseded — direction revised.",
                           "detected_at": d["date"]})
    return violations

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def weighted_record_type():
    return random.choices(RECORD_TYPES, weights=[6, 9, 26, 7, 7, 9, 6, 5, 4, 6, 5, 5, 6, 7, 4, 4, 4])[0]

def weighted_status():
    return random.choices(STATUSES, weights=[6, 30, 9, 6, 34, 10, 5])[0]

def weighted_priority():
    return random.choices(PRIORITIES, weights=[8, 20, 42, 30])[0]

def weighted_evidence():
    return random.choices(EVIDENCE, weights=[6, 16, 40, 22, 6])[0]

def weighted_action_status(kind):
    if kind in ("Objective", "Initiative"):
        return random.choices(STATUSES, weights=[4, 50, 10, 8, 18, 6, 4])[0]
    return random.choices(STATUSES, weights=[6, 28, 10, 8, 38, 6, 4])[0]

def weighted_band():
    return random.choices(CAPACITY_BANDS, weights=[30, 50, 20])[0]


ORGS = {
    "PRS":   {"name": "Personal Recording System",      "vsm": "S3", "stage": "Perception",       "color": "#3F6092"},
    "PKTS":  {"name": "Personal Keyword Tracking",      "vsm": "S3", "stage": "Perception",       "color": "#B4742A"},
    "ASRS":  {"name": "Agent Self-Representation",      "vsm": "S5", "stage": "Substrate",        "color": "#5C4E78"},
    "PTOCS": {"name": "Personal Technical Object Catalog","vsm":"S4","stage": "Situation Model",  "color": "#2D6A4F"},
    "AOOS":  {"name": "Personal Work Organization",     "vsm": "S1", "stage": "Decision/Action",  "color": "#7A1A2A"},
    "AWES":  {"name": "Automated Work Execution",       "vsm": "S1", "stage": "Execution",        "color": "#A8854A"},
    "PRAS":  {"name": "Personal Reflection & Adaptation","vsm": "S4", "stage": "Feedback",         "color": "#3F6E50"},
    "PPS":   {"name": "Personal Policy System",         "vsm": "S5", "stage": "Policy",           "color": "#641020"},
    "PEB":   {"name": "Personal Event Bus",             "vsm": "S2", "stage": "Coordination",     "color": "#C7A972"},
}

VSM_LEVELS = [
    {"code": "S5",  "name": "Policy",        "orgs": ["PPS", "ASRS"]},
    {"code": "S4",  "name": "Intelligence",  "orgs": ["PRAS", "PTOCS"]},
    {"code": "S3",  "name": "Control / Audit","orgs": ["PRS", "PKTS"]},
    {"code": "S2",  "name": "Coordination",  "orgs": ["PEB"]},
    {"code": "S1",  "name": "Operations",    "orgs": ["AOOS", "AWES"]},
]


# ── environment: entities + the 4-type event stream ─────────────
# Per spec/about.md Q&A: the world is a bounded region of state perceived
# through a time-ordered stream of discrete events of four kinds:
# occurrence (independent), outcome (consequence of the agent's action),
# trigger (time/condition-based), observational (a reading the agent takes).
ENTITY_KINDS = ["Person", "Project", "Tool", "Place", "Organization", "Topic", "Resource"]
ENTITY_NAMES = {
    "Software Engineering": ["PRS repo", "AOOS repo", "Loop dashboard", "Spectral", "ECharts", "Flask", "Search Index", "CouchDB"],
    "Research": ["R. Seth", "J. Pearl", "Attention Lab", "Embedding Drift", "Causal Inference"],
    "Health": ["Dr. Vega", "Cardio Plan", "Sleep Schedule", "Nutrition Log"],
    "Finance": ["Bank Stub", "Brokerage", "Tax Estimate", "Subscription Ledger"],
    "Learning": ["Linear Algebra", "Spectral Sequences", "Bayesian Reasoning", "University Library"],
    "Relationships": ["Family Call", "S. Group", "Mentor", "Birthday Plan"],
    "Infrastructure": ["Backup Rotation", "Mail Ingest", "Calendar Sync", "NAS", "Router"],
    "Writing": ["PVSM Essay", "Annual Review", "Weekly Reflection", "Journal"],
}


def gen_entities():
    ents = []
    n = 0
    for domain, names in ENTITY_NAMES.items():
        for name in names:
            n += 1
            ents.append({
                "id": stable_id("ENT", n),
                "name": name,
                "kind": random.choice(ENTITY_KINDS),
                "domain": domain,
                "salience": round(random.uniform(0.2, 1.0), 2),
            })
    return ents


def gen_env_events(sessions, entities):
    """The environment perceived as a time-ordered stream of discrete events."""
    events = []
    n = 0
    # index sessions by day for outcome linking
    sess_by_day = {}
    for s in sessions:
        day = datetime.fromisoformat(s["ended_at"].replace("Z", "+00:00")).date()
        sess_by_day.setdefault(day, []).append(s)

    d = START
    while d <= END:
        dw = day_weight(d)
        n_events = max(0, int(random.gauss(13, 4) * dw))
        for _ in range(n_events):
            n += 1
            etype = random.choices(
                ["occurrence", "outcome", "trigger", "observational"],
                weights=[48, 16, 14, 22])[0]
            ent = random.choice(entities)
            ts = d + timedelta(hours=random.choice(list(range(7, 24))),
                               minutes=random.randint(0, 59))
            valence = clamp(round(random.gauss(0.05 if etype != "outcome" else 0.2, 0.45), 2), -1, 1)
            mag = round(random.uniform(0.1, 1.0), 2)
            ev = {
                "id": stable_id("ENV", n),
                "type": etype,
                "entity_id": ent["id"],
                "entity_name": ent["name"],
                "kind": ent["kind"],
                "domain": ent["domain"],
                "occurred_at": iso(ts),
                "valence": valence,
                "magnitude": mag,
                "summary": _env_summary(etype, ent),
            }
            if etype == "outcome":
                ss = sess_by_day.get(d.date(), [])
                if ss:
                    s = random.choice(ss)
                    ev["source_session"] = s["id"]
                    ev["summary"] = f"outcome of work on {s.get('description', ent['name'])}"
            events.append(ev)
        d += timedelta(days=1)
    return sorted(events, key=lambda e: e["occurred_at"])


def _env_summary(etype, ent):
    return {
        "occurrence": f"{ent['name']} — independent happening ({ent['kind'].lower()})",
        "outcome": f"consequence touching {ent['name']}",
        "trigger": f"time/condition trigger from {ent['name']}",
        "observational": f"reading taken on {ent['name']}",
    }[etype]


if __name__ == "__main__":
    gen()
