/* ════════════════════════════════════════════════════════════
   RESOURCES — sustain. Each essential variable has a viable
   floor (intention) and an actual level (reality). Breaching
   the floor erodes the substrate that lets the agent remain an
   agent at all.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Resources = (() => {
  const v = LOOP.view;

  function render() {
    const r = LOOP.Store.resourcesGap();
    const stats = r.vars.map(x => v.statCard(x.mean + x.unit, x.label + ' (mean)', x.mean >= x.floor ? '' : 'var(--color-danger)'));
    stats.push(v.statCard(LOOP.fmtPct(r.overloadPct), 'Overload Days', r.overloadPct > 0.2 ? 'var(--color-danger)' : ''));

    const cards = r.vars.map(x => {
      const ok = x.mean >= x.floor;
      const col = ok ? 'var(--color-success)' : 'var(--color-danger)';
      return `<div class="resource-card">
        <div class="rc-head"><span class="eyebrow">${x.label}</span><span class="pill ${ok ? 'success' : 'danger'}">${ok ? 'above floor' : 'below floor'}</span></div>
        <div class="rc-vals"><span class="rc-mean" style="color:${col}">${x.mean}${x.unit}</span><span class="rc-floor">floor ${x.floor}${x.unit}</span></div>
        <div class="rc-bar"><div class="rc-fill" style="width:${Math.min(100, x.mean)}%;background:${col}"></div><div class="rc-floor-mark" style="left:${x.floor}%"></div></div>
        <div class="text-xs text-muted">${x.breaches} of ${r.days} days below floor (${LOOP.fmtPct(x.breachPct)})</div>
      </div>`;
    }).join('');

    return `
    ${v.header('Is the Agent Sustaining Itself?', 'Resources', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      The essential variables — energy, attention, focus, sleep, time — are the finite reserves the loop exists to regulate.
      Each has a viable floor (the intention: stay above this to remain capable); the actual level is reality. Sustained
      breaches erode the substrate of agency itself.
    </p>

    <div class="stat-row animate-in">${stats.join('')}</div>

    <div class="chart-head" style="margin:var(--space-4) 0 var(--space-3)"><div><span class="eyebrow">Each reserve</span><h3>Floor vs Level</h3></div></div>
    <div class="resource-grid animate-in" style="margin-bottom:var(--space-6)">${cards}</div>

    <div class="chart-grid-2">
      ${v.chartCard('chartLevel', 'Trajectory', 'Energy · Attention vs Floor', 'Daily levels against the viable floor. Dips below the line are depletion events the loop must regulate.')}
      ${v.chartCard('chartLoad', 'Load', 'Time Used vs Capacity', 'Daily load against available capacity. Breaches are overload — the plan exceeds what the agent can sustain.')}
    </div>`;
  }

  function afterRender() {
    const C = LOOP.Charts;
    const r = LOOP.Store.resourcesGap();
    if (!r.series.length) return;
    const ef = r.vars.find(x => x.key === 'energy')?.floor || 40;
    const af = r.vars.find(x => x.key === 'attention')?.floor || 40;
    C.line('chartLevel', [
      { name: 'Energy', data: r.series.map(d => ({ x: d.date, y: d.energy })), color: '#3F6E50' },
      { name: 'Attention', data: r.series.map(d => ({ x: d.date, y: d.attention })), color: '#3F6092' },
    ], { yName1: 'level (0–100)' });
    C.line('chartLoad', [
      { name: 'Capacity', data: r.series.map(d => ({ x: d.date, y: d.cap })), color: 'var(--ink-6)' },
      { name: 'Used', data: r.series.map(d => ({ x: d.date, y: d.used })), color: 'var(--gold)', area: true },
    ], { yName1: 'hours' });
  }

  return { render, afterRender };
})();
