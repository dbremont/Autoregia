/* ════════════════════════════════════════════════════════════
    GCAL Dashboard — the manager at a glance: connection health,
    execution outcomes, the registry, the latest runs.
    Data: /api/overview.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Dashboard = (() => {
  const v = GCAL.view;
  const STATUS_COLOR = { connected: '#3F6E50', error: '#A33434', disconnected: '#8C877B', awaiting_consent: '#B4742A' };

  function render() {
    return `
      ${v.header('Dashboard')}
      <div class="stat-row animate-in" id="dashStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">connections</span><h3>By state</h3></div></div>
          <div id="dashStates"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">registry</span><h3>Connectors</h3></div>
            <a href="#connectors" class="text-mono text-xs">all →</a></div>
          <div id="dashRegistry"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">evidence</span><h3>Latest executions</h3></div>
          <a href="#executions" class="text-mono text-xs">log →</a></div>
        <div id="dashRecent"><div class="empty-state">loading…</div></div>
      </div>`;
  }

  function draw(o) {
    const c = o.connections || {}, e = o.executions || {};
    document.getElementById('dashStats').innerHTML =
      v.statCard(c.total ?? '—', 'connections') +
      v.statCard(e.total ?? '—', 'executions logged') +
      v.statCard(e.last_24h ?? '—', 'executions · 24h') +
      v.statCard((c.by_state || {}).error || 0, 'connections in error', '#A33434') +
      v.statCard((o.registry || []).filter(r => r.status === 'live').length, 'live connectors');

    const states = Object.entries(c.by_state || {}).sort((a, b) => b[1] - a[1]);
    document.getElementById('dashStates').innerHTML =
      states.length ? v.barList(states, STATUS_COLOR) : '<div class="empty-state">no connections — connect the first app</div>';

    document.getElementById('dashRegistry').innerHTML =
      (o.registry || []).map(r => `
        <div class="pack-row">
          <span class="src-dot" style="background:${r.status === 'live' ? '#3F6E50' : '#B4742A'}"></span>
          <span><span class="pack-id">${GCAL.esc(r.id)}</span></span>
          <span class="pack-langs">${GCAL.esc(r.auth_scheme)}</span>
          ${v.pill(r.status)}
        </div>`).join('') || '<div class="empty-state">no connectors</div>';

    const recent = o.recent || [];
    const host = document.getElementById('dashRecent');
    if (!recent.length) { host.innerHTML = '<div class="empty-state">nothing executed yet — run an action from the runner</div>'; return; }
    host.innerHTML = recent.slice(0, 8).map(r => `
      <div class="ov-feed-item" data-exec="${GCAL.esc(r.id)}" style="cursor:pointer">
        <span class="src-dot" style="background:${r.status === 'ok' ? '#3F6E50' : '#A33434'}"></span>
        <span class="src-feed-t">${GCAL.esc(GCAL.Store.fmtTime(r.created_at).slice(11))}</span>
        <span class="ov-feed-x"><b>${GCAL.esc(r.connector_id)} · ${GCAL.esc(r.action)}</b> — ${GCAL.esc(r.status)}${r.error ? ` · ${GCAL.esc(r.error.slice(0, 80))}` : ''}</span>
      </div>`).join('');
    host.querySelectorAll('[data-exec]').forEach(el => el.addEventListener('click', () => {
      GCAL.navigate('executions'); setTimeout(() => GCAL.Executions.showExecution(el.dataset.exec), 80);
    }));
  }

  async function afterRender() {
    try {
      draw(await GCAL.Store.overview());
    } catch (e) {
      document.getElementById('dashStats').innerHTML = '';
      document.getElementById('dashRecent').innerHTML =
        `<div class="empty-state">could not reach the store — ${GCAL.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
