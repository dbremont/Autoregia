/* ════════════════════════════════════════════════════════════
   ACSMS App — sidebar router, keyboard, chrome.
   The header search filters the skill catalog; the command
   palette navigates and jumps to skills; quick capture
   (Ctrl+Shift+N) self-reports a practice session from anywhere.
   Practice history lives in the skill detail views and the
   dashboard feed — there is no standalone log page.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
const ACSMS = window.ACSMS;

ACSMS.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'gauge', group: 'Overview', desc: 'practice health, attention queue, recent activity' },

  { id: 'skills', label: 'Skill Set', icon: 'layers', group: 'Catalog', desc: 'the skill catalog — define, edit, retire' },
  { id: 'paths', label: 'Skill Paths', icon: 'route', group: 'Catalog', desc: 'ordered curricula that sequence skills into programs' },

  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what ACSMS is' },
  { id: 'settings', label: 'Settings', icon: 'settings', group: 'System', desc: 'training recording preference' },
  { id: 'documentation', label: 'Documentation', icon: 'book-open', group: 'System', desc: 'about this dashboard' },
];

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
        return `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
      }).join('')
    ).join('')
  ).join('');
};

ACSMS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v) this.navigate(v); });
};
ACSMS.getHash = () => location.hash.slice(1);

ACSMS.navigate = function (view) {
  // base/sub hash routes (wos pattern): #skills/<id> renders the skill detail
  const slash = view.indexOf('/');
  const sub = slash >= 0 ? view.slice(slash + 1) : '';
  const base = slash >= 0 ? view.slice(0, slash) : view;
  this.current = view; this.currentBase = base; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === base));
  const c = document.getElementById('appContent');
  const cap = base.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  c.innerHTML = (ACSMS[cap] && ACSMS[cap].render) ? ACSMS[cap].render(sub) : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (ACSMS[cap] && ACSMS[cap].afterRender) ACSMS[cap].afterRender(sub); this.updateFooter(); }, 40);
};

ACSMS.updateFooter = function () {
  const fm = document.getElementById('footerMeta');
  if (!fm) return;
  const st = ACSMS.Store.stats();
  fm.textContent = st ? `${st.skills.total} skills · ${st.practices.total} practices` : '';
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
      // the header search filters the skill catalog (name/description/tags)
      ACSMS.Catalog.q = gs.value.trim();
      ACSMS.Catalog.domain = null;
      ACSMS.Catalog.page = 0;
      ACSMS.navigate('skills');
    }
  });
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
