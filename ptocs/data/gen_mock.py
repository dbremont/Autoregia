#!/usr/bin/env python3
"""
Deterministic PTOCS catalog seed generator.

Produces a realistic Personal Technical Object Catalog conforming to
spec/ptocs/schema.json: ~22 entries spanning every object_kind, with
provenance, cost, usage, epistemic, strategic metadata, and a connected
relationship graph (so dependency / redundancy / capability-gap analysis
has meaningful data).

Run:  python3 ptocs/data/gen_mock.py
Writes: ptocs/data/mock_entries.json
"""
import json, os
from datetime import datetime, timezone, timedelta

NOW = datetime(2026, 6, 27, 9, 30, tzinfo=timezone.utc)
BASE = datetime(2025, 11, 1, tzinfo=timezone.utc)


def iso(dt):
    return dt.isoformat().replace("+00:00", "Z")


def days(n):
    return iso(BASE + timedelta(days=n))


def recent(days_ago, hour=10):
    return iso(NOW - timedelta(days=days_ago, hours=NOW.hour - hour))


def slug(s):
    return s.lower().replace(" ", "-").replace("/", "-").replace(".", "")


# Each entry tuple:
# (id, name, object_kind, category, domain, status, priority,
#  system_served, summary, purpose, function, metadata-dict)

def E(id, name, kind, category, domain, status, priority, system,
      summary, purpose, function, vendor, version, lic, source, host,
      access, iface, cost_kind, install, docs, invoke, fit, evidence,
      rating, tags, last_used, acquired, currency=None, amount=None,
      period=None):
    """Compact entry builder returning a fully-formed entry dict."""
    return {
        "id": id, "name": name, "slug": slug(name), "aliases": [],
        "summary": summary, "detail": "", "purpose": purpose,
        "function": function, "object_kind": kind, "category": category,
        "domain": domain, "keywords": [category], "tags": tags,
        "provenance": {"source_url": source, "vendor": vendor,
                       "version": version, "license": lic,
                       "acquired_at": acquired},
        "status": status, "priority": priority, "owner": "self",
        "workflow_state": ("adopted" if status in ("active", "backup")
                           else "in_review" if status == "trial"
                           else "phasing_out" if status == "deprecated"
                           else "removed"),
        "lifecycle_state": ("active" if status in ("active", "backup")
                            else "deprecated" if status == "deprecated"
                            else "retired" if status == "retired"
                            else "provisional"),
        "hosting_model": host, "access_model": access,
        "cost": {"kind": cost_kind, "currency": currency, "amount": amount,
                 "period": period, "notes": None},
        "usage": {"interface": iface, "install": install, "config": None,
                  "docs_url": docs, "invocation": invoke},
        "epistemic": {"fit_confidence": fit, "evidence_level": evidence,
                      "rating": rating},
        "strategic": {"system_served": system, "goal": None,
                      "objective": None, "capability": category,
                      "initiative": None},
        "relations": [], "annotations": [],
        "created_at": acquired, "updated_at": recent(min(last_used, 60)),
        "last_used_at": recent(last_used),
    }


