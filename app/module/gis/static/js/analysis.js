/* ════════════════════════════════════════════════════════════
   GIS Analysis — the shared analytics projection service.

   Fetches /gis/api/analysis once (client-side fallback when the
   API is unreachable) and renders the four analytics tabs of the
   Dashboard: Coverage, Structure, Health, Cost & Trust.
   ════════════════════════════════════════════════════════════ */
PT.Analysis = {
  _promise: null,

  data(force) {
    if (!this._promise || force) {
      this._promise = fetch('/gis/api/analysis')
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .catch(function () { return PT.Analysis._local(); });
    }
    return this._promise;
  },
  invalidate() { this._promise = null; },

  // ── Coverage tab ───────────────────────────────────────────
  renderCoverage(d) {
    const cov = d.coverage || {};
    const gaps = d.capability_gaps || [];
    const weak = gaps.filter(function (g) { return g.count <= 1; });
    const systems = Object.keys(cov.by_system || {}).filter(function (k) { return k !== 'unassigned'; });
    return '<div class="dashboard-stats animate-in">' +
        stat(systems.length, 'Systems Served') +
        stat(gaps.length, 'Capabilities Tracked') +
        stat(weak.length, 'Weak Capabilities', weak.length ? 'var(--color-warning)' : 'var(--color-success)') +
      '</div>' +
      '<div class="analysis-grid">' +
        '<div class="analysis-card animate-in delay-1"><div class="card-header"><span class="eyebrow">Coverage & Composition</span><h3>By Domain</h3></div><div class="analysis-chart" id="chartByDomain"></div></div>' +
        '<div class="analysis-card animate-in delay-2"><div class="card-header"><span class="eyebrow">Coverage & Composition</span><h3>By Hosting Model</h3></div><div class="analysis-chart" id="chartByHosting"></div></div>' +
        '<div class="analysis-card span-2 animate-in delay-3"><div class="card-header"><span class="eyebrow">Capability-Gap Analysis</span><h3>Weak Capabilities</h3></div><div class="card-body">' + this._gapList(gaps) + '</div></div>' +
      '</div>';
    function stat(v, label, color) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div></div>';
    }
  },

  // ── Structure tab ──────────────────────────────────────────
  renderStructure(d) {
    const dep = d.dependency || {};
    const red = d.redundancy || [];
    const spofs = dep.single_points_of_failure || [];
    return '<div class="dashboard-stats animate-in">' +
        stat(dep.max_depth || 0, 'Max Dependency Depth') +
        stat(spofs.length, 'Single Points of Failure', spofs.length ? 'var(--color-danger)' : 'var(--color-success)') +
        stat(red.length, 'Redundant Clusters') +
      '</div>' +
      '<div class="analysis-grid">' +
        '<div class="analysis-card animate-in delay-1"><div class="card-header"><span class="eyebrow">Dependency Analytics</span><h3>Single Points of Failure</h3></div><div class="card-body">' + this._dependencyBody(dep, spofs) + '</div></div>' +
        '<div class="analysis-card animate-in delay-2"><div class="card-header"><span class="eyebrow">Redundancy / Overlap</span><h3>Alternative Clusters</h3></div><div class="card-body">' + this._redundancyList(red) + '</div></div>' +
      '</div>';
    function stat(v, label, color) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div></div>';
    }
  },

  // ── Health tab ─────────────────────────────────────────────
  renderHealth(d) {
    const life = d.lifecycle || {};
    const health = d.health || {};
    const stale = life.stale_active || [];
    const orphans = health.orphans || [];
    const findings = this._findings(d);
    return '<div class="dashboard-stats animate-in">' +
        stat(stale.length, 'Stale Active (>30d)', stale.length ? 'var(--color-warning)' : null) +
        stat(orphans.length, 'Orphaned Entries') +
        stat(life.deprecated_backlog || 0, 'Deprecated Backlog') +
      '</div>' +
      (findings.length ? '<div class="card animate-in delay-1" style="margin-bottom:var(--space-6);"><div class="card-header"><h3>Findings</h3></div><div class="analysis-findings">' +
        findings.map(function (f) { return '<div class="finding ' + f.cls + '"><span class="finding-icon">' + PT.icon(f.icon, 16) + '</span><span class="finding-text">' + f.text + '</span></div>'; }).join('') +
      '</div></div>' : '') +
      '<div class="analysis-grid">' +
        '<div class="analysis-card animate-in delay-2"><div class="card-header"><span class="eyebrow">Lifecycle / Freshness</span><h3>Lifecycle Distribution</h3></div><div class="card-body">' + this._lifecycleBody(life, stale) + '</div></div>' +
        '<div class="analysis-card animate-in delay-3"><div class="card-header"><span class="eyebrow">Ecosystem Health</span><h3>Concentration & Orphans</h3></div><div class="card-body">' + this._healthBody(health, orphans) + '</div></div>' +
      '</div>';
    function stat(v, label, color) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div></div>';
    }
  },

  _findings(d) {
    const dep = d.dependency || {};
    const cost = d.cost || {};
    const life = d.lifecycle || {};
    const health = d.health || {};
    const trust = d.trust || {};
    const spofs = dep.single_points_of_failure || [];
    const red = d.redundancy || [];
    const stale = life.stale_active || [];
    const orphans = health.orphans || [];
    const underval = trust.under_validated || [];
    const findings = [];
    if (spofs.length) findings.push({ cls: 'warn', icon: 'alert-triangle', text: spofs.length + ' potential single point(s) of failure. Top: <b>' + PT.esc(spofs[0].name) + '</b> depended on by ' + spofs[0].dependents + '.' });
    if (red.length) findings.push({ cls: 'info', icon: 'layers', text: red.length + ' redundant capability cluster(s) detected (alternative-to / duplicates). Consider consolidating.' });
    if (stale.length) findings.push({ cls: 'warn', icon: 'clock', text: stale.length + ' active entry(ies) not used in 30+ days. Review for staleness.' });
    if (orphans.length) findings.push({ cls: 'neutral', icon: 'box', text: orphans.length + ' orphaned entr(y/ies) with no relationships.' });
    if (health.top_vendor_share && health.top_vendor_share > 0.2) findings.push({ cls: 'danger', icon: 'shield', text: 'Vendor concentration risk: top vendor <b>' + PT.esc(health.top_vendor) + '</b> holds ' + Math.round(health.top_vendor_share * 100) + '% of the catalog.' });
    if (underval.length) findings.push({ cls: 'info', icon: 'lightbulb', text: underval.length + ' entr(y/ies) with weak evidence (anecdotal/none) — candidates for validation.' });
    if (cost.total_recurring > 0) findings.push({ cls: 'neutral', icon: 'dollar-sign', text: 'Total recurring cost: ' + Object.entries(cost.by_currency).map(function (c) { return c[1] + ' ' + c[0] + '/mo'; }).join(', ') + '.' });
    return findings;
  },

  // ── Cost & Trust tab ───────────────────────────────────────
  renderCost(d) {
    const cost = d.cost || {};
    const trust = d.trust || {};
    const underval = trust.under_validated || [];
    return '<div class="dashboard-stats animate-in">' +
        stat(cost.total_recurring > 0 ? cost.total_recurring : '—', 'Recurring Cost/mo', cost.total_recurring > 0 ? 'var(--priority-high)' : null,
          cost.by_currency) +
        stat(cost.paid_count || 0, 'Paid Objects') +
        stat(cost.free_count || 0, 'Free Objects') +
        stat(underval.length, 'Under-validated', underval.length ? 'var(--color-warning)' : 'var(--color-success)') +
      '</div>' +
      '<div class="analysis-grid">' +
        '<div class="analysis-card animate-in delay-1"><div class="card-header"><span class="eyebrow">Cost Exposure</span><h3>Recurring Spend</h3></div><div class="card-body">' + this._costBody(cost) + '</div></div>' +
        '<div class="analysis-card animate-in delay-2"><div class="card-header"><span class="eyebrow">Provenance & Trust</span><h3>By Evidence Level</h3></div><div class="analysis-chart" id="chartByEvidence"></div></div>' +
        '<div class="analysis-card span-2 animate-in delay-3"><div class="card-header"><span class="eyebrow">Provenance & Trust</span><h3>Under-validated Entries</h3></div><div class="card-body">' + this._undervalidatedList(underval) + '</div></div>' +
      '</div>';
    function stat(v, label, color, sub) {
      return '<div class="stat-card"><div class="stat-value"' + (color ? ' style="color:' + color + '"' : '') + '>' + v + '</div><div class="stat-label">' + label + '</div>' +
        (sub ? '<div class="text-faint text-xs" style="margin-top:var(--space-1);">' + Object.entries(sub).map(function (c) { return c[1] + ' ' + c[0]; }).join(' · ') + '</div>' : '') + '</div>';
    }
  },

  // ── card bodies (shared builders) ──────────────────────────
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
    return '<div class="meta-grid">' + mi('Max chain depth', dep.max_depth || 0) + mi('Single points of failure', (spofs || []).length) + '</div>' +
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
      mi('Orphaned entries', (orphans || []).length) +
      mi('Top vendor', PT.esc(health.top_vendor) || '—') +
      mi('Top vendor share', health.top_vendor_share ? Math.round(health.top_vendor_share * 100) + '%' : '—') +
      '</div>' +
      '<div class="sidebar-label" style="padding:0;margin:var(--space-3) 0 var(--space-2);">License concentration</div>' +
      '<div class="gap-list">' + Object.entries(lic).map(function (kv) { return '<div class="gap-item"><span class="gap-cap">' + PT.esc(kv[0]) + '</span><span class="gap-count">' + kv[1] + '</span></div>'; }).join('') + '</div>';
  },
  _undervalidatedList(underval) {
    if (!underval.length) return '<p class="text-muted text-sm">Every entry carries observational or established evidence.</p>';
    return '<div class="gap-list">' + underval.map(function (u) {
      return '<div class="gap-item" onclick="PT.openEntry(\'' + PT.esc(u.id) + '\')" style="cursor:pointer;">' +
        '<span class="gap-cap">' + PT.esc(u.name) + '</span>' +
        '<span class="gap-count">evidence: ' + PT.esc(u.evidence || '—') + ' · fit: ' + PT.esc(u.fit || '—') + '</span></div>';
    }).join('') + '</div>';
  },

  // ── client-side fallback projection ────────────────────────
  _local() {
    const entries = PT.Store.getAll();
    const counter = function (fn) { const m = {}; entries.forEach(function (e) { const k = fn(e) || '?'; m[k] = (m[k] || 0) + 1; }); return m; };
    return {
      total: entries.length,
      coverage: { by_kind: counter(function (e) { return e.object_kind; }), by_system: counter(function (e) { return e.strategic && e.strategic.system_served; }), by_hosting: counter(function (e) { return e.hosting_model; }), by_domain: counter(function (e) { return e.domain; }) },
      capability_gaps: [], redundancy: [], dependency: { max_depth: 0, single_points_of_failure: [] },
      cost: { total_recurring: 0, by_currency: {}, paid_count: 0, free_count: 0 },
      lifecycle: { distribution: counter(function (e) { return e.lifecycle_state; }), stale_active: [], deprecated_backlog: 0 },
      health: { orphans: [], top_vendor: null, top_vendor_share: 0, license_concentration: {} },
      trust: { by_evidence: counter(function (e) { return e.epistemic && e.epistemic.evidence_level; }), by_fit: {}, under_validated: [] },
    };
  },
};
function mi(k, v) { return '<div class="meta-item"><span class="meta-key">' + k + '</span><span class="meta-val">' + (v == null || v === '' ? '—' : v) + '</span></div>'; }
