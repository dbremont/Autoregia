# Sistema Asistencia de Revisión Lingüística

> A **Sistema Asistencia de Revisión Lingüística (SARL)** is a technical object
> engineered to `verify and correct text` — it checks a submitted text for
> linguistic, stylistic, terminological, and orthotypographic defects and
> returns evidence-cited findings with suggestions, from which a corrected text
> is composed by explicit disposition.

Within the Autoregia Personal Viable System Model (PVSM), SARL is a tool of the
**Agent Toolbox Ecosystem (ATE)** — the copy editor's pass over the agent's
textual outputs. It is deliberately not a writer and not a translator.

## Status

**Implemented — v1 live**: a WOS-style working app — text edition tasks with
an explicit lifecycle, the deterministic rule packs, glossaries, the editable
phrase catalog, audit, settings, and the dormant LanguageTool adapter:

    /ate/tool/sarl/

- Full design: [spec.md](spec.md)
- Sibling tools: [CES](../ces/) · [GCAL](../gcal/) · [CTES](../ctes/)
