/* ════════════════════════════════════════════════════════════
   WOS Clustering Projection — "How do topics organize in
   semantic space?" Every clustered item in 2-D (PCA of the
   clustering matrix, computed at Recompute time), beside the
   cluster size ranking. Colour is the cluster; click to read.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.ClusterProjection = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434','#962030','#C7A972','#2D6A4F','#3F6092'];

  function render(){
    return `
      ${v.header('Clustering Projection', `<button class="btn btn-primary btn-sm" id="btnReproject">${WOS.icon('refresh',15)} Recompute</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>How do topics organize in semantic space?</strong> The corpus projected to two dimensions from the clusterer's matrix — neighbours in the plane are semantic neighbours; colour is the discovered cluster.</p>
      <div class="stat-row animate-in" id="projStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">PCA 2-D</span><h3>Items by cluster</h3></div></div>
          <div class="chart-box" id="chartProjection" style="height:440px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">sizes</span><h3>Cluster sizes</h3></div></div>
          <div class="chart-box" id="projSizes" style="min-height:240px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    document.getElementById('btnReproject')?.addEventListener('click', async ()=>{
      WOS.toast('Clustering… (first run downloads the model)');
      try{
        await WOS.Store.recomputeClusters();
        WOS.navigate('cluster-analysis/projection');
        WOS.toast('Clusters updated');
      }catch(e){ WOS.toast('Clustering failed: '+e); }
    });
    const host = document.getElementById('chartProjection');
    fetch('./api/clusters').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(cd=>{
      const proj = cd.projection||{};
      const assigns = cd.assignments||{};
      const pts = Object.entries(proj);
      const sizes = cd.meta&&cd.meta.sizes ? Object.entries(cd.meta.sizes) : [];
      const labelFor = {};
      Object.values(assigns).forEach(a=>labelFor[a.cluster_id] = a.label || a.cluster_id);
      document.getElementById('projStats').innerHTML =
        v.statCard(cd.k||0, 'clusters') +
        v.statCard(pts.length, 'items projected') +
        v.statCard((cd.meta&&cd.meta.backend)||'—', 'backend', 'var(--color-accent)') +
        v.statCard(pts.length ? Math.round(pts.length/((cd.meta&&cd.meta.n)||pts.length||1)*100)+'%' : '—', 'of corpus');
      const sizesHost = document.getElementById('projSizes');
      if(!pts.length){
        host.innerHTML = `<div class="empty-state"><h3>No projection yet</h3><p>Recompute the clusters — the projection is built from the clustering matrix.</p></div>`;
        sizesHost.innerHTML = '';
        return;
      }
      if(sizes.length) WOS.Charts.hbar('projSizes',
        sizes.sort((x,y)=>y[1]-x[1]).map(([cid,n])=>({ label:labelFor[cid]||cid, value:n })));
      if(!window.echarts){ return; }
      host.innerHTML = '';
      const cids = [...new Set(Object.values(assigns).map(a=>a.cluster_id))].sort();
      const ch = echarts.init(host, null, { renderer:'canvas' });
      ch.setOption({
        textStyle: { fontFamily:'Inter, sans-serif' },
        tooltip: { formatter: (p)=>`${WOS.esc(labelFor[p.data.cid]||p.data.cid)}<br>obs ${WOS.esc(p.data.obs)}` },
        legend: { data: cids.map(c=>labelFor[c]||c), top: 0, type: 'scroll' },
        xAxis: { show:false, min:-1.1, max:1.1 }, yAxis: { show:false, min:-1.1, max:1.1 },
        series: cids.map((cid, i)=>({
          name: labelFor[cid]||cid, type:'scatter', symbolSize: 9,
          itemStyle:{ color: PALETTE[i%PALETTE.length], opacity: 0.75 },
          data: pts.filter(([obs])=>assigns[obs] && assigns[obs].cluster_id===cid)
                   .map(([obs,[x,y]])=>({ value:[x,y], obs, cid })),
        })),
      });
      ch.on('click', (p)=>{ if(p.data && p.data.cid) WOS.applyFilter({cluster:p.data.cid}); });
    }).catch(()=>{
      host.innerHTML = '<div class="empty-state">could not reach the store</div>';
    });
  }
  return { render, afterRender };
})();
