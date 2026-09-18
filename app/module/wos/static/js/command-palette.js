/* ════════════════════════════════════════════════════════════
   WOS Command Palette — Ctrl+K. Navigation + full-text search of
   the observation stream (chained into the click→filter bus).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.CommandPalette = {
  open(initialQuery){
    try { input.setAttribute('aria-expanded','true'); } catch(e){}
    document.getElementById('cmdPalette').classList.remove('hidden');
    const input=document.getElementById('cmdInput');
    input.value=initialQuery||''; input.focus(); this.renderResults('');
  },
  close(){ document.getElementById('cmdPalette').classList.add('hidden'); },
  renderResults(query){
    const el=document.getElementById('cmdResults');
    const q=(query||'').toLowerCase();
    const navCmds=WOS.VIEWS.map(t=>({icon:t.icon,title:t.label,sub:`Go to ${t.label} — ${t.desc}`,action:()=>{this.close(); t.action?WOS.runAction(t.action):WOS.navigate(t.id);}}));
    const commands=[
      {icon:'refresh',title:'Recompute Clusters',sub:'Re-run the topic clustering over the corpus',action:async()=>{this.close();WOS.toast('Clustering… (first run downloads the model)');try{await WOS.Store.recomputeClusters();await WOS.Store.loadAnalytics();WOS.navigate(WOS.current);WOS.toast('Clusters updated');}catch(e){WOS.toast('Clustering failed: '+e);}}},
      {icon:'book-open',title:'Documentation',sub:'About this dashboard',action:()=>{this.close();WOS.navigate('documentation');}},
      {icon:'search',title:'Focus Search',sub:'Filter the stream from the header',action:()=>{this.close();document.getElementById('globalSearch')?.focus();}},
      ...navCmds,
    ];
    let html='<div class="cmd-group-label">Commands</div>';
    const filtered=commands.filter(c=>!q||c.title.toLowerCase().includes(q)||c.sub.toLowerCase().includes(q));
    filtered.forEach(c=>{
      html+=`<div class="cmd-result-item"><span class="cmd-result-icon">${WOS.icon(c.icon,17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    // stream search
    if(q.length>1){
      const obs=WOS.Store.observations().filter(o=>((o.title||'')+(o.body||'')+(o.author||'')).toLowerCase().includes(q)).slice(0,8);
      const all=WOS.Store.analytics();
      if(obs.length){
        html+='<div class="cmd-group-label">Observations</div>';
        obs.forEach(o=>{
          html+=`<div class="cmd-result-item" data-id="${o.id}"><span class="cmd-result-icon" style="color:var(--oxford)">${WOS.icon('circle-dot',16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${WOS.esc(o.title||o.body||'(no title)')}</div><div class="cmd-result-subtitle">${o.source} · ${WOS.fmtTime(o.observed_at_ms)}</div></div></div>`;
        });
      }
    }
    el.innerHTML=html;
    const items=[...el.querySelectorAll('.cmd-result-item')];
    items.forEach((item,i)=>{
      if(i<filtered.length) item.addEventListener('click',()=>filtered[i].action?.());
      else { const id=item.dataset.id; item.addEventListener('click',()=>{ this.close(); WOS.applyFilter({q}); }); }
    });
  }
};

document.addEventListener('DOMContentLoaded', ()=>{
  const i=document.getElementById('cmdInput');
  if(!i) return;
  i.addEventListener('input',(e)=>WOS.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown',(e)=>{
    if(e.key==='Escape') WOS.CommandPalette.close();
    if(e.key==='Enter'){ const f=document.querySelector('#cmdResults .cmd-result-item'); if(f) f.click(); }
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      const it=[...document.querySelectorAll('#cmdResults .cmd-result-item')];
      const cur=it.findIndex(x=>x.classList.contains('active'));
      it[cur]?.classList.remove('active');
      const next=e.key==='ArrowDown'?Math.min(cur+1,it.length-1):Math.max(cur-1,0);
      it[next]?.classList.add('active'); it[next]?.scrollIntoView({block:'nearest'});
    }
  });
});
