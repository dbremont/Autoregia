/* AOOS Work Sessions - Component D (Execution & Actuals)
 *
 * A session is just a session — a span of focused work described in free text,
 * with an optional link to an action. This module provides:
 *   • a compact timer pill in the header (Track button / running pill)
 *   • a click-to-open start popover (description + optional action)
 *   • an editorial Sessions view: a 7-day overview + a timesheet grouped by day
 *
 * Design: Autoregia UI spec — Oxford/parchment, Spectral/Inter/IBM Plex Mono. */
window.AO = window.AO || {};
AO.Session = AO.Session || {};
AO._timerTick = null;

/* ── Helpers ─────────────────────────────────────────────── */
AO.Session._fmt = function (ms) {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return pad(h) + ':' + pad(m) + ':' + pad(sec);
};
AO.Session._fmtShort = function (ms) {
  if (!ms || ms < 0) ms = 0;
  const m = Math.round(ms / 60000);
  if (m < 1) return '0m';
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
};
AO.Session._duration = function (s) {
  if (!s.started_at) return 0;
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return end - new Date(s.started_at).getTime();
};
AO.Session._title = function (s) {
  const d = ((s && s.description) || '').trim();
  return d ? AO.esc(d) : '<span class="text-muted">untitled session</span>';
};
AO.Session._actionChip = function (id) {
  if (!id) return '';
  const a = AO.Store.getById(id);
  const label = a ? AO.esc(a.record_id) : AO.esc(id);
  return '<span class="sess-action-chip" title="linked action"><ao-icon name="link" size="11"></ao-icon> ' + label + '</span>';
};
AO.Session._todayMinutes = function () {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(AO.Store.getSessions()
    .filter(function (s) { return (s.started_at || '').slice(0, 10) === today && s.status !== 'abandoned'; })
    .reduce(function (acc, s) { return acc + AO.Session._duration(s); }, 0) / 60000);
};
AO.Session._sevenDay = function () {
  const labels = [], minutes = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const lbl = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    const min = Math.round(AO.Store.getSessions()
      .filter(function (s) { return (s.started_at || '').slice(0, 10) === iso && s.status !== 'abandoned'; })
      .reduce(function (acc, s) { return acc + AO.Session._duration(s); }, 0) / 60000);
    labels.push(lbl); minutes.push(min);
  }
  return { labels: labels, minutes: minutes };
};
AO.Session._dayLabel = function (iso) {
  if (!iso) return 'Undated';
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
AO.Session._dow = function (iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase();
};

/* ── Timer pill (header) ─────────────────────────────────── */
AO.Session.renderTimer = function () {
  const el = document.getElementById('timer');
  if (!el) return;
  const active = AO.Store.getActiveSession();
  if (active) {
    const label = (active.description || '').trim();
    el.innerHTML = '<div class="timer-pill is-running" onclick="AO.Session.openStart()" title="Edit / stop">' +
      '<span class="timer-dot" aria-hidden="true"></span>' +
      '<span class="timer-time" id="timerTime">' + AO.Session._fmt(AO.Session._duration(active)) + '</span>' +
      (label ? '<span class="timer-label">' + AO.esc(label) + '</span>' : '') +
      '<button class="timer-stop" onclick="event.stopPropagation();AO.Session.stop()" title="Stop (Space)"><ao-icon name="square" size="11"></ao-icon></button>' +
      '</div>';
    AO.Session._startTick();
  } else {
    AO.Session._stopTick();
    el.innerHTML = '<button class="timer-pill" onclick="AO.Session.openStart()" title="Start a session (Space)">' +
      '<ao-icon name="play" size="13"></ao-icon> Track</button>';
  }
};
AO.Session._startTick = function () {
  AO.Session._stopTick();
  AO._timerTick = setInterval(function () {
    const active = AO.Store.getActiveSession();
    const el = document.getElementById('timerTime');
    if (!active || !el) { AO.Session._stopTick(); return; }
    el.textContent = AO.Session._fmt(AO.Session._duration(active));
  }, 1000);
};
AO.Session._stopTick = function () {
  if (AO._timerTick) { clearInterval(AO._timerTick); AO._timerTick = null; }
};

/* ── Start popover ───────────────────────────────────────── */
AO.Session.openStart = function () {
  const root = document.getElementById('popoverRoot');
  const pop = document.getElementById('startPopover');
  if (!root || !pop) return;
  // If a session is running, the popover becomes a quick edit/stop panel.
  const active = AO.Store.getActiveSession();
  const actionOpts = '<option value="">No linked action</option>' + AO.Store.getActions().map(function (a) {
    return '<option value="' + a.id + '"' + (active && active.action_id === a.id ? ' selected' : '') + '>' + AO.esc(a.record_id) + ' · ' + a.kind + '</option>';
  }).join('');
  if (active) {
    pop.innerHTML =
      '<div class="sp-label">Running session</div>' +
      '<input class="sp-desc" id="spDesc" value="' + AO.esc(active.description || '') + '" placeholder="What are you working on?" autocomplete="off">' +
      '<select class="sp-action" id="spAction">' + actionOpts + '</select>' +
      '<div class="sp-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="AO.Session.saveRunning()">Save</button>' +
        '<button class="btn btn-primary btn-sm" onclick="AO.Session.stop()"><ao-icon name="square" size="13"></ao-icon> Stop</button>' +
      '</div>' +
      '<div class="sp-hint">Esc to close</div>';
  } else {
    pop.innerHTML =
      '<div class="sp-label">Start a session</div>' +
      '<input class="sp-desc" id="spDesc" placeholder="What are you working on?" autocomplete="off">' +
      '<select class="sp-action" id="spAction">' + actionOpts + '</select>' +
      '<div class="sp-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="AO.Session.closeStart()">Cancel</button>' +
        '<button class="btn btn-primary btn-sm" onclick="AO.Session.startFromPopover()"><ao-icon name="play" size="13"></ao-icon> Start</button>' +
      '</div>' +
      '<div class="sp-hint">Enter to start · Esc to close</div>';
  }
  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');
  const inp = document.getElementById('spDesc');
  if (inp) {
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); active ? AO.Session.saveRunning() : AO.Session.startFromPopover(); }
    });
    setTimeout(function () { inp.focus(); if (!active) inp.select(); }, 30);
  }
};
AO.Session.closeStart = function () {
  const root = document.getElementById('popoverRoot');
  if (root) { root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); }
};
AO.Session.startFromPopover = async function () {
  const desc = (document.getElementById('spDesc') || {}).value || '';
  const actionId = (document.getElementById('spAction') || {}).value || '';
  await AO.Session.start(desc, actionId || null);
};
AO.Session.saveRunning = async function () {
  const active = AO.Store.getActiveSession();
  if (!active) { AO.Session.closeStart(); return; }
  const desc = (document.getElementById('spDesc') || {}).value || '';
  const actionId = (document.getElementById('spAction') || {}).value || null;
  await AO.Store.updateSession(active.id, { description: desc, action_id: actionId });
  AO.Session.closeStart();
  AO.Session.renderTimer();
  AO.toast('Session updated');
};

