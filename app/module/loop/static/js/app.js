/* ════════════════════════════════════════════════════════════
   LOOP App — sidebar router, window selector, keyboard, chrome
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
const LOOP = window.LOOP;

LOOP.VIEWS = [
  { id: 'gap',         label: 'The Gap',        icon: 'target',      desc: 'intention vs reality' },
  { id: 'commitments', label: 'Commitments',    icon: 'flag',        desc: 'the word over time' },
  { id: 'goals',       label: 'Goals',          icon: 'compass',     desc: 'target vs progress' },
  { id: 'plan',        label: 'Plan vs Actual', icon: 'git-branch',  desc: 'estimate vs effort' },
  { id: 'resources',   label: 'Resources',      icon: 'activity',    desc: 'floor vs level' },
  { id: 'deviation',   label: 'Deviation',      icon: 'alert-triangle', desc: 'intended vs observed' },
];

LOOP.WINDOWS = [
  { d: 7,   label: '7d' },
  { d: 30,  label: '30d' },
  { d: 90,  label: '90d' },
  { d: 9999, label: 'All' },
];

LOOP.init = async function () {
  await LOOP.Store.load();
  this.current = 'loop';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.setupWindow();
  this.navigate(this.getHash() || 'loop');
};

LOOP.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const s = LOOP.Store.summary().counts;
  const counts = {
    gap: '', commitments: s.commitments, goals: s.goals, plan: '', resources: '', deviation: s.deviations,
  };
  nav.innerHTML = LOOP.VIEWS.map(v =>
    `<a href="#${v.id}" data-view="${v.id}"><span class="nav-icon">${LOOP.icon(v.icon, 16)}</span><span>${v.label}</span>${counts[v.id] !== '' ? `<span class="nav-count">${counts[v.id]}</span>` : ''}</a>`
  ).join('');
};

LOOP.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v) this.navigate(v); });
};
LOOP.getHash = function () { return location.hash.slice(1); };

LOOP.navigate = function (view) {
  this.current = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  const c = document.getElementById('appContent');
  const cap = view.charAt(0).toUpperCase() + view.slice(1);
  c.innerHTML = LOOP[cap]?.render ? LOOP[cap].render() : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(() => { if (LOOP[cap]?.afterRender) LOOP[cap].afterRender(); this.setupWindow(); this.bindMeta(); }, 40);
};

LOOP.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); LOOP.CommandPalette.open(''); }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); LOOP.scratchpad.open(); }
    if (e.key === 'Escape') { LOOP.CommandPalette.close(); LOOP.scratchpad.close(); LOOP.closeModal(); }
  });
};

LOOP.setupHeader = function () {
  document.getElementById('btnExport')?.addEventListener('click', () => LOOP.exportData());
  document.getElementById('btnDocs')?.addEventListener('click', () => LOOP.openDocs());
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); LOOP.CommandPalette.open(gs.value); gs.blur(); } });
};

LOOP.setupWindow = function () {
  const seg = document.getElementById('windowSeg');
  if (seg) seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', parseInt(x.dataset.w, 10) === LOOP.Store.getWindow()));
  if (LOOP._windowBound) return; LOOP._windowBound = true;
  document.body.addEventListener('click', (e) => {
    const b = e.target.closest('#windowSeg button'); if (!b) return;
    LOOP.Store.setWindow(parseInt(b.dataset.w, 10));
    LOOP.navigate(LOOP.current);
    LOOP.renderSidebar();
  });
};

LOOP.exportData = function () {
  const blob = new Blob([JSON.stringify(LOOP.Store.getDataset(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'loop_export.json'; a.click();
};

LOOP.openDocs = function () {
  document.getElementById('modalTitle').textContent = 'Autoregia Agency Dashboard — Documentation';
  document.getElementById('modalBody').innerHTML = LOOP.docsHTML();
  document.getElementById('appModal').classList.remove('hidden');
};
LOOP.closeModal = function () { document.getElementById('appModal')?.classList.add('hidden'); };

LOOP.docsHTML = function () {
  const bindings = LOOP.VIEWS.map(v => `<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" onclick="LOOP.closeModal()" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Purpose</h4>
    <p>An analytical dashboard organized around one principle: the <strong>intention↔reality gap</strong>. Every panel pairs what the agent declared it would do or be (a commitment, a goal target, an estimate, a resource floor, an intended outcome) with what actually happened — and surfaces the gap the agent must reconcile to stay coherent with itself over time.</p>
    <h4>The gaps</h4>
    <p><strong>Commitments</strong> — deadline vs kept (the word). <strong>Goals</strong> — target vs progress (direction). <strong>Plan vs Actual</strong> — estimate vs effort (self-knowledge). <strong>Resources</strong> — floor vs level (sustain). <strong>Deviation</strong> — intended vs observed outcome (the feedback feed). <strong>The Gap</strong> ranks them and queues what to reconcile now.</p>
    <h4>Data</h4>
    <p>This prototype runs on a deterministic mock substrate (<code>data/mock_loop.json</code>) spanning ~120 days. Regenerate with <code>python3 loop/data/gen_mock.py</code>. All metrics are computed live in the browser; the window selector re-derives everything instantly.</p>
    <h4>Navigation</h4>
    <div class="kbd-grid">${bindings}</div>
    <h4>Shortcuts</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
      <div class="kbd-row"><span>Quick capture</span><span><span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span></span></div>
      <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
    </div>
  </div>`;
};

LOOP.bindMeta = function () {
  document.querySelectorAll('.meta-section-header').forEach(h => {
    if (h.dataset.bound) return; h.dataset.bound = '1';
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });
};

LOOP.esc = function (s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
LOOP.fmtPct = (x, d = 0) => (x * 100).toFixed(d) + '%';
LOOP.bandPill = function (status) {
  const map = { 'on-track': 'success', 'at-risk': 'warning', 'off-track': 'danger',
    'viable': 'success', 'developing': 'warning', 'critical': 'danger',
    'enacted': 'success', 'concluded': 'info', 'open': 'warning', 'superseded': 'accent' };
  return `<span class="pill ${map[status] || ''}">${status}</span>`;
};

document.addEventListener('DOMContentLoaded', () => {
  // render window segment default
  const seg = document.getElementById('windowSeg');
  if (seg) seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', parseInt(b.dataset.w, 10) === 30));
  LOOP.init();
});
