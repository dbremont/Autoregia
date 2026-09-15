/* PBS App — Main Application, Router, View Switching */
const PBS = window.PBS || {};

PBS.init = async function() {
  await PBS.Store.load();
  this.currentView = 'dashboard';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.renderTypeNav();
  PBS.Store.subscribe(() => { this.renderTypeNav(); });
  this.navigate(this.getHashView() || 'dashboard');
};

PBS.setupRouter = function() {
  window.addEventListener('hashchange', () => {
    const v = this.getHashView(); if (v) this.navigate(v);
  });
};
PBS.getHashView = function() { return location.hash.slice(1) || 'dashboard'; };

PBS.navigate = function(view) {
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.sidebar-nav a[data-view="${view}"]`);
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  switch(view) {
    case 'dashboard':   c.innerHTML = PBS.Dashboard.render(); break;
    case 'records':     c.innerHTML = PBS.record.renderList(); break;
    case 'working':     c.innerHTML = PBS.Working.render(); break;
    case 'timeline':    c.innerHTML = PBS.Timeline.render(); break;
    case 'heatmap':     c.innerHTML = PBS.Heatmap.render(); break;
    case 'graph':       c.innerHTML = PBS.Graph.render(); break;
    case 'study':       c.innerHTML = PBS.Study.render(); break;
    case 'summary':     c.innerHTML = PBS.Summary.render(); break;
    case 'calendar':    c.innerHTML = PBS.Complementary.renderCalendar(); break;
    case 'suggestions': c.innerHTML = PBS.Complementary.renderSuggestions(); break;
    case 'export':      c.innerHTML = PBS.Complementary.renderExport(); break;
    default:            c.innerHTML = PBS.Dashboard.render();
  }
  setTimeout(()=>{
    if (view==='heatmap') PBS.Heatmap.renderSVG();
    if (view==='graph') PBS.Graph.renderSVG();
    if (view==='study') PBS.Study.renderBody();
    if (view==='summary') PBS.Summary.renderBody();
    if (view==='working') PBS.Working.afterRender();
    if (view==='dashboard') {
      const t=document.getElementById('chartByType'),s=document.getElementById('chartByStatus');
      if(t) PBS.Charts.bar('chartByType',PBS.Store.getStats().byType);
      if(s) PBS.Charts.donut('chartByStatus',PBS.Store.getStats().byStatus);
    }
  },50);
};

PBS.setupGlobalSearch = function() {
  const input = document.getElementById('globalSearch'); let timer;
  input.addEventListener('input',(e)=>{ clearTimeout(timer); timer=setTimeout(()=>{
    const q=e.target.value.trim(); if(q.length>1){
      if(this.currentView!=='records') this.navigate('records');
      setTimeout(()=>PBS.Search.applyFilter(q),50);
    }
  },250);});
  input.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();PBS.CommandPalette.open(input.value);input.blur();}});
};

PBS.setupKeyboard = function() {
  document.addEventListener('keydown',(e)=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();PBS.CommandPalette.open('');}
    if(e.key==='n'&&!isInputFocused()){e.preventDefault();PBS.record.openEditor();}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='N'){e.preventDefault();PBS.scratchpad.open();}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='W'||e.key==='w')){e.preventDefault();PBS.navigate('working');}
    if(e.key==='Escape'){PBS.CommandPalette.close();PBS.scratchpad.close();PBS.record.closeModal();PBS.record.closeDetail();const wm=document.getElementById('wmReviewModal');if(wm)wm.classList.add('hidden');}
  });
};
function isInputFocused(){const t=document.activeElement?.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||document.activeElement?.contentEditable==='true';}

PBS.renderTypeNav = function(){
  const stats=PBS.Store.getStats(),nav=document.getElementById('typeNav');
  if(!nav)return;
  nav.innerHTML=Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).map(([t,c])=>
    `<li><a href="#records" data-view="records" data-type="${t}" onclick="PBS.record.filterByType('${t}')"><span class="nav-icon"><pbs-icon name="circle-dot" size="15"></pbs-icon></span>${t}<span class="sidebar-count">${c}</span></a></li>`
  ).join('');
};

PBS.setupHeaderButtons=function(){
  document.getElementById('btnNewRecord')?.addEventListener('click',()=>PBS.record.openEditor());
  document.getElementById('btnScratchpad')?.addEventListener('click',()=>PBS.scratchpad.open());
};
