/* PRS App — Main Application, Router, View Switching */
const PRS = window.PRS || {};

PRS.init = async function() {
  await PRS.Store.load();
  this.currentView = 'dashboard';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.renderTypeNav();
  PRS.Store.subscribe(() => { this.renderTypeNav(); });
  this.navigate(this.getHashView() || 'dashboard');
};

PRS.setupRouter = function() {
  window.addEventListener('hashchange', () => {
    const v = this.getHashView(); if (v) this.navigate(v);
  });
};
PRS.getHashView = function() { return location.hash.slice(1) || 'dashboard'; };

PRS.navigate = function(view) {
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.sidebar-nav a[data-view="${view}"]`);
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  switch(view) {
    case 'dashboard':   c.innerHTML = PRS.Dashboard.render(); break;
    case 'records':     c.innerHTML = PRS.record.renderList(); break;
    case 'timeline':    c.innerHTML = PRS.Timeline.render(); break;
    case 'heatmap':     c.innerHTML = PRS.Heatmap.render(); break;
    case 'graph':       c.innerHTML = PRS.Graph.render(); break;
    case 'study':       c.innerHTML = PRS.Study.render(); break;
    case 'summary':     c.innerHTML = PRS.Summary.render(); break;
    case 'calendar':    c.innerHTML = PRS.Complementary.renderCalendar(); break;
    case 'suggestions': c.innerHTML = PRS.Complementary.renderSuggestions(); break;
    case 'export':      c.innerHTML = PRS.Complementary.renderExport(); break;
    default:            c.innerHTML = PRS.Dashboard.render();
  }
  setTimeout(()=>{
    if (view==='heatmap') PRS.Heatmap.renderSVG();
    if (view==='graph') PRS.Graph.renderSVG();
    if (view==='study') PRS.Study.renderBody();
    if (view==='summary') PRS.Summary.renderBody();
    if (view==='dashboard') {
      const t=document.getElementById('chartByType'),s=document.getElementById('chartByStatus');
      if(t) PRS.Charts.bar('chartByType',PRS.Store.getStats().byType);
      if(s) PRS.Charts.donut('chartByStatus',PRS.Store.getStats().byStatus);
    }
  },50);
};

PRS.setupGlobalSearch = function() {
  const input = document.getElementById('globalSearch'); let timer;
  input.addEventListener('input',(e)=>{ clearTimeout(timer); timer=setTimeout(()=>{
    const q=e.target.value.trim(); if(q.length>1){
      if(this.currentView!=='records') this.navigate('records');
      setTimeout(()=>PRS.Search.applyFilter(q),50);
    }
  },250);});
  input.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();PRS.CommandPalette.open(input.value);input.blur();}});
};

PRS.setupKeyboard = function() {
  document.addEventListener('keydown',(e)=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();PRS.CommandPalette.open('');}
    if(e.key==='n'&&!isInputFocused()){e.preventDefault();PRS.record.openEditor();}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='N'){e.preventDefault();PRS.scratchpad.open();}
    if(e.key==='Escape'){PRS.CommandPalette.close();PRS.scratchpad.close();PRS.record.closeModal();PRS.record.closeDetail();}
  });
};
function isInputFocused(){const t=document.activeElement?.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||document.activeElement?.contentEditable==='true';}

PRS.renderTypeNav = function(){
  const stats=PRS.Store.getStats(),nav=document.getElementById('typeNav');
  if(!nav)return;
  nav.innerHTML=Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).map(([t,c])=>
    `<li><a href="#records" data-view="records" data-type="${t}" onclick="PRS.record.filterByType('${t}')"><span class="nav-icon"><prs-icon name="circle-dot" size="15"></prs-icon></span>${t}<span class="sidebar-count">${c}</span></a></li>`
  ).join('');
};

PRS.setupHeaderButtons=function(){
  document.getElementById('btnNewRecord')?.addEventListener('click',()=>PRS.record.openEditor());
  document.getElementById('btnScratchpad')?.addEventListener('click',()=>PRS.scratchpad.open());
};
