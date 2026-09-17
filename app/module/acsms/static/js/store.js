/* ════════════════════════════════════════════════════════════
   ACSMS Store — data layer over /api/*.
   Loads skills + practices + dashboard stats, owns the filter
   state for the practice log, and wraps all writes (skill CRUD,
   self-reported practice, retire/delete).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Store = (() => {
  const API = '.'; // mounted under /acsms/, so relative "." resolves to /acsms/

  let _skills = [], _practices = [], _stats = null, _paths = [], _activity = [];
  // practice-log filter state — the header search and skill pills write this
  const state = { skill: null, q: '' };
  const PAGE_SIZE = 50;
  let _offset = 0, _paging = { has_more: false, total: 0 };

  async function _j(url, params, opts) {
    const qs = params ? ('?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null && v !== '')))) : '';
    const r = await fetch(url + qs, opts ? {
      method: opts.method || 'GET',
      headers: opts.body != null ? { 'Content-Type': 'application/json' } : {},
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    } : undefined);
    if (!r.ok) {
      let msg = r.status + ' ' + url;
      try { const e = await r.json(); if (e && e.error) msg = e.error; } catch (e) { /* non-json */ }
      throw new Error(msg);
    }
    return r.json();
  }

  async function load() {
    // resilient boot: one failing fetch must never leave the store half-empty
    const names = ['skills', 'practices', 'stats', 'paths', 'activity'];
    const results = await Promise.allSettled(
      [loadSkills(), loadPractices(), loadStats(), loadPaths(), loadActivity()]);
    results.forEach((r, i) => { if (r.status === 'rejected') console.error('acsms: ' + names[i] + ' load failed', r.reason); });
  }

  async function loadSkills() { _skills = await _j(`${API}/api/skills`); return _skills; }

  async function loadPractices() {
    const params = { limit: PAGE_SIZE, offset: _offset };
    if (state.skill) params.skill_id = state.skill;
    if (state.q) params.q = state.q;
    const res = await _j(`${API}/api/practices`, params);
    if (Array.isArray(res)) { _practices = res; _paging = { has_more: false, total: res.length }; }
    else {
      _practices = res.items || [];
      _paging = { has_more: !!res.has_more, total: res.total || 0 };
    }
    return _practices;
  }

  async function loadStats() { _stats = await _j(`${API}/api/dashboard/stats`); return _stats; }
  async function loadPaths() { _paths = await _j(`${API}/api/paths`); return _paths; }
  async function loadActivity() { _activity = await _j(`${API}/api/activity`, { limit: 30 }); return _activity; }
  // full history for one skill (detail view statistics + feed)
  async function loadSkillPractices(id) {
    const res = await _j(`${API}/api/practices`, { skill_id: id, limit: 1000 });
    return res.items || [];
  }

  // ── paging ──
  function getPaging() { return Object.assign({ offset: _offset }, _paging); }
  function resetOffset() { _offset = 0; }
  async function nextPage() { _offset += PAGE_SIZE; await loadPractices(); }
  async function prevPage() { _offset = Math.max(0, _offset - PAGE_SIZE); await loadPractices(); }

  // ── filter bus ──
  function applyFilter(patch) {
    Object.assign(state, patch);
    _offset = 0;                       // any filter change restarts paging
    return loadPractices();
  }
  function resetFilter() { Object.assign(state, { skill: null, q: '' }); }
  function getState() { return state; }
  function filterSummary() {
    const parts = [];
    const sk = skillById(state.skill);
    if (sk) parts.push(sk.name);
    if (state.q) parts.push('“' + state.q + '”');
    return parts.join(' · ');
  }

  // ── accessors ──
  const skills = () => _skills;
  const practices = () => _practices;
  const stats = () => _stats;
  const paths = () => _paths;
  const activity = () => _activity;
  const activeSkills = () => _skills.filter(s => (s.status || 'active') === 'active');
  function skillById(id) { return _skills.find(s => s.id === id) || null; }
  function pathById(id) { return _paths.find(p => p.id === id) || null; }

  // ── writes ──
  function createSkill(body) { return _j(`${API}/api/skills`, null, { method: 'POST', body }); }
  function updateSkill(id, body) { return _j(`${API}/api/skills/${encodeURIComponent(id)}`, null, { method: 'PUT', body }); }
  function deleteSkill(id) { return _j(`${API}/api/skills/${encodeURIComponent(id)}`, null, { method: 'DELETE' }); }
  function createPractice(body) { return _j(`${API}/api/practices`, null, { method: 'POST', body }); }
  function deletePractice(id) { return _j(`${API}/api/practices/${encodeURIComponent(id)}`, null, { method: 'DELETE' }); }
  function createPath(body) { return _j(`${API}/api/paths`, null, { method: 'POST', body }); }
  function updatePath(id, body) { return _j(`${API}/api/paths/${encodeURIComponent(id)}`, null, { method: 'PUT', body }); }
  function deletePath(id) { return _j(`${API}/api/paths/${encodeURIComponent(id)}`, null, { method: 'DELETE' }); }

  // refresh everything a view needs after a write
  async function refresh() {
    await Promise.allSettled([loadSkills(), loadPractices(), loadStats(), loadPaths(), loadActivity()]);
  }

  return {
    load, refresh, loadSkills, loadPractices, loadStats, loadPaths, loadActivity,
    loadSkillPractices,
    applyFilter, resetFilter, getState, filterSummary,
    getPaging, resetOffset, nextPage, prevPage,
    skills, practices, stats, paths, activity, activeSkills, skillById, pathById,
    createSkill, updateSkill, deleteSkill, createPractice, deletePractice,
    createPath, updatePath, deletePath,
  };
})();
