/* ════════════════════════════════════════════════════════════
   GOALS — direction. Each objective has a target (intention) and
   a progress (reality); the gap is how far the agent has drifted
   from the future it chose. Momentum tells whether it's closing.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Goals = (() => {
  const v = LOOP.view;

  function render() {
    const g = LOOP.Store.goalsGap();
    const stats = [
      v.statCard(g.total, 'Objectives'),
      v.statCard(g.avgGap + ' pts', 'Mean Shortfall', g.avgGap > 40 ? 'var(--color-warning)' : ''),
      v.statCard(g.advancing, 'Advancing', 'var(--color-success)'),
      v.statCard(g.stalled, 'Stalled', 'var(--color-warning)'),
      v.statCard(g.regressing, 'Regressing', 'var(--color-danger)'),
    ].join('');

    const cards = g.rows.map(r => {
      const col = r.momentum === 'advancing' ? 'var(--color-success)' : r.momentum === 'regressing' ? 'var(--color-danger)' : 'var(--color-warning)';
      const gapCol = r.gap >= 50 ? 'var(--color-danger)' : r.gap >= 25 ? 'var(--color-warning)' : 'var(--color-success)';
      return `<div class="goal-card">
        <div class="gc-head"><div><span class="eyebrow">${r.domain}</span><h3>${LOOP.esc(r.content)}</h3></div>
          <span class="pill ${r.momentum === 'advancing' ? 'success' : r.momentum === 'regressing' ? 'danger' : 'warning'}">${r.momentum}</span></div>
        <div class="gc-progress"><span class="gc-label">progress <strong>${r.progress}</strong> / target ${r.target}</span>
          <div class="gc-track"><div class="gc-fill" style="width:${r.progress}%;background:${col}"></div></div></div>
        <div class="gc-gap">gap <strong style="color:${gapCol}">${r.gap} pts</strong> short of intention</div>
      </div>`;
    }).join('');

    return `
    ${v.header('Where the Agent Is Headed', 'Goals', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      A goal is the agent committing to a future state. The target is the intention; progress is the reality; the gap is
      how far the agent has drifted from the future it chose. Momentum — advancing, stalled, regressing — is whether the
      gap is closing or widening.
    </p>

    <div class="stat-row animate-in">${stats}</div>

    <div class="chart-head" style="margin:var(--space-4) 0 var(--space-3)"><div><span class="eyebrow">Each objective</span><h3>Target vs Progress</h3></div></div>
    <div class="goal-grid animate-in">${cards || '<div class="empty-state"><p>No goals recorded in window.</p></div>'}</div>`;
  }

  function afterRender() {}

  return { render, afterRender };
})();
