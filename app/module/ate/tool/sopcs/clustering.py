"""SOPCS semantic clustering.

Groups the catalog's SOPs into semantic clusters and projects them to a
2-D map for the dashboard's topic graph. Two backends, auto-detected
(the ``WOS_CLUSTER_BACKEND`` convention, override via
``SOPCS_CLUSTER_BACKEND``):

* **embeddings** (primary) — cosine space of the *stored* embedding
  side-docs (no model call at cluster time; the vectors exist once
  fastembed has indexed the catalog).
* **lexical** (fallback) — TF-IDF vectors over the corpus vocabulary.

Both need numpy; without it :func:`compute` reports a graceful
``backend: "none"`` meta instead of raising. Spherical k-means +
deterministic 2-D PCA mirror ``wos/clustering.py``; edges are per-node
k-nearest-neighbour cosine links so the map reads as a similarity graph.
"""
from __future__ import annotations

import math
import os
import re
from collections import Counter

_BACKEND = os.environ.get("SOPCS_CLUSTER_BACKEND", "auto").lower()

STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "are", "was", "were",
    "have", "has", "had", "not", "but", "its", "into", "onto", "over", "under",
    "when", "then", "than", "them", "they", "their", "there", "these", "those",
    "what", "which", "how", "why", "where", "will", "would", "can", "could",
    "should", "shall", "may", "might", "must", "does", "did", "done", "being",
    "been", "because", "while", "about", "after", "before", "between", "during",
    "each", "other", "some", "such", "only", "also", "very", "just", "more",
    "most", "many", "much", "per", "via", "use", "used", "using", "make",
    "made", "set", "run", "step", "steps", "sop", "procedure", "procedures",
}


def tokenize(text):
    return [t for t in re.findall(r"[a-z0-9]{3,}", (text or "").lower())
            if t not in STOPWORDS]


def _kmeans(X, k, iters=30, seed=7):
    """Spherical k-means (vectors L2-normalized) — the wos/clustering core."""
    import numpy as np
    n = X.shape[0]
    if n <= k:
        return np.arange(n) % max(1, k)
    rng = np.random.default_rng(seed)
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


def _embeddings_matrix(vectors_by_id):
    import numpy as np
    ids = sorted(vectors_by_id)
    X = np.asarray([vectors_by_id[i] for i in ids], dtype=np.float32)
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return ids, X / norms, "embeddings"


