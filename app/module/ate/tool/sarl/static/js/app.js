/* ════════════════════════════════════════════════════════════
    SARL App — sidebar router, keyboard, chrome.
   The click→filter bus: any chart or table that wires a filter
   action ends in SARL.applyFilter(), which updates Store state
   and sends the user to Tasks with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
const SARL = window.SARL;

SARL.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Review', desc: 'findings, dispositions, engine health' },
  { id: 'tasks', label: 'Tasks', icon: 'list', group: 'Review', desc: 'the set of review tasks — searchable' },

  { id: 'glossaries', label: 'Glossaries', icon: 'book-open', group: 'Authorities', desc: 'terminological authorities per language' },
  { id: 'phrases', label: 'Phrase Catalog', icon: 'message-square', group: 'Authorities', desc: 'the editable muletilla / filler lists' },

  { id: 'audit', label: 'Audit', icon: 'history', group: 'System', desc: 'every mutation, recorded' },
  { id: 'self-monitoring', label: 'Self Monitoring', icon: 'gauge', group: 'System', desc: 'SARL observing itself' },
  { id: 'settings', label: 'Settings', icon: 'sliders-horizontal', group: 'System', desc: 'defaults and environment' },
  { id: 'documentation', label: 'Documentation', icon: 'file-text', group: 'System', desc: 'how the shell works' },
  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what SARL is' },
  { id: 'export', label: 'Export', icon: 'download', group: 'System', desc: 'download tasks + authorities as JSON', action: 'export' },
];

// Pre-shell hashes, kept as aliases so old bookmarks keep working.
SARL._ALIASES = {
  'new-task': 'tasks', new: 'tasks', submit: 'tasks',
  journal: 'tasks', log: 'tasks', monitor: 'self-monitoring',
  docs: 'documentation',
};

// Sidebar items that trigger chrome instead of navigating to a view.
SARL.runAction = function (name) {
  if (name === 'export') SARL.exportData();
};

SARL.toast = function (msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
SARL.confirm = (opts) => AUTOREGIA.confirmDialog(opts);

SARL.init = async function () {
  try { await SARL.Store.load(); } catch (e) { console.error('load failed', e); }
  this.current = 'dashboard';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.navigate(this.getHash() || 'dashboard');
};

SARL.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  SARL.VIEWS.forEach(v => {
    let g = groups[groups.length - 1];
    if (!g || g.name !== v.group) { g = { name: v.group, sections: [] }; groups.push(g); }
    let s = g.sections[g.sections.length - 1];
    if (!s || s.name !== (v.section || '')) { s = { name: v.section || '', views: [] }; g.sections.push(s); }
    s.views.push(v);
  });
  // entries by label length, shortest first (ties alphabetical)
  groups.forEach(g => g.sections.forEach(s => s.views.sort((a, b) =>
    a.label.length - b.label.length || a.label.localeCompare(b.label))));
  nav.innerHTML = groups.map(g =>
    `<div class="sidebar-label">${g.name}</div>` + g.sections.map(s =>
      (s.name ? `<div class="sidebar-sublabel">${s.name}</div>` : '') +
      s.views.map(v => {
        const inner = `<span class="nav-icon">${SARL.icon(v.icon, 16)}</span><span>${v.label}</span>`;
        return v.action
          ? `<a href="#" data-action="${v.action}">${inner}</a>`
          : `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
      }).join('')
    ).join('')
  ).join('');
  nav.querySelectorAll('a[data-action]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); SARL.runAction(a.dataset.action); }));
};

SARL.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v !== undefined && v !== '') this.navigate(v); });
};
SARL.getHash = () => location.hash.slice(1);

SARL.navigate = function (view) {
  view = SARL._ALIASES[view] || view;
  const slash = view.indexOf('/');
  const sub = slash >= 0 ? decodeURIComponent(view.slice(slash + 1)) : '';
  const base = slash >= 0 ? view.slice(0, slash) : view;
  const def = SARL.VIEWS.find(v => v.id === base);
  if (def && def.action) { SARL.runAction(def.action); return; }   // chrome, not a view
  this.current = view; this.currentSub = sub; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === base));
  const c = document.getElementById('appContent');
  const cap = base.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  c.innerHTML = (SARL[cap] && SARL[cap].render) ? SARL[cap].render(sub) : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (SARL[cap] && SARL[cap].afterRender) SARL[cap].afterRender(sub); this.updateFooter(); }, 40);
};

SARL.updateFooter = function () {
  const fr = document.getElementById('footerRegister');
  if (fr) fr.textContent = `${SARL.Store.tasksPage().length} in view`;
  const fm = document.getElementById('footerFilter');
  if (fm) { const s = SARL.Store.filterSummary(); fm.textContent = s ? ('filter: ' + s) : 'no filter'; }
};

// ── click→filter bus ──
SARL.applyFilter = async function (patch) {
  await SARL.Store.applyFilter(patch);
  this.renderSidebar();
  this.navigate('tasks');
};

SARL.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); SARL.CommandPalette.open(''); }
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { SARL.CommandPalette.close(); }
  });
};

SARL.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      SARL.Store.applyFilter({ q: gs.value.trim() || null });
      SARL.renderSidebar(); SARL.navigate('tasks');
    }
  });
};

SARL.exportData = async function () {
  try {
    const data = await fetch('api/export').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'sarl_export.json'; a.click();
    SARL.toast('export downloaded');
  } catch (e) { SARL.toast('export failed: ' + e.message); }
};

// Documentation — a page (rendered in appContent), not a modal.
SARL.Documentation = {
  render() {
    return `<div class="animate-in">${SARL.view.header('Documentation')}<div class="docs-page">${SARL.docsHTML()}</div></div>`;
  },
  afterRender() {},
};

// About — what SARL is (the system, not the shell).
SARL.About = {
  render() {
    return `<div class="animate-in">${SARL.view.header('About')}<div class="docs-page">${SARL.aboutHTML()}</div></div>`;
  },
  afterRender() {},
};

SARL.aboutHTML = function () {
  return `<div class="docs-prose">
    <h4>What it is</h4>
    <p><strong>SARL — the Sistema Asistencia de Revisión Lingüística</strong> — is a tool of Autoregia's <em>Agent Toolbox Ecosystem</em> (ATE): the copy editor's pass over the agent's textual outputs. It verifies and corrects the linguistic, stylistic, terminological, and orthotypographic aspects of a submitted text and returns evidence-cited findings with suggestions, from which a corrected text is composed by explicit disposition. It is deliberately <em>not a writer</em> and <em>not a translator</em>: it composes nothing — it verifies and corrects what already exists.</p>
    <h4>The model</h4>
    <p>A <strong>text edition task</strong> is the documented representation of a linguistic review process: one markdown document under a declared set of criteria, carried through an explicit workflow. <em>Run review</em> has the deterministic packs raise <strong>findings</strong> — exact span, quoted evidence, suggestion — and every suggestion is <strong>accepted or rejected</strong> by the agent. Apply composes the corrected text beside a change log; the document is never mutated. Lifecycle: <em>created → reviewed → applied | discarded</em> — the whole process recorded as evidence.</p>
    <h4>Two authorities</h4>
    <p>A <strong>glossary</strong> is a terminological authority: preferred terms, forbidden variants, aliases — enforced by the terminológica dimension. The <strong>phrase catalog</strong> is the engine's editable phrase lists: muletillas and fillers per language, consulted by the estilística rule at review time.</p>
    <h4>Determinism first</h4>
    <p>The live path is pure Python — regex, token matchers, and word lists. Same text, same packs, same findings: no network, no models. A LanguageTool adapter is designed <em>dormant</em>: it wakes only when a server URL is configured in Settings, and its findings carry <code class="text-mono">engine: languagetool</code> so their provenance stays distinct.</p>
    <h4>Place in the whole</h4>
    <p>SARL serves the quality of the texts that <a href="/ate/tool/ces/" target="_blank" rel="noopener">CES</a> produces and <a href="/ate/tool/ctes/" target="_blank" rel="noopener">CTES</a> manages — documents, notes, READMEs, deliberations, reports. Its dispositions are the feedback surface: repeated rejections of one rule are the natural trigger to retire or retune it.</p>
    <h4>Further reading</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/sarl/spec.md</code></span></div>
      <div class="kbd-row"><span>Decision log</span><span><code class="text-mono text-xs">log.md</code> — SARL entries</span></div>
      <div class="kbd-row"><span>Implementation</span><span><code class="text-mono text-xs">app/module/ate/tool/sarl/</code></span></div>
    </div>
  </div>`;
};

SARL.docsHTML = function () {
  const binds = SARL.VIEWS.filter(v => !v.action).map(v => `<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Concepts</h4>
    <p><strong>Text edition task</strong> — the workflow of a linguistic review of one <strong>markdown document</strong> under a declared set of <strong>criteria</strong> (dimensions + attached glossaries). Defining a task journals it in <em>created</em>; <em>Run review</em> engages the packs synchronously and records the findings; dispositions follow; Apply composes the corrected text with a change log. Lifecycle: <em>created → reviewed → applied | discarded</em>. Tasks are append-only evidence; the set is searchable by title, content, or rule fired, and cleared only by the explicit <em>clear log</em> (audited) or the retention policy.</p>
    <p><strong>Finding</strong> — one detected issue: exact span (<code class="text-mono">start</code>/<code class="text-mono">end</code>), the quoted evidence (never a bare line number), the rule, the message with its reason, the suggested replacement, and a disposition: <em>pending · accepted · rejected</em>. Accepting a suggestion whose span overlaps another accepted one is refused — Apply must stay deterministic.</p>
    <p><strong>Glossary</strong> — preferred terms with forbidden variants and aliases. Forbidden terms raise errors; unpreferred aliases warnings; drift across one text is flagged. <strong>Phrase collection</strong> — enabled collections feed the muletilla rule live; edits apply on the very next task.</p>
    <p><strong>Audit</strong> — every mutation of the journal, the authorities, or the settings is recorded with actor, action, and change details. The audit trail is never pruned.</p>
    <h4>Dispositions as feedback</h4>
    <p>A rejected finding is a voice of policy. The dashboard projects the most-fired rules and the acceptance balance — repeated rejections of one rule are the natural trigger to retire or retune it.</p>
    <h4>Bounded by design</h4>
    <p>Findings are capped per review and evidence excerpts truncated (both tunable in Settings), so a pathological text cannot flood the plate or the journal. Input is capped at 200,000 characters.</p>
    <h4>Navigation</h4><div class="kbd-grid">${binds}</div>
    <h4>Shortcuts</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
      <div class="kbd-row"><span>Focus search</span><span><span class="kbd">/</span></span></div>
      <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
    </div>
  </div>`;
};

document.addEventListener('DOMContentLoaded', () => {
  SARL.init();
});
