"""Parser unit tests — structure, enums, and AST shape."""

from __future__ import annotations

import pytest

from backend.prsl import parse
from backend.prsl.ast import (
    BooleanLit,
    ListLit,
    NullLit,
    NumberLit,
    ObjectLit,
    StringLit,
)
from backend.prsl.errors import ParseError

# --------------------------------------------------------------------------- #
# structured values
# --------------------------------------------------------------------------- #


def _content(text: str):
    return parse(text).records[0].content


def test_content_can_be_any_structured_value() -> None:
    assert _content('begin-record\nrecord r { content : "s"; }\nend-record\n') == StringLit("s")
    assert _content("begin-record\nrecord r { content : 7; }\nend-record\n") == NumberLit(7, "7")
    assert _content("begin-record\nrecord r { content : true; }\nend-record\n") == BooleanLit(True)
    assert _content("begin-record\nrecord r { content : null; }\nend-record\n") == NullLit()
    assert _content("begin-record\nrecord r { content : [1, 2]; }\nend-record\n") == ListLit(
        [NumberLit(1, "1"), NumberLit(2, "2")]
    )
    obj = _content('begin-record\nrecord r { content : { a: 1 }; }\nend-record\n')
    assert isinstance(obj, ObjectLit)
    assert obj.pairs[0].key == "a"
    assert obj.pairs[0].value == NumberLit(1, "1")


def test_enum_values_are_bare_strings() -> None:
    rec = parse(
        'begin-record\nrecord r { content : "x";'
        " operational-metadata { execution-state : blocked; priority : low; }; }\nend-record\n"
    ).records[0]
    assert rec.operational.execution_state == "blocked"
    assert rec.operational.priority == "low"


def test_confidence_consumes_percent_sign() -> None:
    rec = parse(
        'begin-record\nrecord r { content : "x";'
        " epistemic-metadata { confidence : 90%; }; }\nend-record\n"
    ).records[0]
    assert rec.epistemic.confidence == NumberLit(90, "90")


def test_retention_keyword_and_duration() -> None:
    kw = parse(
        'begin-record\nrecord r { content : "x"; retention-policy : permanent; }\nend-record\n'
    ).records[0]
    assert kw.retention_policy.value == "permanent"

    dur = parse(
        'begin-record\nrecord r { content : "x"; retention-policy : "P30D"; }\nend-record\n'
    ).records[0]
    assert dur.retention_policy.value == StringLit("P30D")


def test_relations_parse_as_tuples() -> None:
    rec = parse(
        'begin-record\nrecord r { content : "x";'
        " relational-metadata { (a, depends-on); (b, contradicts); }; }\nend-record\n"
    ).records[0]
    assert [(r.target, r.relation_type) for r in rec.relational.relations] == [
        ("a", "depends-on"),
        ("b", "contradicts"),
    ]


def test_adjacent_entries_without_separator() -> None:
    doc = parse(
        'begin-record\nrecord r1 { content : "1"; }\nend-record\n'
        'begin-record\nrecord r2 { content : "2"; }\nend-record\n'
    )
    assert [r.id for r in doc.records] == ["r1", "r2"]


# --------------------------------------------------------------------------- #
# parser error cases
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "src",
    [
        # bad enum
        'begin-record\nrecord r { content : "x";'
        " operational-metadata { execution-state : nope; }; }\nend-record\n",
        # bad relation type
        'begin-record\nrecord r { content : "x";'
        " relational-metadata { (a, bogus); }; }\nend-record\n",
        # bad retention keyword (bare identifier not in set)
        'begin-record\nrecord r { content : "x"; retention-policy : nope; }\nend-record\n',
        # missing record keyword
        'begin-record\nrecordr { content : "x"; }\nend-record\n',
        # missing record id
        'begin-record\nrecord { content : "x"; }\nend-record\n',
    ],
)
def test_parser_rejects(src: str) -> None:
    with pytest.raises(ParseError):
        parse(src)


def test_duplicate_core_field_rejected() -> None:
    with pytest.raises(ParseError):
        parse(
            'begin-record\nrecord r { content : "a"; content : "b"; }\nend-record\n'
        )
