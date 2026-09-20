"""Tests for SARL — Sistema Asistencia de Revisión Lingüística.

Requires a running CouchDB on localhost:5984 (the project default). Uses an
isolated ``sarl_test_`` DB prefix — dropped at import for a clean slate.

Covers v1: the deterministic engine (golden texts per pack), text edition
task lifecycle (submit → disposition → apply/discard), glossaries, the
phrase catalog, the dormant LanguageTool adapter (against a mock), audit,
settings, self monitoring, export, and the API index.
"""
import os

os.environ["COUCHDB_DB_PREFIX"] = "sarl_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates & seeds it.
import couchdb  # noqa: E402

_srv = couchdb.Server(os.environ["COUCHDB_URL"])
_srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
try:
    if "sarl_test_sarl" in _srv:
        _srv.delete("sarl_test_sarl")
    _couch_ok = True
except Exception:  # pragma: no cover - CouchDB unreachable
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:  # pragma: no cover
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)  # for `import packs` (the engine) standalone
_spec = importlib.util.spec_from_file_location("sarl_server", os.path.join(_HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["sarl_server"] = srv
_spec.loader.exec_module(srv)

import packs  # noqa: E402


SETTINGS = {"max_findings": 200, "evidence_excerpt": 120}


@pytest.fixture
def client():
    # Fresh store per test: wipe every doc, then re-apply the seed (the
    # starter glossary + phrase collections) and the settings doc.
    for d in srv.store.all():
        srv.store.delete(d["id"])
    srv.store.seed([srv.SEED_PATH])
    srv._ensure_settings_doc()
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _define(client, content, **over):
    """Define a task (the workflow's first step — no review runs)."""
    body = {"content": content, "language": over.pop("language", "es")}
    body.update(over)
    return client.post("/api/tasks", json=body)


def _reviewed(client, content, **over):
    """Define + run the review; returns the task in state ``reviewed``."""
    res = _define(client, content, **over)
    assert res.status_code == 201, res.get_json()
    tid = res.get_json()["id"]
    res = client.post(f"/api/tasks/{tid}/review")
    assert res.status_code == 200, res.get_json()
    return res


# convenience for suites that just need a reviewed task on the books
_submit = _reviewed


# ── the engine (pure, no store) ──────────────────────────────────────────────

class TestEngine:
    def test_registry_has_all_packs(self):
        reg = {p["id"]: p for p in packs.registry()}
        assert set(reg) == {"es-ortotipografia", "es-linguistica",
                            "en-orthotypography", "estilo", "terminologia",
                            "languagetool"}
        assert reg["languagetool"]["status"] == "dormant"
        assert reg["es-ortotipografia"]["status"] == "live"
        assert reg["estilo"]["languages"] == ["es", "en"]

    def test_es_ortotipografia_golden(self):
        text = 'Dijo "hola"...  y se fue.'
        findings, engaged = packs.run_review(
            text, language="es", settings=SETTINGS)
        assert "es-ortotipografia" in engaged
        rules = {f["rule_id"] for f in findings}
        assert {"es-ort-straight-quotes", "es-ort-ellipsis",
                "es-ort-double-space"} <= rules
        for f in findings:
            assert text[f["start"]:f["end"]]          # evidence spans are real
            assert f["engine"] == "live"

    def test_capitalization_after_punct_fires(self):
        findings, _ = packs.run_review(
            "Terminó. entonces empezó de nuevo.", language="es",
            settings=SETTINGS)
        assert any(f["rule_id"] == "es-ort-capital-after-punct"
                   for f in findings)

    def test_capitalization_respects_abbreviations(self):
        findings, _ = packs.run_review(
            "Es fácil, p. ej. con práctica.", language="es", settings=SETTINGS)
        assert not any(f["rule_id"] == "es-ort-capital-after-punct"
                       for f in findings)

    def test_es_linguistica_golden(self):
        findings, _ = packs.run_review(
            "Pienso de que va bien, a pesar que llueve. haber si funciona.",
            language="es", settings=SETTINGS)
        rules = {f["rule_id"] for f in findings}
        assert "es-lin-dequeismo" in rules
        assert "es-lin-queismo" in rules
        assert "es-lin-haber-a-ver" in rules
        deq = next(f for f in findings if f["rule_id"] == "es-lin-dequeismo")
        assert deq["suggestion"] == "Pienso que"

    def test_en_orthotypography_golden(self):
        text = 'He said "it works"...  it didn\'t.'
        findings, engaged = packs.run_review(text, language="en",
                                             settings=SETTINGS)
        assert "en-orthotypography" in engaged
        rules = {f["rule_id"] for f in findings}
        assert "en-orth-straight-quotes" in rules
        assert "en-orth-ellipsis" in rules
        assert "en-orth-apostrophe" in rules

    def test_muletillas_fire_from_phrase_catalog(self):
        phrases = [{"enabled": True, "language": "es",
                    "phrases": ["cabe destacar que"]}]
        findings, _ = packs.run_review(
            "Cabe destacar que funciona.", language="es", phrases=phrases,
            settings=SETTINGS)
        m = [f for f in findings if f["rule_id"] == "est-muletillas"]
        assert len(m) == 1
        assert m[0]["suggestion"] == ""          # deletion suggestion

    def test_sentence_length_advisory(self):
        findings, _ = packs.run_review(
            "La revisión " + "minuciosa " * 60 + "terminó bien.",
            language="es", settings=SETTINGS)
        assert any(f["rule_id"] == "est-sentence-length"
                   for f in findings)
        assert all(f["suggestion"] is None
                   for f in findings
                   if f["rule_id"] == "est-sentence-length")

    def test_terminologia_enforces_glossary(self):
        glossaries = [{"id": "g1", "entries": [
            {"preferred": "sitio web", "forbidden": ["website"],
             "aliases": ["página web"]}]}]
        findings, _ = packs.run_review(
            "El website y la página web caen.", language="es",
            glossaries=glossaries, settings=SETTINGS)
        term = [f for f in findings if f["rule_id"] == "term-glossary"]
        assert len(term) == 3                     # forbidden + alias + drift
        assert term[0]["suggestion"] == "sitio web"

    def test_bounded_responses(self):
        text = '"a" "b" "c" ' * 100
        findings, _ = packs.run_review(text, language="es",
                                       settings={"max_findings": 5,
                                                 "evidence_excerpt": 120})
        assert len(findings) == 5

    def test_same_text_same_findings(self):
        text = 'Dijo "x"...  luego "y".'
        a, _ = packs.run_review(text, language="es", settings=SETTINGS)
        b, _ = packs.run_review(text, language="es", settings=SETTINGS)
        assert a == b

    def test_dimensions_filter(self):
        findings, engaged = packs.run_review(
            'Dijo "x"...', language="es", dimensions=["estilistica"],
            settings=SETTINGS)
        assert "es-ortotipografia" not in engaged


# ── text edition tasks: the workflow ─────────────────────────────────────────

class TestTaskLifecycle:
    def test_define_creates_created_task_without_findings(self, client):
        res = _define(client, 'Dijo "hola"...  y nadie respondió.',
                      title="Saludo — borrador 2")
        assert res.status_code == 201
        task = res.get_json()
        assert task["state"] == "created"
        assert task["id"].startswith("TED-")
        assert task["title"] == "Saludo — borrador 2"
        assert task["input"]["content"] == 'Dijo "hola"...  y nadie respondió.'
        assert task["findings"] == []
        assert task["counts"]["total"] == 0
        assert task["packs_engaged"] == []
        assert task["duration_ms"] is None
        # the summary carries the title too
        data = client.get("/api/tasks").get_json()
        assert any(t["title"] == "Saludo — borrador 2" for t in data)

    def test_define_validates(self, client):
        assert _define(client, "").status_code == 400
        assert _define(client, "   ").status_code == 400
        assert _define(client, "x", language="fr").status_code == 400
        assert _define(client, "x", register="poetry").status_code == 400
        assert _define(client, "x", glossary_ids=["glos-nope"]).status_code == 400
        assert _define(client, "x", dimensions=["magia"]).status_code == 400
        assert _define(client, "x", title="x" * 300).status_code == 400
        assert client.post("/api/tasks", json={}).status_code == 400

    def test_review_step_runs_the_packs(self, client):
        res = _reviewed(client, 'Dijo "hola"...  y nadie respondió.')
        task = res.get_json()
        assert task["state"] == "reviewed"
        assert task["counts"]["total"] >= 3
        assert task["packs_engaged"]
        assert task["duration_ms"] is not None
        for f in task["findings"]:
            assert f["disposition"] == "pending"
            assert task["input"]["content"][f["start"]:f["end"]]
        # the workflow step is one-shot: created → reviewed
        assert client.post(f"/api/tasks/{task['id']}/review").status_code == 409

    def test_criteria_engage_only_the_declared_dimensions(self, client):
        task = _reviewed(client, 'Cabe destacar que "esto"...  bien.',
                         dimensions=["estilistica"]).get_json()
        assert task["packs_engaged"] == ["estilo"]
        rules = {f["rule_id"] for f in task["findings"]}
        assert "est-muletillas" in rules
        assert "es-ort-straight-quotes" not in rules

    def test_review_unknown_task(self, client):
        assert client.post("/api/tasks/TED-nope/review").status_code == 404

    def test_disposition_needs_reviewed(self, client):
        task = _define(client, 'Dijo "hola"...  y nadie.').get_json()
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": "F1", "disposition": "accepted"})
        assert res.status_code == 409
        assert client.post(f"/api/tasks/{task['id']}/apply").status_code == 409

    def test_disposition_accept_reject_undo(self, client):
        task = _reviewed(client, 'Dijo "hola"...  y nadie.').get_json()
        f1, f2 = task["findings"][0], task["findings"][1]
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": f1["id"], "disposition": "accepted"})
        assert res.status_code == 200
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": f2["id"], "disposition": "rejected"})
        assert res.status_code == 200
        got = client.get(f"/api/tasks/{task['id']}").get_json()
        disp = {f["id"]: f["disposition"] for f in got["findings"]}
        assert disp[f1["id"]] == "accepted"
        assert disp[f2["id"]] == "rejected"
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": f2["id"], "disposition": "pending"})
        assert res.status_code == 200
        assert client.post(f"/api/tasks/{task['id']}/disposition",
                           json={"finding_id": "F999", "disposition": "accepted"}
                           ).status_code == 404
        assert client.post(f"/api/tasks/{task['id']}/disposition",
                           json={"finding_id": f1["id"],
                                 "disposition": "maybe"}).status_code == 400

    def test_overlapping_accepts_conflict(self, client):
        # '...' spans overlap the capitalization span that follows it.
        task = _reviewed(client, "Terminó...  entonces siguió.").get_json()
        ells = [f for f in task["findings"]
                if f["rule_id"] == "es-ort-ellipsis"]
        caps = [f for f in task["findings"]
                if f["rule_id"] == "es-ort-capital-after-punct"]
        assert ells and caps
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": caps[0]["id"],
                                "disposition": "accepted"})
        assert res.status_code == 200
        res = client.post(f"/api/tasks/{task['id']}/disposition",
                          json={"finding_id": ells[0]["id"],
                                "disposition": "accepted"})
        assert res.status_code == 409
        assert "overlaps" in res.get_json()["error"]

    def test_apply_composes_corrected_text_and_change_log(self, client):
        text = 'cabe destacar que "esto" funciona...'
        task = _reviewed(client, text).get_json()
        # accept every finding with a non-overlapping suggestion, one by one
        accepted = 0
        for f in task["findings"]:
            if f["suggestion"] is None:
                continue
            res = client.post(f"/api/tasks/{task['id']}/disposition",
                              json={"finding_id": f["id"],
                                    "disposition": "accepted"})
            if res.status_code == 200:
                accepted += 1
        assert accepted > 0
        res = client.post(f"/api/tasks/{task['id']}/apply")
        assert res.status_code == 200
        applied = res.get_json()
        assert applied["state"] == "applied"
        assert applied["input"]["content"] == text      # never mutated
        assert len(applied["change_log"]) == accepted
        for c in applied["change_log"]:
            assert c["before"] != c["after"] or c["after"] == ""
        assert "cabe destacar que" not in applied["corrected_text"]
        assert "…" in applied["corrected_text"]

    def test_apply_is_terminal(self, client):
        task = _reviewed(client, 'Dijo "x"...').get_json()
        client.post(f"/api/tasks/{task['id']}/apply")
        f0 = task["findings"][0]
        assert client.post(f"/api/tasks/{task['id']}/disposition",
                           json={"finding_id": f0["id"],
                                 "disposition": "accepted"}).status_code == 409
        assert client.post(f"/api/tasks/{task['id']}/apply").status_code == 409
        assert client.post(f"/api/tasks/{task['id']}/discard").status_code == 409
        assert client.post(f"/api/tasks/{task['id']}/review").status_code == 409

    def test_discard_from_created_and_reviewed(self, client):
        created = _define(client, 'Dijo "x"...').get_json()
        res = client.post(f"/api/tasks/{created['id']}/discard")
        assert res.status_code == 200
        assert res.get_json()["state"] == "discarded"
        reviewed = _reviewed(client, 'Dijo "y"...').get_json()
        res = client.post(f"/api/tasks/{reviewed['id']}/discard")
        assert res.status_code == 200
        assert res.get_json()["state"] == "discarded"
        assert client.post(f"/api/tasks/{reviewed['id']}/apply").status_code == 409

    def test_search_by_title_content_and_rule(self, client):
        _reviewed(client, 'Dijo "a"...', title="README borrador")
        _reviewed(client, 'He said "b"...', language="en", title="Notes")
        # by title
        hits = client.get("/api/tasks?q=README").get_json()
        assert len(hits) == 1 and hits[0]["title"] == "README borrador"
        # by rule id fired in the review
        hits = client.get("/api/tasks?q=es-ort-ellipsis").get_json()
        assert len(hits) == 1 and hits[0]["language"] == "es"
        # by content
        hits = client.get("/api/tasks?q=He said").get_json()
        assert len(hits) == 1 and hits[0]["language"] == "en"

    def test_task_listing_and_filters(self, client):
        _define(client, 'Dijo "a"...')
        _reviewed(client, 'He said "b"...', language="en")
        created = client.get("/api/tasks?state=created").get_json()
        assert len(created) == 1 and created[0]["state"] == "created"
        reviewed = client.get("/api/tasks?state=reviewed").get_json()
        assert len(reviewed) == 1 and reviewed[0]["state"] == "reviewed"
        assert client.get("/api/tasks?language=en").get_json()[0]["language"] == "en"
        one = client.get("/api/tasks").get_json()[0]
        assert client.get(f"/api/tasks/{one['id']}").status_code == 200
        assert client.get("/api/tasks/TED-nope").status_code == 404

    def test_clear_journal(self, client):
        _define(client, 'Dijo "x"...')
        res = client.delete("/api/tasks")
        assert res.status_code == 200
        assert res.get_json()["deleted"] >= 1
        assert client.get("/api/tasks").get_json() == []

    def test_task_retention_prunes(self, client):
        client.put("/api/settings", json={"task_retention": 3})
        for i in range(5):
            _reviewed(client, f'Dijo "{i}"...')
        tasks = client.get("/api/tasks?limit=200").get_json()
        assert len(tasks) == 3


