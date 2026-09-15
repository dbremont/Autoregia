# Autoregia

> Autoregia is a self-management system — a **Personal Viable System Model (PVSM)**.

> Self-management is the praxis of constructing and sustaining an agential hierarchy—perception, ideation, goal formation, action, and reflection—so that operative processes evolve from implicit, unexamined routines into explicit, intelligible, and systematically steerable structures.

> A self-management system is a recursive regulatory architecture through which an individual monitors, organizes, and steers their perceptual, cognitive, and behavioral processes, converting implicit routines into explicit and adaptively controlled operations.

Autoregia decomposes self-management into a set of cooperating systems, each mapped to a level of the Viable System Model. Some systems are materialized as dedicated tools developed in this workspace; others are satisfied by existing tools or documents.

> **Start here:** [`app/index.html`](app/index.html) — the project landing page.

---

## Repository Layout

```
Autoregia/
├── README.md            # this document (about)
├── design.md            # style standard for every plate and module UI
├── logos.log.md         # decision & design log
├── spec/                # conceptual specifications of every sub-system
├── config/              # deployed configuration — peos_sources.json (PEOS tracked sources, spec/peos/policy.md)
├── img/                 # images (control-loop diagrams, …)
├── requirements.txt     # root application dependencies
├── Dockerfile, Makefile  # deployment (build + run the unified container)
└── app/                 # the application
    ├── app.py           # unified server — mounts every module under /<prefix>/
    ├── index.html       # project landing / index page
    ├── about.html       # the system described in full
    ├── docs.html        # documentation plate
    ├── ags/, gwob/, pks/ # landing plates: AGS + policies, GWOB gateway, PKS (conceived)
    ├── module/          # all materialized sub-systems
    │   ├── pbs/         # Personal Binnacle System
    │   │   ├── README.md
    │   │   ├── spec.md
    │   │   ├── server.py
    │   │   ├── requirements.txt
    │   │   ├── data/
    │   │   └── static/
    │   ├── pkts/        # Personal Keyword Tracking System
    │   ├── pwts/        # Personal Workstation Tracking System
    │   ├── peos/        # Personal External Observation System
    │   │   ├── README.md
    │   │   ├── server.py    # Flask API + CouchDB persistence
    │   │   ├── collector.py # poller daemon
    │   │   ├── analytics.py # sense-making aggregations
    │   │   ├── clustering.py# topic clustering (embeddings / lexical)
    │   │   ├── sources/     # Hacker News, Lobsters, Reddit, Mastodon, GDELT
    │   │   ├── data/
    │   │   ├── static/
    │   │   └── test_peos.py
    │   ├── ate/         # Agent Toolbox Ecosystem — hosts tools under tool/
    │   │   ├── server.py    # toolbox registry + /ate/tool/<id>/ mounting
    │   │   └── tool/       # tools mounted at /ate/tool/<id>/
    │   │       ├── awes/  #   Automated Work Execution System
    │   │       └── gial/  #   General Integration Abstraction Layer (plate only)
    │   └── ...          # gis, aias, aoos, pras, acsms, loop, pwos
    └── support/         # everything that supports the modules
        ├── storage/     # shared CouchDB document store (Store)
        ├── shared/      # shared Python package (focus_watcher, …)
        ├── tools/       # repo tooling (asset prefixing)
        └── bin/         # standalone utility scripts
```

---

## Formulation

- Information Catalog System: Source, Document
- Agency Grounding System (AGS)
- Note: The dayly - links - papers - etc- should be handdle by the PBS.
- ...

