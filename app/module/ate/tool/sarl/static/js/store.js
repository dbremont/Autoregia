/* ════════════════════════════════════════════════════════════
    SARL Store — data layer over ./api/*.
   Holds the task journal, glossaries, the phrase catalog, and
   settings; owns the click→filter bus into Tasks and its paging.
   Relative URLs: mounted at /ate/tool/sarl/ or standalone alike.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Store = (() => {
  const API = '.';

  let _tasks = [], _glossaries = [], _phrases = [], _settings = null, _env = {};
  // tasks filter state — the click→filter bus reads and writes this
  const state = { state: null, language: null, q: '' };
  const PAGE_SIZE = 25;
  let _offset = 0, _paging = { has_more: false, page: 1, total: 0 };
  let _tasksPage = [];

  async function _j(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { const e = await r.json(); if (e.error) msg = e.error; } catch (e) {}
      throw new Error(msg);
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
    // resilient boot: one failing fetch must never leave the store half-empty
    const results = await Promise.allSettled([loadTasks(), loadGlossaries(), loadPhrases(), loadSettings()]);
    results.forEach((r) => { if (r.status === 'rejected') console.error('sarl: load failed', r.reason); });
  }

  // ── task journal (server-filtered, offset-paged) ──
  async function loadTasks() {
    const rows = await _get('api/tasks', {
      state: state.state || undefined,
      language: state.language || undefined,
      q: state.q || undefined,
      offset: _offset, limit: PAGE_SIZE + 1,
    });
    const has_more = rows.length > PAGE_SIZE;
    _tasksPage = rows.slice(0, PAGE_SIZE);
    _paging = { has_more, page: Math.floor(_offset / PAGE_SIZE) + 1,
                total: _offset + _tasksPage.length + (has_more ? 1 : 0) };
    return _tasksPage;
  }
  const tasksPage = () => _tasksPage;

  async function loadGlossaries() { _glossaries = await _get('api/glossaries'); return _glossaries; }
  async function loadPhrases() { _phrases = await _get('api/phrases'); return _phrases; }
  async function loadSettings() {
    const res = await _get('api/settings');
    _settings = res.settings; _env = res.environment || {};
    return res;
  }

  async function task_(id) { return _get(`api/tasks/${id}`); }
  async function audit(params) { return _get('api/audit', params); }
  async function selfBlob() { return _get('api/self'); }
  async function overview() { return _get('api/overview'); }
  async function rules() { return _get('api/rules'); }

  // ── mutations (views catch and toast) ──
  const createTask = (body) => _send('api/tasks', 'POST', body);
  const reviewTask = (id) => _send(`api/tasks/${id}/review`, 'POST', {});
  const setDisposition = (id, finding_id, disposition) =>
    _send(`api/tasks/${id}/disposition`, 'POST', { finding_id, disposition });
  const applyTask = (id) => _send(`api/tasks/${id}/apply`, 'POST', {});
  const discardTask = (id) => _send(`api/tasks/${id}/discard`, 'POST', {});
  const clearTasks = () => _send('api/tasks', 'DELETE');
  const saveSettings = (body) => _send('api/settings', 'PUT', body);
  const createGlossary = (body) => _send('api/glossaries', 'POST', body);
  const updateGlossary = (id, body) => _send(`api/glossaries/${id}`, 'PUT', body);
  const deleteGlossary = (id) => _send(`api/glossaries/${id}`, 'DELETE');
  const createPhrases = (body) => _send('api/phrases', 'POST', body);
  const updatePhrases = (id, body) => _send(`api/phrases/${id}`, 'PUT', body);
  const deletePhrases = (id) => _send(`api/phrases/${id}`, 'DELETE');

  // ── filter bus ──
  function applyFilter(patch) {
    Object.assign(state, patch);
    _offset = 0;
    return loadTasks();
  }
  function resetFilter() { Object.assign(state, { state: null, language: null, q: '' }); }
  function filterSummary() {
    const parts = [];
    if (state.state) parts.push(state.state);
    if (state.language) parts.push(state.language);
    if (state.q) parts.push('“' + state.q + '”');
    return parts.join(' · ');
  }
  async function nextPage() { _offset += PAGE_SIZE; return loadTasks(); }
  async function prevPage() { _offset = Math.max(0, _offset - PAGE_SIZE); return loadTasks(); }
  function getPaging() { return Object.assign({ offset: _offset }, _paging); }

  const glossaries = () => _glossaries;
  const phrases = () => _phrases;
  const settings = () => _settings;
  const env = () => _env;
  const glossaryById = (id) => _glossaries.find(g => g.id === id);

  function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
  function fmtTime(iso) { return iso ? iso.replace('T', ' ').slice(0, 16) : ''; }
  function fmtDur(ms) {
    if (ms == null) return '—';
    if (ms < 1000) return ms + 'ms';
    const s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  }

  return {
    load, loadTasks, tasksPage, loadGlossaries, loadPhrases, loadSettings,
    task_, audit, selfBlob, overview, rules,
    createTask, reviewTask, setDisposition, applyTask, discardTask, clearTasks, saveSettings,
    createGlossary, updateGlossary, deleteGlossary,
    createPhrases, updatePhrases, deletePhrases,
    applyFilter, resetFilter, filterSummary, getState: () => state,
    nextPage, prevPage, getPaging,
    glossaries, phrases, settings, env, glossaryById,
    esc, fmtTime, fmtDur,
  };
})();

// formatting helpers are namespace-level too — the views call SARL.esc etc.
SARL.esc = SARL.Store.esc;
SARL.fmtTime = SARL.Store.fmtTime;
SARL.fmtDur = SARL.Store.fmtDur;