# ── the document is markdown ─────────────────────────────────────────────────

class TestMarkdownDocument:
    def test_code_fence_is_protected(self, client):
        md = ('Prose with "quotes"...  here.\n\n'
              '```python\n'
              'x = "code..."  # 1.5\n'
              "y = 'raw'\n"
              '```\n\n'
              'Sigue. entonces "más" prosa.')
        task = _reviewed(client, md).get_json()
        fence_start = md.index('```python')
        fence_end = md.index('```', fence_start + 3) + 3
        inside = [f for f in task["findings"]
                  if f["start"] < fence_end and fence_start < f["end"]]
        assert not inside
        rules = {f["rule_id"] for f in task["findings"]}
        assert "es-ort-straight-quotes" in rules      # prose still reviewed

    def test_inline_code_and_links_are_protected(self, client):
        md = ('Run `make "x"...  1.5` and see [docs](http://ex.com/a_1.5...) '
              'plus <https://ex.com/x...y>.')
        task = _reviewed(client, md).get_json()
        assert task["findings"] == []

    def test_indented_code_block_is_protected(self, client):
        md = ('Title\n\n'
              '    indented = "code..."  # 1.5\n\n'
              'Prose "after" the block...')
        task = _reviewed(client, md).get_json()
        ind_start = md.index('    indented')
        ind_end = md.index('\n\nProse')
        inside = [f for f in task["findings"]
                  if f["start"] < ind_end and ind_start < f["end"]]
        assert not inside
        assert any(f["rule_id"] == "es-ort-straight-quotes"
                   for f in task["findings"])

    def test_prose_around_markdown_still_reviewed(self, client):
        md = '# Título\n\nCabe destacar que esto "funciona"...\n\n- item uno\n'
        task = _reviewed(client, md).get_json()
        rules = {f["rule_id"] for f in task["findings"]}
        assert "es-ort-straight-quotes" in rules
        assert "es-ort-ellipsis" in rules


