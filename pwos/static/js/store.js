/* ============================================================
   PWOS Store - Data Layer (localStorage + API)
   ============================================================ */
window.PW = window.PW || {};
PW.Store = (function () {
  let actions = [];
  let blocks = [];
  let sessions = [];
  let stats = {};
  let listeners = [];

  function notify() { listeners.forEach(function (fn) { fn(); }); }

  async function load() {
    const sa = localStorage.getItem('pwos_actions');
    const sb = localStorage.getItem('pwos_blocks');
    const ss = localStorage.getItem('pwos_sessions');
    if (sa) { try { actions = JSON.parse(sa); } catch { actions = []; } }
    if (sb) { try { blocks = JSON.parse(sb); } catch { blocks = []; } }
    if (ss) { try { sessions = JSON.parse(ss); } catch { sessions = []; } }
    if (!actions.length && !blocks.length && !sessions.length) { await fetchFromAPI(); }
    await refreshStats();
    notify();
    return { actions: actions, blocks: blocks, sessions: sessions };
  }

  async function fetchFromAPI() {
    try {
      const [ra, rb, rs] = await Promise.all([fetch('/pwos/api/actions'), fetch('/pwos/api/blocks'), fetch('/pwos/api/sessions')]);
      if (ra.ok) actions = await ra.json();
      if (rb.ok) blocks = await rb.json();
      if (rs.ok) sessions = await rs.json();
      saveLocal();
    } catch (e) { console.warn('API unavailable, using local storage only'); }
  }

  async function refreshFromAPI() {
    try {
      const [ra, rb, rs] = await Promise.all([fetch('/pwos/api/actions'), fetch('/pwos/api/blocks'), fetch('/pwos/api/sessions')]);
      if (ra.ok) actions = await ra.json();
      if (rb.ok) blocks = await rb.json();
      if (rs.ok) sessions = await rs.json();
      saveLocal(); await refreshStats(); notify();
    } catch (e) { /* keep local */ }
  }

  async function refreshStats() {
    try {
      const res = await fetch('/pwos/api/dashboard/stats');
      if (res.ok) stats = await res.json();
    } catch (e) { /* ignore */ }
  }

  function saveLocal() {
    localStorage.setItem('pwos_actions', JSON.stringify(actions));
    localStorage.setItem('pwos_blocks', JSON.stringify(blocks));
    localStorage.setItem('pwos_sessions', JSON.stringify(sessions));
  }

  function getActions() { return [...actions]; }
  function getBlocks() { return [...blocks]; }
  function getSessions() { return [...sessions]; }
  function getStats() { return stats; }
  function getById(id) { return actions.find(function (a) { return a.id === id; }); }
  function getSessionById(id) { return sessions.find(function (s) { return s.id === id; }); }
  function getActiveSession() { return sessions.find(function (s) { return s.status === 'active'; }) || null; }
  function getPinned() { return actions.filter(function (a) { return a.pinned; }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  async function addAction(data) {
    try {
      const res = await fetch('/pwos/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const now = new Date().toISOString();
      const a = Object.assign({ id: genId('ACT'), record_id: genId('REC'), kind: 'Task',
        scheduling_state: 'unscheduled', dependencies: [], external_mappings: [],
        pinned: false, strategic: {}, annotations: [], created_at: now, updated_at: now }, data);
      actions.unshift(a); saveLocal(); await refreshStats(); notify();
    }
  }

  async function updateAction(id, updates) {
    try {
      const res = await fetch('/pwos/api/actions/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const idx = actions.findIndex(function (a) { return a.id === id; });
      if (idx === -1) return;
      actions[idx] = Object.assign({}, actions[idx], updates, { updated_at: new Date().toISOString() });
      saveLocal(); notify();
    }
  }

  async function removeAction(id) {
    try { await fetch('/pwos/api/actions/' + id, { method: 'DELETE' }); await refreshFromAPI(); }
    catch (e) { actions = actions.filter(function (a) { return a.id !== id; }); saveLocal(); notify(); }
  }

  async function togglePin(id) {
    try { await fetch('/pwos/api/actions/' + id + '/pin', { method: 'POST' }); await refreshFromAPI(); }
    catch (e) {
      const a = getById(id); if (!a) return;
      a.pinned = !a.pinned; a.updated_at = new Date().toISOString(); saveLocal(); notify();
    }
  }

  async function addBlock(data) {
    try {
      const res = await fetch('/pwos/api/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const b = await res.json();
      if (b.conflict_flags && b.conflict_flags.length) PW.toast(b.conflict_flags.length + ' conflict(s) detected on this block');
      await refreshFromAPI();
      return b;
    } catch (e) { return null; }
  }

  async function removeBlock(id) {
    try { await fetch('/pwos/api/blocks/' + id, { method: 'DELETE' }); await refreshFromAPI(); }
    catch (e) { blocks = blocks.filter(function (b) { return b.id !== id; }); saveLocal(); notify(); }
  }

  /* ── Work Sessions (Component D — Execution & Actuals) ─────── */
  async function startSession(payload) {
    try {
      const res = await fetch('/pwos/api/sessions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const s = await res.json(); await refreshFromAPI(); return s;
    } catch (e) {
      const now = new Date().toISOString();
      const a = payload.action_id ? getById(payload.action_id) : null;
      const s = { id: genId('SES'), action_id: payload.action_id || null, block_id: payload.block_id || null,
        description: payload.description || '', started_at: now, ended_at: null, status: 'active',
        capacity: (a || {}).capacity_profile || null, source: 'timer', created_at: now, updated_at: now };
      sessions.unshift(s); saveLocal(); notify(); return s;
    }
  }

  async function stopSession(description) {
    try {
      const res = await fetch('/pwos/api/sessions/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: description || '' }) });
      const s = await res.json(); await refreshFromAPI(); return s;
    } catch (e) {
      const s = getActiveSession(); if (!s) return null;
      s.ended_at = new Date().toISOString(); s.status = 'completed'; s.updated_at = s.ended_at;
      saveLocal(); notify(); return s;
    }
  }

  async function addSession(data) {
    try {
      const res = await fetch('/pwos/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const now = new Date().toISOString();
      const s = Object.assign({ id: genId('SES'), action_id: null, block_id: null, description: '',
        started_at: now, ended_at: now, status: 'completed', capacity: null, source: 'manual',
        created_at: now, updated_at: now }, data);
      sessions.unshift(s); saveLocal(); notify();
    }
  }

  async function updateSession(id, updates) {
    try {
      await fetch('/pwos/api/sessions/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      await refreshFromAPI();
    } catch (e) {
      const idx = sessions.findIndex(function (s) { return s.id === id; });
      if (idx === -1) return;
      sessions[idx] = Object.assign({}, sessions[idx], updates, { updated_at: new Date().toISOString() });
      saveLocal(); notify();
    }
  }

  async function removeSession(id) {
    try { await fetch('/pwos/api/sessions/' + id, { method: 'DELETE' }); await refreshFromAPI(); }
    catch (e) { sessions = sessions.filter(function (s) { return s.id !== id; }); saveLocal(); notify(); }
  }

  function genId(prefix) {
    return prefix + '-2026-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  function searchActions(query) {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter(function (a) {
      const hay = [a.id, a.record_id, a.kind, (a.strategic || {}).project || '',
                   (a.strategic || {}).objective || ''].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  return { load, refreshFromAPI, refreshStats, getActions, getBlocks, getSessions, getStats,
           getById, getSessionById, getActiveSession, getPinned,
           addAction, updateAction, removeAction, togglePin, addBlock, removeBlock,
           startSession, stopSession, addSession, updateSession, removeSession,
           subscribe, searchActions, genId };
})();
