"""Generic RSS source — any journal / venue feed by URL (free, no auth).

One adapter covers every plain RSS/Atom feed a scientific publisher offers
(Nature, PLOS, NBER working papers, Europe PMC, DOAJ, society journals…).
``source_type="paper"`` — pair with a domain tag to keep the corpus readable.

``topic.query`` is the **full feed URL** (http/https). Anything else yields
no observations (config error, not a transport error). The feed's own
titles/ids provide the dedup key, so two topics watching overlapping feeds
collapse naturally in the store.
"""
from __future__ import annotations

import hashlib

from .base import Observation, Source, Topic
from .http_util import feed_time_ms, get_feed, strip_html


class RssSource:
    name = "rss"
    default_interval_s = 43200        # 12 hours

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        url = (topic.query or "").strip()
        if not url.startswith(("http://", "https://")):
            return []
        feed = get_feed(url)
        out: list[Observation] = []
        for entry in getattr(feed, "entries", []) or []:
            link = entry.get("link", "") or ""
            native_id = (entry.get("id", "") or "").strip() or link
            if not native_id:
                native_id = hashlib.sha1(link.encode("utf-8")).hexdigest()[:20]
            ts = feed_time_ms(entry)
            if since_ms and ts and ts < since_ms:
                continue
            out.append(Observation(
                source=self.name,
                source_type="paper",
                native_id=native_id,
                native_url=link,
                observed_at_ms=ts or 0,
                author=(entry.get("author", "") or "").strip(),
                title=strip_html(entry.get("title", "") or "").strip(),
                body=strip_html(entry.get("summary", "")
                                or entry.get("description", "")).strip(),
                topics=[topic.topic_id],
                raw={"feed": url, "link": link},
            ))
        return out
