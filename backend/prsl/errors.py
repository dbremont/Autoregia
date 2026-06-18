"""Error hierarchy for the PRSL core.

All errors carry a human-readable message and, where relevant, a 1-based
``line`` and ``column`` pointing into the source text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Position:
    """A 1-based point in the source text."""

    line: int
    col: int
    offset: int

    def __str__(self) -> str:
        return f"line {self.line}, column {self.col}"


@dataclass(frozen=True)
class Span:
    """A half-open ``[start, end)`` region of the source text."""

    start: Position
    end: Position

    def __str__(self) -> str:
        return str(self.start)


class PrslError(Exception):
    """Base class for every PRSL error."""

    def __init__(self, message: str, *, line: int | None = None, col: int | None = None) -> None:
        self.message = message
        self.line = line
        self.col = col
        location = ""
        if line is not None:
            location = f" at line {line}" + (f", column {col}" if col is not None else "")
        super().__init__(f"{message}{location}")

    def __str__(self) -> str:
        return self.args[0] if self.args else self.message


class LexError(PrslError):
    """Raised by the lexer for unrecognised characters or unterminated strings."""


class ParseError(PrslError):
    """Raised by the parser for grammar violations (unexpected token, etc.)."""

    def __init__(
        self,
        message: str,
        *,
        line: int | None = None,
        col: int | None = None,
        expected: Any = None,
        got: Any = None,
    ) -> None:
        self.expected = expected
        self.got = got
        detail = message
        if expected is not None or got is not None:
            exp = expected if isinstance(expected, str) else (
                ", ".join(str(e) for e in expected) if expected is not None else "<nothing>"
            )
            detail = f"{message} (expected {exp}; got {got})" if message else (
                f"expected {exp}; got {got}"
            )
        super().__init__(detail, line=line, col=col)


class ValidationError(PrslError):
    """Raised by the validator for semantic errors (bad enum value, duplicates, ...)."""
