/* ════════════════════════════════════════════════════════════
   PKTS Raw Telemetry — event log, timestamp trace, key mapping
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Telemetry = {
  render() {
    const v = PKTS.view;
    const evs = PKTS.Store.getEvents();
    const sessions = PKTS.Store.getSessions();
    return `
    ${v.header('Source of Truth', 'Raw Telemetry', `<span class="text-sm text-muted">${evs.length} events · ${sessions.length} sessions</span>`)}
    <div class="chart-grid-3 animate-in" style="margin-bottom:var(--space-6);">
      <div class="chart-card">
        <div class="card-header"><h3>Hardware Timestamp Trace</h3></div>
        <div class="card-body"><div id="tsTrace" class="chart-box" style="min-height:160px;"></div></div>
      </div>
      <div class="chart-card">
        <div class="card-header"><h3>Key Code Mapping</h3></div>
        <div class="card-body" style="max-height:180px;overflow-y:auto;">
          <table class="data-table"><thead><tr><th>Key</th><th>HID/Scancode</th><th>Count</th></tr></thead>
          <tbody>${this.keyCodeRows()}</tbody></table>
        </div>
      </div>
      <div class="chart-card">
        <div class="card-header"><h3>Sessions</h3></div>
        <div class="card-body" style="max-height:180px;overflow-y:auto;">
          <table class="data-table"><thead><tr><th>Session</th><th>Events</th><th>Task</th></tr></thead>
          <tbody>${this.sessionRows()}</tbody></table>
        </div>
      </div>
    </div>
    <div class="chart-card animate-in">
      <div class="card-header"><div><span class="eyebrow">Raw Event Stream</span><h3>Keystroke Event Log</h3></div>
        <div class="actions"><input type="search" id="telFilter" placeholder="Filter by key, session, id…" class="text-sm" style="padding:var(--space-1) var(--space-3);border:var(--hairline) solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface-2);"></div>
      </div>
      <div class="data-table-scroll" style="max-height:520px;">
        <table class="data-table" id="telTable"><thead><tr>
          <th>Event ID</th><th>Time (UTC)</th><th>Session</th><th>Key</th><th>Code</th><th>Mods</th><th>Dwell</th><th>Flight</th><th>WPM</th>
        </tr></thead><tbody id="telBody"></tbody></table>
      </div>
    </div>`;
  },
  keyCodeRows() {
    const map = {};
    PKTS.Store.getEvents().forEach(e=>{ const k=e.event.key_code; map[k]=(map[k]||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,20)
      .map(([code,n])=>`<tr><td class="text-mono">${PKTS.esc(code)}</td><td class="text-mono">HID-${code}</td><td class="text-mono">${n}</td></tr>`).join('');
  },
  sessionRows() {
    return PKTS.Store.getSessions().map(s=>`<tr><td class="text-mono">${s.session_id.slice(-3)}</td><td class="text-mono">${s.event_count}</td><td>${s.task_type}</td></tr>`).join('');
  },
  eventRows(filter='') {
    const f=filter.toLowerCase().trim();
    const evs = PKTS.Store.getEvents().filter(e=> !f ||
      (e.event.key||'').toLowerCase().includes(f) || e.session_id.toLowerCase().includes(f) || e.event_id.toLowerCase().includes(f) || (e.event.key_code||'').toLowerCase().includes(f));
    return evs.slice(0,300).map(e=>`<tr>
      <td class="text-mono">${e.event_id}</td>
      <td class="text-mono">${new Date(e.timestamp_utc).toISOString().slice(11,19)}</td>
      <td class="text-mono">${e.session_id.slice(-3)}</td>
      <td>${PKTS.esc(e.event.key||'·')}</td>
      <td class="text-mono">${PKTS.esc(e.event.key_code)}</td>
      <td class="text-mono">${(e.event.modifiers||[]).join('+')||'—'}</td>
      <td class="text-mono">${e.timing.hold_time_ms}</td>
      <td class="text-mono">${e.timing.flight_time_ms??'—'}</td>
      <td class="text-mono">${e.timing.typing_speed_wpm}</td>
    </tr>`).join('');
  },
  afterRender() {
    const evs = PKTS.Store.getEvents().slice(0,200);
    PKTS.Charts.scatter('tsTrace', evs.map((e,i)=>[i, e.timing.event_time_ms%86400000]), {xName:'event #', yName:'ms (day)'});
    document.getElementById('telBody').innerHTML = this.eventRows();
    document.getElementById('telFilter')?.addEventListener('input',(e)=>{
      document.getElementById('telBody').innerHTML = this.eventRows(e.target.value);
    });
  }
};
