/* ════════════════════════════════════════════════════════════
   WOS Anomaly Detection — "When did the world get louder?"
   Volume buckets ≥2σ above the trailing window: marked on the
   series, tabulated, and attributed (who was loud then).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Anomalies = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Anomaly Detection')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>When did the world get louder?</strong> Buckets whose total volume is ≥2σ above the trailing window — moments the stream spiked, and who contributed.</p>
      <div class="stat-row animate-in" id="anomStats"></div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">total volume</span><h3>Signal with anomalies marked</h3></div></div>
        <div class="chart-box" id="chartAnom" style="height:300px"></div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">z ≥ 2.0</span><h3>Detected spikes</h3></div></div>
          <div id="anomTable" style="min-height:60px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">loudest bucket</span><h3>Who was loud then</h3></div></div>
          <div class="chart-box" id="anomWho" style="min-height:180px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const a = WOS.Store.analytics()||{};
    const vol = a.volume||{};
    const spikes = a.spikes||[];
    const maxZ = spikes.reduce((m,s)=>Math.max(m,s.z),0);
    const loudest = spikes.reduce((m,s)=>(!m || s.value>m.value) ? s : m, null);
    document.getElementById('anomStats').innerHTML =
      v.statCard(spikes.length, 'spikes detected') +
      v.statCard(spikes.length ? maxZ.toFixed(1)+'σ' : '—', 'strongest signal', 'var(--color-accent)') +
      v.statCard(loudest ? loudest.bucket : '—', 'loudest bucket') +
      v.statCard(loudest ? loudest.value : '—', 'items in it');

    const chost = document.getElementById('chartAnom');
    if(!(vol.total||[]).length){
      chost.innerHTML = '<div class="empty-state">no observations in this window</div>';
      document.getElementById('anomTable').innerHTML = '';
      document.getElementById('anomWho').innerHTML = '';
      return;
    }
    WOS.Charts.line('chartAnom', [
      { name:'total', area:true, data: vol.buckets.map((b,i)=>({x:b, y:vol.total[i]})) },
      ...spikes.map(s=>({ name:'spike '+s.bucket, data: vol.buckets.map((b,i)=>({x:b, y: b===s.bucket ? vol.total[i] : null})), color:'#A33434' })),
    ], { yName:'items' });

    const table = document.getElementById('anomTable');
    if(!spikes.length){ table.innerHTML = '<div class="empty-state">no anomalies above threshold — a calm stream</div>'; }
    else table.innerHTML = `<table class="src-table"><thead><tr><th>Bucket</th><th>Items</th><th>z-score</th></tr></thead><tbody>
      ${spikes.map(s=>`<tr><td class="src-ago">${WOS.esc(s.bucket)}</td><td class="src-num">${s.value}</td><td class="src-num src-up">${s.z}</td></tr>`).join('')}
    </tbody></table>`;

    const who = document.getElementById('anomWho');
    if(!loudest){ who.innerHTML = '<div class="empty-state">nothing to attribute</div>'; return; }
    const i = vol.buckets.indexOf(loudest.bucket);
    const rows = (vol.series||[]).map(s=>({ label:s.name, value:s.data[i]||0 })).filter(r=>r.value>0)
      .sort((x,y)=>y.value-x.value).slice(0,8);
    if(!rows.length){ who.innerHTML = '<div class="empty-state">no per-source detail for this bucket</div>'; return; }
    WOS.Charts.hbar('anomWho', rows);
  }
  return { render, afterRender };
})();
