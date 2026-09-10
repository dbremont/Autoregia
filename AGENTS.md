# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

Autoregia — a **Personal Viable System Model (PVSM)**: one Flask server that
mounts ~14 self-management sub-systems under URL prefixes on a single port.
See `README.md` for the system map and `logos.log.md` for the decision log.

## Layout

```
app/                 the application
├── app.py           unified server (SUBSYSTEMS registry, WSGI prefix dispatcher)
├── index.html       landing plate        ├── about.html   docs.html
├── module/          the sub-systems (prs, pkts, pais, peos, gis, pps, aias,
│                    aoos, awes, pras, asrs, acsms, loop, pwos)
│   └── <sys>/       server.py (Flask app) + static/ + data/ + tests
└── support/         shared code: storage/ (CouchDB Store), shared/
                     (focus_watcher), tools/ (prefix_assets.py), bin/
spec/                conceptual specs (spec/ui.spec = normative design spec)
design.md            style standard (tokens, typography, conformance)
img/  requirements.txt  Dockerfile  run.sh  .env (git-ignored)
```

Root plates (`index/about/docs.html`) are served from `app/`; `/img/…` is
served from the repository root.

## Commands

```sh
# run locally (8080 is often taken; the deployed container uses 8081)
AUTOREGIA_PORT=8090 python3 app/app.py

# deploy (build image + recreate container `autoregia`; requires CouchDB up)
./run.sh deploy        # also: pull | logs | stop

# tests (PEOS tests need CouchDB running on 127.0.0.1:5984)
python3 -m pytest app/module/awes/test_awes.py app/module/peos/test_peos.py

# after changing any URL prefix in app/app.py SUBSYSTEMS — MANDATORY:
python3 app/support/tools/prefix_assets.py
```

No linter is configured.

## Invariants (do not break silently)

- **URL prefixes are baked into static assets.** Renaming a prefix in
  `app/app.py` (`SUBSYSTEMS`) requires re-running `app/support/tools/prefix_assets.py`,
  or the sub-system's assets will request the old paths.
- **URL prefixes are independent of repo layout.** Moving files must not
  change any `/<prefix>/` URL.
- **Sub-system servers** expose a Flask `app` and are loaded by `app/app.py`
  via `importlib` (registered in `sys.modules` so Flask resolves each tool's
  `static_folder`). New sub-systems: add `app/module/<sys>/` + one line in
  `SUBSYSTEMS`.
- **`sys.path` inserts are `__file__`-relative.** Module code inserts the app
  root (for `from support.storage import Store`) and sometimes `module/` (for
  intra-module imports) by walking up a fixed number of `dirname`s. If you
  move files, those depths move in lockstep — count them, don't guess.
- **`support/shared/focus_watcher.py`** is the single source of truth for the
  focused window, shared by PAIS and PKTS collectors. Never fork it.
- **Design standard:** `design.md` governs every plate and sub-system UI.
  Canonical tokens: paper `#FAFAF6`, oxford `#7A1A2A`, gold
  `#A8854A`, Spectral/Inter/IBM Plex Mono. Fonts are **self-hosted**
  (`static/fonts/`) — never add CDN links. Normative spec: `spec/ui.spec`;
  reference implementation: `app/module/prs/static/`.
- **AWES DOM contract:** `app/module/awes/static/js/exec.js` addresses the
  page by fixed IDs (`env-grid`, `env-select`, `work-type`, `payload`,
  `run-btn`, `run-status`, `session-list`), classes (`env-card`, `session`,
  `badge badge-<status>`) and the CSS vars `--text-dim`, `--red`. Restyling
  AWES must keep all of these defined.

## Infrastructure

- Container `autoregia` (`ghcr.io/dbremont/autoregia:latest`, `--network
  host`, port from `AUTOREGIA_PORT` in `.env` — 8081 on this host).
- Container `couchdb` (couchdb:3) on `127.0.0.1:5984`, volume `couchdb_data`.
  Credentials in `.env` (git-ignored; see `.env.example`).
- Push to `main` → GitHub Actions builds and pushes the image to GHCR.
- `app/module/pwos/` and `*.log` are git-ignored; `pwos` also has an ignore
  rule for `config/`.

## Git conventions

- **Pre-commit hook requires marking files first:**
  `mark-for-commit <file> …` for every changed file, then `git commit`.
  The hook enforces an authorization policy and an annotation policy, and
  normalizes the commit message (history shows `type(main): message`).
- Keep commits scoped; re-verify after structural moves (see checklist).

## Post-change checklist

1. `AUTOREGIA_PORT=8090 python3 app/app.py` → all mounts return 200,
   `/api/` lists the expected sub-systems, `0` tracebacks in the log.
2. `python3 -m pytest app/module/awes/test_awes.py app/module/peos/test_peos.py`
   → 43 passed.
3. `./run.sh deploy` → curl the mount matrix on the container port; check
   `docker logs autoregia` for tracebacks.
4. Update `README.md` tree/links if the layout changed.
