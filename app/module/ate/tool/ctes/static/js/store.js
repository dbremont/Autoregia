/* ════════════════════════════════════════════════════════════
   CTES Store — data layer over ./api/*.
   Holds the register (handles), task specs, settings, and the run
   stream; owns the click→filter bus into Runs and its paging.
   Relative URLs: mounted at /ate/tool/ctes/ or standalone alike.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Store = (() => {
  const API = '.';

  let _handles = [], _specs = [], _settings = null, _env = {};
  // runs filter state — the click→filter bus reads and writes this
  const state = { handle: null, status: null, q: '' };
  const PAGE_SIZE = 25;
  let _offset = 0, _paging = { has_more: false, page: 1, total: 0 };
  // window presets (hours); 0 = All
  const WINDOWS = [{ h: 24, label: '24h' }, { h: 168, label: '7d' }, { h: 720, label: '30d' }, { h: 0, label: 'All' }];
  let _windowH = 168;

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
    const results = await Promise.allSettled([loadHandles(), loadSettings(), loadSpecs()]);
    results.forEach((r, i) => { if (r.status === 'rejected') console.error('ctes: load failed', r.reason); });
  }

  async function loadHandles() { _handles = await _get('api/handles'); return _handles; }
  async function loadSpecs() { _specs = await _get('api/tasks'); return _specs; }
  async function loadSettings() {
    const res = await _get('api/settings');
    _settings = res.settings; _env = res.environment || {};
    return res;
  }

  // ── runs stream (server-filtered, offset-paged) ──
  async function loadRuns() {
    const since = _windowH ? (Date.now() - _windowH * 3600000) : null;
    const rows = await _get('api/runs', {
      handle_id: state.handle || undefined,
      status: state.status || undefined,
      q: state.q || undefined,
      since_ms: since || undefined,
      offset: _offset, limit: PAGE_SIZE + 1,
    });
    const has_more = rows.length > PAGE_SIZE;
    _runsPage = rows.slice(0, PAGE_SIZE);
    _paging = { has_more, page: Math.floor(_offset / PAGE_SIZE) + 1, total: _offset + _runsPage.length + (has_more ? 1 : 0) };
    return _runsPage;
  }
  let _runsPage = [];
  const runsPage = () => _runsPage;

  async function run_(id) { return _get(`api/runs/${id}`); }
  async function audit(params) { return _get('api/audit', params); }
  async function selfBlob() { return _get('api/self'); }

  // ── mutations (views catch and toast) ──
  const registerHandle = (body) => _send('api/handles', 'POST', body);
  const updateHandle = (id, body) => _send(`api/handles/${id}`, 'PUT', body);
  const setHandleStatus = (id, status) => _send(`api/handles/${id}/status`, 'POST', { status });
  const deleteHandle = (id) => _send(`api/handles/${id}`, 'DELETE');
  const scanPackages = () => _send('api/handles/scan', 'POST');
  const handleFile = (id, path) => _get(`api/handles/${id}/files/${path}`);
  const handleRuns = (id) => _get(`api/handles/${id}/runs`);
  const handleDetail = (id) => _get(`api/handles/${id}`);
  const createSpec = (body) => _send('api/tasks', 'POST', body);
  const updateSpec = (id, body) => _send(`api/tasks/${id}`, 'PUT', body);
  const deleteSpec = (id) => _send(`api/tasks/${id}`, 'DELETE');
  const emitSpec = (id, body) => _send(`api/tasks/${id}/emit`, 'POST', body || {});
  const runHandle = (body) => _send('api/runs', 'POST', body);
  const saveSettings = (body) => _send('api/settings', 'PUT', body);
  const clearRuns = () => _send('api/runs', 'DELETE');

  // ── filter bus ──
  function applyFilter(patch) {
    Object.assign(state, patch);
    _offset = 0;
    return loadRuns();
  }
  function resetFilter() { Object.assign(state, { handle: null, status: null, q: '' }); }
  function filterSummary() {
    const parts = [];
    if (state.handle) parts.push(state.handle);
    if (state.status) parts.push(state.status);
    if (state.q) parts.push('“' + state.q + '”');
    if (_windowH) parts.push('window ' + (_windowH >= 24 ? (_windowH / 24) + 'd' : _windowH + 'h'));
    return parts.join(' · ');
  }

  function getWindow() { return _windowH; }
  function setWindow(h) { _windowH = h; }
  async function nextPage() { _offset += PAGE_SIZE; return loadRuns(); }
  async function prevPage() { _offset = Math.max(0, _offset - PAGE_SIZE); return loadRuns(); }
  function getPaging() { return Object.assign({ offset: _offset }, _paging); }

  const handles = () => _handles;
  const specs = () => _specs;
  const settings = () => _settings;
  const env = () => _env;
  const handleById = (id) => _handles.find(h => h.id === id);

  function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
  function fmtTime(iso) { return iso ? iso.replace('T', ' ').slice(0, 16) : ''; }
  function fmtDur(ms) {
    if (ms == null) return '—';
    if (ms < 1000) return ms + 'ms';
    const s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  }
  function fmtBytes(n) {
    if (n == null) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  return {
    load, loadHandles, loadSpecs, loadSettings, loadRuns, runsPage,
    run_, audit, selfBlob,
    registerHandle, updateHandle, setHandleStatus, deleteHandle, scanPackages,
    handleFile, handleRuns, handleDetail,
    createSpec, updateSpec, deleteSpec, emitSpec, runHandle, saveSettings, clearRuns,
    applyFilter, resetFilter, filterSummary, getState: () => state,
    getWindow, setWindow, WINDOWS: () => WINDOWS,
    nextPage, prevPage, getPaging,
    handles, specs, settings, env, handleById,
    esc, fmtTime, fmtDur, fmtBytes,
  };
})();
