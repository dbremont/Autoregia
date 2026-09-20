"""Pack es-ortotipografica — the typography conventions of the written
sign, per RAE's Ortografía: quotes, dashes, ellipsis, spacing,
capitalization, abbreviation and number typography. The zero-dependency
workhorse.
"""
import re

from . import base

PACK = {
    "id": "es-ortotipografia",
    "languages": ["es"],
    "dimension": "ortotipografica",
    "status": "live",
    "description": ("comillas latinas, raya vs. guion, elipsis, dobles "
                    "espacios, mayúsculas, abreviaturas y números — "
                    "RAE Ortografía"),
}

# Abbreviations that legitimately keep a lowercase continuation word
# after the period (p. ej., etc., pág., vs., s. f., …).
_ABBREV_RE = re.compile(
    r"(?:\bp\.\s?ej\.?|\betc\.?|\bpág\.?|\bpp\.?|\bvs\.?|\bs\.\s?f\.?|"
    r"\ba\.\s?m\.?|\bp\.\s?m\.?|\bsig\.?|\bsigs\.?|\bed\.?|\bvol\.?|"
    r"\bn\.\s?úm\.?|\bart\.)\s*$",
    re.IGNORECASE)

_APOS_RE = re.compile(r"(\w)'(\w)")
_DOUBLE_SPACE_RE = re.compile(r"(?<![ \n])[ ]{2,}(?![ \n])")
_RAYA_RE = re.compile(r"(\S) - (\S)")
_CAPITAL_RE = re.compile(r"([.!?…][" + r" \t\n\u00a0" + r"]+)([" + "a-záéíóúüñ" + r"])")
_PEJ_RE = re.compile(r"\bp\.ej\b\.?|\bp\. ej\b(?!\.)")
_DECIMAL_RE = re.compile(r"(?<!\w)(\d+)\.(\d+)(?!\w)")
_SHORT_WORD_RE = re.compile(r"(?:^|[\s(«\"'¡¿])\w{1,3}\.$")


def _quotes(ctx):
    rule = RULE_BY_ID["es-ort-straight-quotes"]
    out = []
    open_next = True
    for i, ch in enumerate(ctx.text):
        if ch == '"':
            sug = "«" if open_next else "»"
            out.append(base.make_finding(ctx, i, i + 1, rule, sug))
            open_next = not open_next
    return out


def _apostrophes(ctx):
    rule = RULE_BY_ID["es-ort-apostrophe"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, "’")
            for m in _APOS_RE.finditer(ctx.text)]


def _ellipsis(ctx):
    rule = RULE_BY_ID["es-ort-ellipsis"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, "…")
            for m in re.finditer(r"\.\.\.", ctx.text)]


def _double_space(ctx):
    rule = RULE_BY_ID["es-ort-double-space"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, " ")
            for m in _DOUBLE_SPACE_RE.finditer(ctx.text)]


def _raya(ctx):
    rule = RULE_BY_ID["es-ort-spaced-hyphen"]
    return [base.make_finding(ctx, m.start(), m.end(), rule,
                              m.group(1) + " — " + m.group(3))
            for m in re.finditer(r"(\S)( - )(\S)", ctx.text)]


def _capitals(ctx):
    rule = RULE_BY_ID["es-ort-capital-after-punct"]
    out = []
    for m in _CAPITAL_RE.finditer(ctx.text):
        prefix = m.group(1)
        before = ctx.text[max(0, m.start() - 14):m.start() + 1]
        # Known abbreviations keep a lowercase continuation (p. ej., etc.),
        # and so does any period after a short word (p., vs., s. f.).
        if _ABBREV_RE.search(before) or _SHORT_WORD_RE.search(before):
            continue
        out.append(base.make_finding(
            ctx, m.start(), m.end(), rule,
            prefix + m.group(2).upper()))
    return out


def _p_ej(ctx):
    rule = RULE_BY_ID["es-ort-abbreviation-p-ej"]
    return [base.make_finding(ctx, m.start(), m.end(), rule, "p. ej.")
            for m in _PEJ_RE.finditer(ctx.text)]


def _decimal(ctx):
    rule = RULE_BY_ID["es-ort-decimal-comma"]
    return [base.make_finding(ctx, m.start(), m.end(), rule,
                              m.group(1) + "," + m.group(2))
            for m in _DECIMAL_RE.finditer(ctx.text)]


RULES = [
    {"id": "es-ort-straight-quotes", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "warning",
     "message": ("comillas rectas: la tipografía española pide comillas "
                 "latinas «» en primer nivel"),
     "find": _quotes},
    {"id": "es-ort-apostrophe", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "warning",
     "message": ("apóstrofo recto entre letras: usa el apóstrofo "
                 "tipográfico ’"),
     "find": _apostrophes},
    {"id": "es-ort-ellipsis", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "warning",
     "message": "los puntos suspensivos son un solo carácter (…)",
     "find": _ellipsis},
    {"id": "es-ort-double-space", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "suggestion",
     "message": "espacio doble: deja un solo espacio",
     "find": _double_space},
    {"id": "es-ort-spaced-hyphen", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "suggestion",
     "message": ("guion rodeado de espacios con valor de inciso o raya: "
                 "usa la raya (—)"),
     "find": _raya},
    {"id": "es-ort-capital-after-punct", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "error",
     "message": "tras punto, signos de exclamación o interrogación, "
                "mayúscula",
     "find": _capitals},
    {"id": "es-ort-abbreviation-p-ej", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "suggestion",
     "message": ('la abreviatura de "por ejemplo" se escribe «p. ej.»'),
     "find": _p_ej},
    {"id": "es-ort-decimal-comma", "pack": "es-ortotipografia",
     "dimension": "ortotipografica", "severity": "suggestion",
     "message": ("en español la coma es el signo decimal "
                 "(el punto es de la tradición inglesa)"),
     "find": _decimal},
]

RULE_BY_ID = {r["id"]: r for r in RULES}
