/* ════════════════════════════════════════════════════════════
   WOS Recent Observations — "What just arrived?"
   The newest items, with arrival stats and a per-source mini
   breakdown of this batch. Titles link out; View all → Search.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Recent = (() => {
  const v = WOS.view;
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];
  const PILL = { nitter:'nitter', rss:'rss', arxiv:'arxiv', biorxiv:'biorxiv', crossref:'crossref', openalex:'openalex' };
  const dotColor = (s) => PALETTE[[...s].reduce((h,c)=>h+c.charCodeAt(0),0) % PALETTE.length];
  const hhmm = (ms) => ms ? new Date(ms).toTimeString().slice(0,5) : '';

  function render(){
    return `
      ${v.header('Recent Observations', '<a class="src-viewall" href="#search">View all →</a>')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>What just arrived?</strong> The newest items in the stream, whatever the source — the freshest slice of the world.</p>
      <div class="stat-row animate-in" id="recentStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card"><div id="recentList" style="min-height:200px"></div></div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">this batch</span><h3>Arrivals by source</h3></div></div>
          <div class="chart-box" id="recentBySource" style="min-height:200px"></div>
        </div>
      </div>`;
  }

  async function afterRender(){
    const host = document.getElementById('recentList');
    try{
      const r = await fetch('./api/search?limit=50');
      if(!r.ok) throw new Error(r.status);
      const items = ((await r.json()).items)||[];
      if(!items.length){
        document.getElementById('recentStats').innerHTML = '';
        host.innerHTML = '<div class="empty-state">nothing yet — wait for the next polls</div>';
        document.getElementById('recentBySource').innerHTML = '';
        return;
      }
      const bySrc = {};
      items.forEach(o=>{ bySrc[o.source||'?'] = (bySrc[o.source||'?']||0)+1; });
      const srcRows = Object.entries(bySrc).sort((x,y)=>y[1]-x[1]);
      const newest = Math.max(...items.map(o=>o.observed_at_ms||0));
      const ageMin = newest ? Math.max(0, Math.round((Date.now()-newest)/60000)) : null;
      document.getElementById('recentStats').innerHTML =
        v.statCard(items.length, 'latest arrivals') +
        v.statCard(srcRows.length, 'sources in batch') +
        v.statCard(ageMin==null ? '—' : ageMin < 60 ? ageMin+' min' : Math.round(ageMin/60)+' h', 'age of newest', 'var(--color-accent)') +
        v.statCard(srcRows.length ? srcRows[0][0] : '—', 'most active now');

      host.innerHTML = items.map(o=>{
        const pill = PILL[o.source] ? `<span class="src-pill p-${PILL[o.source]}">${WOS.esc(o.source.toUpperCase())}</span>`
          : `<span class="src-pill p-other">${WOS.esc((o.source||'?').toUpperCase())}</span>`;
        return `<div class="ov-feed-item"><span class="src-feed-dot" style="background:${dotColor(o.source||'?')}"></span>
          <span class="src-feed-t">${hhmm(o.observed_at_ms)}</span>
          <span class="ov-feed-x">${o.native_url?`<a href="${WOS.esc(o.native_url)}" target="_blank" rel="noopener">${WOS.esc(o.title||(o.body||'').slice(0,90)||'(no title)')}</a>`:WOS.esc(o.title||(o.body||'').slice(0,90)||'(no title)')}</span>${pill}</div>`;
      }).join('');
      WOS.Charts.hbar('recentBySource', srcRows.map(([label,value])=>({ label, value })));
    }catch(e){
      document.getElementById('recentStats').innerHTML = '';
      host.innerHTML = '<div class="empty-state">could not reach the store</div>';
    }
  }
  return { render, afterRender };
})();
