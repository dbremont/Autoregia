/* ════════════════════════════════════════════════════════════
   PEOS Pulse — the orienting overview.
   stat-row (volume · sources · latest · tone gauge) → volume-over-time
   stacked area + spike markers → "what's hot now" + trending terms.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Pulse = (() => {
  const v = PEOS.view;
  function render(){
    const a = PEOS.Store.analytics()||{};
    const tone = (a.tone&&a.tone.mean!=null)?a.tone.mean:0;
    const tonePct = Math.round((tone+1)/2*100);
    const toneColor = tone>0.15?'var(--color-success)':(tone<-0.15?'var(--color-danger)':'var(--ink-5)');
    const latest = a.volume && a.volume.buckets.length ? a.volume.buckets[a.volume.buckets.length-1] : '—';
    const hot = (a.hot_now||[]).slice(0,6).map(h=>`<div class="bar-row"><span class="bar-label">${h.name}</span><span class="bar-val">${h.value} <span class="text-faint">· ${h.heat}×</span></span></div>`).join('') || '<div class="empty-state">no recent activity</div>';
    const trend = (a.trending||[]).slice(0,6).map(t=>`<div class="bar-row"><span class="bar-label">${t.name}</span><span class="bar-val">${t.recent} <span class="text-faint">↗</span></span></div>`).join('') || '<div class="empty-state">nothing trending</div>';
    const spikes = (a.spikes||[]).map(s=>`<span class="pill warning">${s.bucket} <span class="text-faint">z${s.z}</span></span>`).join(' ');
    return `
      ${v.header('environment observation','Pulse', v.windowSeg())}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">What the world is saying right now — volume over time, spikes against the trailing baseline, and the terms rising fastest in the last 24 hours.</p>
      <div class="stat-row animate-in">
        ${v.statCard(a.n||0, 'observations in window')}
        ${v.statCard((a.sources&&Object.keys(a.sources).length)||0, 'active sources')}
        ${v.statCard(latest, 'latest bucket')}
        <div class="stat-card animate-in"><div id="gaugeTone" class="chart-box" style="height:96px"></div><div class="stat-label">mean tone</div></div>
      </div>
      ${spikes?`<div class="animate-in" style="margin:0 0 var(--space-3)"><span class="eyebrow">spikes</span> ${spikes}</div>`:''}
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">volume</span><h3>Observations over time</h3></div></div>
        <div class="chart-box" id="chartVolume" style="height:300px"></div>
      </div>
      <div class="chart-grid-2">
        ${v.chartCard('chartHot','hot now','Surge vs 7-day baseline','click a bar to read')}
        ${v.chartCard('chartTrend','trending','Terms rising in 24h','click a bar to read')}
      </div>
      <div class="chart-grid-2">
        <div class="chart-card animate-in"><div class="chart-head"><div><span class="eyebrow">hot now</span><h3>By source</h3></div></div><div class="bar-list">${hot}</div></div>
        <div class="chart-card animate-in"><div class="chart-head"><div><span class="eyebrow">trending</span><h3>Rising terms</h3></div></div><div class="bar-list">${trend}</div></div>
      </div>`;
  }
  function afterRender(){
    const a = PEOS.Store.analytics()||{};
    const C = PEOS.Charts;
    const vol = a.volume||{buckets:[],series:[]};
    C.stackedArea('chartVolume', vol.buckets, vol.series, {yName:'items', zoomStart: Math.max(0,100-Math.min(100,vol.buckets.length*2))});
    // hot now + trending as hbars → click filters reading
    C.onClick('hbar', (name)=>PEOS.applyFilter({q:name}));
    const hot = (a.hot_now||[]).slice(0,8).map(h=>({label:h.name, value:h.value}));
    if(hot.length) C.hbar('chartHot', hot);
    const trend = (a.trending||[]).slice(0,10).map(t=>({label:t.name, value:t.recent}));
    if(trend.length) C.hbar('chartTrend', trend);
    // tone gauge
    const tone = (a.tone&&a.tone.mean!=null)?a.tone.mean:0;
    const toneColor = tone>0.15?'var(--color-success)':(tone<-0.15?'var(--color-danger)':'var(--oxford)');
    C.gauge('gaugeTone', Math.round((tone+1)/2*100), {min:0,max:100,color:toneColor,fmt:(x)=>((x/100*2-1).toFixed(2))});
  }
  return { render, afterRender };
})();
