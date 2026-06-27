/* ════════════════════════════════════════════════════════════
   PRS Dashboard — Statistics & Sub-views
   ════════════════════════════════════════════════════════════ */
PRS.Dashboard = {
  render() {
    const s = PRS.Store.getStats();
    const records = PRS.Store.getAll();
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
          ${records.slice(0,8).map(r=>`<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-light);display:flex;gap:var(--space-3);align-items:center;cursor:pointer;" onclick="PRS.record.showDetail('${r.id}')">
            <span style="width:8px;height:8px;border-radius:50%;background:${TYPE_COLORS[r.record_type]||'#999'};flex-shrink:0;"></span>
            <span style="flex:1;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.esc(r.content)}</span>
            <span style="font-size:10px;color:var(--color-text-muted);font-family:var(--font-mono);">${r.record_type.substring(0,3)}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="card animate-in delay-4">
        <div class="card-header"><h3>Quick Actions</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" onclick="PRS.record.openEditor()" style="justify-content:flex-start;"><prs-icon name="plus" size="15"></prs-icon> New Record</button>
          <button class="btn btn-secondary btn-sm" onclick="PRS.scratchpad.open()" style="justify-content:flex-start;"><prs-icon name="pencil-line" size="15"></prs-icon> Quick Capture</button>
          <button class="btn btn-secondary btn-sm" onclick="PRS.navigate('timeline')" style="justify-content:flex-start;"><prs-icon name="clock" size="15"></prs-icon> View Timeline</button>
          <button class="btn btn-secondary btn-sm" onclick="PRS.navigate('heatmap')" style="justify-content:flex-start;"><prs-icon name="layout-grid" size="15"></prs-icon> Activity Heatmap</button>
          <button class="btn btn-secondary btn-sm" onclick="PRS.CommandPalette.open('')" style="justify-content:flex-start;"><prs-icon name="command" size="15"></prs-icon> Command Palette</button>
        </div>
      </div>
    </div>`;
  },
  esc(s) { if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
};
// Render charts after DOM
setTimeout(() => {
  if(document.getElementById('chartByType')) PRS.Charts.bar('chartByType', PRS.Store.getStats().byType);
  if(document.getElementById('chartByStatus')) PRS.Charts.donut('chartByStatus', PRS.Store.getStats().byStatus);
}, 100);
PRS.Store.subscribe(() => {
  setTimeout(() => {
    if(document.getElementById('chartByType')) PRS.Charts.bar('chartByType', PRS.Store.getStats().byType);
    if(document.getElementById('chartByStatus')) PRS.Charts.donut('chartByStatus', PRS.Store.getStats().byStatus);
  }, 50);
});