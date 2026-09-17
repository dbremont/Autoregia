/* ════════════════════════════════════════════════════════════
   WOS Word Cloud — "What is everyone talking about?"
   The vocabulary as a cloud, beside its ranked list and the
   phrases (bigrams) people use. Click any term to filter.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Wordcloud = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];

  function render(){
    return `
      ${v.header('Word Cloud')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>What is everyone talking about?</strong> The vocabulary of the stream — area is frequency; words and phrases are clickable.</p>
      <div class="stat-row animate-in" id="wcStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">terms</span><h3>The cloud</h3></div></div>
          <div class="chart-box" id="chartWordCloud" style="height:420px"></div>
        </div>
        <div>
          <div class="chart-card">
            <div class="chart-head"><div><span class="eyebrow">ranked</span><h3>Top terms</h3></div></div>
            <div id="wcList" class="ov-topics" style="min-height:120px"></div>
          </div>
          <div class="chart-card">
            <div class="chart-head"><div><span class="eyebrow">phrases</span><h3>Top bigrams</h3></div></div>
            <div id="wcBigrams" style="min-height:80px"></div>
          </div>
        </div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const terms = (a.top_terms||[]).filter(t=>t.value>=2).slice(0,120);
    const bigrams = (a.top_bigrams||[]).slice(0,8);
    const total = (a.top_terms||[]).reduce((s,t)=>s+t.value,0)||1;
    document.getElementById('wcStats').innerHTML =
      v.statCard(terms.length, 'terms in view') +
      v.statCard(terms.length ? terms[0].name : '—', 'dominant term', 'var(--color-accent)') +
      v.statCard(terms.length ? Math.round(terms[0].value/total*100)+'%' : '—', 'its share of usage') +
      v.statCard(bigrams.length, 'notable phrases');

    const host = document.getElementById('chartWordCloud');
    if(!terms.length){
      host.innerHTML = '<div class="empty-state">no terms yet — wait for the next polls</div>';
      document.getElementById('wcList').innerHTML = document.getElementById('wcBigrams').innerHTML = '';
      return;
    }
    const list = document.getElementById('wcList');
    const max = terms[0].value;
    list.innerHTML = terms.slice(0,10).map((t,i)=>`<div class="ov-topic-row" data-term="${WOS.esc(t.name)}" role="button" tabindex="0">
      <span class="ov-topic-name">${WOS.esc(t.name)}</span>
      <span class="ov-topic-bar"><i style="width:${Math.max(4,Math.round(t.value/max*100))}%;background:${PALETTE[i%PALETTE.length]}"></i></span>
      <b>${t.value}</b></div>`).join('');
    const bg = document.getElementById('wcBigrams');
    bg.innerHTML = bigrams.length ? bigrams.map(b=>`<div class="ov-link-row" data-term="${WOS.esc(b.name)}" role="button" tabindex="0">
      <span class="ov-link-name">${WOS.esc(b.name)}</span><b>${b.value}</b></div>`).join('')
      : '<div class="empty-state">no repeated phrases yet</div>';
    document.querySelectorAll('#wcList [data-term], #wcBigrams [data-term]').forEach(r=>
      r.addEventListener('click',()=>WOS.applyFilter({q:r.dataset.term})));
    WOS.Charts.onClick('wordCloud', (name)=>WOS.applyFilter({q:name}));
    WOS.Charts.wordCloud('chartWordCloud', terms);
  }
  return { render, afterRender };
})();