def _lexical_matrix(docs):
    """TF-IDF over the top filtered vocabulary (the wos fallback)."""
    import numpy as np
    n = len(docs)
    df = Counter()
    tokenized = []
    for _id, text in docs:
        toks = set(tokenize(text))
        tokenized.append(toks)
        for t in toks:
            df[t] += 1
    vocab = [t for t, c in df.most_common(700) if 2 <= c < n * 0.7]
    vidx = {t: i for i, t in enumerate(vocab)}
    M = np.zeros((n, len(vocab)), dtype=np.float32)
    for i, toks in enumerate(tokenized):
        tf = Counter(t for t in toks if t in vidx)
        for t, c in tf.items():
            idf = math.log((n + 1) / (df[t] + 1)) + 1.0
            M[i, vidx[t]] = c * idf
    norms = np.linalg.norm(M, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return [d[0] for d in docs], M / norms, "lexical"


def _pca_project(matrix, seed=7):
    """Deterministic 2-D PCA (t-SNE substitute) → per-row [x, y] in [-1, 1]."""
    import numpy as np
    X = np.asarray(matrix, dtype=np.float64)
    X = X - X.mean(axis=0, keepdims=True)
    cov = (X.T @ X) / max(1, len(X) - 1)
    vals, vecs = np.linalg.eigh(cov)
    top = vecs[:, np.argsort(vals)[::-1][:2]]
    P = X @ top
    span = np.ptp(P, axis=0)
    span[span == 0] = 1.0
    P = (P - P.min(axis=0)) / span * 2 - 1
    return [[round(float(x), 4), round(float(y), 4)] for x, y in P]


def _labels_for(docs_by_id, ids, labels, k):
    """Top discriminative tokens per cluster → short human labels.

    Tokens that appear in most documents are skipped (they cannot
    distinguish anything), mirroring the vocabulary filter."""
    n = len(ids)
    df = Counter()
    tokenized = {sid: set(tokenize(
        (docs_by_id[sid].get("title") or "") + " " + (docs_by_id[sid].get("body") or "")))
        for sid in ids}
    for toks in tokenized.values():
        for t in toks:
            df[t] += 1
    common = {t for t, c in df.items() if c >= max(2, n * 0.7)}
    out = {}
    for j in range(k):
        c = Counter()
        for i, sid in enumerate(ids):
            if labels[i] == j:
                for t in tokenized[sid]:
                    if t not in common:
                        c[t] += 1
        out[j] = ", ".join(t for t, _ in c.most_common(3)) or f"cluster {j + 1}"
    return out


def _knn_edges(ids, matrix, k_nn=2, min_sim=0.2):
    """Per-node nearest-neighbour similarity links (deduplicated pairs)."""
    import numpy as np
    sims = matrix @ matrix.T
    n = len(ids)
    pairs = set()
    edges = []
    for i in range(n):
        order = np.argsort(-sims[i])
        added = 0
        for j in order:
            if j == i or added >= k_nn:
                break
            if float(sims[i][j]) < min_sim:
                break
            key = (min(i, int(j)), max(i, int(j)))
            if key in pairs:
                added += 1
                continue
            pairs.add(key)
            edges.append({"source": ids[key[0]], "target": ids[key[1]],
                          "value": round(float(sims[i][j]), 3)})
            added += 1
    return edges


def _none_meta(reason, n):
    return {"assignments": {}, "edges": [],
            "meta": {"backend": "none", "reason": reason, "n": n}}


def compute(sops, embeddings):
    """Cluster the catalog.

    ``sops`` — SOP documents (id/title/summary/tags/body/words);
    ``embeddings`` — {sop_id: vector} from the stored side-docs.
    Returns ``{assignments, edges, meta}``; ``assignments`` maps
    sop_id → {cluster, label, x, y} (x/y in [-1, 1]).
    """
    n = len(sops)
    if n < 3:
        return _none_meta("too few sops to cluster (need 3+)", n)

    k = max(2, min(8, int(math.sqrt(n / 2))))
    ids, matrix, backend = None, None, None
    note = None

    if _BACKEND in ("auto", "embeddings") and embeddings:
        docs_by_id = {d["id"]: d for d in sops}
        usable = {sid: v for sid, v in embeddings.items() if sid in docs_by_id}
        if len(usable) >= 3:
            try:
                ids, matrix, backend = _embeddings_matrix(usable)
            except ImportError:
                note = "no clustering backend — install numpy (lexical) or fastembed (semantic)"
            except Exception as exc:
                note = f"embeddings-failed:{type(exc).__name__}"
    if matrix is None and _BACKEND in ("auto", "lexical"):
        try:
            ids, matrix, backend = _lexical_matrix([
                (d["id"], (d.get("title") or "") + " " + (d.get("summary") or "") + " "
                 + " ".join(d.get("tags") or []) + " " + (d.get("body") or ""))
                for d in sops])
        except ImportError:
            note = "no clustering backend — install numpy (lexical) or fastembed (semantic)"
        except Exception as exc:
            note = f"lexical-failed:{type(exc).__name__}"

    if matrix is None:
        reason = note or "no clustering backend — install numpy (lexical) or fastembed (semantic)"
        return _none_meta(reason, n)

    labels = _kmeans(matrix, k)
    k_eff = len(set(int(l) for l in labels))
    docs_by_id = {d["id"]: d for d in sops}
    label_for = _labels_for(docs_by_id, ids, labels, k)
    proj = _pca_project(matrix)

    assignments = {}
    sizes = Counter()
    for i, sid in enumerate(ids):
        cid = int(labels[i])
        assignments[sid] = {
            "cluster": f"c{cid + 1}",
            "label": label_for.get(cid, f"cluster {cid + 1}"),
            "x": proj[i][0], "y": proj[i][1],
            "title": docs_by_id[sid].get("title") or sid,
            "words": docs_by_id[sid].get("words") or 0,
        }
        sizes[f"c{cid + 1}"] += 1

    return {
        "assignments": assignments,
        "edges": _knn_edges(ids, matrix),
        "meta": {"backend": backend, "k": k_eff, "n": n, "sizes": dict(sizes),
                 "note": note},
    }
