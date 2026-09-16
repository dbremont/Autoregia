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
├── module/          the sub-systems (pbs, pkts, pwts, wos, gis, aias,
│                    aoos, ate, pras, acsms, loop, pwos)
│   └── <sys>/       server.py (Flask app) + static/ + data/ + tests
│       ate/         Agent Toolbox Ecosystem: hosts tools under tool/<id>/
│         └── awes/  a tool (own Flask app, mounted at /ate/tool/awes/)
│         └── gial/  a tool — design plate only, unimplemented (spec/gial/)
│         └── sarl/  a tool — design plate only, unimplemented (spec/sarl/)
└── support/         shared code: storage/ (CouchDB Store), shared/
                     (focus_watcher), tools/ (prefix_assets.py), bin/
spec/                conceptual specs (spec/ui.spec = normative design spec)
app/module/wos/config/seed.json   WOS poll specs (the watched sources;
                     spec/wos/policy.md); read directly by the server
design.md            style standard (tokens, typography, conformance)
img/  requirements.txt  Dockerfile  Makefile  .env (git-ignored)
```

Root plates (`index/about/docs.html`) are served from `app/`; `/img/…` is
served from the repository root.

## Commands

```sh
# run locally, no docker (8080 is often taken; the deployed container uses 8081)
make run               # also: make run DEV_PORT=8091

# deploy — two paths, one container (`autoregia`; requires CouchDB up):
make deploy-local      # build the local image (autoregia:local) and run it — dev/testing
make deploy-server     # pull the GHCR image CI publishes and run it — production
# also: make build | logs | stop

# tests (WOS + GIS tests need CouchDB running on 127.0.0.1:5984)
make test              # = python3 -m pytest app/module/ate/tool/awes/test_awes.py \
                       #    app/module/wos/test_wos.py app/module/gis/test_gis.py

# after changing any URL prefix in app/app.py SUBSYSTEMS — MANDATORY:
make prefix-assets
```

**Agents may only deploy with `make deploy-local`.** `make deploy-server`
pulls the production image and is reserved for the human operator.

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
  focused window, shared by PWTS and PKTS collectors. Never fork it.
- **Design standard:** `design.md` governs every plate and sub-system UI.
  Canonical tokens: paper `#FAFAF6`, oxford `#7A1A2A`, gold
  `#A8854A`, Spectral/Inter/IBM Plex Mono. Fonts are **self-hosted**
  (`static/fonts/`) — never add CDN links. Normative spec: `spec/ui.spec`;
  reference implementation: `app/module/pbs/static/`.
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
  (`wos_test_`, `gis_test_`) and never touch dev data.
- Push to `main` → GitHub Actions builds and pushes the image to GHCR.
- Deploy with `make deploy-server` (pull the GHCR image — production) or
  `make deploy-local` (build `autoregia:local` from the repo — dev/testing).
  Both recreate container `autoregia` (`--network host`, `.env` mounted
  read-only at `/srv/.env`, port from `AUTOREGIA_PORT` in `.env`).
  Coding agents may only run `make deploy-local` — never `make deploy-server`.
- `app/module/pwos/` and `*.log` are git-ignored; `pwos` also has an ignore
  rule for `config/`.

## Git conventions

Git hooks are global (`core.hooksPath = ~/configs/global/git/hooks`), not
in-repo. Commits are SSH-signed via 1Password (`op-ssh-sign`).

### Hook anatomy

- `pre-commit` runs the scripts in `pre-commit.d/` in lexical order:
  `00-authorization-policy.sh` → `01-annotation-policy.sh` →
  `02-encoding-policy.sh`. Any failure rejects the commit.
- Configuration lives beside the hooks: `annotations.conf` classifies the
  annotation tokens and lists the inspected file patterns (`FILES`).
- `prepare-commit-msg` rewrites the message to
  `type(<branch-or-Jira>): message` — `git commit -m` is NOT exempt, and
  neither is `--amend -m` (with `-m` the hook sees `COMMIT_SOURCE=message`
  and overwrites). To set a real message: commit, then bypass the hook for
  the amend:
  `git -c core.hooksPath=/dev/null commit --amend -m "<type>(<scope>): <desc>"`.
  (History shows `type(main): message` commits from `-m`-only flows.)
- `post-commit` clears `user.checkin` marks from committed files.

### Pre-commit policies

1. *Authorization* — every staged **added/copied/modified** file needs xattr
   `user.checkin=1`; mark first: `mark-for-commit <file> …`, then
   `git commit`. Deletions and rename source paths need **no** marks —
   `mark-for-commit` prints `✗ Not found` for them and that is harmless.
   The one-liner for a staged set:
   `git diff --cached --name-only | xargs mark-for-commit`.
2. *Annotations* — staged sources containing `@WORKING @FIXME @QUESTION
   @VERIFY` reject the commit (`@TODO @HACK @WORKAROUND` warn;
   `@TECH-DEBT @REFACTOR @OPTIMIZE @RATIONALE @NOTE` are informational).
   Applies only to the source patterns in `annotations.conf` (`.py`, `.js`,
   `.html`, `.css`, `.yaml`, …) — **`.md` files are not inspected**, so docs
   may mention the tokens verbatim. Fix or reword blockers before staging.
3. *Encoding* — default policy: staged text files must be UTF-8, no BOM, LF
   line endings (`dos2unix <file>` fixes CRLF). A machine-local override,
   `~/configs/global/git/hooks/.local` (`ENCODING=<value>`, git-ignored,
   never commit it), replaces the default **for every repo on that machine**.
   Gotcha: if valid UTF-8 files are rejected with *"Invalid encoding
   (expected ISO-8859-1 …)"*, the `.local` override on this machine is not
   UTF-8 — set `ENCODING=UTF-8` in that file (manually) before committing.

### Commit workflow (step by step)

1. *Inspect* — `git status`, `git diff`, `git log --oneline -5`; stage only
   intended files (`git add <paths>`), never blanket `git add .`.
2. *Authorize* — `git diff --cached --name-only | xargs mark-for-commit`
   (unmarked added/modified files reject the commit; deletions are exempt).
3. *Pre-flight* — annotation blockers and encoding: fix or reword before
   staging; UTF-8, no BOM, LF.
4. *Commit* — `git commit -m "wip"` is acceptable at this step because the
   hook rewrites the message anyway.
5. *Set the real message* — `git -c core.hooksPath=/dev/null commit
   --amend -m "<type>(<scope>): <desc>"` (bypass the hook: a plain
   `--amend -m` is rewritten too). Verify with `git log --oneline -1`
   that the message survived; never leave a hook-rewritten
   `type(main): wip` behind.
6. *Cleanup* — post-commit clears the xattr marks automatically; re-verify
   the diff after any structural moves.

- **Commit message:** `<type>(<optional scope>): <description>`; type is one of
  `feat | fix | docs | style | refactor | test | chore` (see `guideline.md`).
- Keep commits scoped; re-verify after structural moves (see checklist).

## Post-change checklist

1. `make run` → all mounts return 200,
   `/api/` lists the expected sub-systems, `0` tracebacks in the log.
2. `make test` → 76 passed.
3. `make deploy-local` → curl the mount matrix on the container port; check
   `docker logs autoregia` for tracebacks.
4. Update `README.md` tree/links if the layout changed.
