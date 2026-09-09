/* ════════════════════════════════════════════════════════════
   COMMITMENTS — the word over time. Each promise (intention:
   a deadline) vs whether it was kept (reality). A break is the
   future self failing the past self's promise.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Commitments = (() => {
  const v = LOOP.view;

  function render() {
    const c = LOOP.Store.commitmentsGap();
    const stats = [
      v.statCard(c.total, 'Commitments Made'),
      v.statCard(c.kept, 'Kept', 'var(--color-success)'),
      v.statCard(c.overdue, 'Overdue', c.overdue > 0 ? 'var(--color-danger)' : ''),
      v.statCard(c.open, 'Still Open'),
      v.statCard(LOOP.fmtPct(c.reliability), 'Reliability', c.reliability >= 0.7 ? 'var(--color-success)' : 'var(--color-warning)'),
    ].join('');

    const rows = c.rows.map(r => {
      const state = r.kept ? '<span class="pill success">kept</span>' : r.overdue ? `<span class="pill danger">${r.gapDays}d late</span>` : '<span class="pill warning">open</span>';
      const due = r.deadline ? r.deadline.slice(0, 10) : '—';
      return `<tr>
        <td>${LOOP.esc(r.content)}</td><td class="text-mono">${r.domain}</td>
        <td><span class="pill ${r.priority === 'Critical' ? 'danger' : r.priority === 'High' ? 'warning' : ''}">${r.priority}</span></td>
        <td>${state}</td><td class="text-mono">${due}</td>
      </tr>`;
    }).join('');

    return `
    ${v.header('The Word Over Time', 'Commitments', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      A commitment is the agent binding its future self. Each carries a deadline (the intention) and resolves to kept or
      broken (the reality). Reliability — the share kept on time — is the direct measure of whether the agent's word holds
      across time. Overdue items are ranked first; they are the live coherence breaks.
    </p>

    <div class="stat-row animate-in">${stats}</div>
    <div class="chart-grid-2">
      ${v.chartCard('chartRel', 'The Word', 'Reliability Gauge', 'Share of commitments met by their deadline. The agent\'s word, quantified.')}
      ${v.chartCard('chartDom', 'Distribution', 'Commitments by Domain', 'Where the agent has bound itself most.')}
    </div>

    <div class="chart-head" style="margin:var(--space-8) 0 var(--space-3)"><div><span class="eyebrow">The ledger</span><h3>Every Commitment · Intention vs Reality</h3></div></div>
    <div class="data-table-scroll animate-in"><table class="data-table"><thead><tr><th>Commitment</th><th>Domain</th><th>Priority</th><th>State</th><th>Due</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function afterRender() {
    const c = LOOP.Store.commitmentsGap();
    LOOP.Charts.gauge('chartRel', Math.round(c.reliability * 100), { max: 100, color: c.reliability >= 0.7 ? 'var(--color-success)' : 'var(--color-warning)', title: 'kept' });
    const byDom = {}; c.rows.forEach(r => { byDom[r.domain] = (byDom[r.domain] || 0) + 1; });
    LOOP.Charts.donut('chartDom', Object.entries(byDom).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, value: v })));
  }

  return { render, afterRender };
})();
