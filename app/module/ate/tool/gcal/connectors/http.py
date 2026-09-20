"""http connector — the universal operation (universal-api type).

One action, ``request``: any method against any URL (relative URLs resolve
against the connection's base_url). Auth rides per the connection's scheme:
bearer, basic, api_key (custom header), or none.
"""
import urllib.parse

import base

ID = "http"
NAME = "HTTP Request"
SUMMARY = "The universal operation — any method, any URL, any API."
TYPE = "universal-api"
AUTH_SCHEME = "api_key"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "base_url", "type": "text", "required": False, "default": "",
     "description": "prefix for relative URLs (e.g. https://api.example.com)"},
    {"name": "timeout_s", "type": "number", "required": False, "default": 20,
     "description": "per-request timeout in seconds"},
]
CREDENTIALS_SCHEMA = [
    {"name": "scheme", "type": "select", "required": False, "default": "none",
     "description": "none | bearer | basic | api_key",
     "options": ["none", "bearer", "basic", "api_key"]},
    {"name": "token", "type": "password", "required": False, "default": "",
     "description": "bearer token or api_key value"},
    {"name": "username", "type": "text", "required": False, "default": "",
     "description": "basic-auth username"},
    {"name": "password", "type": "password", "required": False, "default": "",
     "description": "basic-auth password"},
    {"name": "header_name", "type": "text", "required": False,
     "default": "X-API-Key", "description": "header carrying an api_key"},
]

ACTIONS = [
    {"id": "request", "kind": "action", "summary": "any HTTP request",
     "params": [
         {"name": "method", "type": "select", "required": False,
          "default": "GET", "description": "",
          "options": ["GET", "POST", "PUT", "PATCH", "DELETE"]},
         {"name": "url", "type": "text", "required": True, "default": "",
          "description": "absolute, or relative to the connection base_url"},
         {"name": "query", "type": "text", "required": False, "default": "",
          "description": "extra query string (k=v&k2=v2)"},
         {"name": "headers", "type": "text", "required": False, "default": "",
          "description": "extra headers as a JSON object"},
         {"name": "body", "type": "text", "required": False, "default": "",
          "description": "request body, sent as-is"},
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

    def _auth_headers(self, connection):
        creds = connection.get("credentials") or {}
        scheme = (creds.get("scheme") or "none").lower()
        if scheme == "bearer" and creds.get("token"):
            return {"Authorization": f"Bearer {creds['token']}"}
        if scheme == "basic" and creds.get("username"):
            import base64
            raw = f"{creds['username']}:{creds.get('password') or ''}"
            tok = base64.b64encode(raw.encode()).decode()
            return {"Authorization": f"Basic {tok}"}
        if scheme == "api_key" and creds.get("token"):
            return {creds.get("header_name") or "X-API-Key": creds["token"]}
        return {}

    def _url(self, connection, url):
        settings = connection.get("settings") or {}
        base_url = (settings.get("base_url") or "").strip()
        url = (url or "").strip()
        if not url:
            raise base.AdapterError("url is required", kind=base.BAD_PARAMS)
        if base_url and not urllib.parse.urlsplit(url).netloc:
            url = urllib.parse.urljoin(base_url.rstrip("/") + "/", url.lstrip("/"))
        if not urllib.parse.urlsplit(url).scheme.startswith("http"):
            raise base.AdapterError("url must be absolute http(s)",
                                    kind=base.BAD_PARAMS)
        return url

    def test(self, connection, transport=None):
        settings = connection.get("settings") or {}
        if not (settings.get("base_url") or "").strip():
            raise base.AdapterError(
                "set a base_url to test, or run a request directly",
                kind=base.BAD_PARAMS)
        out = base.http_request(
            "GET", settings["base_url"].strip(),
            headers=self._auth_headers(connection),
            timeout_s=int(settings.get("timeout_s") or 20),
            transport=transport)
        if not out["ok"]:
            raise base.AdapterError(f"GET {settings['base_url']} → {out['status']}",
                                    kind=self.classify(out), status=out["status"])
        return {"status": out["status"], "body_chars": len(out["body"] or "")}

    def execute(self, connection, action_id, params, transport=None):
        action = self.action(action_id)
        if not action:
            raise base.AdapterError(f"unknown action '{action_id}'",
                                    kind=base.BAD_PARAMS)
        clean, err = base.validate_fields(action["params"], params)
        if err:
            raise base.AdapterError(err, kind=base.BAD_PARAMS)
        settings = connection.get("settings") or {}
        url = self._url(connection, clean["url"])
        if clean.get("query"):
            sep = "&" if urllib.parse.urlsplit(url).query else "?"
            url = url + sep + clean["query"].lstrip("?&")
        headers = self._auth_headers(connection)
        if clean.get("headers"):
            try:
                extra = __import__("json").loads(clean["headers"])
            except ValueError:
                raise base.AdapterError("headers must be a JSON object",
                                        kind=base.BAD_PARAMS)
            if not isinstance(extra, dict):
                raise base.AdapterError("headers must be a JSON object",
                                        kind=base.BAD_PARAMS)
            headers.update(extra)
        out = base.http_request(
            clean.get("method") or "GET", url, headers=headers,
            body=clean.get("body") or None,
            timeout_s=int(settings.get("timeout_s") or 20),
            transport=transport)
        if not out["ok"]:
            raise base.AdapterError(
                f"{clean.get('method') or 'GET'} {url} → {out['status']}",
                kind=self.classify(out), status=out["status"])
        return {"status": out["status"], "headers": out["headers"],
                "body": out["body"], "duration_ms": out["duration_ms"]}
