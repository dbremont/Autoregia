"""PRSL serializer.

Produces deterministic PRSL text from a :class:`Document`. The output is
designed so that ``parse(serialize(parse(text)))`` is structurally stable.

Formatting conventions:
  * 2-space indentation for record fields, 4-space for block fields.
  * Core fields first (``content``, ``detail``, ``retention-policy``), then
    metadata blocks in grammar order.
  * Every field and every block is followed by ``;`` (the FieldSeparator).
  * Every record entry is followed by a ``---`` separator.
  * Structured values (lists/objects) are rendered inline and compact.
"""

from __future__ import annotations

from backend.prsl.ast import (
    BooleanLit,
    Document,
    ListLit,
    NullLit,
    NumberLit,
    ObjectLit,
    Record,
    RetentionPolicy,
    StringLit,
)

__all__ = ["serialize"]


# Canonical (kebab-key, python-attr) order for each key:value metadata block.
_TEMPORAL_ORDER = [
    ("created-at", "created_at"),
    ("updated-at", "updated_at"),
    ("valid-from", "valid_from"),
    ("valid-until", "valid_until"),
    ("deadline", "deadline"),
    ("recurrence", "recurrence"),
    ("orientation", "orientation"),
    ("projection-horizon", "projection_horizon"),
]

_CONTEXTUAL_ORDER = [
    ("project-context", "project_context"),
    ("organizational-context", "organizational_context"),
    ("strategic-context", "strategic_context"),
    ("emotional-context", "emotional_context"),
    ("environmental-context", "environmental_context"),
    ("location-context", "location_context"),
]

_OPERATIONAL_ORDER = [
    ("execution-state", "execution_state"),
    ("priority", "priority"),
    ("delegation", "delegation"),
    ("coordination-state", "coordination_state"),
    ("actionability", "actionability"),
]

_LIFECYCLE_ORDER = [
    ("state", "state"),
    ("revision", "revision"),
    ("superseded-by", "superseded_by"),
    ("archived-at", "archived_at"),
]

_GENERAL_ORDER = [
    ("classification", "classification"),
    ("tags", "tags"),
    ("domain", "domain"),
    ("cognitive-category", "cognitive_category"),
    ("operational-category", "operational_category"),
]


def serialize(doc: Document) -> str:
    """Serialize ``doc`` to PRSL text."""
    return "".join(_serialize_entry(rec) for rec in doc.records)


def _serialize_entry(rec: Record) -> str:
    lines = ["begin-record", f"record {rec.id} {{"]
    _emit_record_body(lines, rec, "  ")
    lines.append("}")
    lines.append("end-record")
    lines.append("---")
    return "\n".join(lines) + "\n"


def _emit_record_body(lines: list[str], rec: Record, indent: str) -> None:
    if rec.content is not None:
        lines.append(f"{indent}content : {_sv(rec.content)};")
    if rec.detail is not None:
        lines.append(f"{indent}detail : {_sv(rec.detail)};")
    if rec.retention_policy is not None:
        lines.append(f"{indent}retention-policy : {_retention(rec.retention_policy)};")
    if rec.temporal is not None:
        _emit_kv_block(lines, "temporal-metadata", _field_lines(rec.temporal, _TEMPORAL_ORDER), indent)
    if rec.contextual is not None:
        _emit_kv_block(
            lines, "contextual-metadata", _field_lines(rec.contextual, _CONTEXTUAL_ORDER), indent
        )
    if rec.epistemic is not None:
        _emit_kv_block(lines, "epistemic-metadata", _epistemic_lines(rec.epistemic), indent)
    if rec.operational is not None:
        _emit_kv_block(
            lines, "operational-metadata", _field_lines(rec.operational, _OPERATIONAL_ORDER), indent
        )
    if rec.lifecycle is not None:
        _emit_kv_block(
            lines, "lifecycle-metadata", _field_lines(rec.lifecycle, _LIFECYCLE_ORDER), indent
        )
    if rec.relational is not None:
        _emit_relational_block(lines, rec.relational, indent)
    if rec.general is not None:
        _emit_kv_block(lines, "general-metadata", _field_lines(rec.general, _GENERAL_ORDER), indent)


def _field_lines(block, order) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for key, attr in order:
        val = getattr(block, attr)
        if val is not None:
            out.append((key, _sv(val)))
    return out


def _epistemic_lines(b) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if b.confidence is not None:
        out.append(("confidence", f"{b.confidence.raw}%"))
    if b.validation_state is not None:
        out.append(("validation-state", _sv(b.validation_state)))
    if b.evidence_source is not None:
        out.append(("evidence-source", _sv(b.evidence_source)))
    if b.inference_status is not None:
        out.append(("inference-status", _sv(b.inference_status)))
    if b.certainty_level is not None:
        out.append(("certainty-level", _sv(b.certainty_level)))
    return out


def _emit_kv_block(lines: list[str], name: str, fields: list[tuple[str, str]], indent: str) -> None:
    inner = indent + "  "
    lines.append(f"{indent}{name} {{")
    for key, val in fields:
        lines.append(f"{inner}{key} : {val};")
    lines.append(f"{indent}}};")


def _emit_relational_block(lines: list[str], block, indent: str) -> None:
    inner = indent + "  "
    lines.append(f"{indent}relational-metadata {{")
    for rel in block.relations:
        lines.append(f"{inner}({rel.target}, {rel.relation_type});")
    lines.append(f"{indent}}};")


def _retention(rp: RetentionPolicy) -> str:
    if isinstance(rp.value, str):
        return rp.value
    return _sv(rp.value)


def _sv(v) -> str:
    """Render a structured value (or bare enum/identifier string)."""
    if isinstance(v, str):
        return v  # bare keyword / identifier (enum, delegation, relation text)
    if isinstance(v, StringLit):
        return '"' + _escape(v.value) + '"'
    if isinstance(v, NumberLit):
        return v.raw
    if isinstance(v, BooleanLit):
        return "true" if v.value else "false"
    if isinstance(v, NullLit):
        return "null"
    if isinstance(v, ListLit):
        return "[" + ", ".join(_sv(i) for i in v.items) + "]"
    if isinstance(v, ObjectLit):
        return "{" + ", ".join(f"{p.key}: {_sv(p.value)}" for p in v.pairs) + "}"
    raise TypeError(f"cannot serialize value of type {type(v).__name__}")


def _escape(s: str) -> str:
    out: list[str] = []
    for ch in s:
        if ch == '"':
            out.append('\\"')
        elif ch == "\\":
            out.append("\\\\")
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) < 0x20:
            out.append(f"\\u{ord(ch):04x}")
        else:
            out.append(ch)
    return "".join(out)
