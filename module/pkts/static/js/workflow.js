/* ════════════════════════════════════════════════════════════
   PKTS Workflow & Expertise — state machine, classifiers, fluency
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Workflow = {
  render() {
    const v = PKTS.view;
    const arch = PKTS.Store.taskArchetypes();
    const dominant = arch.length ? arch.sort((a,b)=>b.value-a.value)[0].name : '—';
    return `
    ${v.header('Process Mining', 'Workflow &amp; Expertise', `<span class="text-sm text-muted">Dominant task: ${dominant}</span>`)}
    <div class="chart-grid-2">
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Finite State Machine</span><h3>Workflow State Machine</h3></div></div>
        <div class="chart-sub">Discrete state occupancy: idle → planning → composing → revising → searching.</div>
        <div class="chart-box" id="chartStates"></div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Stochastic Matrix</span><h3>State Transition Matrix</h3></div></div>
        <div class="chart-sub">Empirical transition probabilities between workflow states.</div>
        <div class="chart-box" id="chartWMatrix"></div>
      </div>
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartArchetypes','Classifier Output','Task Archetype Classifier','Projection of keystroke patterns onto task types (coding, writing, chat, search).')}
      ${v.chartCard('chartCmd','Behavioral Profile','Command Fluency','Shortcut/chord usage &amp; modifier fluency.')}
    </div>
    <div class="meta-section animate-in">
      <div class="meta-section-header"><span class="chevron">${PKTS.icon('chevron-right',16)}</span> Expertise Classifier &amp; Navigation Rhythm</div>
      <div class="meta-section-body">
        <p class="text-sm text-muted" style="max-width:var(--measure);">
          The <strong>Expertise Classifier</strong> projects typing regularity, revision structure, and command fluency onto a proficiency ordinal.
          The <strong>Human–Machine Interaction Trace</strong> composes keystrokes, interface events, editor commands, and navigation into a
          composite ordered encoding for HCI optimization and interaction mining.
        </p>
      </div>
    </div>`;
  },
  afterRender() {
    const st = PKTS.Store.workflowStates();
    PKTS.Charts.donut('chartStates', st);
    const wm = PKTS.Store.workflowMatrix();
    const data=[]; wm.states.forEach((a,i)=>wm.states.forEach((b,j)=>{ if(wm.m[a][b]>0.01) data.push([i,j,wm.m[a][b]]); }));
    PKTS.Charts.heatmap('chartWMatrix', wm.states, wm.states, data, {fmt:true, precision:2});
    const arch = PKTS.Store.taskArchetypes();
    PKTS.Charts.donut('chartArchetypes', arch);
    const mod = PKTS.Store.modifierStrain();
    PKTS.Charts.hbar('chartCmd', mod.map(m=>({label:m.mod, value:m.count})), {});
  }
};
