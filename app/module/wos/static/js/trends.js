/* ════════════════════════════════════════════════════════════
   WOS Trend Detection — "What is rising right now?"
   Rising terms (24h vs 7-day baseline), sources running hot,
   and the daily lines of the top risers. Click a term to read
   it in context.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Trends = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];
  const dotColor = (s) => PALETTE[[...s].reduce((h,c)=>h+c.charCodeAt(0),0) % PALETTE.length];

  function render(){
    return `
      ${v.header('Trend Detection')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>What is rising right now?</strong> Terms accelerating in the last 24 hours against their 7-day baseline, and feeds running hot. Click a term to read it in context.</p>
      <div class="stat-row animate-in" id="trendStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">24h vs 7-day baseline</span><h3>Rising terms</h3></div></div>
          <div id="trendTerms" class="ov-topics" style="min-height:120px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">heat vs baseline</span><h3>Running hot</h3></div></div>
          <div id="trendHot" style="min-height:120px"></div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">top risers · daily</span><h3>The climb, day by day</h3></div></div>
        <div class="chart-box" id="chartRisers" style="height:300px"></div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const terms = (a.trending||[]).slice(0,12);
    const hot = (a.hot_now||[]).slice(0,8);
    document.getElementById('trendStats').innerHTML =
      v.statCard(terms.length, 'terms rising') +
      v.statCard(terms.length ? terms[0].name : '—', 'top riser', 'var(--color-accent)') +
      v.statCard(hot.length ? hot[0].name : '—', 'hottest feed') +
      v.statCard(hot.length ? '×'+hot[0].heat : '—', 'top heat');

    const th = document.getElementById('trendTerms');
    if(!terms.length){ th.innerHTML = '<div class="empty-state">no rising terms yet — wait for the next polls</div>'; }
    else {
      const max = terms[0].value||1;
      th.innerHTML = terms.map((t,i)=>`<div class="ov-topic-row" data-term="${WOS.esc(t.name)}" role="button" tabindex="0" title="read in context">
        <span class="ov-topic-name">${WOS.esc(t.name)}</span>
        <span class="ov-topic-bar"><i style="width:${Math.max(4,Math.round(t.value/max*100))}%;background:${PALETTE[i%PALETTE.length]}"></i></span>
        <b>${t.recent}</b><i class="ov-topic-pct">base ${t.baseline}</i></div>`).join('');
      th.querySelectorAll('[data-term]').forEach(r=>r.addEventListener('click',()=>WOS.applyFilter({q:r.dataset.term})));
    }

    const hh = document.getElementById('trendHot');
    if(!hot.length){ hh.innerHTML = '<div class="empty-state">no heat signals yet</div>'; }
    else hh.innerHTML = hot.map(h=>`<div class="ov-link-row"><span class="ov-lg-dot" style="background:${dotColor(h.name)}"></span>
        <span class="ov-link-name">${WOS.esc(h.name)}</span><b>×${h.heat}</b> <i class="ov-topic-pct">${h.value} items / 24h</i></div>`).join('');

    // daily lines of the top risers (fall back to the overall top terms)
    const tv = a.term_volume||{};
    const riserNames = terms.slice(0,3).map(t=>t.name);
    let series = riserNames.map(n=>(tv.series||[]).find(s=>s.name===n)).filter(Boolean);
    if(!series.length) series = (tv.series||[]).slice(0,3);
    const chost = document.getElementById('chartRisers');
    if(!series.length){ chost.innerHTML = '<div class="empty-state">not enough history yet — lines appear as days accumulate</div>'; return; }
    WOS.Charts.line('chartRisers',
      series.map(s=>({ name:s.name, area:true, data: tv.buckets.map((b,i)=>({x:b, y:s.data[i]})) })),
      { yName:'items' });
  }
  return { render, afterRender };
})();
