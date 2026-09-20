/* ════════════════════════════════════════════════════════════
    GCAL Store — data layer over ./api/*.
   Holds the connector registry, the connections, settings, and
   the execution stream; owns the click→filter bus into
   Executions and its paging. Relative URLs: mounted at
   /ate/tool/gcal/ or standalone alike.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Store = (() => {
  const API = '.';

  let _registry = [], _connections = [], _settings = null, _env = {};
  // executions filter state — the click→filter bus reads and writes this
  const state = { connection: null, status: null, q: '' };
  const PAGE_SIZE = 25;
  let _offset = 0, _paging = { has_more: false, page: 1, total: 0 };
  let _execPage = [];

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
    const results = await Promise.allSettled([loadRegistry(), loadConnections(), loadSettings(), loadExecutions()]);
    results.forEach((r) => { if (r.status === 'rejected') console.error('gcal: load failed', r.reason); });
  }

  async function loadRegistry() { _registry = await _get('api/connectors'); return _registry; }
  async function loadConnections() { _connections = await _get('api/connections'); return _connections; }
  async function loadSettings() {
    const res = await _get('api/settings');
    _settings = res.settings; _env = res.environment || {};
    return res;
  }

  // ── execution stream (server-filtered, offset-paged) ──
  async function loadExecutions() {
    const rows = await _get('api/executions', {
      connection_id: state.connection || undefined,
      status: state.status || undefined,
      q: state.q || undefined,
      offset: _offset, limit: PAGE_SIZE + 1,
    });
    const has_more = rows.length > PAGE_SIZE;
    _execPage = rows.slice(0, PAGE_SIZE);
    _paging = { has_more, page: Math.floor(_offset / PAGE_SIZE) + 1,
                total: _offset + _execPage.length + (has_more ? 1 : 0) };
    return _execPage;
  }
  const execPage = () => _execPage;

  async function connection_(id) { return _get(`api/connections/${id}`); }
  async function execution_(id) { return _get(`api/executions/${id}`); }
  async function audit(params) { return _get('api/audit', params); }
  async function selfBlob() { return _get('api/self'); }
  async function overview() { return _get('api/overview'); }

  // ── mutations (views catch and toast) ──
  const createConnection = (body) => _send('api/connections', 'POST', body);
  const deleteConnection = (id) => _send(`api/connections/${id}`, 'DELETE');
  const testConnection = (id) => _send(`api/connections/${id}/test`, 'POST', {});
  const disconnectConnection = (id) => _send(`api/connections/${id}/disconnect`, 'POST', {});
  const executeAction = (body) => _send('api/execute', 'POST', body);
  const clearExecutions = () => _send('api/executions', 'DELETE');
  const saveSettings = (body) => _send('api/settings', 'PUT', body);

  // ── filter bus ──
  function applyFilter(patch) {
    Object.assign(state, patch);
    _offset = 0;
    return loadExecutions();
  }
  function resetFilter() { Object.assign(state, { connection: null, status: null, q: '' }); }
  function filterSummary() {
    const parts = [];
    if (state.connection) parts.push(state.connection);
    if (state.status) parts.push(state.status);
    if (state.q) parts.push('“' + state.q + '”');
    return parts.join(' · ');
  }
  async function nextPage() { _offset += PAGE_SIZE; return loadExecutions(); }
  async function prevPage() { _offset = Math.max(0, _offset - PAGE_SIZE); return loadExecutions(); }
  function getPaging() { return Object.assign({ offset: _offset }, _paging); }

  const registry = () => _registry;
  const connections = () => _connections;
  const settings = () => _settings;
  const env = () => _env;
  const connectorById = (id) => _registry.find(c => c.id === id);
  const connectionById = (id) => _connections.find(c => c.id === id);

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
    load, loadRegistry, loadConnections, loadSettings, loadExecutions, execPage,
    connection_, execution_, audit, selfBlob, overview,
    createConnection, deleteConnection, testConnection, disconnectConnection,
    executeAction, clearExecutions, saveSettings,
    applyFilter, resetFilter, filterSummary, getState: () => state,
    nextPage, prevPage, getPaging,
    registry, connections, settings, env, connectorById, connectionById,
    esc, fmtTime, fmtDur,
  };
})();

// formatting helpers are namespace-level too — the views call GCAL.esc etc.
GCAL.esc = GCAL.Store.esc;
GCAL.fmtTime = GCAL.Store.fmtTime;
GCAL.fmtDur = GCAL.Store.fmtDur;
