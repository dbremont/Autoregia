/* ════════════════════════════════════════════════════════════
   GIS Dashboard — multi-tab analytics surface.

   Tabs derived from the statistics the system actually holds:
   Overview (what do I have) · Coverage (does it serve the
   systems) · Structure (how is it wired) · Health (what needs
   attention) · Cost & Trust (what it costs, what is proven) ·
   Activity (what changed).

   Analysis tabs share one cached /gis/api/analysis projection
   (see analysis.js); Activity reads /gis/api/activity.
   ════════════════════════════════════════════════════════════ */
PT.Dashboard = {
  _tab: 'overview',
  _charts: [],

  TABS: [
    { id: 'overview',  label: 'Overview',     icon: 'gauge' },
    { id: 'coverage',  label: 'Coverage',     icon: 'target' },
    { id: 'structure', label: 'Structure',    icon: 'git-branch' },
    { id: 'health',    label: 'Health',       icon: 'activity' },
    { id: 'cost',      label: 'Cost & Trust', icon: 'dollar-sign' },
    { id: 'activity',  label: 'Activity',     icon: 'history' },
  ],

  render() {
    return '<div class="content-header"><div><span class="eyebrow">Analytics</span><h1>Dashboard</h1></div>' +
      '<div class="actions"><button class="btn btn-secondary btn-sm" id="dashRefresh"><pt-icon name="refresh-cw" size="15"></pt-icon> Refresh</button></div></div>' +
      '<div class="dash-tabs" id="dashTabs">' + this.TABS.map(t =>
        '<button class="dash-tab' + (t.id === this._tab ? ' active' : '') + '" data-tab="' + t.id + '">' +
        PT.icon(t.icon, 14) + ' ' + t.label + '</button>').join('') + '</div>' +
      '<div id="dashTabContent"><p class="text-muted">Computing projections…</p></div>';
  },

  afterRender() {
    const self = this;
    document.getElementById('dashTabs').addEventListener('click', function (e) {
      const btn = e.target.closest('.dash-tab'); if (!btn) return;
      self.showTab(btn.dataset.tab);
    });
    document.getElementById('dashRefresh').addEventListener('click', function () {
      PT.Analysis.invalidate();
      self.showTab(self._tab, true);
    });
    this.showTab(this._tab);
  },

  showTab(id, force) {
    this._tab = id;
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    this._disposeCharts();
    const box = document.getElementById('dashTabContent'); if (!box) return;
    if (id === 'overview') { box.innerHTML = this._overview(); this._overviewCharts(); return; }
    if (id === 'activity') {
      box.innerHTML = '<p class="text-muted">Loading activity…</p>';
      this._activity(box); return;
    }
    box.innerHTML = '<p class="text-muted">Computing projections…</p>';
    const self = this;
    PT.Analysis.data(force).then(function (d) {
      if (self._tab !== id) return;             // user moved on while loading
      if (id === 'coverage')  box.innerHTML = PT.Analysis.renderCoverage(d);
      if (id === 'structure') box.innerHTML = PT.Analysis.renderStructure(d);
      if (id === 'health')    box.innerHTML = PT.Analysis.renderHealth(d);
      if (id === 'cost')      box.innerHTML = PT.Analysis.renderCost(d);
      self._renderAnalysisCharts(d, id);
    });
  },

  // ── Overview tab (local store) ─────────────────────────────
  _overview() {
    const s = PT.Store.getStats();
    const entries = PT.Store.getAll();
    const recent = entries.slice(0, 8);
    const pinned = PT.Store.getPinned();
    const row = function (e, withIcon) {
      return '<div class="dash-list-row" onclick="PT.openEntry(\'' + e.id + '\')">' +
        '<span class="dash-dot" style="background:' + PT.kindColor(e.object_kind) + '"></span>' +
        (withIcon ? PT.icon('pin', 14) : '') +
        '<span class="dash-list-name">' + PT.esc(e.name) + '</span>' +
        '<span class="dash-list-kind">' + PT.prettyEnum(e.object_kind).substring(0, 10) + '</span></div>';
    };
    return '<div class="dashboard-stats animate-in">' +
        stat(s.total, 'Total Objects', null) +
        stat(s.active, 'Active', 'var(--status-active)') +
        stat(s.critical, 'Critical', 'var(--priority-critical)') +
        stat(s.pinned, 'Pinned', 'var(--gold)') +
      '</div>' +
      '<div class="dashboard-grid">' +
        '<div class="card animate-in delay-1"><div class="card-header"><h3>Coverage by Kind</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartByKind"></div></div></div>' +
        '<div class="card animate-in delay-2"><div class="card-header"><h3>By Status</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartByStatus"></div></div></div>' +
        '<div class="card animate-in delay-3"><div class="card-header"><h3>By System Served</h3></div><div class="card-body"><div class="mini-chart-echart" id="chartBySystem"></div></div></div>' +
        '<div class="card animate-in delay-4"><div class="card-header"><h3>Pinned Entries</h3></div><div class="card-body dash-list">' +
          (pinned.length ? pinned.map(function (e) { return row(e, true); }).join('')
            : '<p class="text-muted text-sm">No pinned entries yet. Pin an entry to promote it here.</p>') +
        '</div></div>' +
        '<div class="card animate-in delay-5"><div class="card-header"><h3>Recent Entries</h3></div><div class="card-body dash-list">' +
          (recent.length ? recent.map(function (e) { return row(e, false); }).join('')
            : '<p class="text-muted text-sm">No entries yet.</p>') +
        '</div></div>' +
      '</div>';
    function stat(v, label, color) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div></div>';
    }
  },

  _overviewCharts() {
    const s = PT.Store.getStats();
    this._keep('chartByKind', function () { return PT.Charts.hbar('chartByKind', s.byKind); });
    this._keep('chartByStatus', function () { return PT.Charts.donut('chartByStatus', s.byStatus); });
    this._keep('chartBySystem', function () { return PT.Charts.hbar('chartBySystem', s.bySystem); });
  },

  // ── Activity tab ───────────────────────────────────────────
  _activity(box) {
    const self = this;
    fetch('/gis/api/activity?limit=50')
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (events) {
        if (self._tab !== 'activity' || !document.getElementById('dashTabContent')) return;
        box.innerHTML = self._activityBody(events);
      });
  },
  _activityBody(events) {
    if (!events || !events.length) {
      return '<div class="card"><div class="card-body"><p class="text-muted">No activity recorded yet. ' +
        'Open entries, or add and update them, and the log will build up here.</p></div></div>';
    }
    const meta = {
      added:   { icon: 'plus',     cls: 'ok',      verb: 'Added' },
      updated: { icon: 'edit',     cls: 'info',    verb: 'Updated' },
      viewed:  { icon: 'eye',      cls: 'neutral', verb: 'Viewed' },
      deleted: { icon: 'trash-2',  cls: 'danger',  verb: 'Deleted' },
    };
    return '<div class="card"><div class="card-header"><h3>Recent Activity</h3></div><div class="card-body dash-activity">' +
      events.map(function (ev) {
        const m = meta[ev.kind] || meta.viewed;
        return '<div class="rail-event" onclick="PT.openEntry(\'' + PT.esc(ev.entry_id) + '\')">' +
          '<span class="rail-event-icon ' + m.cls + '">' + PT.icon(m.icon, 13) + '</span>' +
          '<span class="rail-event-text">' + m.verb + ': ' + PT.esc(ev.entry_name || ev.entry_id) + '</span>' +
          '<span class="dash-activity-kind">' + PT.prettyEnum(ev.object_kind) + '</span>' +
          '<span class="rail-event-time">' + PT.Dashboard._rel(ev.ts) + '</span></div>';
      }).join('') + '</div></div>';
  },
  _rel(ts) {
    if (!ts) return '';
    const s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (isNaN(s)) return '';
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },

  // ── chart lifecycle helpers ────────────────────────────────
  _keep(id, make) {
    const el = document.getElementById(id); if (!el) return;
    setTimeout(function () { try { make(); } catch (e) {} }, 60);
  },
  _renderAnalysisCharts(d, tab) {
    const self = this;
    setTimeout(function () {
      if (tab === 'coverage') {
        self._charts.push(PT.Charts.hbar('chartByDomain', (d.coverage || {}).by_domain || {}));
        self._charts.push(PT.Charts.donut('chartByHosting', (d.coverage || {}).by_hosting || {}));
      }
      if (tab === 'cost') {
        self._charts.push(PT.Charts.donut('chartByEvidence', (d.trust || {}).by_evidence || {}));
      }
    }, 60);
  },
  _disposeCharts() {
    this._charts.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    this._charts = [];
    const el = document.getElementById('dashTabContent');
    if (el && window.echarts) el.querySelectorAll('[_echarts_instance_]').forEach(function (n) { echarts.dispose(n); });
  },
};
