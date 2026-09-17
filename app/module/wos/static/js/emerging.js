/* ════════════════════════════════════════════════════════════
   WOS Emerging Topic Detection — "Which topics are newly
   gaining members?" Cluster membership last 24h vs the 7-day
   baseline, plus the emerging clusters isolated on the time
   axis. Requires clusters (Recompute on Profiles).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Emerging = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Emerging Topic Detection')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Which topics are newly gaining members?</strong> Cluster assignments in the last 24 hours against the preceding week — small topics suddenly gathering items. Needs clustered data.</p>
      <div class="stat-row animate-in" id="emergingStats"></div>
      <div id="emergingList" style="min-height:120px"></div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">emerging clusters only</span><h3>Their membership over time</h3></div></div>
        <div class="chart-box" id="chartEmerging" style="height:300px"></div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const rows = (a.emerging_clusters||[]).slice(0,10);
    document.getElementById('emergingStats').innerHTML =
      v.statCard(rows.length, 'emerging topics') +
      v.statCard(rows.length ? '×'+rows[0].score : '—', 'top momentum', 'var(--color-accent)') +
      v.statCard(rows.length ? rows[0].recent : '—', 'new items / 24h (top)') +
      v.statCard((a.clusters&&a.clusters.unassigned)||0, 'unassigned items');

    const host = document.getElementById('emergingList');
    if(!rows.length){
      host.innerHTML = `<div class="empty-state"><h3>No emerging topics yet</h3><p>Either the stream is quiet, or nothing is clustered yet — run Recompute on Cluster Profiles.</p></div>`;
      document.getElementById('chartEmerging').innerHTML = '';
      return;
    }
    host.innerHTML = rows.map(r=>`<div class="card cluster-card animate-in" data-cluster="${WOS.esc(r.cluster_id)}" role="button" tabindex="0">
      <div class="card-header"><div><span class="eyebrow">${WOS.esc(r.cluster_id)} · ${r.recent} new / 24h (base ${r.baseline})</span><h3>${WOS.esc(r.label)}</h3></div>
        <span class="pill gold">×${r.score}</span></div></div>`).join('');
    host.querySelectorAll('[data-cluster]').forEach(c=>c.addEventListener('click',()=>WOS.applyFilter({cluster:c.dataset.cluster})));

    // isolate the emerging clusters on the time axis
    const cv = a.cluster_volume||{};
    const ids = new Set(rows.map(r=>r.cluster_id));
    const series = (cv.series||[]).filter(s=>ids.has(s.cluster_id));
    const chost = document.getElementById('chartEmerging');
    if(!series.length){ chost.innerHTML = '<div class="empty-state">not enough history yet</div>'; return; }
    WOS.Charts.stackedArea('chartEmerging', cv.buckets,
      series.map(s=>({ name:s.name, data:s.data })), { yName:'items' });
  }
  return { render, afterRender };
})();
