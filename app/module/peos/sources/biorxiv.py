"""bioRxiv source — biology preprints via the details API (free, no auth).

Date-cursor listing (the API has no search endpoint), so ``poll`` walks the
window since the topic's cursor and optionally filters client-side.
``source_type="paper"``.

Docs: https://api.biorxiv.org/ (also serves medRxiv at ``/details/medrxiv``)
Politeness: relaxed API; the daily default interval keeps us far under any
conceivable load (collection.md).
``topic.query`` is ``all`` (everything in the window) or a substring filter
matched against title/abstract/category.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .base import Observation, Source, Topic, now_ms
from .http_util import get_json

BASE = "https://api.biorxiv.org/details/biorxiv"
_MAX_PAGES = 3                     # ~90 papers per poll, far enough back


def _day(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def _date_ms(day: str) -> int:
    try:
        d = datetime.strptime((day or "")[:10], "%Y-%m-%d")
        return int(d.replace(tzinfo=timezone.utc).timestamp() * 1000)
    except ValueError:
        return 0


class BiorxivSource:
    name = "biorxiv"
    default_interval_s = 86400        # daily (postings arrive in daily batches)

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        if since_ms:
            frm = _day(since_ms)
        else:
            frm = _day(now_ms() - timedelta(days=7).total_seconds() * 1000)
        to = _day(now_ms())
        needle = (topic.query or "").strip().lower()
        doc_filter = "" if needle in ("", "all") else needle

        out: list[Observation] = []
        cursor = 0
        for _ in range(_MAX_PAGES):
            data = get_json(f"{BASE}/{frm}/{to}/{cursor}") or {}
            coll = data.get("collection") or []
            if not coll:
                break
            for p in coll:
                doi = (p.get("doi") or "").lower()
                if not doi:
                    continue
                haystack = " ".join((p.get("title", ""), p.get("abstract", ""),
                                     p.get("category", ""))).lower()
                if doc_filter and doc_filter not in haystack:
                    continue
                authors = [a.strip() for a in (p.get("authors") or "").split(";") if a.strip()]
                out.append(Observation(
                    source=self.name,
                    source_type="paper",
                    native_id=doi,
                    native_url=f"https://doi.org/{doi}",
                    observed_at_ms=_date_ms(p.get("date", "")),
                    author=authors[0] if authors else "",
                    title=p.get("title", "") or "",
                    body=(p.get("abstract", "") or "").strip(),
                    topics=[topic.topic_id],
                    raw={"doi": doi, "category": p.get("category", ""),
                         "server": p.get("server", ""), "authors": authors[:10]},
                ))
            nxt = ((data.get("messages") or [{}])[0]).get("cursor")
            if not nxt or int(nxt) <= cursor:
                break
            cursor = int(nxt)
        return out
