/* ════════════════════════════════════════════════════════════
   WOS Sources — the configured poll specs (seed-file managed,
   read-only here). Cards are paginated to fill the viewport:
   rows × columns are measured from the live layout so a page
   displays without scrolling. Editing the set = edit
   config/seed.json.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Sources = (() => {
  const v = WOS.view;
  const MIN_ROWS = 1;
  const SAFETY = 8;                 // px slack so rounding never overflows
  let page = 0, rows = 0, cols = 1; // rows 0 = not fitted yet (render all once)
  let resizeBound = false;

  const pageSize = () => rows * cols;
  const total = () => (WOS.Store.sources() || []).length;
  const pageCount = () => (rows ? Math.max(1, Math.ceil(total() / pageSize())) : 1);

  async function pollNow(id){
    WOS.toast('Polling…');
    try{
      await fetch(`./api/poll`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,force:true})});
      await WOS.Store.loadAnalytics(); await WOS.Store.loadObservations();
      WOS.renderSidebar(); WOS.toast('Polled');
    }catch(e){WOS.toast('Poll failed');}
  }

  function clampPage(){
    const pc = pageCount();
    if (page >= pc) page = pc - 1;
    if (page < 0) page = 0;
  }

  function sliceSpecs(){
    const specs = WOS.Store.sources() || [];
    if (!rows) return specs;                       // pre-fit: show all once
    clampPage();
    return specs.slice(page * pageSize(), (page + 1) * pageSize());
  }

  function render(){
    const specs = sliceSpecs();
    const cards = specs.map(s=>{
      const en = s.enabled!==false;
      return `<div class="card topic-card animate-in${en?'':' is-disabled'}">
        <div class="card-header"><div><span class="eyebrow">${s.source}</span><h3>${WOS.esc(s.query)}</h3></div>
          <div class="topic-actions">
            <button class="btn btn-secondary btn-sm" data-poll="${WOS.esc(s.id)}">${WOS.icon('refresh',14)} poll</button>
          </div></div>
        <div class="card-footer">${WOS.esc(s.id)} · ${s.interval_s?s.interval_s+'s':'auto'}${en?'':' · disabled'}</div>
      </div>`;
    }).join('') || '<div class="empty-state"><h3>No sources configured</h3></div>';
    const pc = pageCount();
    const pager = (rows && pc > 1) ? `<div class="pager animate-in" id="srcPager">
        <button class="btn btn-secondary btn-sm" id="srcPrev" ${page>0?'':'disabled'}>‹ prev</button>
        <span class="results-meta">page ${page+1} of ${pc} · ${total()} sources</span>
        <button class="btn btn-secondary btn-sm" id="srcNext" ${page<pc-1?'':'disabled'}>next ›</button>
      </div>` : '';
    return `
      ${v.header('watched feeds','Sources')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The configured poll specs (${total()}). The set is managed in <code class="text-mono">config/seed.json</code> — this panel is read-only. Query semantics are source-specific: X handle (Nitter), search string (HN/Lobsters/GDELT), subreddit (Reddit), hashtag (Mastodon), feed URL (RSS).</p>
      <div class="topic-grid animate-in" id="srcGrid">${cards}</div>
      ${pager}`;
  }

  // ── viewport fit: measure rows × columns from the live layout so the
  // grid + pager exactly fill .app-main (the scroll container). Called from
  // afterRender; adopting a new size re-renders, and the nested fit pass
  // re-measures with the real pager present — converging in ≤2 passes.
  function measure(){
    const grid = document.getElementById('srcGrid');
    const main = document.querySelector('.app-main');
    if (!grid || !main) return null;
    const cards = grid.querySelectorAll('.topic-card');
    if (!cards.length) return null;
    const mainRect = main.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const pager = document.getElementById('srcPager');
    const above = (gridRect.top - mainRect.top) + main.scrollTop;
    const avail = main.clientHeight - above
      - (pager ? pager.offsetHeight + 12 : 0)
      - (parseFloat(getComputedStyle(main).paddingBottom) || 0)
      - SAFETY;
    if (avail <= 0) return null;
    const c = getComputedStyle(grid).gridTemplateColumns
      .split(' ').filter(Boolean).length || 1;
    const gcs = getComputedStyle(grid);
    const gap = parseFloat(gcs.rowGap) || parseFloat(gcs.gap) || 0;
    // max over a sample: cards are near-uniform, but a wrapped title can be taller
    let cardH = 0;
    for (const cd of [...cards].slice(0, 12)) cardH = Math.max(cardH, cd.offsetHeight);
    cardH += gap;
    if (cardH <= 0) return null;
    const r = Math.max(MIN_ROWS, Math.floor((avail + gap) / cardH));
    return { cols: c, rows: r };
  }

  function fit(){
    const m = measure();
    if (!m) return;
    if (m.cols === cols && m.rows === rows) return;  // settled
    const first = page * (pageSize() || m.cols * m.rows);
    cols = m.cols; rows = m.rows;
    page = Math.floor(first / pageSize());
    clampPage();
    WOS.navigate('sources');          // re-render → nested afterRender → fit() settles
  }

  function afterRender(){
    document.querySelectorAll('[data-poll]').forEach(b=>b.addEventListener('click',()=>pollNow(b.dataset.poll)));
    document.getElementById('srcPrev')?.addEventListener('click',()=>{ page--; clampPage(); WOS.navigate('sources'); });
    document.getElementById('srcNext')?.addEventListener('click',()=>{ page++; clampPage(); WOS.navigate('sources'); });
    if (!resizeBound) {
      resizeBound = true;
      let t = null;
      window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(fit, 150); });
    }
    fit();
  }
  return { render, afterRender };
})();