ENTRIES = [
  E("OBJ-2026-0001","Obsidian","software_tool","note-taking","Knowledge Management","active","critical","system_4_intelligence","Local-first Markdown knowledge base with bidirectional links.","External memory / note store — primary thinking substrate.","Bidirectional-link Markdown editing over local vault files.","Obsidian","1.7.4","proprietary","https://obsidian.md","local","free","gui","free","AppImage download","https://help.obsidian.md","obsidian","high","established",4.5,["daily-driver","pkm"],1,days(540)),
  E("OBJ-2026-0002","VS Code","software_tool","code-editor","Software Engineering","active","critical","system_1_operations","Extensible source-code editor.","Primary development environment.","Text editing, debugging, extensions, integrated terminal.","Microsoft","1.99","MIT","https://code.visualstudio.com","local","free","gui","free","apt install code","https://code.visualstudio.com/docs","code","high","established",4.5,["daily-driver","editor"],0,days(700)),
  E("OBJ-2026-0003","git","software_tool","version-control","Software Engineering","active","critical","system_1_operations","Distributed version control system.","Track change history of text artifacts.","Commit, branch, merge, and synchronize repositories.","Git project","2.45","GPL-2.0","https://git-scm.com","local","open","cli","free","apt install git","https://git-scm.com/docs","git","high","established",5,["daily-driver","vcs"],0,days(800)),
  E("OBJ-2026-0004","Flask","library_framework","web-framework","Software Engineering","active","high","system_1_operations","Lightweight Python WSGI web framework.","Serve mock APIs and prototypes for Autoregia tools.","Routing, request/response, JSON serialization.","Pallets","3.0","BSD-3-Clause","https://flask.palletsprojects.com","self_hosted","open","library","free","pip install flask","https://flask.palletsprojects.com","from flask import Flask","high","experimental",4,["backend"],2,days(120)),
  E("OBJ-2026-0005","Apache ECharts","library_framework","charting","Data Science","active","medium","system_4_intelligence","Declarative data-visualization library.","Render analytical charts for the Statistical Overlay.","Bar, pie, graph, and treemap visualizations from data.","Apache","5.5","Apache-2.0","https://echarts.apache.org","self_hosted","open","library","free","npm install echarts","https://echarts.apache.org/en/option.html","echarts.init(dom)","high","observational",4,["viz"],3,days(90)),
  E("OBJ-2026-0006","OpenAI Chat Completions API","service_platform","llm-inference","Software Engineering","active","high","system_4_intelligence","Hosted large-language-model inference service.","Augment catalog workflows via LLM suggestions.","Generate text, classify, propose relations, summarize entries.","OpenAI","gpt-4o","proprietary","https://platform.openai.com","cloud","api_key","api","usage_based","pip install openai","https://platform.openai.com/docs","client.chat.completions.create","high","experimental",4.5,["ai","paid"],0,days(200),currency="USD",amount=40.0,period="monthly"),
  E("OBJ-2026-0007","GitHub","service_platform","code-hosting","Software Engineering","active","critical","system_1_operations","Hosted Git repository and collaboration platform.","Remote source-code hosting and version synchronization.","Repository hosting, pull requests, issues, CI.","GitHub","n/a","proprietary","https://github.com","cloud","oauth","web","subscription","git remote add origin","https://docs.github.com","https://github.com","high","established",4.5,["daily-driver"],0,days(800),currency="USD",amount=4.0,period="monthly"),
  E("OBJ-2026-0008","arXiv API","data_source","academic-feed","Research","active","medium","system_4_intelligence","Programmatic access to the arXiv preprint corpus.","Surface research papers for the Intelligence System.","Query and retrieve metadata/abstracts of preprints.","Cornell University","v1","CC0","https://arxiv.org","cloud","open","api","free","HTTP GET","https://info.arxiv.org/help/api","export.arxiv.org/api/query","medium","observational",4,["research"],6,days(300)),
  E("OBJ-2026-0009","NixOS Server","infrastructure","os-runtime","Infrastructure","active","high","system_3_control","Declarative Linux server running Autoregia services.","Host self-managed services and persistent data stores.","Provide a reproducible compute and storage environment.","NixOS","24.05","MIT","https://nixos.org","self_hosted","license","cli","maintenance","declarative configuration","https://nixos.org/manual","ssh autoregia-ws","high","observational",4,["self-hosted"],1,days(400),currency="EUR",amount=12.0,period="monthly"),
  E("OBJ-2026-0010","SQLite","infrastructure","embedded-db","Software Engineering","active","high","system_3_audit_accounting","Embedded relational database engine.","Persistent structured storage for catalog records.","Transactional SQL storage in a single file.","SQLite Consortium","3.46","public-domain","https://sqlite.org","local","open","library","free","built into Python stdlib","https://sqlite.org/docs.html","sqlite3 db.sqlite","high","established",5,["storage"],1,days(500)),
  E("OBJ-2026-0011","ThinkPad X1 Carbon","hardware_device","laptop","Productivity","active","critical","system_1_operations","Primary personal computing device.","Run the agent operative software stack.","General-purpose portable computation.","Lenovo","Gen 11","proprietary","https://www.lenovo.com","physical","offline","hardware","one_time","n/a","https://pcsupport.lenovo.com","power button","high","established",4,["daily-driver"],0,days(420),currency="EUR",amount=1900.0),
  E("OBJ-2026-0012","Kindle e-reader","hardware_device","e-reader","Knowledge Management","backup","low","system_4_intelligence","Dedicated long-form reading device.","Read books and papers without digital distraction.","E-ink display for prolonged reading sessions.","Amazon","Paperwhite","proprietary","https://www.amazon.com","physical","offline","hardware","one_time","n/a","https://www.amazon.com/kindle","power button","medium","anecdotal",3.5,["reading"],40,days(600),currency="USD",amount=150.0),
  E("OBJ-2026-0013","Standing Desk","physical_instrument","furniture","Health","active","medium","system_1_operations","Height-adjustable workstation surface.","Sustain ergonomics during long working sessions.","Supports sit/stand posture variation.","IKEA","Bekant","proprietary","https://www.ikea.com","physical","offline","hardware","one_time","assembly","n/a","raise/lower controls","high","observational",4,["ergonomics"],0,days(700),currency="EUR",amount=500.0),
  E("OBJ-2026-0014","RFC 9110","reference_artifact","standard","Software Engineering","active","medium","system_4_intelligence","HTTP Semantics standard.","Normative reference for HTTP service design.","Defines HTTP methods, status codes, and semantics.","IETF","9110","BSD","https://www.rfc-editor.org/rfc/rfc9110","cloud","open","document","free","n/a","https://www.rfc-editor.org/rfc/rfc9110","https://www.rfc-editor.org/rfc/rfc9110","high","established",5,["standard","reference"],5,days(200)),
  E("OBJ-2026-0015","Release Pipeline","workflow_method","ci-cd","Software Engineering","active","high","system_1_operations","Automated build, test, and publish procedure.","Codify the path from commit to released artifact.","Run tests on push, build containers, deploy on tag.","self","v2","proprietary","https://github.com/autoregia/.github","cloud","oauth","api","maintenance","workflow YAML","internal","git tag && git push --tags","medium","observational",3.5,["automation"],3,days(150)),
  E("OBJ-2026-0016","Prompt Engineering","capability_skill","ai-skill","Software Engineering","active","high","system_4_intelligence","Method for eliciting reliable behaviour from LLMs.","Improve quality of AI-assisted catalog enrichment.","Compose structured prompts, few-shot examples, and constraints.","self","n/a","proprietary","internal notes","local","open","none","opportunity","n/a","internal","mental","high","experimental",4,["skill","ai"],0,days(100)),
  E("OBJ-2026-0017","Notion","service_platform","note-taking","Knowledge Management","trial","medium","system_4_intelligence","Hosted collaborative workspace and database.","Evaluate as alternative/complement to Obsidian.","Blocks, databases, and shared pages over the web.","Notion Labs","n/a","proprietary","https://notion.so","cloud","subscription","web","subscription","n/a","https://developers.notion.com","https://notion.so","low","anecdotal",3,["trial","pkm"],12,days(60),currency="USD",amount=8.0,period="monthly"),
  E("OBJ-2026-0018","Logseq","software_tool","note-taking","Knowledge Management","trial","low","system_4_intelligence","Open-source local-first outliner knowledge base.","Evaluate as open-source alternative to Obsidian.","Block-based outliner with backlinks and queries.","Logseq","0.10","AGPL-3.0","https://logseq.com","local","open","gui","free","AppImage","https://docs.logseq.com","logseq","low","anecdotal",3,["trial","pkm"],20,days(45)),
  E("OBJ-2026-0019","Anthropic Claude API","service_platform","llm-inference","Software Engineering","trial","medium","system_4_intelligence","Hosted large-language-model inference service (alternative).","Compare against OpenAI for catalog enrichment.","Generate, summarize, classify over long contexts.","Anthropic","claude-3.5","proprietary","https://anthropic.com","cloud","api_key","api","usage_based","pip install anthropic","https://docs.anthropic.com","client.messages.create","medium","anecdotal",4,["ai","paid","trial"],8,days(30),currency="USD",amount=15.0,period="monthly"),
  E("OBJ-2026-0020","Postgres","infrastructure","relational-db","Software Engineering","backup","medium","system_3_audit_accounting","Client-server relational database.","Considered as scaling path beyond SQLite.","Full SQL with extensions, concurrent access.","PostgreSQL Global Group","16","PostgreSQL","https://postgresql.org","self_hosted","open","api","maintenance","apt install postgresql","https://postgresql.org/docs","psql","low","anecdotal",3.5,["storage","backup"],90,days(250)),
  E("OBJ-2026-0021","Pandoc","software_tool","document-conversion","Writing","active","medium","system_1_operations","Universal document converter.","Transform Markdown specs into polished documents.","Convert between Markdown, HTML, PDF, LaTeX.","John MacFarlane","3.2","GPL-2.0","https://pandoc.org","local","open","cli","free","apt install pandoc","https://pandoc.org/MANUAL.html","pandoc input.md -o out.pdf","high","established",4.5,["writing"],4,days(500)),
  E("OBJ-2026-0022","Cloudflare","service_platform","cdn-dns","Infrastructure","active","high","system_2_coordination","Edge network for DNS, CDN, and TLS.","Expose self-hosted services reliably and securely.","Resolve DNS, cache assets, terminate TLS.","Cloudflare","n/a","proprietary","https://cloudflare.com","cloud","api_key","web","subscription","DNS delegation","https://developers.cloudflare.com","https://dash.cloudflare.com","high","observational",4,["infra"],2,days(350),currency="USD",amount=5.0,period="monthly"),
  E("OBJ-2026-0023","Zoom H5 Recorder","hardware_device","audio-recorder","Communication","deprecated","low","system_2_coordination","Portable audio recorder for lectures and notes.","Capture spoken content for later transcription.","Record multi-track audio to SD card.","Zoom","H5","proprietary","https://zoom-na.com","physical","offline","hardware","one_time","n/a","https://zoom-na.com/products/field-video-recording","record button","low","anecdotal",2.5,["audio","deprecated"],180,days(900),currency="USD",amount=280.0),
]
# (source_id, kind, target_id_or_name, notes)
RELATIONS = [
    ("OBJ-2026-0001", "integrates_with", "OBJ-2026-0003", "Vault versioned in git"),
    ("OBJ-2026-0001", "integrates_with", "OBJ-2026-0021", "Export notes via pandoc"),
    ("OBJ-2026-0002", "depends_on", "OBJ-2026-0003", "Editor calls git"),
    ("OBJ-2026-0004", "depends_on", "OBJ-2026-0010", "Catalog stored in SQLite"),
    ("OBJ-2026-0004", "integrates_with", "OBJ-2026-0007", "Mirrors repos to GitHub"),
    ("OBJ-2026-0005", "integrates_with", "OBJ-2026-0004", "Charts served by Flask app"),
    ("OBJ-2026-0006", "alternative_to", "OBJ-2026-0019", "Two LLM providers, same capability"),
    ("OBJ-2026-0019", "alternative_to", "OBJ-2026-0006", None),
    ("OBJ-2026-0006", "depends_on", "OBJ-2026-0022", "Routed via Cloudflare"),
    ("OBJ-2026-0007", "integrates_with", "OBJ-2026-0003", "Git host"),
    ("OBJ-2026-0008", "integrates_with", "OBJ-2026-0006", "Summarize papers via LLM"),
    ("OBJ-2026-0008", "complements", "OBJ-2026-0001", "Store papers in vault"),
    ("OBJ-2026-0009", "depends_on", "OBJ-2026-0022", "Public access via Cloudflare"),
    ("OBJ-2026-0009", "contains", "OBJ-2026-0010", "Runs SQLite-backed services"),
    ("OBJ-2026-0010", "alternative_to", "OBJ-2026-0020", "SQLite vs Postgres scaling path"),
    ("OBJ-2026-0020", "alternative_to", "OBJ-2026-0010", None),
    ("OBJ-2026-0011", "contains", "OBJ-2026-0002", "Runs the editor"),
    ("OBJ-2026-0011", "contains", "OBJ-2026-0001", "Runs the vault"),
    ("OBJ-2026-0014", "references", "OBJ-2026-0004", "Flask follows HTTP semantics"),
    ("OBJ-2026-0014", "references", "OBJ-2026-0006", "OpenAI API follows HTTP"),
    ("OBJ-2026-0015", "depends_on", "OBJ-2026-0007", "Runs on GitHub Actions"),
    ("OBJ-2026-0015", "depends_on", "OBJ-2026-0009", "Deploys to NixOS"),
    ("OBJ-2026-0016", "enables", "OBJ-2026-0006", "Skill improves API usage"),
    ("OBJ-2026-0016", "enables", "OBJ-2026-0019", None),
    ("OBJ-2026-0017", "alternative_to", "OBJ-2026-0001", "Hosted vs local PKM"),
    ("OBJ-2026-0018", "alternative_to", "OBJ-2026-0001", "Open-source outliner vs Obsidian"),
    ("OBJ-2026-0005", "depends_on", "OBJ-2026-0002", "Developed in VS Code"),
    ("OBJ-2026-0022", "complements", "OBJ-2026-0009", "Edge in front of origin"),
    ("OBJ-2026-0001", "complements", "OBJ-2026-0008", "Papers feed the vault"),
]

