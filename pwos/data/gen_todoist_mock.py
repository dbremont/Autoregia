"""
PWOS Analytics Dashboard — deterministic Todoist-style dataset generator.

Produces a synthetic `app.todoist`-shaped dataset that the Analytics Dashboard
(spec/pwos/analytics.md) computes over. Fake by design: realistic seasonality,
weekday/weekend rhythm, completion delay, and overdue backlog — but seeded so
every run yields identical output.

Output: data/mock_todoist.json  -> { meta, projects, items, labels }

Run:    python3 pwos/data/gen_todoist_mock.py
"""
import json
import os
import random
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(__file__)
OUT_PATH = os.path.join(HERE, "mock_todoist.json")
SEED = 20260629
USER_ID = "4298376"

# "Today" for the dataset. Anchored so the dashboard's default 30-day window
# shows a rich, recent tail.
BASE = datetime(2026, 6, 29, 18, 0, 0, tzinfo=timezone.utc)
YEAR_START = datetime(BASE.year, 1, 1, tzinfo=timezone.utc)
SPAN_DAYS = (BASE - YEAR_START).days + 1  # how far back the history reaches

# Todoist palette (name -> hex), a subset of the real product colors.
COLORS = [
    ("berry_red", "#B8255F"), ("red", "#DB4035"), ("orange", "#FF9933"),
    ("yellow", "#FAD000"), ("olive_green", "#afb83b"), ("lime_green", "#7ecc49"),
    ("green", "#299438"), ("mint_green", "#6accbc"), ("teal", "#158fad"),
    ("sky_blue", "#14aaf5"), ("blue", "#3F6092"), ("grape", "#96436e"),
    ("violet", "#9056a4"), ("lavender", "#a28ae5"), ("magenta", "#c975d6"),
    ("salmon", "#ff8d85"), ("charcoal", "#808080"), ("grey", "#b8b8b8"),
]

# A realistic spread of work areas, each becoming a top-level project group.
# Names mirror the kinds of things a single technical operator actually tracks.
PROJECT_TREE = [
    ("Autoregia", [
        ("PRS — Recording System", "blue"),
        ("PWOS — Work Organization", "blue"),
        ("PKTS — Knowledge System", "teal"),
        ("PTOCS — Capability Catalog", "green"),
        ("PPS — Policy Corpus", "grape"),
        ("Autoregia UI Design System", "violet"),
    ]),
    ("Engineering", [
        ("bremontix.xyz — Lab Site", "sky_blue"),
        ("Indexer & Search", "teal"),
        ("Inbox & Capture", "orange"),
        ("Analytics Experiments", "mint_green"),
    ]),
    ("Research", [
        ("VSM Reading", "salmon"),
        ("Agency Ontology", "berry_red"),
        ("Self-Management Notes", "magenta"),
    ]),
    ("Health", [
        ("Strength & Mobility", "olive_green"),
        ("Sleep Hygiene", "lime_green"),
        ("Nutrition Log", "green"),
    ]),
    ("Life Admin", [
        ("Finance & Budget", "yellow"),
        ("Home & Maintenance", "charcoal"),
        ("Correspondence", "grey"),
        ("Travel Planning", "lavender"),
    ]),
]

# Label pool. Each is given a weighting so the distribution is long-tailed.
LABEL_POOL = [
    ("@deep", "#3F6092", 22), ("@shallow", "#8C877B", 18), ("@errand", "#B4742A", 9),
    ("@code", "#3F6092", 15), ("@write", "#962030", 11), ("@read", "#7A1A2A", 10),
    ("@review", "#6B5B95", 7), ("@sync", "#2D6A4F", 6), ("@plan", "#A8854A", 8),
    ("eng", "#3F6092", 14), ("research", "#7A1A2A", 9), ("ops", "#B4742A", 6),
    ("health", "#2D6A4F", 7), ("admin", "#808080", 5), ("low-energy", "#8C877B", 4),
]

