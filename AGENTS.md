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
│                    aoos, ate, pras, asrs, acsms, loop, pwos)
│   └── <sys>/       server.py (Flask app) + static/ + data/ + tests
│       ate/         Agent Toolbox Ecosystem: hosts tools under tool/<id>/
│         └── awes/  a tool (own Flask app, mounted at /ate/tool/awes/)
└── support/         shared code: storage/ (CouchDB Store), shared/
                     (focus_watcher), tools/ (prefix_assets.py), bin/
spec/                conceptual specs (spec/ui.spec = normative design spec)
config/              deployed config — peos_sources.json = PEOS sources policy
                     file (spec/peos/policy.md); seeds only an empty DB
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

# tests (PEOS + GIS tests need CouchDB running on 127.0.0.1:5984)
python3 -m pytest app/module/ate/tool/awes/test_awes.py app/module/peos/test_peos.py app/module/gis/test_gis.py

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
  `SUBSYSTEMS`. ATE-hosted tools (under `app/module/ate/tool/<id>/`) instead
  get one entry in `TOOLS` in `app/module/ate/server.py`, which mounts them
  at `/ate/tool/<id>/`.
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
- **AWES DOM contract:** `app/module/ate/tool/awes/static/js/exec.js` addresses the
  page by fixed IDs (`env-grid`, `env-select`, `work-type`, `payload`,
  `run-btn`, `run-status`, `session-list`), classes (`env-card`, `session`,
  `badge badge-<status>`) and the CSS vars `--text-dim`, `--red`. Restyling
  AWES must keep all of these defined.

## Infrastructure

- Container `autoregia` (`ghcr.io/dbremont/autoregia:latest`, `--network
  host`, port from `AUTOREGIA_PORT` in `.env` — 8081 on this host).
- Container `couchdb` (couchdb:3) on `127.0.0.1:5984`, volume `couchdb_data`.
  Credentials in `.env` (git-ignored; see `.env.example`).
- **CouchDB seeding:** each sub-system's `Store` seeds its DB from local
  `data/*.json` fixtures **only when the DB is empty** — regenerating a
  seed file does not refresh a running DB. To pick up a regenerated seed,
  drop the DB and restart the server:
  `curl -X DELETE http://admin:<password>@127.0.0.1:5984/<db>` (check the
  DB for non-seed entries first). GIS owns two DBs: `ptocs` (entries) and
  `ptocs_activity` (activity log). Test suites use isolated prefixes
  (`peos_test_`, `gis_test_`) and never touch dev data.
- Push to `main` → GitHub Actions builds and pushes the image to GHCR.
- `app/module/pwos/` and `*.log` are git-ignored; `pwos` also has an ignore
  rule for `config/`.

## Git conventions

Git hooks are global (`core.hooksPath = ~/configs/global/git/hooks`), not
in-repo. Commits are SSH-signed via 1Password (`op-ssh-sign`).

- **Commit message:** `<type>(<optional scope>): <description>`; type is one of
  `feat | fix | docs | style | refactor | test | chore` (see `guideline.md`).
- **Pre-commit policies** (run in order from `pre-commit.d/`):
  1. *Authorization* — every staged file needs xattr `user.checkin=1`;
     mark first: `mark-for-commit <file> …`, then `git commit`.
  2. *Annotations* — staged sources containing `@WORKING @FIXME @QUESTION
     @VERIFY` reject the commit (`@TODO @HACK @WORKAROUND` warn; `@TECH-DEBT
     @REFACTOR @OPTIMIZE @RATIONALE @NOTE` are informational). Applies to the
     source patterns in `annotations.conf` (`.py`, `.js`, `.html`, `.css`, …).
  3. *Encoding* — staged text files must be UTF-8, no BOM, LF line endings
     (`dos2unix <file>` fixes CRLF).
- **`prepare-commit-msg` rewrites the message** to
  `type(<branch-or-Jira>): message` — `git commit -m` is NOT exempt, and
  neither is `--amend -m` (with `-m` the hook sees `COMMIT_SOURCE=message`
  and overwrites). To set a real message: commit, then bypass the hook for
  the amend:
  `git -c core.hooksPath=/dev/null commit --amend -m "<type>(<scope>): <desc>"`.
  (History shows `type(main): message` commits from `-m`-only flows.)
- **Post-commit** clears `user.checkin` marks from committed files.
- **Commit workflow (step by step):**
  1. *Inspect* — `git status`, `git diff`, `git log --oneline -5`; stage only
     intended files (`git add <paths>`), never blanket `git add .`.
  2. *Authorize* — `mark-for-commit <file> …` for every staged file (sets
     xattr `user.checkin=1`; unmarked files reject the commit).
  3. *Pre-flight* — annotation policy: sources containing `@WORKING @FIXME
     @QUESTION @VERIFY` block the commit — fix or reword before staging.
     Encoding: UTF-8, no BOM, LF (`dos2unix <file>` if needed).
  4. *Commit* — `git commit -m "wip"` is acceptable at this step because the
     hook rewrites the message anyway.
  5. *Set the real message* — `git -c core.hooksPath=/dev/null commit
     --amend -m "<type>(<scope>): <desc>"` (bypass the hook: a plain
     `--amend -m` is rewritten too). Verify with `git log --oneline -1`
     that the message survived; never leave a hook-rewritten
     `type(main): wip` behind.
  6. *Cleanup* — post-commit clears the xattr marks automatically; re-verify
     the diff after any structural moves.
- Keep commits scoped; re-verify after structural moves (see checklist).

## Post-change checklist

1. `AUTOREGIA_PORT=8090 python3 app/app.py` → all mounts return 200,
   `/api/` lists the expected sub-systems, `0` tracebacks in the log.
2. `python3 -m pytest app/module/ate/tool/awes/test_awes.py app/module/peos/test_peos.py app/module/gis/test_gis.py`
   → 62 passed.
3. `./run.sh deploy` → curl the mount matrix on the container port; check
   `docker logs autoregia` for tracebacks.
4. Update `README.md` tree/links if the layout changed.
