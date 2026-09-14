"""arXiv source — preprints via the official Atom API (free, no auth).

Covers CS, physics, math, economics, quantitative biology/finance — the
primary preprint stream for ML/AI/econ observation. ``source_type="paper"``.

Docs: https://info.arxiv.org/help/api/user-manual.html
Politeness: arXiv asks for **no more than one request every 3 seconds**; the
adapter enforces that gap module-wide (collection.md, rule→mechanism table).
``topic.query`` is arXiv search syntax (``cat:cs.LG``, ``all:scaling laws``,
``ti:world models``); plain text is wrapped as ``all:"<query>"``.
"""
from __future__ import annotations

import re
import time
import urllib.parse

from .base import Observation, Source, Topic
from .http_util import feed_time_ms, get_feed, strip_html

BASE = "https://export.arxiv.org/api/query"
_MIN_GAP_S = 3.0                    # arXiv's documented politeness floor
_LAST_REQUEST = [0.0]
_FIELD_RE = re.compile(r"^(cat|all|ti|au|abs|co|jr|k|id):", re.IGNORECASE)
_ABS_RE = re.compile(r"/abs/([^\s/?#]+?)(?:v\d+)?/?$")


def _throttle() -> None:
    """Block until >= 3 s have passed since the last arXiv request."""
    wait = _MIN_GAP_S - (time.time() - _LAST_REQUEST[0])
    if wait > 0:
        time.sleep(wait)
    _LAST_REQUEST[0] = time.time()


class ArxivSource:
    name = "arxiv"
    default_interval_s = 21600        # 6 hours (arXiv announces roughly daily)

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        q = (topic.query or "").strip()
        if not q:
            return []
        search_query = q if _FIELD_RE.match(q) else f'all:"{q}"'
        url = BASE + "?" + urllib.parse.urlencode({
            "search_query": search_query, "start": "0", "max_results": "25",
            "sortBy": "lastUpdatedDate", "sortOrder": "descending",
        })
        _throttle()
        feed = get_feed(url, timeout=45)   # arXiv's API is routinely slow
        out: list[Observation] = []
        for entry in getattr(feed, "entries", []) or []:
            m = _ABS_RE.search(entry.get("id", "") or "")
            if not m:
                continue
            arxiv_id = m.group(1)
            ts = feed_time_ms(entry)
            if since_ms and ts and ts < since_ms:
                continue
            authors = [a.get("name", "") for a in entry.get("authors", []) or []]
            out.append(Observation(
                source=self.name,
                source_type="paper",
                native_id=arxiv_id,
                native_url=f"https://arxiv.org/abs/{arxiv_id}",
                observed_at_ms=ts or 0,
                author=authors[0] if authors else "",
                title=strip_html(entry.get("title", "") or "").strip(),
                body=strip_html(entry.get("summary", "") or "").strip(),
                topics=[topic.topic_id],
                raw={"arxiv_id": arxiv_id,
                     "link": entry.get("link", ""),
                     "authors": authors},
            ))
        return out
