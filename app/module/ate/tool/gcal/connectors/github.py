"""github connector — hosted git (git-host type).

Searches (repos, issues) plus two guarded writes (release, repository
dispatch). Public reads work keyless; a PAT lifts rate limits. Rate-limit
exhaustion (403 with an empty quota) classifies retryable, not auth failure.
"""
import json
import urllib.parse

import base

ID = "github"
NAME = "GitHub"
SUMMARY = "Repos, issues, releases, dispatches — public reads keyless."
TYPE = "git-host"
AUTH_SCHEME = "bearer"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "base_url", "type": "text", "required": False,
     "default": "https://api.github.com",
     "description": "API base (github.com or a GHES host)"},
    {"name": "timeout_s", "type": "number", "required": False, "default": 20,
     "description": "per-request timeout in seconds"},
]
CREDENTIALS_SCHEMA = [
    {"name": "token", "type": "password", "required": False, "default": "",
     "description": "personal access token — optional for public reads, lifts rate limits"},
]

ACTIONS = [
    {"id": "search_repos", "kind": "search", "summary": "search repositories",
     "params": [
         {"name": "q", "type": "text", "required": True, "default": "",
          "description": "GitHub search query"},
         {"name": "limit", "type": "number", "required": False, "default": 5,
          "description": "max repos (1-30)"},
     ]},
    {"id": "search_issues", "kind": "search", "summary": "search issues and PRs",
     "params": [
         {"name": "q", "type": "text", "required": True, "default": "",
          "description": "GitHub search query"},
         {"name": "limit", "type": "number", "required": False, "default": 5,
          "description": "max issues (1-30)"},
     ]},
    {"id": "create_release", "kind": "action", "summary": "publish a release",
     "confirm": True,
     "params": [
         {"name": "repo", "type": "text", "required": True, "default": "",
          "description": "owner/name"},
         {"name": "tag", "type": "text", "required": True, "default": "",
          "description": "tag name"},
         {"name": "name", "type": "text", "required": False, "default": "",
          "description": "release title (defaults to the tag)"},
         {"name": "body", "type": "text", "required": False, "default": "",
          "description": "release notes (markdown)"},
         {"name": "confirm", "type": "boolean", "required": True,
          "default": False, "description": "publishing is public — confirm"},
     ]},
    {"id": "dispatch", "kind": "action", "summary": "fire a repository_dispatch event",
     "confirm": True,
     "params": [
         {"name": "repo", "type": "text", "required": True, "default": "",
          "description": "owner/name"},
         {"name": "event_type", "type": "text", "required": True, "default": "",
          "description": "the event type workflows listen for"},
         {"name": "payload", "type": "text", "required": False, "default": "",
          "description": "client_payload as a JSON object"},
         {"name": "confirm", "type": "boolean", "required": True,
          "default": False, "description": "triggers CI — confirm"},
     ]},
]


