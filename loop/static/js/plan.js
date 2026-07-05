/* ════════════════════════════════════════════════════════════
   PLAN VS ACTUAL — effort. Each action carries an estimate
   (intention) and accrues actual time (reality). The gap is plan
   divergence; the ratio calibrates how well the agent predicts itself.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Plan = (() => {
  const v = LOOP.view;

  function render() {
    const p = LOOP.Store.planGap();
    const stats = [
      v.statCard('€' + p.totalActual + 'h', 'Actual Effort'),
      v.statCard(p.totalEst + 'h', 'Estimated Effort'),
      v.statCard((p.planGap > 0 ? '+' : '') + p.planGap + 'h', 'Plan Gap', p.planGap > 0 ? 'var(--color-danger)' : 'var(--color-success)'),
      v.statCard(p.accuracy + '×', 'Estimate Accuracy', p.accuracy > 1.15 ? 'var(--color-warning)' : ''),
      v.statCard(p.overruns, 'Overruns', p.overruns > 0 ? 'var(--color-danger)' : ''),
    ].join('');

    const rows = p.rows.map(r => {
      const state = r.overrun ? '<span class="pill danger">overrun</span>' : '<span class="pill success">on plan</span>';
      return `<tr>
        <td>${LOOP.esc(r.project)}</td><td class="text-mono">${r.domain}</td>
        <td class="text-mono">${r.est}h</td><td class="text-mono">${r.actual}h</td>
        <td class="text-mono" style="color:${r.overrun ? 'var(--color-danger)' : 'var(--color-success)'}">${(r.ratio > 0 ? '+' : '') + r.gap}h</td>
        <td>${state}</td>
      </tr>`;
    }).join('');

    return `
    ${v.header('Did the Plan Survive Reality?', 'Plan vs Actual', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      An estimate is the agent predicting its own effort. Actual time is what really happened. The gap is plan divergence;
      the ratio of actual to estimate calibrates how accurately the agent knows itself — and therefore how much to trust
      its next plan.
    </p>

    <div class="stat-row animate-in">${stats}</div>

    <div class="chart-grid-2">
      ${v.chartCard('chartCalib', 'Self-knowledge', 'Estimate vs Actual', 'Each point is an action: estimated effort (x) vs actual (y). On the diagonal = the agent predicts itself perfectly. Above = it underestimates.')}
      ${v.chartCard('chartDom', 'Where it diverges', 'Plan Gap by Domain', 'Cumulative (actual − estimate) per domain — where the agent systematically misplans.')}
    </div>

    <div class="chart-head" style="margin:var(--space-8) 0 var(--space-3)"><div><span class="eyebrow">The ledger</span><h3>Every Action · Estimate vs Actual</h3></div></div>
    <div class="data-table-scroll animate-in"><table class="data-table"><thead><tr><th>Project</th><th>Domain</th><th>Est.</th><th>Actual</th><th>Gap</th><th>State</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function afterRender() {
    const C = LOOP.Charts;
    const p = LOOP.Store.planGap();
    C.scatter('chartCalib', p.rows.map(r => [r.est, r.actual]), { xName: 'estimate (h)', yName: 'actual (h)' });
    // plan gap by domain
    const byDom = {}; p.rows.forEach(r => { byDom[r.domain] = (byDom[r.domain] || 0) + r.gap; });
    C.hbar('chartDom', Object.entries(byDom).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, val]) => ({ label: k, value: +val.toFixed(1), color: val >= 0 ? 'var(--color-danger)' : 'var(--color-success)' })));
  }

  return { render, afterRender };
})();
