"""PEOS analytics — pure aggregation functions over the observation corpus.

Every function here takes a plain list of observation dicts (the shape written
by :mod:`peos.server`) and returns JSON-serialisable structures for the
``/api/analytics`` endpoint. Nothing touches CouchDB directly; the server loads
``store.all()`` once, filters to observations, and calls :func:`compute`.

Computations are deliberately stdlib-only and O(n) (or O(n·k) for small k) —
the whole corpus for a personal tool is tens of thousands of items.
"""
from __future__ import annotations

import html
import json
import math
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Optional

_HERE = os.path.dirname(os.path.abspath(__file__))
_STOPWORDS_PATH = os.path.join(_HERE, "data", "stopwords-en.json")

with open(_STOPWORDS_PATH, "r", encoding="utf-8") as _fh:
    STOPWORDS = set(json.load(_fh))

# Token noise common to web-scraped text: URL/domain fragments, Reddit/HN/Mastodon chrome.
_NOISE = {
    "https", "http", "www", "com", "org", "net", "io", "co", "html", "php", "asp",
    "github", "gitlab", "reddit", "subreddit", "thread", "threads", "permalink",
    "comments", "comment", "reply", "replies", "share", "report", "save", "hide",
    "submitted", "deleted", "removed", "points", "score", "karma", "ago", "edited",
    "amp", "quot", "nbsp", "lt", "gt", "apos", "mdash", "ndash",
    "link", "links", "will", "just", "also", "via",
}
STOPWORDS |= _NOISE

_TOKEN_RE = re.compile(r"[^\W_]+", re.UNICODE)
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_HEXENT_RE = re.compile(r"&#x[0-9a-fA-F]+;|&#[0-9]+;|&[a-zA-Z]+;")


# ── tokenization ─────────────────────────────────────────────────────────────
def _clean_text(text: str) -> str:
    """Strip URLs, decode HTML entities (so ``x2f``/``&amp;`` don't pollute)."""
    if not text:
        return ""
    text = _URL_RE.sub(" ", text)
    text = html.unescape(text)              # &#x2f; → /, &amp; → &
    text = _HEXENT_RE.sub(" ", text)        # any leftovers
    return text


def tokenize(text: str, keep_stopwords: bool = False) -> list[str]:
    """Lowercase letter-runs of length >= 3, minus stopwords/URL-noise."""
    if not text:
        return []
    toks = [t for t in _TOKEN_RE.findall(_clean_text(text).lower()) if len(t) >= 3]
    if keep_stopwords:
        return toks
    return [t for t in toks if t not in STOPWORDS]


def _text(obs: dict) -> str:
    return (obs.get("title", "") or "") + " " + (obs.get("body", "") or "")


def _dt(ms: int) -> datetime:
    return datetime.fromtimestamp((ms or 0) / 1000, tz=timezone.utc)


def _day_key(ms: int) -> str:
    return _dt(ms).strftime("%Y-%m-%d") if ms else ""


def _hour_key(ms: int) -> str:
    return _dt(ms).strftime("%Y-%m-%dT%H:00") if ms else ""


# ── volume over time (the orienting backbone) ────────────────────────────────
def volume_series(obs: list[dict], granularity: str = "auto") -> dict:
    """Stacked volume per source per time bucket.

    Returns ``{"bucket":"day|hour", "buckets":[...], "series":[{name,data}], "total":[...]}``.
    Empty buckets are filled with 0 so the axis is continuous.
    """
    if not obs:
        return {"bucket": "day", "buckets": [], "series": [], "total": []}
    times = [o.get("observed_at_ms") or 0 for o in obs if o.get("observed_at_ms")]
    if not times:
        return {"bucket": "day", "buckets": [], "series": [], "total": []}
    span_days = (max(times) - min(times)) / 86_400_000
    if granularity == "auto":
        granularity = "hour" if span_days <= 2 else "day"
    keyf = _hour_key if granularity == "hour" else _day_key

    by_src: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    buckets_seen: set[str] = set()
    for o in obs:
        ms = o.get("observed_at_ms") or 0
        if not ms:
            continue
        b = keyf(ms)
        buckets_seen.add(b)
        by_src[o.get("source", "?")][b] += 1
    buckets = sorted(buckets_seen)
    sources = sorted(by_src)
    series = []
    for s in sources:
        series.append({"name": s, "data": [by_src[s].get(b, 0) for b in buckets]})
    total = [sum(by_src[s].get(b, 0) for s in sources) for b in buckets]
    return {"bucket": granularity, "buckets": buckets, "series": series, "total": total}


