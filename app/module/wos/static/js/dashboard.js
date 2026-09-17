/* ════════════════════════════════════════════════════════════
   WOS Dashboard — "Global Observation Overview" (wos.png replica,
   live data). KPIs from /api/sources/status; word cloud, topics,
   insights, graph, sentiment from /api/analytics; flow + recent
   from /api/search; geography from analytics regions (GDELT).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Dashboard = (() => {
  const PALETTE = ['#7A1A2A', '#3F6092', '#A8854A', '#3F6E50', '#5C4E78', '#3F6092', '#B4742A', '#A33434'];
  const REGION_COORDS = {
    'North America': [40, -100], 'Europe': [52, 12], 'Asia': [35, 90],
    'Latin America': [-15, -60], 'Africa': [2, 20], 'Oceania': [-25, 140],
  };
  const FLOW_WINDOWS = [{ h: 24, label: '24h' }, { h: 168, label: '7d' }, { h: 720, label: '30d' }];
  const PILL = { nitter: 'nitter', rss: 'rss', arxiv: 'arxiv', biorxiv: 'biorxiv', crossref: 'crossref', openalex: 'openalex' };
  const esc = (...a) => WOS.esc(...a);
  const charts = {};
  let flowH = 24, status = null, a = {}, flowObs = [], recent = [], mapReady = null;

  const mk = (id) => {
    const el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    if (charts[id]) { try { charts[id].dispose(); } catch {} }
    charts[id] = echarts.init(el, null, { renderer: 'canvas' });
    return charts[id];
  };
  const empty = (msg) => `<div class="empty-inline">${msg || 'nothing yet — wait for the next poll'}</div>`;
  const hhmm = (ms) => ms ? new Date(ms).toTimeString().slice(0, 5) : '';
  const cut = () => Date.now() - flowH * 3600000;

  function spark(values, w, h, color) {
    if (!values || values.length < 2) values = [0, 0];
    const max = Math.max(...values, 1), step = w / (values.length - 1);
    const pts = values.map((y, i) => `${(i * step).toFixed(1)},${(h - 2 - (y / max) * (h - 4)).toFixed(1)}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
  }

  // ── shell ────────────────────────────────────────────────────
  function phead(title, cap, extra = '') {
    return `<div class="ov-phead"><span class="ov-ptitle">${title}</span>${cap ? `<span class="ov-pcap">${cap}</span>` : ''}${extra}</div>`;
  }

  function render() {
    const seg = `<div class="seg" id="ovFlowSeg">${FLOW_WINDOWS.map(w =>
      `<button class="seg-btn${w.h === flowH ? ' active' : ''}" data-h="${w.h}">${w.label}</button>`).join('')}</div>`;
    return `<div class="ov-page animate-in">
      <div class="ov-head">
        <div class="ov-head-main">
          <h1>Global Observation Overview</h1>
          <p class="ov-sub">What the world is signaling, and what it means.</p>
        </div>
        <div class="ov-kpis" id="ovKpis">${[0, 1, 2, 3].map(() => `<div class="ov-kpi"><div class="ov-kpi-v">—</div><div class="ov-kpi-l">…</div></div>`).join('')}</div>
      </div>
      <div class="ov-grid">
        <section class="panel ov-panel ov-c-cloud">${phead("What's happening now?")}
          <div class="ov-pbody"><div id="ovCloud" class="ov-chart ov-chart-cloud">${empty()}</div></div></section>
        <section class="panel ov-panel ov-c-topics">${phead('Top Topics', '(by observation volume)')}
          <div class="ov-pbody"><div id="ovTopics" class="ov-topics">${empty()}</div></div></section>
        <section class="panel ov-panel ov-c-insights">${phead('Key Insights')}
          <div class="ov-pbody"><div id="ovInsights">${empty()}</div></div></section>
        <section class="panel ov-panel ov-c-flow">${phead('Observation Flow', 'How topics evolve over time', seg)}
          <div class="ov-pbody"><div id="ovFlow" class="ov-chart ov-chart-flow">${empty()}</div><div class="ov-flow-legend" id="ovFlowLegend"></div></div></section>
        <section class="panel ov-panel ov-c-comp">${phead('Source Composition')}
          <div class="ov-pbody ov-comp-body">
            <div class="ov-donut-wrap"><div id="ovDonut" class="ov-chart ov-chart-donut"></div>
              <div class="ov-donut-center"><div class="ov-donut-n" id="ovDonutN">—</div><div class="ov-donut-cap">total sources</div></div></div>
            <ul class="src-legend" id="ovDonutLegend"></ul>
          </div></section>
        <section class="panel ov-panel ov-c-ent">${phead('Top Entity Connections', '(stronger = thicker link)')}
          <div class="ov-pbody ov-ent-body">
            <div id="ovGraph" class="ov-chart ov-chart-graph">${empty()}</div>
            <div class="ov-links" id="ovLinks"></div>
          </div></section>
        <section class="panel ov-panel ov-c-geo">${phead('Geographic Lens', 'Observations by region')}
          <div class="ov-pbody ov-geo-body">
            <div class="ov-geo-main"><div id="ovGeo" class="ov-chart ov-chart-geo"></div>
              <ul class="src-legend" id="ovGeoLegend"></ul></div>
            <div class="ov-sent">
              <div class="ov-sent-head">Sentiment / Signaling</div>
              <div id="ovSentiment"><div class="ov-grad"></div></div>
            </div>
          </div></section>
        <section class="panel ov-panel ov-c-recent">${phead('Recent Observations', '', '<a class="src-viewall" href="#search">View all →</a>')}
          <div class="ov-pbody"><div id="ovRecent">${empty()}</div></div></section>
      </div>
    </div>`;
  }

  // ── data ─────────────────────────────────────────────────────
  async function load() {
    // self-heal: if the store's boot-time analytics fetch failed, retry here —
    // analytics-derived panels (cloud/topics/insights/graph/sentiment/geo)
    // otherwise stay empty for the whole session with no way back
    let analyticsDown = false;
    if (!WOS.Store.analytics()) {
      try { await WOS.Store.loadAnalytics(); } catch (e) { analyticsDown = true; }
    }
    a = WOS.Store.analytics() || {};
    let failures = 0;
    const fail = () => { failures++; return null; };
    await Promise.all([
      fetch('./api/sources/status').then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { status = j; }).catch(fail),
      fetch('./api/search?limit=1000&since_ms=' + cut()).then(r => { if (!r.ok) throw 0; return r.json(); })
        .then(j => { flowObs = (j && j.items) || []; }).catch(fail),
      fetch('./api/search?limit=5').then(r => { if (!r.ok) throw 0; return r.json(); })
        .then(j => { recent = (j && j.items) || []; }).catch(fail),
    ]);
    if (failures === 3) { const el = document.getElementById('toast'); if (el) WOS.toast('Dashboard data unavailable — server unreachable'); }
    drawKpis();
    if (analyticsDown) drawAnalyticsDown();
    else { drawCloud(); drawTopics(); drawInsights(); }
    drawFlow(); drawComposition(); drawGraph(); drawRecent(); drawGeo(); drawSentiment();
  }

  // explicit failure state for the analytics panels, with a retry link —
  // never mistake "could not load" for "no data yet"
  function drawAnalyticsDown() {
    const msg = `<div class="empty-inline">analytics unavailable — <a href="#" class="ov-retry">retry</a></div>`;
    ['ovCloud', 'ovTopics', 'ovInsights', 'ovGraph', 'ovLinks', 'ovSentiment'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
    document.querySelectorAll('.ov-retry').forEach(x =>
      x.addEventListener('click', (e) => { e.preventDefault(); load(); }));
  }

  // ── KPI strip ────────────────────────────────────────────────
  function drawKpis() {
    const host = document.getElementById('ovKpis');
    const t = (status && status.totals) || { specs: 0, healthy: 0, degraded: 0, failing: 0, observations_24h: 0 };
    const pct = (n) => t.specs ? Math.round(n / t.specs * 100) + '%' : '—';
    const card = (icon, tint, v, label, sub, cls = '') =>
      `<div class="ov-kpi"><span class="ov-kic t-${tint}">${WOS.icon(icon, 16)}</span>
        <div class="ov-kpi-v">${v}</div><div class="ov-kpi-l">${label}</div>
        <div class="ov-kpi-s ${cls}">${sub}</div></div>`;
    host.innerHTML =
      card('database', 'ink', t.specs, 'Total sources',
        t.observations_24h ? `↑ ${t.observations_24h} obs (24h)` : '— quiet (24h)', t.observations_24h ? 'up' : '') +
      card('heart', 'ok', t.healthy, 'Healthy', pct(t.healthy), 'ok') +
      card('alert-triangle', 'warn', t.degraded, 'Degraded', pct(t.degraded), 'warn') +
      card('circle-x', 'bad', t.failing, 'Failing', pct(t.failing), 'bad');
  }

  // ── word cloud + top topics ──────────────────────────────────
  function drawCloud() {
    const terms = (a.top_terms || []).slice(0, 40);
    const el = document.getElementById('ovCloud');
    if (!terms.length) { el.innerHTML = empty(); return; }
    el.innerHTML = '';
    const ch = mk('ovCloud');
    if (!ch) return;
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      series: [{ type: 'wordCloud', shape: 'circle', width: '96%', height: '96%',
        sizeRange: [11, 46], rotationRange: [-30, 30], rotationStep: 15,
        gridSize: 8, drawOutOfBound: false, layoutAnimation: true,
        textStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 600,
          color: () => PALETTE[Math.floor(Math.random() * PALETTE.length)] },
        emphasis: { textStyle: { shadowBlur: 6, shadowColor: 'rgba(122,26,42,.3)' } },
        data: terms.map(t => ({ name: t.name, value: t.value })) }],
    });
  }

  function drawTopics() {
    const host = document.getElementById('ovTopics');
    const terms = (a.top_terms || []).slice(0, 7);
    if (!terms.length) { host.innerHTML = empty(); return; }
    const total = (a.top_terms || []).reduce((s, t) => s + t.value, 0) || 1;
    const max = terms[0].value || 1;
    host.innerHTML = terms.map((t, i) => `<div class="ov-topic-row">
      <span class="ov-topic-name">${esc(t.name)}</span>
      <span class="ov-topic-bar"><i style="width:${Math.max(3, Math.round(t.value / max * 100))}%;background:${PALETTE[i % PALETTE.length]}"></i></span>
      <b>${t.value}</b><i class="ov-topic-pct">${Math.max(1, Math.round(t.value / total * 100))}%</i></div>`).join('');
  }

  // ── key insights (generated from the analytics blob) ─────────
  function drawInsights() {
    const host = document.getElementById('ovInsights');
    const vol = (a.volume || {}).total || [];
    const cards = [];
    if ((a.trending || []).length) {
      const x = a.trending[0];
      cards.push(['sparkles', 'ink', 'Rising: ' + x.name,
        `${x.recent} observations in the last 24h — baseline ${x.baseline}/wk.`, 'Trend ↑']);
    }
    if ((a.hot_now || []).length) {
      const x = a.hot_now[0];
      cards.push(['zap', 'ink', (x.name || 'feed') + ' running hot',
        `${x.value} items in the last 24h — heat ×${x.heat} vs baseline.`, 'Heat']);
    }
    const bs = toneTotals();
    const tot = bs.pos + bs.neu + bs.neg;
    if (tot) {
      const p = Math.round(bs.pos / tot * 100), n = Math.round(bs.neg / tot * 100);
      const lean = p >= 34 ? ['circle-check', 'ok', 'Positive lean', `${p}% positive vs ${n}% negative across ${tot} items.`]
        : (bs.neg > bs.pos ? ['alert-triangle', 'bad', 'Negative lean', `${n}% negative vs ${p}% positive across ${tot} items.`]
          : ['circle-dot', 'ink', 'Neutral stream', `Only ${p}% positive / ${n}% negative — an informative stream of ${tot} items.`]);
      cards.push([lean[0], lean[1], lean[2], lean[3], 'Signal']);
    }
    if (vol.length >= 2) {
      const last = vol[vol.length - 1] || 0, prev = vol[vol.length - 2] || 0;
      if (prev) {
        const d = Math.round((last - prev) / prev * 100);
        cards.push(['trending-up', d >= 0 ? 'ok' : 'bad', d >= 0 ? `Volume up ${d}%` : `Volume down ${-d}%`,
          `${last} observations in the latest bucket vs ${prev} before.`, d >= 0 ? '↑ ' + d + '%' : '↓ ' + (-d) + '%']);
      }
    }
    if (!cards.length) { host.innerHTML = empty(); return; }
    host.innerHTML = cards.slice(0, 4).map(([icon, tint, title, text, pill]) =>
      `<div class="ov-insight">
        <span class="ov-insight-ic t-${tint}">${WOS.icon(icon, 14)}</span>
        <div class="ov-insight-main"><div class="ov-insight-t">${title}</div><div class="ov-insight-x">${text}</div></div>
        <div class="ov-insight-side"><span class="ov-insight-pill">${pill}</span>
          <span class="ov-insight-sp">${spark(vol.slice(-14), 84, 22, '#3F6E50')}</span></div>
      </div>`).join('');
  }

  // ── observation flow (stacked by source) ─────────────────────
  function flowData() {
    const nb = flowH <= 24 ? 24 : flowH / 24;
    const step = (flowH / nb) * 3600000;
    const start = cut();
    const buckets = [...Array(nb).keys()].map(i => {
      const d = new Date(start + (i + 1) * step);
      return flowH <= 24 ? d.toISOString().slice(11, 13) + ':00' : d.toISOString().slice(5, 10);
    });
    const per = {};
    flowObs.forEach(o => {
      const ms = o.observed_at_ms || 0;
      if (ms < start) return;
      const bi = Math.min(nb - 1, Math.floor((ms - start) / step));
      const s = o.source || '?';
      (per[s] = per[s] || new Array(nb).fill(0))[bi]++;
    });
    const ranked = Object.entries(per).sort((x, y) =>
      y[1].reduce((m, n) => m + n, 0) - x[1].reduce((m, n) => m + n, 0));
    const top = ranked.slice(0, 6);
    const rest = ranked.slice(6);
    const series = top.map(([name, data]) => ({ name, data }));
    if (rest.length) {
      const data = new Array(nb).fill(0);
      rest.forEach(([, d]) => d.forEach((v, i) => { data[i] += v; }));
      series.push({ name: 'other', data });
    }
    return { buckets, series };
  }

  function drawFlow() {
    const el = document.getElementById('ovFlow');
    if (!flowObs.length) { el.innerHTML = empty('no observations in this window'); return; }
    el.innerHTML = '';
    const ch = mk('ovFlow');
    if (!ch) return;
    const { buckets, series } = flowData();
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      color: PALETTE,
      grid: { left: 40, right: 12, top: 14, bottom: 26 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: buckets, boundaryGap: false,
        axisTick: { show: false }, axisLine: { lineStyle: { color: '#C9C4B8' } },
        axisLabel: { fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8C877B' } },
      yAxis: { type: 'value', axisLabel: { fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8C877B' },
        splitLine: { lineStyle: { color: '#EEEAE0' } } },
      series: series.map((s, i) => ({ name: s.name, type: 'line', stack: 'ov', smooth: true, symbol: 'none',
        areaStyle: { opacity: 0.42, color: PALETTE[i % PALETTE.length] },
        lineStyle: { width: 1, color: PALETTE[i % PALETTE.length] },
        emphasis: { focus: 'series' }, data: s.data })),
    });
    document.getElementById('ovFlowLegend').innerHTML = series.map((s, i) =>
      `<span><i class="ov-lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(s.name)}</span>`).join('');
  }

  // ── source composition (donut) ───────────────────────────────
  function drawComposition() {
    const types = ((status || {}).per_type || []);
    const total = types.reduce((s, t) => s + t.specs, 0);
    document.getElementById('ovDonutN').textContent = total || '—';
    const ch = mk('ovDonut');
    if (!ch) return;
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      series: [{ type: 'pie', radius: ['58%', '82%'], center: ['50%', '50%'], padAngle: 1.5,
        label: { show: false }, labelLine: { show: false }, silent: true,
        itemStyle: { borderRadius: 3, borderColor: '#FFFFFF', borderWidth: 2 },
        data: types.map((t, i) => ({ name: t.type.toUpperCase(), value: t.specs,
          itemStyle: { color: PALETTE[i % PALETTE.length] } })) }],
    });
    document.getElementById('ovDonutLegend').innerHTML = types.map((t, i) =>
      `<li><span class="src-lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="src-lg-name">${esc(t.type.toUpperCase())}</span><b>${t.specs}</b>
        <i>${total ? Math.round(t.specs / total * 100) : 0}%</i></li>`).join('') || empty();
  }

  // ── entity connections (co-occurrence graph + strongest links)
  function drawGraph() {
    const g = a.cooccurrence || { nodes: [], links: [] };
    const el = document.getElementById('ovGraph');
    const links = (g.links || []).slice().sort((x, y) => y.value - x.value);
    const list = document.getElementById('ovLinks');
    const max = links.length ? links[0].value : 1;
    list.innerHTML = links.slice(0, 6).map((l, i) =>
      `<div class="ov-link-row"><span class="ov-lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="ov-link-name">${esc(l.source)} ↔ ${esc(l.target)}</span><b>${(l.value / max).toFixed(2)}</b></div>`).join('')
      || empty('no co-occurrences yet');
    if (!(g.nodes || []).length) { el.innerHTML = empty(); return; }
    el.innerHTML = '';
    const ch = mk('ovGraph');
    if (!ch) return;
    ch.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: { formatter: (p) => p.dataType === 'edge'
        ? `${p.data.source} ↔ ${p.data.target}: ${p.data.value}` : p.data.name },
      series: [{ type: 'graph', layout: 'force', roam: false,
        force: { repulsion: 90, edgeLength: [24, 80], gravity: 0.12 },
        label: { show: true, color: '#44413B', fontSize: 9, position: 'right' },
        lineStyle: { color: '#E2DED4', opacity: 0.7, curveness: 0.15,
          width: (e) => 0.5 + 3 * (e.value / max) },
        itemStyle: { color: '#7A1A2A' },
        data: g.nodes.slice(0, 18).map((n, i) => ({ id: n.id, name: n.name, value: n.value,
          symbolSize: 8 + 22 * Math.min(1, n.value / (g.nodes[0] ? g.nodes[0].value : 1)),
          itemStyle: { color: PALETTE[i % PALETTE.length] } })),
        links: links.slice(0, 24).map(l => ({ source: l.source, target: l.target, value: l.value })) }],
    });
  }

  // ── geographic lens + sentiment ──────────────────────────────
  function drawSentiment() {
    const host = document.getElementById('ovSentiment');
    if (!host) return;
    const bs = toneTotals();
    const total = bs.pos + bs.neu + bs.neg;
    const pct = (n) => total ? Math.round(n / total * 100) : 0;
    host.innerHTML = `<div class="ov-grad">
        <i class="neg" style="width:${pct(bs.neg)}%"></i><i class="neu" style="width:${pct(bs.neu)}%"></i><i class="pos" style="width:${pct(bs.pos)}%"></i></div>
      <div class="ov-grad-scale">
        <span class="neg"><b>${pct(bs.neg)}%</b> Negative / Risk</span>
        <span class="neu"><b>${pct(bs.neu)}%</b> Neutral / Informative</span>
        <span class="pos"><b>${pct(bs.pos)}%</b> Positive / Opportunity</span>
      </div>`;
  }

  function toneTotals() {
    return Object.values(((a.tone || {}).by_source) || {}).reduce(
      (s, b) => { s.pos += b.pos || 0; s.neu += b.neu || 0; s.neg += b.neg || 0; return s; },
      { pos: 0, neu: 0, neg: 0 });
  }

  async function drawGeo() {
    if (!window.echarts) return;
    try {
      if (!mapReady) mapReady = fetch('./js/vendor/world.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(g => { echarts.registerMap('world', g); return true; });
      await mapReady;
    } catch { mapReady = null; return; }
    const regions = Object.entries(a.regions || {}).filter(([k]) => k !== 'Unknown' && k)
      .sort((x, y) => y[1] - x[1]);
    const total = regions.reduce((s, [, n]) => s + n, 0);
    const ch = mk('ovGeo');
    if (!ch) return;
    ch.setOption({
      geo: { map: 'world', roam: false, silent: true, left: 0, right: 0, top: 8, bottom: 8,
        itemStyle: { areaColor: '#EFEBE1', borderColor: '#D8D2C4' } },
      series: [{ type: 'scatter', coordinateSystem: 'geo',
        data: regions.map(([name, n]) => ({ name, value: REGION_COORDS[name] || [0, 0], count: n })),
        symbolSize: (_v, p) => 10 + 30 * ((p.data.count || 0) / (total || 1)),
        itemStyle: { color: '#7A1A2A', opacity: 0.75 } }],
    });
    const legend = document.getElementById('ovGeoLegend');
    if (!total) { legend.innerHTML = `<li class="ov-geo-none">No regional signals yet — origin regions come from GDELT-collected items.</li>`; return; }
    legend.innerHTML = regions.slice(0, 7).map(([name, n], i) =>
      `<li><span class="src-lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="src-lg-name">${esc(name)}</span><i>${Math.round(n / total * 100)}%</i></li>`).join('');
  }

  // ── recent observations ──────────────────────────────────────
  function drawRecent() {
    const host = document.getElementById('ovRecent');
    if (!recent.length) { host.innerHTML = empty(); return; }
    const dotColor = (s) => PALETTE[[...s].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length];
    host.innerHTML = recent.map(o => {
      const pill = PILL[o.source] ? `<span class="src-pill p-${PILL[o.source]}">${esc(o.source.toUpperCase())}</span>`
        : `<span class="src-pill p-other">${esc((o.source || '?').toUpperCase())}</span>`;
      return `<div class="ov-feed-item"><span class="src-feed-dot" style="background:${dotColor(o.source || '?')}"></span>
        <span class="src-feed-t">${hhmm(o.observed_at_ms)}</span>
        <span class="ov-feed-x">${esc(o.title || (o.body || '').slice(0, 90) || '(no title)')}</span>${pill}</div>`;
    }).join('');
  }

  // ── lifecycle ────────────────────────────────────────────────
  function afterRender() {
    document.getElementById('ovFlowSeg')?.querySelectorAll('button').forEach(b =>
      b.addEventListener('click', () => {
        if (flowH === parseInt(b.dataset.h, 10)) return;
        flowH = parseInt(b.dataset.h, 10);
        document.querySelectorAll('#ovFlowSeg .seg-btn').forEach(x =>
          x.classList.toggle('active', x === b));
        fetch('./api/search?limit=1000&since_ms=' + cut()).then(r => { if (!r.ok) throw 0; return r.json(); })
          .then(j => { flowObs = (j && j.items) || []; drawFlow(); })
          .catch(() => { WOS.toast('Could not refresh flow data'); });
      }));
    if (!WOS._ovResize) {
      WOS._ovResize = true;
      window.addEventListener('resize', () => Object.values(charts).forEach(c => { try { c.resize(); } catch {} }));
    }
    load();
  }

  return { render, afterRender };
})();
