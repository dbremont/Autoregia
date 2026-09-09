/* ════════════════════════════════════════════════════════════
   PKTS Behavioral Signature — distributions, biomechanics, heatmap
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Signature = {
  render() {
    const v = PKTS.view;
    const hr = PKTS.Store.handRatio();
    return `
    ${v.header('Identity Continuity', 'Behavioral Signature', `<span class="text-sm text-muted">Hand-alternation ${hr.ratio}</span>`)}
    <div class="chart-grid-2">
      ${v.chartCard('chartDwell','Probability Distribution','Dwell Time Fingerprint','Full PDF of key-hold durations — biometric matching &amp; state feature.')}
      ${v.chartCard('chartFlight','Probability Distribution','Flight Time Fingerprint','Full PDF of inter-key intervals — digraph modeling &amp; anomaly feature.')}
    </div>
    <div class="chart-grid-3">
      ${v.chartCard('chartHand','Scalar Ratio','Hand-Alternation Ratio','Touch-typing vs. hunt-and-peck; expertise proxy.')}
      ${v.chartCard('chartFinger','Biomechanical Distribution','Finger Utilization','Estimated finger usage frequency from keyboard geometry.')}
      ${v.chartCard('chartMod','Interaction Strain','Modifier Strain','Shift/Ctrl/Alt chord frequency &amp; asymmetry.')}
    </div>
    <div class="chart-grid-2">
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Spatial Heatmap</span><h3>Keyboard Reach Heatmap</h3></div></div>
        <div class="chart-sub">Spatial projection of key-activation density onto physical keyboard coordinates.</div>
        <div id="kbHeat" class="kb-heatmap"></div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Topological Signature</span><h3>Correction Topology</h3></div></div>
        <div class="chart-sub">Backspace frequency, correction depth, and distribution.</div>
        <div class="chart-box" id="chartCorr"></div>
        ${this.correctionSummary()}
      </div>
    </div>`;
  },
  correctionSummary() {
    const c = PKTS.Store.correctionTopology();
    return `<div class="grid-3" style="margin-top:var(--space-4);">
      <div><div class="stat-label">Backspaces</div><div class="stat-value" style="font-size:var(--text-xl);">${c.backspaces}</div></div>
      <div><div class="stat-label">Correction Runs</div><div class="stat-value" style="font-size:var(--text-xl);">${c.correctionRuns}</div></div>
      <div><div class="stat-label">Delete Ratio</div><div class="stat-value" style="font-size:var(--text-xl);color:var(--oxford);">${c.ratio}</div></div>
    </div>`;
  },
  afterRender() {
    const v = PKTS.view;
    PKTS.Charts.bar('chartDwell', PKTS.Store.dwellDist().map(d=>d.bin), PKTS.Store.dwellDist().map(d=>d.count), {color:'#7A1A2A'});
    PKTS.Charts.bar('chartFlight', PKTS.Store.flightDist().map(d=>d.bin), PKTS.Store.flightDist().map(d=>d.count), {color:'#A8854A'});
    const hr = PKTS.Store.handRatio();
    PKTS.Charts.gauge('chartHand', hr.ratio*100, {max:100, title:'Alternation', fmt:(x)=>x.toFixed(0)+'%'});
    const fu = PKTS.Store.fingerUtilization();
    PKTS.Charts.hbar('chartFinger', fu.map(f=>({label:f.finger, value:f.pct})));
    const mod = PKTS.Store.modifierStrain();
    PKTS.Charts.hbar('chartMod', mod.map(m=>({label:m.mod, value:m.count})), {});
    // keyboard heatmap
    const hm = PKTS.Store.keyboardHeatmap();
    const max = Math.max(...Object.values(hm),1);
    const rows = ["` 1 2 3 4 5 6 7 8 9 0 - =".split(' '),
                  "q w e r t y u i o p [ ]".split(' '),
                  "a s d f g h j k l ; '".split(' '),
                  "z x c v b n m , . /".split(' ')];
    document.getElementById('kbHeat').innerHTML = `<div class="kb-heatmap" style="background:transparent;border:none;padding:0;">${
      rows.map(row=>`<div class="kb-row">${row.map(k=>{
        const c=hm[k]||0; const t=c/max;
        const bg = t>0 ? `rgba(122,26,42,${0.08+t*0.7})` : 'var(--color-surface)';
        return `<span class="kb-key" title="${k}: ${c}" style="background:${bg};color:${t>0.5?'#FAF1E6':'var(--color-text)'};">${k}</span>`;
      }).join('')}</div>`).join('')}</div>`;
    // correction topology
    const ct = PKTS.Store.correctionTopology();
    if (ct.depthDist.length) {
      PKTS.Charts.bar('chartCorr', ct.depthDist.map(d=>'depth '+d.depth), ct.depthDist.map(d=>d.count), {color:'#B4742A'});
    } else {
      document.getElementById('chartCorr').innerHTML = `<div class="empty-state"><p>No correction events recorded.</p></div>`;
    }
  }
};
