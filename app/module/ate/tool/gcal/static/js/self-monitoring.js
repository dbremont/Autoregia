/* ════════════════════════════════════════════════════════════
    GCAL Self Monitoring — the manager observing itself: store
    health, connection states, execution outcomes and timing,
    the connector registry, the effective settings.
    Data: /api/self.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.SelfMonitoring = (() => {
  const v = GCAL.view;
  let data = null;

  function render() {
    return `
      ${v.header('Self Monitoring')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Is the manager itself sound?</strong> The store, the shape of the connection set, execution outcomes, the registry, and the effective policy.</p>
      <div class="stat-row animate-in" id="smStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">store</span><h3>Documents by type</h3></div><span class="form-hint" id="smDb"></span></div>
          <div id="smDocs"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">gateway</span><h3>Connections by state</h3></div></div>
          <div id="smConns"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">registry</span><h3>Connectors</h3></div></div>
          <div id="smRegistry"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">policy</span><h3>Effective settings</h3></div></div>
          <div id="smSettings"><div class="empty-state">loading…</div></div>
        </div>
      </div>`;
  }

  function row(label, val, ok) {
    return `<div class="meta-row"><span class="meta-key">${label}</span><span class="meta-val"><span class="src-health"><span class="src-dot" style="background:${ok === false ? '#A33434' : (ok === true ? '#3F6E50' : '#8C877B')}"></span>${val}</span></span></div>`;
  }

  function draw() {
    const d = data;
    const up = d.uptime_s != null ? GCAL.Store.fmtDur(d.uptime_s * 1000) : '—';
    const docs = d.store.docs || {};
    const totalDocs = Object.values(docs).reduce((a, b) => a + b, 0);
    document.getElementById('smStats').innerHTML =
      v.statCard(up, 'server uptime') +
      v.statCard(totalDocs, 'docs in store') +
      v.statCard((d.connections || {}).total ?? '—', 'connections') +
      v.statCard((d.executions || {}).total ?? '—', 'executions logged') +
      v.statCard((d.executions || {}).avg_duration_ms != null ? (d.executions.avg_duration_ms + 'ms') : '—', 'avg run time');
    document.getElementById('smDb').textContent = `db ${d.store.db || 'gcal'}`;

    document.getElementById('smDocs').innerHTML = `
      <div class="meta-table">
        ${['connection', 'execution', 'audit', 'settings'].map(t => row(t, docs[t] ?? 0)).join('')}
      </div>`;

    const byState = (d.connections || {}).by_state || {};
    document.getElementById('smConns').innerHTML = `
      <div class="meta-table">
        ${Object.keys(byState).length ? Object.entries(byState).map(([s, n]) =>
          `<div class="meta-row"><span class="meta-key"><span class="state-pill state-${GCAL.esc(s)}">${GCAL.esc(s)}</span></span><span class="meta-val">${n}</span></div>`).join('')
          : '<div class="empty-state">no connections yet</div>'}
      </div>`;

    document.getElementById('smRegistry').innerHTML = `
      <div class="meta-table">
        ${((d.engine || {}).connectors || []).map(p => row(
          p.id, `${p.status} · ${p.actions} action(s)`,
          p.status === 'live' ? true : null)).join('')}
      </div>`;

    const s = d.settings || {};
    document.getElementById('smSettings').innerHTML = `
      <div class="meta-table">
        ${row('default timeout', (s.default_timeout_s ?? '—') + 's')}
        ${row('max consecutive failures', s.max_consecutive_failures ?? '—')}
        ${row('execution retention', s.execution_retention === 0 ? 'unlimited' : `${s.execution_retention} runs`)}
        ${row('response limit', s.response_limit != null ? s.response_limit + ' chars' : '—')}
      </div>`;
  }

  async function afterRender() {
    try {
      data = await GCAL.Store.selfBlob();
      draw();
    } catch (e) {
      document.getElementById('smStats').innerHTML = '';
      document.getElementById('smDocs').innerHTML = `<div class="empty-state">could not reach the store — ${GCAL.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
