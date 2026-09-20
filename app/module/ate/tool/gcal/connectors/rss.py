"""rss connector — feed reading (feed-reader type).

One search, ``read``: fetch the connection's feed URL and return bounded
entries via stdlib XML (RSS 2.0 and Atom). No credentials, no network beyond
the feed itself.
"""
import html
import xml.etree.ElementTree as ET

import base

ID = "rss"
NAME = "RSS Feed"
SUMMARY = "Feed entries, bounded — the zero-config demo."
TYPE = "feed-reader"
AUTH_SCHEME = "none"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "feed_url", "type": "text", "required": True, "default": "",
     "description": "the feed URL (RSS 2.0 or Atom)"},
    {"name": "max_items", "type": "number", "required": False, "default": 20,
     "description": "max entries returned per read"},
    {"name": "timeout_s", "type": "number", "required": False, "default": 20,
     "description": "per-request timeout in seconds"},
]
CREDENTIALS_SCHEMA = []

ACTIONS = [
    {"id": "read", "kind": "search", "summary": "read feed entries",
     "params": [
         {"name": "max_items", "type": "number", "required": False,
          "default": None, "description": "override the connection default"},
     ]},
]


def _local(tag):
    return tag.rsplit("}", 1)[-1].lower()


def _text(el, names):
    for child in el:
        if _local(child.tag) in names and child.text and child.text.strip():
            return html.unescape(child.text.strip())
    return ""


def parse_feed(xml_text):
    """Parse RSS 2.0 or Atom into ``(feed_meta, entries)``. Raises
    AdapterError(bad_params) on malformed XML — a broken feed is a caller
    problem, not a health event."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise base.AdapterError(f"not parseable feed XML: {exc}",
                                kind=base.BAD_PARAMS)
    kind = _local(root.tag)
    entries = []
    if kind == "rss":
        channel = root.find("channel")
        scope = channel if channel is not None else root
        meta = {"title": _text(scope, ("title",)),
                "link": _text(scope, ("link",))}
        for item in scope.findall("item"):
            entries.append({
                "title": _text(item, ("title",)),
                "link": _text(item, ("link",)),
                "published": _text(item, ("pubdate", "published", "updated", "date")),
                "summary": _text(item, ("description", "summary"))[:500],
            })
    elif kind == "feed":
        meta = {"title": _text(root, ("title",)),
                "link": next((a.get("href", "") for a in root
                              if _local(a.tag) == "link" and a.get("href")), "")}
        for entry in [e for e in root if _local(e.tag) == "entry"]:
            entries.append({
                "title": _text(entry, ("title",)),
                "link": next((a.get("href", "") for a in entry
                              if _local(a.tag) == "link" and a.get("href")), ""),
                "published": _text(entry, ("published", "updated", "date")),
                "summary": _text(entry, ("summary", "content"))[:500],
            })
    else:
        raise base.AdapterError(f"unsupported feed root <{kind}>",
                                kind=base.BAD_PARAMS)
    return meta, entries


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

    def _fetch(self, connection, transport=None):
        settings = connection.get("settings") or {}
        url = (settings.get("feed_url") or "").strip()
        if not url:
            raise base.AdapterError("feed_url is required",
                                    kind=base.BAD_PARAMS)
        out = base.http_request(
            "GET", url, headers={"Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"},
            timeout_s=int(settings.get("timeout_s") or 20),
            transport=transport)
        if not out["ok"]:
            raise base.AdapterError(f"GET {url} → {out['status']}",
                                    kind=self.classify(out), status=out["status"])
        return out["body"] or ""

    def _limit(self, connection, params):
        settings = connection.get("settings") or {}
        try:
            default = int(settings.get("max_items") or 20)
        except (TypeError, ValueError):
            default = 20
        raw = (params or {}).get("max_items")
        if raw in (None, ""):
            return max(1, min(default, 200))
        try:
            return max(1, min(int(raw), 200))
        except (TypeError, ValueError):
            raise base.AdapterError("max_items must be an integer",
                                    kind=base.BAD_PARAMS)

    def test(self, connection, transport=None):
        meta, entries = parse_feed(self._fetch(connection, transport))
        return {"feed": meta.get("title") or "", "entries": len(entries)}

    def execute(self, connection, action_id, params, transport=None):
        if action_id != "read":
            raise base.AdapterError(f"unknown action '{action_id}'",
                                    kind=base.BAD_PARAMS)
        meta, entries = parse_feed(self._fetch(connection, transport))
        limit = self._limit(connection, params)
        return {"feed": meta, "entries": entries[:limit],
                "total": len(entries)}
