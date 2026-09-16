/* ════════════════════════════════════════════════════════════
   PEOS Dashboard — "The World Right Now".
   Live view over all sources: KPI cards with sparklines and a
   relevance gauge, volume+relevance over 7 days, top topics with
   growth, recent signals by relevance, and a right rail with the
   latest from the web, quick filters, and the agent's focus.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Dashboard = (() => {
  const PALETTE = ['#7c5cff', '#3b82f6', '#22a06b', '#f59e0b', '#ef4444', '#14b8a6'];
  let chartMode = 'volume';          // volume | relevance | both
  let qf = 'all';                    // all | unread | today | week | rel

  const rel = o => o.score != null ? Math.max(0, Math.min(1, o.score / 100))
                                   : Math.round((PEOS.Store.toneOf(o) + 1) / 2 * 100) / 100;
  const dayKey = ms => new Date(ms).toISOString().slice(0, 10);
  const esc = PEOS.esc;
  function ago(ms) {
    const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }
  function domain(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return 'web'; } }
  function tagOf(o) {
    const t = ((o.topics && o.topics[0]) || o.source || '').toLowerCase();
    if (/ml|llm|ai|model|agent/.test(t)) return { tag: 'AI', col: '#7c5cff' };
    if (/econ|market|nber|finance/.test(t)) return { tag: 'ECONOMY', col: '#f59e0b' };
    if (/bio|med|health|biorxiv/.test(t)) return { tag: 'SCIENCE', col: '#22a06b' };
    if (/news|world|geo|gdelt/.test(t)) return { tag: 'WORLD', col: '#3b82f6' };
    if (/tech|sw|code|eng/.test(t)) return { tag: 'TECH', col: '#ef4444' };
    return { tag: 'RESEARCH', col: '#7a736a' };
  }
  const winObs = list => qf === 'unread' ? list.filter(o => !PEOS.Store.isRead(o.id))
    : qf === 'rel' ? list.filter(o => rel(o) >= 0.6) : list;

  function spark(values, w, h, color) {
    if (!values || values.length < 2) values = [0, 0];
    const max = Math.max(...values, 1), step = w / (values.length - 1);
    const pts = values.map((y, i) => `${(i * step).toFixed(1)},${(h - 3 - (y / max) * (h - 6)).toFixed(1)}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
  }
  function areaspark(values, w, h, color) {
    if (!values || values.length < 2) values = [0, 0];
    const max = Math.max(...values, 1), step = w / (values.length - 1);
    const pts = values.map((y, i) => `${(i * step).toFixed(1)},${(h - 3 - (y / max) * (h - 6)).toFixed(1)}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity="0.14"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
  }

  function kpis(a, obs, vol) {
    const total = vol.total || [];
    const last = total[total.length - 1] || 0, prev = total[total.length - 2] || 0;
    const pct = prev ? Math.round((last - prev) / prev * 100) : 0;
    const nSrc = Object.keys(a.sources || {}).length;
    const latest = (vol.buckets && vol.buckets.length) ? vol.buckets[vol.buckets.length - 1] : '—';
    const rels = obs.map(rel);
    const meanRel = rels.length ? rels.reduce((s, x) => s + x, 0) / rels.length : 0;
    const pctCls = pct > 0 ? 'up' : pct < 0 ? 'dn' : '';
    const pctTxt = prev ? `${pct > 0 ? '↑' : pct < 0 ? '↓' : '—'} ${Math.abs(pct)}% <small>vs previous</small>` : '— <small>stable</small>';
    const t = vol.total || [];
    return `<div class="kpi-card"><div class="kpi-ic">${PEOS.icon('table', 16)}</div><div class="kpi-t">Total Signals</div><div class="kpi-v">${a.n || 0}</div><div class="kpi-d ${pctCls}">${pctTxt}</div><div class="kpi-sp">${areaspark(t.slice(-14), 120, 26, '#22a06b')}</div></div>
      <div class="kpi-card"><div class="kpi-ic">${PEOS.icon('zap', 16)}</div><div class="kpi-t">Active Sources</div><div class="kpi-v">${nSrc}</div><div class="kpi-d">${nSrc ? '— stable' : '— none'}</div><div class="kpi-sp">${areaspark(Object.values(a.sources || {}).slice(0, 14), 120, 26, '#3b82f6')}</div></div>
      <div class="kpi-card"><div class="kpi-ic">${PEOS.icon('calendar', 16)}</div><div class="kpi-t">Latest Bucket</div><div class="kpi-v" style="font-size:16px">${esc(latest)}</div><div class="kpi-d">— current</div><div class="kpi-sp">${areaspark(t.slice(-14), 120, 26, '#7c5cff')}</div></div>
      <div class="kpi-card"><div class="kpi-t" style="margin-bottom:2px">Avg. Signal Relevance</div><div id="gaugeRel" class="chart-box" style="height:74px"></div><div class="kpi-d" style="text-align:center">Higher is better</div></div>`;
  }

  function chart7(obs, vol) {
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(dayKey(Date.now() - i * 86400000));
    const byDay = {}, relBy = {};
    obs.forEach(o => { const k = dayKey(o.observed_at_ms); byDay[k] = (byDay[k] || 0) + 1; });
    const all = PEOS.Store.observations();
    all.forEach(o => { const k = dayKey(o.observed_at_ms); (relBy[k] = relBy[k] || []).push(rel(o)); });
    const counts = days.map(d => byDay[d] || 0);
    const rels = days.map(d => relBy[d] && relBy[d].length ? relBy[d].reduce((s, x) => s + x, 0) / relBy[d].length : 0);
    const W = 900, H = 190, max = Math.max(...counts, 1), bw = W / 7;
    let g = '';
    counts.forEach((c, i) => { const h = (c / max) * (H - 52); g += `<rect x="${i * bw + bw * 0.18}" y="${H - 30 - h}" width="${bw * 0.64}" height="${h}" fill="#7A1A2A" opacity="0.30" rx="3"/>`; });
    const pts = rels.map((r, i) => `${(i * bw + bw / 2).toFixed(1)},${(H - 30 - r * (H - 52)).toFixed(1)}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="#7A1A2A" stroke-width="2"/>`;
    rels.forEach((r, i) => g += `<circle cx="${i * bw + bw / 2}" cy="${H - 30 - r * (H - 52)}" r="3" fill="#7A1A2A"/>`);
    days.forEach((d, i) => {
      const lbl = new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      g += `<text x="${i * bw + bw / 2}" y="${H - 8}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9.5" fill="#A7A296">${lbl}</text>`;
    });
    let gy = ''; [0, 0.5, 1].forEach(v => { gy += `<text x="26" y="${(H - 30 - v * (H - 52) + 3).toFixed(1)}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="9" fill="#A7A296">${Math.round(v * max)}</text>`; });
    g += gy;
    let gy2 = ''; [0, 0.5, 1].forEach(v => { gy2 += `<text x="${W - 4}" y="${(H - 30 - v * (H - 52) + 3).toFixed(1)}" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="9" fill="#A7A296">${v.toFixed(1)}</text>`; });
    g += gy2;
    if (chartMode === 'relevance') g = g.replace(/<rect[^>]*opacity="0\.30"[^>]*\/>/g, '');
    if (chartMode === 'volume') g = g.replace(/<polyline points="[^"]*" fill="none" stroke="#7A1A2A" stroke-width="2"\/>/, '').replace(/<circle[^>]*fill="#7A1A2A"\/>/g, '');
    return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${g}</svg>`;
  }

  function render() {
    const a = PEOS.Store.analytics() || {};
    const obs = winObs(PEOS.Store.observations());
    const vol = a.volume || { buckets: [], total: [] };
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10) + ' · ' + now.toTimeString().slice(0, 5);

    const unread = PEOS.Store.observations().filter(o => !PEOS.Store.isRead(o.id)).length;
    const today = PEOS.Store.observations().filter(o => dayKey(o.observed_at_ms) === dayKey(Date.now())).length;
    const hi = PEOS.Store.observations().filter(o => rel(o) >= 0.6).length;
    const pill = (id, label, n, on) => `<button class="qf-pill ${qf === id ? 'on' : ''}" data-qf="${id}">${label}${n != null ? ` (${n})` : ''}</button>`;

    const topics = {};
    obs.forEach(o => (o.topics || []).slice(0, 1).forEach(t => { topics[t] = (topics[t] || 0) + 1; }));
    const top = Object.entries(topics).sort((x, y) => y[1] - x[1]).slice(0, 6);
    const maxT = Math.max(...top.map(x => x[1]), 1);
    const topicRows = top.map(([t, c], i) => {
      const col = PALETTE[i % PALETTE.length];
      const ic = ['brain', 'sparkles', 'cpu', 'scale', 'shield', 'compass'][i % 6];
      return `<div class="topic-row"><span class="topic-ic" style="background:${col}18;color:${col}">${PEOS.icon(ic, 14)}</span><span class="topic-nm">${esc(t)}</span><span class="topic-n">${c} <span class="up">↑</span></span><span class="topic-bar"><i style="width:${(c / maxT) * 100}%;background:${col}"></i></span></div>`;
    }).join('') || '<div class="empty-inline">no topics yet — wait for the next poll</div>';

    const sigs = obs.slice().sort((x, y) => rel(y) - rel(x)).slice(0, 5).map(o => {
      const tg = tagOf(o);
      return `<div class="sig-row"><span class="sig-tag" style="background:${tg.col}14;color:${tg.col}">${tg.tag}</span><div class="sig-main"><div class="sig-src">${esc(o.source)} · ${ago(o.observed_at_ms)}</div><div class="sig-t">${esc(o.title || (o.body || '').slice(0, 90))}</div></div><span class="sig-rel">${rel(o).toFixed(2)}</span></div>`;
    }).join('') || '<div class="empty-inline">nothing yet</div>';

    const web = obs.slice(0, 8).map(o => {
      const dm = domain(o.native_url);
      return `<a class="webrow" href="${o.native_url}" target="_blank" rel="noopener"><span class="fav" style="background:${PALETTE[dm.length % 6]}22;color:${PALETTE[dm.length % 6]}">${esc(dm[0] || 'w').toUpperCase()}</span><span class="webmain"><span class="webt">${esc((o.title || o.body || '').slice(0, 60))}</span><span class="webd">${esc(dm)} · ${ago(o.observed_at_ms)}</span></span><span class="webrel">${rel(o).toFixed(2)}</span></a>`;
    }).join('') || '<div class="empty-inline">nothing yet</div>';

    const viewAll = `<span class="viewall">View all →</span>`;
    const seg = `<div class="pill-toggle" id="chartMode"><button data-m="volume" class="${chartMode === 'volume' ? 'on' : ''}">Volume</button><button data-m="relevance" class="${chartMode === 'relevance' ? 'on' : ''}">Relevance</button><button data-m="both" class="${chartMode === 'both' ? 'on' : ''}">Both</button></div>`;

    return `
      <div class="dash-head">
        <div><span class="eyebrow">Environment Observation</span>
          <h1 class="dash-title">The World Right Now</h1>
          <p class="dash-sub">Live view of what's happening, what's emerging, and what deserves your attention.</p></div>
        <div class="dash-live"><div class="mono dash-date">${dateStr}</div><div class="dash-on"><span class="dotlive"></span>Live</div></div>
      </div>
      <div class="dash-grid">
        <div class="dash-main">
          <div class="kpis" id="kpis">${kpis(a, obs, vol)}</div>
          <div class="panel"><div class="phead"><span class="t">Observations Over Time</span>${seg}</div>
            <div class="pnote">Volume and relevance of signals in the last 7 days.</div>
            <div class="pbody">${chart7(obs, vol)}
              <div class="chart-legend"><span><i class="lg-dot" style="background:#7A1A2A;opacity:.35"></i>Volume</span><span><i class="lg-line"></i>Relevance</span></div></div></div>
        <div class="dash-cols">
          <div class="panel"><div class="phead"><span class="t">Top Topics</span><span class="r">themes with highest signal volume and growth</span></div>
            <div class="pbody">${topicRows}</div></div>
          <div class="panel"><div class="phead"><span class="t">Recent Signals</span><span class="r">latest relevant observations across the web</span></div>
            <div class="pbody">${sigs}</div></div>
        </div>
        </div>
        <aside class="dash-rail">
          <div class="panel"><div class="phead"><span class="t">Latest from the Web</span>${viewAll}</div><div class="pbody pbody-tight">${web}</div></div>
          <div class="panel"><div class="phead"><span class="t">Quick Filters</span></div>
            <div class="pbody qf">${pill('all', 'All', null, true)}${pill('unread', 'Unread', unread)}${pill('today', 'Today', today)}${pill('week', 'This Week', PEOS.Store.observations().length)}${pill('rel', 'High Relevance', hi)}</div></div>
          <div class="panel"><div class="phead"><span class="t">Your Focus</span></div>
            <div class="pbody focus"><span class="focus-ic">${PEOS.icon('target', 15)}</span><span>AI, Science, Technology</span><span class="focus-go" onclick="location.hash='#sources'">→</span></div></div>
        </aside>
      </div>`;
  }

  async function run(patch) {
    PEOS.navigate('dashboard');
    if (patch) await PEOS.Store.applyFilter(patch);
    PEOS.navigate('dashboard');
  }

  function afterRender() {
    const a = PEOS.Store.analytics() || {};
    const g = document.getElementById('gaugeRel');
    if (g && PEOS.Charts.gauge) {
      const obs = PEOS.Store.observations(), rels = obs.map(rel);
      const mean = rels.length ? rels.reduce((s, x) => s + x, 0) / rels.length : 0;
      PEOS.Charts.gauge('gaugeRel', Math.round(mean * 100), { min: 0, max: 100, color: 'var(--oxford)', fmt: x => (x / 100).toFixed(2) });
    }
    document.querySelectorAll('#chartMode button').forEach(b => b.onclick = () => { chartMode = b.dataset.m; PEOS.navigate('dashboard'); });
    document.querySelectorAll('.qf-pill').forEach(b => b.onclick = async () => {
      const id = b.dataset.qf; qf = id;
      if (id === 'today') { PEOS.Store.setWindow(24); await PEOS.Store.loadAnalytics(); await PEOS.Store.loadObservations(); }
      if (id === 'week') { PEOS.Store.setWindow(168); await PEOS.Store.loadAnalytics(); await PEOS.Store.loadObservations(); }
      if (id === 'all') { PEOS.Store.setWindow(168); await PEOS.Store.loadAnalytics(); await PEOS.Store.loadObservations(); }
      PEOS.navigate('dashboard');
    });
    // deeper topic counts: pull a larger sample straight from /api/search
    fetch('./api/search?limit=500').then(r => r.json()).then(res => {
      const items = Array.isArray(res) ? res : (res.items || []);
      const topics = {};
      items.forEach(o => (o.topics || []).slice(0, 1).forEach(t => { topics[t] = (topics[t] || 0) + 1; }));
      const top = Object.entries(topics).sort((x, y) => y[1] - x[1]).slice(0, 6);
      const maxT = Math.max(...top.map(x => x[1]), 1);
      const el = document.querySelector('.dash-cols .panel .pbody');
      if (el && top.length) el.innerHTML = top.map(([t, c], i) => {
        const col = PALETTE[i % PALETTE.length];
        const ic = ['brain', 'sparkles', 'cpu', 'scale', 'shield', 'compass'][i % 6];
        return `<div class="topic-row"><span class="topic-ic" style="background:${col}18;color:${col}">${PEOS.icon(ic, 14)}</span><span class="topic-nm">${esc(t)}</span><span class="topic-n">${c}</span><span class="topic-bar"><i style="width:${(c / maxT) * 100}%;background:${col}"></i></span></div>`;
      }).join('');
    }).catch(() => { });
  }

  return { render, afterRender };
})();
