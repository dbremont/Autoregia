/* ════════════════════════════════════════════════════════════
   ACSMS App — sidebar router, keyboard, chrome.
   The header search filters the practice stream; the command
   palette navigates and jumps to skills; quick capture
   (Ctrl+Shift+N) self-reports a practice session from anywhere.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
const ACSMS = window.ACSMS;

ACSMS.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'gauge', group: 'Practice', desc: 'practice health, attention queue, recent activity' },
  { id: 'practice', label: 'Practice Log', icon: 'activity', group: 'Practice', desc: 'the self-reported practice stream' },

  { id: 'skills', label: 'Skills', icon: 'layers', group: 'Catalog', desc: 'the skill catalog — define, edit, retire' },

  { id: 'documentation', label: 'Documentation', icon: 'book-open', group: 'System', desc: 'about this dashboard' },
  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what ACSMS is' },
  { id: 'export', label: 'Export', icon: 'download', group: 'System', desc: 'download skills + practices as JSON', action: 'export' },
];

// Sidebar items that trigger chrome instead of navigating to a view.
ACSMS.runAction = function (name) {
  if (name === 'export') ACSMS.exportData();
};

ACSMS.init = async function () {
  try { await ACSMS.Store.load(); } catch (e) { console.error('load failed', e); }
  this.current = 'dashboard';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.navigate(this.getHash() || 'dashboard');
};

ACSMS.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  ACSMS.VIEWS.forEach(v => {
    let g = groups[groups.length - 1];
    if (!g || g.name !== v.group) { g = { name: v.group, sections: [] }; groups.push(g); }
    let s = g.sections[g.sections.length - 1];
    if (!s || s.name !== (v.section || '')) { s = { name: v.section || '', views: [] }; g.sections.push(s); }
    s.views.push(v);
  });
  nav.innerHTML = groups.map(g =>
    `<div class="sidebar-label">${g.name}</div>` + g.sections.map(s =>
      (s.name ? `<div class="sidebar-sublabel">${s.name}</div>` : '') +
      s.views.map(v => {
        const inner = `<span class="nav-icon">${ACSMS.icon(v.icon, 16)}</span><span>${v.label}</span>`;
        return v.action
          ? `<a href="#" data-action="${v.action}">${inner}</a>`
          : `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
      }).join('')
    ).join('')
  ).join('');
  nav.querySelectorAll('a[data-action]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); ACSMS.runAction(a.dataset.action); }));
};

ACSMS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v) this.navigate(v); });
};
ACSMS.getHash = () => location.hash.slice(1);

ACSMS.navigate = function (view) {
  const def = ACSMS.VIEWS.find(v => v.id === view);
  if (def && def.action) { ACSMS.runAction(def.action); return; }   // chrome, not a view
  this.current = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  const c = document.getElementById('appContent');
  const cap = view.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  c.innerHTML = (ACSMS[cap] && ACSMS[cap].render) ? ACSMS[cap].render() : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (ACSMS[cap] && ACSMS[cap].afterRender) ACSMS[cap].afterRender(); this.updateFooter(); }, 40);
};

ACSMS.updateFooter = function () {
  const fm = document.getElementById('footerMeta');
  if (!fm) return;
  const st = ACSMS.Store.stats();
  const parts = [];
  if (st) parts.push(`${st.skills.total} skills · ${st.practices.total} practices`);
  const s = ACSMS.Store.filterSummary();
  fm.textContent = parts.join(' · ') + (s ? ` · filter: ${s}` : '');
};

ACSMS.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); ACSMS.CommandPalette.open(''); }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); ACSMS.capture.open(); }
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { ACSMS.CommandPalette.close(); ACSMS.capture.close(); }
  });
};

ACSMS.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ACSMS.Store.applyFilter({ q: gs.value.trim() }).then(() => { ACSMS.navigate('practice'); });
    }
  });
};

ACSMS.exportData = async function () {
  try {
    const data = await (await fetch('./api/export')).json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'acsms_export.json'; a.click();
    ACSMS.toast('Exported skills + practices');
  } catch (e) { ACSMS.toast('Export failed: ' + e.message); }
};

// ── shared helpers ──
ACSMS.esc = function (s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
ACSMS.fmtTime = (ms) => ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '';
ACSMS.fmtAgo = function (ms) {
  if (!ms) return 'never';
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
ACSMS.dateInputVal = function (ms) {
  const d = ms ? new Date(ms) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
ACSMS.toast = function (msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };

document.addEventListener('DOMContentLoaded', () => {
  ACSMS.init();
});
