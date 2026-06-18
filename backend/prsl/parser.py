"""Recursive-descent parser for PRSL.

Implements ``design/gramar.ebnf`` exactly. The parser enforces the grammar's
*syntactic* rules, including enum alternatives (since the grammar enumerates
them). Cross-field semantic rules (duplicate-field detection inside a block is
done here for precise diagnostics; record-level semantic checks live in the
validator).
"""

from __future__ import annotations

from collections import namedtuple
from collections.abc import Callable

from backend.prsl.ast import (
    BooleanLit,
    ContextualMetadata,
    Document,
    EpistemicMetadata,
    GeneralMetadata,
    LifecycleMetadata,
    ListLit,
    NullLit,
    NumberLit,
    ObjectLit,
    OperationalMetadata,
    Pair,
    Record,
    Relation,
    RelationalMetadata,
    RetentionPolicy,
    StringLit,
    TemporalMetadata,
)
from backend.prsl.errors import ParseError, Span
from backend.prsl.lexer import Token, TokenType

__all__ = ["Parser"]

# Enum alternatives (mirrors gramar.ebnf).
ORIENTATION = ("retrospective", "present", "prospective")
VALIDATION_STATE = ("confirmed", "speculative", "inferred", "disputed")
EXECUTION_STATE = ("pending", "active", "blocked", "delegated", "completed")
PRIORITY = ("critical", "high", "medium", "low")
LIFECYCLE_STATE = ("created", "revised", "deprecated", "archived", "invalidated", "superseded")

# Valid top-level record field keywords.
_RECORD_FIELDS = frozenset(
    {
        "content",
        "detail",
        "retention-policy",
        "temporal-metadata",
        "contextual-metadata",
        "epistemic-metadata",
        "operational-metadata",
        "lifecycle-metadata",
        "relational-metadata",
        "general-metadata",
    }
)

_FieldSpec = namedtuple("_FieldSpec", ["attr", "parse", "label"])


