# Autoregia

> Autoregia is a self-management system — a **Personal Viable System Model (PVSM)**.

> Self-management is the praxis of constructing and sustaining an agential hierarchy—perception, ideation, goal formation, action, and reflection—so that operative processes evolve from implicit, unexamined routines into explicit, intelligible, and systematically steerable structures.

> A self-management system is a recursive regulatory architecture through which an individual monitors, organizes, and steers their perceptual, cognitive, and behavioral processes, converting implicit routines into explicit and adaptively controlled operations.

Autoregia decomposes self-management into a set of cooperating systems, each mapped to a level of the Viable System Model. Some systems are materialized as dedicated tools developed in this workspace; others are satisfied by existing tools or documents.

> **Start here:** [`index.html`](index.html) — the project landing page.

---

## Repository Layout

```
Autoregia/
├── README.md            # this document (about)
├── index.html           # project landing / index page
├── logos.log.md         # decision & design log
├── records_schema.json  # shared record JSON Schema (PRS / PKTS)
├── prs/                 # Personal Recording System (sub-project)
│   ├── README.md
│   ├── spec.md
│   ├── server.py
│   ├── requirements.txt
│   ├── data/
│   └── static/
└── pkts/                # Personal Keyword Tracking System (sub-project)
    └── README.md
```

---

## Formulation

| **Part** | **Description** | **Level (VSM)** | **Implementation** |
| --- | --- | --- | --- |
| **Policy System** | Defines long-term direction, identity, principles, constraints, commitments, and life-policy. | **System 5 – Policy** | Personal Constitution, Core Values Document, Life Strategy Note |
| **Intelligence System** | Scans environment, synthesizes information, learns, anticipates, and adapts strategies. | **System 4 – Intelligence** | Research Notes, Learning Pipeline, Annual Review, **Documentation System** |
| **Documentation System** | Stores explicit knowledge, processes, references, and decision records; forms the agent's external memory. | **System 4 – Intelligence** | Notion, Obsidian, Logseq |
| **Control System** | Priority-setting, scheduling, load management, and day-to-day steering of behavior. | **System 3 – Control** | Daily Planner, Weekly Review, Time-Blocking Sheet |
| **Accounting System** | Tracks resource usage (time, money, energy, attention) and monitors constraints. | **System 3 – Audit / Accounting** | Quicken, Time-Tracking Apps, Energy Logs, **PRS**, **PKTS** |
| **Audit System** | Performs diagnostic checks, detects deviations, evaluates performance, and ensures compliance with standards. | **System 3 – Audit** | Monthly Review Template, Error Logs, KPIs |
| **Task Management Assistance System** (Agential Operating Management System) | Organizes Action Constructs (projects, tasks, routines), maintains the work inventory, and supports execution. | **System 1 – Operations** | Trello, Todoist, Asana |
| **Notification System** | Ensures timely external triggers for commitments, reminders, and events. | **System 2 – Coordination** | Google Calendar, Alarms |
| **Coordination System** | Resolves conflicts, harmonizes schedules, syncs across domains, avoids overload. | **System 2 – Coordination** | Calendar + Integrations, Workflow Rules |
| **Execution System** | Physical and cognitive tools used to perform work (doing, writing, computing, communicating). | **System 1 – Operations** | Laptop, IDEs, Email, Physical Workspace |
| **Inventory System** | Maintains a structured registry of assets, capabilities, commitments, reference objects, and actionable resources (material, digital, cognitive); supports availability, reuse, and capacity awareness. | **System 3 – Control (Resource Visibility)** | Asset Register, Knowledge Index, Tooling Catalog, Reading Lists, Software & Subscription Ledger |

---

## Materialized Sub-systems

The sub-systems developed within this workspace:

- **[Personal Recording System (PRS)](prs/README.md)** — the Accounting System component; a technical object that externalizes relevant states for persistent recording, discovery, and retrieval. See the PRS [specification](prs/spec.md), [record schema](records_schema.json), and [implementation](prs/README.md#prototype).
- **[Personal Keyword Tracking System (PKTS)](pkts/README.md)** — a sibling accounting component tracking resource usage and keyword attention.

> The design rationale and decision log live in [`logos.log.md`](logos.log.md).

---

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
