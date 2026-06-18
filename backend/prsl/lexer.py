"""Tokenizer for PRSL.

Produces a flat list of :class:`Token` objects terminated by an :data:`TokenType.EOF`
token. Keywords, field names, enum values, booleans, ``null`` and identifiers all
surface as :data:`TokenType.IDENT` tokens carrying their raw text; the parser
interprets them contextually against ``design/gramar.ebnf``.

Trivia handling:
  * Whitespace (space/tab/CR/LF) is discarded.
  * Block comments ``(* ... *)`` are defined by the grammar's lexical section
    and are discarded as trivia (they may appear anywhere whitespace may).
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from enum import Enum, auto

from backend.prsl.errors import LexError, Position, Span

__all__ = ["Token", "TokenType", "tokenize"]


class TokenType(Enum):
    LBRACE = auto()
    RBRACE = auto()
    LBRACKET = auto()
    RBRACKET = auto()
    LPAREN = auto()
    RPAREN = auto()
    COLON = auto()
    SEMICOLON = auto()
    COMMA = auto()
    PERCENT = auto()
    RECORD_SEP = auto()  # "---"
    STRING = auto()
    NUMBER = auto()
    IDENT = auto()
    EOF = auto()


@dataclass(frozen=True)
class Token:
    type: TokenType
    text: str
    span: Span
    # Populated for STRING / NUMBER tokens; ``None`` otherwise.
    value: object = None  # str for STRING, int|float for NUMBER

    @property
    def line(self) -> int:
        return self.span.start.line

    @property
    def col(self) -> int:
        return self.span.start.col


_SIMPLE = {
    "{": TokenType.LBRACE,
    "}": TokenType.RBRACE,
    "[": TokenType.LBRACKET,
    "]": TokenType.RBRACKET,
    "(": TokenType.LPAREN,
    ")": TokenType.RPAREN,
    ":": TokenType.COLON,
    ";": TokenType.SEMICOLON,
    ",": TokenType.COMMA,
    "%": TokenType.PERCENT,
}

_WHITESPACE = " \t\r\n"
_HEXDIGITS = set("0123456789abcdefABCDEF")
_IDENT_START = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_")
_IDENT_CONT = _IDENT_START | set("0123456789-")


class _Lexer:
    __slots__ = ("src", "n", "i", "line", "col")

    def __init__(self, src: str) -> None:
        self.src = src
        self.n = len(src)
        self.i = 0
        self.line = 1
        self.col = 1

    # ------------------------------------------------------------------ #
    # position helpers
    # ------------------------------------------------------------------ #
    def _pos(self) -> Position:
        return Position(self.line, self.col, self.i)

    def _advance(self, count: int = 1) -> None:
        for _ in range(count):
            ch = self.src[self.i]
            self.i += 1
            if ch == "\n":
                self.line += 1
                self.col = 1
            else:
                self.col += 1

    def _peek(self, offset: int = 0) -> str:
        j = self.i + offset
        return self.src[j] if j < self.n else ""

    # ------------------------------------------------------------------ #
    # trivia
    # ------------------------------------------------------------------ #
    def _skip_trivia(self) -> None:
        while self.i < self.n:
            ch = self.src[self.i]
            if ch in _WHITESPACE:
                self._advance()
            elif ch == "(" and self._peek(1) == "*":
                self._skip_comment()
            else:
                break

    def _skip_comment(self) -> None:
        # assumes current position is at "(*"
        start = self._pos()
        self._advance(2)  # consume "(*"
        while self.i < self.n:
            if self.src[self.i] == "*" and self._peek(1) == ")":
                self._advance(2)
                return
            self._advance()
        raise LexError("unterminated comment", line=start.line, col=start.col)

    # ------------------------------------------------------------------ #
    # main loop
    # ------------------------------------------------------------------ #
    def tokens(self) -> list[Token]:
        out: list[Token] = []
        while True:
            self._skip_trivia()
            if self.i >= self.n:
                break
            start = self._pos()
            ch = self.src[self.i]

            # Record separator "---" (must precede signed-number handling).
            if ch == "-" and self._peek(1) == "-" and self._peek(2) == "-":
                self._advance(3)
                out.append(self._mk(TokenType.RECORD_SEP, "---", start))
                continue

            if ch in _SIMPLE:
                self._advance()
                out.append(self._mk(_SIMPLE[ch], ch, start))
                continue

            if ch == '"':
                out.append(self._lex_string(start))
                continue

            if ch in "+-" or ch.isdigit():
                tok = self._lex_number(start)
                if tok is not None:
                    out.append(tok)
                    continue
                # A lone sign with no following digit is not a valid token.
                raise LexError(
                    f"unexpected character {ch!r}", line=start.line, col=start.col
                )

            if ch in _IDENT_START:
                out.append(self._lex_ident(start))
                continue

            raise LexError(f"unexpected character {ch!r}", line=start.line, col=start.col)

        out.append(Token(TokenType.EOF, "", Span(self._pos(), self._pos())))
        return out

    def _mk(self, type_: TokenType, text: str, start: Position, value: object = None) -> Token:
        return Token(type_, text, Span(start, self._pos()), value=value)

    # ------------------------------------------------------------------ #
    # string literals
    # ------------------------------------------------------------------ #
    def _lex_string(self, start: Position) -> Token:
        self._advance()  # opening quote
        buf: list[str] = []
        while self.i < self.n:
            ch = self.src[self.i]
            if ch == '"':
                self._advance()  # closing quote
                text = self.src[start.offset : self.i]
                return Token(TokenType.STRING, text, Span(start, self._pos()), value="".join(buf))
            if ch == "\\":
                buf.append(self._lex_escape(start))
                continue
            if ch == "\n":
                raise LexError(
                    "unterminated string literal", line=start.line, col=start.col
                )
            buf.append(ch)
            self._advance()
        raise LexError("unterminated string literal", line=start.line, col=start.col)

    def _lex_escape(self, start: Position) -> str:
        # assumes current char is "\\"
        esc_start = self._pos()
        self._advance()  # consume backslash
        if self.i >= self.n:
            raise LexError("unterminated escape sequence", line=esc_start.line, col=esc_start.col)
        ch = self.src[self.i]
        simple = {'"': '"', "\\": "\\", "n": "\n", "r": "\r", "t": "\t"}
        if ch in simple:
            self._advance()
            return simple[ch]
        if ch == "u":
            self._advance()
            hexbuf = self.src[self.i : self.i + 4]
            if len(hexbuf) < 4 or any(c not in _HEXDIGITS for c in hexbuf):
                raise LexError(
                    "invalid unicode escape", line=esc_start.line, col=esc_start.col
                )
            for _ in range(4):
                self._advance()
            return chr(int(hexbuf, 16))
        raise LexError(
            f"invalid escape sequence \\{ch}", line=esc_start.line, col=esc_start.col
        )

    # ------------------------------------------------------------------ #
    # numbers
    # ------------------------------------------------------------------ #
    def _lex_number(self, start: Position) -> Token | None:
        # Returns None if a leading +/- is not followed by a digit.
        j = self.i
        if self.src[j] in "+-":
            j += 1
            if j >= self.n or not self.src[j].isdigit():
                return None
        while j < self.n and self.src[j].isdigit():
            j += 1
        is_float = False
        if j < self.n and self.src[j] == ".":
            # must be followed by a digit to count as a float
            if j + 1 < self.n and self.src[j + 1].isdigit():
                is_float = True
                j += 1
                while j < self.n and self.src[j].isdigit():
                    j += 1
        raw = self.src[self.i : j]
        end_offset = j
        # advance position counters
        while self.i < end_offset:
            self._advance()
        value: int | float = float(raw) if is_float else int(raw)
        return Token(TokenType.NUMBER, raw, Span(start, self._pos()), value=value)

    # ------------------------------------------------------------------ #
    # identifiers / keywords / booleans / null
    # ------------------------------------------------------------------ #
    def _lex_ident(self, start: Position) -> Token:
        j = self.i + 1
        while j < self.n and self.src[j] in _IDENT_CONT:
            j += 1
        text = self.src[self.i : j]
        end_offset = j
        while self.i < end_offset:
            self._advance()
        return Token(TokenType.IDENT, text, Span(start, self._pos()), value=text)


def tokenize(src: str) -> list[Token]:
    """Tokenise ``src`` into a list of tokens (ending with EOF)."""
    return _Lexer(src).tokens()


def token_stream(src: str) -> Iterator[Token]:
    """Convenience iterator over :func:`tokenize`."""
    return iter(tokenize(src))