# ── glossaries ───────────────────────────────────────────────────────────────

class TestGlossaries:
    def test_seed_glossary_present(self, client):
        data = client.get("/api/glossaries").get_json()
        assert any(g["id"] == "glos-redaccion-tecnica-es" for g in data)
        g = next(g for g in data if g["id"] == "glos-redaccion-tecnica-es")
        assert g["entry_count"] >= 5

    def test_crud(self, client):
        res = client.post("/api/glossaries", json={
            "name": "Test", "language": "es",
            "entries": [{"preferred": "interfaz", "forbidden": ["interface"]}]})
        assert res.status_code == 201
        gid = res.get_json()["id"]
        assert gid.startswith("GLOS-")
        got = client.get(f"/api/glossaries/{gid}").get_json()
        assert got["entries"][0]["preferred"] == "interfaz"
        res = client.put(f"/api/glossaries/{gid}", json={
            "entries": [{"preferred": "pantalla"}]})
        assert res.status_code == 200
        assert res.get_json()["entries"][0]["preferred"] == "pantalla"
        assert client.delete(f"/api/glossaries/{gid}").status_code == 200
        assert client.get(f"/api/glossaries/{gid}").status_code == 404

    def test_validation(self, client):
        assert client.post("/api/glossaries",
                           json={"language": "es"}).status_code == 400
        assert client.post("/api/glossaries",
                           json={"name": "x", "language": "fr"}).status_code == 400
        assert client.post("/api/glossaries", json={
            "name": "x", "language": "es",
            "entries": [{"preferred": ""}]}).status_code == 400

    def test_enforcement_in_review(self, client):
        task = _submit(client, "El backup se guardó en el website.",
                       glossary_ids=["glos-redaccion-tecnica-es"]).get_json()
        rules = {f["rule_id"] for f in task["findings"]}
        assert "term-glossary" in rules
        backup = next(f for f in task["findings"]
                      if f["evidence"].lower() == "backup")
        assert backup["suggestion"] == "copia de seguridad"
        assert backup["severity"] == "error"


