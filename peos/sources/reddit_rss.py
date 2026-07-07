"""Reddit source via the public per-subreddit RSS feed (no OAuth, no keys).

Reddit's no-auth ``.json`` endpoints now IP-block non-browser clients, but the
``.rss`` Atom feed remains open. We parse it with feedparser, so no app
registration or secrets are required. The trade-off is aggressive rate limiting
— keep the poll interval >= 30 min and watch few subreddits.

``topic.query`` is the subreddit name (``worldnews`` or ``r/worldnews``).
"""
from __future__ import annotations

from .base import Observation, Source, Topic
from .http_util import feed_time_ms, get_feed, strip_html


class RedditSource:
    name = "reddit"
    default_interval_s = 1800         # 30 minutes (do not lower for no-auth)
    BASE = "https://www.reddit.com"

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        sub = topic.query.strip().removeprefix("r/").removeprefix("/")
        if not sub:
            return []
        feed = get_feed(f"{self.BASE}/r/{sub}/.rss", params={"limit": 50})
        out: list[Observation] = []
        for entry in feed.entries:
            raw_id = entry.get("id") or entry.get("link") or ""
            # entry ids look like "t3_abc123" or a full URL; reduce to the id.
            native_id = raw_id.replace("t3_", "").rstrip("/").split("/")[-1]
            if not native_id:
                continue
            link = entry.get("link", "")
            ts = feed_time_ms(entry)
            if since_ms and ts and ts < since_ms:
                continue
            out.append(Observation(
                source=self.name,
                source_type="post",
                native_id=str(native_id),
                native_url=link or f"{self.BASE}/r/{sub}/comments/{native_id}",
                observed_at_ms=ts,
                author=(entry.get("author", "") or "").removeprefix("/u/"),
                title=entry.get("title", "") or "",
                body=strip_html(entry.get("summary", "") or ""),
                topics=[topic.topic_id],
                raw={"id": entry.get("id"), "link": link},
            ))
        return out