/* ── Start / stop ────────────────────────────────────────── */
AO.Session.start = async function (description, actionId, blockId) {
  const active = AO.Store.getActiveSession();
  if (active && !confirm('Stop the running session and start a new one?')) return;
  await AO.Store.startSession({ description: description || '', action_id: actionId || null, block_id: blockId || null });
  AO.Session.closeStart();
  AO.Session.renderTimer();
  AO.toast('Timer started');
};
AO.Session.stop = async function () {
  const active = AO.Store.getActiveSession();
  if (!active) return;
  await AO.Store.stopSession(active.description || '');
  AO.Session.closeStart();
  AO.Session.renderTimer();
  if (AO.currentView === 'sessions') AO.renderSessions();
  AO.toast('Session stopped · ' + AO.Session._fmtShort(AO.Session._duration({ started_at: active.started_at, ended_at: new Date().toISOString() })));
};

/* ── Sessions view (editorial timesheet) ─────────────────── */
AO.SessionsView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Execution · time tracking</span><h1>Sessions</h1>' +
    '<p class="content-sub">A log of focused work — what you did, and for how long.</p></div>' +
    '<div class="actions"><button class="btn btn-ghost btn-sm" onclick="AO.Session.openEditor()"><ao-icon name="plus" size="14"></ao-icon> Add manually</button></div></div>' +
    '<div id="sessionOverview"></div>' +
    '<div class="filter-bar" id="sessionFilters"></div>' +
    '<div id="sessionList"></div>';
};
AO.bindSessions = function () { AO.renderSessions(); };

AO.renderSessions = async function () {
  await AO.Store.refreshFromAPI();
  AO.Session._renderOverview();
  AO.Session._renderFilters();
  AO.renderSessionList();
};