# Templates used to synthesize item content. {p} expands to the project name.
ITEM_TEMPLATES = [
    "Implement {x} for {p}",
    "Draft spec: {x} — {p}",
    "Review PR — {x}",
    "Reply to thread on {x}",
    "Refactor {x} module",
    "Fix flaky test in {x}",
    "Outline chapter on {x}",
    "Read paper: {x}",
    "Weekly review ({p})",
    "Plan sprint for {p}",
    "Annotate notes — {x}",
    "Clean up inbox — {p}",
    "Backup {x}",
    "Schedule dentist ({x})",
    "Pay {x} bill",
    "Deploy {x} to staging",
    "Sketch UI for {x}",
    "Pair on {x}",
    "Audit {x} for policy",
    "Index {x} corpus",
]
X_WORDS = [
    "search", "indexer", "schema", "registry", "dashboard", "calendar",
    "sync adapter", "OAuth flow", "recurrence rules", "capacity model",
    "conflict detector", "hierarchy tree", "command palette", "design tokens",
    "weekly review", "backup script", "deploy pipeline", "annotation log",
    "dependency graph", "policy gate", "effort estimate", "label taxonomy",
    "Q2 close", "annual review", "strength session", "mobility drill",
    "sleep window", "grocery run", "rent", "internet", "tax docs",
]


def iso(dt):
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def date_only(dt):
    return dt.date().isoformat()


def rand_color(rnd):
    name, hx = rnd.choice(COLORS)
    return name, hx


def build_projects(rnd):
    projects = []
    pid = 21_000_000
    for group_name, children in PROJECT_TREE:
        # group is a real (archived-flag-off) top-level project used as parent
        gname, ghex = group_name, next((c for n, c in COLORS if n == "grey"), "#808080")[1]
        pid += 13
        parent_id = str(pid)
        projects.append({
            "id": parent_id, "name": group_name, "color": "grey",
            "color_hex": "#808080", "is_favorite": group_name in ("Autoregia", "Engineering"),
            "is_archived": False, "parent_id": None, "view_style": "list",
        })
        for cname, ccolor in children:
            pid += 17
            chex = next((h for n, h in COLORS if n == ccolor), "#3F6092")
            projects.append({
                "id": str(pid), "name": cname, "color": ccolor, "color_hex": chex,
                "is_favorite": rnd.random() < 0.3, "is_archived": False,
                "parent_id": parent_id, "view_style": rnd.choice(["list", "board"]),
            })
    return projects


def build_labels(rnd):
    out = []
    lid = 1_500_000
    for name, hx, _w in LABEL_POOL:
        lid += 41
        out.append({"id": str(lid), "name": name, "color": "grey", "color_hex": hx, "item_count": 0})
    return out


def _seasonality(day_index):
    """Return a multiplier on base activity for the given day-of-year.

    Gentle yearly wave: dip in summer (Jul/Aug), peak in autumn (Sep-Nov) and
    a New-Year push. Plus weekday/weekend weighting applied by the caller.
    """
    import math
    # day_index 0 = Jan 1. Phase the cosine so the trough is ~day 210 (late Jul).
    yearly = 1.0 + 0.35 * math.cos((day_index - 300) * 2 * math.pi / 365.0)
    return max(0.4, yearly)


def _pick_labels(rnd, label_ids_with_weights, k):
    # weighted sample without replacement
    pool = list(label_ids_with_weights)
    rnd.shuffle(pool)
    picks = []
    total = sum(w for _, w in pool)
    for _ in range(min(k, len(pool))):
        r = rnd.random() * total
        upto = 0
        for i, (lid, w) in enumerate(pool):
            upto += w
            if upto >= r:
                picks.append(lid)
                pool.pop(i)
                total -= w
                break
    return picks


