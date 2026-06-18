"""Lexer unit tests."""

from __future__ import annotations

import pytest

from backend.prsl.errors import LexError
from backend.prsl.lexer import TokenType, tokenize


def _types(text: str) -> list[TokenType]:
    return [t.type for t in tokenize(text) if t.type is not TokenType.EOF]


def test_simple_symbols() -> None:
    assert _types("{}[]():;,%") == [
        TokenType.LBRACE,
        TokenType.RBRACE,
        TokenType.LBRACKET,
        TokenType.RBRACKET,
        TokenType.LPAREN,
        TokenType.RPAREN,
        TokenType.COLON,
        TokenType.SEMICOLON,
        TokenType.COMMA,
        TokenType.PERCENT,
    ]


def test_record_separator_distinct_from_sign_and_identifier() -> None:
    assert _types("---") == [TokenType.RECORD_SEP]
    assert _types("-5") == [TokenType.NUMBER]
    assert _types("archive-on-completion") == [TokenType.IDENT]


def test_identifiers_kebab_and_underscore() -> None:
    toks = tokenize("execution-state _private my-id-2")
    assert [t.text for t in toks if t.type is TokenType.IDENT] == [
        "execution-state",
        "_private",
        "my-id-2",
    ]


def test_integer_and_float_and_sign() -> None:
    nums = [t for t in tokenize("42 -3 +7 3.14 -0.5") if t.type is TokenType.NUMBER]
    assert [(t.value, t.text) for t in nums] == [
        (42, "42"),
        (-3, "-3"),
        (7, "+7"),
        (3.14, "3.14"),
        (-0.5, "-0.5"),
    ]


def test_string_escapes() -> None:
    (tok,) = [t for t in tokenize(r'"a\nb\"c\\d\u00e9"') if t.type is TokenType.STRING]
    assert tok.value == 'a\nb"c\\dé'


def test_comments_are_trivia() -> None:
    assert _types("(* a comment *) record (* mid *) x") == [
        TokenType.IDENT,
        TokenType.IDENT,
    ]


def test_unterminated_string_raises() -> None:
    with pytest.raises(LexError):
        tokenize('"unterminated')


def test_unterminated_comment_raises() -> None:
    with pytest.raises(LexError):
        tokenize("(* never ends")


def test_unexpected_character_raises() -> None:
    with pytest.raises(LexError):
        tokenize("@@@")


def test_positions_are_tracked() -> None:
    toks = tokenize("a\nb")
    second = toks[1]
    assert second.span.start.line == 2
    assert second.span.start.col == 1