def spike_scores(volume: dict) -> list[dict]:
    """Flag buckets whose total z-score vs the trailing window is high."""
    total = volume.get("total", [])
    buckets = volume.get("buckets", [])
    n = len(total)
    if n < 5:
        return []
    window = 7
    out = []
    for i in range(n):
        lo = max(0, i - window)
        trail = total[lo:i] or [0]
        mean = sum(trail) / len(trail)
        var = sum((x - mean) ** 2 for x in trail) / len(trail)
        std = math.sqrt(var) or 1e-9
        z = (total[i] - mean) / std
        if z >= 2.0 and total[i] >= 3:
            out.append({"bucket": buckets[i], "index": i, "value": total[i], "z": round(z, 2)})
    return out


# ── trending terms (recent vs baseline) ──────────────────────────────────────
def top_terms(obs: list[dict], n: int = 100, where: Optional[set] = None) -> list[dict]:
    c = Counter()
    for o in obs:
        for t in tokenize(_text(o)):
            if where and t not in where:
                continue
            c[t] += 1
    return [{"name": k, "value": v} for k, v in c.most_common(n)]


def top_bigrams(obs: list[dict], n: int = 50) -> list[dict]:
    c = Counter()
    for o in obs:
        toks = tokenize(_text(o))
        for a, b in zip(toks, toks[1:]):
            if a in STOPWORDS or b in STOPWORDS:
                continue
            c[f"{a} {b}"] += 1
    return [{"name": k, "value": v} for k, v in c.most_common(n) if v >= 2]


def trending_terms(obs: list[dict], now_ms: int, n: int = 20) -> list[dict]:
    """Terms rising in the last 24h vs the preceding 7-day baseline."""
    recent_h = 24
    base_h = 24 * 7
    recent_cut = now_ms - recent_h * 3_600_000
    base_cut = now_ms - (recent_h + base_h) * 3_600_000
    recent = Counter()
    baseline = Counter()
    for o in obs:
        ms = o.get("observed_at_ms") or 0
        toks = tokenize(_text(o))
        if ms >= recent_cut:
            recent.update(set(toks))
        elif ms >= base_cut:
            baseline.update(set(toks))
    rr = recent_h
    br = base_h or 1
    scored = []
    for term, rc in recent.items():
        bc = baseline.get(term, 0)
        recent_rate = rc / rr
        base_rate = (bc + 1) / br
        score = rc * math.log2((recent_rate + 1e-9) / base_rate + 1.0)
        if rc >= 2 and score > 0:
            scored.append({"name": term, "value": round(score, 2), "recent": rc, "baseline": bc})
    scored.sort(key=lambda x: x["value"], reverse=True)
    return scored[:n]


# ── hot now: per-source/topic spike + trending merge ─────────────────────────
def hot_now(obs: list[dict], now_ms: int, n: int = 12) -> list[dict]:
    """Items per source/topic in the last 24h weighted by 7-day baseline ratio."""
    recent_cut = now_ms - 24 * 3_600_000
    base_cut = now_ms - 8 * 24 * 3_600_000
    recent = Counter()
    baseline = Counter()
    for o in obs:
        ms = o.get("observed_at_ms") or 0
        key = o.get("source", "?")
        if ms >= recent_cut:
            recent[key] += 1
        elif ms >= base_cut:
            baseline[key] += 1
    scored = []
    for key, rc in recent.items():
        bc = baseline.get(key, 0)
        ratio = rc / max(bc / 7.0, 0.5)
        scored.append({"name": key, "value": rc, "heat": round(ratio, 2)})
    scored.sort(key=lambda x: x["heat"], reverse=True)
    return scored[:n]


# ── composition: topic × source sankey ───────────────────────────────────────
def topic_source_sankey(obs: list[dict], cap: int = 8) -> dict:
    """Topic → source flow. ``cap`` top topics retained (plus an 'untagged' bucket)."""
    cross: Counter = Counter()  # (topic, source)
    for o in obs:
        src = o.get("source", "?")
        topics = o.get("topics") or ["(untagged)"]
        for t in topics:
            cross[(t, src)] += 1
    topic_totals: Counter = Counter()
    for (t, _s), v in cross.items():
        topic_totals[t] += v
    top_topics = [t for t, _ in topic_totals.most_common(cap)]
    sources = sorted({s for (_t, s) in cross})
    nodes = [{"name": t} for t in top_topics] + [{"name": s} for s in sources]
    topic_set = set(top_topics)
    links = []
    for (t, s), v in cross.items():
        if t in topic_set:
            links.append({"source": t, "target": s, "value": v})
    return {"nodes": nodes, "links": links, "topics": top_topics, "sources": sources}


