/* ════════════════════════════════════════════════════════════
   WOS Geography Lens — "Where on earth is the signal?"
   Observations by origin region (GDELT items), with coverage
   stats. Other sources do not geolocate.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Geo = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];
  const REGION_COORDS = {
    'North America': [40, -100], 'Europe': [52, 12], 'Asia': [35, 90],
    'Latin America': [-15, -60], 'Africa': [2, 20], 'Oceania': [-25, 140],
  };
  const charts = {};
  const mk = (id) => {
    const el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    if (charts[id]) { try { charts[id].dispose(); } catch {} }
    charts[id] = echarts.init(el, null, { renderer: 'canvas' });
    return charts[id];
  };

  function render(){
    return `
      ${v.header('Geography Lens')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Where on earth is the signal?</strong> Observations by origin region — the geographic spread of what the agent sees. Regions come from GDELT-collected items.</p>
      <div class="stat-row animate-in" id="geoStats"></div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">origin regions</span><h3>The world, by observation volume</h3></div></div>
        <div class="chart-box" id="chartGeo" style="height:380px"></div>
        <ul class="src-legend" id="geoLegend" style="padding:0 var(--space-4)"></ul>
      </div>`;
  }

  async function afterRender(){
    let mapReady = true;
    try{
      if(!echarts.getMap || !echarts.getMap('world')){
        const g = await fetch('js/vendor/world.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
        echarts.registerMap('world', g);
      }
    }catch(e){ mapReady = false; }
    const a = WOS.Store.analytics()||{};
    const regions = Object.entries(a.regions||{}).filter(([k])=>k && k!=='Unknown').sort((x,y)=>y[1]-x[1]);
    const total = regions.reduce((s,[,n])=>s+n, 0);
    const n = a.n||0;
    const pct = n ? Math.round(total/n*100) : 0;
    document.getElementById('geoStats').innerHTML =
      v.statCard(regions.length, 'regions present') +
      v.statCard(regions.length ? regions[0][0] : '—', 'loudest region', 'var(--color-accent)') +
      v.statCard(regions.length ? Math.round(regions[0][1]/(total||1)*100)+'%' : '—', 'its share of located') +
      v.statCard(pct+'%', 'corpus geocodable');
    const legend = document.getElementById('geoLegend');
    if(!total){
      legend.innerHTML = '<li class="ov-geo-none">No regional signals yet — origin regions come from GDELT-collected items.</li>';
      return;
    }
    legend.innerHTML = regions.slice(0,7).map(([name,n2],i)=>
      `<li><span class="src-lg-dot" style="background:${PALETTE[i%PALETTE.length]}"></span>
        <span class="src-lg-name">${WOS.esc(name)}</span><i>${Math.round(n2/total*100)}%</i></li>`).join('');
    const ch = mk('chartGeo');
    if(!ch || !mapReady) return;
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: { formatter: (p)=>`${p.name}: ${p.data.count||0}` },
      geo: { map: 'world', roam: false, silent: true, left: 0, right: 0, top: 8, bottom: 8,
        itemStyle: { areaColor: '#EFEBE1', borderColor: '#D8D2C4' } },
      series: [{ type: 'scatter', coordinateSystem: 'geo',
        data: regions.map(([name,n2])=>({ name, value: REGION_COORDS[name]||[0,0], count:n2 })),
        symbolSize: (_v,p)=>10 + 30*((p.data.count||0)/(total||1)),
        itemStyle: { color: '#7A1A2A', opacity: 0.75 } }],
    });
  }
  return { render, afterRender };
})();
