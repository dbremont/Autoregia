/* ════════════════════════════════════════════════════════════
   PTOCS Store — Data Layer (localStorage + API)
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};
PT.Store = (() => {
  const KEY = 'ptocs_entries';
  let entries = [];
  let listeners = [];

  function notify() { listeners.forEach(fn => fn(entries)); }

  async function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) { try { entries = JSON.parse(stored); } catch { entries = []; } }
    if (!entries || entries.length === 0) { await fetchFromAPI(); }
    notify();
    return entries;
  }

  async function fetchFromAPI() {
    try {
      const res = await fetch('/api/entries');
      if (res.ok) { entries = await res.json(); saveLocal(); }
    } catch (e) { console.warn('API unavailable, using local storage only'); }
  }

  async function refreshFromAPI() {
    try {
      const res = await fetch('/api/entries');
      if (res.ok) { entries = await res.json(); saveLocal(); notify(); }
    } catch (e) { /* keep local */ }
  }

  function saveLocal() { localStorage.setItem(KEY, JSON.stringify(entries)); }
  function getAll() { return [...entries]; }
  function getById(id) { return entries.find(e => e.id === id); }

  async function add(data) {
    try {
      const res = await fetch('/api/entries', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const entry = { ...data, id: data.id || generateId(),
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        relations: data.relations || [], annotations: data.annotations || [] };
      entries.unshift(entry); saveLocal(); notify();
    }
  }

  async function update(id, updates) {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const idx = entries.findIndex(e => e.id === id);
      if (idx === -1) return null;
      entries[idx] = { ...entries[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocal(); notify();
    }
  }

  async function remove(id) {
    try { await fetch(`/api/entries/${id}`, { method: 'DELETE' }); await refreshFromAPI(); }
    catch (e) { entries = entries.filter(e => e.id !== id); saveLocal(); notify(); }
  }

  async function addAnnotation(id, annotation) {
    try {
      const res = await fetch(`/api/entries/${id}/annotations`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(annotation) });
      await res.json(); await refreshFromAPI();
    } catch (e) {
      const e2 = getById(id); if (!e2) return;
      if (!e2.annotations) e2.annotations = [];
      const ann = { ...annotation, id: 'ann-' + Math.random().toString(36).substr(2,6),
        created_at: new Date().toISOString() };
      e2.annotations.push(ann); e2.updated_at = new Date().toISOString();
      saveLocal(); notify();
    }
  }

  async function togglePin(id) {
    try {
      await fetch(`/api/entries/${id}/pin`, { method: 'POST' });
      await refreshFromAPI();
    } catch (e) {
      const e2 = getById(id); if (!e2) return;
      e2.pinned = !e2.pinned; e2.updated_at = new Date().toISOString();
      saveLocal(); notify();
    }
  }

  function getPinned() { return entries.filter(e => e.pinned); }

  function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; }

  function getStats() {
    const total = entries.length;
    const byKind = {}, byStatus = {}, byPriority = {}, byDomain = {}, bySystem = {}, byHosting = {};
    entries.forEach(e => {
      byKind[e.object_kind] = (byKind[e.object_kind] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
      byDomain[e.domain || 'Unspecified'] = (byDomain[e.domain || 'Unspecified'] || 0) + 1;
      const sys = (e.strategic && e.strategic.system_served) || 'unassigned';
      bySystem[sys] = (bySystem[sys] || 0) + 1;
      byHosting[e.hosting_model] = (byHosting[e.hosting_model] || 0) + 1;
    });
    return { total, byKind, byStatus, byPriority, byDomain, bySystem, byHosting,
      active: entries.filter(e => e.status === 'active').length,
      critical: entries.filter(e => e.priority === 'critical').length,
      withRelations: entries.filter(e => e.relations && e.relations.length).length,
      withAnnotations: entries.filter(e => e.annotations && e.annotations.length).length,
      pinned: entries.filter(e => e.pinned).length,
      deprecatedRetired: entries.filter(e => ['deprecated','retired'].includes(e.status)).length };
  }

  function generateId() {
    return `OBJ-${new Date().getFullYear()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
  }

  function search(query) {
    if (!query) return entries;
    const q = query.toLowerCase();
    const score = (e) => {
      let s = 0;
      if ((e.name||'').toLowerCase().includes(q)) s += 10;
      if ((e.summary||'').toLowerCase().includes(q)) s += 6;
      if ((e.purpose||'').toLowerCase().includes(q)) s += 5;
      if ((e.function||'').toLowerCase().includes(q)) s += 5;
      if ((e.detail||'').toLowerCase().includes(q)) s += 3;
      if ((e.id||'').toLowerCase().includes(q)) s += 8;
      if ((e.category||'').toLowerCase().includes(q)) s += 4;
      if ((e.domain||'').toLowerCase().includes(q)) s += 3;
      if ((e.aliases||[]).some(a => a.toLowerCase().includes(q))) s += 7;
      if ((e.keywords||[]).some(k => k.toLowerCase().includes(q))) s += 6;
      if ((e.tags||[]).some(t => t.toLowerCase().includes(q))) s += 4;
      return s;
    };
    return entries.map(e => { const s = score(e); return s > 0 ? { ...e, _sc: s } : null; })
      .filter(Boolean).sort((a,b) => b._sc - a._sc);
  }

  return { load, refreshFromAPI, getAll, getById, add, update, remove,
           addAnnotation, togglePin, getPinned, subscribe, getStats, search, generateId };
})();