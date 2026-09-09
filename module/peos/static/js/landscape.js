/* ════════════════════════════════════════════════════════════
   PEOS Landscape — the vocabulary of the stream.
   Word cloud ⇄ treemap of top terms/bigrams (toggle), and a
   term co-occurrence force graph (the conceptual landscape).
   Click any word to filter Reading.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Landscape = (() => {
  const v = PEOS.view;
  let mode = 'cloud';     // 'cloud' | 'treemap'
  let grams = 'terms';    // 'terms' | 'bigrams'
  function items(){
    const a = PEOS.Store.analytics()||{};
    const arr = grams==='bigrams' ? (a.top_bigrams||[]) : (a.top_terms||[]);
    return arr.filter(t=>t.value>=2).slice(0,120).map(t=>({name:t.name,value:t.value}));
  }
  function render(){
    return `
      ${v.header('lexicon','Landscape', `<div class="seg" id="landMode">
        <button class="seg-btn ${mode==='cloud'?'active':''}" data-m="cloud">word cloud</button>
        <button class="seg-btn ${mode==='treemap'?'active':''}" data-m="treemap">treemap</button>
      </div><div class="seg" id="landGrams">
        <button class="seg-btn ${grams==='terms'?'active':''}" data-g="terms">terms</button>
        <button class="seg-btn ${grams==='bigrams'?'active':''}" data-g="bigrams">bigrams</button>
      </div>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The vocabulary people are using. Area is frequency; the co-occurrence graph shows which words travel together (drag the nodes).</p>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">${grams}</span><h3>Top ${grams}</h3></div><div class="chart-sub">click a word to read it in context</div></div>
        <div class="chart-box" id="chartLex" style="height:340px"></div>
      </div>
      ${v.chartCard('chartGraph','co-occurrence','Term landscape','edges = words appearing together')}
    </div>`;
  }
  function afterRender(){
    const C = PEOS.Charts;
    const it = items();
    C.onClick('wordCloud', (name)=>PEOS.applyFilter({q:name}));
    C.onClick('treemap', (name)=>PEOS.applyFilter({q:name}));
    if(!it.length){ document.getElementById('chartLex').innerHTML='<div class="empty-state">no terms yet</div>'; }
    else if(mode==='cloud') C.wordCloud('chartLex', it);
    else C.treemap('chartLex', it);
    const a = PEOS.Store.analytics()||{};
    const g = a.cooccurrence||{nodes:[],links:[]};
    C.onClick('graph', (name)=>PEOS.applyFilter({q:name}));
    if(g.nodes.length) C.graph('chartGraph', g.nodes, g.links);
    else document.getElementById('chartGraph').innerHTML='<div class="empty-state">not enough shared vocabulary yet</div>';
    // toggles
    document.querySelectorAll('#landMode .seg-btn').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.m;PEOS.navigate('landscape');}));
    document.querySelectorAll('#landGrams .seg-btn').forEach(b=>b.addEventListener('click',()=>{grams=b.dataset.g;PEOS.navigate('landscape');}));
  }
  return { render, afterRender };
})();
