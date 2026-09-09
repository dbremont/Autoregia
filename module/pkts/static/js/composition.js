/* ════════════════════════════════════════════════════════════
   PKTS Composition Process — bursts, revisions, word timing
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Composition = {
  render() {
    const v = PKTS.view;
    const b = PKTS.Store.bursts();
    const c = PKTS.Store.correctionTopology();
    const prodRevRatio = c.backspaces? ((PKTS.Store.getEvents().length - c.backspaces) / c.backspaces).toFixed(1) : '∞';
    return `
    ${v.header('Drafting Dynamics', 'Composition Process', `<span class="text-sm text-muted">${b.count} bursts detected</span>`)}
    <div class="grid-4 animate-in" style="margin-bottom:var(--space-6);">
      ${v.statCard(b.count, 'Burst Count')}
      ${v.statCard(b.avgLen, 'Avg Burst Length')}
      ${v.statCard(b.avgDur + ' ms', 'Avg Burst Duration')}
      ${v.statCard(prodRevRatio, 'Production–Revision Ratio', 'var(--oxford)')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartBurstDur','Probability Distribution','Burst Duration Distribution','Duration of individual production bursts (ms).')}
      ${v.chartCard('chartInterBurst','Probability Distribution','Inter-Burst Interval','Pause durations between production bursts — planning depth proxy.')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartCorrDepth','Probability Distribution','Correction Depth Distribution','Characters deleted per backspace event — shallow corrections signal expertise.')}
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Structured Vector</span><h3>Word-Level Timing Vector</h3></div></div>
        <div class="chart-sub">Per-word: [char_count, total_time_ms, post_word_pause].</div>
        <div class="data-table-scroll" style="max-height:260px;">
          <table class="data-table"><thead><tr><th>#</th><th>Chars</th><th>Time (ms)</th><th>Post-pause (ms)</th></tr></thead>
          <tbody>${this.wordRows()}</tbody></table>
        </div>
      </div>
    </div>`;
  },
  wordRows() {
    const words = PKTS.Store.wordTiming();
    return words.map((w,i)=>`<tr><td class="text-mono">${i+1}</td><td class="text-mono">${w.chars}</td><td class="text-mono">${w.time}</td><td class="text-mono">${w.post}</td></tr>`).join('');
  },
  afterRender() {
    const b = PKTS.Store.bursts();
    PKTS.Charts.bar('chartBurstDur', b.durations.map((_,i)=>'b'+(i+1)), b.durations, {color:'#7A1A2A'});
    PKTS.Charts.bar('chartInterBurst', b.interBurst.map((_,i)=>'g'+(i+1)), b.interBurst, {color:'#3F6092'});
    const ct = PKTS.Store.correctionTopology();
    if (ct.depthDist.length) {
      PKTS.Charts.bar('chartCorrDepth', ct.depthDist.map(d=>d.depth+' ch'), ct.depthDist.map(d=>d.count), {color:'#B4742A'});
    } else {
      document.getElementById('chartCorrDepth').innerHTML = `<div class="empty-state"><p>No corrections recorded.</p></div>`;
    }
  }
};
