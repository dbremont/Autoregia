"""OpenAlex source — scholarly works via the Graph API (free, no auth).

250M+ works across every field, with DOI-native ids and citation data.
``source_type="paper"``.

Docs: https://docs.openalex.org/
Politeness: fully open API; we identify ourselves via the optional
``mailto`` parameter (env ``WOS_CONTACT_EMAIL``) and keep the default
interval at 6 hours (collection.md).
``query`` is a free-text search string.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from .base import Observation, Source, now_ms
from .http_util import get_json

BASE = "https://api.openalex.org/works"


def _abstract(inv: dict | None) -> str:
    """Rebuild abstract text from OpenAlex's inverted word index."""
    if not inv:
        return ""
    pos: dict[int, str] = {}
    for word, idxs in inv.items():
        for i in idxs or []:
            pos[i] = word
    return " ".join(pos[i] for i in sorted(pos))


def _date_ms(day: str) -> int:
    try:
        d = datetime.strptime((day or "")[:10], "%Y-%m-%d")
        return int(d.replace(tzinfo=timezone.utc).timestamp() * 1000)
    except ValueError:
        return 0


class OpenAlexSource:
    name = "openalex"
    default_interval_s = 21600        # 6 hours

    def poll(self, query: str, since_ms: int | None) -> list[Observation]:
        q = (query or "").strip()
        if not q:
            return []
        params: dict = {
            "search": q, "per-page": "25",
            "sort": "publication_date:desc",
        }
        if since_ms:
            day = datetime.fromtimestamp(since_ms / 1000, tz=timezone.utc)
            params["filter"] = f"from_publication_date:{day:%Y-%m-%d}"
        mailto = os.environ.get("WOS_CONTACT_EMAIL", "")
        if mailto:
            params["mailto"] = mailto
        data = get_json(BASE, params=params)
        out: list[Observation] = []
        for w in (data or {}).get("results", []) or []:
            doi = (w.get("doi") or w.get("id") or "").lower()
            if not doi:
                continue
            native_id = doi.replace("https://doi.org/", "")
            authors = [a.get("author", {}).get("display_name", "")
                       for a in w.get("authorships", []) or []]
            out.append(Observation(
                source=self.name,
                source_type="paper",
                native_id=native_id,
                native_url=w.get("doi") or w.get("id") or "",
                observed_at_ms=_date_ms(w.get("publication_date", "")),
                author=authors[0] if authors else "",
                title=w.get("display_name", "") or "",
                body=_abstract(w.get("abstract_inverted_index")),
                score=w.get("cited_by_count"),
                raw={"doi": native_id, "authors": authors,
                     "venue": (w.get("primary_location") or {}).get("source", {})
                     and ((w.get("primary_location") or {}).get("source") or {}).get("display_name", "")},
            ))
        return out
