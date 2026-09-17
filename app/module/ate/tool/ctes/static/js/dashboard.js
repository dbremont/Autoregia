/* ════════════════════════════════════════════════════════════
   CTES Dashboard — the register at a glance: outcome rates,
   per-handle activity, the latest runs, and execution-backend
   health. Data: /api/self + the run journal.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Dashboard = (() => {
  const v = CTES.view;
  const STATUS_COLOR = { completed: '#3F6092', failed: '#A33434', timed_out: '#B4742A' };
  let self = null, recent = [];

  function render() {
    return `
      ${v.header('Dashboard')}
      <div class="stat-row animate-in" id="dashStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Runs by status</h3></div></div>
          <div class="chart-box" id="dashStatus"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">register</span><h3>Runs per handle</h3></div></div>
          <div class="chart-box" id="dashHandles"></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">backends</span><h3>Execution environments</h3></div></div>
          <div id="dashBackends"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Latest runs</h3></div>
            <a href="#runs" class="text-mono text-xs">all runs →</a></div>
          <div id="dashRecent"><div class="empty-state">loading…</div></div>
        </div>
      </div>`;
  }

  function statColor(rate) {
    if (rate == null) return '';
    return rate >= 0.9 ? '#3F6E50' : (rate >= 0.6 ? '#B4742A' : '#A33434');
  }

  function draw(selfBlob, runs) {
    const reg = selfBlob.register || {};
    const runs24 = selfBlob.runs || {};
    document.getElementById('dashStats').innerHTML =
      v.statCard(`${reg.active ?? '—'}<span class="text-faint" style="font-size:var(--text-md)">/${reg.handles ?? '—'}</span>`, 'active handles') +
      v.statCard(runs24.last_24h ?? '—', 'runs · last 24h') +
      v.statCard(runs24.success_rate_24h != null ? Math.round(runs24.success_rate_24h * 100) + '%' : '—', 'success rate 24h', statColor(runs24.success_rate_24h)) +
      v.statCard((runs24.by_status || {}).failed || 0, 'failed · total', '#A33434') +
      v.statCard(reg.code_missing || 0, 'code missing', reg.code_missing ? '#B4742A' : '');

    // donut — runs by status
    const byStatus = runs24.by_status || {};
    const sData = Object.entries(byStatus).map(([k, val]) => ({ name: k, value: val }));
    const chart1 = echarts.init(document.getElementById('dashStatus'));
    chart1.setOption({
      color: Object.keys(byStatus).map(k => STATUS_COLOR[k] || '#8C877B'),
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['52%', '78%'], center: ['50%', '50%'],
        label: { show: true, formatter: '{b}\n{c}', fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#6B665B' },
        data: sData, itemStyle: { borderColor: '#FAFAF6', borderWidth: 2 },
      }],
    });
    chart1.on('click', p => CTES.applyFilter({ status: p.name }));
    CTES._charts = (CTES._charts || []).concat([chart1]);

    // bar — runs per handle
    const byHandle = {};
    (selfBlob.handleRuns || []).forEach(r => { byHandle[r.handle_id] = (byHandle[r.handle_id] || 0) + 1; });
    const hNames = Object.keys(byHandle).sort();
    const chart2 = echarts.init(document.getElementById('dashHandles'));
    chart2.setOption({
      grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', splitLine: { show: false } },
      yAxis: { type: 'category', data: hNames, axisLabel: { fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#6B665B' } },
      series: [{ type: 'bar', data: hNames.map(h => byHandle[h]), itemStyle: { color: '#A8854A', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 16 }],
    });
    chart2.on('click', p => CTES.applyFilter({ handle: p.name }));
    CTES._charts.push(chart2);

    // backends strip
    const b = selfBlob.backends || {};
    document.getElementById('dashBackends').innerHTML = `
      <div class="meta-table">
        ${brow('docker cli', b.docker_cli ? 'present' : 'absent', b.docker_cli)}
        ${brow('docker image', `${CTES.esc(b.docker_image || '—')}${b.docker_image_ready ? '' : ' (not local — pulled on first use)'}`, b.docker_cli)}
        ${brow('subprocess fallback', 'always available', true)}
        ${brow('default backend', CTES.esc(b.default || 'auto'), true)}
        ${brow('store', CTES.esc((selfBlob.store || {}).db || 'ctes'), true)}
      </div>`;

    // latest runs
    const host = document.getElementById('dashRecent');
    if (!runs.length) { host.innerHTML = '<div class="empty-state">no runs yet — run a handle from the register</div>'; return; }
    host.innerHTML = runs.slice(0, 8).map(r => `
      <div class="ov-feed-item" data-run="${CTES.esc(r.id)}" style="cursor:pointer">
        <span class="src-feed-dot" style="background:${STATUS_COLOR[r.status] || '#8C877B'}"></span>
        <span class="src-feed-t">${CTES.esc(CTES.Store.fmtTime(r.started_at).slice(11))}</span>
        <span class="ov-feed-x"><b>${CTES.esc(r.handle_id)}</b> — ${CTES.esc(r.status)} · ${CTES.Store.fmtDur(r.duration_ms)}</span>
      </div>`).join('');
    host.querySelectorAll('[data-run]').forEach(el => el.addEventListener('click', () => {
      CTES.navigate('runs'); setTimeout(() => CTES.Runs.showRun(el.dataset.run), 80);
    }));
  }

  function brow(label, val, ok) {
    return `<div class="meta-row"><span class="meta-key">${label}</span><span class="meta-val"><span class="src-health"><span class="src-dot" style="background:${ok ? '#3F6E50' : '#8C877B'}"></span>${val}</span></span></div>`;
  }

  async function afterRender() {
    try {
      const [selfBlob, runs] = await Promise.all([
        CTES.Store.selfBlob(),
        fetch('api/runs?limit=200').then(r => r.json()),
      ]);
      // per-handle counts from the register docs (stats included in list)
      selfBlob.handleRuns = [];
      (CTES.Store.handles() || []).forEach(h => {
        const n = (h.stats && h.stats.total) || 0;
        for (let i = 0; i < n; i++) selfBlob.handleRuns.push({ handle_id: h.id });
      });
      self = selfBlob; recent = runs;
      draw(selfBlob, runs);
    } catch (e) {
      document.getElementById('dashStats').innerHTML = '';
      document.getElementById('dashRecent').innerHTML = `<div class="empty-state">could not reach the store — ${CTES.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
