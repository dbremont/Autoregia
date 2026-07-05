/* ════════════════════════════════════════════════════════════
   DEVIATION — intended outcome vs observed outcome. Where the
   agent's actions did not produce what it intended; the open
   deviations are the live reconciliation feed. Closing them
   (enacting an adaptation) is how the agent learns and re-coheres.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Deviation = (() => {
  const v = LOOP.view;

  function render() {
    const d = LOOP.Store.deviationGap();
    const stats = [
      v.statCard(d.total, 'Deviations Observed'),
      v.statCard(d.open, 'Open', d.open > 0 ? 'var(--color-warning)' : ''),
      v.statCard(d.enacted, 'Adapted', 'var(--color-success)'),
      v.statCard(LOOP.fmtPct(d.closureRate), 'Closure Rate', d.closureRate >= 0.6 ? 'var(--color-success)' : 'var(--color-warning)'),
    ].join('');

    const rows = d.rows.map(r => `<tr>
      <td>${LOOP.esc(r.title)}</td><td class="text-mono">${r.domain}</td>
      <td>${LOOP.bandPill(r.status)}</td>
      <td class="text-xs text-secondary">${LOOP.esc(r.observation)}</td>
      <td class="text-mono">${r.date.slice(0, 10)}</td>
    </tr>`).join('');

    return `
    ${v.header('Where Intention Didn\'t Survive Reality', 'Deviation', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      A deviation is the gap between an intended outcome and what actually happened. Open deviations are unresolved incoherence —
      the agent has noticed reality diverged but not yet adapted. Enacting an adaptation closes the deviation and folds the
      lesson back into the agent's models: this is the feedback arc completing.
    </p>

    <div class="stat-row animate-in">${stats}</div>

    <div class="chart-grid-2">
      ${v.chartCard('chartClosure', 'The arc closing', 'Cumulative Opened vs Adapted', 'Deviations opened vs those resolved by an enacted adaptation. Divergence = unresolved incoherence accumulating.')}
      ${v.chartCard('chartStatus', 'State', 'Deviation Status Mix', 'Open (unresolved) vs concluded vs enacted (adapted).')}
    </div>

    <div class="chart-head" style="margin:var(--space-8) 0 var(--space-3)"><div><span class="eyebrow">The feed</span><h3>Deviations · Observation → Adaptation</h3></div></div>
    <div class="data-table-scroll animate-in"><table class="data-table"><thead><tr><th>Deviation</th><th>Domain</th><th>Status</th><th>Observation</th><th>Opened</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function afterRender() {
    const C = LOOP.Charts;
    const d = LOOP.Store.deviationGap();
    C.line('chartClosure', [
      { name: 'Opened', data: d.trajectory.map(p => ({ x: p.x, y: p.open })), color: 'var(--color-warning)', area: true },
      { name: 'Adapted', data: d.trajectory.map(p => ({ x: p.x, y: p.closed })), color: 'var(--color-success)' },
    ], { yName1: 'cumulative' });
    C.donut('chartStatus', [
      { name: 'open', value: d.open }, { name: 'concluded', value: d.concluded }, { name: 'enacted', value: d.enacted },
    ]);
  }

  return { render, afterRender };
})();
