/* AOOS Dashboard - at-a-glance statistics */
window.AO = window.AO || {};

AO.DashboardView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component A/B/C · Overview</span><h1>Dashboard</h1></div></div>' +
    '<div id="dashGrid"></div>';
};

AO.bindDashboard = function () { AO.renderDashboard(); };

AO.renderDashboard = async function () {
  const grid = document.getElementById('dashGrid'); if (!grid) return;
  await AO.Store.refreshStats();
  const s = AO.Store.getStats() || {};
  const hrs = Math.round((s.scheduled_minutes || 0) / 60 * 10) / 10;
  // ── goal analytics (Component G) ──
  let G = null;
  try { G = await fetch('/aoos/api/analytics/goals').then(r => r.json()); } catch (e) {}
  const goalCards = G && G.count
    ? AO._statCard('Tracked Goals', G.count, 'target', '#7A1A2A') +
      AO._statCard('Mean Progress', (G.avg_progress || 0) + '%', 'trending-up', '#3F6092') +
      AO._statCard('At Risk', (G.at_risk || []).length, 'alert-triangle', (G.at_risk || []).length ? '#A33434' : '#8C877B') +
      AO._statCard('Advancing', G.advancing || 0, 'arrow-up', '#3F6E50')
    : '';
  const goalList = (G && G.count) ? '<div class="card stat-card stat-card-wide"><div class="card-body">' +
    '<div class="stat-label">Goal Tracking — target vs progress <a href="#goals" class="text-sm" style="float:right">open Goals →</a></div>' +
    (G.goals || []).slice().sort((a, b) => a.progress_pct - b.progress_pct).slice(0, 6).map(g => {
      const c = AO._GOAL_STATUS_COLOR[g.status] || '#8C877B';
      return '<div class="goal-mini-row"><span class="gm-label" title="' + AO.esc(g.title) + '">' + AO.esc(g.title) + '</span>' +
        '<span class="gm-track"><span class="gm-fill" style="width:' + g.progress_pct + '%;background:' + c + '"></span></span>' +
        '<span class="gm-val">' + g.progress_pct + '%</span></div>';
    }).join('') + '</div></div>' : '';
  grid.innerHTML =
    goalCards +
    AO._statCard('Total Actions', s.total_actions || 0, 'list-checks', '#3F6092') +
    AO._statCard('Scheduled Blocks', s.confirmed_blocks || 0, 'calendar', '#2D6A4F') +
    AO._statCard('Scheduled Hours', hrs, 'clock', '#B4742A') +
    AO._statCard('Blocked Actions', s.blocked_actions || 0, 'alert-triangle', '#A33434') +
    AO._statCard('Pinned', s.pinned || 0, 'bookmark', '#6B5B95') +
    AO._statCard('Scratchpad', (s.scratch_words || 0) + 'w', 'file-text', '#A8854A') +
    AO._statCard('Conflicts', s.conflicts || 0, 'alert-triangle', '#A33434') +
    goalList +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">By Kind</div>' +
    AO._barList(s.by_kind) + '</div></div>' +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">By Scheduling State</div>' +
    AO._barList(s.by_scheduling_state) + '</div></div>' +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">Google Calendar</div>' +
    '<p>Status: <strong>' + AO.prettyEnum(s.google_status) + '</strong></p>' +
    (s.google_status === 'mock' ? '<p class="text-muted text-sm">Mock mode — no credentials configured. See Google Calendar view to connect.</p>' : '') +
    '</div></div>';
};

AO._statCard = function (label, val, icon, color) {
  return '<div class="card stat-card"><div class="card-body">' +
    '<ao-icon name="' + icon + '" size="20" style="color:' + color + '"></ao-icon>' +
    '<div class="stat-value">' + val + '</div>' +
    '<div class="stat-label">' + label + '</div></div></div>';
};

AO._barList = function (obj) {
  if (!obj) return '<p class="text-muted">—</p>';
  const entries = Object.entries(obj);
  const max = Math.max.apply(null, entries.map(e => e[1]).concat([1]));
  return entries.map(e =>
    '<div class="bar-row"><span class="bar-label">' + AO.prettyEnum(e[0]) + '</span>' +
    '<div class="bar-track"><div class="bar-fill" style="width:' + (e[1] / max * 100) + '%"></div></div>' +
    '<span class="bar-val">' + e[1] + '</span></div>').join('');
};
