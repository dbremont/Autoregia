/* PWOS Dashboard - at-a-glance statistics */
window.PW = window.PW || {};

PW.DashboardView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component A/B/C · Overview</span><h1>Dashboard</h1></div></div>' +
    '<div id="dashGrid"></div>';
};

PW.bindDashboard = function () { PW.renderDashboard(); };

PW.renderDashboard = async function () {
  const grid = document.getElementById('dashGrid'); if (!grid) return;
  await PW.Store.refreshStats();
  const s = PW.Store.getStats() || {};
  const hrs = Math.round((s.scheduled_minutes || 0) / 60 * 10) / 10;
  grid.innerHTML =
    PW._statCard('Total Actions', s.total_actions || 0, 'list-checks', '#3F6092') +
    PW._statCard('Scheduled Blocks', s.confirmed_blocks || 0, 'calendar', '#2D6A4F') +
    PW._statCard('Scheduled Hours', hrs, 'clock', '#B4742A') +
    PW._statCard('Blocked Actions', s.blocked_actions || 0, 'alert-triangle', '#A33434') +
    PW._statCard('Pinned', s.pinned || 0, 'bookmark', '#6B5B95') +
    PW._statCard('Scratchpad', (s.scratch_words || 0) + 'w', 'file-text', '#A8854A') +
    PW._statCard('Conflicts', s.conflicts || 0, 'alert-triangle', '#A33434') +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">By Kind</div>' +
    PW._barList(s.by_kind) + '</div></div>' +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">By Scheduling State</div>' +
    PW._barList(s.by_scheduling_state) + '</div></div>' +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">Google Calendar</div>' +
    '<p>Status: <strong>' + PW.prettyEnum(s.google_status) + '</strong></p>' +
    (s.google_status === 'mock' ? '<p class="text-muted text-sm">Mock mode — no credentials configured. See Google Calendar view to connect.</p>' : '') +
    '</div></div>';
};

PW._statCard = function (label, val, icon, color) {
  return '<div class="card stat-card"><div class="card-body">' +
    '<pw-icon name="' + icon + '" size="20" style="color:' + color + '"></pw-icon>' +
    '<div class="stat-value">' + val + '</div>' +
    '<div class="stat-label">' + label + '</div></div></div>';
};

PW._barList = function (obj) {
  if (!obj) return '<p class="text-muted">—</p>';
  const entries = Object.entries(obj);
  const max = Math.max.apply(null, entries.map(e => e[1]).concat([1]));
  return entries.map(e =>
    '<div class="bar-row"><span class="bar-label">' + PW.prettyEnum(e[0]) + '</span>' +
    '<div class="bar-track"><div class="bar-fill" style="width:' + (e[1] / max * 100) + '%"></div></div>' +
    '<span class="bar-val">' + e[1] + '</span></div>').join('');
};
