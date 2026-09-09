/* ════════════════════════════════════════════════════════════
   AIAS Dashboard — stats + breakdowns
   List       — the whole Intent Store as a table
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};

AI.Dashboard = (() => {
  function render(el) {
    const s = AI.Store.getStats();
    el.innerHTML = `<div class="view-header">
        <div><div class="eyebrow">Intent Management</div>
        <div class="view-title">The <em>Scheduler</em> at a glance</div></div>
        <div class="view-sub">the intent store, summarised</div>
      </div>
      <div class="stat-grid">
        ${stat('Active set', s.active, s.critical_active + ' critical · ' + s.high_active + ' high', 'accent')}
        ${stat('In triage', s.triage, 'candidates awaiting evaluation')}
        ${stat('Monitoring', s.monitoring, 'paused · blocked · awaiting review')}
        ${stat('Retrospective', s.retrospective, 'completed · abandoned · superseded', 'success')}
        ${stat('With deadline', s.with_deadline, 'active intents time-bound')}
        ${stat('Total store', s.total, s.with_notes + ' carry a revision note')}
      </div>
      <div class="breakdown">
        <div><h3>By source</h3>${bars(s.by_source, 'src')}</div>
        <div><h3>By priority</h3>${bars(s.by_priority, 'pri')}</div>
        <div><h3>By status</h3>${bars(s.by_status, '')}</div>
      </div>`;
  }

  function stat(label, value, foot, mod) {
    return `<div class="stat ${mod || ''}">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-foot">${foot}</div>
      </div>`;
  }

  function bars(obj, kind) {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(e => e[1]));
    return entries.map(([k, v]) => {
      const cls = kind === 'src' ? `src-${AI.app.slug(k)}` : (kind === 'pri' ? `pri-${k}` : '');
      const dot = kind ? `<span class="dot"></span>` : '';
      return `<div class="bar-row">
          <span class="bar-label">${dot ? '' : ''}${AI.app.esc(k)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(v / max * 100).toFixed(0)}%"></span></span>
          <span class="bar-val">${v}</span>
        </div>`;
    }).join('') || `<div class="empty">—</div>`;
  }

  return { render };
})();

AI.List = (() => {
  function render(el) {
    const items = AI.Store.getAll();
    AI.app.renderTable(el, items, 'All <em>Intentions</em>',
      `${items.length} entries in the Intent Store`);
  }
  return { render };
})();
