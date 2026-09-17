/* ════════════════════════════════════════════════════════════
   CTES App — sidebar router, window selector, keyboard, chrome.
   The click→filter bus: any chart or table that wires a filter
   action ends in CTES.applyFilter(), which updates Store state
   and sends the user to Runs with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
const CTES = window.CTES;

CTES.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', group: 'Register', desc: 'outcomes, activity, backend health' },
  { id: 'handlers', label: 'Handlers', icon: 'box', group: 'Register', desc: 'the register of runnable packages' },
  { id: 'tasks', label: 'Task Specs', icon: 'clipboard-list', group: 'Register', desc: 'registered intents, bound to handlers' },

  { id: 'runs', label: 'Runs', icon: 'radio', group: 'Execution', desc: 'the execution journal' },

  { id: 'audit', label: 'Audit', icon: 'history', group: 'System', desc: 'every mutation, recorded' },
  { id: 'self-monitoring', label: 'Self Monitoring', icon: 'gauge', group: 'System', desc: 'CTES observing itself' },
  { id: 'settings', label: 'Settings', icon: 'sliders-horizontal', group: 'System', desc: 'defaults and environment' },
  { id: 'documentation', label: 'Documentation', icon: 'book-open', group: 'System', desc: 'how the shell works' },
  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what CTES is' },
  { id: 'export', label: 'Export', icon: 'download', group: 'System', desc: 'download register + runs as JSON', action: 'export' },
];

// Pre-shell hashes, kept as aliases so old bookmarks keep working.
CTES._ALIASES = {
  catalog: 'handlers', register: 'handlers', history: 'runs', log: 'runs',
  specs: 'tasks', task: 'tasks', monitor: 'self-monitoring', docs: 'documentation',
};

// Sidebar items that trigger chrome instead of navigating to a view.
CTES.runAction = function (name) {
  if (name === 'export') CTES.exportData();
};

CTES.toast = function (msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
CTES.confirm = (opts) => AUTOREGIA.confirmDialog(opts);

CTES.init = async function () {
  try { await CTES.Store.load(); } catch (e) { console.error('load failed', e); }
  this.current = 'dashboard';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.setupWindow();
  this.navigate(this.getHash() || 'dashboard');
};

CTES.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  CTES.VIEWS.forEach(v => {
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
        const inner = `<span class="nav-icon">${CTES.icon(v.icon, 16)}</span><span>${v.label}</span>`;
        return v.action
          ? `<a href="#" data-action="${v.action}">${inner}</a>`
          : `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
      }).join('')
    ).join('')
  ).join('');
  nav.querySelectorAll('a[data-action]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); CTES.runAction(a.dataset.action); }));
};

CTES.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v !== undefined && v !== '') this.navigate(v); });
};
CTES.getHash = () => location.hash.slice(1);

CTES.navigate = function (view) {
  view = CTES._ALIASES[view] || view;
  const slash = view.indexOf('/');
  const sub = slash >= 0 ? decodeURIComponent(view.slice(slash + 1)) : '';
  const base = slash >= 0 ? view.slice(0, slash) : view;
  const def = CTES.VIEWS.find(v => v.id === base);
  if (def && def.action) { CTES.runAction(def.action); return; }   // chrome, not a view
  this.current = view; this.currentSub = sub; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === base));
  const c = document.getElementById('appContent');
  const cap = base.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  c.innerHTML = (CTES[cap] && CTES[cap].render) ? CTES[cap].render(sub) : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (CTES[cap] && CTES[cap].afterRender) CTES[cap].afterRender(sub); this.setupWindow(); this.updateFooter(); }, 40);
};

CTES.updateFooter = function () {
  const fr = document.getElementById('footerRegister');
  if (fr) { const hs = CTES.Store.handles(); fr.textContent = `${hs.filter(h => h.status === 'active').length} active · ${hs.length} total`; }
  const fm = document.getElementById('footerFilter');
  if (fm) { const s = CTES.Store.filterSummary(); fm.textContent = s ? ('filter: ' + s) : 'no filter'; }
};

// ── click→filter bus ──
CTES.applyFilter = async function (patch) {
  await CTES.Store.applyFilter(patch);
  this.renderSidebar();
  this.navigate('runs');
};

CTES.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); CTES.CommandPalette.open(''); }
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { CTES.CommandPalette.close(); }
  });
};

CTES.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      CTES.Store.applyFilter({ q: gs.value.trim() || null });
      CTES.renderSidebar(); CTES.navigate('runs');
    }
  });
};

CTES.setupWindow = function () {
  const seg = document.getElementById('windowSeg');
  if (seg) seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', parseInt(x.dataset.h, 10) === CTES.Store.getWindow()));
  if (CTES._windowBound) return; CTES._windowBound = true;
  document.body.addEventListener('click', (e) => {
    const b = e.target.closest('#windowSeg button'); if (!b) return;
    CTES.Store.setWindow(parseInt(b.dataset.h, 10));
    CTES.Store.loadRuns().then(() => { CTES.navigate(CTES.current); }).catch(() => CTES.toast('Could not refresh runs'));
  });
};

CTES.exportData = async function () {
  try {
    const data = await fetch('api/export').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ctes_export.json'; a.click();
    CTES.toast('export downloaded');
  } catch (e) { CTES.toast('export failed: ' + e.message); }
};

// Documentation — a page (rendered in appContent), not a modal.
CTES.Documentation = {
  render() {
    return `<div class="animate-in">${CTES.view.header('Documentation')}<div class="docs-page">${CTES.docsHTML()}</div></div>`;
  },
  afterRender() {},
};

// About — what CTES is (the system, not the shell).
CTES.About = {
  render() {
    return `<div class="animate-in">${CTES.view.header('About')}<div class="docs-page">${CTES.aboutHTML()}</div></div>`;
  },
  afterRender() {},
};

CTES.aboutHTML = function () {
  return `<div class="docs-prose">
    <h4>What it is</h4>
    <p><strong>CTES — the Computation Task Execution System</strong> — is a tool of Autoregia's <em>Agent Toolbox Ecosystem</em> (ATE). It manages the lifecycle of computation tasks from submission to completion. Where <a href="/ate/tool/ces/" target="_blank" rel="noopener">CES</a> provisions the environments work runs in, CTES is the discipline of the work itself: a register of runnable code, the intents that reference it, and the journal of what actually ran.</p>
    <h4>The three layers</h4>
    <p>A <strong>handle</strong> is a self-contained Python package under <code class="text-mono">packages/&lt;id&gt;/</code> — a manifest plus code with one entry function. A <strong>task spec</strong> is a registered intent that references a handle directly: objective, payload template, expected output, constraints. A <strong>run</strong> is one execution: the spec (or a direct dispatch) resolved against the register, carried out in the handle's own environment, and journaled with input, result, log, and a hash of the exact code that ran.</p>
    <h4>Execution environments</h4>
    <p>Every handle runs in a self-contained environment through one uniform shim: a disposable, network-less docker container by default, or the host's own python as the subprocess fallback. The handle cannot corrupt the server; its prints are its log, its return value is the result.</p>
    <h4>Dependability</h4>
    <p>The register, the specs, the run journal, the audit trail, and the settings persist in CouchDB (db <code class="text-mono">ctes</code>). Every mutation is audited; deleted handles remain visible in their past runs; the run journal is retained per the settings policy.</p>
    <h4>Place in the whole</h4>
    <p>CTES generalizes what the telemetry pipelines (PKTS/PWTS) do ad hoc with raw drops plus RQ workers. WOS's Self Monitoring view observes the tasks it delegates here.</p>
    <h4>Further reading</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/ctes/spec.md</code></span></div>
      <div class="kbd-row"><span>Decision log</span><span><code class="text-mono text-xs">log.md</code> — CTES entries</span></div>
      <div class="kbd-row"><span>Implementation</span><span><code class="text-mono text-xs">app/module/ate/tool/ctes/</code></span></div>
    </div>
  </div>`;
};

CTES.docsHTML = function () {
  const binds = CTES.VIEWS.filter(v => !v.action).map(v => `<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Concepts</h4>
    <p><strong>Handle</strong> — registered code you can run. Lives at <code class="text-mono">packages/&lt;id&gt;/</code> with a <code class="text-mono">manifest.json</code> (entry point <code class="text-mono">module:function</code>) and the package itself. Lifecycle: <em>register → active → (inactive) → delete</em>. Inactivation is the soft path — the register keeps the handle but refuses to run it. Deletion is manual, explicit, and audited: it purges the doc and the code directory; the run journal is kept and shows the handle as deleted.</p>
    <p><strong>Task spec</strong> — a registered intent that binds to a handler directly: objective, payload template, expected output, priority, constraints (timeout, deadline), dependencies. <em>Emitting</em> a spec resolves its handler and dispatches synchronously now; the run records which spec produced it.</p>
    <p><strong>Run</strong> — one execution, journaled end-to-end: input, result, stdout/stderr, exit code, duration, backend, and a sha256 of the exact code that ran. Filter the journal by handle, status, window, or free text.</p>
    <p><strong>Audit</strong> — every mutation of the register, specs, or settings is recorded with actor, action, and change details. The audit trail is never pruned.</p>
    <h4>The handle contract</h4>
    <p>An entry function receives the JSON payload and returns a JSON value: <code class="text-mono">run(payload: dict) -> dict</code>. Anything it prints becomes the run's log. It must not assume network access (the default container has none) or a writable filesystem beyond its own package.</p>
    <h4>Backends</h4>
    <p><strong>docker</strong> (default when available) runs each execution in a disposable <code class="text-mono">--network none</code> container with the package mounted read-only. <strong>subprocess</strong> runs the same shim with the host python — the development and test fallback. Selection: per run, or the default in Settings; environment-level knobs (image, memory, cpus) come from <code class="text-mono">CTES_*</code> variables and display read-only in Settings.</p>
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
  CTES.init();
});
