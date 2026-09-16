/* ════════════════════════════════════════════════════════════
   WOS Composition — how the stream is made up.
   Source donut and cluster distribution. Every node filters
   Search on click.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Composition = (() => {
  const v = WOS.view;
  function render(){
    return `
      ${v.header('Composition', v.windowSeg())}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">Where the signal comes from and how it groups — the donut splits by source, the bars by semantic cluster.</p>
      <div class="chart-grid-2">
        ${v.chartCard('chartDonut','share','By source','click a slice')}
        ${v.chartCard('chartCluster','semantics','By cluster','')}
      </div>`;
  }
  function afterRender(){
    const C = WOS.Charts;
    const a = WOS.Store.analytics()||{};
    // source donut
    const src = a.sources||{};
    const donutData = Object.entries(src).map(([k,n])=>({name:k,value:n}));
    C.onClick('donut', (name)=>WOS.applyFilter({source:name}));
    if(donutData.length) C.donut('chartDonut', donutData);
    // cluster distribution
    const cl = (a.clusters&&a.clusters.clusters)||[];
    if(cl.length) C.hbar('chartCluster', cl.slice(0,10).map(c=>({label:c.label, value:c.count})));
  }
  return { render, afterRender };
})();
