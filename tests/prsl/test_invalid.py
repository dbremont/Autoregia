"""Every invalid fixture must be rejected by the parser or lexer."""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.prsl import parse
from backend.prsl.errors import PrslError

FIXTURES = Path(__file__).parent / "fixtures"
INVALID_FIXTURES = sorted((FIXTURES / "invalid").glob("*.prsl"))


@pytest.mark.parametrize("path", INVALID_FIXTURES, ids=lambda p: p.name)
def test_invalid_fixture_is_rejected(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    with pytest.raises(PrslError):
        parse(text)
