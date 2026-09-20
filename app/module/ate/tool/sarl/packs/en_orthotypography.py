"""Pack en-orthotypography — English typographic conventions:
curly quotes and apostrophes, ellipsis, spacing, capitalization.
"""
import re

from . import base

PACK = {
    "id": "en-orthotypography",
    "languages": ["en"],
    "dimension": "ortotipografica",
    "status": "live",
    "description": ("straight → curly quotes, apostrophes, ellipsis, "
                    "double spaces, capitalization"),
}

_APOS_RE = re.compile(r"(\w)'(\w)")
_CAPITAL_RE = re.compile(r"([.!?…][ \t\n\u00a0]+)([a-z])")
_ABBREV_RE = re.compile(
    r"(?:\be\.g\.?|\bi\.e\.?|\betc\.?|\bvs\.?|\bfig\.?|\bno\.)\s*$",
    re.IGNORECASE)
_SHORT_WORD_RE = re.compile(r"(?:^|[\s(\"'])\w{1,3}\.$")


def _quotes(ctx):
    rule = RULE_BY_ID["en-orth-straight-quotes"]
    out = []
    open_next = True
    for i, ch in enumerate(ctx.text):
        if ch == '"':
            sug = "\u201c" if open_next else "\u201d"
            out.append(base.make_finding(ctx, i, i + 1, rule, sug))
            open_next = not open_next
    return out


def _apostrophes(ctx):
    rule = RULE_BY_ID["en-orth-apostrophe"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, "\u2019")
            for m in _APOS_RE.finditer(ctx.text)]


def _ellipsis(ctx):
    rule = RULE_BY_ID["en-orth-ellipsis"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, "\u2026")
            for m in re.finditer(r"\.\.\.", ctx.text)]


def _double_space(ctx):
    rule = RULE_BY_ID["en-orth-double-space"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, " ")
            for m in re.finditer(r"(?<![ \n])[ ]{2,}(?![ \n])", ctx.text)]


def _capitals(ctx):
    rule = RULE_BY_ID["en-orth-capital-after-punct"]
    out = []
    for m in _CAPITAL_RE.finditer(ctx.text):
        prefix = m.group(1)
        before = ctx.text[max(0, m.start() - 14):m.start() + 1]
        if _ABBREV_RE.search(before) or _SHORT_WORD_RE.search(before):
            continue
        out.append(base.make_finding(ctx, m.start(), m.end(), rule,
                                     prefix + m.group(2).upper()))
    return out


RULES = [
    {"id": "en-orth-straight-quotes", "pack": "en-orthotypography",
     "dimension": "ortotipografica", "severity": "warning",
     "message": ("straight quotes: use typographic curly quotes "
                 "\u201c \u201d"),
     "find": _quotes},
    {"id": "en-orth-apostrophe", "pack": "en-orthotypography",
     "dimension": "ortotipografica", "severity": "warning",
     "message": "straight apostrophe between letters: use \u2019",
     "find": _apostrophes},
    {"id": "en-orth-ellipsis", "pack": "en-orthotypography",
     "dimension": "ortotipografica", "severity": "warning",
     "message": "the ellipsis is one character (\u2026)",
     "find": _ellipsis},
    {"id": "en-orth-double-space", "pack": "en-orthotypography",
     "dimension": "ortotipografica", "severity": "suggestion",
     "message": "double space: leave a single space",
     "find": _double_space},
    {"id": "en-orth-capital-after-punct", "pack": "en-orthotypography",
     "dimension": "ortotipografica", "severity": "error",
     "message": "capitalize after a full stop, exclamation or question mark",
     "find": _capitals},
]

RULE_BY_ID = {r["id"]: r for r in RULES}
