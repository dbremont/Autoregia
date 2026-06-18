"""Round-trip property tests over every valid PRSL fixture.

For each ``valid/*.prsl`` we assert:
  * parsing succeeds without raising,
  * the document passes semantic validation,
  * ``serialize(parse(text))`` is stable: ``parse(text2) == parse(text)``.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.prsl import parse, serialize, validate

FIXTURES = Path(__file__).parent / "fixtures"
VALID_FIXTURES = sorted((FIXTURES / "valid").glob("*.prsl"))


@pytest.mark.parametrize("path", VALID_FIXTURES, ids=lambda p: p.name)
def test_valid_fixture_parses_and_validates(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    doc = parse(text)
    validate(doc)
    assert len(doc.records) >= 1


@pytest.mark.parametrize("path", VALID_FIXTURES, ids=lambda p: p.name)
def test_roundtrip_is_stable(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    doc1 = parse(text)
    serialized = serialize(doc1)
    doc2 = parse(serialized)
    assert doc1 == doc2, (
        f"round-trip diverged for {path.name}\n--- serialized ---\n{serialized}"
    )


@pytest.mark.parametrize("path", VALID_FIXTURES, ids=lambda p: p.name)
def test_double_serialize_is_idempotent(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    once = serialize(parse(text))
    twice = serialize(parse(once))
    assert once == twice


def test_empty_document_roundtrips() -> None:
    doc = parse("")
    assert doc.records == []
    assert serialize(doc) == ""
