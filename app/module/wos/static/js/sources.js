/* ════════════════════════════════════════════════════════════
   WOS Sources — the Sources plate (wos.png replica).
   The stat strip, the Source Types donut, the table and the
   Collection Status card are all live over
   GET /api/sources/status — paginated, searchable, filterable.
   Recent Observations and the Observation Activity chart keep
   the mock's figures. Per-spec observation counts are not
   derivable (docs carry only the adapter name), so
   Observations/Activity report per type.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.Sources = (() => {
  const PAGE_SIZE = 10;

  // ── plate figures ──
  // Same palette as the dashboard's Source Composition donut, so
  // both donuts colour the adapter types identically.
  const PALETTE = ['#7A1A2A', '#3F6092', '#A8854A', '#3F6E50', '#5C4E78', '#3F6092', '#B4742A', '#A33434'];
  const FEED = [
    { t: '12:42', c: '#A8854A', text: 'Large language models show new alignment patterns' },
    { t: '12:37', c: '#3F6E50', text: 'Agentic systems and tool use in the wild' },
    { t: '12:31', c: '#A33434', text: 'Economic indicators show increased volatility' },
    { t: '12:24', c: '#5C4E78', text: 'New research on multimodal learning models' },
    { t: '12:18', c: '#3F6092', text: 'Policy updates in AI regulation across regions' },
  ];
  const STYLE = {
    arxiv:    { tile: 'ar', pill: 'arxiv' },
    rss:      { tile: 'rss', pill: 'rss' },
    nitter:   { tile: 'X',  pill: 'nitter' },
    crossref: { tile: 'cr', pill: 'crossref' },
    biorxiv:  { tile: 'bx', pill: 'biorxiv' },
    openalex: { tile: 'oa', pill: 'openalex' },
  };
  const HEALTH = {
    healthy:  ['Healthy', 'ok'],
    degraded: ['Degraded', 'warn'],
    failing:  ['Failing', 'bad'],
    pending:  ['Pending', 'idle'],
  };

  // ── live table state ──
  let _status = null;
  const filter = { q: '', chip: 'all', type: 'all', activity: 'any', last: 'any' };
  let page = 0;

  // deterministic pseudo-random walk for the activity chart (mock-like)
  function mulberry32(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function activitySeries() {
    const colors = ['#7A1A2A', '#962030', '#B4742A', '#A8854A', '#C7A972'];
    const hours = [...Array(25).keys()].map(h => String(h).padStart(2, '0') + ':00');
    return colors.map((color, si) => {
      const rnd = mulberry32(11 + si * 7);
      let v = 260 + rnd() * 180;
      return { name: 's' + si, color,
        data: hours.map((x) => {
          v = Math.max(120, Math.min(590, v + (rnd() - 0.48) * 130));
          return { x, y: Math.round(v) };
        }) };
    });
  }

  function fmtRel(ms) {
    if (!ms) return '—';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  function statStrip() {
    const item = (id, label, dot) =>
      `<div class="src-stat"><div class="src-stat-v">${dot ? `<span class="src-dot ${dot}"></span>` : ''}<span id="${id}">—</span></div><div class="src-stat-l">${label}</div></div>`;
    return `<div class="src-stats">
      ${item('srcStatTotal', 'Total sources', '')}
      ${item('srcStatHealthy', 'Healthy', 'ok')}
      ${item('srcStatDegraded', 'Degraded', 'warn')}
      ${item('srcStatFailing', 'Failing', 'bad')}
    </div>`;
  }

  function typesPanel() {
    return `<section class="panel src-panel">
      <div class="src-phead"><span class="src-ptitle">Source Types</span></div>
      <div class="src-types-body">
        <div class="src-donut-wrap">
          <div class="chart-box src-donut-box" id="srcTypesChart"></div>
          <div class="src-donut-center"><div class="src-donut-n" id="srcDonutN">—</div><div class="src-donut-cap">total</div></div>
        </div>
        <ul class="src-legend" id="srcTypesLegend"></ul>
      </div>
    </section>`;
  }

  function quickActionsPanel() {
    const act = (id, icon, label) =>
      `<button class="src-action" id="${id}">${WOS.icon(icon, 15)} ${label}</button>`;
    return `<section class="panel src-panel">
      <div class="src-phead"><span class="src-ptitle">Quick Actions</span></div>
      <div class="src-actions src-actions-panel">
        ${act('srcPollAll', 'refresh', 'Poll all sources')}
        ${act('srcViewFailed', 'alert-triangle', 'View failed sources')}
        ${act('srcAddSource', 'plus', 'Add source')}
      </div>
    </section>`;
  }

  function activityPanel() {
    return `<section class="panel src-panel src-panel-activity">
      <div class="src-phead"><span class="src-ptitle">Observation Activity</span>
        <select class="src-select src-select-bare" tabindex="-1"><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select></div>
      <div class="src-activity-body">
        <div class="chart-box src-activity-chart" id="srcActivityChart"></div>
        <div class="src-activity-sum">
          <div class="src-big">3,842</div><div class="src-cap">Total observations</div>
          <div class="src-delta">+12%</div><div class="src-cap">vs. previous day</div>
        </div>
      </div>
    </section>`;
  }

  function toolbar() {
    return `<div class="src-toolbar">
      <div class="src-search"><span class="src-search-ic">${WOS.icon('search', 14)}</span>
        <input type="search" id="srcSearchInput" placeholder="Search sources…" autocomplete="off"></div>
      <div class="src-chips" id="srcChips"></div>
      <div class="src-toolbar-right">
        <select class="src-select" id="srcTypeSel" aria-label="Filter by type"><option value="all">Type</option></select>
        <select class="src-select" id="srcActSel" aria-label="Filter by activity">
          <option value="any">Activity</option><option value="none">No activity (+0)</option>
          <option value="some">Active (1–9)</option><option value="hot">Hot (10+)</option></select>
        <select class="src-select" id="srcLastSel" aria-label="Filter by last observed">
          <option value="any">Last observed</option><option value="15">Last 15 min</option>
          <option value="60">Last hour</option><option value="1440">Last 24 h</option></select>
        <button class="btn-icon" title="Density" aria-label="Density" tabindex="-1">${WOS.icon('list', 16)}</button>
      </div>
    </div>`;
  }

  function rail() {
    return `<aside class="src-rail">
      <section class="panel src-panel">
        <div class="src-phead"><span class="src-ptitle">Recent Observations</span><a class="src-viewall" href="#search">View all →</a></div>
        <div class="src-feed">${FEED.map(f =>
          `<div class="src-feed-item"><span class="src-feed-dot" style="background:${f.c}"></span><span class="src-feed-t">${f.t}</span><span class="src-feed-x">${f.text}</span></div>`).join('')}
        </div>
      </section>
      <section class="panel src-panel">
        <div class="src-phead"><span class="src-ptitle">Collection Status</span></div>
        <div id="srcStatusHost"><div class="src-status src-status-loading">…</div></div>
      </section>
      <section class="panel src-panel">
        <div class="src-phead"><span class="src-ptitle">Next Poll</span><span class="src-next-in">In 5 min</span></div>
        <div class="src-next-body"><div class="src-next-bar"><i style="width:78%"></i></div></div>
      </section>
    </aside>`;
  }

  function render() {
    return `<div class="src-page animate-in">
      <div class="src-head">
        <div class="src-head-main">
          <h1>Sources</h1>
          <p class="src-sub">Sources that feed the World Observation System with observations of the changing world.</p>
        </div>
        ${statStrip()}
      </div>
      <div class="src-panels">
        ${quickActionsPanel()}
        ${activityPanel()}
        ${typesPanel()}
      </div>
      <div class="src-body">
        <div class="src-main">${toolbar()}
          <div class="panel src-table-wrap" id="srcTableHost"><div class="src-status-loading">Loading sources…</div></div>
        </div>
        ${rail()}
      </div>
    </div>`;
  }

  // ── live table ───────────────────────────────────────────────
  function drawChips() {
    const host = document.getElementById('srcChips');
    if (!host || !_status) return;
    const t = _status.totals;
    const chip = (key, label, n, dot) =>
      `<button class="src-chip${filter.chip === key ? ' on' : ''}" data-chip="${key}">${dot ? `<span class="src-dot ${dot}"></span>` : ''}${label} (${n})</button>`;
    host.innerHTML =
      chip('all', 'All', t.specs, '') +
      chip('healthy', 'Healthy', t.healthy, 'ok') +
      chip('degraded', 'Degraded', t.degraded, 'warn') +
      chip('failing', 'Failing', t.failing, 'bad');
    host.querySelectorAll('.src-chip').forEach(ch => ch.addEventListener('click', () => {
      filter.chip = ch.dataset.chip; page = 0; drawChips(); drawTable();
    }));
    // type select: real adapter names, current selection preserved
    const sel = document.getElementById('srcTypeSel');
    if (sel) {
      const cur = filter.type;
      sel.innerHTML = '<option value="all">Type</option>' + _status.per_type.map(t =>
        `<option value="${WOS.esc(t.type)}"${t.type === cur ? ' selected' : ''}>${WOS.esc(t.type.toUpperCase())} (${t.specs})</option>`).join('');
    }
  }

  function drawTable() {
    const host = document.getElementById('srcTableHost');
    if (!host || !_status) return;
    const perType = new Map(_status.per_type.map(t => [t.type, t]));
    const actOf = s => (perType.get(s.source) || {}).observations_24h || 0;
    let rows = _status.sources;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(s => s.id.toLowerCase().includes(q) ||
        (s.query || '').toLowerCase().includes(q));
    }
    if (filter.chip !== 'all') rows = rows.filter(s => s.health === filter.chip);
    if (filter.type !== 'all') rows = rows.filter(s => s.source === filter.type);
    if (filter.activity === 'none') rows = rows.filter(s => actOf(s) === 0);
    else if (filter.activity === 'some') rows = rows.filter(s => actOf(s) >= 1 && actOf(s) < 10);
    else if (filter.activity === 'hot') rows = rows.filter(s => actOf(s) >= 10);
    if (filter.last !== 'any') {
      const cut = Date.now() - Number(filter.last) * 60000;
      rows = rows.filter(s => s.last_observed_ms && s.last_observed_ms >= cut);
    }

    const pc = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (page >= pc) page = pc - 1;
    const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const tr = (s) => {
      const st = STYLE[s.source] || STYLE.openalex;
      const pt = perType.get(s.source) || {};
      const delta = pt.observations_24h || 0;
      const [label, dot] = HEALTH[s.health] || [s.health, 'idle'];
      return `<tr>
        <td><div class="src-src"><span class="src-tile t-${st.pill}">${st.tile}</span>
          <div class="src-src-names"><div class="src-name">${WOS.esc(s.query || s.id)}</div>
          <div class="src-id">${WOS.esc(s.id)} · ${s.interval_s ? s.interval_s + 's' : 'auto'}${s.enabled === false ? ' · disabled' : ''}</div></div></div></td>
        <td><span class="src-pill p-${st.pill}">${WOS.esc((s.source || '').toUpperCase())}</span></td>
        <td class="src-num">${pt.observations ?? 0}</td>
        <td class="src-num ${delta > 0 ? 'src-up' : 'src-flat'}">+${delta}</td>
        <td class="src-ago">${fmtRel(s.last_observed_ms)}</td>
        <td><span class="src-health"><span class="src-dot ${dot}"></span>${label}</span></td>
        <td class="src-actions-cell"><button class="btn-icon" data-row-menu="${WOS.esc(s.id)}" aria-label="Row options">${WOS.icon('ellipsis', 16)}</button></td>
      </tr>`;
    };

    host.innerHTML = `
      <table class="src-table">
        <thead><tr><th>Source</th><th>Type</th><th>Observations</th><th>Activity</th><th>Last observed</th><th>Health</th><th></th></tr></thead>
        <tbody>${slice.map(tr).join('')}</tbody>
      </table>
      ${rows.length ? `<div class="src-pager" id="srcPager">
        <button class="src-page-btn" id="srcPrev" ${page > 0 ? '' : 'disabled'} aria-label="Previous page">${WOS.icon('chevron-left', 15)}</button>
        <span class="src-page-ind">${page + 1} / ${pc}</span>
        <button class="src-page-btn" id="srcNext" ${page < pc - 1 ? '' : 'disabled'} aria-label="Next page">${WOS.icon('chevron-right', 15)}</button>
      </div>` : `<div class="empty-state"><h3>No sources match</h3><p>Adjust the search or filters.</p></div>`}`;

    document.getElementById('srcPrev')?.addEventListener('click', () => { page--; drawTable(); });
    document.getElementById('srcNext')?.addEventListener('click', () => { page++; drawTable(); });
  }

  function drawStats() {
    const t = _status.totals;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set('srcStatTotal', t.specs);
    set('srcStatHealthy', t.healthy);
    set('srcStatDegraded', t.degraded);
    set('srcStatFailing', t.failing);
  }

  let _donutChart = null;

  function drawTypes() {
    // same data + palette as the dashboard's Source Composition donut
    const types = _status.per_type || [];
    const total = types.reduce((s, t) => s + t.specs, 0);
    const nEl = document.getElementById('srcDonutN');
    if (nEl) nEl.textContent = total || '—';
    const legend = document.getElementById('srcTypesLegend');
    if (legend) legend.innerHTML = types.map((t, i) =>
      `<li><span class="src-lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></span><span class="src-lg-name">${WOS.esc(t.type.toUpperCase())}</span><b>${t.specs}</b><i>${total ? Math.round(t.specs / total * 100) : 0}%</i></li>`).join('');
    const el = document.getElementById('srcTypesChart');
    if (!el || !window.echarts) return;
    if (!_donutChart) {
      _donutChart = echarts.init(el, null, { renderer: 'canvas' });
      window.addEventListener('resize', () => { try { _donutChart.resize(); } catch {} });
    }
    _donutChart.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      series: [{ type: 'pie', radius: ['58%', '82%'], center: ['50%', '50%'], padAngle: 1.5,
        label: { show: false }, labelLine: { show: false }, silent: true,
        itemStyle: { borderRadius: 3, borderColor: '#FFFFFF', borderWidth: 2 },
        data: types.map((t, i) => ({ name: t.type.toUpperCase(), value: t.specs,
          itemStyle: { color: PALETTE[i % PALETTE.length] } })) }],
    });
  }

  function drawStatus() {
    const host = document.getElementById('srcStatusHost');
    if (!host || !_status) return;
    const t = _status.totals;
    const row = (dot, label, n) =>
      `<div class="src-status-row"><span class="src-dot ${dot}"></span><span>${label}</span><b>${n}</b></div>`;
    host.innerHTML = `<div class="src-status">
      ${row('ok', 'Healthy', t.healthy)}
      ${row('warn', 'Degraded', t.degraded)}
      ${row('bad', 'Failing', t.failing)}
      ${row('idle', 'Pending', t.pending)}
      <div class="src-status-total">${t.observations} observations · +${t.observations_24h} today</div>
    </div>`;
  }

  function loadStatus() {
    fetch('./api/sources/status')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => {
        // same ordering convention as GET /api/sources: type, then id
        j.sources.sort((a, b) => (a.source || '').localeCompare(b.source || '') ||
          (a.id || '').localeCompare(b.id || ''));
        _status = j; drawStats(); drawTypes(); drawChips(); drawTable(); drawStatus();
      })
      .catch(() => {
        const h = document.getElementById('srcTableHost');
        if (h) h.innerHTML = '<div class="empty-state"><h3>Sources unavailable</h3><p>The store could not be reached.</p></div>';
        const s = document.getElementById('srcStatusHost');
        if (s) s.innerHTML = '';
      });
  }

  // ── row options menu (… button) ──────────────────────────────
  let _menuBound = false;

  function closeRowMenu() { document.querySelectorAll('.src-menu').forEach(m => m.remove()); }

  function openRowMenu(btn) {
    closeRowMenu();
    const id = btn.dataset.rowMenu;
    const s = (_status.sources || []).find(x => x.id === id);
    if (!s) return;
    const menu = document.createElement('div');
    menu.className = 'src-menu';
    const item = (act, icon, label) => `<button data-act="${act}">${WOS.icon(icon, 14)} ${label}</button>`;
    menu.innerHTML = item('poll', 'refresh', 'Poll now')
      + item('view', 'eye', 'View observations')
      + item('copy', 'fingerprint', 'Copy ID');
    const r = btn.getBoundingClientRect();
    menu.style.top = Math.min(r.bottom + 4, window.innerHeight - 130) + 'px';
    menu.style.left = Math.min(r.left, window.innerWidth - 200) + 'px';
    document.body.appendChild(menu);
    menu.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      closeRowMenu();
      if (act === 'poll') pollNow(id);
      else if (act === 'view') WOS.applyFilter({ source: s.source, q: '' });
      else if (act === 'copy') copyId(id);
    });
  }

  function pollNow(id) {
    WOS.toast('Polling ' + id + '…');
    fetch('./api/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, force: true }) })
      .then(r => r.json())
      .then(j => {
        WOS.toast(j.error ? 'Poll failed: ' + j.error : 'Polled — ' + (j.fetched ?? 0) + ' fetched');
        loadStatus();
      })
      .catch(() => WOS.toast('Poll failed'));
  }

  function copyId(id) {
    const done = () => WOS.toast('ID copied');
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = id; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch { WOS.toast('Copy failed'); }
      t.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(id).then(done).catch(fallback);
    else fallback();
  }

  function bindRowMenu() {
    if (_menuBound) return; _menuBound = true;
    document.getElementById('srcTableHost')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-row-menu]');
      if (b) { e.stopPropagation(); openRowMenu(b); }
      else closeRowMenu();
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.src-menu')) closeRowMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRowMenu(); });
  }

  function afterRender() {
    // observation activity — thin multi-series lines, 00:00–24:00
    const el = document.getElementById('srcActivityChart');
    if (el && window.echarts) {
      const ch = echarts.init(el, null, { renderer: 'canvas' });
      const series = activitySeries();
      ch.setOption({
        textStyle: { fontFamily: 'Inter, sans-serif', color: '#2C2A26' },
        color: series.map(s => s.color),
        grid: { left: 34, right: 10, top: 12, bottom: 22 },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: series[0].data.map(p => p.x), boundaryGap: false,
          axisTick: { show: false }, axisLine: { lineStyle: { color: '#C9C4B8' } },
          axisLabel: { interval: 3, fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8C877B' } },
        yAxis: { type: 'value', max: 600, interval: 200,
          axisLabel: { fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#8C877B' },
          splitLine: { lineStyle: { color: '#EEEAE0' } } },
        series: series.map(s => ({ name: s.name, type: 'line', smooth: true, symbol: 'none',
          lineStyle: { width: 1.2, color: s.color }, itemStyle: { color: s.color },
          data: s.data.map(p => p.y) })),
      });
      window.addEventListener('resize', () => { try { ch.resize(); } catch {} });
    }
    // source types donut is drawn live in drawTypes() once status loads

    // ── wire the live toolbar + quick actions ──
    const si = document.getElementById('srcSearchInput');
    si?.addEventListener('input', () => { filter.q = si.value.trim(); page = 0; drawTable(); });
    document.getElementById('srcTypeSel')?.addEventListener('change', e => { filter.type = e.target.value; page = 0; drawTable(); });
    document.getElementById('srcActSel')?.addEventListener('change', e => { filter.activity = e.target.value; page = 0; drawTable(); });
    document.getElementById('srcLastSel')?.addEventListener('change', e => { filter.last = e.target.value; page = 0; drawTable(); });

    document.getElementById('srcPollAll')?.addEventListener('click',
      () => WOS.toast('Polls run on the collector schedule — no manual sweep in this build'));
    document.getElementById('srcViewFailed')?.addEventListener('click', () => {
      filter.chip = 'failing'; page = 0; drawChips(); drawTable();
    });
    document.getElementById('srcAddSource')?.addEventListener('click',
      () => WOS.toast('Sources are seed-managed — edit config/seed.json'));

    bindRowMenu();
    loadStatus();
  }

  return { render, afterRender };
})();
