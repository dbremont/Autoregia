"""smtp connector — simple outbound mail (mail-sender type).

One action, ``send``: host/port/security/user in settings, the password
vaulted. The pragmatic send channel next to Gmail-OAuth — paste-once app
credentials, no consent ceremony. The SMTP client is injectable
(``smtp_factory=``) so tests run hermetic.
"""
import smtplib
import ssl
from email.message import EmailMessage

import base

ID = "smtp"
NAME = "SMTP Mail"
SUMMARY = "Send mail through any SMTP server — no OAuth ceremony."
TYPE = "mail-sender"
AUTH_SCHEME = "basic"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "host", "type": "text", "required": True, "default": "",
     "description": "SMTP host (e.g. smtp.example.com)"},
    {"name": "port", "type": "number", "required": False, "default": 587,
     "description": "587 (STARTTLS) or 465 (SSL)"},
    {"name": "security", "type": "select", "required": False,
     "default": "starttls", "description": "starttls | ssl | plain",
     "options": ["starttls", "ssl", "plain"]},
    {"name": "username", "type": "text", "required": False, "default": "",
     "description": "login name (empty = no auth)"},
    {"name": "timeout_s", "type": "number", "required": False, "default": 20,
     "description": "per-operation timeout in seconds"},
]
CREDENTIALS_SCHEMA = [
    {"name": "password", "type": "password", "required": False, "default": "",
     "description": "the SMTP password (app password where applicable)"},
]

ACTIONS = [
    {"id": "send", "kind": "action", "summary": "send one email",
     "params": [
         {"name": "to", "type": "text", "required": True, "default": "",
          "description": "recipient address"},
         {"name": "subject", "type": "text", "required": False, "default": "",
          "description": "subject line"},
         {"name": "body", "type": "text", "required": True, "default": "",
          "description": "plain-text body"},
         {"name": "from", "type": "text", "required": False, "default": "",
          "description": "sender (defaults to the username)"},
     ]},
]


def _default_factory(host, port, security, timeout_s):
    """Open an smtplib client. Returns a ``(client, close)`` pair."""
    if security == "ssl":
        client = smtplib.SMTP_SSL(host, port, timeout=timeout_s,
                                  context=ssl.create_default_context())
    else:
        client = smtplib.SMTP(host, port, timeout=timeout_s)
    return client


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

    def _session(self, connection, smtp_factory=None):
        settings = connection.get("settings") or {}
        host = (settings.get("host") or "").strip()
        if not host:
            raise base.AdapterError("host is required", kind=base.BAD_PARAMS)
        try:
            port = int(settings.get("port") or 587)
        except (TypeError, ValueError):
            raise base.AdapterError("port must be an integer",
                                    kind=base.BAD_PARAMS)
        security = (settings.get("security") or "starttls").lower()
        if security not in ("starttls", "ssl", "plain"):
            raise base.AdapterError("security must be starttls|ssl|plain",
                                    kind=base.BAD_PARAMS)
        try:
            timeout_s = int(settings.get("timeout_s") or 20)
        except (TypeError, ValueError):
            timeout_s = 20
        factory = smtp_factory or _default_factory
        try:
            client = factory(host, port, security, timeout_s)
        except base.AdapterError:
            raise
        except Exception as exc:
            raise base.AdapterError(f"cannot reach {host}:{port}: {exc}",
                                    kind=base.RETRYABLE)
        try:
            if security == "starttls":
                client.starttls(context=ssl.create_default_context())
            username = (settings.get("username") or "").strip()
            password = (connection.get("credentials") or {}).get("password") or ""
            if username:
                try:
                    client.login(username, password)
                except smtplib.SMTPAuthenticationError as exc:
                    raise base.AdapterError(f"authentication failed: {exc}",
                                            kind=base.AUTH_FAILURE)
            return client, username
        except base.AdapterError:
            try:
                client.quit()
            except Exception:
                pass
            raise
        except Exception as exc:
            try:
                client.quit()
            except Exception:
                pass
            raise base.AdapterError(f"session setup failed: {exc}",
                                    kind=base.RETRYABLE)

    def test(self, connection, smtp_factory=None):
        client, username = self._session(connection, smtp_factory)
        try:
            code, _ = client.noop()
        except Exception as exc:
            raise base.AdapterError(f"noop failed: {exc}",
                                    kind=base.RETRYABLE)
        finally:
            try:
                client.quit()
            except Exception:
                pass
        return {"noop": code, "authenticated": bool(username)}

    def _close(self, client):
        try:
            client.quit()
        except Exception:
            pass

    def execute(self, connection, action_id, params, smtp_factory=None):
        if action_id != "send":
            raise base.AdapterError(f"unknown action '{action_id}'",
                                    kind=base.BAD_PARAMS)
        action = self.action(action_id)
        clean, err = base.validate_fields(action["params"], params)
        if err:
            raise base.AdapterError(err, kind=base.BAD_PARAMS)
        to = (clean.get("to") or "").strip()
        if "@" not in to:
            raise base.AdapterError("to must be an email address",
                                    kind=base.BAD_PARAMS)
        client, username = self._session(connection, smtp_factory)
        try:
            msg = EmailMessage()
            msg["To"] = to
            msg["Subject"] = clean.get("subject") or ""
            sender = (clean.get("from") or "").strip() or username
            if sender:
                msg["From"] = sender
            msg.set_content(clean.get("body") or "")
            try:
                refused = client.send_message(msg)
            except smtplib.SMTPRecipientsRefused as exc:
                raise base.AdapterError(f"recipient refused: {exc}",
                                        kind=base.BAD_PARAMS)
            except smtplib.SMTPAuthenticationError as exc:
                raise base.AdapterError(f"authentication failed: {exc}",
                                        kind=base.AUTH_FAILURE)
            except smtplib.SMTPException as exc:
                raise base.AdapterError(f"send failed: {exc}",
                                        kind=base.RETRYABLE)
            return {"sent": True, "to": to,
                    "refused": {k: str(v) for k, v in (refused or {}).items()}}
        finally:
            self._close(client)
