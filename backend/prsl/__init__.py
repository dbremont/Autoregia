"""PRSL — Personal Recording System Language.

Faithful implementation of the grammar in ``design/gramar.ebnf``.

Public surface::

    from backend.prsl import parse, serialize, validate, ParseError, ValidationError

    document = parse(prsl_text)          # Document (raises ParseError)
    validate(document)                   # raises ValidationError on semantic errors
    text = serialize(document)           # deterministic PRSL text
"""

from backend.prsl.ast import Document, Record
from backend.prsl.errors import (
    LexError,
    ParseError,
    PrslError,
    ValidationError,
)
from backend.prsl.lexer import tokenize
from backend.prsl.parser import Parser
from backend.prsl.serializer import serialize
from backend.prsl.validator import validate

__all__ = [
    "Document",
    "LexError",
    "ParseError",
    "Parser",
    "PrslError",
    "Record",
    "ValidationError",
    "parse",
    "serialize",
    "tokenize",
    "validate",
]


def parse(text: str) -> Document:
    """Parse PRSL ``text`` into a :class:`Document`.

    Raises :class:`ParseError` (or :class:`LexError`) on malformed input.
    The result is *syntactically* valid; call :func:`validate` for semantic
    checks (enum values, etc.).
    """
    tokens = tokenize(text)
    return Parser(tokens).parse_document()
