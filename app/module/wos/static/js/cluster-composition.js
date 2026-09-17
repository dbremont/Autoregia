/* ════════════════════════════════════════════════════════════
   WOS Cluster Composition — "Which feeds feed each topic?"
   Stacked columns (one per cluster, one segment per source)
   beside each cluster's dominant source.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.ClusterComposition = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Cluster Composition')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Which feeds feed each topic?</strong> The source make-up of every discovered cluster — a topic dominated by one feed is a lens worth questioning. Needs clustered data.</p>
      <div class="stat-row animate-in" id="ccStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">per cluster</span><h3>Source mix</h3></div></div>
          <div class="chart-box" id="chartClusterComp" style="height:360px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">dominant source</span><h3>Per-cluster leader</h3></div></div>
          <div id="ccList" style="min-height:120px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const clusters = (a.clusters&&a.clusters.clusters)||[];
    const host = document.getElementById('chartClusterComp');
    if(!clusters.length){
      host.innerHTML = `<div class="empty-state"><h3>No clusters yet</h3><p>Run Recompute on Profiles.</p></div>`;
      document.getElementById('ccStats').innerHTML = '';
      document.getElementById('ccList').innerHTML = '';
      return;
    }
    const srcs = [...new Set(clusters.flatMap(c=>Object.keys(c.sources||{})))].sort();
    document.getElementById('ccStats').innerHTML =
      v.statCard(clusters.length, 'clusters') +
      v.statCard(srcs.length, 'sources involved') +
      v.statCard(srcs.length ? srcs[0] : '—', 'most present source', 'var(--color-accent)') +
      v.statCard((a.clusters&&a.clusters.unassigned)||0, 'unassigned');

    WOS.Charts.stackedBar('chartClusterComp',
      clusters.map(c=>c.label||c.cluster_id),
      srcs.map(s=>({ name:s, data: clusters.map(c=>(c.sources||{})[s]||0) })),
      { yName:'items' });

    const list = clusters.map(c=>{
      const entries = Object.entries(c.sources||{}).sort((x,y)=>y[1]-x[1]);
      const total = entries.reduce((s,[,n])=>s+n,0)||1;
      const top = entries[0];
      return top ? { label:c.label||c.cluster_id, src:top[0], pct:Math.round(top[1]/total*100) } : null;
    }).filter(Boolean);
    document.getElementById('ccList').innerHTML = list.map(r=>
      `<div class="ov-link-row"><span class="ov-link-name">${WOS.esc(r.src)}</span>
        <span class="ov-topic-pct">leads ${WOS.esc(r.label)}</span><b>${r.pct}%</b></div>`).join('');
  }
  return { render, afterRender };
})();
