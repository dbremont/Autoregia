/* MAD App — Main Application, Router, View Switching */
const MAD = window.MAD || {};

MAD.init = async function() {
  await MAD.Store.load();
  this.currentView = 'dashboard';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.renderTypeNav();
  MAD.Store.subscribe(() => { this.renderTypeNav(); });
  const rm = location.hash.match(/^#record=(.+)$/);
  this.navigate(rm ? 'records' : (this.getHashView() || 'dashboard'));
  if (rm) {
    history.replaceState(null, '', '#record=' + rm[1]);
    MAD.record.showDetail(decodeURIComponent(rm[1]));
  }
};

MAD.setupRouter = function() {
  window.addEventListener('hashchange', () => {
    const rm = location.hash.match(/^#record=(.+)$/);
    if (rm) { MAD.record.showDetail(decodeURIComponent(rm[1])); return; }
    const v = this.getHashView(); if (v) this.navigate(v);
  });
};
MAD.getHashView = function() { return location.hash.slice(1) || 'dashboard'; };

MAD.navigate = function(view) {
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.sidebar-nav a[data-view="${view}"]`);
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  switch(view) {
    case 'dashboard':   c.innerHTML = MAD.Dashboard.render(); break;
    case 'records':     c.innerHTML = MAD.record.renderList(); break;
    case 'working':     c.innerHTML = MAD.Working.render(); break;
    case 'timeline':    c.innerHTML = MAD.Timeline.render(); break;
    case 'heatmap':     c.innerHTML = MAD.Heatmap.render(); break;
    case 'graph':       c.innerHTML = MAD.Graph.render(); break;
    case 'study':       c.innerHTML = MAD.Study.render(); break;
    case 'summary':     c.innerHTML = MAD.Summary.render(); break;
    case 'calendar':    c.innerHTML = MAD.Complementary.renderCalendar(); break;
    case 'suggestions': c.innerHTML = MAD.Complementary.renderSuggestions(); break;
    case 'export':      c.innerHTML = MAD.Complementary.renderExport(); break;
    default:            c.innerHTML = MAD.Dashboard.render();
  }
  setTimeout(()=>{
    if (view==='heatmap') MAD.Heatmap.renderSVG();
    if (view==='graph') MAD.Graph.renderSVG();
    if (view==='study') MAD.Study.renderBody();
    if (view==='summary') MAD.Summary.renderBody();
    if (view==='working') MAD.Working.afterRender();
    if (view==='dashboard') {
      const t=document.getElementById('chartByType'),s=document.getElementById('chartByStatus');
      if(t) MAD.Charts.bar('chartByType',MAD.Store.getStats().byType);
      if(s) MAD.Charts.donut('chartByStatus',MAD.Store.getStats().byStatus);
    }
  },50);
};

MAD.setupGlobalSearch = function() {
  const input = document.getElementById('globalSearch'); let timer;
  input.addEventListener('input',(e)=>{ clearTimeout(timer); timer=setTimeout(()=>{
    const q=e.target.value.trim(); if(q.length>1){
      if(this.currentView!=='records') this.navigate('records');
      setTimeout(()=>MAD.Search.applyFilter(q),50);
    }
  },250);});
  input.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();MAD.CommandPalette.open(input.value);input.blur();}});
};

MAD.setupKeyboard = function() {
  document.addEventListener('keydown',(e)=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();MAD.CommandPalette.open('');}
    if(e.key==='n'&&!isInputFocused()&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.shiftKey){e.preventDefault();MAD.record.openEditor();}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='N'){e.preventDefault();MAD.scratchpad.open();}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&(e.key==='W'||e.key==='w')){e.preventDefault();MAD.navigate('working');}
    if(e.key==='/'&&!isInputFocused()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();document.getElementById('globalSearch')?.focus();}
    if(e.key==='Escape'){MAD.CommandPalette.close();MAD.scratchpad.close();MAD.record.closeModal();MAD.record.closeDetail();const wm=document.getElementById('wmReviewModal');if(wm)wm.classList.add('hidden');}
  });
};
function isInputFocused(){const t=document.activeElement?.tagName;return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||document.activeElement?.contentEditable==='true';}

MAD.toast = function(msg) { window.AUTOREGIA && AUTOREGIA.toast(msg, { id: 'toast' }); };

MAD.renderTypeNav = function(){
  const stats=MAD.Store.getStats(),nav=document.getElementById('typeNav');
  if(!nav)return;
  nav.innerHTML=Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).map(([t,c])=>
    `<li><a href="#records" data-view="records" data-type="${t}" onclick="MAD.record.filterByType('${t}')"><span class="nav-icon"><mad-icon name="circle-dot" size="15"></mad-icon></span>${t}<span class="sidebar-count">${c}</span></a></li>`
  ).join('');
};

MAD.setupHeaderButtons=function(){
  document.getElementById('btnNewRecord')?.addEventListener('click',()=>MAD.record.openEditor());
  document.getElementById('btnScratchpad')?.addEventListener('click',()=>MAD.scratchpad.open());
};
