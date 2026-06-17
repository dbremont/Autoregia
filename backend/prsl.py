"""PRSL (Personal Recording System Language) text export.

Serializes a record dict into the text format described by
``design/gramar.ebnf``.  This is a display/export utility only -- the
canonical storage format is JSON.
"""

from __future__ import annotations

from typing import Any


def _q(val: Any) -> str:
    """Quote a value as a PRSL string, handling ``None``."""
    if val is None:
        return "null"
    s = str(val).replace('"', '\\"')
    return f'"{s}"'


def _list(vals: list[Any]) -> str:
    """Render a list as ``[item, item]``."""
    return "[" + ", ".join(_q(v) for v in vals) + "]"


def to_prsl(r: dict) -> str:
    """Convert a record dict to a PRSL text block."""
    tm = r.get("temporalMetadata", {})
    ctx = r.get("contextualMetadata", {})
    ep = r.get("epistemicMetadata", {})
    op = r.get("operationalMetadata", {})
    lm = r.get("lifecycleMetadata", {})
    gm = r.get("generalMetadata", {})
    rels = r.get("relationalMetadata", [])

    lines: list[str] = []
    lines.append("begin-record")
    lines.append(f"record {r['id']} {{")

    # Core fields
    lines.append(f'  content : {_q(r.get("content"))};')
    if r.get("detail"):
        lines.append(f'  detail : {_q(r.get("detail"))};')
    lines.append(f'  retention-policy : {r.get("retentionPolicy", "permanent")};')

    # Temporal metadata
    lines.append("  temporal-metadata {")
    if tm.get("createdAt"):
        lines.append(f"    created-at : {_q(tm['createdAt'])};")
    if tm.get("updatedAt"):
        lines.append(f"    updated-at : {_q(tm['updatedAt'])};")
    if tm.get("deadline"):
        lines.append(f"    deadline : {_q(tm['deadline'])};")
    if tm.get("orientation"):
        lines.append(f"    orientation : {tm['orientation']};")
    lines.append("  };")

    # Contextual metadata
    if ctx:
        lines.append("  contextual-metadata {")
        for key, label in [
            ("projectContext", "project-context"),
            ("organizationalContext", "organizational-context"),
            ("strategicContext", "strategic-context"),
            ("emotionalContext", "emotional-context"),
        ]:
            if ctx.get(key):
                lines.append(f"    {label} : {_q(ctx[key])};")
        lines.append("  };")

    # Epistemic metadata
    lines.append("  epistemic-metadata {")
    if ep.get("confidence"):
        lines.append(f"    confidence : {ep['confidence']};")
    if ep.get("validationState"):
        lines.append(f"    validation-state : {ep['validationState']};")
    if ep.get("evidenceSource"):
        lines.append(f"    evidence-source : {_list(ep['evidenceSource'])};")
    lines.append("  };")

    # Operational metadata
    lines.append("  operational-metadata {")
    if op.get("executionState"):
        lines.append(f"    execution-state : {op['executionState']};")
    if op.get("priority"):
        lines.append(f"    priority : {op['priority']};")
    if op.get("delegation"):
        lines.append(f"    delegation : {op['delegation']};")
    if "actionability" in op:
        lines.append(f"    actionability : {'true' if op['actionability'] else 'false'};")
    lines.append("  };")

    # Lifecycle metadata
    lines.append("  lifecycle-metadata {")
    if lm.get("state"):
        lines.append(f"    state : {lm['state']};")
    if lm.get("revision") is not None:
        lines.append(f"    revision : {lm['revision']};")
    lines.append("  };")

    # Relational metadata
    if rels:
        lines.append("  relational-metadata {")
        for rel in rels:
            target = rel.get("target") if isinstance(rel, dict) else rel
            rtype = rel.get("type", "related-to") if isinstance(rel, dict) else "related-to"
            lines.append(f"    ({target}, {rtype});")
        lines.append("  };")

    # General metadata
    lines.append("  general-metadata {")
    if gm.get("classification"):
        lines.append(f"    classification : {_q(gm['classification'])};")
    if gm.get("domain"):
        lines.append(f"    domain : {gm['domain']};")
    if gm.get("cognitiveCategory"):
        lines.append(f"    cognitive-category : {_q(gm['cognitiveCategory'])};")
    if gm.get("operationalCategory"):
        lines.append(f"    operational-category : {gm['operationalCategory']};")
    if gm.get("tags"):
        lines.append(f"    tags : {_list(gm['tags'])};")
    lines.append("  };")

    lines.append("}")
    lines.append("end-record")
    lines.append("---")
    return "\n".join(lines)