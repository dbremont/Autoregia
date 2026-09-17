/* ════════════════════════════════════════════════════════════
   PBS Store — Data Layer (localStorage + API)
   ════════════════════════════════════════════════════════════ */
// Ensure the PBS namespace exists before the first use.
// This file is loaded before app.js (which declares `const PBS`),
// so we seed window.PBS here. Idempotent and order-independent.
window.PBS = window.PBS || {};
PBS.Store = (() => {
  const KEY = 'pbs_records';
  let records = [];
  let listeners = [];
  let syncListeners = [];
  // Honest sync state (ui.spec §2 "Transparent system state"):
  // online=true → last server write succeeded; online=false → writes
  // are landing in localStorage only, pending sync.
  let sync = { online: null, lastError: null };

  function notify() { listeners.forEach(fn => fn(records)); }
  function notifySync() { syncListeners.forEach(fn => fn(sync)); }

  function setSync(online, err) {
    if (sync.online === online && sync.lastError === (err || null)) return;
    sync = { online, lastError: err || null };
    notifySync();
  }

  PBS.Store_syncState = () => ({ ...sync });
  PBS.Store_onSync = (fn) => { syncListeners.push(fn); return () => { syncListeners = syncListeners.filter(f => f !== fn); }; };

  // Write-through: local mutation is optimistic; the server write is
  // attempted in the background and its outcome is reported honestly.
  async function pushToAPI(method, url, body) {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setSync(true);
      return true;
    } catch (e) {
      setSync(false, e.message);
      return false;
    }
  }

  // Load from localStorage or seed from API
  async function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try { records = JSON.parse(stored); } catch { records = []; }
    }
    if (!records || records.length === 0) {
      await fetchFromAPI();
    }
    notify();
    return records;
  }

  async function fetchFromAPI() {
    try {
      const res = await fetch('/pbs/api/records');
      if (res.ok) {
        records = await res.json();
        saveLocal();
        setSync(true);
      } else {
        setSync(false, 'HTTP ' + res.status);
      }
    } catch(e) {
      console.warn('API unavailable, using local storage only');
      setSync(false, 'offline');
    }
  }

  function saveLocal() {
    localStorage.setItem(KEY, JSON.stringify(records));
  }

  function getAll() { return [...records]; }

  function getById(id) { return records.find(r => r.id === id); }

  function getByType(type) { return records.filter(r => r.record_type === type); }

  function filter(fn) { return records.filter(fn); }

  async function add(recordData) {
    const rec = { ...recordData,
      id: recordData.id || generateId(),
      created_at: recordData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      annotations: recordData.annotations || [],
      links: recordData.links || []
    };
    records.unshift(rec);
    saveLocal();
    notify();
    const ok = await pushToAPI('POST', '/pbs/api/records', rec);
    return { ...rec, _persisted: ok };
  }

  async function update(id, updates) {
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocal();
    notify();
    const ok = await pushToAPI('PUT', '/pbs/api/records/' + encodeURIComponent(id), updates);
    return { ...records[idx], _persisted: ok };
  }

  // No DELETE endpoint exists server-side; removal is local-only and
  // is always reported as unpersisted.
  async function remove(id) {
    records = records.filter(r => r.id !== id);
    saveLocal();
    notify();
    setSync(false, 'delete is local-only (no server endpoint)');
  }

  async function addAnnotation(id, annotation) {
    const rec = getById(id);
    if (!rec) return null;
    if (!rec.annotations) rec.annotations = [];
    const ann = { ...annotation, id: 'ann-' + Math.random().toString(36).substr(2,6), created_at: new Date().toISOString() };
    rec.annotations.push(ann);
    rec.updated_at = new Date().toISOString();
    saveLocal();
    notify();
    pushToAPI('POST', '/pbs/api/records/' + encodeURIComponent(id) + '/annotations', ann);
    return ann;
  }

  function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(f => f !== fn); }; }

  function getStats() {
    const total = records.length;
    const byType = {}; const byStatus = {}; const byPriority = {};
    records.forEach(r => {
      byType[r.record_type] = (byType[r.record_type]||0)+1;
      byStatus[r.status] = (byStatus[r.status]||0)+1;
      byPriority[r.priority] = (byPriority[r.priority]||0)+1;
    });
    return { total, byType, byStatus, byPriority,
      withDeadlines: records.filter(r=>r.deadline).length,
      withAnnotations: records.filter(r=>r.annotations&&r.annotations.length).length,
      withLinks: records.filter(r=>r.links&&r.links.length).length
    };
  }

  function generateId() {
    const d = new Date();
    return `REC-${d.getFullYear()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;
  }

  function search(query) {
    if (!query) return records;
    const q = query.toLowerCase();
    return records.map(r => {
      let score = 0;
      if (r.content && r.content.toLowerCase().includes(q)) score += 10;
      if (r.detail && r.detail.toLowerCase().includes(q)) score += 5;
      if (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) score += 7;
      if (r.subject && r.subject.toLowerCase().includes(q)) score += 3;
      if (r.domain && r.domain.toLowerCase().includes(q)) score += 2;
      if (r.record_type && r.record_type.toLowerCase().includes(q)) score += 2;
      if (r.id && r.id.toLowerCase().includes(q)) score += 8;
      return score > 0 ? {...r, _sc: score} : null;
    }).filter(Boolean).sort((a,b) => b._sc - a._sc);
  }

  return { load, getAll, getById, getByType, filter, add, update, remove, addAnnotation, subscribe, getStats, search, generateId };
})();
