/* ════════════════════════════════════════════════════════════
   WOS App — sidebar router, window selector, keyboard, chrome.
   The click→filter bus: any chart that wires WOS.Charts.onClick
   ends in WOS.applyFilter(), which updates Store state and sends
   the user to Search with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
const WOS = window.WOS;

WOS.VIEWS = [
  { id:'dashboard',   label:'Dashboard',   icon:'activity',   group:'',        desc:'volume, spikes, what is hot now' },
  { id:'flow',        label:'Flow',        icon:'waves',      group:'',        desc:'stream graph over time' },
  { id:'composition', label:'Composition', icon:'git-branch', group:'',        desc:'source make-up' },
  { id:'landscape',   label:'Landscape',   icon:'network',    group:'',        desc:'words & co-occurrence' },
  { id:'clusters',    label:'Clusters',    icon:'layers',     group:'',        desc:'semantic clusters' },
  { id:'search',      label:'Search',      icon:'search',     group:'Signal',  desc:'the observation stream' },
  { id:'sources',     label:'Sources',     icon:'rss',        group:'Sources', desc:'watched feeds' },
];

// Pre-rename hashes, kept as aliases so old bookmarks keep working.
WOS._ALIASES = { pulse:'dashboard', reading:'search', topics:'sources' };

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
  const a = WOS.Store.analytics() || {};
  const counts = { dashboard:'', flow:'', composition:'', landscape:'', clusters: (a.clusters&&a.clusters.k)||'', search:'⌘K', sources: WOS.Store.sources().length };
  const groups = [];
  WOS.VIEWS.forEach(v => {
    let g = groups[groups.length-1];
    if (!g || g.name !== v.group){ g = { name: v.group, views: [] }; groups.push(g); }
    g.views.push(v);
  });
  nav.innerHTML = groups.map(g =>
    (g.name ? `<div class="sidebar-label">${g.name}</div>` : '') + g.views.map(v =>
      `<a href="#${v.id}" data-view="${v.id}"><span class="nav-icon">${WOS.icon(v.icon,16)}</span><span>${v.label}</span>${counts[v.id]!==''?`<span class="nav-count">${counts[v.id]}</span>`:''}</a>`
    ).join('')
  ).join('');
};

WOS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v=this.getHash(); if(v) this.navigate(v); });
};
WOS.getHash = () => location.hash.slice(1);

WOS.navigate = function (view) {
  if (WOS._ALIASES[view]) view = WOS._ALIASES[view];
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
    if (e.key==='Escape'){ WOS.CommandPalette.close(); WOS.scratchpad.close(); WOS.closeModal(); }
  });
};

WOS.setupHeader = function () {
  document.getElementById('btnBack')?.addEventListener('click', ()=>window.history.back());
  document.getElementById('btnExport')?.addEventListener('click', ()=>WOS.exportData());
  document.getElementById('btnDocs')?.addEventListener('click', ()=>WOS.openDocs());
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

WOS.openDocs = function () {
  document.getElementById('modalTitle').textContent = 'WOS — General World Observation System';
  document.getElementById('modalBody').innerHTML = WOS.docsHTML();
  document.getElementById('appModal').classList.remove('hidden');
};
WOS.closeModal = () => document.getElementById('appModal')?.classList.add('hidden');

WOS.docsHTML = function () {
  const binds = WOS.VIEWS.map(v=>`<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" onclick="WOS.closeModal()" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Purpose</h4>
    <p>A sense-making dashboard over what <strong>other agents</strong> say about the world — comments, posts and news collected from free feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT). Every item is stored as an <em>observational</em> event in CouchDB; the instruments here turn that stream into orientation.</p>
    <h4>The instruments</h4>
    <p><strong>Dashboard</strong> orients — volume over time, spikes, and what is hot now. <strong>Flow</strong> is the stream graph (a timeline of ribbons by source). <strong>Composition</strong> shows how the stream splits across sources and semantic clusters. <strong>Landscape</strong> maps the vocabulary (word cloud ⇄ treemap) and term co-occurrence. <strong>Clusters</strong> groups items by meaning via a local embedding model. <strong>Search</strong> is the ground-truth observation stream. <strong>Sources</strong> lists the configured poll specs.</p>
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
