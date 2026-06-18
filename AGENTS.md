# AGENTS.md

Operational guide for agents working in this repository.

## Project

**PRS — Personal Recording System.** Web client (vanilla JS/HTML/CSS) + Python
(Flask) backend over SQLite. Records are written in **PRSL**, the formal data
language defined in [`design/gramar.ebnf`](design/gramar.ebnf). The grammar is
the **source of truth**; [`design/client.md`](design/client.md) is the source of
intent. When they disagree, the grammar wins.

## Environment

- Python 3.12+, in a project venv at `.venv/`.
- Frontend is framework-less (vanilla JS + ES modules); no build step.

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
```

## Common commands

Run everything from the repo root with the venv python.

| Task                | Command                          |
| ------------------- | -------------------------------- |
| Run the dev server  | `.venv/bin/python run.py`        |
| Run tests           | `.venv/bin/pytest`               |
| Lint                | `.venv/bin/ruff check .`         |
| Format / auto-fix   | `.venv/bin/ruff check --fix .`   |
| Type check (none)   | _(no type-checker configured)_   |

**Always run lint and tests before considering work done.**

## Layout

```
backend/     Python: prsl/ (parser, validator, serializer), storage/, app.py
static/      Frontend: HTML/CSS/JS, served by Flask
design/      Source-of-truth specs (grammar + client intent)
tests/       pytest suites, including prsl/ round-trip fixtures
data/        SQLite db + seed data (generated, not committed)
```

## Conventions

- **Naming**: kebab-case everywhere (`execution-state`, `created-at`), mirroring
  the grammar. Do not introduce camelCase in the data model.
- **Canonical storage**: JSON columns + a PRSL text mirror; records are parsed
  and validated against the grammar on every write.
- **Records are immutable**: edits create a new revision; never overwrite.
- **Tests**: any change to `backend/prsl/` must keep
  `tests/prsl/test_roundtrip.py` green (parse → serialize → parse is stable).
- **No comments** in code unless asked.
