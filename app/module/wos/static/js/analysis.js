/* ════════════════════════════════════════════════════════════
   WOS Analysis Overview — one route, many tabs. Each tab is a
   dense mini-dashboard answering one question about the world;
   the tab modules own their content (this file only hosts them).
   Deep-linkable: #overview/<tab>.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Overview = (() => {
  const TABS = [
    { id:'trends',         label:'Trends',        mod:'Trends' },
    { id:'emerging',       label:'Emerging',      mod:'Emerging' },
    { id:'anomalies',      label:'Anomalies',     mod:'Anomalies' },
    { id:'spatiotemporal', label:'Spatiotemporal',mod:'Spatiotemporal' },
    { id:'evolution',      label:'Evolution',     mod:'Evolution' },
    { id:'wordcloud',      label:'Word Cloud',    mod:'Wordcloud' },
    { id:'recent',         label:'Recent',        mod:'Recent' },
    { id:'treemap',        label:'Sources',       mod:'Treemap' },
    { id:'flow',           label:'Flow',          mod:'Flow' },
    { id:'geo',            label:'Geography',     mod:'Geo' },
    { id:'composition',    label:'Composition',   mod:'Composition' },
  ];
  let active = 'trends';
  const modFor = (id) => WOS[(TABS.find(t=>t.id===id)||TABS[0]).mod];

  function render(sub){
    if (sub && TABS.some(t=>t.id===sub)) active = sub;
    return `<div class="seg ov-tabs animate-in" id="ovTabStrip" role="tablist">${TABS.map(t=>
      `<button class="seg-btn${t.id===active?' active':''}" data-tab="${t.id}" role="tab" aria-selected="${t.id===active}">${t.label}</button>`).join('')}</div>
      <div id="ovTabHost">${modFor(active).render()}</div>`;
  }

  function showTab(id){
    active = id;
    WOS.current = 'overview/'+id;
    history.replaceState(null, '', '#overview/'+id);
    document.querySelectorAll('#ovTabStrip .seg-btn').forEach(x=>{
      x.classList.toggle('active', x.dataset.tab===id);
      x.setAttribute('aria-selected', x.dataset.tab===id);
    });
    const m = modFor(id);
    document.getElementById('ovTabHost').innerHTML = m.render();
    m.afterRender();
  }

  function afterRender(sub){
    if (sub && TABS.some(t=>t.id===sub)) active = sub;
    document.querySelectorAll('#ovTabStrip .seg-btn').forEach(b=>
      b.addEventListener('click', ()=>{ if(b.dataset.tab!==active) showTab(b.dataset.tab); }));
    modFor(active).afterRender();
  }
  return { render, afterRender };
})();
