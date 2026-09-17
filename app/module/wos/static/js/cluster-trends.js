/* ════════════════════════════════════════════════════════════
   WOS Cluster Trends Over Time — "Which topics are growing?"
   Per-cluster membership per time bucket (stacked), the
   fastest-growing cluster, and the emerging shortlist.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.ClusterTrends = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Cluster Trends Over Time')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Which topics are growing?</strong> Membership of each discovered topic per bucket — ribbon thickness is items assigned to the cluster. Needs clustered data.</p>
      <div class="stat-row animate-in" id="ctStats"></div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">per cluster · per bucket</span><h3>Cluster membership over time</h3></div></div>
        <div class="chart-box" id="chartClusterTrends" style="height:360px"></div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">24h vs baseline</span><h3>Emerging shortlist</h3></div></div>
        <div id="ctEmerging" style="min-height:60px"></div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const cv = a.cluster_volume||{};
    const host = document.getElementById('chartClusterTrends');
    if(!(cv.series||[]).length){
      host.innerHTML = `<div class="empty-state"><h3>No cluster trends yet</h3><p>Run Recompute on Profiles, then wait for new arrivals to accumulate.</p></div>`;
      document.getElementById('ctStats').innerHTML = '';
      document.getElementById('ctEmerging').innerHTML = '';
      return;
    }
    const growth = cv.series.map(s=>({ name:s.name,
      d: (s.data[s.data.length-1]||0) - (s.data[0]||0) }));
    const top = [...growth].sort((x,y)=>y.d-x.d)[0];
    const em = (a.emerging_clusters||[]).slice(0,5);
    document.getElementById('ctStats').innerHTML =
      v.statCard(cv.series.length, 'clusters tracked') +
      v.statCard(top ? top.name : '—', 'fastest growing', 'var(--color-accent)') +
      v.statCard(top ? '+'+top.d : '—', 'its window growth') +
      v.statCard(em.length, 'emerging now');

    WOS.Charts.stackedArea('chartClusterTrends', cv.buckets,
      cv.series.map(s=>({ name:s.name, data:s.data })), { yName:'items' });

    document.getElementById('ctEmerging').innerHTML = em.length ? em.map(r=>
      `<div class="ov-link-row"><span class="ov-link-name">${WOS.esc(r.label)}</span>
        <span class="ov-topic-pct">${r.recent} new / 24h</span><b>×${r.score}</b></div>`).join('')
      : '<div class="empty-state">nothing emerging above baseline right now</div>';
  }
  return { render, afterRender };
})();
