/* ════════════════════════════════════════════════════════════
   PKTS Overview — scalar metrics, distributions, time-series
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Overview = {
  render() {
    const o = PKTS.Store.overview();
    const v = PKTS.view;
    const elapsedMin = (o.totalActiveMs/60000).toFixed(1);
    return `
    ${v.header('At a Glance', 'Overview', `<span class="text-sm text-muted">${o.sessionCount} sessions · ${elapsedMin} min active</span>`)}
    <div class="stat-row animate-in">
      ${v.statCard(o.totalKeystrokes.toLocaleString(), 'Total Keystroke Volume')}
      ${v.statCard(o.avgWpm + ' wpm', 'Average Speed (WPM)')}
      ${v.statCard(o.consistencyPct + '%', 'Consistency Score', 'var(--oxford)')}
      ${v.statCard(o.consistencyIndex.toFixed(2), 'Global Consistency Index', 'var(--gold)')}
      ${v.statCard(o.fatigueEventCount, 'Fatigue Event Frequency', 'var(--color-warning)')}
      ${v.statCard(o.sessionCount, 'Total Session Count')}
      ${v.statCard(o.throughputKeysPerMin, 'Aggregate Throughput (k/m)')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartTS','Time-Series Visualization','Keystrokes Time Series + Derivative','Throughput (keys) with first-order derivative (velocity). Exposes bursts, pauses, transitions.')}
      ${v.chartCard('chartStates','Distribution','Behavioral State Distribution','Inferred cognitive/motor state mapping (focus / casual / tired).')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartTrend','Difference Vector','Cross-Session Trend','First-order differences of WPM &amp; mean dwell across consecutive sessions.')}
      ${v.chartCard('chartProd','Composite Metric','Productivity Telemetry','Per-session throughput vs. revision burden.')}
    </div>
    <div class="meta-section animate-in">
      <div class="meta-section-header"><span class="chevron">${PKTS.icon('chevron-right',16)}</span> Session Rhythm Profile &amp; Derived Scalars</div>
      <div class="meta-section-body">
        <div class="grid-3">
          ${v.statCard(o.dwell.mean + ' ms', 'Mean Dwell Time')}
          ${v.statCard(o.flight.mean + ' ms', 'Mean Flight Time')}
          ${v.statCard(o.dwell.stddev.toFixed(1) + ' ms', 'Dwell Std Dev')}
        </div>
        <p class="text-sm text-muted" style="margin-top:var(--space-4);max-width:var(--measure);">
          The <strong>Session Rhythm Profile</strong> segments keystroke density into warm-up, flow, and degradation phases. The
          <strong>Productivity Telemetry Artifact</strong> aggregates throughput, interruption density, revision burden, and cadence into a composite vector for organizational analytics.
        </p>
      </div>
    </div>`;
  },
  afterRender() {
    const ts = PKTS.Store.timeSeries();
    if (ts.length) {
      const s = ts[0];
      PKTS.Charts.line('chartTS', [
        { name:'Throughput', data:s.series, area:true },
        { name:'Derivative (velocity)', data:s.deriv, right:true, color:'#A8854A' },
      ], { dual:true, yName1:'keys', yName2:'Δ' });
    }
    const states = PKTS.Store.behavioralStates();
    PKTS.Charts.donut('chartStates', states);
    const trend = PKTS.Store.crossSessionTrend();
    PKTS.Charts.line('chartTrend', [
      { name:'Δ WPM', data:trend.map(r=>({x:r.sid.slice(-3),y:r.dWpm})), color:'#3F6E50' },
      { name:'Δ Dwell (ms)', data:trend.map(r=>({x:r.sid.slice(-3),y:r.dDwell})), color:'#B4742A' },
    ]);
    PKTS.Charts.bar('chartProd', trend.map(r=>r.sid.slice(-3)), trend.map(r=>+r.wpm), {color:'#7A1A2A'});
  }
};
