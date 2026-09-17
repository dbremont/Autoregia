/* ════════════════════════════════════════════════════════════
   PBS Dashboard — Statistics & Sub-views
   ════════════════════════════════════════════════════════════ */
PBS.Dashboard = {
  render() {
    const s = PBS.Store.getStats();
    const records = PBS.Store.getAll();
    return `
    <div class="content-header"><div><span class="eyebrow">At a Glance</span><h1>Dashboard</h1></div></div>
    <div class="dashboard-stats animate-in">
      <div class="stat-card"><div class="stat-value">${s.total}</div><div class="stat-label">Total Records</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--status-active)">${(s.byStatus['Active']||0)+(s.byStatus['Pending']||0)}</div><div class="stat-label">Active / Pending</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--priority-critical)">${s.byPriority['Critical']||0}</div><div class="stat-label">Critical Priority</div></div>
      <div class="stat-card"><div class="stat-value">${Object.keys(s.byType).length}</div><div class="stat-label">Record Types</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card animate-in delay-1">
        <div class="card-header"><h3>By Type</h3></div>
        <div class="card-body"><div class="mini-chart" id="chartByType"></div></div>
      </div>
      <div class="card animate-in delay-2">
        <div class="card-header"><h3>By Status</h3></div>
        <div class="card-body"><div class="mini-chart" id="chartByStatus"></div></div>
      </div>
      <div class="card animate-in delay-3" style="grid-column:1/2;">
        <div class="card-header"><h3>Recent Records</h3></div>
        <div class="card-body" style="max-height:300px;overflow-y:auto;">
          ${records.slice(0,8).map(r=>`<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-light);display:flex;gap:var(--space-3);align-items:center;cursor:pointer;" onclick="PBS.record.showDetail('${r.id}')">
            <span style="width:8px;height:8px;border-radius:50%;background:${TYPE_COLORS[r.record_type]||'#999'};flex-shrink:0;"></span>
            <span style="flex:1;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.esc(r.content)}</span>
            <span style="font-size:var(--text-2xs);color:var(--color-text-muted);font-family:var(--font-mono);">${r.record_type.substring(0,3)}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="card animate-in delay-4">
        <div class="card-header"><h3>Quick Actions</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="PBS.record.openEditor()" style="justify-content:flex-start;"><pbs-icon name="plus" size="15"></pbs-icon> New Record</button>
          <button class="btn btn-secondary btn-sm" onclick="PBS.scratchpad.open()" style="justify-content:flex-start;"><pbs-icon name="pencil-line" size="15"></pbs-icon> Quick Capture</button>
          <button class="btn btn-secondary btn-sm" onclick="PBS.navigate('timeline')" style="justify-content:flex-start;"><pbs-icon name="clock" size="15"></pbs-icon> View Timeline</button>
          <button class="btn btn-secondary btn-sm" onclick="PBS.navigate('heatmap')" style="justify-content:flex-start;"><pbs-icon name="layout-grid" size="15"></pbs-icon> Activity Heatmap</button>
          <button class="btn btn-secondary btn-sm" onclick="PBS.CommandPalette.open('')" style="justify-content:flex-start;"><pbs-icon name="command" size="15"></pbs-icon> Command Palette</button>
        </div>
      </div>
    </div>`;
  },
  esc(s) { if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
};
// Render charts after DOM
setTimeout(() => {
  if(document.getElementById('chartByType')) PBS.Charts.bar('chartByType', PBS.Store.getStats().byType);
  if(document.getElementById('chartByStatus')) PBS.Charts.donut('chartByStatus', PBS.Store.getStats().byStatus);
}, 100);
PBS.Store.subscribe(() => {
  setTimeout(() => {
    if(document.getElementById('chartByType')) PBS.Charts.bar('chartByType', PBS.Store.getStats().byType);
    if(document.getElementById('chartByStatus')) PBS.Charts.donut('chartByStatus', PBS.Store.getStats().byStatus);
  }, 50);
});