/* ════════════════════════════════════════════════════════════
   PKTS App — Main Application, Tab Router, Keyboard Shortcuts
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
const PKTS = window.PKTS;

PKTS.init = async function() {
  await PKTS.Store.load();
  this.currentTab = 'overview';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.setupMetaSections();
  this.navigate(this.getHash() || 'overview');
};

PKTS.TABS = [
  { id:'overview',   label:'Overview',            icon:'gauge' },
  { id:'signature',  label:'Behavioral Signature',icon:'fingerprint' },
  { id:'temporal',   label:'Temporal Dynamics',   icon:'activity' },
  { id:'composition',label:'Composition Process', icon:'pencil-line' },
  { id:'cognitive',  label:'Cognitive State',     icon:'brain' },
  { id:'workflow',   label:'Workflow & Expertise',icon:'workflow' },
  { id:'telemetry',  label:'Raw Telemetry',       icon:'database' },
];

PKTS.setupRouter = function() {
  window.addEventListener('hashchange', () => { const v=this.getHash(); if(v) this.navigate(v); });
};
PKTS.getHash = function() { return location.hash.slice(1) || 'overview'; };

PKTS.navigate = function(tab) {
  this.currentTab = tab; location.hash = '#' + tab;
  document.querySelectorAll('.tab-bar a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.tab-bar a[data-tab="${tab}"]`);
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  switch(tab) {
    case 'overview':   c.innerHTML = PKTS.Overview.render(); break;
    case 'signature':  c.innerHTML = PKTS.Signature.render(); break;
    case 'temporal':   c.innerHTML = PKTS.Temporal.render(); break;
    case 'composition':c.innerHTML = PKTS.Composition.render(); break;
    case 'cognitive':  c.innerHTML = PKTS.Cognitive.render(); break;
    case 'workflow':   c.innerHTML = PKTS.Workflow.render(); break;
    case 'telemetry':  c.innerHTML = PKTS.Telemetry.render(); break;
    default:           c.innerHTML = PKTS.Overview.render();
  }
  setTimeout(() => { const v=cap(tab); if (PKTS[v]?.afterRender) PKTS[v].afterRender(); this.setupMetaSections(); }, 40);
};
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

PKTS.setupGlobalSearch = function() {
  const input = document.getElementById('globalSearch'); if(!input) return;
  input.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); PKTS.CommandPalette.open(input.value); input.blur(); }});
};

PKTS.setupKeyboard = function() {
  document.addEventListener('keydown',(e)=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){ e.preventDefault(); PKTS.CommandPalette.open(''); }
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='N'){ e.preventDefault(); PKTS.scratchpad.open(); }
    if(e.key==='Escape'){ PKTS.CommandPalette.close(); PKTS.scratchpad.close(); PKTS.closeModal(); }
  });
};

PKTS.setupHeaderButtons = function() {
  document.getElementById('btnScratchpad')?.addEventListener('click',()=>PKTS.scratchpad.open());
  document.getElementById('btnExport')?.addEventListener('click',()=>PKTS.exportData());
  document.getElementById('btnBindings')?.addEventListener('click',()=>PKTS.openDocs('bindings'));
  document.getElementById('btnDocs')?.addEventListener('click',()=>PKTS.openDocs('docs'));
};

PKTS.openDocs = function(kind) {
  const body = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = kind==='bindings' ? 'Keyword Bindings' : 'PKTS Documentation';
  body.innerHTML = kind==='bindings' ? this.bindingsHTML() : this.docsHTML();
  document.getElementById('appModal').classList.remove('hidden');
};
PKTS.closeModal = function() { document.getElementById('appModal')?.classList.add('hidden'); };

PKTS.docsHTML = function() {
  return `<div class="docs-prose">
    <h4>Purpose</h4>
    <p>The Personal Keyword Tracking System is a behavioral telemetry laboratory: it exposes temporal dynamics, workflow structures, cognitive-state indicators, and identity-level signatures derived from a keystroke stream conforming to the shared <code>KeystrokeEvent</code> schema.</p>
    <h4>Artifact Model</h4>
    <p>Each tab presents <em>concrete epistemic artifacts</em> — scalar metrics, distributions, matrices, trajectories, and graphs — that encode a distinct facet of the dataset. Every artifact is computed live from the raw telemetry.</p>
    <h4>Data</h4>
    <p>This prototype runs on deterministically generated mock data (<code>data/mock_keystrokes.json</code>) spanning multiple sessions. Regenerate with <code>python3 pkts/data/gen_mock.py</code>.</p>
    <h4>Shortcuts</h4>
    <div class="kbd-grid">
      <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
      <div class="kbd-row"><span>Quick capture</span><span><span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span></span></div>
      <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
    </div>
  </div>`;
};
PKTS.bindingsHTML = function() {
  const tabs = PKTS.TABS.map(t=>`<div class="kbd-row"><span>${t.label}</span><span><a href="#${t.id}" onclick="PKTS.closeModal()" style="font-family:var(--font-mono);font-size:var(--text-xs);">#${t.id}</a></span></div>`).join('');
  return `<div class="docs-prose">
    <h4>Navigation Bindings</h4>
    <div class="kbd-grid">${tabs}</div>
    <h4>Legend</h4>
    <p>Each tab maps to a concrete analytical surface. Use the command palette (<span class="kbd">Ctrl</span> <span class="kbd">K</span>) for instant navigation.</p>
  </div>`;
};

PKTS.exportData = function() {
  const blob = new Blob([JSON.stringify({sessions:PKTS.Store.getSessions(), events:PKTS.Store.getEvents()},null,2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pkts_export.json'; a.click();
};

PKTS.setupMetaSections = function() {
  document.querySelectorAll('.meta-section-header').forEach(h=>{
    if(h.dataset.bound) return; h.dataset.bound='1';
    h.addEventListener('click',()=>h.parentElement.classList.toggle('open'));
  });
};

PKTS.esc = function(s){ if(s==null)return''; const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; };
