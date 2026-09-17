/* ════════════════════════════════════════════════════════════
   AIAS Store — Data layer (localStorage cache + API)
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};
AI.Store = (() => {
  const KEY = 'aias_intents';
  let intents = [];
  let listeners = [];
  let taxonomy = { sources: [], priorities: [], statuses: [], confidences: [] };

  function notify() { listeners.forEach(fn => fn(intents)); }

  // Honest sync state (ui.spec §2 "Transparent system state")
  let sync = { online: null, lastError: null };
  function setSync(online, err) {
    if (sync.online === online && sync.lastError === (err || null)) return;
    sync = { online, lastError: err || null };
  }
  AI.Store_syncState = () => ({ ...sync });

  async function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) { try { intents = JSON.parse(stored); } catch { intents = []; } }
    await refreshFromAPI();
    try {
      const r = await fetch('/aias/api/taxonomy');
      if (r.ok) taxonomy = await r.json();
    } catch (e) { /* keep defaults */ }
    notify();
    return intents;
  }

  async function refreshFromAPI() {
    try {
      const res = await fetch('/aias/api/intents');
      if (res.ok) { intents = await res.json(); saveLocal(); setSync(true); }
      else setSync(false, 'HTTP ' + res.status);
    } catch (e) { setSync(false, 'offline'); }
  }

  function saveLocal() { localStorage.setItem(KEY, JSON.stringify(intents)); }
  function getAll() { return [...intents]; }
  function getById(id) { return intents.find(i => i.id === id); }
  function getTaxonomy() { return taxonomy; }

  async function add(data) {
    try {
      const res = await fetch('/aias/api/intents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const saved = await res.json(); await refreshFromAPI();
      return { ...saved, _persisted: true };
    } catch (e) {
      setSync(false, e.message);
      const intent = {
        ...data, id: data.id || generateId(),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        notes: data.notes || []
      };
      intents.unshift(intent); saveLocal(); notify();
      return { ...intent, _persisted: false };
    }
  }

  async function update(id, updates) {
    try {
      const res = await fetch(`/aias/api/intents/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const saved = await res.json(); await refreshFromAPI();
      return { ...saved, _persisted: true };
    } catch (e) {
      setSync(false, e.message);
      const idx = intents.findIndex(i => i.id === id);
      if (idx === -1) return null;
      intents[idx] = { ...intents[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocal(); notify();
      return { ...intents[idx], _persisted: false };
    }
  }

  async function remove(id) {
    try {
      const res = await fetch(`/aias/api/intents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await refreshFromAPI();
      return { _persisted: true };
    } catch (e) {
      setSync(false, e.message);
      intents = intents.filter(i => i.id !== id); saveLocal(); notify();
      return { _persisted: false };
    }
  }

  async function addNote(id, note) {
    try {
      const res = await fetch(`/aias/api/intents/${id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const saved = await res.json(); await refreshFromAPI();
      return { ...saved, _persisted: true };
    } catch (e) {
      setSync(false, e.message);
      const it = getById(id); if (!it) return;
      if (!it.notes) it.notes = [];
      const n = { ...note, id: 'n-' + Math.random().toString(36).substr(2, 6),
        at: new Date().toISOString() };
      it.notes.push(n); it.updated_at = n.at; saveLocal(); notify();
      return n;
    }
  }

  function generateId() {
    return `INT-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  function getStats() {
    const ACTIVE = ['Selected', 'Committed', 'In Progress'];
    const TRIAGE = ['Generated', 'Evaluated'];
    const MON = ['Paused', 'Needs Review', 'Deferred', 'Blocked'];
    const RETRO = ['Completed', 'Cancelled', 'Superseded', 'Merged'];
    const inSet = s => intents.filter(i => i.status === s);
    const active = intents.filter(i => ACTIVE.includes(i.status));
    return {
      total: intents.length,
      active: active.length,
      triage: intents.filter(i => TRIAGE.includes(i.status)).length,
      monitoring: intents.filter(i => MON.includes(i.status)).length,
      retrospective: intents.filter(i => RETRO.includes(i.status)).length,
      critical_active: active.filter(i => i.priority === 'Critical').length,
      high_active: active.filter(i => i.priority === 'High').length,
      with_deadline: active.filter(i => i.deadline).length,
      with_notes: intents.filter(i => i.notes && i.notes.length).length,
      by_status: groupBy(intents, 'status'),
      by_source: groupBy(intents, 'source'),
      by_priority: groupBy(intents, 'priority')
    };
  }

  function groupBy(arr, key) {
    const m = {}; arr.forEach(i => { const k = i[key] || 'Unknown'; m[k] = (m[k] || 0) + 1; }); return m;
  }

  function search(query) {
    if (!query) return intents;
    const q = query.toLowerCase();
    const score = (i) => {
      let s = 0;
      if ((i.description || '').toLowerCase().includes(q)) s += 10;
      if ((i.expected_value || '').toLowerCase().includes(q)) s += 5;
      if ((i.id || '').toLowerCase().includes(q)) s += 8;
      if ((i.source || '').toLowerCase().includes(q)) s += 3;
      if ((i.notes || []).some(n => (n.text || '').toLowerCase().includes(q))) s += 4;
      if ((i.dependencies || []).some(d => String(d).toLowerCase().includes(q))) s += 4;
      return s;
    };
    return intents.map(i => { const s = score(i); return s > 0 ? { ...i, _sc: s } : null; })
      .filter(Boolean).sort((a, b) => b._sc - a._sc);
  }

  function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; }

  return { load, refreshFromAPI, getAll, getById, add, update, remove, addNote,
           subscribe, getStats, getTaxonomy, search, generateId };
})();
