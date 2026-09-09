"""Nitter source — Twitter/X via privacy-friendly Nitter RSS mirrors (no auth).

Nitter is a free, no-auth alternative front-end for Twitter/X. Each instance
exposes a per-handle RSS feed at ``/<handle>/rss`` carrying the account's recent
tweets. We query a configurable list of instances (env ``PEOS_NITTER_INSTANCES``)
and mirror the :mod:`peos.sources.mastodon` pattern: instances come and go, so we
try each one and skip any that fail.

The canonical ``nitter.net`` has been intermittent since early 2024; the source
is multi-instance by design so a working mirror keeps the sense organ
operational. The ``native_url`` is rewritten to ``https://twitter.com/<handle>
/status/<id>`` so click-throughs land on the original tweet regardless of which
mirror served the feed.

Tweet status ids are globally unique on X, so the dedup key
``("nitter", <status_id>)`` collapses the same tweet served by two mirrors or
appearing in two followed handles into one observation (with unioned topic
tags), exactly like Hacker News item dedup.

``topic.query`` is the handle (``teortexasTex`` or ``@teortexasTex``).
"""
from __future__ import annotations

import os
import re

from .base import Observation, Source, Topic
from .http_util import feed_time_ms, get_feed, strip_html

_DEFAULT_INSTANCES = "nitter.net,nitter.privacydev.net,nitter.poast.org"
_STATUS_RE = re.compile(r"/status/(\d+)", re.IGNORECASE)
# "RT by @karpathy: ..." → strip the RT-by prefix so the title reads cleanly.
_RT_PREFIX_RE = re.compile(r"^RT\s+by\s+@[\w]+:\s*", re.IGNORECASE)


class NitterSource:
    name = "nitter"
    default_interval_s = 1800         # 30 minutes (be polite to free mirrors)

    @property
    def instances(self) -> list[str]:
        raw = os.environ.get("PEOS_NITTER_INSTANCES", _DEFAULT_INSTANCES)
        return [i.strip().strip("/") for i in raw.split(",") if i.strip()]

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        handle = (topic.query or "").strip().lstrip("@")
        if not handle:
            return []
        out: list[Observation] = []
        seen: set[str] = set()          # status_ids already emitted this poll
        for inst in self.instances:
            url = f"https://{inst}/{handle}/rss"
            try:
                feed = get_feed(url)
            except Exception:
                # Instance down / rate-limited / 404 — skip, keep the others.
                continue
            for entry in getattr(feed, "entries", []) or []:
                # Prefer the <guid> (bare tweet id) over the link (which may
                # carry an RT-original handle and a ``#m`` fragment).
                status_id = (entry.get("id") or "").strip()
                if not status_id or not status_id.isdigit():
                    m = _STATUS_RE.search(entry.get("link", "") or "")
                    status_id = m.group(1) if m else ""
                if not status_id or status_id in seen:
                    # Same tweet served by another mirror or re-emitted — skip.
                    continue
                ts = feed_time_ms(entry)
                if since_ms and ts and ts < since_ms:
                    seen.add(status_id)
                    continue
                seen.add(status_id)

                # For retweets, Nitter puts the original author in
                # ``dc:creator`` and prefixes the title with "RT by @<handle>:".
                # The link/target tweet belongs to the original author.
                author = (entry.get("author") or "").strip().lstrip("@") or handle
                title = entry.get("title", "") or ""
                title = _RT_PREFIX_RE.sub("", title, count=1).strip()
                if title.startswith(handle + ":"):
                    title = title[len(handle) + 1:].strip()

                body = strip_html(entry.get("summary", "")
                                  or entry.get("description", ""))
                out.append(Observation(
                    source=self.name,
                    source_type="post",
                    native_id=status_id,      # globally unique on X → natural dedup
                    native_url=f"https://twitter.com/{author}/status/{status_id}",
                    observed_at_ms=ts,
                    author=author,
                    title=title,
                    body=body,
                    topics=[topic.topic_id],
                    raw={"instance": inst,
                         "link": entry.get("link", ""),
                         "status_id": status_id,
                         "watched_handle": handle},
                ))
        return out
