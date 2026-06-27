/* PTOCS Dashboard — at-a-glance statistics, charts, recent entries */
PT.Dashboard = {
  render() {
    const s = PT.Store.getStats();
    const entries = PT.Store.getAll();
    const recent = entries.slice(0, 8);
    return '<div class="content-header"><div><span class="eyebrow">At a Glance</span><h1>Dashboard</h1></div></div>' +
      '<div class="dashboard-stats animate-in">' +
        stat(s.total, 'Total Objects', null) +
        stat(s.active, 'Active', 'var(--status-active)') +
        stat(s.critical, 'Critical', 'var(--priority-critical)') +
        stat(Object.keys(s.byKind).length, 'Object Kinds', null) +
      '</div>' +
      '<div class="dashboard-grid">' +
        '<div class="card animate-in delay-1"><div class="card-header"><h3>Coverage by Kind</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartByKind"></div></div></div>' +
        '<div class="card animate-in delay-2"><div class="card-header"><h3>By Status</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartByStatus"></div></div></div>' +
        '<div class="card animate-in delay-3"><div class="card-header"><h3>By System Served</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartBySystem"></div></div></div>' +
        '<div class="card animate-in delay-4"><div class="card-header"><h3>Recent Entries</h3></div><div class="card-body" style="max-height:260px;overflow-y:auto;">' +
          (recent.length ? recent.map(function (e) {
            return '<div style="padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-light);display:flex;gap:var(--space-3);align-items:center;cursor:pointer;" onclick="PT.Entry.showDetail(\'' + e.id + '\')">' +
              '<span style="width:8px;height:8px;border-radius:50%;background:' + PT.kindColor(e.object_kind) + ';flex-shrink:0;"></span>' +
              '<span style="flex:1;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + PT.esc(e.name) + '</span>' +
              '<span style="font-size:10px;color:var(--color-text-muted);font-family:var(--font-mono);">' + PT.prettyEnum(e.object_kind).substring(0, 10) + '</span></div>';
          }).join('') : '<p class="text-muted text-sm">No entries yet.</p>') +
        '</div></div>' +
      '</div>';
    function stat(v, label, color) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div></div>';
    }
  },
  afterRender() {
    const s = PT.Store.getStats();
    if (document.getElementById('chartByKind')) PT.Charts.hbar('chartByKind', s.byKind);
    if (document.getElementById('chartByStatus')) PT.Charts.donut('chartByStatus', s.byStatus);
    if (document.getElementById('chartBySystem')) PT.Charts.hbar('chartBySystem', s.bySystem);
  },
};
