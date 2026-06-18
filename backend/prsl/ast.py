"""AST node definitions for PRSL.

Every grammar production in ``design/gramar.ebnf`` maps to a dataclass here.
Attribute names are Python ``snake_case``; the serializer is responsible for
emitting the ``kebab-case`` surface form the grammar requires.

``span`` fields record source positions for diagnostics and are excluded from
equality so that ``parse(serialize(parse(text)))`` compares structurally.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar

from backend.prsl.errors import Position, Span  # noqa: F401 - re-exported for callers

# --------------------------------------------------------------------------- #
# Source positions (defined on errors module; re-exported here for ergonomics)
# --------------------------------------------------------------------------- #
__all__ = [
    "BooleanLit",
    "ContextualMetadata",
    "Document",
    "EpistemicMetadata",
    "GeneralMetadata",
    "LifecycleMetadata",
    "ListLit",
    "NullLit",
    "NumberLit",
    "ObjectLit",
    "OperationalMetadata",
    "Pair",
    "Record",
    "RelationalMetadata",
    "Relation",
    "RetentionPolicy",
    "StringLit",
    "StructuredValue",
    "TemporalMetadata",
]

def _span() -> object:
    """Marker for the optional ``span`` field on every node."""
    return field(default=None, compare=False, repr=False)


# --------------------------------------------------------------------------- #
# Structured values (StructuredValue production family)
# --------------------------------------------------------------------------- #


@dataclass
class StringLit:
    value: str
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class NumberLit:
    """A numeric literal.

    ``raw`` preserves the original textual form (including sign and decimal
    point) so serialisation round-trips without spurious ``int``/``float``
    coercion; ``value`` is the parsed Python number for semantics.
    """

    value: int | float
    raw: str
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class BooleanLit:
    value: bool
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class NullLit:
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class ListLit:
    items: list[StructuredValue] = field(default_factory=list)
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class Pair:
    key: str
    value: StructuredValue
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class ObjectLit:
    pairs: list[Pair] = field(default_factory=list)
    span: Span | None = _span()  # type: ignore[assignment]


StructuredValue = StringLit | NumberLit | BooleanLit | NullLit | ListLit | ObjectLit


# --------------------------------------------------------------------------- #
# Retention policy
# --------------------------------------------------------------------------- #


@dataclass
class RetentionPolicy:
    """``retention-policy`` value.

    The grammar allows one of four keywords OR a ``Duration`` (which is itself a
    ``String``). We store a single ``value`` that is either a bare ``str``
    keyword from :data:`KEYWORDS` or a :class:`StringLit` carrying a duration
    string. The serializer inspects the type to decide bare vs quoted emission.
    """

    KEYWORDS: ClassVar[tuple[str, ...]] = (
        "permanent",
        "temporary",
        "archive-on-completion",
        "review-periodic",
    )
    value: str | StringLit
    span: Span | None = _span()  # type: ignore[assignment]


# --------------------------------------------------------------------------- #
# Metadata blocks
# --------------------------------------------------------------------------- #


@dataclass
class TemporalMetadata:
    created_at: StringLit | None = None
    updated_at: StringLit | None = None
    valid_from: StringLit | None = None
    valid_until: StringLit | None = None
    deadline: StringLit | None = None
    recurrence: StringLit | None = None
    orientation: str | None = None  # enum: retrospective|present|prospective
    projection_horizon: StringLit | None = None  # Duration
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class ContextualMetadata:
    project_context: StringLit | None = None
    organizational_context: StringLit | None = None
    strategic_context: StringLit | None = None
    emotional_context: StringLit | None = None
    environmental_context: StringLit | None = None
    location_context: StringLit | None = None
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class EpistemicMetadata:
    confidence: NumberLit | None = None  # Percentage (Number followed by "%")
    validation_state: str | None = None  # enum
    evidence_source: ListLit | None = None
    inference_status: StringLit | None = None
    certainty_level: NumberLit | None = None
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class OperationalMetadata:
    execution_state: str | None = None  # enum
    priority: str | None = None  # enum
    delegation: str | None = None  # Identifier
    coordination_state: StringLit | None = None
    actionability: BooleanLit | None = None
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class LifecycleMetadata:
    state: str | None = None  # enum
    revision: NumberLit | None = None
    superseded_by: str | None = None  # Identifier
    archived_at: StringLit | None = None
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class Relation:
    """A single ``(target, relation-type)`` pair."""

    TYPES: ClassVar[tuple[str, ...]] = (
        "depends-on",
        "supports",
        "supersedes",
        "contradicts",
        "references",
        "derived-from",
        "causes",
        "related-to",
    )
    target: str  # Identifier
    relation_type: str
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class RelationalMetadata:
    relations: list[Relation] = field(default_factory=list)
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class GeneralMetadata:
    classification: StringLit | None = None
    tags: ListLit | None = None
    domain: StringLit | None = None
    cognitive_category: StringLit | None = None
    operational_category: StringLit | None = None
    span: Span | None = _span()  # type: ignore[assignment]


# --------------------------------------------------------------------------- #
# Record & document
# --------------------------------------------------------------------------- #


@dataclass
class Record:
    id: str
    content: StructuredValue | None = None
    detail: StructuredValue | None = None
    retention_policy: RetentionPolicy | None = None
    temporal: TemporalMetadata | None = None
    contextual: ContextualMetadata | None = None
    epistemic: EpistemicMetadata | None = None
    operational: OperationalMetadata | None = None
    lifecycle: LifecycleMetadata | None = None
    relational: RelationalMetadata | None = None
    general: GeneralMetadata | None = None
    span: Span | None = _span()  # type: ignore[assignment]


@dataclass
class Document:
    records: list[Record] = field(default_factory=list)
    span: Span | None = _span()  # type: ignore[assignment]
