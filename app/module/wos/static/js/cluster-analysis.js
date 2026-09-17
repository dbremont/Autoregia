/* ════════════════════════════════════════════════════════════
   WOS Clustering Analysis — one route, five tabs (projection,
   profiles, trends, composition, similarity). Hosts the cluster
   view modules; deep-linkable: #cluster-analysis/<tab>.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.ClusterAnalysis = (() => {
  const TABS = [
    { id:'projection',  label:'Projection',  mod:'ClusterProjection' },
    { id:'profiles',    label:'Profiles',    mod:'Clusters' },
    { id:'trends',      label:'Trends',      mod:'ClusterTrends' },
    { id:'composition', label:'Composition', mod:'ClusterComposition' },
    { id:'similarity',  label:'Similarity',  mod:'ClusterSimilarity' },
  ];
  let active = 'projection';
  const modFor = (id) => WOS[(TABS.find(t=>t.id===id)||TABS[0]).mod];

  function render(sub){
    if (sub && TABS.some(t=>t.id===sub)) active = sub;
    return `<div class="seg ov-tabs animate-in" id="caTabStrip" role="tablist">${TABS.map(t=>
      `<button class="seg-btn${t.id===active?' active':''}" data-tab="${t.id}" role="tab" aria-selected="${t.id===active}">${t.label}</button>`).join('')}</div>
      <div id="caTabHost">${modFor(active).render()}</div>`;
  }

  function showTab(id){
    active = id;
    WOS.current = 'cluster-analysis/'+id;
    history.replaceState(null, '', '#cluster-analysis/'+id);
    document.querySelectorAll('#caTabStrip .seg-btn').forEach(x=>{
      x.classList.toggle('active', x.dataset.tab===id);
      x.setAttribute('aria-selected', x.dataset.tab===id);
    });
    const m = modFor(id);
    document.getElementById('caTabHost').innerHTML = m.render();
    m.afterRender();
  }

  function afterRender(sub){
    if (sub && TABS.some(t=>t.id===sub)) active = sub;
    document.querySelectorAll('#caTabStrip .seg-btn').forEach(b=>
      b.addEventListener('click', ()=>{ if(b.dataset.tab!==active) showTab(b.dataset.tab); }));
    modFor(active).afterRender();
  }
  return { render, afterRender };
})();
