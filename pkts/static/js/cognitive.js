/* ════════════════════════════════════════════════════════════
   PKTS Cognitive State — load, fatigue, flow, circadian
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Cognitive = {
  render() {
    const v = PKTS.view;
    const load = PKTS.Store.cognitiveLoad();
    const pkr = PKTS.Store.pauseToKeystrokeRatio();
    const fd = PKTS.Store.fatigueDynamics();
    return `
    ${v.header('Strain &amp; Flow', 'Cognitive State', `<span class="text-sm text-muted">Cognitive load ${load}</span>`)}
    <div class="grid-4 animate-in" style="margin-bottom:var(--space-6);">
      ${v.statCard(load, 'Cognitive Load', load>60?'var(--color-danger)':load>35?'var(--color-warning)':'var(--color-success)')}
      ${v.statCard(pkr, 'Pause-to-Keystroke Ratio', 'var(--gold)')}
      ${v.statCard(PKTS.Store.overview().fatigueEventCount, 'Fatigue Events', 'var(--color-warning)')}
      ${v.statCard(PKTS.Store.flowTrace().length, 'Flow Windows', 'var(--color-success)')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartFatigue','Dynamic Trajectory','Fatigue Dynamics','Per-session mean dwell &amp; correction counts — degradation trajectory.')}
      ${v.chartCard('chartFlow','Time-Varying Probability','Flow State Probability Trace','Sliding-window estimate of flow (low variance + high throughput).')}
    </div>
    <div class="chart-grid-2">
      ${v.chartCard('chartCircadian','Temporal Histogram','Circadian Fatigue Distribution','24-hour aggregation of fatigue event frequency by UTC hour.')}
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">Structured Event Log</span><h3>Fatigue Event Log</h3></div></div>
        <div class="chart-sub">Telemetry points exceeding the fatigue threshold (${PKTS.Store.overview().fatigueThreshold} ms).</div>
        <div class="data-table-scroll" style="max-height:260px;">
          <table class="data-table"><thead><tr><th>Event ID</th><th>Session</th><th>Dwell (ms)</th><th>Severity</th></tr></thead>
          <tbody>${this.fatigueRows()}</tbody></table>
        </div>
      </div>
    </div>`;
  },
  fatigueRows() {
    const o = PKTS.Store.overview();
    const evs = PKTS.Store.getEvents().filter(e=>e.timing.hold_time_ms>o.fatigueThreshold).slice(0,40);
    if(!evs.length) return `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:var(--space-5);">No fatigue-flagged events.</td></tr>`;
    return evs.map(e=>{
      const sev = (e.timing.hold_time_ms/o.fatigueThreshold);
      const kind = sev>1.6?'danger':sev>1.3?'warning':'info';
      return `<tr><td class="text-mono">${e.event_id}</td><td class="text-mono">${e.session_id.slice(-3)}</td><td class="text-mono">${e.timing.hold_time_ms}</td><td>${PKTS.view.pill(sev.toFixed(2)+'×', kind)}</td></tr>`;
    }).join('');
  },
  afterRender() {
    const fd = PKTS.Store.fatigueDynamics();
    PKTS.Charts.line('chartFatigue', [
      { name:'Mean Dwell (ms)', data:fd.map(r=>({x:r.sid.slice(-3),y:r.dwell})), area:true, color:'#7A1A2A' },
      { name:'Corrections', data:fd.map(r=>({x:r.sid.slice(-3),y:r.corr})), color:'#B4742A' },
    ], {yName1:'ms'});
    const ft = PKTS.Store.flowTrace();
    PKTS.Charts.line('chartFlow', [{ name:'Flow P', data:ft.map(p=>({x:p.x,y:p.p})), area:true, color:'#3F6E50' }], {yName1:'P(flow)'});
    const circ = PKTS.Store.circadian();
    PKTS.Charts.bar('chartCircadian', circ.map(c=>String(c.hour).padStart(2,'0')), circ.map(c=>c.count), {color:'#5C4E78'});
  }
};
