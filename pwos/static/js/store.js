/* ============================================================
   PWOS Store - Data Layer (localStorage + API)
   ============================================================ */
window.PW = window.PW || {};
PW.Store = (function () {
  let actions = [];
  let blocks = [];
  let stats = {};
  let listeners = [];

  function notify() { listeners.forEach(function (fn) { fn(); }); }

  async function load() {
    const sa = localStorage.getItem('pwos_actions');
    const sb = localStorage.getItem('pwos_blocks');
    if (sa) { try { actions = JSON.parse(sa); } catch { actions = []; } }
    if (sb) { try { blocks = JSON.parse(sb); } catch { blocks = []; } }
    if (!actions.length && !blocks.length) { await fetchFromAPI(); }
    await refreshStats();
    notify();
    return { actions: actions, blocks: blocks };
  }

  async function fetchFromAPI() {
    try {
      const [ra, rb] = await Promise.all([fetch('/pwos/api/actions'), fetch('/pwos/api/blocks')]);
      if (ra.ok) actions = await ra.json();
      if (rb.ok) blocks = await rb.json();
      saveLocal();
    } catch (e) { console.warn('API unavailable, using local storage only'); }
  }

  async function refreshFromAPI() {
    try {
      const [ra, rb] = await Promise.all([fetch('/pwos/api/actions'), fetch('/pwos/api/blocks')]);
      if (ra.ok) actions = await ra.json();
      if (rb.ok) blocks = await rb.json();
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
  }

  function getActions() { return [...actions]; }
  function getBlocks() { return [...blocks]; }
  function getStats() { return stats; }
  function getById(id) { return actions.find(function (a) { return a.id === id; }); }
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

  return { load, refreshFromAPI, refreshStats, getActions, getBlocks, getStats, getById, getPinned,
           addAction, updateAction, removeAction, togglePin, addBlock, removeBlock,
           subscribe, searchActions, genId };
})();
