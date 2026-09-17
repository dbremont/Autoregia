/* ════════════════════════════════════════════════════════════
   WOS Cluster Profiles — semantic topic clusters from a local
   embedding model (fastembed MiniLM/BGE-small), lexical
   fallback. Each card is a discovered topic's profile; click to
   read its members.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Clusters = (() => {
  const v = WOS.view;
  function render(){
    const a = WOS.Store.analytics()||{};
    const cl = (a.clusters&&a.clusters.clusters)||[];
    const meta = a.clusters||{};
    const backend = WOS.Store.clustersMeta().backend || meta.backend || '—';
    const cards = cl.map(c=>{
      const terms = (c.top_terms||[]).slice(0,6).map(t=>`<span class="pill gold">${t}</span>`).join(' ');
      const src = Object.entries(c.sources||{}).map(([k,n])=>`<span class="text-xs text-muted">${k} ${n}</span>`).join(' · ');
      const samples = (c.sample||[]).slice(0,2).map(s=>`<div class="cluster-sample"> ${WOS.esc(s.title||'(no title)')} <a class="text-xs" href="${s.url}" target="_blank" rel="noopener" aria-label="Open in new tab">↗</a></div>`).join('');
      return `<div class="card cluster-card animate-in" data-cluster="${c.cluster_id}">
        <div class="card-header"><div><span class="eyebrow">${c.cluster_id} · ${c.count} items</span><h3>${WOS.esc(c.label)}</h3></div>
          <button class="btn btn-secondary btn-sm" data-cluster="${c.cluster_id}">Read</button></div>
        <div class="card-body">
          <div class="cluster-terms">${terms}</div>
          ${samples?`<div class="cluster-samples">${samples}</div>`:''}
        </div>
        <div class="card-footer">${src}</div>
      </div>`;
    }).join('') || '<div class="empty-state"><h3>No clusters yet</h3><p>Run the clusterer to group the stream into semantic clusters.</p></div>';
    return `
      ${v.header('Cluster Profiles', `<button class="btn btn-primary btn-sm" id="btnRecluster">${WOS.icon('refresh',15)} Recompute</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The corpus grouped into clusters by a local embedding model — no data leaves the machine. Clusters are labelled by their most characteristic terms.</p>
      <div class="stat-row animate-in">
        ${v.statCard(meta.k||0,'clusters')}
        ${v.statCard(meta.unassigned||0,'unassigned')}
        ${v.statCard(backend,'backend','var(--color-accent)')}
      </div>
      <div class="cluster-grid">${cards}</div>`;
  }
  function afterRender(){
    document.querySelectorAll('.cluster-card button[data-cluster]').forEach(b=>{
      b.addEventListener('click', ()=>WOS.applyFilter({cluster:b.dataset.cluster, topic:null, source:null}));
    });
    document.getElementById('btnRecluster')?.addEventListener('click', async ()=>{
      WOS.toast('Clustering… (first run downloads the model)');
      try{
        await WOS.Store.recomputeClusters();
        await WOS.Store.loadClustersMeta();
        await WOS.Store.loadAnalytics();
        WOS.navigate('clusters'); WOS.renderSidebar();
        WOS.toast('Clusters updated');
      }catch(e){ WOS.toast('Clustering failed: '+e); }
    });
  }
  return { render, afterRender };
})();
