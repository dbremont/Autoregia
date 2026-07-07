"""PEOS topic clustering.

Groups observations into semantic topic clusters. Two backends:

* **embeddings** (default when available) — `fastembed` MiniLM/BGE-small sentence
  embeddings (~33MB ONNX model, CPU) + spherical k-means. Semantic grouping.
* **lexical** (fallback) — TF-IDF vectors over the corpus vocabulary + spherical
  k-means. No model download; needs only numpy.

The chosen backend is auto-detected (overridable via ``PEOS_CLUSTER_BACKEND``).
Clustering is a *batch* job: the server calls :func:`compute_clusters`, stores a
single ``CLUSTERS-current`` assignment map in CouchDB, and the analytics endpoint
joins observations to clusters via that map — no per-observation mutation.
"""
from __future__ import annotations

import math
import os
import time
from collections import Counter

from peos.analytics import _text, tokenize

_BACKEND = os.environ.get("PEOS_CLUSTER_BACKEND", "auto").lower()


def _kmeans(X, k: int, iters: int = 30, seed: int = 7):
    import numpy as np
    n = X.shape[0]
    if n <= k:
        return np.arange(n) % max(1, k)
    rng = np.random.default_rng(seed)
    # k-means++ seeding on cosine distance (vectors are L2-normalized)
    centers = [X[rng.integers(n)]]
    for _ in range(1, k):
        sims = X @ np.asarray(centers).T
        dist2 = (1.0 - sims.max(axis=1)).clip(min=1e-6)
        prob = dist2 / dist2.sum()
        centers.append(X[rng.choice(n, p=prob)])
    C = np.asarray(centers)
    labels = np.full(n, -1)
    for _ in range(iters):
        sims = X @ C.T
        new = sims.argmax(axis=1)
        if np.array_equal(new, labels):
            break
        labels = new
        for j in range(k):
            mask = labels == j
            if mask.any():
                v = X[mask].mean(axis=0)
                nv = float(np.linalg.norm(v))
                C[j] = v / nv if nv > 0 else C[j]
    return labels


def _embeddings_matrix(items: list[tuple[str, str]]):
    import numpy as np
    from fastembed import TextEmbedding
    model = TextEmbedding("BAAI/bge-small-en-v1.5")
    texts = [t[:600] for _id, t in items]
    embs = np.asarray(list(model.embed(texts)), dtype=np.float32)
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return embs / norms, "embeddings", 384


def _lexical_matrix(items: list[tuple[str, str]]):
    import numpy as np
    n = len(items)
    df: Counter = Counter()
    docs: list[set[str]] = []
    for _id, text in items:
        toks = set(tokenize(text))
        docs.append(toks)
        for t in toks:
            df[t] += 1
    vocab = [t for t, c in df.most_common(700) if 2 <= c < n * 0.7]
    vidx = {t: i for i, t in enumerate(vocab)}
    M = np.zeros((n, len(vocab)), dtype=np.float32)
    for i, toks in enumerate(docs):
        tf = Counter(t for t in toks if t in vidx)
        for t, c in tf.items():
            idf = math.log((n + 1) / (df[t] + 1)) + 1.0
            M[i, vidx[t]] = c * idf
    norms = np.linalg.norm(M, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return M / norms, "lexical", len(vocab)


def _label_clusters(items, labels, k):
    """Top discriminative terms per cluster → a short human label."""
    labels_for = {}
    for j in range(k):
        members = [items[i] for i in range(len(items)) if labels[i] == j]
        if not members:
            continue
        c: Counter = Counter()
        for _id, text in members:
            for t in tokenize(text):
                c[t] += 1
        top = ", ".join(t for t, _ in c.most_common(3)) or f"cluster {j+1}"
        labels_for[j] = top
    return labels_for


def compute_clusters(observations: list[dict], k: int | None = None) -> dict:
    """Return ``{assignments, meta}`` where assignments maps obs id → cluster."""
    items = [(o.get("id") or o.get("_id") or "",
              _text(o).strip()) for o in observations
             if (o.get("title") or o.get("body"))]
    n = len(items)
    now = int(time.time() * 1000)
    if n < 6:
        return {"assignments": {}, "meta": {"backend": "none", "k": 0, "n": n,
                                            "reason": "too few items", "updated_at_ms": now}}
    if k is None:
        k = max(2, min(12, int(math.sqrt(n / 2))))

    matrix, backend = None, None
    # choose backend
    want = _BACKEND
    if want in ("auto", "embeddings"):
        try:
            matrix, backend, _dim = _embeddings_matrix(items)
        except Exception as exc:  # model missing / network / onnx issue
            matrix, backend = None, f"embeddings-failed:{exc.__class__.__name__}"
    if matrix is None and want in ("auto", "lexical"):
        try:
            matrix, backend, _dim = _lexical_matrix(items)
        except Exception:
            matrix, backend = None, None

    if matrix is None:
        return {"assignments": {}, "meta": {"backend": "none", "k": 0, "n": n,
                                            "reason": "no backend available", "updated_at_ms": now}}

    labels = _kmeans(matrix, k)
    label_for = _label_clusters(items, labels, k)

    assignments = {}
    sizes: Counter = Counter()
    for i, (obs_id, _body) in enumerate(items):
        cid = int(labels[i])
        assignments[obs_id] = {"cluster_id": f"c{cid+1}", "label": label_for.get(cid, f"cluster {cid+1}")}
        sizes[f"c{cid+1}"] += 1

    return {
        "assignments": assignments,
        "meta": {
            "backend": backend, "k": len(set(a["cluster_id"] for a in assignments.values())),
            "n": n, "sizes": dict(sizes), "updated_at_ms": now,
        },
    }
