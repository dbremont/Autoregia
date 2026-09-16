/* ════════════════════════════════════════════════════════════
   WOS App — sidebar router, window selector, keyboard, chrome.
   The click→filter bus: any chart that wires WOS.Charts.onClick
   ends in WOS.applyFilter(), which updates Store state and sends
   the user to Search with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
const WOS = window.WOS;

WOS.VIEWS = [
  { id:'dashboard',     label:'Dashboard',     icon:'home',      group:'Observation', desc:'volume, spikes, what is hot now' },
  { id:'sources',       label:'Sources',       icon:'rss',       group:'Observation', desc:'watched feeds' },
  { id:'search',        label:'Observations',  icon:'radio',     group:'Observation', desc:'the observation stream' },
  { id:'flow',          label:'Flow',          icon:'waves',     group:'Analysis',    desc:'stream graph over time' },
  { id:'composition',   label:'Composition',   icon:'git-branch',group:'Analysis',    desc:'source make-up' },
  { id:'landscape',     label:'Landscape',     icon:'network',   group:'Analysis',    desc:'words & co-occurrence' },
  { id:'clusters',      label:'Clusters',      icon:'layers',    group:'Analysis',    desc:'semantic clusters' },
  { id:'documentation', label:'Documentation', icon:'book-open', group:'System',      desc:'about this dashboard' },
  { id:'about',         label:'About',         icon:'info',      group:'System',      desc:'what WOS is' },
  { id:'settings',      label:'Settings',      icon:'settings',  group:'System',      desc:'read-only demo', action:'settings' },
  { id:'export',        label:'Export',        icon:'download',  group:'System',      desc:'download the corpus as JSON', action:'export' },
];

// Pre-rename hashes, kept as aliases so old bookmarks keep working.
WOS._ALIASES = { pulse:'dashboard', reading:'search', topics:'sources' };

// Sidebar items that trigger chrome instead of navigating to a view.
WOS.runAction = function (name) {
  if (name === 'settings') WOS.toast('Settings — this build is read-only');
  else if (name === 'export') WOS.exportData();
};

WOS.init = async function () {
  try { await WOS.Store.load(); } catch(e){ console.error('load failed', e); }
  this.current = 'dashboard';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.setupWindow();
  this.navigate(this.getHash() || 'dashboard');
};

WOS.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  WOS.VIEWS.forEach(v => {
    let g = groups[groups.length-1];
    if (!g || g.name !== v.group){ g = { name: v.group, views: [] }; groups.push(g); }
    g.views.push(v);
  });
  nav.innerHTML = groups.map(g =>
    `<div class="sidebar-label">${g.name}</div>` + g.views.map(v => {
      const inner = `<span class="nav-icon">${WOS.icon(v.icon,16)}</span><span>${v.label}</span>`;
      return v.action
        ? `<a href="#" data-action="${v.action}">${inner}</a>`
        : `<a href="#${v.id}" data-view="${v.id}">${inner}</a>`;
    }).join('')
  ).join('');
  nav.querySelectorAll('a[data-action]').forEach(a =>
    a.addEventListener('click', (e)=>{ e.preventDefault(); WOS.runAction(a.dataset.action); }));
};

WOS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v=this.getHash(); if(v) this.navigate(v); });
};
WOS.getHash = () => location.hash.slice(1);

WOS.navigate = function (view) {
  if (WOS._ALIASES[view]) view = WOS._ALIASES[view];
  const def = WOS.VIEWS.find(v=>v.id===view);
  if (def && def.action){ WOS.runAction(def.action); return; }   // chrome, not a view
  this.current = view; location.hash = '#'+view;
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.toggle('active', a.dataset.view===view));
  const c = document.getElementById('appContent');
  const cap = view.charAt(0).toUpperCase()+view.slice(1);
  c.innerHTML = (WOS[cap] && WOS[cap].render) ? WOS[cap].render() : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(()=>{ if(WOS[cap]&&WOS[cap].afterRender) WOS[cap].afterRender(); this.setupWindow(); this.bindMeta(); this.updateFooter(); }, 40);
};

WOS.updateFooter = function () {
  const fw = document.getElementById('footerWindow');
  if (fw){ const w = WOS.Store.getWindow(); fw.textContent = w? (w>=168?(w/24)+'d':w+'h') : 'All'; }
  const fm = document.getElementById('footerFilter');
  if (fm){ const s = WOS.Store.filterSummary(); fm.textContent = s?('filter: '+s):'no filter'; }
};

// ── click→filter bus ──
WOS.applyFilter = async function (patch) {
  await WOS.Store.applyFilter(patch);
  this.renderSidebar();
  this.navigate('search');
};

WOS.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k'){ e.preventDefault(); WOS.CommandPalette.open(''); }
    if ((e.metaKey||e.ctrlKey) && e.shiftKey && (e.key==='N'||e.key==='n')){ e.preventDefault(); WOS.scratchpad.open(); }
    if (e.key==='Escape'){ WOS.CommandPalette.close(); WOS.scratchpad.close(); }
  });
};

WOS.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); WOS.Store.applyFilter({q: gs.value.trim()}); WOS.renderSidebar(); WOS.navigate('search'); } });
};

WOS.setupWindow = function () {
  const seg = document.getElementById('windowSeg');
  if (seg) seg.querySelectorAll('button').forEach(x=>x.classList.toggle('active', parseInt(x.dataset.h,10)===WOS.Store.getWindow()));
  if (WOS._windowBound) return; WOS._windowBound=true;
  document.body.addEventListener('click', (e)=>{
    const b = e.target.closest('#windowSeg button'); if(!b) return;
    WOS.Store.setWindow(parseInt(b.dataset.h,10));
    // reload analytics for the new window, then re-render
    WOS.Store.loadAnalytics().then(()=>{ WOS.Store.loadObservations().then(()=>{ WOS.navigate(WOS.current); WOS.renderSidebar(); }); });
  });
};

WOS.exportData = function () {
  const blob = new Blob([JSON.stringify({analytics:WOS.Store.analytics(), observations:WOS.Store.observations(), sources:WOS.Store.sources()}, null, 2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='wos_export.json'; a.click();
};

// Documentation — a page (rendered in appContent), not a modal.
WOS.Documentation = {
  render() {
    return `<div class="animate-in">${WOS.view.header('Documentation')}<div class="docs-page">${WOS.docsHTML()}</div></div>`;
  },
  afterRender() {},
};

// About — what WOS is (the system, not the dashboard).
WOS.About = {
  render() {
    return `<div class="animate-in">${WOS.view.header('About')}<div class="docs-page">${WOS.aboutHTML()}</div></div>`;
  },
  afterRender() {},
};

WOS.aboutHTML = function () {
  return `<div class="docs-prose">
    <h4>What it is</h4>
    <p><strong>WOS — the World Observation System</strong> — is Autoregia's <em>Perception</em> sub-system (VSM System 4, Intelligence). It watches what <strong>other agents</strong> say and do in the world and turns that raw stream into orientation for the rest of the system. It is the external-world complement of PBS.</p>
    <h4>Collection</h4>
    <p>A collector daemon polls the configured poll specs — <code class="text-mono">config/seed.json</code>, managed by file and read-only from the UI — across six live adapter types: Nitter/X, RSS, arXiv, bioRxiv, Crossref and OpenAlex. The registry also ships GDELT, Hacker News, Lobsters, Reddit and Mastodon adapters for future specs. Query semantics are source-specific; poll intervals live in the seed file.</p>
    <h4>Storage</h4>
    <p>Every collected item is persisted as an unclassified <em>observational</em> event — "a reading the agent actively takes" — in CouchDB (db <code class="text-mono">wos</code>). Topic assignment never happens at collection; it belongs to the downstream processing pipeline. Per-source poll cursors (state docs) drive the health shown on Sources.</p>
    <h4>Search</h4>
    <p>Queries execute inside CouchDB — ddoc views and Mango indexes are created idempotently at startup, so the query layer is the database's own. No full scans.</p>
    <h4>Place in the whole</h4>
    <p>With PKTS and PWTS, WOS aggregates under the General World and Self Observation System (GWOB) gateway.</p>
    <h4>Further reading</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/wos/spec.md</code></span></div>
      <div class="kbd-row"><span>Poll policy</span><span><code class="text-mono text-xs">spec/wos/policy.md</code></span></div>
      <div class="kbd-row"><span>Implementation</span><span><code class="text-mono text-xs">app/module/wos/README.md</code></span></div>
      <div class="kbd-row"><span>Source set</span><span><code class="text-mono text-xs">config/seed.json</code></span></div>
    </div>
  </div>`;
};

WOS.docsHTML = function () {
  const binds = WOS.VIEWS.filter(v=>!v.action).map(v=>`<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Purpose</h4>
    <p>A sense-making dashboard over what <strong>other agents</strong> say about the world — comments, posts and news collected from free feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT). Every item is stored as an <em>observational</em> event in CouchDB; the instruments here turn that stream into orientation.</p>
    <h4>The instruments</h4>
    <p><strong>Dashboard</strong> orients — volume over time, spikes, and what is hot now. <strong>Flow</strong> is the stream graph (a timeline of ribbons by source). <strong>Composition</strong> shows how the stream splits across sources and semantic clusters. <strong>Landscape</strong> maps the vocabulary (word cloud ⇄ treemap) and term co-occurrence. <strong>Clusters</strong> groups items by meaning via a local embedding model. <strong>Search</strong> is the ground-truth observation stream. <strong>Sources</strong> lists the configured poll specs — plain poll specs managed in <code>config/seed.json</code> (the panel is read-only; edit the file to change the watched set).</p>
    <h4>The click→filter bus</h4>
    <p>Click almost any chart element (a source wedge, a cluster card, a word) to filter the Search stream. It is how the charts stop being decoration and start being sense.</p>
    <h4>Navigation</h4><div class="kbd-grid">${binds}</div>
    <h4>Shortcuts</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
      <div class="kbd-row"><span>Quick capture</span><span><span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span></span></div>
      <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
    </div>
  </div>`;
};

WOS.bindMeta = function () {
  document.querySelectorAll('.meta-section-header').forEach(h=>{
    if(h.dataset.bound) return; h.dataset.bound='1';
    h.addEventListener('click', ()=>h.parentElement.classList.toggle('open'));
  });
};

WOS.esc = function(s){ if(s==null) return ''; const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; };
WOS.fmtTime = (ms) => ms ? new Date(ms).toISOString().slice(0,16).replace('T',' ') : '';

document.addEventListener('DOMContentLoaded', ()=>{
  const seg = document.getElementById('windowSeg');
  if(seg) seg.querySelectorAll('button').forEach(b=>b.classList.toggle('active', parseInt(b.dataset.h,10)===168));
  WOS.init();
});
