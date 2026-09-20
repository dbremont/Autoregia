"""SARL rule-pack base — shared matcher helpers.

Every rule is deterministic: the same text over the same packs always
yields the same findings. A rule's ``find(ctx)`` returns raw finding
dicts (no review linkage, no disposition); the engine assigns ids and
counts. A finding without its span is a bug.
"""
import re

SEVERITY_RANK = {"error": 0, "warning": 1, "suggestion": 2}

# Letters with the full Spanish repertoire — the tokenizer's word body.
_LETTERS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ"
WORD_RE = re.compile(f"[{_LETTERS}]+")
WORDISH_RE = re.compile(f"[{_LETTERS}" + "0-9]+")

# Common Spanish/English discourse words excluded from repetition counts.
STOPWORDS = {
    # es
    "sobre", "entre", "porque", "cuando", "aunque", "mientras", "desde",
    "hasta", "según", "durante", "todos", "todas", "puede", "pueden",
    "debe", "deben", "entre", "también", "tambien", "pero", "para",
    "como", "cada", "donde", "quien", "cuales", "estos", "estas",
    "aquel", "aquella", "tiene", "tienen", "hacer", "hace", "parte",
    "forma", "manera", "través", "traves", "correo", "web",
    # en
    "about", "after", "before", "being", "their", "there", "these",
    "those", "which", "while", "would", "could", "should", "where",
    "other", "because", "through", "between", "under", "over",
}

SENTENCE_RE = re.compile(r"[^.!?\n…]+[.!?…]+|[^.!?\n…]+$")


def sentences(text):
    """Yield (start, end, sentence_text) — whitespace-trimmed spans."""
    for m in SENTENCE_RE.finditer(text):
        raw = m.group(0)
        lead = len(raw) - len(raw.lstrip())
        trail = len(raw) - len(raw.rstrip())
        start, end = m.start() + lead, m.end() - trail
        if end > start:
            yield start, end, text[start:end]


def words(sentence):
    """Lowercased word tokens of a sentence as (start, end, word)."""
    for m in WORD_RE.finditer(sentence):
        yield m.start(), m.end(), m.group(0).lower()


def phrase_regex(phrase):
    """Whole-phrase matcher: case-insensitive, flexible whitespace,
    guarded at both ends so «casa» never matches «casaca»."""
    body = re.escape(phrase).replace("\\ ", "\\s+").replace(" ", "\\s+")
    return re.compile(r"(?<!\w)" + body + r"(?!\w)", re.IGNORECASE)


def term_regex(term):
    """Whole-term matcher for glossary lookups (single or multi word)."""
    return re.compile(r"(?<!\w)" + re.escape(term) + r"(?!\w)", re.IGNORECASE)


def make_finding(ctx, start, end, rule, suggestion=None, message_suffix=""):
    """Build one raw finding: span, quoted evidence, message, suggestion.

    The evidence quotes the exact span (never a bare line number); a
    pathological span is truncated to the configured excerpt cap.
    """
    raw = ctx.text[start:end]
    cap = ctx.excerpt_cap
    if len(raw) > cap:
        evidence = raw[:cap - 1] + "…"
    else:
        evidence = raw
    return {
        "rule_id": rule["id"],
        "pack": rule["pack"],
        "dimension": rule["dimension"],
        "severity": rule["severity"],
        "start": start,
        "end": end,
        "evidence": evidence,
        "message": rule["message"] + message_suffix,
        "suggestion": suggestion,
        "engine": "live",
    }


def phrase_list(phrases):
    """Normalize a phrase collection's ``phrases`` field to strings."""
    out = []
    for p in phrases or []:
        if isinstance(p, str) and p.strip():
            out.append(p.strip())
        elif isinstance(p, dict) and p.get("text"):
            out.append(str(p["text"]).strip())
    return out


def glossary_entries(glossaries):
    """Normalize attached glossary docs to entry dicts."""
    entries = []
    for g in glossaries or []:
        for e in g.get("entries") or []:
            preferred = (e.get("preferred") or "").strip()
            if not preferred:
                continue
            entries.append({
                "glossary_id": g.get("id"),
                "preferred": preferred,
                "forbidden": [t for t in (e.get("forbidden") or []) if t],
                "aliases": [t for t in (e.get("aliases") or []) if t],
                "note": e.get("note") or "",
            })
    return entries


# ── markdown protection ──────────────────────────────────────────────────────
# The document under review is markdown: code, links, and markup are
# intentionally non-prose, so findings never fire inside them.

_FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
_INDENTED_RE = re.compile(r"^(?:    |\t)")
_INLINE_CODE_RE = re.compile(r"`+[^`\n]+`+")
_LINK_URL_RE = re.compile(r"\]\([^)\n]*\)")
_AUTOLINK_RE = re.compile(r"<https?://[^>\s]+>")


def protected_spans(text):
    """Markdown regions where findings never fire: fenced and indented
    code blocks, inline code spans, and link/autolink URLs."""
    spans = []
    block_start = None
    block_end = None
    in_fence = False
    fence = ""
    pos = 0
    for line in text.split("\n"):
        line_start = pos
        pos += len(line) + 1
        if in_fence:
            if line.strip().startswith(fence):
                spans.append((block_start, line_start + len(line)))
                in_fence = False
                block_start = None
            continue
        m = _FENCE_RE.match(line)
        if m:
            in_fence = True
            fence = m.group(1)[:3]
            block_start = line_start
            continue
        if _INDENTED_RE.match(line):
            # an indented code block opens only after a blank line (or
            # at the very start); otherwise it is wrapped prose
            if block_start is None:
                prev = text[:line_start]
                if line_start == 0 or prev.endswith("\n\n"):
                    block_start = line_start
            block_end = line_start + len(line)
            continue
        if block_start is not None and line.strip():
            spans.append((block_start, block_end))
            block_start = None
    if in_fence and block_start is not None:
        spans.append((block_start, len(text)))
    elif block_start is not None:
        spans.append((block_start, block_end))

    for rx in (_INLINE_CODE_RE, _LINK_URL_RE, _AUTOLINK_RE):
        for m in rx.finditer(text):
            spans.append(m.span())
    spans.sort()
    merged = []
    for s, e in spans:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    return merged


def overlaps_any(start, end, spans):
    return any(start < e and s < end for s, e in spans)