class Handler(base.Connector):
    ID = ID
    NAME = NAME
    SUMMARY = SUMMARY
    TYPE = TYPE
    AUTH_SCHEME = AUTH_SCHEME
    STATUS = STATUS
    SETUP_SCHEMA = SETUP_SCHEMA
    CREDENTIALS_SCHEMA = CREDENTIALS_SCHEMA

    def actions(self):
        return ACTIONS

    def classify(self, outcome):
        if outcome.get("ok"):
            return base.OK
        status = outcome.get("status")
        if status in (401, 403):
            headers = outcome.get("headers") or {}
            remaining = str(headers.get("x-ratelimit-remaining",
                                        headers.get("X-Ratelimit-Remaining", "1")))
            if status == 403 and remaining.strip() == "0":
                return base.RETRYABLE  # quota exhausted, not revoked
            return base.AUTH_FAILURE
        if status in (400, 404, 422):
            return base.BAD_PARAMS
        return base.RETRYABLE

    def _call(self, connection, method, path, query=None, body=None,
              transport=None):
        settings = connection.get("settings") or {}
        base_url = (settings.get("base_url") or "https://api.github.com").rstrip("/")
        url = base_url + path
        if query:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(query)
        headers = {"Accept": "application/vnd.github+json",
                   "X-GitHub-Api-Version": "2022-11-28"}
        token = (connection.get("credentials") or {}).get("token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(body)
        out = base.http_request(
            method, url, headers=headers, body=body,
            timeout_s=int(settings.get("timeout_s") or 20),
            transport=transport)
        if not out["ok"]:
            raise base.AdapterError(f"{method} {path} → {out['status']}",
                                    kind=self.classify(out), status=out["status"])
        try:
            data = json.loads(out["body"]) if out["body"] else None
        except ValueError:
            data = {"raw": out["body"]}
        return data, out

    def _limit(self, params):
        try:
            return max(1, min(int((params or {}).get("limit") or 5), 30))
        except (TypeError, ValueError):
            raise base.AdapterError("limit must be an integer",
                                    kind=base.BAD_PARAMS)

    def test(self, connection, transport=None):
        data, out = self._call(connection, "GET", "/rate_limit",
                               transport=transport)
        core = ((data or {}).get("resources") or {}).get("core") or {}
        return {"limit": core.get("limit"), "remaining": core.get("remaining")}

    def _require_confirm(self, params):
        if not (params or {}).get("confirm"):
            raise base.AdapterError("confirm is required for this write",
                                    kind=base.BAD_PARAMS)

    def execute(self, connection, action_id, params, transport=None):
        action = self.action(action_id)
        if not action:
            raise base.AdapterError(f"unknown action '{action_id}'",
                                    kind=base.BAD_PARAMS)
        clean, err = base.validate_fields(action["params"], params)
        if err:
            raise base.AdapterError(err, kind=base.BAD_PARAMS)
        if action_id == "search_repos":
            data, _ = self._call(connection, "GET", "/search/repositories",
                                 query={"q": clean["q"],
                                        "per_page": self._limit(clean)},
                                 transport=transport)
            items = (data or {}).get("items") or []
            return {"total": (data or {}).get("total_count"),
                    "repos": [{"full_name": r.get("full_name"),
                               "description": r.get("description"),
                               "stars": r.get("stargazers_count"),
                               "url": r.get("html_url")} for r in items]}
        if action_id == "search_issues":
            data, _ = self._call(connection, "GET", "/search/issues",
                                 query={"q": clean["q"],
                                        "per_page": self._limit(clean)},
                                 transport=transport)
            items = (data or {}).get("items") or []
            return {"total": (data or {}).get("total_count"),
                    "issues": [{"number": i.get("number"),
                                "title": i.get("title"),
                                "state": i.get("state"),
                                "url": i.get("html_url")} for i in items]}
        if action_id == "create_release":
            self._require_confirm(clean)
            payload = {"tag_name": clean["tag"],
                       "name": clean.get("name") or clean["tag"],
                       "body": clean.get("body") or ""}
            data, _ = self._call(
                connection, "POST", f"/repos/{clean['repo']}/releases",
                body=payload, transport=transport)
            return {"id": (data or {}).get("id"),
                    "url": (data or {}).get("html_url"),
                    "tag": (data or {}).get("tag_name")}
        if action_id == "dispatch":
            self._require_confirm(clean)
            payload = {"event_type": clean["event_type"]}
            if clean.get("payload"):
                try:
                    payload["client_payload"] = json.loads(clean["payload"])
                except ValueError:
                    raise base.AdapterError("payload must be a JSON object",
                                            kind=base.BAD_PARAMS)
            _, out = self._call(
                connection, "POST", f"/repos/{clean['repo']}/dispatches",
                body=payload, transport=transport)
            return {"dispatched": True, "status": out["status"]}
        raise base.AdapterError(f"unknown action '{action_id}'",
                                kind=base.BAD_PARAMS)
