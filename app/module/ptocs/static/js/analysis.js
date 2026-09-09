/* PTOCS Analysis — Statistical Overlay (coverage, gaps, redundancy, dependency, cost, freshness, health, trust) */
PT.Analysis = {
  _charts: [],
  render() {
    return '<div class="content-header"><div><span class="eyebrow">Intelligence · Statistical Overlay</span><h1>Analysis</h1></div>' +
      '<div class="actions"><button class="btn btn-secondary btn-sm" onclick="PT.Analysis.refresh()"><pt-icon name="refresh-cw" size="15"></pt-icon> Refresh</button></div></div>' +
      '<div id="analysisBody"><p class="text-muted">Computing projections…</p></div>';
  },
  async afterRender() { await this.refresh(); },
  async refresh() {
    let d;
    try { const r = await fetch('/ptocs/api/analysis'); d = await r.json(); }
    catch (e) { d = this._local(); }
    this._dispose();
    document.getElementById('analysisBody').innerHTML = this._body(d);
    this._renderCharts(d);
  },
  _dispose() {
    this._charts.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    this._charts = [];
    const el = document.getElementById('analysisBody');
    if (el && window.echarts) el.querySelectorAll('[_echarts_instance_]').forEach(function (n) { echarts.dispose(n); });
  },
  _body(d) {
    const cov = d.coverage || {};
    const gaps = d.capability_gaps || [];
    const red = d.redundancy || [];
    const dep = d.dependency || {};
    const cost = d.cost || {};
    const life = d.lifecycle || {};
    const health = d.health || {};
    const trust = d.trust || {};
    const spofs = dep.single_points_of_failure || [];
    const stale = life.stale_active || [];
    const orphans = health.orphans || [];
    const underval = trust.under_validated || [];
    const findings = [];
    // Findings (heuristic commentary)
    if (spofs.length) findings.push({ cls: 'warn', icon: 'alert-triangle', text: spofs.length + ' potential single point(s) of failure. Top: <b>' + PT.esc(spofs[0].name) + '</b> depended on by ' + spofs[0].dependents + '.' });
    if (red.length) findings.push({ cls: 'info', icon: 'layers', text: red.length + ' redundant capability cluster(s) detected (alternative-to / duplicates). Consider consolidating.' });
    if (stale.length) findings.push({ cls: 'warn', icon: 'clock', text: stale.length + ' active entry(ies) not used in 30+ days. Review for staleness.' });
    if (orphans.length) findings.push({ cls: 'neutral', icon: 'box', text: orphans.length + ' orphaned entr(y/ies) with no relationships.' });
    if (health.top_vendor_share && health.top_vendor_share > 0.2) findings.push({ cls: 'danger', icon: 'shield', text: 'Vendor concentration risk: top vendor <b>' + PT.esc(health.top_vendor) + '</b> holds ' + Math.round(health.top_vendor_share*100) + '% of the catalog.' });
    if (underval.length) findings.push({ cls: 'info', icon: 'lightbulb', text: underval.length + ' entr(y/ies) with weak evidence (anecdotal/none) — candidates for validation.' });
    if (cost.total_recurring > 0) findings.push({ cls: 'neutral', icon: 'dollar-sign', text: 'Total recurring cost: ' + Object.entries(cost.by_currency).map(function (c) { return c[1] + ' ' + c[0] + '/mo'; }).join(', ') + '.' });

    return '<div class="dashboard-stats animate-in">' +
        stat(d.total, 'Catalog Objects') +
        stat(cost.total_recurring > 0 ? cost.total_recurring : '—', 'Recurring Cost/mo', cost.total_recurring > 0 ? 'var(--priority-high)' : null, cost.by_currency) +
        stat(dep.max_depth, 'Max Dependency Depth') +
        stat(spofs.length, 'Single Points of Failure', spofs.length ? 'var(--color-danger)' : 'var(--color-success)') +
      '</div>' +
      (findings.length ? '<div class="card animate-in delay-1" style="margin-bottom:var(--space-6);"><div class="card-header"><h3>Findings</h3></div><div class="analysis-findings">' +
        findings.map(function (f) { return '<div class="finding ' + f.cls + '"><span class="finding-icon">' + PT.icon(f.icon, 16) + '</span><span class="finding-text">' + f.text + '</span></div>'; }).join('') +
      '</div></div>' : '') +
      '<div class="analysis-grid">' +
        card('coverage-kind', 'Coverage & Composition', 'By object kind', true) +
        card('coverage-system', 'Coverage & Composition', 'By system served') +
        card('coverage-hosting', 'Coverage & Composition', 'By hosting model') +
        card('trust-evidence', 'Provenance & Trust', 'By evidence level') +
        card('redundancy', 'Redundancy / Overlap', this._redundancyList(red), false, true) +
        card('cost', 'Cost Exposure', this._costBody(cost), false, true) +
        card('gaps', 'Capability-Gap Analysis', this._gapList(gaps), false, true) +
        card('dependency', 'Dependency Analytics', this._dependencyBody(dep, spofs), false, true) +
        card('lifecycle', 'Lifecycle / Freshness', this._lifecycleBody(life, stale), false, true) +
        card('health', 'Ecosystem Health', this._healthBody(health, orphans), false, true) +
      '</div>';
    function stat(v, label, color, sub) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div>' + (sub ? '<div class="text-faint text-xs" style="margin-top:var(--space-1);">' + Object.entries(sub).map(function (c) { return c[1] + ' ' + c[0]; }).join(' · ') + '</div>' : '') + '</div>';
    }
    function card(id, eyebrow, title, span2, isHtml) {
      return '<div class="analysis-card animate-in' + (span2 ? ' span-2' : '') + '"><div class="card-header"><span class="eyebrow">' + eyebrow + '</span><h3>' + title + '</h3></div>' +
        (isHtml ? '<div class="card-body">' + title + '</div>' : '<div class="analysis-chart" id="' + id + '"></div>') + '</div>';
    }
  },
  _redundancyList(red) {
    if (!red.length) return '<p class="text-muted text-sm">No redundant capability clusters detected.</p>';
    return '<div class="gap-list">' + red.map(function (c) {
      const names = c.members.map(function (m) { const e = PT.Store.getById(m); return e ? e.name : m; });
      return '<div class="gap-item"><span class="gap-cap">' + PT.esc(c.capability) + ' (' + c.size + ')</span>' +
        '<span class="text-secondary text-sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + names.map(PT.esc).join(' · ') + '</span></div>';
    }).join('') + '</div>';
  },
  _gapList(gaps) {
    const weak = gaps.filter(function (g) { return g.count <= 1; });
    if (!weak.length) return '<p class="text-muted text-sm">All tracked capabilities have 2+ backing objects.</p>';
    return '<div class="gap-list">' + weak.map(function (g) {
      return '<div class="gap-item"><span class="gap-cap">' + PT.esc(g.capability) + '</span><span class="gap-count">' + g.count + ' object' + (g.count === 1 ? '' : 's') + '</span></div>';
    }).join('') + '</div>';
  },
  _costBody(cost) {
    return '<div class="meta-grid">' +
      mi('Recurring / mo', cost.total_recurring ? Object.entries(cost.by_currency).map(function (c) { return c[1] + ' ' + c[0]; }).join(', ') : '—') +
      mi('Paid objects', cost.paid_count || 0) +
      mi('Free objects', cost.free_count || 0) +
      mi('Paid : Free ratio', (cost.paid_count || 0) + ' : ' + (cost.free_count || 0)) +
      '</div>';
  },
  _dependencyBody(dep, spofs) {
    return '<div class="meta-grid">' + mi('Max chain depth', dep.max_depth || 0) + mi('Single points of failure', (spofs||[]).length) + '</div>' +
      (spofs && spofs.length ? '<div class="gap-list" style="margin-top:var(--space-3);">' + spofs.map(function (s) {
        return '<div class="gap-item"><span class="gap-cap">' + PT.esc(s.name) + '</span><span class="gap-count">' + s.dependents + ' dependents</span></div>';
      }).join('') + '</div>' : '<p class="text-muted text-sm" style="margin-top:var(--space-3);">No critical single points of failure.</p>');
  },
  _lifecycleBody(life, stale) {
    const dist = life.distribution || {};
    return '<div class="meta-grid">' + Object.entries(dist).map(function (kv) { return mi(PT.prettyEnum(kv[0]), kv[1]); }).join('') +
      mi('Deprecated/retired backlog', life.deprecated_backlog || 0) + '</div>' +
      (stale && stale.length ? '<div class="gap-list" style="margin-top:var(--space-3);"><div class="sidebar-label" style="padding:0;margin-bottom:var(--space-2);">Stale active (>30d)</div>' + stale.map(function (s) {
        return '<div class="gap-item"><span class="gap-cap">' + PT.esc(s.name) + '</span><span class="gap-count">' + s.days + 'd ago</span></div>';
      }).join('') + '</div>' : '');
  },
  _healthBody(health, orphans) {
    const lic = health.license_concentration || {};
    return '<div class="meta-grid">' +
      mi('Orphaned entries', (orphans||[]).length) +
      mi('Top vendor', PT.esc(health.top_vendor) || '—') +
      mi('Top vendor share', health.top_vendor_share ? Math.round(health.top_vendor_share*100) + '%' : '—') +
      '</div>' +
      '<div class="sidebar-label" style="padding:0;margin:var(--space-3) 0 var(--space-2);">License concentration</div>' +
      '<div class="gap-list">' + Object.entries(lic).map(function (kv) { return '<div class="gap-item"><span class="gap-cap">' + PT.esc(kv[0]) + '</span><span class="gap-count">' + kv[1] + '</span></div>'; }).join('') + '</div>';
  },
  _renderCharts(d) {
    const cov = d.coverage || {}; const trust = d.trust || {};
    const mk = function (id, data, type) {
      const el = document.getElementById(id); if (!el) return;
      if (type === 'donut') this._charts.push(PT.Charts.donut(id, data)); else this._charts.push(PT.Charts.hbar(id, data));
    }.bind(this);
    setTimeout(function () {
      if (document.getElementById('coverage-kind')) mk('coverage-kind', cov.by_kind || {}, 'hbar');
      if (document.getElementById('coverage-system')) mk('coverage-system', cov.by_system || {}, 'hbar');
      if (document.getElementById('coverage-hosting')) mk('coverage-hosting', cov.by_hosting || {}, 'donut');
      if (document.getElementById('trust-evidence')) mk('trust-evidence', trust.by_evidence || {}, 'donut');
    }, 60);
  },
  _local() {
    // Fallback overlay computed client-side if API is unavailable.
    const entries = PT.Store.getAll();
    const counter = function (fn) { const m = {}; entries.forEach(function (e) { const k = fn(e) || '?'; m[k] = (m[k]||0)+1; }); return m; };
    return {
      total: entries.length,
      coverage: { by_kind: counter(function (e) { return e.object_kind; }), by_system: counter(function (e) { return e.strategic && e.strategic.system_served; }), by_hosting: counter(function (e) { return e.hosting_model; }) },
      capability_gaps: [], redundancy: [], dependency: { max_depth: 0, single_points_of_failure: [] },
      cost: { total_recurring: 0, by_currency: {}, paid_count: 0, free_count: 0 },
      lifecycle: { distribution: counter(function (e) { return e.lifecycle_state; }), stale_active: [], deprecated_backlog: 0 },
      health: { orphans: [], top_vendor: null, top_vendor_share: 0, license_concentration: {} },
      trust: { by_evidence: counter(function (e) { return e.epistemic && e.epistemic.evidence_level; }), by_fit: {}, under_validated: [] },
    };
  },
};
function mi(k, v) { return '<div class="meta-item"><span class="meta-key">' + k + '</span><span class="meta-val">' + (v == null || v === '' ? '—' : v) + '</span></div>'; }
