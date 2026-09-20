"""GCAL base — the handler contract and the manager's machinery.

The manager is a dispatching shell: it resolves ``connector_id → handler``
and calls into it, but the handler owns its connection model, its setup and
credential shapes, its auth details, and its error mapping. Every connector
module subclasses :class:`Connector` and is discovered from ``connectors/``.

Transports are injectable (``transport=`` callables) so tests run hermetic:
no network, no real providers — the same code path the live server uses.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

OK = "ok"
AUTH_FAILURE = "auth_failure"
RETRYABLE = "retryable"
BAD_PARAMS = "bad_params"

BODY_TRUNCATE = 4096
DEFAULT_TIMEOUT_S = 20

MASK = "●●●"


class AdapterError(Exception):
    """A failed provider call, pre-classified for the health engine."""

    def __init__(self, message, kind=RETRYABLE, status=None):
        super().__init__(message)
        self.kind = kind
        self.status = status


def validate_fields(schema, values):
    """Validate a values dict against a field schema.

    Schema entries: ``{name, type, required, default, description}`` with
    type in ``text|password|number|boolean|select``. Returns
    ``(clean, error)`` — missing required fields and bad numbers are
    caller errors, never provider calls.
    """
    values = values or {}
    clean = {}
    for field in schema or []:
        name = field["name"]
        raw = values.get(name, field.get("default"))
        if field.get("required") and (raw is None or raw == ""):
            return None, f"{name} is required"
        ftype = field.get("type") or "text"
        if raw is None or raw == "":
            clean[name] = raw
            continue
        if ftype == "number":
            try:
                clean[name] = int(raw)
            except (TypeError, ValueError):
                return None, f"{name} must be an integer"
        elif ftype == "boolean":
            clean[name] = bool(raw) if isinstance(raw, bool) else str(raw).lower() in ("1", "true", "yes", "on")
        else:
            clean[name] = str(raw)
    return clean, None


def mask(value):
    """Presence flags for a vaulted credential blob, by shape.

    Non-empty strings become ``●●●``; structure is preserved so the
    playground can show *which* secrets exist without showing any.
    Numbers, booleans, and empties pass through untouched.
    """
    if isinstance(value, dict):
        return {k: mask(v) for k, v in value.items()}
    if isinstance(value, list):
        return [mask(v) for v in value]
    if isinstance(value, str):
        return value if value == "" else MASK
    return value


def truncate_body(text, limit=BODY_TRUNCATE):
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n… truncated ({len(text)} chars total)"


def default_transport(method, url, headers, body, timeout_s):
    """Real HTTP via stdlib urllib. Returns ``(status, headers, body)``."""
    data = body.encode("utf-8") if isinstance(body, str) else body
    req = urllib.request.Request(url, data=data, method=method.upper(),
                                 headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read()
            charset = resp.headers.get_content_charset() or "utf-8"
            return (resp.status, dict(resp.headers.items()),
                    raw.decode(charset, errors="replace"))
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        return (exc.code, dict(exc.headers.items()),
                raw.decode("utf-8", errors="replace"))
    except Exception as exc:  # network/config errors are retryable
        raise AdapterError(f"transport failed: {exc}", kind=RETRYABLE)


def http_request(method, url, *, headers=None, body=None,
                 timeout_s=DEFAULT_TIMEOUT_S, transport=None):
    """One bounded HTTP call. Returns an outcome dict the health engine
    and the execution log both consume."""
    do = transport or default_transport
    started = time.time()
    try:
        status, resp_headers, resp_body = do(
            method, url, headers or {}, body, timeout_s)
    except AdapterError:
        raise
    except Exception as exc:
        raise AdapterError(f"transport failed: {exc}", kind=RETRYABLE)
    return {
        "ok": 200 <= status < 300,
        "status": status,
        "headers": {k: v for k, v in (resp_headers or {}).items()
                    if k.lower() in ("content-type", "content-length",
                                     "x-ratelimit-remaining", "retry-after")},
        "body": truncate_body(resp_body),
        "duration_ms": int((time.time() - started) * 1000),
    }


class Connector:
    """One connector definition. Subclass per external system."""

    ID = None
    NAME = None
    SUMMARY = ""
    TYPE = None
    AUTH_SCHEME = "none"      # none|bearer|basic|api_key|oauth2
    STATUS = "live"           # live|dormant
    SETUP_SCHEMA = []         # settings fields (non-secret)
    CREDENTIALS_SCHEMA = []   # secret fields (vaulted, masked)

    # ── definition ──
    def actions(self):
        """Action list: ``{id, kind, summary, params, confirm?}``."""
        raise NotImplementedError

    def action(self, action_id):
        for a in self.actions():
            if a["id"] == action_id:
                return a
        return None

    # ── lifecycle ──
    def connect(self, settings, credentials):
        """Validate setup; returns ``(settings, credentials)`` to store."""
        clean_s, err = validate_fields(self.SETUP_SCHEMA, settings)
        if err:
            raise AdapterError(err, kind=BAD_PARAMS)
        clean_c, err = validate_fields(self.CREDENTIALS_SCHEMA, credentials)
        if err:
            raise AdapterError(err, kind=BAD_PARAMS)
        return clean_s, clean_c

    def test(self, connection, transport=None):
        """Health check behind the Test button."""
        raise NotImplementedError

    def execute(self, connection, action_id, params, transport=None):
        """Run one action. Returns a JSON-serializable result dict."""
        raise NotImplementedError

    def disconnect(self, connection):
        """Revoke + void. Returns ``{"revoked": bool}``."""
        return {"revoked": False}

    def refresh(self, connection, transport=None):
        """Renew expiring credentials. Returns updated credentials or None."""
        return None

    def reconnect_hint(self, connection):
        """The exact next step surfaced on a 409."""
        if self.AUTH_SCHEME == "oauth2":
            return {"action": "consent",
                    "url": f"api/connections/{connection['id']}/auth/start",
                    "message": "reconnect — click through consent again"}
        if self.AUTH_SCHEME == "none":
            return {"action": "none",
                    "message": "nothing to reconnect — check the settings"}
        return {"action": "reconnect",
                "message": "reconnect — paste the credential again"}

    # ── error taxonomy ──
    def classify(self, outcome):
        """Map a run outcome to ok|auth_failure|retryable|bad_params."""
        if outcome.get("ok"):
            return OK
        status = outcome.get("status")
        if status in (401, 403):
            return AUTH_FAILURE
        if status in (400, 404, 422):
            return BAD_PARAMS
        return RETRYABLE