# ── the phrase catalog ───────────────────────────────────────────────────────

class TestPhraseCatalog:
    def test_seed_collections_present(self, client):
        data = client.get("/api/phrases").get_json()
        ids = {p["id"] for p in data}
        assert {"phr-muletillas-es", "phr-fillers-en"} <= ids

    def test_crud(self, client):
        res = client.post("/api/phrases", json={
            "name": "T", "language": "any", "kind": "other",
            "phrases": ["en el día de hoy"]})
        assert res.status_code == 201
        pid = res.get_json()["id"]
        assert pid.startswith("PHR-")
        res = client.put(f"/api/phrases/{pid}",
                         json={"phrases": ["sin lugar a dudas"], "enabled": False})
        assert res.status_code == 200
        assert res.get_json()["enabled"] is False
        assert client.delete(f"/api/phrases/{pid}").status_code == 200
        assert client.get(f"/api/phrases/{pid}").status_code == 404

    def test_engine_reads_edits_live(self, client):
        text = "Totalmente en serio, esto funciona."
        before = _submit(client, text).get_json()["counts"]["total"]
        client.post("/api/phrases", json={
            "name": "Custom", "language": "es", "kind": "muletilla",
            "phrases": ["totalmente en serio"]})
        after = _submit(client, text).get_json()
        assert after["counts"]["total"] == before + 1
        assert any(f["rule_id"] == "est-muletillas"
                   for f in after["findings"])

    def test_disabled_collection_stops_firing(self, client):
        text = "Cabe destacar que funciona."
        assert any(f["rule_id"] == "est-muletillas"
                   for f in _submit(client, text).get_json()["findings"])
        coll = client.get("/api/phrases/phr-muletillas-es").get_json()
        coll["enabled"] = False
        client.put("/api/phrases/phr-muletillas-es", json=coll)
        assert not any(f["rule_id"] == "est-muletillas"
                       for f in _submit(client, text).get_json()["findings"])


