/* ════════════════════════════════════════════════════════════
   PEOS Search — the ground-truth stream, redesigned.
   A control strip (search bar + segmented controls + result
   meta), grouped facets, and a single refined reading column.
   Read/unread (localStorage by stable OBS id), thread dedup,
   term highlight, coarse tone tint. Every other instrument feeds
   into this view via the click→filter bus.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Search = (() => {
  const v = PEOS.view;
  let hideRead = false, dedup = true, sort = 'recent';
  let searching = false;

  function facets(){
    const obs = PEOS.Store.observations();
    const src = {}, top = {};
    obs.forEach(o=>{ src[o.source]=(src[o.source]||0)+1; (o.topics||['(untagged)']).forEach(t=>top[t]=(top[t]||0)+1); });
    return { src, top };
  }

  function hasFilters(){
    const st = PEOS.Store.getState();
    return !!(st.source || st.topic || st.cluster || st.q || st.term);
  }

  function chipBar(){
    const st = PEOS.Store.getState();
    const chips = [];
    if(st.source) chips.push(`<span class="filter-chip" data-clear="source">${st.source} ✕</span>`);
    if(st.topic) chips.push(`<span class="filter-chip" data-clear="topic">#${st.topic} ✕</span>`);
    if(st.cluster) chips.push(`<span class="filter-chip" data-clear="cluster">${st.cluster} ✕</span>`);
    if(st.q) chips.push(`<span class="filter-chip" data-clear="q">“${PEOS.esc(st.q)}” ✕</span>`);
    if(st.term) chips.push(`<span class="filter-chip" data-clear="term">${st.term} ✕</span>`);
    if(!chips.length) return '';
    return `<div class="filter-chips">${chips.join('')}
      <button class="btn btn-ghost btn-sm" id="clearAll">${PEOS.icon('refresh',13)} clear all</button>
    </div>`;
  }

  function renderItem(o){
    const tone = PEOS.Store.toneOf(o);
    const tcls = PEOS.Store.toneClass(tone);
    const read = PEOS.Store.isRead(o.id) ? 'read' : '';
    const title = o.title || o.body.slice(0,80) || '(no title)';
    const body = o.body && o.body.length>0 ? `<div class="read-body">${PEOS.Store.highlight(o.body.slice(0,280))}${o.body.length>280?'…':''}</div>` : '';
    const score = (o.score!=null) ? `<span class="text-faint">★ ${o.score}</span>` : '';
    const more = o._more ? `<span class="pill gold">+${o._more} more in thread</span>` : '';
    const dot = read ? '' : '<span class="unread-dot" title="unread"></span>';
    return `<div class="read-item ${read} ${tcls}" data-id="${o.id}">
      <div class="read-tone ${tcls}"></div>
      <div class="read-main">
        <div class="read-title">${dot}${PEOS.Store.highlight(title)} <a class="read-link" href="${o.native_url}" target="_blank" rel="noopener" title="open original">${PEOS.icon('arrow-right',13)}</a></div>
        ${body}
        <div class="read-meta">
          <span class="pill accent">${o.source}</span>
          <span class="text-faint">${o.source_type}</span>
          <span class="text-faint">${PEOS.esc(o.author||'')}</span>
          ${score}${more}
          <span class="read-time">${PEOS.fmtTime(o.observed_at_ms)}</span>
        </div>
      </div>
    </div>`;
  }

  function render(){
    const st = PEOS.Store.getState();
    let obs = PEOS.Store.observations().slice();
    const f = facets();
    if(dedup) obs = PEOS.Store.dedupThreads(obs);
    if(hideRead) obs = obs.filter(o=>!PEOS.Store.isRead(o.id));
    if(sort==='score') obs.sort((a,b)=>(b.score||0)-(a.score||0));
    else obs.sort((a,b)=>(b.observed_at_ms||0)-(a.observed_at_ms||0));
    const total = obs.length;
    const list = obs.map(renderItem).join('');
    const pg = PEOS.Store.getPaging();
    // Pagination is always visible when there is anything to show.
    const pager = total > 0 ? `<div class="pager animate-in">
        <button class="btn btn-secondary btn-sm" id="pagePrev" ${pg.page>1?'':'disabled'}>‹ prev</button>
        <span class="results-meta">page ${pg.page}${pg.total?` · ${pg.total} in view`:''}</span>
        <button class="btn btn-secondary btn-sm" id="pageNext" ${pg.has_more?'':'disabled'}>next ›</button>
      </div>` : '';
    const summary = PEOS.Store.filterSummary();
    const meta = searching ? 'searching…'
      : `${total} observation${total===1?'':'s'}${summary?` · filter: ${summary}`:''}`;
    const empty = `<div class="empty-state search-empty">
        <h3>Nothing here</h3>
        <p>${hasFilters() ? 'No observations match the current filters.' : 'The stream is quiet — wait for the next poll, or add sources.'}</p>
        ${hasFilters()?`<button class="btn btn-secondary btn-sm" id="emptyClear">clear filters</button>`:''}
      </div>`;
    const srcChips = Object.entries(f.src).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span class="facet-chip" data-source="${k}">${k} <span class="text-faint">${n}</span></span>`).join('');
    const topChips = Object.entries(f.top).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,n])=>`<span class="facet-chip" data-topic="${k}">${k} <span class="text-faint">${n}</span></span>`).join('');
    return `
      ${v.header('ground truth','Search')}
      <form class="search-bar animate-in" id="searchForm">
        <div class="search-input-wrap">
          <span class="search-icon">${PEOS.icon('search',16)}</span>
          <input type="search" id="searchInput" placeholder="Search titles, bodies, authors…" autocomplete="off" value="${PEOS.esc(st.q||'')}">
          <button type="button" class="search-clear" id="searchClear" title="clear query" ${st.q?'':'hidden'}>✕</button>
        </div>
        <button type="submit" class="btn btn-primary">${PEOS.icon('search',15)} Search</button>
      </form>
      <div class="search-controls animate-in">
        <div class="seg" role="group" aria-label="sort">
          <button class="seg-btn ${sort==='recent'?'active':''}" data-sort="recent">recent</button>
          <button class="seg-btn ${sort==='score'?'active':''}" data-sort="score">top</button>
        </div>
        <div class="seg" role="group" aria-label="list options">
          <button class="seg-btn ${dedup?'active':''}" data-toggle="dedup">dedup</button>
          <button class="seg-btn ${hideRead?'active':''}" data-toggle="hideRead">hide read</button>
        </div>
        <span class="results-meta">${meta}</span>
      </div>
      ${chipBar()}
      <div class="facets animate-in">
        <div class="facet-group"><span class="facet-label">sources</span><div class="facet-row">${srcChips}</div></div>
        <div class="facet-group"><span class="facet-label">topics</span><div class="facet-row">${topChips}</div></div>
      </div>
      ${total ? `<div class="read-list animate-in${searching?' loading':''}">${list}${pager}</div>` : empty}`;
  }

  async function run(patch){
    searching = true;
    PEOS.navigate('search');                 // immediate feedback (searching…)
    await PEOS.Store.applyFilter(patch);     // fetch from /api/search (resets to page 1)
    searching = false;
    PEOS.navigate('search'); PEOS.renderSidebar();
  }

  function afterRender(){
    document.getElementById('searchForm')?.addEventListener('submit',(e)=>{
      e.preventDefault();
      const val = document.getElementById('searchInput')?.value.trim();
      run({q: val || null});
    });
    document.getElementById('searchClear')?.addEventListener('click',()=>run({q:null}));
    document.querySelectorAll('[data-clear]').forEach(c=>c.addEventListener('click',()=>{
      run({[c.dataset.clear]:null});
    }));
    const clearAll = ()=>{ PEOS.Store.resetFilter(); run({}); };
    document.getElementById('clearAll')?.addEventListener('click',clearAll);
    document.getElementById('emptyClear')?.addEventListener('click',clearAll);
    document.querySelectorAll('.facet-chip[data-source]').forEach(c=>c.addEventListener('click',()=>run({source:c.dataset.source})));
    document.querySelectorAll('.facet-chip[data-topic]').forEach(c=>c.addEventListener('click',()=>run({topic:c.dataset.topic})));
    document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{sort=b.dataset.sort;PEOS.navigate('search');}));
    document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{
      const t=b.dataset.toggle; if(t==='dedup') dedup=!dedup; if(t==='hideRead') hideRead=!hideRead; PEOS.navigate('search');
    }));
    document.getElementById('pagePrev')?.addEventListener('click',async()=>{ searching=true; PEOS.navigate('search'); await PEOS.Store.prevPage(); searching=false; PEOS.navigate('search'); });
    document.getElementById('pageNext')?.addEventListener('click',async()=>{ searching=true; PEOS.navigate('search'); await PEOS.Store.nextPage(); searching=false; PEOS.navigate('search'); });
    document.querySelectorAll('.read-item').forEach(it=>{
      it.addEventListener('click',(e)=>{
        if(e.target.closest('a')) return;
        const id=it.dataset.id; PEOS.Store.markRead(id); it.classList.add('read');
      });
    });
  }
  return { render, afterRender };
})();
