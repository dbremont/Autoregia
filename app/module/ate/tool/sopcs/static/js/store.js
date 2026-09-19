/* ════════════════════════════════════════════════════════════
    SOPCS Store — data layer over ./api/*.
    Holds the catalog (metadata window), search results, tag
    facets and the self blob. Relative URLs: mounted at
    /ate/tool/sopcs/ or standalone alike.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};
SOPCS.Store = (() => {
  const API = '.';

  // catalog state — the views read it, the controls write it
  const state = { q: '', mode: 'auto', status: null, tag: null, sort: 'updated', page: 1, perPage: 12 };

  let _docs = { items: [], total: 0, page: 1, pages: 1, has_more: false };
  let _search = null;          // last search envelope (null = browsing catalog)
  let _tags = [], _self = null, _backend = null;

  async function _j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      let body = null;
      try { body = await r.json(); if (body && body.error) msg = body.error; } catch (e) { /* non-json */ }
      const err = new Error(msg);
      err.status = r.status;
      err.body = body;
      throw err;
    }
    return r.json();
  }
  const _get = (path, params) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')) : '';
    return _j(`${API}/${path}${qs}`);
  };
  const _send = (path, method, body) => _j(`${API}/${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  async function load() {
    const results = await Promise.allSettled([loadDocs(), loadTags(), loadSelf()]);
    results.forEach((r) => { if (r.status === 'rejected') console.error('sopcs: load failed', r.reason); });
  }

  async function loadDocs() {
    _docs = await _get('api/docs', {
      page: state.page, per_page: state.perPage, sort: state.sort,
      status: state.status || undefined, tag: state.tag || undefined,
    });
    return _docs;
  }
  async function loadTags() { _tags = await _get('api/tags'); return _tags; }
  async function loadSelf() {
    _self = await _get('api/self');
    if (_self && _self.embeddings) _backend = _self.embeddings.backend;
    return _self;
  }

  // search — throws {status:501} when mode=semantic is unavailable
  async function search(q, mode) {
    state.q = q != null ? q : state.q;
    state.mode = mode || state.mode;
    const res = await _get('api/search', {
      q: state.q, mode: state.mode, limit: 50,
      status: state.status || undefined, tag: state.tag || undefined,
    });
    _search = res;
    if (res.backend) _backend = res.backend;
    return res;
  }
  const clearSearch = () => { _search = null; state.q = ''; };

  const getDoc = (id) => _get(`api/docs/${encodeURIComponent(id)}`);
  const createDoc = (body) => _send('api/docs', 'POST', body);
  const updateDoc = (id, body) => _send(`api/docs/${encodeURIComponent(id)}`, 'PUT', body);
  const deleteDoc = (id) => _send(`api/docs/${encodeURIComponent(id)}`, 'DELETE');
  const reindex = () => _send('api/reindex', 'POST');

  // ── revision history ──
  const revisions = (id) => _get(`api/docs/${encodeURIComponent(id)}/revisions`);
  const revision = (id, seq) => _get(`api/docs/${encodeURIComponent(id)}/revisions/${seq}`);
  const revisionDiff = (id, seq, against) =>
    _get(`api/docs/${encodeURIComponent(id)}/revisions/${seq}/diff`,
         against ? { against } : undefined);
  const restore = (id, seq, comment) =>
    _send(`api/docs/${encodeURIComponent(id)}/restore`, 'POST', { seq, comment });

  // ── dashboard ──
  const overview = () => _get('api/overview');

  // ── semantic clusters (batch-computed topic map) ──
  const clusters = () => _get('api/clusters');
  const computeClusters = () => _send('api/clusters', 'POST');

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append('file', file, file.name || 'figure');
    return _j('api/images', { method: 'POST', body: fd });
  }

  // ── formatting helpers ──
  const esc = (s) => AUTOREGIA.esc(s);
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const readTime = (m) => (m == null ? '—' : (m + ' min read'));

  return {
    state, esc, fmtDate, readTime,
    load, loadDocs, loadTags, loadSelf, search, clearSearch,
    getDoc, createDoc, updateDoc, deleteDoc, reindex, uploadImage,
    revisions, revision, revisionDiff, restore, overview,
    clusters, computeClusters,
    docs: () => _docs, tags: () => _tags, self: () => _self,
    backend: () => _backend, searching: () => _search != null && state.q !== '',
  };
})();

// formatting helpers are namespace-level too — the views call SOPCS.esc etc.
SOPCS.esc = SOPCS.Store.esc;
SOPCS.fmtDate = SOPCS.Store.fmtDate;
SOPCS.readTime = SOPCS.Store.readTime;
