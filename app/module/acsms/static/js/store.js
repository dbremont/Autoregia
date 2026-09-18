/* ════════════════════════════════════════════════════════════
   ACSMS Store — data layer over /api/*.
   Loads skills + dashboard stats + paths + activity at boot; the
   full practice stream is fetched on demand (dashboard feed) and
   per-skill history on the detail views. Wraps all writes (skill
   CRUD, self-reported practice, paths, retire/delete).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Store = (() => {
  const API = '.'; // mounted under /acsms/, so relative "." resolves to /acsms/

  let _skills = [], _stats = null, _paths = [], _activity = [];

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
    const names = ['skills', 'stats', 'paths', 'activity'];
    const results = await Promise.allSettled(
      [loadSkills(), loadStats(), loadPaths(), loadActivity()]);
    results.forEach((r, i) => { if (r.status === 'rejected') console.error('acsms: ' + names[i] + ' load failed', r.reason); });
  }

  async function loadSkills() { _skills = await _j(`${API}/api/skills`); return _skills; }

  async function loadStats() { _stats = await _j(`${API}/api/dashboard/stats`); return _stats; }
  async function loadPaths() { _paths = await _j(`${API}/api/paths`); return _paths; }
  async function loadActivity() { _activity = await _j(`${API}/api/activity`, { limit: 30 }); return _activity; }

  // practice history — fetched on demand, never held at boot:
  // per-skill history (detail views) and the cross-skill stream (dashboard feed)
  async function loadSkillPractices(id) {
    const res = await _j(`${API}/api/practices`, { skill_id: id, limit: 1000 });
    return res.items || [];
  }
  async function loadPracticeFeed(limit = 200) {
    const res = await _j(`${API}/api/practices`, { limit });
    return res.items || [];
  }

  // ── accessors ──
  const skills = () => _skills;
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
    await Promise.allSettled([loadSkills(), loadStats(), loadPaths(), loadActivity()]);
  }

  return {
    load, refresh, loadSkills, loadStats, loadPaths, loadActivity,
    loadSkillPractices, loadPracticeFeed,
    skills, stats, paths, activity, activeSkills, skillById, pathById,
    createSkill, updateSkill, deleteSkill, createPractice, deletePractice,
    createPath, updatePath, deletePath,
  };
})();
