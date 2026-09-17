/* ════════════════════════════════════════════════════════════
   WOS Topic Evolution — "How is the vocabulary shifting?"
   Top terms tracked day by day, with the window's risers and
   fallers ranked (last-bucket vs first-bucket deltas).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Evolution = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];

  function render(){
    return `
      ${v.header('Topic Evolution')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>How is the vocabulary shifting?</strong> The stream's top terms, day by day — rising lines are words entering the conversation, falling lines are topics fading.</p>
      <div class="stat-row animate-in" id="evoStats"></div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">top terms · daily</span><h3>Term frequency over time</h3></div></div>
        <div class="chart-box" id="chartEvolution" style="height:360px"></div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">window delta ↑</span><h3>Risers</h3></div></div>
          <div id="evoRisers" style="min-height:80px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">window delta ↓</span><h3>Fallers</h3></div></div>
          <div id="evoFallers" style="min-height:80px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const tv = (WOS.Store.analytics()||{})['term_volume']||{};
    const host = document.getElementById('chartEvolution');
    const rowsEl = (id)=>document.getElementById(id);
    if(!(tv.series||[]).length){
      host.innerHTML = '<div class="empty-state">no terms yet — wait for the next polls</div>';
      rowsEl('evoRisers').innerHTML = rowsEl('evoFallers').innerHTML = '';
      document.getElementById('evoStats').innerHTML = '';
      return;
    }
    const delta = tv.series.map(s=>({ name:s.name,
      d: (s.data[s.data.length-1]||0) - (s.data[0]||0),
      first: s.data[0]||0, last: s.data[s.data.length-1]||0 }));
    const risers = [...delta].sort((x,y)=>y.d-x.d).slice(0,5);
    const fallers = [...delta].sort((x,y)=>x.d-y.d).slice(0,5);
    document.getElementById('evoStats').innerHTML =
      v.statCard(delta.length, 'terms tracked') +
      v.statCard(risers[0] ? risers[0].name : '—', 'fastest riser', 'var(--color-accent)') +
      v.statCard(fallers[0] ? fallers[0].name : '—', 'sharpest faller') +
      v.statCard(tv.buckets.length, 'days in view');

    WOS.Charts.line('chartEvolution',
      tv.series.map(s=>({ name:s.name, data: tv.buckets.map((b,i)=>({x:b, y:s.data[i]})) })),
      { yName:'items' });

    const rows = (list, dir)=>list.length ? list.map((r,i)=>{
      const max = Math.max(...list.map(x=>Math.abs(x.d)),1);
      const label = dir>0 ? `+${r.d}` : `${r.d}`;
      return `<div class="ov-topic-row" data-term="${WOS.esc(r.name)}" role="button" tabindex="0">
        <span class="ov-topic-name">${WOS.esc(r.name)}</span>
        <span class="ov-topic-bar"><i style="width:${Math.max(4,Math.round(Math.abs(r.d)/max*100))}%;background:${dir>0?PALETTE[0]:'#8C877B'}"></i></span>
        <b>${label}</b><i class="ov-topic-pct">${r.first}→${r.last}</i></div>`;
    }).join('') : '<div class="empty-state">flat window — no movement</div>';
    rowsEl('evoRisers').innerHTML = rows(risers, +1);
    rowsEl('evoFallers').innerHTML = rows(fallers, -1);
    document.querySelectorAll('#evoRisers [data-term], #evoFallers [data-term]').forEach(r=>
      r.addEventListener('click',()=>WOS.applyFilter({q:r.dataset.term})));
  }
  return { render, afterRender };
})();
