/* ════════════════════════════════════════════════════════════
   PEOS Reading — the ground-truth stream. Faceted, with
   read/unread (localStorage by stable OBS id), thread dedup,
   term highlight, and a coarse tone tint. Every other instrument
   feeds into this view via the click→filter bus.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Reading = (() => {
  const v = PEOS.view;
  let hideRead = false, dedup = true, sort = 'recent';
  function facets(){
    const obs = PEOS.Store.observations();
    const src = {}, top = {};
    obs.forEach(o=>{ src[o.source]=(src[o.source]||0)+1; (o.topics||['(untagged)']).forEach(t=>top[t]=(top[t]||0)+1); });
    return { src, top };
  }
  function filterBar(){
    const st = PEOS.Store.getState();
    const chips = [];
    if(st.source) chips.push(`<span class="filter-chip" data-clear="source">${st.source} ✕</span>`);
    if(st.topic) chips.push(`<span class="filter-chip" data-clear="topic">#${st.topic} ✕</span>`);
    if(st.cluster) chips.push(`<span class="filter-chip" data-clear="cluster">${st.cluster} ✕</span>`);
    if(st.q) chips.push(`<span class="filter-chip" data-clear="q">“${st.esc(st.q)}” ✕</span>`);
    if(st.term) chips.push(`<span class="filter-chip" data-clear="term">${st.term} ✕</span>`);
    return chips.length ? `<div class="filter-chips">${chips.join('')} <a href="#" id="clearAll" class="text-xs text-muted">clear all</a></div>` : '';
  }
  function renderItem(o){
    const tone = PEOS.Store.toneOf(o);
    const tcls = PEOS.Store.toneClass(tone);
    const read = PEOS.Store.isRead(o.id) ? 'read' : '';
    const title = o.title || o.body.slice(0,80) || '(no title)';
    const body = o.body && o.body.length>0 ? `<div class="read-body">${PEOS.Store.highlight(o.body.slice(0,280))}${o.body.length>280?'…':''}</div>` : '';
    const score = (o.score!=null) ? `<span class="text-faint">★ ${o.score}</span>` : '';
    const more = o._more ? `<span class="pill gold">+${o._more} more in thread</span>` : '';
    return `<div class="read-item ${read} ${tcls}" data-id="${o.id}">
      <div class="read-tone ${tcls}"></div>
      <div class="read-main">
        <div class="read-title">${PEOS.Store.highlight(title)} <a class="read-link" href="${o.native_url}" target="_blank" rel="noopener">${PEOS.icon('arrow-right',13)}</a></div>
        ${body}
        <div class="read-meta">
          <span class="pill accent">${o.source}</span>
          <span class="text-faint">${o.source_type}</span>
          <span class="text-faint">${PEOS.esc(o.author||'')}</span>
          <span class="text-faint">${PEOS.fmtTime(o.observed_at_ms)}</span>
          ${score}${more}
        </div>
      </div>
    </div>`;
  }
  function render(){
    let obs = PEOS.Store.observations().slice();
    const f = facets();
    if(dedup) obs = PEOS.Store.dedupThreads(obs);
    if(hideRead) obs = obs.filter(o=>!PEOS.Store.isRead(o.id));
    if(sort==='score') obs.sort((a,b)=>(b.score||0)-(a.score||0));
    else obs.sort((a,b)=>(b.observed_at_ms||0)-(a.observed_at_ms||0));
    const list = obs.slice(0,200).map(renderItem).join('') || '<div class="empty-state"><h3>Nothing here</h3><p>Adjust the filters or wait for the next poll.</p></div>';
    const srcChips = Object.entries(f.src).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span class="facet-chip" data-source="${k}">${k} <span class="text-faint">${n}</span></span>`).join('');
    const topChips = Object.entries(f.top).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,n])=>`<span class="facet-chip" data-topic="${k}">${k} <span class="text-faint">${n}</span></span>`).join('');
    return `
      ${v.header('ground truth','Reading', `<div class="seg">
        <button class="seg-btn ${sort==='recent'?'active':''}" data-sort="recent">recent</button>
        <button class="seg-btn ${sort==='score'?'active':''}" data-sort="score">top</button>
        <button class="seg-btn ${dedup?'active':''}" data-toggle="dedup">dedup</button>
        <button class="seg-btn ${hideRead?'active':''}" data-toggle="hideRead">hide read</button>
      </div>`)}
      ${filterBar()}
      <div class="facets animate-in"><div class="facet-row">${srcChips}</div><div class="facet-row">${topChips}</div></div>
      <div class="read-list animate-in">${list}</div>`;
  }
  function afterRender(){
    document.querySelectorAll('[data-clear]').forEach(c=>c.addEventListener('click',()=>{
      const k=c.dataset.clear; PEOS.Store.applyFilter({[k]:null}); PEOS.navigate('reading'); PEOS.renderSidebar();
    }));
    document.getElementById('clearAll')?.addEventListener('click',(e)=>{e.preventDefault();PEOS.Store.resetFilter();PEOS.Store.loadObservations().then(()=>{PEOS.navigate('reading');PEOS.renderSidebar();});});
    document.querySelectorAll('.facet-chip[data-source]').forEach(c=>c.addEventListener('click',()=>PEOS.applyFilter({source:c.dataset.source})));
    document.querySelectorAll('.facet-chip[data-topic]').forEach(c=>c.addEventListener('click',()=>PEOS.applyFilter({topic:c.dataset.topic})));
    document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{sort=b.dataset.sort;PEOS.navigate('reading');}));
    document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{
      const t=b.dataset.toggle; if(t==='dedup') dedup=!dedup; if(t==='hideRead') hideRead=!hideRead; PEOS.navigate('reading');
    }));
    document.querySelectorAll('.read-item').forEach(it=>{
      it.addEventListener('click',(e)=>{
        if(e.target.closest('a')) return;
        const id=it.dataset.id; PEOS.Store.markRead(id); it.classList.add('read');
      });
    });
  }
  return { render, afterRender };
})();
