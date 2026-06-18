# PRS — Personal Recording System

Web client (vanilla JS/HTML/CSS) + Python (Flask) backend over SQLite. Records
are written in **PRSL**, the formal data language defined in
[`design/gramar.ebnf`](design/gramar.ebnf). The grammar is the **source of
truth**; [`design/client.md`](design/client.md) is the source of intent.

## Status

Phase 0 (PRSL core) is complete: a faithful lexer, parser, semantic validator,
and deterministic serializer, fully unit-tested with round-trip property tests.

## Quick start

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"

.venv/bin/pytest                 # run tests
.venv/bin/ruff check .           # lint
.venv/bin/python run.py          # (dev server lands in Phase 1)
```

See [`AGENTS.md`](AGENTS.md) for the full operational guide and conventions.

## Layout

```
backend/     Python: prsl/ (parser, validator, serializer); storage/ & app.py land later
design/      Source-of-truth specs (grammar + client intent)
tests/       pytest suites, including prsl/ round-trip fixtures
data/        SQLite db + seed data (generated, not committed)
```
