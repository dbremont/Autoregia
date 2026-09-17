# Autoregia — project operations.
#
#   make deploy-local    build the local image and run the container (dev/testing)
#   make deploy-server   pull the GHCR image CI publishes and run it (production)
#
# Deploys require Docker and CouchDB running on 127.0.0.1:5984.

CONTAINER   := autoregia
LOCAL_IMAGE := autoregia:local
GHCR_IMAGE  := ghcr.io/dbremont/autoregia:latest

# Port for the dev server (`make run`) — kept distinct from the deployed
# container's port so it never collides with it.
DEV_PORT ?= 8090

# Repo-local defaults (.env is git-ignored). Loaded at parse time; explicit
# `make AUTOREGIA_PORT=...` overrides still win.
AUTOREGIA_PORT ?= 8080
-include .env
export

ifneq (,$(wildcard .env))
ENV_MOUNT := -v $(CURDIR)/.env:/srv/.env:ro
endif

.PHONY: help run test build deploy-local deploy-server logs stop prefix-assets

help: ## list targets
	@grep -E '^[a-zA-Z_-]+:.*## ' Makefile | awk 'BEGIN {FS = ":.*## "}; {printf "  %-15s %s\n", $$1, $$2}'

run: ## local dev server, no docker (port DEV_PORT, default 8090)
	AUTOREGIA_PORT=$(DEV_PORT) python3 app/app.py

test: ## pytest ces + ctes + wos + gis suites (needs CouchDB on 127.0.0.1:5984)
	python3 -m pytest app/module/ate/tool/ces/test_ces.py app/module/ate/tool/ctes/test_ctes.py app/module/wos/test_wos.py app/module/gis/test_gis.py

build: ## docker build the local image (autoregia:local)
	docker build -t $(LOCAL_IMAGE) .

deploy-local: build ## build the local image and recreate container autoregia
	$(call run_container,$(LOCAL_IMAGE))

deploy-server: ## pull the GHCR image and recreate container autoregia
	docker pull $(GHCR_IMAGE)
	$(call run_container,$(GHCR_IMAGE))

logs: ## follow container autoregia logs
	docker logs -f $(CONTAINER)

stop: ## stop and remove container autoregia
	docker rm -f $(CONTAINER) 2>/dev/null || true

prefix-assets: ## re-bake URL prefixes into static assets (after SUBSYSTEMS changes)
	python3 app/support/tools/prefix_assets.py

# Shared by both deploy targets: same semantics as the old run.sh — host
# network, restart policy, AUTOREGIA_PORT passed explicitly, .env mounted
# read-only at /srv/.env (app/app.py load_dotenvs it; real env vars win).
define run_container
	docker rm -f $(CONTAINER) 2>/dev/null || true
	docker run -d --name $(CONTAINER) --restart unless-stopped \
		--network host \
		-e AUTOREGIA_PORT="$(AUTOREGIA_PORT)" \
		$(ENV_MOUNT) \
		$(1)
endef
