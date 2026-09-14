"""Crossref source — published works via the REST API (free, no auth).

The journal-publication layer: 150M+ works with DOI-native ids.
``source_type="paper"``.

Docs: https://api.crossref.org/swagger-ui/index.html
Politeness: open API; the ``mailto`` parameter (env ``PEOS_CONTACT_EMAIL``)
puts us in the polite pool, and the default interval is 6 hours
(collection.md).
``topic.query`` is a free-text search string.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from .base import Observation, Source, Topic, now_ms
from .http_util import get_json, strip_html

BASE = "https://api.crossref.org/works"


def _created_ms(item: dict) -> int:
    for key in ("created", "issued"):
        part = (item.get(key) or {}).get("date-time") \
            or (item.get(key) or {}).get("date-parts")
        if not part:
            continue
        try:
            if isinstance(part, str):
                d = datetime.fromisoformat(part.replace("Z", "+00:00"))
                return int(d.timestamp() * 1000)
            y, m, day = (part[0] + [1, 1])[:3]
            d = datetime(int(y), int(m), int(day), tzinfo=timezone.utc)
            return int(d.timestamp() * 1000)
        except (ValueError, TypeError, IndexError):
            continue
    return 0


class CrossrefSource:
    name = "crossref"
    default_interval_s = 21600        # 6 hours

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        q = (topic.query or "").strip()
        if not q:
            return []
        params: dict = {
            "query": q, "rows": "25", "sort": "created", "order": "desc",
            "select": "DOI,title,abstract,author,created,issued,container-title,URL",
        }
        mailto = os.environ.get("PEOS_CONTACT_EMAIL", "")
        if mailto:
            params["mailto"] = mailto
        data = get_json(BASE, params=params)
        items = ((data or {}).get("message") or {}).get("items") or []
        out: list[Observation] = []
        for it in items:
            doi = (it.get("DOI") or "").lower()
            if not doi:
                continue
            ts = _created_ms(it)
            if since_ms and ts and ts < since_ms:
                continue
            authors = it.get("author") or []
            first = authors[0] if authors else {}
            out.append(Observation(
                source=self.name,
                source_type="paper",
                native_id=doi,
                native_url=it.get("URL") or f"https://doi.org/{doi}",
                observed_at_ms=ts,
                author=f"{first.get('given', '')} {first.get('family', '')}".strip(),
                title=(it.get("title") or [""])[0],
                body=strip_html(it.get("abstract", "") or "").strip(),
                topics=[topic.topic_id],
                raw={"doi": doi,
                     "container": (it.get("container-title") or [""])[0],
                     "authors": [f"{a.get('given', '')} {a.get('family', '')}".strip()
                                 for a in authors[:10]]},
            ))
        return out
