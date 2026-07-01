# Automated Work Execution System — Prototype

> An **Automated Work Execution System (AWES)** bridges action selection and
> action completion — it provisions computational environments, dispatches work
> units to them, captures artifacts, and feeds results back into the agent's
> operational and reflective systems.

> Within the Autoregia Personal Viable System Model (PVSM), AWES instantiates the
> **Execution** stage of the agent control loop: it *carries out* the work that
> the deliberative cycle selects.

## Prototype

Single Flask process with an in-memory store. Executes work units via
`subprocess` — shell commands and Python scripts — and captures stdout/stderr,
exit codes, and timing. No container isolation (local, single-user use only).

### Run

```bash
python3 -m venv ../env && source ../env/bin/activate
pip install -r requirements.txt
python3 server.py
```

Open: http://localhost:5010

### API

| Endpoint | Component | Description |
| --- | --- | --- |
| `GET /api/environments` | [E] | List available execution environments |
| `GET /api/environments/<id>` | [E] | Get environment details |
| `POST /api/environments` | [E] | Register a new environment |
| `POST /api/execute` | [T] | Execute a work unit |
| `GET /api/sessions` | [A] | List execution history |
| `GET /api/sessions/<id>` | [A] | Get session details with output |
| `DELETE /api/sessions` | [A] | Clear all sessions |

### Test

```bash
pip install pytest
python3 -m pytest test_awes.py -v
```

## Structure

```
awes/
├── server.py
├── requirements.txt
├── test_awes.py
├── Dockerfile
├── docker-compose.yml
├── README.md
├── data/
│   ├── mock_environments.json
│   └── gen_mock.py
└── static/
    ├── index.html
    └── js/
        └── exec.js
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md)
- **Role:** VSM System 1 – Operations (Execution)
- **Spec:** [`../spec/awes/spec.md`](../spec/awes/spec.md)
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/),
  [PTOCS](../ptocs/), [PPS](../pps/), [PWOS](../pwos/), [PRAS](../pras/)
- **Decision log:** [`../logos.log.md`](../logos.log.md)