class Parser:
    """Turns a token list into a :class:`Document`."""

    def __init__(self, tokens: list[Token]) -> None:
        self.tokens = tokens
        self.pos = 0

    # ------------------------------------------------------------------ #
    # token helpers
    # ------------------------------------------------------------------ #
    def _cur(self) -> Token:
        return self.tokens[self.pos]

    def _peek(self, offset: int = 1) -> Token:
        j = self.pos + offset
        return self.tokens[j] if j < len(self.tokens) else self.tokens[-1]

    def _advance(self) -> Token:
        tok = self.tokens[self.pos]
        if tok.type is not TokenType.EOF:
            self.pos += 1
        return tok

    def _at(self, type_: TokenType) -> bool:
        return self._cur().type is type_

    def _at_ident(self, text: str) -> bool:
        tok = self._cur()
        return tok.type is TokenType.IDENT and tok.text == text

    def _expect(self, type_: TokenType, *, what: str | None = None) -> Token:
        tok = self._cur()
        if tok.type is not type_:
            raise self._error(
                f"expected {what or type_.name}",
                expected=what or type_.name,
                got=self._describe(tok),
                tok=tok,
            )
        return self._advance()

    def _expect_ident(self, text: str) -> Token:
        tok = self._cur()
        if tok.type is not TokenType.IDENT or tok.text != text:
            raise self._error(
                f"expected '{text}'",
                expected=f"'{text}'",
                got=self._describe(tok),
                tok=tok,
            )
        return self._advance()

    def _error(
        self,
        message: str,
        *,
        expected: object = None,
        got: object = None,
        tok: Token | None = None,
    ) -> ParseError:
        tok = tok or self._cur()
        return ParseError(
            message,
            line=tok.line,
            col=tok.col,
            expected=expected,
            got=got,
        )

    @staticmethod
    def _describe(tok: Token) -> str:
        if tok.type is TokenType.EOF:
            return "end of input"
        if tok.type is TokenType.IDENT:
            return f"identifier '{tok.text}'"
        if tok.type is TokenType.STRING:
            return f"string {tok.text!r}"
        if tok.type is TokenType.NUMBER:
            return f"number {tok.text!r}"
        return f"'{tok.text}'"

    # ------------------------------------------------------------------ #
    # document
    # ------------------------------------------------------------------ #
    def parse_document(self) -> Document:
        records: list[Record] = []
        while not self._at(TokenType.EOF):
            if not self._at_ident("begin-record"):
                tok = self._cur()
                raise self._error(
                    "expected 'begin-record'",
                    expected="'begin-record'",
                    got=self._describe(tok),
                    tok=tok,
                )
            records.append(self._parse_record_entry())
        return Document(records=records)

    def _parse_record_entry(self) -> Record:
        self._expect_ident("begin-record")
        rec = self._parse_record()
        self._expect_ident("end-record")
        if self._at(TokenType.RECORD_SEP):
            self._advance()
        return rec

    def _parse_record(self) -> Record:
        start = self._cur().span.start
        self._expect_ident("record")
        id_tok = self._expect(TokenType.IDENT, what="record id")
        self._expect(TokenType.LBRACE, what="'{'")
        rec = Record(id=id_tok.text)
        if not self._at(TokenType.RBRACE):
            self._parse_record_fields(rec)
        end = self._expect(TokenType.RBRACE, what="'}'").span.end
        rec.span = Span(start, end)
        return rec

    def _parse_record_fields(self, rec: Record) -> None:
        self._parse_record_field(rec)
        while self._at(TokenType.SEMICOLON):
            self._advance()
            if self._at(TokenType.RBRACE) or self._at(TokenType.EOF):
                break
            self._parse_record_field(rec)

    def _parse_record_field(self, rec: Record) -> None:
        tok = self._cur()
        if tok.type is not TokenType.IDENT or tok.text not in _RECORD_FIELDS:
            raise self._error(
                "expected a record field",
                expected="record field keyword",
                got=self._describe(tok),
                tok=tok,
            )
        kw = tok.text
        if kw == "content":
            self._parse_core_field(rec, "content")
        elif kw == "detail":
            self._parse_core_field(rec, "detail")
        elif kw == "retention-policy":
            self._parse_retention_field(rec)
        elif kw == "temporal-metadata":
            rec.temporal = self._parse_block("temporal-metadata", TemporalMetadata, self._temporal_specs())
        elif kw == "contextual-metadata":
            rec.contextual = self._parse_block(
                "contextual-metadata", ContextualMetadata, self._contextual_specs()
            )
        elif kw == "epistemic-metadata":
            rec.epistemic = self._parse_block(
                "epistemic-metadata", EpistemicMetadata, self._epistemic_specs()
            )
        elif kw == "operational-metadata":
            rec.operational = self._parse_block(
                "operational-metadata", OperationalMetadata, self._operational_specs()
            )
        elif kw == "lifecycle-metadata":
            rec.lifecycle = self._parse_block(
                "lifecycle-metadata", LifecycleMetadata, self._lifecycle_specs()
            )
        elif kw == "relational-metadata":
            rec.relational = self._parse_relational_block()
        elif kw == "general-metadata":
            rec.general = self._parse_block(
                "general-metadata", GeneralMetadata, self._general_specs()
            )
        else:  # pragma: no cover - guarded by _RECORD_FIELDS check above
            raise self._error(f"unexpected record field '{kw}'")

    # ------------------------------------------------------------------ #
    # core fields
    # ------------------------------------------------------------------ #
    def _parse_core_field(self, rec: Record, attr: str) -> None:
        self._expect_ident(attr)
        if getattr(rec, attr) is not None:
            raise self._error(f"duplicate '{attr}' field")
        self._expect(TokenType.COLON, what="':'")
        setattr(rec, attr, self._parse_structured_value())

    def _parse_retention_field(self, rec: Record) -> None:
        self._expect_ident("retention-policy")
        if rec.retention_policy is not None:
            raise self._error("duplicate 'retention-policy' field")
        self._expect(TokenType.COLON, what="':'")
        value = self._parse_retention_value()
        rec.retention_policy = RetentionPolicy(value)

    def _parse_retention_value(self) -> str | StringLit:
        tok = self._cur()
        if tok.type is TokenType.IDENT and tok.text in RetentionPolicy.KEYWORDS:
            self._advance()
            return tok.text
        if tok.type is TokenType.STRING:
            self._advance()
            return StringLit(tok.value, span=tok.span)
        raise self._error(
            "expected retention-policy value",
            expected="permanent | temporary | archive-on-completion | review-periodic | <duration>",
            got=self._describe(tok),
            tok=tok,
        )

    # ------------------------------------------------------------------ #
    # generic metadata block
    # ------------------------------------------------------------------ #
    def _parse_block(self, keyword, factory, specs):
        start = self._cur().span.start
        self._expect_ident(keyword)
        self._expect(TokenType.LBRACE, what="'{'")
        block = factory()
        if not self._at(TokenType.RBRACE):
            self._parse_keyed_fields(block, specs, block_name=keyword)
        end = self._expect(TokenType.RBRACE, what="'}'").span.end
        block.span = Span(start, end)
        return block

    def _parse_keyed_fields(self, block, specs, *, block_name: str) -> None:
        self._parse_one_keyed_field(block, specs, block_name)
        while self._at(TokenType.SEMICOLON):
            self._advance()
            if self._at(TokenType.RBRACE) or self._at(TokenType.EOF):
                break
            self._parse_one_keyed_field(block, specs, block_name)

    def _parse_one_keyed_field(self, block, specs, block_name: str) -> None:
        tok = self._cur()
        if tok.type is not TokenType.IDENT:
            raise self._error(
                f"expected a field in '{block_name}'",
                expected=f"'{block_name}' field",
                got=self._describe(tok),
                tok=tok,
            )
        spec = specs.get(tok.text)
        if spec is None:
            raise self._error(
                f"unknown field '{tok.text}' in '{block_name}'",
                expected=f"one of: {', '.join(sorted(specs))}",
                got=self._describe(tok),
                tok=tok,
            )
        if getattr(block, spec.attr) is not None:
            raise self._error(
                f"duplicate '{tok.text}' field in '{block_name}'",
                tok=tok,
            )
        self._advance()  # consume field keyword
        self._expect(TokenType.COLON, what="':'")
        setattr(block, spec.attr, spec.parse())

    # ------------------------------------------------------------------ #
    # structured values
    # ------------------------------------------------------------------ #
    def _parse_structured_value(self):
        tok = self._cur()
        if tok.type is TokenType.STRING:
            return self._parse_string_value()
        if tok.type is TokenType.NUMBER:
            return self._parse_number_value()
        if tok.type is TokenType.LBRACKET:
            return self._parse_list_value()
        if tok.type is TokenType.LBRACE:
            return self._parse_object_value()
        if tok.type is TokenType.IDENT:
            if tok.text == "true":
                self._advance()
                return BooleanLit(True, span=tok.span)
            if tok.text == "false":
                self._advance()
                return BooleanLit(False, span=tok.span)
            if tok.text == "null":
                self._advance()
                return NullLit(span=tok.span)
        raise self._error(
            "expected a structured value",
            expected="string | number | boolean | list | object | null",
            got=self._describe(tok),
            tok=tok,
        )

    def _parse_string_value(self) -> StringLit:
        tok = self._expect(TokenType.STRING, what="string")
        return StringLit(tok.value, span=tok.span)

    def _parse_number_value(self) -> NumberLit:
        tok = self._expect(TokenType.NUMBER, what="number")
        return NumberLit(tok.value, tok.text, span=tok.span)

    def _parse_percentage_value(self) -> NumberLit:
        num = self._expect(TokenType.NUMBER, what="number")
        percent = self._expect(TokenType.PERCENT, what="'%'")
        return NumberLit(num.value, num.text, span=Span(num.span.start, percent.span.end))

    def _parse_boolean_value(self) -> BooleanLit:
        tok = self._cur()
        if tok.type is TokenType.IDENT and tok.text in ("true", "false"):
            self._advance()
            return BooleanLit(tok.text == "true", span=tok.span)
        raise self._error(
            "expected a boolean",
            expected="true | false",
            got=self._describe(tok),
            tok=tok,
        )

    def _parse_identifier_value(self) -> str:
        tok = self._expect(TokenType.IDENT, what="identifier")
        return tok.text

    def _parse_list_value(self) -> ListLit:
        lbracket = self._expect(TokenType.LBRACKET, what="'['")
        items: list = []
        if not self._at(TokenType.RBRACKET):
            items.append(self._parse_structured_value())
            while self._at(TokenType.COMMA):
                self._advance()
                if self._at(TokenType.RBRACKET):
                    break
                items.append(self._parse_structured_value())
        rbracket = self._expect(TokenType.RBRACKET, what="']'")
        return ListLit(items, span=Span(lbracket.span.start, rbracket.span.end))

    def _parse_object_value(self) -> ObjectLit:
        lbrace = self._expect(TokenType.LBRACE, what="'{'")
        pairs: list[Pair] = []
        if not self._at(TokenType.RBRACE):
            pairs.append(self._parse_pair())
            while self._at(TokenType.COMMA):
                self._advance()
                if self._at(TokenType.RBRACE):
                    break
                pairs.append(self._parse_pair())
        rbrace = self._expect(TokenType.RBRACE, what="'}'")
        return ObjectLit(pairs, span=Span(lbrace.span.start, rbrace.span.end))

    def _parse_pair(self) -> Pair:
        key = self._expect(TokenType.IDENT, what="object key")
        self._expect(TokenType.COLON, what="':'")
        value = self._parse_structured_value()
        end = self._cur().span.start
        return Pair(key.text, value, span=Span(key.span.start, end))

    def _make_enum_parser(self, options: tuple[str, ...], label: str) -> Callable[[], str]:
        def parse() -> str:
            tok = self._cur()
            if tok.type is TokenType.IDENT and tok.text in options:
                self._advance()
                return tok.text
            raise self._error(
                f"invalid {label} '{tok.text if tok.type is TokenType.IDENT else tok.text}'",
                expected=" | ".join(options),
                got=self._describe(tok),
                tok=tok,
            )

        return parse

    # ------------------------------------------------------------------ #
    # relational block
    # ------------------------------------------------------------------ #
    def _parse_relational_block(self) -> RelationalMetadata:
        start = self._cur().span.start
        self._expect_ident("relational-metadata")
        self._expect(TokenType.LBRACE, what="'{'")
        rel = RelationalMetadata()
        if not self._at(TokenType.RBRACE):
            rel.relations.append(self._parse_relation())
            while self._at(TokenType.SEMICOLON):
                self._advance()
                if self._at(TokenType.RBRACE) or self._at(TokenType.EOF):
                    break
                rel.relations.append(self._parse_relation())
        end = self._expect(TokenType.RBRACE, what="'}'").span.end
        rel.span = Span(start, end)
        return rel

    def _parse_relation(self) -> Relation:
        lp = self._expect(TokenType.LPAREN, what="'('")
        target = self._expect(TokenType.IDENT, what="relation target")
        self._expect(TokenType.COMMA, what="','")
        rtype_tok = self._cur()
        if rtype_tok.type is not TokenType.IDENT or rtype_tok.text not in Relation.TYPES:
            raise self._error(
                f"invalid relation-type '{rtype_tok.text}'",
                expected=" | ".join(Relation.TYPES),
                got=self._describe(rtype_tok),
                tok=rtype_tok,
            )
        self._advance()
        rp = self._expect(TokenType.RPAREN, what="')'")
        return Relation(target.text, rtype_tok.text, span=Span(lp.span.start, rp.span.end))

    # ------------------------------------------------------------------ #
    # per-block field specs
    # ------------------------------------------------------------------ #
    def _temporal_specs(self) -> dict[str, _FieldSpec]:
        return {
            "created-at": _FieldSpec("created_at", self._parse_string_value, "timestamp"),
            "updated-at": _FieldSpec("updated_at", self._parse_string_value, "timestamp"),
            "valid-from": _FieldSpec("valid_from", self._parse_string_value, "timestamp"),
            "valid-until": _FieldSpec("valid_until", self._parse_string_value, "timestamp"),
            "deadline": _FieldSpec("deadline", self._parse_string_value, "timestamp"),
            "recurrence": _FieldSpec("recurrence", self._parse_string_value, "string"),
            "orientation": _FieldSpec(
                "orientation", self._make_enum_parser(ORIENTATION, "orientation"), "orientation"
            ),
            "projection-horizon": _FieldSpec(
                "projection_horizon", self._parse_string_value, "duration"
            ),
        }

    def _contextual_specs(self) -> dict[str, _FieldSpec]:
        return {
            "project-context": _FieldSpec("project_context", self._parse_string_value, "string"),
            "organizational-context": _FieldSpec(
                "organizational_context", self._parse_string_value, "string"
            ),
            "strategic-context": _FieldSpec(
                "strategic_context", self._parse_string_value, "string"
            ),
            "emotional-context": _FieldSpec(
                "emotional_context", self._parse_string_value, "string"
            ),
            "environmental-context": _FieldSpec(
                "environmental_context", self._parse_string_value, "string"
            ),
            "location-context": _FieldSpec(
                "location_context", self._parse_string_value, "string"
            ),
        }

    def _epistemic_specs(self) -> dict[str, _FieldSpec]:
        return {
            "confidence": _FieldSpec("confidence", self._parse_percentage_value, "percentage"),
            "validation-state": _FieldSpec(
                "validation_state",
                self._make_enum_parser(VALIDATION_STATE, "validation-state"),
                "validation-state",
            ),
            "evidence-source": _FieldSpec("evidence_source", self._parse_list_value, "list"),
            "inference-status": _FieldSpec(
                "inference_status", self._parse_string_value, "string"
            ),
            "certainty-level": _FieldSpec(
                "certainty_level", self._parse_number_value, "number"
            ),
        }

    def _operational_specs(self) -> dict[str, _FieldSpec]:
        return {
            "execution-state": _FieldSpec(
                "execution_state",
                self._make_enum_parser(EXECUTION_STATE, "execution-state"),
                "execution-state",
            ),
            "priority": _FieldSpec(
                "priority", self._make_enum_parser(PRIORITY, "priority"), "priority"
            ),
            "delegation": _FieldSpec("delegation", self._parse_identifier_value, "identifier"),
            "coordination-state": _FieldSpec(
                "coordination_state", self._parse_string_value, "string"
            ),
            "actionability": _FieldSpec(
                "actionability", self._parse_boolean_value, "boolean"
            ),
        }

    def _lifecycle_specs(self) -> dict[str, _FieldSpec]:
        return {
            "state": _FieldSpec(
                "state", self._make_enum_parser(LIFECYCLE_STATE, "lifecycle state"), "state"
            ),
            "revision": _FieldSpec("revision", self._parse_number_value, "number"),
            "superseded-by": _FieldSpec(
                "superseded_by", self._parse_identifier_value, "identifier"
            ),
            "archived-at": _FieldSpec("archived_at", self._parse_string_value, "timestamp"),
        }

    def _general_specs(self) -> dict[str, _FieldSpec]:
        return {
            "classification": _FieldSpec(
                "classification", self._parse_string_value, "string"
            ),
            "tags": _FieldSpec("tags", self._parse_list_value, "list"),
            "domain": _FieldSpec("domain", self._parse_string_value, "string"),
            "cognitive-category": _FieldSpec(
                "cognitive_category", self._parse_string_value, "string"
            ),
            "operational-category": _FieldSpec(
                "operational_category", self._parse_string_value, "string"
            ),
        }