# ── the dormant LanguageTool adapter ─────────────────────────────────────────

class TestLanguageTool:
    @staticmethod
    def _mock_post(endpoint, fields, timeout_s):
        text = fields["text"]
        assert endpoint.endswith("/v2/check")
        return {
            "matches": [
                {"message": "Possible spelling mistake",
                 "offset": text.index("errata"), "length": 6,
                 "replacements": [{"value": "errata corrigenda"}],
                 "rule": {"id": "MISSPELLING", "category": {"id": "TYPOS"}}},
                {"message": "Style issue",
                 "offset": text.index("muy"), "length": 3,
                 "replacements": [],
                 "rule": {"id": "STYLE_X", "category": {"id": "STYLE"}}},
            ],
        }

    def test_dormant_by_default(self, client):
        task = _submit(client, "errata muy clara.").get_json()
        assert all(f["engine"] == "live" for f in task["findings"])
        assert "languagetool" not in task["packs_engaged"]

    def test_awake_with_mock(self, client, monkeypatch):
        monkeypatch.setattr(srv.packs.languagetool, "_post_form",
                            self._mock_post)
        client.put("/api/settings", json={"languagetool_url": "http://lt:8010"})
        task = _submit(client, "La errata es muy clara.").get_json()
        assert "languagetool" in task["packs_engaged"]
        lt = [f for f in task["findings"] if f["engine"] == "languagetool"]
        assert len(lt) == 2
        assert lt[0]["severity"] == "error"       # TYPOS category
        assert lt[0]["suggestion"] == "errata corrigenda"
        assert lt[1]["dimension"] == "estilistica"

    def test_engine_failure_recorded_not_silent(self, client, monkeypatch):
        def boom(*a, **k):
            raise OSError("connection refused")
        monkeypatch.setattr(srv.packs.languagetool, "_post_form", boom)
        client.put("/api/settings", json={"languagetool_url": "http://lt:8010"})
        task = _submit(client, "Texto normal.").get_json()
        assert "languagetool" in task["packs_engaged"]
        assert any(f["rule_id"] == "lt-engine-error"
                   for f in task["findings"])
        client.put("/api/settings", json={"languagetool_url": ""})