def build_items(rnd, projects, labels):
    """Synthesize ~SPAN_DAYS of activity.

    For each day we draw a base number of items CREATED; a fraction are also
    COMPLETED that same day, and a fraction of previously-open items get closed
    (creating realistic completion lag).
    """
    items = []
    iid = 990_000_000
    label_index = {l["name"]: (l["id"], l["color_hex"]) for l in labels}
    label_pool = [(l["id"], _w) for l, (_, _, _w) in zip(labels, LABEL_POOL)]
    leaf_projects = [p for p in projects if p["parent_id"] is not None]

    open_pool = []  # list of item dicts currently open (waiting to be completed)
    priority_weights = [(1, 0.08), (2, 0.18), (3, 0.42), (4, 0.32)]

    for d in range(SPAN_DAYS):
        day = YEAR_START + timedelta(days=d)
        dow = day.weekday()  # Mon=0 .. Sun=6
        is_weekend = dow >= 5
        # Base creation rate, modulated by seasonality + weekend dip.
        mult = _seasonality(d) * (0.45 if is_weekend else 1.0)
        # Slight upward drift over the year (more on the plate recently).
        drift = 1.0 + 0.4 * (d / SPAN_DAYS)
        created_today = max(0, int(round(rnd.gauss(11, 3) * mult * drift)))
        completed_today = max(0, int(round(rnd.gauss(9, 2.5) * mult * drift)))

        for _ in range(created_today):
            iid += 7
            proj = rnd.choice(leaf_projects)
            tmpl = rnd.choice(ITEM_TEMPLATES)
            content = tmpl.format(p=proj["name"], x=rnd.choice(X_WORDS))
            prio = next(iter_weighted(rnd, priority_weights))
            hour = rnd.choice([7, 8, 9, 9, 10, 10, 11, 14, 14, 15, 16,
                               16, 17, 20, 21, 22]) if not is_weekend else rnd.choice([9, 10, 11, 20, 21])
            created = day + timedelta(hours=hour, minutes=rnd.randint(0, 59))
            has_due = rnd.random() < 0.55
            if has_due:
                # Due dates span a realistic range; ~2/3 land within reach of
                # the operator's completion lag, the rest stretch the deadline.
                due_lag = max(1, int(abs(rnd.gauss(18, 14))))
                due = date_only(day + timedelta(days=due_lag))
            else:
                due = None
            labels_for_item = _pick_labels(rnd, label_pool, rnd.randint(0, 3))
            label_names = [name for name, (lid, hx) in label_index.items()
                           if lid in labels_for_item]
            item = {
                "id": str(iid), "content": content, "project_id": proj["id"],
                "section_id": None, "priority": prio,
                "labels": label_names,
                "due_date": due, "is_recurring": rnd.random() < 0.08,
                "created_at": iso(created), "completed_at": None,
                "is_completed": False, "user_id": USER_ID,
                # ~1 in 7 items is "stuck" — resists closure, producing a
                # realistic aging tail in the open backlog.
                "_stuck": rnd.random() < 0.14,
            }
            items.append(item)
            open_pool.append(item)

        # Close some previously-open items (with realistic lag), but never in
        # the future, and leave a tail of overdue items open for the dashboard.
        # Close oldest-first (FIFO-ish) so completion lag is realistic; stuck
        # items resist closure and produce an aging tail in the backlog.
        rnd.shuffle(open_pool)
        open_pool.sort(key=lambda it: it["created_at"])
        to_close = min(completed_today, len(open_pool))
        closed = 0
        for it in list(open_pool):  # iterate oldest-first
            if closed >= to_close:
                break
            if it.get("_stuck"):
                continue
            comp_day = day + timedelta(hours=rnd.choice([8, 9, 10, 11, 14, 15, 16, 17, 20, 21]),
                                       minutes=rnd.randint(0, 59))
            if comp_day > BASE:
                continue
            it["completed_at"] = iso(comp_day)
            it["is_completed"] = True
            closed += 1
        open_pool = [it for it in open_pool if not it.get("is_completed")]

    # Strip the internal _stuck flag before serialization.
    for it in items:
        it.pop("_stuck", None)
    return items


def iter_weighted(rnd, weighted):
    """Yield a single item from a [(value, weight)] list, respecting weights."""
    total = sum(w for _, w in weighted)
    r = rnd.random() * total
    upto = 0
    for v, w in weighted:
        upto += w
        if upto >= r:
            yield v
            return
    yield weighted[-1][0]


def denormalize_label_counts(items, labels):
    counts = {l["id"]: 0 for l in labels}
    name_to_id = {l["name"]: l["id"] for l in labels}
    for it in items:
        for nm in it["labels"]:
            lid = name_to_id.get(nm)
            if lid:
                counts[lid] += 1
    for l in labels:
        l["item_count"] = counts[l["id"]]


def main():
    rnd = random.Random(SEED)
    projects = build_projects(rnd)
    labels = build_labels(rnd)
    items = build_items(rnd, projects, labels)
    denormalize_label_counts(items, labels)

    payload = {
        "meta": {
            "source": "synthetic (gen_todoist_mock.py)",
            "seed": SEED,
            "generated_at": iso(BASE),
            "today": iso(BASE),
            "user_id": USER_ID,
            "counts": {"projects": len(projects), "items": len(items), "labels": len(labels)},
        },
        "projects": projects,
        "items": items,
        "labels": labels,
    }
    with open(OUT_PATH, "w") as f:
        json.dump(payload, f, indent=2)
    open_count = sum(1 for it in items if not it["is_completed"])
    print(f"Wrote {len(projects)} projects, {len(items)} items ({open_count} open), "
          f"{len(labels)} labels -> {OUT_PATH}")


if __name__ == "__main__":
    main()
