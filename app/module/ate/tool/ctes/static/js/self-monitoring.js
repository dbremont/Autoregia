/* ════════════════════════════════════════════════════════════
   CTES Self Monitoring — CTES observing itself: store health,
   register coherence, execution outcomes, backend availability,
   packages footprint, effective settings. Data: /api/self.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.SelfMonitoring = (() => {
  const v = CTES.view;
  const STATUS_COLOR = { completed: '#3F6092', failed: '#A33434', timed_out: '#B4742A' };
  let data = null;

  function render() {
    return `
      ${v.header('Self Monitoring')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Is CTES itself sound?</strong> The store, the coherence of the register, execution outcomes, backend availability, and the footprint of the code it keeps.</p>
      <div class="stat-row animate-in" id="smStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">store</span><h3>Documents by type</h3></div><span class="form-hint" id="smDb"></span></div>
          <div id="smDocs"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Runs by status</h3></div></div>
          <div id="smRuns"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">register</span><h3>Coherence</h3></div></div>
          <div id="smRegister"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">execution</span><h3>Backends & footprint</h3></div></div>
          <div id="smBackends"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Last failure</h3></div></div>
        <div id="smFailure"><div class="empty-state">no failures on record</div></div>
      </div>`;
  }

  function row(label, val, ok) {
    return `<div class="meta-row"><span class="meta-key">${label}</span><span class="meta-val"><span class="src-health"><span class="src-dot" style="background:${ok === false ? '#A33434' : (ok === true ? '#3F6E50' : '#8C877B')}"></span>${val}</span></span></div>`;
  }

  function draw() {
    const d = data;
    const up = d.uptime_s != null ? CTES.Store.fmtDur(d.uptime_s * 1000) : '—';
    const docs = d.store.docs || {};
    const totalDocs = Object.values(docs).reduce((a, b) => a + b, 0);
    document.getElementById('smStats').innerHTML =
      v.statCard(up, 'server uptime') +
      v.statCard(totalDocs, 'docs in store') +
      v.statCard(`${(d.register || {}).active ?? '—'}/${(d.register || {}).handles ?? '—'}`, 'active / registered handles') +
      v.statCard((d.runs || {}).last_24h ?? '—', 'runs · last 24h') +
      v.statCard((d.register || {}).code_missing || 0, 'code missing', (d.register || {}).code_missing ? '#B4742A' : '');
    document.getElementById('smDb').textContent = `db ${d.store.db || 'ctes'}`;

    document.getElementById('smDocs').innerHTML = `
      <div class="meta-table">
        ${['handle', 'task_spec', 'run', 'audit', 'settings'].map(t => row(t, docs[t] ?? 0)).join('')}
      </div>`;

    const byStatus = (d.runs || {}).by_status || {};
    document.getElementById('smRuns').innerHTML = `
      <div class="meta-table">
        ${Object.keys(byStatus).length ? Object.entries(byStatus).map(([s, n]) =>
          `<div class="meta-row"><span class="meta-key"><span class="src-health"><span class="src-dot" style="background:${STATUS_COLOR[s] || '#8C877B'}"></span>${CTES.esc(s)}</span></span><span class="meta-val">${n}</span></div>`).join('')
          : '<div class="empty-state">no runs yet</div>'}
        <div class="meta-row"><span class="meta-key">success rate · 24h</span><span class="meta-val">${(d.runs || {}).success_rate_24h != null ? Math.round(d.runs.success_rate_24h * 100) + '%' : '—'}</span></div>
      </div>`;

    const reg = d.register || {};
    document.getElementById('smRegister').innerHTML = `
      <div class="meta-table">
        ${row('handles registered', reg.handles ?? '—')}
        ${row('active', reg.active ?? '—', (reg.inactive || 0) === 0 ? true : null)}
        ${row('inactive', reg.inactive ?? 0, null)}
        ${row('code missing', reg.code_missing || 0, !reg.code_missing)}
        ${reg.code_missing_ids && reg.code_missing_ids.length ? `<div class="meta-row"><span class="meta-key">missing</span><span class="meta-val text-mono text-xs">${CTES.esc(reg.code_missing_ids.join(', '))}</span></div>` : ''}
        ${row('task specs', d.task_specs ?? 0)}
      </div>`;

    const b = d.backends || {};
    const pk = d.packages || {};
    document.getElementById('smBackends').innerHTML = `
      <div class="meta-table">
        ${row('default backend', CTES.esc(b.default || 'auto'))}
        ${row('docker cli', b.docker_cli ? 'present' : 'absent', b.docker_cli)}
        ${row('docker image', `${CTES.esc(b.docker_image || '—')}`, b.docker_cli)}
        ${row('handles on disk', pk.handles_on_disk ?? '—')}
        ${row('packages footprint', CTES.Store.fmtBytes(pk.disk_bytes))}
        ${row('effective log limit', CTES.Store.fmtBytes((d.settings || {}).log_limit))}
        ${row('run retention', (d.settings || {}).run_retention === 0 ? 'unlimited' : `${(d.settings || {}).run_retention} runs`)}
      </div>`;

    const f = (d.runs || {}).last_failure;
    document.getElementById('smFailure').innerHTML = !f ? '<div class="empty-state">no failures on record</div>' : `
      <div class="meta-table">
        ${row('run', `<a href="#runs" class="text-mono text-xs" id="smFailRun">${CTES.esc(f.id)}</a>`)}
        ${row('handle', CTES.esc(f.handle_id))}
        ${row('status', CTES.esc(f.status))}
        ${row('started', CTES.Store.fmtTime(f.started_at))}
        ${f.error ? row('error', `<span style="color:#A33434">${CTES.esc(f.error)}</span>`) : ''}
      </div>`;
    document.getElementById('smFailRun')?.addEventListener('click', (e) => {
      e.preventDefault(); CTES.navigate('runs'); setTimeout(() => CTES.Runs.showRun(f.id), 80);
    });
  }

  async function afterRender() {
    try {
      data = await CTES.Store.selfBlob();
      draw();
    } catch (e) {
      document.getElementById('smStats').innerHTML = '';
      document.getElementById('smDocs').innerHTML = `<div class="empty-state">could not reach the store — ${CTES.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
