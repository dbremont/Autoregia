/* ════════════════════════════════════════════════════════════
   WOS Source Treemap — "Where does the stream come from?"
   Sources as rectangles (area = share of the corpus), beside a
   ranked share list and concentration stats.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Treemap = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Source Treemap')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Where does the stream come from?</strong> Each source's share of the corpus as area — concentration here means a narrow worldview.</p>
      <div class="stat-row animate-in" id="tmStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">sources</span><h3>Share of the stream</h3></div></div>
          <div class="chart-box" id="chartTreemap" style="height:400px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">ranked</span><h3>Top sources</h3></div></div>
          <div class="chart-box" id="tmList" style="min-height:200px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const items = Object.entries(a.sources||{}).map(([name,value])=>({name, value}))
      .sort((x,y)=>y.value-x.value);
    const total = items.reduce((s,i)=>s+i.value,0)||1;
    document.getElementById('tmStats').innerHTML =
      v.statCard(items.length, 'active sources') +
      v.statCard(items.length ? items[0].name : '—', 'largest contributor', 'var(--color-accent)') +
      v.statCard(items.length ? Math.round(items[0].value/total*100)+'%' : '—', 'its share') +
      v.statCard(total, 'observations');

    const host = document.getElementById('chartTreemap');
    if(!items.length){
      host.innerHTML = '<div class="empty-state">no observations yet — wait for the next polls</div>';
      document.getElementById('tmList').innerHTML = '';
      return;
    }
    WOS.Charts.onClick('treemap', (name)=>WOS.applyFilter({source:name}));
    WOS.Charts.treemap('chartTreemap', items);
    WOS.Charts.hbar('tmList', items.slice(0,10).map(i=>({ label:i.name, value:i.value })));
  }
  return { render, afterRender };
})();
