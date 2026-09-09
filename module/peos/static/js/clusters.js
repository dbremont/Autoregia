/* ════════════════════════════════════════════════════════════
   PEOS Clusters — semantic topic clusters from a local embedding
   model (fastembed MiniLM/BGE-small), lexical fallback. Each card
   is a discovered topic; click to read its members.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Clusters = (() => {
  const v = PEOS.view;
  function render(){
    const a = PEOS.Store.analytics()||{};
    const cl = (a.clusters&&a.clusters.clusters)||[];
    const meta = a.clusters||{};
    const backend = PEOS.Store.clustersMeta().backend || meta.backend || '—';
    const cards = cl.map(c=>{
      const terms = (c.top_terms||[]).slice(0,6).map(t=>`<span class="pill gold">${t}</span>`).join(' ');
      const src = Object.entries(c.sources||{}).map(([k,n])=>`<span class="text-xs text-muted">${k} ${n}</span>`).join(' · ');
      const samples = (c.sample||[]).slice(0,2).map(s=>`<div class="cluster-sample"> ${PEOS.esc(s.title||'(no title)')} <a class="text-xs" href="${s.url}" target="_blank">↗</a></div>`).join('');
      return `<div class="card cluster-card animate-in" data-cluster="${c.cluster_id}">
        <div class="card-header"><div><span class="eyebrow">${c.cluster_id} · ${c.count} items</span><h3>${PEOS.esc(c.label)}</h3></div>
          <button class="btn btn-secondary btn-sm" data-cluster="${c.cluster_id}">Read</button></div>
        <div class="card-body">
          <div class="cluster-terms">${terms}</div>
          ${samples?`<div class="cluster-samples">${samples}</div>`:''}
        </div>
        <div class="card-footer">${src}</div>
      </div>`;
    }).join('') || '<div class="empty-state"><h3>No clusters yet</h3><p>Run the clusterer to group the stream into semantic topics.</p></div>';
    return `
      ${v.header('discovered topics','Clusters', `<button class="btn btn-primary btn-sm" id="btnRecluster">${PEOS.icon('refresh',15)} Recompute</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The corpus grouped into topics by a local embedding model — no data leaves the machine. Clusters are labelled by their most characteristic terms.</p>
      <div class="stat-row animate-in">
        ${v.statCard(meta.k||0,'clusters')}
        ${v.statCard(meta.unassigned||0,'unassigned')}
        ${v.statCard(backend,'backend','var(--color-accent)')}
      </div>
      <div class="cluster-grid">${cards}</div>`;
  }
  function afterRender(){
    document.querySelectorAll('.cluster-card button[data-cluster]').forEach(b=>{
      b.addEventListener('click', ()=>PEOS.applyFilter({cluster:b.dataset.cluster, topic:null, source:null}));
    });
    document.getElementById('btnRecluster')?.addEventListener('click', async ()=>{
      PEOS.toast('Clustering… (first run downloads the model)');
      try{
        await PEOS.Store.recomputeClusters();
        await PEOS.Store.loadClustersMeta();
        await PEOS.Store.loadAnalytics();
        PEOS.navigate('clusters'); PEOS.renderSidebar();
        PEOS.toast('Clusters updated');
      }catch(e){ PEOS.toast('Clustering failed: '+e); }
    });
  }
  return { render, afterRender };
})();
