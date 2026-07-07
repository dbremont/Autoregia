"""GDELT source via the DOC 2.0 API (free, no auth, no rate limit).

GDELT monitors global news across 150+ languages, updated every 15 minutes. This
gives the *news* layer (not discussion) — ``source_type="article"``. Pair it with
the social sources for commentary.

Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
``topic.query`` is a GDELT query (supports ``AND`` / ``OR`` / phrases).
"""
from __future__ import annotations

import hashlib

from .base import Observation, Source, Topic, now_ms
from .http_util import fmt_gdelt, get_json, parse_gdelt_seen


class GDELTSource:
    name = "gdelt"
    default_interval_s = 1800         # 30 minutes
    BASE = "https://api.gdeltproject.org/api/v2/doc/doc"

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        params = {
            "query": topic.query,
            "mode": "artlist",
            "maxrecords": "50",
            "format": "json",
            "sort": "datedesc",
        }
        if since_ms:
            params["startdatetime"] = fmt_gdelt(since_ms)
            params["enddatetime"] = fmt_gdelt(now_ms())
        data = get_json(self.BASE, params=params)
        out: list[Observation] = []
        for art in (data or {}).get("articles", []) or []:
            url_ = art.get("url") or ""
            if not url_:
                continue
            out.append(Observation(
                source=self.name,
                source_type="article",
                native_id=hashlib.sha1(url_.encode("utf-8")).hexdigest()[:20],
                native_url=url_,
                observed_at_ms=parse_gdelt_seen(art.get("seendate", "")),
                author=art.get("domain", "") or "",
                title=art.get("title", "") or "",
                body="",
                topics=[topic.topic_id],
                language=art.get("language"),
                raw=art,
            ))
        return out
