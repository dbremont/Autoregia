/* ════════════════════════════════════════════════════════════
   PEOS Composition — how the stream is made up.
   topic → source sankey (the composition), source donut, and
   cluster distribution. Every node filters Reading on click.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Composition = (() => {
  const v = PEOS.view;
  function render(){
    return `
      ${v.header('make-up','Composition', v.windowSeg())}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">How each topic splits across news versus discussion — the sankey shows the flow from what you watch to where it is being said.</p>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">flow</span><h3>Topic → Source</h3></div><div class="chart-sub">click a node to read it</div></div>
        <div class="chart-box" id="chartSankey" style="height:380px"></div>
      </div>
      <div class="chart-grid-2">
        ${v.chartCard('chartDonut','share','By source','click a slice')}
        ${v.chartCard('chartCluster','topics','By cluster','')}
      </div>`;
  }
  function afterRender(){
    const C = PEOS.Charts;
    const a = PEOS.Store.analytics()||{};
    const sk = a.sankey || {nodes:[],links:[]};
    // tag nodes with category so the click handler knows topic vs source
    const topics = new Set(sk.topics||[]);
    const nodes = sk.nodes.map(n=>({name:n.name, category: topics.has(n.name)?'topic':'source'}));
    C.onClick('sankey', (name, cat)=>PEOS.applyFilter(cat==='topic'?{topic:name,source:null}:{source:name,topic:null}));
    if(sk.links.length) C.sankey('chartSankey', nodes, sk.links);
    else document.getElementById('chartSankey').innerHTML='<div class="empty-state">no data</div>';
    // source donut
    const src = a.sources||{};
    const donutData = Object.entries(src).map(([k,n])=>({name:k,value:n}));
    C.onClick('donut', (name)=>PEOS.applyFilter({source:name}));
    if(donutData.length) C.donut('chartDonut', donutData);
    // cluster distribution
    const cl = (a.clusters&&a.clusters.clusters)||[];
    if(cl.length) C.hbar('chartCluster', cl.slice(0,10).map(c=>({label:c.label, value:c.count})));
  }
  return { render, afterRender };
})();
