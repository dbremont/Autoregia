/* ════════════════════════════════════════════════════════════
   PEOS Topics — manage the watched feeds (runtime CRUD via the
   API), on-system. Each topic shows its source, query, interval,
   last-fetched cursor, and a poll-now button.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Topics = (() => {
  const v = PEOS.view;
  const SOURCES = ['hackernews','lobsters','reddit','mastodon','gdelt'];
  async function pollNow(tid){ PEOS.toast('Polling…'); try{ await fetch(`./api/poll`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic_id:tid,force:true})}); await PEOS.Store.loadAnalytics(); await PEOS.Store.loadObservations(); PEOS.renderSidebar(); PEOS.toast('Polled'); }catch(e){PEOS.toast('Poll failed');} }
  async function del(tid){ if(!confirm('Delete this topic?')) return; await fetch(`./api/topics/${tid}`,{method:'DELETE'}); PEOS.Store.loadTopics().then(()=>PEOS.navigate('topics')); }
  async function toggle(tid, on){ await fetch(`./api/topics/${tid}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:on})}); PEOS.Store.loadTopics().then(()=>PEOS.navigate('topics')); }
  async function add(e){
    e.preventDefault();
    const f=e.target; const body={source:f.source.value, query:f.query.value.trim(), interval_s:parseInt(f.interval.value||'0',10)};
    if(!body.query) return;
    const r=await fetch(`./api/topics`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){ const j=await r.json(); PEOS.toast(j.error||'failed'); return; }
    f.query.value=''; await PEOS.Store.loadTopics(); PEOS.navigate('topics');
  }
  function render(){
    const topics = PEOS.Store.topics();
    const cards = topics.map(t=>{
      const en = t.enabled!==false;
      return `<div class="card topic-card animate-in">
        <div class="card-header"><div><span class="eyebrow">${t.source}</span><h3>${PEOS.esc(t.query)}</h3></div>
          <div class="topic-actions">
            <button class="btn btn-secondary btn-sm" data-poll="${t.topic_id}">${PEOS.icon('refresh',14)} poll</button>
            <button class="btn-icon" data-toggle="${t.topic_id}" data-on="${en?1:0}" title="${en?'disable':'enable'}">${PEOS.icon(en?'circle-check':'circle',16)}</button>
            <button class="btn-icon" data-del="${t.topic_id}" title="delete">${PEOS.icon('trash',15)}</button>
          </div></div>
        <div class="card-footer">${t.topic_id} · ${t.interval_s?t.interval_s+'s':'auto'} · ${t.note?PEOS.esc(t.note):''}</div>
      </div>`;
    }).join('') || '<div class="empty-state"><h3>No topics yet</h3></div>';
    const srcOpts = SOURCES.map(s=>`<option value="${s}">${s}</option>`).join('');
    return `
      ${v.header('watched feeds','Topics')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">What the system watches. Query semantics are source-specific: search string (HN/Lobsters/GDELT), subreddit (Reddit), hashtag (Mastodon). Use <code class="text-mono">t:tag</code> on Lobsters for a tag feed.</p>
      <form class="topic-form card animate-in" id="topicForm">
        <div class="form-row">
          <select name="source" class="form-control">${srcOpts}</select>
          <input name="query" class="form-control" placeholder="query / subreddit / #tag" autocomplete="off">
          <input name="interval" class="form-control" type="number" min="0" placeholder="interval (s)" style="max-width:120px">
          <button class="btn btn-primary btn-sm" type="submit">${PEOS.icon('plus',15)} Add</button>
        </div>
      </form>
      <div class="topic-grid animate-in">${cards}</div>`;
  }
  function afterRender(){
    document.getElementById('topicForm')?.addEventListener('submit', add);
    document.querySelectorAll('[data-poll]').forEach(b=>b.addEventListener('click',()=>pollNow(b.dataset.poll)));
    document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.del)));
    document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>toggle(b.dataset.toggle, b.dataset.on!=='1')));
  }
  return { render, afterRender };
})();
