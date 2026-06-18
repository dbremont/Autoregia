"""Semantic validator for PRSL.

The parser already enforces every rule expressible in ``gramar.ebnf``
(including enum alternatives). This module covers cross-field semantic rules
the grammar cannot express:

  * duplicate relations inside a record's ``relational-metadata`` block,
  * lifecycle ``state`` / ``superseded-by`` consistency,
  * ``revision`` must be a non-negative integer when present.
"""

from __future__ import annotations

from backend.prsl.ast import Document, Record
from backend.prsl.errors import ValidationError

__all__ = ["validate"]


def validate(doc: Document) -> None:
    """Raise :class:`ValidationError` if ``doc`` violates a semantic rule."""
    for rec in doc.records:
        _validate_record(rec)


def _validate_record(rec: Record) -> None:
    if not rec.id:
        raise ValidationError("record id must be non-empty", **_loc(rec))

    if rec.relational and rec.relational.relations:
        seen: set[tuple[str, str]] = set()
        for rel in rec.relational.relations:
            key = (rel.target, rel.relation_type)
            if key in seen:
                raise ValidationError(
                    f"duplicate relation ({rel.target}, {rel.relation_type})",
                    **_loc(rel),
                )
            seen.add(key)

    if rec.lifecycle:
        lm = rec.lifecycle
        if lm.state == "superseded" and not lm.superseded_by:
            raise ValidationError(
                "lifecycle state 'superseded' requires a 'superseded-by' reference",
                **_loc(lm),
            )
        if lm.superseded_by and lm.state != "superseded":
            raise ValidationError(
                "'superseded-by' is set but lifecycle state is not 'superseded'",
                **_loc(lm),
            )
        if lm.revision is not None:
            if isinstance(lm.revision.value, float) or lm.revision.value < 0:
                raise ValidationError(
                    f"revision must be a non-negative integer (got {lm.revision.raw})",
                    **_loc(lm),
                )


def _loc(node) -> dict:
    span = getattr(node, "span", None)
    if span is None or span.start is None:
        return {}
    return {"line": span.start.line, "col": span.start.col}