# ── co-occurrence force graph ────────────────────────────────────────────────
def cooccurrence_graph(obs: list[dict], max_nodes: int = 60, min_edge: int = 3) -> dict:
    freq: Counter = Counter()
    pair: Counter = Counter()
    for o in obs:
        toks = list(dict.fromkeys(tokenize(_text(o))))[:12]  # unique, capped
        for t in toks:
            freq[t] += 1
        for i in range(len(toks)):
            for j in range(i + 1, len(toks)):
                a, b = sorted((toks[i], toks[j]))
                if a != b:
                    pair[(a, b)] += 1
    top = {t for t, _ in freq.most_common(max_nodes)}
    nodes = [{"id": t, "name": t, "value": freq[t]} for t in sorted(top, key=lambda x: -freq[x])]
    links = []
    for (a, b), v in pair.most_common():
        if v < min_edge:
            continue
        if a in top and b in top:
            links.append({"source": a, "target": b, "value": v})
    return {"nodes": nodes, "links": links}


# ── tone (VADER-style) ───────────────────────────────────────────────────────
def score_tone(text: str, lexicon: dict) -> float:
    """Coarse tone in [-1, +1] for one text (negation-aware-ish)."""
    toks = _TOKEN_RE.findall((text or "").lower())
    if not toks:
        return 0.0
    total = 0.0
    for i, t in enumerate(toks):
        w = lexicon.get(t)
        if w is None:
            continue
        # negation flips the previous sentiment word
        if i > 0 and toks[i - 1] in {"not", "no", "never", "without", "isn't", "wasn't",
                                      "don't", "doesn't", "didn't", "can't", "won't"}:
            w = -w * 0.7
        # intensifier scales it
        if i > 0 and toks[i - 1] in {"very", "really", "extremely", "so", "too", "incredibly"}:
            w *= 1.4
        total += w
    norm = total / math.sqrt(len(toks))
    return max(-1.0, min(1.0, norm / 3.0))


def tone_aggregates(obs: list[dict], lexicon: dict) -> dict:
    by_src: dict[str, list[float]] = defaultdict(list)
    allv = []
    for o in obs:
        s = score_tone(_text(o), lexicon)
        by_src[o.get("source", "?")].append(s)
        allv.append(s)
    mean = (sum(allv) / len(allv)) if allv else 0.0

    def buckets(vals):
        pos = sum(1 for v in vals if v > 0.15)
        neg = sum(1 for v in vals if v < -0.15)
        neu = len(vals) - pos - neg
        return {"pos": pos, "neu": neu, "neg": neg}

    return {
        "mean": round(mean, 3),
        "by_source": {s: {"mean": round(sum(v) / len(v), 3) if v else 0.0,
                          "n": len(v), **buckets(v)} for s, v in by_src.items()},
    }


# ── clusters ─────────────────────────────────────────────────────────────────
def cluster_summary(obs: list[dict], assignments: dict) -> dict:
    """Summarize a {obs_id -> {cluster_id,label}} map against observations."""
    by_cluster: dict[str, list[dict]] = defaultdict(list)
    orphan = 0
    for o in obs:
        a = assignments.get(o.get("id") or o.get("_id"))
        if not a:
            orphan += 1
            continue
        by_cluster[a.get("cluster_id", "?")].append(o)
    clusters = []
    for cid, items in by_cluster.items():
        label = items[0] and assignments.get(items[0].get("id"), {}).get("label", cid)
        # top terms inside the cluster
        c = Counter()
        for o in items:
            for t in tokenize(_text(o)):
                c[t] += 1
        clusters.append({
            "cluster_id": cid, "label": label, "count": len(items),
            "top_terms": [t for t, _ in c.most_common(8)],
            "sources": dict(Counter(o.get("source", "?") for o in items)),
            "sample": [{"title": o.get("title", ""), "source": o.get("source", ""),
                        "url": o.get("native_url", "")} for o in items[:4]],
        })
    clusters.sort(key=lambda c: c["count"], reverse=True)
    return {"clusters": clusters, "unassigned": orphan, "k": len(clusters)}


# ── master blob ──────────────────────────────────────────────────────────────
def compute(obs: list[dict], lexicon: dict, cluster_assignments: Optional[dict] = None,
            now_ms: Optional[int] = None) -> dict:
    """Compute the full analytics blob for ``/api/analytics``."""
    import time
    now = now_ms or int(time.time() * 1000)
    vol = volume_series(obs)
    return {
        "generated_at_ms": now,
        "n": len(obs),
        "volume": vol,
        "spikes": spike_scores(vol),
        "hot_now": hot_now(obs, now),
        "trending": trending_terms(obs, now),
        "sankey": topic_source_sankey(obs),
        "cooccurrence": cooccurrence_graph(obs),
        "top_terms": top_terms(obs),
        "top_bigrams": top_bigrams(obs),
        "tone": tone_aggregates(obs, lexicon),
        "clusters": cluster_summary(obs, cluster_assignments or {}),
        "sources": dict(Counter(o.get("source", "?") for o in obs)),
    }