ANNOTATIONS_SEED = [
    ("OBJ-2026-0001", "ann-0001", "self", "comment", "Switched to local-first after Notion sync issues.", "resolved", days(500)),
    ("OBJ-2026-0001", "ann-0002", "self", "review", "Still the best daily driver; plugins stable.", "open", recent(7)),
    ("OBJ-2026-0006", "ann-0003", "self", "cost_change", "Usage crossed $40/mo; consider budget cap.", "open", recent(3)),
    ("OBJ-2026-0017", "ann-0004", "self", "question", "Does Notion replace Obsidian or complement it?", "open", recent(12)),
    ("OBJ-2026-0020", "ann-0005", "self", "migration", "Hold Postgres until >100k records.", "resolved", days(120)),
    ("OBJ-2026-0023", "ann-0006", "self", "comment", "Phone recording is sufficient now.", "resolved", days(180)),
]


def build():
    entries = [dict(e) for e in ENTRIES]
    by_id = {e["id"]: e for e in entries}
    by_name = {e["name"].lower(): e for e in entries}

    def resolve(t):
        if t in by_id:
            return by_id[t]["id"]
        if t.lower() in by_name:
            return by_name[t.lower()]["id"]
        return t

    for (src, kind, target, notes) in RELATIONS:
        if src in by_id:
            by_id[src]["relations"].append(
                {"target": resolve(target), "kind": kind, "notes": notes})

    for (eid, annid, author, kind, text, state, when) in ANNOTATIONS_SEED:
        if eid in by_id:
            by_id[eid]["annotations"].append({
                "id": annid, "created_at": when, "author": author,
                "kind": kind, "text": text, "state": state})

    for e in entries:
        if e["updated_at"] < e["created_at"]:
            e["updated_at"] = e["created_at"]
    return entries


def main():
    entries = build()
    path = os.path.join(os.path.dirname(__file__), "mock_entries.json")
    with open(path, "w") as f:
        json.dump(entries, f, indent=2, default=str)
    print(f"Wrote {len(entries)} catalog entries -> {path}")
    try:
        import jsonschema
        schema_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "spec", "ptocs",
            "schema.json")
        with open(schema_path) as sf:
            schema = json.load(sf)
        for e in entries:
            jsonschema.validate(e, schema)
        print("All entries validate against spec/ptocs/schema.json")
    except ImportError:
        print("(jsonschema not installed - skipping validation)")
    except Exception as ex:
        print(f"VALIDATION ERROR: {ex}")


if __name__ == "__main__":
    main()
