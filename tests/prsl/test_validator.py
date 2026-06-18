"""Semantic validator unit tests."""

from __future__ import annotations

import pytest

from backend.prsl import parse, validate
from backend.prsl.errors import ValidationError


def _valid_record(body: str) -> None:
    validate(parse(f"begin-record\nrecord r {{ {body} }}\nend-record\n"))


def test_clean_record_validates() -> None:
    _valid_record('content : "x";')


def test_duplicate_relation_rejected() -> None:
    with pytest.raises(ValidationError):
        _valid_record(
            'content : "x"; relational-metadata { (a, depends-on); (a, depends-on); };'
        )


def test_superseded_without_ref_rejected() -> None:
    with pytest.raises(ValidationError):
        _valid_record(
            'content : "x"; lifecycle-metadata { state : superseded; revision : 1; };'
        )


def test_superseded_by_without_state_rejected() -> None:
    with pytest.raises(ValidationError):
        _valid_record(
            'content : "x";'
            " lifecycle-metadata { state : revised; revision : 1; superseded-by : v2; };"
        )


def test_superseded_with_ref_ok() -> None:
    _valid_record(
        'content : "x";'
        " lifecycle-metadata { state : superseded; revision : 1; superseded-by : v2; };"
    )


def test_negative_revision_rejected() -> None:
    with pytest.raises(ValidationError):
        _valid_record('content : "x"; lifecycle-metadata { revision : -1; };')


def test_float_revision_rejected() -> None:
    with pytest.raises(ValidationError):
        _valid_record('content : "x"; lifecycle-metadata { revision : 1.5; };')