AO.Session._renderOverview = function () {
  const el = document.getElementById('sessionOverview');
  if (!el) return;
  const today = AO.Session._todayMinutes();
  const seven = AO.Session._sevenDay();
  const weekMin = seven.minutes.reduce(function (a, b) { return a + b; }, 0);
  const count = AO.Store.getSessions().filter(function (s) { return s.status === 'completed'; }).length;
  el.innerHTML = '<div class="sessions-overview">' +
    '<div class="so-card so-today"><div class="so-label">Tracked today</div>' +
      '<div class="so-value">' + AO.Session._fmtShort(today * 60000) + '</div>' +
      '<div class="so-sub">' + count + ' completed session' + (count === 1 ? '' : 's') + '</div></div>' +
    '<div class="so-card so-chart-card"><div class="so-chart-head"><div class="so-label">Last 7 days</div>' +
      '<div class="so-chart-meta">' + AO.Session._fmtShort(weekMin * 60000) + ' total</div></div>' +
      '<div id="soChart"></div></div>' +
    '</div>';
  AO.Session._renderChart(seven);
};
AO.Session._renderChart = function (seven) {
  const el = document.getElementById('soChart');
  if (!el || !window.echarts) return;
  const ch = echarts.init(el);
  ch.setOption({
    grid: { left: 10, right: 10, top: 14, bottom: 20 },
    xAxis: { type: 'category', data: seven.labels, axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#8C877B', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' } },
    yAxis: { type: 'value', show: false },
    series: [{ type: 'bar', data: seven.minutes, barWidth: '46%',
      itemStyle: { color: '#A8854A', borderRadius: [3, 3, 0, 0] },
      emphasis: { itemStyle: { color: '#7A1A2A' } } }],
    tooltip: { trigger: 'axis', formatter: function (p) { return p[0].name + ' · ' + AO.Session._fmtShort(p[0].value * 60000); },
      backgroundColor: '#1E1C19', borderColor: '#1E1C19', textStyle: { color: '#FAF1E6' } }
  });
};

AO.Session._renderFilters = function () {
  const fb = document.getElementById('sessionFilters');
  if (!fb) return;
  fb.innerHTML = '<select class="select" id="sfAction"><option value="">All actions</option>' +
    AO.Store.getActions().map(function (a) { return '<option value="' + a.id + '"' + (AO._sfAction === a.id ? ' selected' : '') + '>' + AO.esc(a.record_id) + '</option>'; }).join('') +
    '</select> <select class="select" id="sfStatus"><option value="">All statuses</option>' +
    '<option value="completed"' + (AO._sfStatus === 'completed' ? ' selected' : '') + '>Completed</option>' +
    '<option value="active"' + (AO._sfStatus === 'active' ? ' selected' : '') + '>Active</option>' +
    '<option value="abandoned"' + (AO._sfStatus === 'abandoned' ? ' selected' : '') + '>Abandoned</option></select>';
  document.getElementById('sfAction').addEventListener('change', function () { AO._sfAction = this.value; AO.renderSessionList(); });
  document.getElementById('sfStatus').addEventListener('change', function () { AO._sfStatus = this.value; AO.renderSessionList(); });
};

AO.renderSessionList = function () {
  const el = document.getElementById('sessionList');
  if (!el) return;
  let sessions = AO.Store.getSessions();
  if (AO._sfAction) sessions = sessions.filter(function (s) { return s.action_id === AO._sfAction; });
  if (AO._sfStatus) sessions = sessions.filter(function (s) { return s.status === AO._sfStatus; });
  if (!sessions.length) {
    el.innerHTML = '<div class="empty-state" style="padding:48px 16px"><div class="empty-icon" style="font-size:36px;opacity:.3;margin-bottom:8px"><ao-icon name="timer" size="36"></ao-icon></div>' +
      '<h3 style="color:var(--color-text-muted);font-family:var(--font-display);font-weight:500;margin:0 0 4px">No sessions yet</h3>' +
      '<p style="font-size:var(--text-sm);color:var(--color-text-muted);max-width:320px;margin:0 auto">Start one from the <strong>Track</strong> button in the header, or add one manually.</p></div>';
    return;
  }
  const byDay = {};
  sessions.forEach(function (s) { const k = (s.started_at || '').slice(0, 10) || '—'; (byDay[k] = byDay[k] || []).push(s); });
  el.innerHTML = Object.keys(byDay).sort().reverse().map(function (day) {
    const items = byDay[day].sort(function (a, b) { return (b.started_at || '').localeCompare(a.started_at || ''); });
    const dayMs = items.reduce(function (acc, s) { return acc + (s.status === 'abandoned' ? 0 : AO.Session._duration(s)); }, 0);
    return '<div class="sess-day"><div class="sess-day-head">' +
      '<span class="sess-day-dow">' + AO.Session._dow(day) + '</span>' +
      '<span class="sess-day-date">' + AO.Session._dayLabel(day) + '</span>' +
      '<span class="sess-day-rule"></span>' +
      '<span class="sess-day-total">' + (dayMs ? AO.Session._fmtShort(dayMs) : '—') + '</span>' +
      '</div>' + items.map(AO.Session._row).join('') + '</div>';
  }).join('');
};

AO.Session._row = function (s) {
  const start = s.started_at ? new Date(s.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
  const end = s.ended_at ? new Date(s.ended_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'now';
  const dur = s.status === 'abandoned' ? '—' : AO.Session._fmtShort(AO.Session._duration(s));
  const srcIcon = s.source === 'timer' ? 'timer' : 'pencil-line';
  const badge = s.status === 'active' ? '<span class="sess-badge active">active</span>'
    : (s.status === 'abandoned' ? '<span class="sess-badge abandoned">abandoned</span>' : '');
  return '<div class="sess-row' + (s.status === 'active' ? ' is-active' : '') + '">' +
    '<div class="sess-time">' + start + '–' + end + '</div>' +
    '<div class="sess-dur">' + dur + '</div>' +
    '<div class="sess-main"><div class="sess-title">' + AO.Session._title(s) + '</div>' +
      '<div class="sess-sub">' + AO.Session._actionChip(s.action_id) +
        '<span class="sess-src"><ao-icon name="' + srcIcon + '" size="11"></ao-icon>' + s.source + '</span></div></div>' +
    '<div class="sess-act">' + badge +
      '<button class="btn-icon-inline" title="Edit" onclick="AO.Session.openEditor(\'' + s.id + '\')"><ao-icon name="pencil-line" size="14"></ao-icon></button>' +
      '<button class="btn-icon-inline" title="Delete" onclick="AO.Session.confirmDelete(\'' + s.id + '\')"><ao-icon name="trash-2" size="14"></ao-icon></button></div>' +
  '</div>';
};

/* ── Editor (manual entry / edit) ────────────────────────── */
AO.Session.openEditor = function (existing) {
  const modal = document.getElementById('sessionModal');
  const title = document.getElementById('sessionModalTitle');
  const body = document.getElementById('sessionModalBody');
  AO._editingSession = existing || null;
  const s = existing || {};
  title.textContent = existing ? 'Edit Session' : 'New Session';
  const opts = function (arr, sel) { return arr.map(function (v) { return '<option value="' + v + '"' + (sel === v ? ' selected' : '') + '>' + AO.prettyEnum(v) + '</option>'; }).join(''); };
  const actionOpts = '<option value="">No linked action</option>' + AO.Store.getActions().map(function (a) {
    return '<option value="' + a.id + '"' + (s.action_id === a.id ? ' selected' : '') + '>' + AO.esc(a.record_id) + ' · ' + a.kind + '</option>';
  }).join('');
  body.innerHTML =
    '<div class="form-grid">' +
    '<label class="form-field form-field-wide"><span>Description</span><input class="input" id="sf_desc" value="' + AO.esc(s.description || '') + '" placeholder="What did you work on?"></label>' +
    '<label class="form-field"><span>Started at</span><input class="input" id="sf_start" type="datetime-local" value="' + AO.Session._toLocal(s.started_at) + '"></label>' +
    '<label class="form-field"><span>Ended at</span><input class="input" id="sf_end" type="datetime-local" value="' + AO.Session._toLocal(s.ended_at) + '"></label>' +
    '<label class="form-field"><span>Action (optional)</span><select class="select" id="sf_action">' + actionOpts + '</select></label>' +
    '<label class="form-field"><span>Status</span><select class="select" id="sf_status">' + opts(['completed', 'active', 'abandoned'], s.status || 'completed') + '</select></label>' +
    '<label class="form-field"><span>Source</span><select class="select" id="sf_source">' + opts(['manual', 'timer'], s.source || 'manual') + '</select></label>' +
    '</div>';
  modal.classList.remove('hidden');
};
AO.Session.closeEditor = function () { document.getElementById('sessionModal').classList.add('hidden'); AO._editingSession = null; };
AO.Session._toLocal = function (iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
};
AO.Session._fromLocal = function (v) { return v ? new Date(v).toISOString() : null; };

AO.Session.saveEditor = async function () {
  const val = function (id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const data = {
    description: val('sf_desc'),
    started_at: AO.Session._fromLocal(val('sf_start')),
    ended_at: AO.Session._fromLocal(val('sf_end')),
    action_id: val('sf_action') || null,
    status: val('sf_status'),
    source: val('sf_source'),
  };
  if (AO._editingSession) { await AO.Store.updateSession(AO._editingSession.id, data); AO.toast('Session updated'); }
  else { await AO.Store.addSession(data); AO.toast('Session added'); }
  AO.Session.closeEditor();
  AO.renderSessions();
};
AO.Session.confirmDelete = async function (id) {
  if (confirm('Delete this session?')) { await AO.Store.removeSession(id); AO.renderSessions(); AO.toast('Session deleted'); }
};
