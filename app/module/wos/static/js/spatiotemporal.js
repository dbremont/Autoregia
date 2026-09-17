/* ════════════════════════════════════════════════════════════
   WOS Spatiotemporal Cluster Detection — "Where is each topic
   surfacing?" Clusters against origin regions (heatmap), the
   dominant region per cluster, and geocodable coverage.
   Regions come from GDELT items; needs clustered data.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Spatiotemporal = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Spatiotemporal Cluster Detection')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Where is each topic surfacing?</strong> Discovered clusters against origin regions — a topic concentrated in one region reads as a regional story. Regions come from GDELT items.</p>
      <div class="stat-row animate-in" id="spatioStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">cluster × region</span><h3>Where topics surface</h3></div></div>
          <div class="chart-box" id="chartSpatio" style="height:340px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">dominant region</span><h3>Per-cluster top region</h3></div></div>
          <div id="spatioList" style="min-height:120px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const rows = a.cluster_regions||[];
    const regions = new Set(rows.flatMap(r=>Object.keys(r.regions||{})).filter(r=>r!=='Unknown'));
    const n = a.n||0;
    const known = Object.entries(a.regions||{}).filter(([k])=>k!=='Unknown').reduce((s,[,v])=>s+v,0);
    const geocodable = n ? Math.round(known/n*100) : 0;
    document.getElementById('spatioStats').innerHTML =
      v.statCard(rows.length, 'clusters w/ geo') +
      v.statCard(regions.size, 'distinct regions') +
      v.statCard(geocodable+'%', 'geocodable corpus', 'var(--color-accent)') +
      v.statCard(known, 'located items');

    const host = document.getElementById('chartSpatio');
    const cells = [];
    rows.forEach(r=>Object.entries(r.regions||{}).forEach(([reg,n2])=>{
      if(reg!=='Unknown') cells.push({ cluster:r.label, region:reg, n:n2 });
    }));
    const list = document.getElementById('spatioList');
    if(!rows.length || !cells.length){
      host.innerHTML = `<div class="empty-state"><h3>No regional clusters yet</h3><p>Regions come from GDELT-collected items, and clusters require Recompute — run it on Profiles, then wait for geocodable items.</p></div>`;
      list.innerHTML = '';
      return;
    }
    const tops = rows.map(r=>{
      const entries = Object.entries(r.regions||{}).filter(([k])=>k!=='Unknown');
      const total = Object.values(r.regions||{}).reduce((s,x)=>s+x,0)||1;
      const top = entries.sort((x,y)=>y[1]-x[1])[0];
      return top ? { label:r.label, region:top[0], n:top[1], pct:Math.round(top[1]/total*100) } : null;
    }).filter(Boolean).slice(0,8);
    list.innerHTML = tops.map(t=>`<div class="ov-link-row"><span class="ov-link-name">${WOS.esc(t.region)}</span>
      <span class="ov-topic-pct">in ${WOS.esc(t.label)}</span><b>${t.pct}%</b></div>`).join('')
      || '<div class="empty-state">all items carry no region yet</div>';

    const clusters = [...new Set(cells.map(c=>c.cluster))];
    const regs = [...new Set(cells.map(c=>c.region))];
    const max = Math.max(...cells.map(c=>c.n), 1);
    if(!window.echarts){ return; }
    host.innerHTML = '';
    const ch = echarts.init(host, null, { renderer:'canvas' });
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: { position: 'top', formatter: (p)=>`${p.data[2]} items` },
      grid: { left: 150, right: 40, top: 16, bottom: 60 },
      xAxis: { type:'category', data: regs, axisLabel:{ rotate:30, fontFamily:'IBM Plex Mono', fontSize:9, color:'#8C877B' }, axisTick:{show:false} },
      yAxis: { type:'category', data: clusters, axisLabel:{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#8C877B' } },
      visualMap: { min:0, max, calculable:true, orient:'horizontal', left:'center', bottom:0,
        inRange:{ color:['#F6EFE1', '#7A1A2A'] }, textStyle:{ color:'#8C877B', fontSize:9 } },
      series: [{ type:'heatmap',
        data: cells.map(c=>[regs.indexOf(c.region), clusters.indexOf(c.cluster), c.n]),
        label:{ show:true, formatter:(p)=>p.data[2], fontSize:9, color:'#44413B' },
        itemStyle:{ borderColor:'#FFFFFF', borderWidth:2, borderRadius:2 } }],
    });
  }
  return { render, afterRender };
})();
