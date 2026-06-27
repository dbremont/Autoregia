/* ════════════════════════════════════════════════════════════
   PRS Store — Data Layer (localStorage + API)
   ════════════════════════════════════════════════════════════ */
// Ensure the PRS namespace exists before the first use.
// This file is loaded before app.js (which declares `const PRS`),
// so we seed window.PRS here. Idempotent and order-independent.
window.PRS = window.PRS || {};
PRS.Store = (() => {
  const KEY = 'prs_records';
  let records = [];
  let listeners = [];

  function notify() { listeners.forEach(fn => fn(records)); }

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
      const res = await fetch('/api/records');
      if (res.ok) {
        records = await res.json();
        saveLocal();
      }
    } catch(e) { console.warn('API unavailable, using local storage only'); }
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
    return rec;
  }

  async function update(id, updates) {
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocal();
    notify();
    return records[idx];
  }

  async function remove(id) {
    records = records.filter(r => r.id !== id);
    saveLocal();
    notify();
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