# ── audit, settings, self, export, index ─────────────────────────────────────

class TestSystem:
    def test_audit_records_mutations(self, client):
        task = _submit(client, 'Dijo "x"...').get_json()
        client.post(f"/api/tasks/{task['id']}/apply")
        actions = [e["action"] for e in client.get("/api/audit").get_json()]
        assert "task.create" in actions
        assert "task.apply" in actions
        by_action = client.get("/api/audit?action=task.create").get_json()
        assert all(e["action"] == "task.create" for e in by_action)
        assert by_action[0]["entity_id"] == task["id"]

    def test_settings_defaults_and_env(self, client):
        body = client.get("/api/settings").get_json()
        assert body["settings"]["default_language"] == "es"
        assert body["settings"]["languagetool_url"] == ""
        assert body["environment"]["db"].endswith("sarl")

    def test_settings_validation(self, client):
        assert client.put("/api/settings",
                          json={"default_language": "fr"}).status_code == 400
        assert client.put("/api/settings",
                          json={"max_findings": "many"}).status_code == 400
        assert client.put("/api/settings",
                          json={"languagetool_url": "ftp://x"}).status_code == 400
        res = client.put("/api/settings", json={"max_findings": 999999})
        assert res.status_code == 200
        assert res.get_json()["max_findings"] == 1000      # clamped

    def test_self_blob(self, client):
        _submit(client, 'Dijo "x"...')
        blob = client.get("/api/self").get_json()
        assert blob["store"]["db"].endswith("sarl")
        assert blob["tasks"]["total"] >= 1
        assert blob["findings"]["total"] >= 1
        assert "uptime_s" in blob
        assert any(p["id"] == "es-ortotipografia"
                   for p in blob["engine"]["packs"])

    def test_overview_payload(self, client):
        _submit(client, 'Dijo "x"...')
        o = client.get("/api/overview").get_json()
        assert o["tasks"]["total"] >= 1
        assert o["findings"]["total"] >= 1
        assert o["resources"]["glossaries"] >= 1
        assert o["resources"]["phrase_collections"] >= 2
        assert "recent" in o

    def test_export_bundle(self, client):
        _submit(client, 'Dijo "x"...')
        bundle = client.get("/api/export").get_json()
        assert len(bundle["tasks"]) >= 1
        assert any(g["id"] == "glos-redaccion-tecnica-es"
                   for g in bundle["glossaries"])
        assert "settings" in bundle

    def test_api_index_and_plate(self, client):
        res = client.get("/api")
        assert res.status_code == 200
        assert res.get_json()["name"].startswith("SARL")
        rules = client.get("/api/rules").get_json()
        assert "packs" in rules and "dimensions" in rules
        res = client.get("/")
        assert res.status_code == 200
        assert b"SARL" in res.data
