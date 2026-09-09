"""Hacker News source via the Algolia search API (free, no auth).

Docs: https://hn.algolia.com/api — ``/search_by_date`` returns items newest-first,
filtered by ``created_at_i``. We poll ``comment`` tags: the discussion is what
"other agents say about the world".
"""
from __future__ import annotations

from .base import Observation, Source, Topic
from .http_util import get_json


class HackerNewsSource:
    name = "hackernews"
    default_interval_s = 900          # 15 minutes
    BASE = "https://hn.algolia.com/api/v1"

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        params = {
            "query": topic.query,
            "tags": "comment",
            "hitsPerPage": 50,
        }
        if since_ms:
            params["numericFilters"] = f"created_at_i>{since_ms // 1000}"
        data = get_json(f"{self.BASE}/search_by_date", params=params)
        out: list[Observation] = []
        for hit in data.get("hits", []) or []:
            native_id = hit.get("objectID") or ""
            if not native_id:
                continue
            out.append(Observation(
                source=self.name,
                source_type="comment",
                native_id=str(native_id),
                native_url=(hit.get("url")
                            or f"https://news.ycombinator.com/item?id={native_id}"),
                observed_at_ms=int(hit.get("created_at_i") or 0) * 1000,
                author=hit.get("author") or "",
                title=hit.get("title") or hit.get("story_title") or "",
                body=hit.get("comment_text") or hit.get("story_text") or "",
                topics=[topic.topic_id],
                score=hit.get("points"),
                raw=hit,
            ))
        return out
