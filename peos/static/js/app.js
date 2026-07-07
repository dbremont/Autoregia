/* ════════════════════════════════════════════════════════════
   PEOS App — sidebar router, window selector, keyboard, chrome.
   The click→filter bus: any chart that wires PEOS.Charts.onClick
   ends in PEOS.applyFilter(), which updates Store state and sends
   the user to Reading with the filter applied.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
const PEOS = window.PEOS;

PEOS.VIEWS = [
  { id:'pulse',       label:'Pulse',        icon:'activity',    desc:'volume, spikes, what is hot now' },
  { id:'flow',        label:'Flow',         icon:'waves',       desc:'stream graph over time' },
  { id:'composition', label:'Composition',  icon:'git-branch',  desc:'topic → source make-up' },
  { id:'landscape',   label:'Landscape',    icon:'network',     desc:'words & co-occurrence' },
  { id:'clusters',    label:'Clusters',     icon:'layers',      desc:'semantic topic clusters' },
  { id:'reading',     label:'Reading',      icon:'list',        desc:'the signal stream' },
  { id:'topics',      label:'Topics',       icon:'tag',         desc:'watched feeds' },
];

PEOS.init = async function () {
  try { await PEOS.Store.load(); } catch(e){ console.error('load failed', e); }
  this.current = 'pulse';
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.setupWindow();
  this.navigate(this.getHash() || 'pulse');
};

PEOS.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const a = PEOS.Store.analytics() || {};
  const counts = { pulse:'', flow:'', composition:'', landscape:'', clusters: (a.clusters&&a.clusters.k)||'', reading: PEOS.Store.observations().length, topics: PEOS.Store.topics().length };
  nav.innerHTML = `<div class="sidebar-label">Instruments</div>` + PEOS.VIEWS.map(v =>
    `<a href="#${v.id}" data-view="${v.id}"><span class="nav-icon">${PEOS.icon(v.icon,16)}</span><span>${v.label}</span>${counts[v.id]!==''?`<span class="nav-count">${counts[v.id]}</span>`:''}</a>`
  ).join('');
};

PEOS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v=this.getHash(); if(v) this.navigate(v); });
};
PEOS.getHash = () => location.hash.slice(1);

PEOS.navigate = function (view) {
  this.current = view; location.hash = '#'+view;
  document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.toggle('active', a.dataset.view===view));
  const c = document.getElementById('appContent');
  const cap = view.charAt(0).toUpperCase()+view.slice(1);
  c.innerHTML = (PEOS[cap] && PEOS[cap].render) ? PEOS[cap].render() : `<div class="empty-state"><h3>Unknown view</h3></div>`;
  setTimeout(()=>{ if(PEOS[cap]&&PEOS[cap].afterRender) PEOS[cap].afterRender(); this.setupWindow(); this.bindMeta(); this.updateFooter(); }, 40);
};

PEOS.updateFooter = function () {
  const fw = document.getElementById('footerWindow');
  if (fw){ const w = PEOS.Store.getWindow(); fw.textContent = w? (w>=168?(w/24)+'d':w+'h') : 'All'; }
  const fm = document.getElementById('footerFilter');
  if (fm){ const s = PEOS.Store.filterSummary(); fm.textContent = s?('filter: '+s):'no filter'; }
};

// ── click→filter bus ──
PEOS.applyFilter = async function (patch) {
  await PEOS.Store.applyFilter(patch);
  this.renderSidebar();
  this.navigate('reading');
};

PEOS.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k'){ e.preventDefault(); PEOS.CommandPalette.open(''); }
    if ((e.metaKey||e.ctrlKey) && e.shiftKey && (e.key==='N'||e.key==='n')){ e.preventDefault(); PEOS.scratchpad.open(); }
    if (e.key==='Escape'){ PEOS.CommandPalette.close(); PEOS.scratchpad.close(); PEOS.closeModal(); }
  });
};

PEOS.setupHeader = function () {
  document.getElementById('btnExport')?.addEventListener('click', ()=>PEOS.exportData());
  document.getElementById('btnDocs')?.addEventListener('click', ()=>PEOS.openDocs());
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); PEOS.Store.applyFilter({q: gs.value.trim()}); PEOS.renderSidebar(); PEOS.navigate('reading'); } });
};

PEOS.setupWindow = function () {
  const seg = document.getElementById('windowSeg');
  if (seg) seg.querySelectorAll('button').forEach(x=>x.classList.toggle('active', parseInt(x.dataset.h,10)===PEOS.Store.getWindow()));
  if (PEOS._windowBound) return; PEOS._windowBound=true;
  document.body.addEventListener('click', (e)=>{
    const b = e.target.closest('#windowSeg button'); if(!b) return;
    PEOS.Store.setWindow(parseInt(b.dataset.h,10));
    // reload analytics for the new window, then re-render
    PEOS.Store.loadAnalytics().then(()=>{ PEOS.Store.loadObservations().then(()=>{ PEOS.navigate(PEOS.current); PEOS.renderSidebar(); }); });
  });
};

PEOS.exportData = function () {
  const blob = new Blob([JSON.stringify({analytics:PEOS.Store.analytics(), observations:PEOS.Store.observations(), topics:PEOS.Store.topics()}, null, 2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='peos_export.json'; a.click();
};

PEOS.openDocs = function () {
  document.getElementById('modalTitle').textContent = 'PEOS — Personal External Observation System';
  document.getElementById('modalBody').innerHTML = PEOS.docsHTML();
  document.getElementById('appModal').classList.remove('hidden');
};
PEOS.closeModal = () => document.getElementById('appModal')?.classList.add('hidden');

PEOS.docsHTML = function () {
  const binds = PEOS.VIEWS.map(v=>`<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" onclick="PEOS.closeModal()" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Purpose</h4>
    <p>A sense-making dashboard over what <strong>other agents</strong> say about the world — comments, posts and news collected from free feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT). Every item is stored as an <em>observational</em> event in CouchDB; the instruments here turn that stream into orientation.</p>
    <h4>The instruments</h4>
    <p><strong>Pulse</strong> orients — volume over time, spikes, and what is hot now. <strong>Flow</strong> is the stream graph (a timeline of ribbons by source/topic/cluster). <strong>Composition</strong> shows how each topic splits across sources (sankey). <strong>Landscape</strong> maps the vocabulary (word cloud ⇄ treemap) and term co-occurrence. <strong>Clusters</strong> groups items into semantic topics via a local embedding model. <strong>Reading</strong> is the ground-truth stream. <strong>Topics</strong> manages the watched feeds.</p>
    <h4>The click→filter bus</h4>
    <p>Click almost any chart element (a source wedge, a sankey node, a cluster card, a word) to filter the Reading stream. It is how the charts stop being decoration and start being sense.</p>
    <h4>Navigation</h4><div class="kbd-grid">${binds}</div>
    <h4>Shortcuts</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
      <div class="kbd-row"><span>Quick capture</span><span><span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span></span></div>
      <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
    </div>
  </div>`;
};

PEOS.bindMeta = function () {
  document.querySelectorAll('.meta-section-header').forEach(h=>{
    if(h.dataset.bound) return; h.dataset.bound='1';
    h.addEventListener('click', ()=>h.parentElement.classList.toggle('open'));
  });
};

PEOS.esc = function(s){ if(s==null) return ''; const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; };
PEOS.fmtTime = (ms) => ms ? new Date(ms).toISOString().slice(0,16).replace('T',' ') : '';

document.addEventListener('DOMContentLoaded', ()=>{
  const seg = document.getElementById('windowSeg');
  if(seg) seg.querySelectorAll('button').forEach(b=>b.classList.toggle('active', parseInt(b.dataset.h,10)===168));
  PEOS.init();
});
