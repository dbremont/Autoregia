/* ════════════════════════════════════════════════════════════
   PKTS Temporal Dynamics — matrices, entropy, spectrum, pauses
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Temporal = {
  render() {
    const v = PKTS.view;
    const ent = PKTS.Store.entropy();
    return `
    ${v.header('Ordered Substrate', 'Temporal Dynamics', `<span class="pill info">Entropy ${ent} bits</span>`)}
    <div class="chart-grid-2">
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Stochastic Matrix</span><h3>Transition Probability Matrix</h3></div></div>
        <div class="chart-sub">Empirical joint probability of key<sub>t</sub> → key<sub>t+1</sub> transitions.</div>
        <div class="chart-box" id="chartTrans"></div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Statistical Matrix</span><h3>Digraph Timing Matrix</h3></div></div>
        <div class="chart-sub">Mean flight time for the most frequent key-pair combinations (ms).</div>
        <div class="chart-box" id="chartDigraph"></div>
      </div>
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartSpectrum','Frequency-Domain','Spectral Density Projection','Power spectral density of the dwell signal via FFT — rhythmic &amp; tremor components.')}
      ${v.chartCard('chartPauses','Interval Sequence','Pause Structure','Inter-keystroke intervals exceeding the cognitive-pause threshold (350 ms).')}
    </div>
    <div class="grid-4 animate-in" style="margin-bottom:var(--space-6);">
      ${v.statCard(ent + ' bits', 'Interaction Entropy', 'var(--gold)')}
      ${v.statCard(PKTS.Store.pauses().length, 'Cognitive Pauses', 'var(--color-warning)')}
      ${v.statCard(PKTS.Store.overview().dwell.mean+' ms', 'Mean Dwell')}
      ${v.statCard(PKTS.Store.overview().flight.mean+' ms', 'Mean Flight')}
    </div>
    <div class="meta-section animate-in">
      <div class="meta-section-header"><span class="chevron">${PKTS.icon('chevron-right',16)}</span> Normalized Temporal Stream &amp; N-Gram Timing Sequence</div>
      <div class="meta-section-body">
        <p class="text-sm text-muted" style="max-width:var(--measure);">
          The <strong>Normalized Temporal Stream</strong> z-scores dwell/flight per user, detrends, and removes pauses for cross-session comparison.
          The <strong>N-Gram Timing Sequence</strong> presents sliding windows of (dwell, flight) tuples as input to behavioral sequence models.
          The <strong>Autoregressive Timing Model</strong> (AR(p)) and <strong>Conditional Timing Distribution</strong> P(flight | key<sub>t</sub>, key<sub>t+1</sub>) are derived from this substrate.
        </p>
      </div>
    </div>`;
  },
  afterRender() {
    const tm = PKTS.Store.transitionMatrix();
    const data = [];
    tm.keys.forEach((a,i)=>tm.keys.forEach((b,j)=>{ if(tm.matrix[a][b]>0) data.push([i,j,tm.matrix[a][b]]); }));
    PKTS.Charts.heatmap('chartTrans', tm.keys, tm.keys, data, {fmt:true, precision:3});
    const dg = PKTS.Store.digraphMatrix(8);
    const ddata=[]; dg.rows.forEach((r,i)=>{ const target=r[1]; const j=dg.cols.indexOf(target);
      if(j>=0 && dg.cell[r]) ddata.push([i,j,dg.cell[r].mean]); });
    PKTS.Charts.heatmap('chartDigraph', dg.rows, dg.cols, ddata, {});
    const spec = PKTS.Store.spectrum();
    PKTS.Charts.bar('chartSpectrum', spec.map((_,i)=>'k'+i), spec, {color:'#5C4E78', barWidth:'60%'});
    const ps = PKTS.Store.pauses().slice(0,30);
    PKTS.Charts.bar('chartPauses', ps.map((p,i)=>'#'+p.idx), ps.map(p=>p.ms), {color:'#B4742A'});
  }
};
