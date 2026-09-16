/* ════════════════════════════════════════════════════════════
   WOS Flow — the stream graph (themeRiver) over time. The
   "timeline" view: ribbons flow left→right by day, one per
   source.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Flow = (() => {
  const v = WOS.view;
  function buildRows(items){
    const byKeyDay = {};
    const names = new Set();
    items.forEach(o=>{
      const day = o.observed_at_ms ? new Date(o.observed_at_ms).toISOString().slice(0,10) : null;
      if(!day) return;
      const k = o.source||'?';
      names.add(k); const id=k+'|'+day; byKeyDay[id]=(byKeyDay[id]||0)+1;
    });
    const rows = Object.entries(byKeyDay).map(([id,n])=>{ const [k,d]=id.split('|'); return [d,n,k]; });
    return { rows, names: [...names].sort() };
  }
  function render(){
    return `
      ${v.header('Flow', v.windowSeg())}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">A stream graph of the signal over time — ribbon thickness is volume. Read it left to right to see when and where the conversation swells.</p>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">stream graph</span><h3>Volume by source</h3></div></div>
        <div class="chart-box" id="chartFlow" style="height:420px"></div>
      </div>`;
  }
  function afterRender(){
    const C = WOS.Charts;
    const { rows, names } = buildRows(WOS.Store.observations());
    C.streamGraph('chartFlow', rows, { names });
    if(!rows.length){ document.getElementById('chartFlow').innerHTML='<div class="empty-state">no observations in this window</div>'; }
  }
  return { render, afterRender };
})();
