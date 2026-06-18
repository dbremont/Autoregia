# PRS Design

Design documents for the **Personal Recording System (PRS)**.

## Documents

| Document        | Role                                                                 |
| --------------- | -------------------------------------------------------------------- |
| [`client.md`](./client.md)     | The **client spec** — user-facing capabilities and UX intent.        |
| [`gramar.ebnf`](./gramar.ebnf) | The **PRSL grammar** — the formal, authoritative data model.         |

> `client.md` is the *source of intent*; `gramar.ebnf` is the *source of truth*. When the two disagree, the grammar wins and the client spec should be updated to match.