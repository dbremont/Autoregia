"""Small HTTP + parsing helpers shared by PEOS source modules."""
from __future__ import annotations

import calendar
import os
import re
from datetime import datetime, timezone

import feedparser
import requests

# Several free no-auth feeds (GDELT, Reddit) throttle or block non-browser
# User-Agents, so we advertise a mainstream browser by default. Override with
# PEOS_USER_AGENT for feeds that ask for a descriptive identifier.
USER_AGENT = os.environ.get(
    "PEOS_USER_AGENT",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36 Autoregia-PEOS/0.1",
)

_TAG_RE = re.compile(r"<[^>]+>")


def get_json(url, params=None, headers=None, timeout=20):
    """GET ``url`` and return parsed JSON, raising on HTTP errors."""
    h = {"User-Agent": USER_AGENT}
    if headers:
        h.update(headers)
    r = requests.get(url, params=params, headers=h, timeout=timeout)
    r.raise_for_status()
    return r.json()


def post_json(url, json_body=None, headers=None, timeout=90):
    """POST JSON and return the parsed response (used by the collector daemon)."""
    h = {"User-Agent": USER_AGENT}
    if headers:
        h.update(headers)
    r = requests.post(url, json=json_body, headers=h, timeout=timeout)
    r.raise_for_status()
    return r.json() if r.content else {}


def get_feed(url, params=None, headers=None, timeout=20):
    """GET ``url`` and return a feedparser-parsed RSS/Atom feed."""
    h = {"User-Agent": USER_AGENT}
    if headers:
        h.update(headers)
    r = requests.get(url, params=params, headers=h, timeout=timeout)
    r.raise_for_status()
    return feedparser.parse(r.content)


def feed_time_ms(entry) -> int:
    """Best-effort epoch-ms for a feedparser entry (struct_time → string)."""
    for key in ("published_parsed", "updated_parsed"):
        st = entry.get(key)
        if st:
            try:
                return int(calendar.timegm(st) * 1000)
            except Exception:
                continue
    return parse_iso_ms(entry.get("published", "") or entry.get("updated", ""))


def strip_html(s: str) -> str:
    return _TAG_RE.sub("", s or "")


def parse_iso_ms(s: str) -> int:
    """Parse an ISO-8601 timestamp (e.g. Mastodon ``created_at``) to epoch ms."""
    if not s:
        return 0
    text = s.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    except Exception:
        return 0


def parse_gdelt_seen(s: str) -> int:
    """Parse a GDELT ``seendate`` (``20250706T120000Z``) to epoch ms."""
    if not s:
        return 0
    try:
        dt = datetime.strptime(s.strip(), "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    except Exception:
        return 0


def fmt_gdelt(ms: int) -> str:
    """Format epoch ms as a GDELT ``YYYYMMDDHHMMSS`` datetime string."""
    dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y%m%d%H%M%S")
