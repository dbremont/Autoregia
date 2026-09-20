/* ════════════════════════════════════════════════════════════
    SARL Dashboard — the review practice at a glance: task flow,
    findings by dimension and severity, dispositions, top rules,
    engine health, latest tasks. Data: /api/overview.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Dashboard = (() => {
  const v = SARL.view;
  const SEV_COLOR = { error: '#A33434', warning: '#B4742A', suggestion: '#3F6092' };

  function render() {
    return `
      ${v.header('Dashboard')}
      <div class="stat-row animate-in" id="dashStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">findings</span><h3>By dimension</h3></div></div>
          <div id="dashDim"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">findings</span><h3>By severity</h3></div></div>
          <div id="dashSev"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">dispositions</span><h3>The feedback surface</h3></div></div>
          <div id="dashDisp"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">rules</span><h3>Most fired</h3></div></div>
          <div id="dashRules"><div class="empty-state">loading…</div></div>
        </div>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">engine</span><h3>Packs</h3></div></div>
          <div id="dashEngine"><div class="empty-state">loading…</div></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Latest tasks</h3></div>
            <a href="#tasks" class="text-mono text-xs">all tasks →</a></div>
          <div id="dashRecent"><div class="empty-state">loading…</div></div>
        </div>
      </div>`;
  }

  function draw(o) {
    const t = o.tasks || {}, f = o.findings || {}, r = o.resources || {};
    document.getElementById('dashStats').innerHTML =
      v.statCard(t.total ?? '—', 'tasks journaled') +
      v.statCard(f.total ?? '—', 'findings raised') +
      v.statCard((f.dispositions || {}).accepted || 0, 'accepted', '#3F6E50') +
      v.statCard((f.dispositions || {}).rejected || 0, 'rejected', '#A33434') +
      v.statCard(`${r.glossaries ?? '—'}/${r.phrase_collections ?? '—'}`, 'glossaries / phrase collections');

    const dims = Object.entries(f.by_dimension || {}).sort((a, b) => b[1] - a[1]);
    document.getElementById('dashDim').innerHTML =
      dims.length ? v.barList(dims) : '<div class="empty-state">no findings yet — submit a text</div>';
    const sevs = Object.entries(f.by_severity || {});
    document.getElementById('dashSev').innerHTML =
      sevs.length ? v.barList(sevs, SEV_COLOR) : '<div class="empty-state">no findings yet</div>';

    const disp = Object.entries(f.dispositions || {});
    const DISP_COLOR = { accepted: '#3F6E50', rejected: '#A33434', pending: '#8C877B' };
    document.getElementById('dashDisp').innerHTML =
      disp.length ? v.barList(disp, DISP_COLOR) : '<div class="empty-state">nothing dispositioned yet</div>';

    const rules = (f.top_rules || []).map(x => [x.rule_id, x.fires]);
    document.getElementById('dashRules').innerHTML =
      rules.length ? v.barList(rules) : '<div class="empty-state">no rules fired yet</div>';

    const rows = [];
    rows.push(`<div class="pack-row"><span class="src-dot" style="background:#3F6E50"></span>
      <span class="pack-id">deterministic packs</span><span class="pack-langs">es · en</span>${v.pill('live')}</div>`);
    const lt = (o.engine || {}).languagetool === 'awake';
    rows.push(`<div class="pack-row"><span class="src-dot" style="background:${lt ? '#3F6E50' : '#B4742A'}"></span>
      <span class="pack-id">languagetool</span><span class="pack-langs">es · en</span>${v.pill(lt ? 'awake' : 'dormant')}</div>`);
    rows.push(`<div class="pack-row"><span class="src-dot" style="background:#8C877B"></span>
      <span class="pack-id">phrase catalog</span><span class="pack-langs">${r.phrases ?? 0} phrases · ${r.enabled_collections ?? 0} enabled</span>${v.pill('editable')}</div>`);
    document.getElementById('dashEngine').innerHTML = rows.join('');

    const recent = o.recent || [];
    const host = document.getElementById('dashRecent');
    if (!recent.length) { host.innerHTML = '<div class="empty-state">no tasks yet — submit the first text</div>'; return; }
    host.innerHTML = recent.map(x => `
      <div class="ov-feed-item" data-task="${SARL.esc(x.id)}" style="cursor:pointer">
        <span class="src-dot" style="background:${x.state === 'applied' ? '#3F6E50' : (x.state === 'discarded' ? '#8C877B' : '#3F6092')}"></span>
        <span class="src-feed-t">${SARL.esc(SARL.Store.fmtTime(x.created_at).slice(11))}</span>
        <span class="ov-feed-x"><b>${SARL.esc(x.language)}</b> — ${x.counts ? x.counts.total : '?'} finding(s) · ${SARL.esc(x.excerpt.slice(0, 60))}…</span>
      </div>`).join('');
    host.querySelectorAll('[data-task]').forEach(el => el.addEventListener('click', () => {
      SARL.Tasks.showTask(el.dataset.task);
    }));
  }

  async function afterRender() {
    try {
      const o = await SARL.Store.overview();
      draw(o);
    } catch (e) {
      document.getElementById('dashStats').innerHTML = '';
      document.getElementById('dashRecent').innerHTML =
        `<div class="empty-state">could not reach the store — ${SARL.esc(e.message)}</div>`;
    }
  }

  return { render, afterRender };
})();
