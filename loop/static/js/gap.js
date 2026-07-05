/* ════════════════════════════════════════════════════════════
   THE GAP (hero) — where reality is furthest from intention.
   Every domain of the agent's intention ranked by its gap; the
   coherence reading (how held-together the agent is); and the
   reconciliation queue — what to act on to close the gaps.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Gap = (() => {
  const v = LOOP.view;

  function render() {
    const g = LOOP.Store.gapOverview();
    const coh = g.coherence;
    const cohCol = coh >= 70 ? 'var(--color-success)' : coh >= 45 ? 'var(--color-warning)' : 'var(--color-danger)';
    const cohBand = coh >= 70 ? 'coherent' : coh >= 45 ? 'strained' : 'fraying';

    const ranked = g.domains.map(d => {
      const col = d.gap >= 60 ? 'var(--color-danger)' : d.gap >= 30 ? 'var(--color-warning)' : 'var(--color-success)';
      return `<a href="#${d.view}" class="gap-rank" data-view="${d.view}">
        <span class="gr-icon" style="color:${col}">${LOOP.icon(d.icon, 17)}</span>
        <span class="gr-body"><span class="gr-label">${d.label}</span><span class="gr-detail">${d.detail}</span></span>
        <span class="gr-meter"><span class="gr-meter-fill" style="width:${d.gap}%;background:${col}"></span></span>
        <span class="gr-val" style="color:${col}">${d.gap}</span>
        <span class="gr-arrow">${LOOP.icon('arrow-right', 15)}</span>
      </a>`;
    }).join('');

    // reconciliation queue = the worst concrete items across domains
    const com = LOOP.Store.commitmentsGap();
    const goals = LOOP.Store.goalsGap();
    const dev = LOOP.Store.deviationGap();
    const queue = [
      ...com.rows.filter(r => r.overdue).slice(0, 3).map(r => ({ icon: 'flag', t: `Overdue commitment: ${r.content}`, s: `${r.gapDays}d late · ${r.domain}`, view: 'commitments', sev: 'danger' })),
      ...goals.rows.filter(r => r.gap > 40).slice(0, 3).map(r => ({ icon: 'target', t: `Goal drifting: ${r.content}`, s: `${r.progress}/${r.target} · ${r.momentum}`, view: 'goals', sev: r.momentum === 'regressing' ? 'danger' : 'warning' })),
      ...dev.rows.filter(r => r.status === 'open').slice(0, 3).map(r => ({ icon: 'alert-triangle', t: `Open deviation: ${r.title}`, s: `${r.domain} · unresolved`, view: 'deviation', sev: 'warning' })),
    ].slice(0, 8);
    const queueHtml = queue.length ? queue.map(q => `<a href="#${q.view}" class="queue-item">
      <span class="q-icon" style="color:var(--${q.sev === 'danger' ? 'color-danger' : 'color-warning'})">${LOOP.icon(q.icon, 16)}</span>
      <span class="q-body"><span class="q-title">${LOOP.esc(q.t)}</span><span class="q-sub">${LOOP.esc(q.s)}</span></span>
      <span class="q-act">reconcile ${LOOP.icon('arrow-right', 13)}</span></a>`).join('')
      : '<div class="empty-state" style="padding:var(--space-8)"><p>Nothing pressing — the agent is holding its intentions.</p></div>';

    return `
    ${v.header('Intention vs Reality', 'The Gap', `
      <div class="filter-bar" style="margin:0"><span class="filter-label">Window</span>
      <div class="seg" id="windowSeg">${LOOP.WINDOWS.map(w => `<button data-w="${w.d}">${w.label}</button>`).join('')}</div></div>`)}
    <p class="text-sm text-muted" style="max-width:var(--measure);margin-bottom:var(--space-6);">
      The agent declares intentions — commitments, goals, plans, resource floors, intended outcomes — and reality pushes back.
      The gap between them is what the agent must reconcile to stay coherent with itself over time. Below, every intention
      domain ranked by how far reality has strayed, and the queue of what to reconcile now.
    </p>

    <div class="grid-2 animate-in" style="margin-bottom:var(--space-6); align-items:stretch">
      <div class="coherence-card">
        <span class="eyebrow">Coherence reading</span>
        <div class="coherence-val" style="color:${cohCol}">${coh}</div>
        <div class="coherence-band" style="color:${cohCol}">${cohBand}</div>
        <div class="coherence-bar"><div class="coherence-fill" style="width:${coh}%;background:${cohCol}"></div></div>
        <p class="text-xs text-muted" style="margin-top:var(--space-3)">How held-together the agent is against its own intentions this window. Closing gaps restores coherence.</p>
      </div>
      <div class="stat-card" style="display:flex;flex-direction:column;justify-content:center;gap:var(--space-2)">
        <span class="eyebrow">Intentions tracked</span>
        <div class="stat-value">${g.totalIntentions}</div>
        <div class="text-xs text-muted">${g.metIntentions} met · ${g.totalIntentions - g.metIntentions} falling short</div>
        <div class="text-xs text-muted" style="margin-top:var(--space-2)">Mean gap across domains: <strong style="color:var(--oxford)">${g.meanGap}</strong> / 100</div>
      </div>
    </div>

    <div class="chart-head" style="margin-bottom:var(--space-3)"><div><span class="eyebrow">Where reality strays</span><h3>Gap by Intention Domain</h3></div></div>
    <div class="gap-list animate-in" style="margin-bottom:var(--space-8)">${ranked}</div>

    <div class="chart-head" style="margin-bottom:var(--space-3)"><div><span class="eyebrow">Act now</span><h3>Reconciliation Queue</h3></div></div>
    <div class="queue animate-in">${queueHtml}</div>`;
  }

  function afterRender() {
    document.querySelectorAll('.gap-rank').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); LOOP.navigate(el.dataset.view); }));
    document.querySelectorAll('.queue-item').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); LOOP.navigate(el.getAttribute('href').slice(1)); }));
  }

  return { render, afterRender };
})();
