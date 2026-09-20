/* ════════════════════════════════════════════════════════════
    GCAL App — sidebar router, keyboard, chrome.
   The click→filter bus: any table that wires a filter action
   ends in GCAL.applyFilter(), which updates Store state and
   sends the user to Executions with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
const GCAL = window.GCAL;

GCAL.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Manager', desc: 'health, outcomes, registry' },
  { id: 'connectors', label: 'Connectors', icon: 'box', group: 'Manager', desc: 'the registry of doors' },
  { id: 'connections', label: 'Connections', icon: 'plug', group: 'Manager', desc: 'live connections and their health' },

  { id: 'runner', label: 'Runner', icon: 'play', group: 'Use', desc: 'run an action over a connection' },
  { id: 'executions', label: 'Executions', icon: 'history', group: 'Use', desc: 'the evidence log' },

  { id: 'audit', label: 'Audit', icon: 'shield', group: 'System', desc: 'every mutation, recorded' },
  { id: 'self-monitoring', label: 'Self Monitoring', icon: 'gauge', group: 'System', desc: 'GCAL observing itself' },
  { id: 'settings', label: 'Settings', icon: 'sliders-horizontal', group: 'System', desc: 'defaults and environment' },
  { id: 'documentation', label: 'Documentation', icon: 'file-text', group: 'System', desc: 'how the shell works' },
  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what GCAL is' },
  { id: 'export', label: 'Export', icon: 'download', group: 'System', desc: 'download registry + connections as JSON', action: 'export' },
];

// Pre-shell hashes, kept as aliases so old bookmarks keep working.
GCAL._ALIASES = {
  registry: 'connectors', manager: 'connections', log: 'executions',
  run: 'runner', monitor: 'self-monitoring', docs: 'documentation',
};

// Sidebar items that trigger chrome instead of navigating to a view.
GCAL.runAction = function (name) {
  if (name === 'export') GCAL.exportData();
};

GCAL.toast = function (msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
GCAL.confirm = (opts) => AUTOREGIA.confirmDialog(opts);

GCAL.init = async function () {
  try { await GCAL.Store.load(); } catch (e) { console.error('load failed', e); }
  this.current = 'dashboard';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.navigate(this.getHash() || 'dashboard');
};

GCAL.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  GCAL.VIEWS.forEach(v => {
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
        const inner = `<span class="nav-icon">${GCAL.icon(v.icon, 16)}</span><span>${v.label}</span>`;
        return v.action
          ? `<a href="#" data-action="${v.action}">${inner}</a>`
          : `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
      }).join('')
    ).join('')
  ).join('');
  nav.querySelectorAll('a[data-action]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); GCAL.runAction(a.dataset.action); }));
};

GCAL.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v !== undefined && v !== '') this.navigate(v); });
};
GCAL.getHash = () => location.hash.slice(1);

GCAL.navigate = function (view) {
  view = GCAL._ALIASES[view] || view;
  const slash = view.indexOf('/');
  const sub = slash >= 0 ? decodeURIComponent(view.slice(slash + 1)) : '';
  const base = slash >= 0 ? view.slice(0, slash) : view;
  const def = GCAL.VIEWS.find(v => v.id === base);
  if (def && def.action) { GCAL.runAction(def.action); return; }   // chrome, not a view
  this.current = view; this.currentSub = sub; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === base));
  const c = document.getElementById('appContent');
  const cap = base.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  c.innerHTML = (GCAL[cap] && GCAL[cap].render) ? GCAL[cap].render(sub) : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (GCAL[cap] && GCAL[cap].afterRender) GCAL[cap].afterRender(sub); this.updateFooter(); }, 40);
};

GCAL.updateFooter = function () {
  const fr = document.getElementById('footerRegister');
  if (fr) fr.textContent = `${GCAL.Store.connections().length} connection(s)`;
  const fm = document.getElementById('footerFilter');
  if (fm) { const s = GCAL.Store.filterSummary(); fm.textContent = s ? ('filter: ' + s) : 'no filter'; }
};

// ── click→filter bus ──
GCAL.applyFilter = async function (patch) {
  await GCAL.Store.applyFilter(patch);
  this.renderSidebar();
  this.navigate('executions');
};

GCAL.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); GCAL.CommandPalette.open(''); }
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { GCAL.CommandPalette.close(); }
  });
};

GCAL.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      GCAL.Store.applyFilter({ q: gs.value.trim() || null });
      GCAL.renderSidebar(); GCAL.navigate('executions');
    }
  });
};

GCAL.exportData = async function () {
  try {
    const data = await fetch('api/export').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'gcal_export.json'; a.click();
    GCAL.toast('export downloaded');
  } catch (e) { GCAL.toast('export failed: ' + e.message); }
};

// Documentation — a page (rendered in appContent), not a modal.
GCAL.Documentation = {
  render() {
    return `<div class="animate-in">${GCAL.view.header('Documentation')}<div class="docs-page">${GCAL.docsHTML()}</div></div>`;
  },
  afterRender() {},
};

// About — what GCAL is (the system, not the shell).
GCAL.About = {
  render() {
    return `<div class="animate-in">${GCAL.view.header('About')}<div class="docs-page">${GCAL.aboutHTML()}</div></div>`;
  },
  afterRender() {},
};

GCAL.aboutHTML = function () {
  return `<div class="docs-prose">
    <h4>What it is</h4>
    <p><strong>GCAL — the General Connector Abstraction Layer</strong> — is the connector manager of Autoregia's <em>Agent Toolbox Ecosystem</em> (ATE): one uniform abstraction for reaching the services the world runs on. It is deliberately <em>not a workflow engine</em>: orchestration — chaining actions — is CES territory. GCAL is the connection layer the rest of the toolbox orchestrates over.</p>
    <h4>The model</h4>
    <p>A <strong>connector</strong> is a definition — one Python adapter per external system, declaring its authentication scheme and its action set, discovered from the <code class="text-mono">connectors/</code> package. A <strong>connection</strong> is a live instance: settings plus vaulted credentials, carried through a use-driven lifecycle — <em>disconnected → connected ⇄ error</em> — where every run is gated on state, logged as evidence, and feeds the connection's health. <strong>Disconnect</strong> revokes and voids while keeping settings and history; <strong>reconnect</strong> re-uses them. Broken access answers with the reconnect path, never a bare failure.</p>
    <h4>General types</h4>
    <p>Connectors implement general types — universal-api, feed-reader, git-host, mailbox, mail-sender, cloud-files, local-files, schedule, document-store, knowledge-base — each fixing its auth options, standard action shapes, and test contract. Adding a connector is filling the type's form, not designing a system.</p>
    <h4>Handlers, not abstractions</h4>
    <p>The manager is a dispatching shell: it resolves a connector id to its handler and calls into it. Per-system specifics — connection models, setup forms, error taxonomies — live in the handlers behind one uniform contract.</p>
    <h4>Further reading</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/gcal/spec.md</code></span></div>
      <div class="kbd-row"><span>Decision log</span><span><code class="text-mono text-xs">log.md</code> — GCAL entries</span></div>
      <div class="kbd-row"><span>Implementation</span><span><code class="text-mono text-xs">app/module/ate/tool/gcal/</code></span></div>
    </div>
  </div>`;
};

GCAL.docsHTML = function () {
  const binds = GCAL.VIEWS.filter(v => !v.action).map(v => `<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Concepts</h4>
    <p><strong>Connector</strong> — a definition: auth scheme, setup and credential schemas, action set, test and health contract. Discovered, never hand-registered.</p>
    <p><strong>Connection</strong> — a configured instance with a lifecycle: create (connect), test, use, disconnect (revoke + void, history kept), reconnect, delete (purge). Credentials are masked at every API edge; the store keeps the vault.</p>
    <p><strong>Execution</strong> — one run through the gateway: gated on state, timed, truncated, classified (<em>ok · auth_failure · retryable · bad_params</em>), journaled. Failures count toward the <em>error</em> state; successes clear.</p>
    <p><strong>Audit</strong> — every mutation of the connections, the settings, and the logs is recorded with actor, action, and change details. The audit trail is never pruned.</p>
    <h4>Health, briefly</h4>
    <p>Consecutive failures trip a connection into <em>error</em> (threshold in Settings; auth failures trip at once); a success clears. Runs on non-connected connections answer 409 with the reconnect hint — the shell renders the reconnect path inline.</p>
    <h4>Bounded by design</h4>
    <p>Response bodies truncate (tunable), executions page, retention prunes the log, audit never does. Input caps: 200 KB via the response limit.</p>
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
  GCAL.init();
});