| **Part** | **Description** | **Level (VSM)** | **Implementation** |
| --- | --- | --- | --- |
| **Policy System** | Defines long-term direction, identity, principles, constraints, commitments, and life-policy. | **System 5 – Policy** | Personal Constitution, Core Values Document, Life Strategy Note  (Agency Grounding System (AGS)) |
| **Intelligence System** | Scans environment, synthesizes information, learns, anticipates, and adapts strategies. | **System 4 – Intelligence** | General Index System (GIS),  Research Notes, Learning Pipeline, Annual Review, **Documentation System** |
| **Documentation System** | Stores explicit knowledge, processes, references, and decision records; forms the agent's external memory. | **System 4 – Intelligence** | Notion, Obsidian, Logseq |
| **Control System** | Priority-setting, scheduling, load management, and day-to-day steering of behavior. | **System 3 – Control** | Daily Planner, Weekly Review, Time-Blocking Sheet |
| **Accounting System** | Tracks resource usage (time, money, energy, attention) and monitors constraints. | **System 3 – Audit / Accounting** | Quicken, Time-Tracking Apps, Energy Logs, **PBS**, **PKTS**, **PWTS** |
| **Audit System** | Performs diagnostic checks, detects deviations, evaluates performance, and ensures compliance with standards. | **System 3 – Audit** | Monthly Review Template, Error Logs, KPIs |
| **Task Management Assistance System** (Agential Operating Management System) | Organizes Action Constructs (projects, tasks, routines), maintains the work inventory, and supports execution. | **System 1 – Operations** | Trello, Todoist, Asana |
| **Notification System** | Ensures timely external triggers for commitments, reminders, and events. | **System 2 – Coordination** | Google Calendar, Alarms |
| **Coordination System** | Resolves conflicts, harmonizes schedules, syncs across domains, avoids overload. | **System 2 – Coordination** | Calendar + Integrations, Workflow Rules |
| **Execution System** | Physical and cognitive tools used to perform work (doing, writing, computing, communicating). | **System 1 – Operations** | Laptop, IDEs, Email, Physical Workspace |
| **Inventory System** | Maintains a structured registry of assets, capabilities, commitments, reference objects, and actionable resources (material, digital, cognitive); supports availability, reuse, and capacity awareness. | **System 3 – Control (Resource Visibility)** | Asset Register, Knowledge Index, Tooling Catalog, Reading Lists, Software & Subscription Ledger |

---

## Materialized Sub-systems

The sub-systems developed within this workspace:

- **[Personal Binnacle System (PBS)](app/module/pbs/README.md)** — the Accounting System component; a technical object that externalizes relevant states for persistent recording, discovery, and retrieval. See the PBS [specification](app/module/pbs/spec.md) and [implementation](app/module/pbs/README.md#prototype).
- **[Personal Keyword Tracking System (PKTS)](app/module/pkts/README.md)** — a sibling accounting component tracking resource usage and keyword attention.
- **[Personal Workstation Tracking System (PWTS)](app/module/pwts/README.md)** — a sibling accounting component recording mouse/focus interaction and joining it with PKTS keystrokes to surface application-interaction analytics (time-per-app, click-rate, app-switch frequency, focus fragmentation). Shares [`app/support/shared/focus_watcher.py`](app/support/shared/) as the single source of truth for the focused window with PKTS.
- **[Personal External Observation System (PEOS)](app/module/peos/README.md)** — the **Perception** sub-system (VSM System 4 – Intelligence): collects what *other agents* say about the world from free, no-auth public feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT) and persists each item as an `observational` event in CouchDB, with batch topic clustering and a sense-making analytics overlay (volume, spikes, trending, tone). The external-world complement of PBS. Aggregated, with PKTS and PWTS, under the **[General World Observation System (GWOB)](/gwob/)** gateway. See the PEOS [specification](spec/peos/spec.md) and [implementation](app/module/peos/README.md#run).
- **[General Index System (GIS)](app/module/gis/README.md)** — the Intelligence System component; a general index of everything the agent knows and uses — each entry a point → element pair pointing into the systems or out to the world (GitHub projects, documents, services). The entry point to everything.
- **[Agency Grounding System (AGS)](app/ags/index.html)** — the grounding substrate (in the model, not yet built): binds the World boundary, the Self Model, and Policy into one coherent stance. Its **policy corpus** is live — [charter](app/ags/policies/charter.html), principles, values, commitments, and domain policies (health, learning, conduct) under `app/ags/policies/`, served at `/ags/policies/…`.
- **[Agent Operation Organization System (AOOS)](app/module/aoos/README.md)** — the Operations System component (VSM System 1); organizes action constructs (tasks, projects, routines, commitments) over PBS records, with a dependency graph, calendarization (conflict detection, workload), and Google Calendar two-way sync. Includes a working prototype.

> The design rationale and decision log live in [`logos.log.md`](logos.log.md).

---

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
- [Autoregia * Project](https://app.notion.com/p/Autoregia-390e2010b23f80b392b5d1621c10de0c?v=2a6e2010b23f81c0a027000c38d7f8d2&source=copy_link)
