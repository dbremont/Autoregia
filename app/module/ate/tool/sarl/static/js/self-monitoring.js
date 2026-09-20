/* ════════════════════════════════════════════════════════════
    SARL Self Monitoring — SARL observing itself: store health,
    task outcomes and timing, engine pack status, the effective
    settings. Data: /api/self.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.SelfMonitoring = (() => {
  const v = SARL.view;
  let data = null;

  function render() {
    return `
      ${v.header('Self Monitoring')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Is SARL itself sound?</strong> The store, the shape of the task journal, the engine's packs, and the effective policy.</p>
      <div class="stat-row animate-in" id="smStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">store</span><h3>Documents by type</h3></div><span class="form-hint" id="smDb"></span></div>
          <div id="smDocs"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Tasks by state</h3></div></div>
          <div id="smTasks"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">engine</span><h3>Packs</h3></div></div>
          <div id="smPacks"><div class="empty-state">loading…</div></div>
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
    const up = d.uptime_s != null ? SARL.Store.fmtDur(d.uptime_s * 1000) : '—';
    const docs = d.store.docs || {};
    const totalDocs = Object.values(docs).reduce((a, b) => a + b, 0);
    document.getElementById('smStats').innerHTML =
      v.statCard(up, 'server uptime') +
      v.statCard(totalDocs, 'docs in store') +
      v.statCard((d.tasks || {}).total ?? '—', 'tasks journaled') +
      v.statCard((d.findings || {}).total ?? '—', 'findings raised') +
      v.statCard((d.tasks || {}).avg_review_ms != null ? (d.tasks.avg_review_ms + 'ms') : '—', 'avg review time');
    document.getElementById('smDb').textContent = `db ${d.store.db || 'sarl'}`;

    document.getElementById('smDocs').innerHTML = `
      <div class="meta-table">
        ${['task', 'glossary', 'phrase_collection', 'audit', 'settings'].map(t => row(t, docs[t] ?? 0)).join('')}
      </div>`;

    const byState = (d.tasks || {}).by_state || {};
    document.getElementById('smTasks').innerHTML = `
      <div class="meta-table">
        ${Object.keys(byState).length ? Object.entries(byState).map(([s, n]) =>
          `<div class="meta-row"><span class="meta-key"><span class="state-pill state-${SARL.esc(s)}">${SARL.esc(s)}</span></span><span class="meta-val">${n}</span></div>`).join('')
          : '<div class="empty-state">no tasks yet</div>'}
      </div>`;

    document.getElementById('smPacks').innerHTML = `
      <div class="meta-table">
        ${((d.engine || {}).packs || []).map(p => row(
          p.id,
          `${p.status} · ${p.rules} rule(s)`,
          p.status === 'live' ? true : null)).join('')}
        ${row('languagetool', (d.engine || {}).languagetool_configured ? 'configured — awake' : 'not configured — dormant',
              (d.engine || {}).languagetool_configured ? true : null)}
      </div>`;

    const s = d.settings || {};
    document.getElementById('smSettings').innerHTML = `
      <div class="meta-table">
        ${row('default language', SARL.esc(s.default_language || 'es'))}
        ${row('default register', SARL.esc(s.default_register || '—'))}
        ${row('max findings / review', s.max_findings ?? '—')}
        ${row('evidence excerpt', s.evidence_excerpt ?? '—')}
        ${row('task retention', s.task_retention === 0 ? 'unlimited' : `${s.task_retention} tasks`)}
        ${row('languagetool_url', SARL.esc(s.languagetool_url || '—'))}
      </div>`;
  }

  async function afterRender() {
    try {
      data = await SARL.Store.selfBlob();
      draw();
    } catch (e) {
      document.getElementById('smStats').innerHTML = '';
      document.getElementById('smDocs').innerHTML = `<div class="empty-state">could not reach the store — ${SARL.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
