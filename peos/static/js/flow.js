/* ════════════════════════════════════════════════════════════
   PEOS Flow — the stream graph (themeRiver) over time. The
   "timeline" view: ribbons flow left→right by day, one per
   source or topic. Switch the dimension with the segmented control.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Flow = (() => {
  const v = PEOS.view;
  let dim = 'source';
  function buildRows(items){
    const byKeyDay = {};
    const names = new Set();
    items.forEach(o=>{
      const day = o.observed_at_ms ? new Date(o.observed_at_ms).toISOString().slice(0,10) : null;
      if(!day) return;
      const keys = dim==='source' ? [o.source||'?'] : (o.topics && o.topics.length ? o.topics : ['(untagged)']);
      keys.forEach(k=>{ names.add(k); const id=k+'|'+day; byKeyDay[id]=(byKeyDay[id]||0)+1; });
    });
    const rows = Object.entries(byKeyDay).map(([id,n])=>{ const [k,d]=id.split('|'); return [d,n,k]; });
    return { rows, names: [...names].sort() };
  }
  function render(){
    return `
      ${v.header('temporal','Flow', `<div class="seg" id="flowDim">
        <button class="seg-btn ${dim==='source'?'active':''}" data-d="source">by source</button>
        <button class="seg-btn ${dim==='topic'?'active':''}" data-d="topic">by topic</button>
      </div>` + v.windowSeg())}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">A stream graph of the signal over time — ribbon thickness is volume. Read it left to right to see when and where the conversation swells.</p>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">stream graph</span><h3>Volume by ${dim}</h3></div></div>
        <div class="chart-box" id="chartFlow" style="height:420px"></div>
      </div>`;
  }
  function afterRender(){
    const C = PEOS.Charts;
    const { rows, names } = buildRows(PEOS.Store.observations());
    C.streamGraph('chartFlow', rows, { names });
    if(!rows.length){ document.getElementById('chartFlow').innerHTML='<div class="empty-state">no observations in this window</div>'; }
    // dimension toggle
    document.querySelectorAll('#flowDim .seg-btn').forEach(b=>{
      b.addEventListener('click', ()=>{ dim = b.dataset.d; PEOS.navigate('flow'); });
    });
  }
  return { render, afterRender };
})();
