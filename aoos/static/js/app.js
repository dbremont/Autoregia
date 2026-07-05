/* AOOS App - Main Application, Router, View Switching, Shared helpers */
window.AO = window.AO || {};

AO.KIND_COLORS = {
  Objective: '#7A1A2A', Initiative: '#B4742A', Project: '#3F6092',
  Task: '#2D6A4F', Routine: '#6B5B95', Commitment: '#A33434',
};
AO.KIND_ICONS = {
  Objective: 'target', Initiative: 'flag', Project: 'folder',
  Task: 'list-checks', Routine: 'repeat', Commitment: 'handshake',
};
AO.SCHED_COLORS = {
  unscheduled: '#9A9589', scheduled: '#3F6092', deferred: '#B4742A',
  'in-progress': '#2D6A4F', done: '#7A1A2A',
};
AO.ENUMS = {
  kind: ['Objective', 'Initiative', 'Project', 'Task', 'Routine', 'Commitment'],
  scheduling_state: ['unscheduled', 'scheduled', 'deferred', 'in-progress', 'done'],
  effort_unit: ['hours', 'points', 'sessions'],
  confidence: ['Low', 'Medium', 'High'],
  capacity_resource: ['time', 'focus', 'energy', 'attention'],
  capacity_band: ['deep', 'shallow', 'low'],
  dep_kind: ['part-of', 'contains', 'implements-objective', 'depends-on', 'blocked-by',
             'required-by', 'enables', 'uses-capability', 'fulfills-commitment',
             'governed-by', 'scheduled-in', 'recurs-from', 'spawned-from', 'mirrors-external'],
};

AO.init = async function () {
  await AO.Store.load();
  this.currentView = 'actions';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.renderKindNav();
  this.refreshGoogleStatus();
  AO.Session.renderTimer();
  AO.Store.subscribe(() => { this.renderKindNav(); AO.Session.renderTimer(); });
  this.navigate(this.getHashView() || 'dashboard');
};

AO.setupRouter = function () {
  window.addEventListener('hashchange', () => {
    const v = this.getHashView(); if (v) this.navigate(v);
  });
};
AO.getHashView = function () { return location.hash.slice(1); };

AO.navigate = function (view) {
  if (this.currentView === 'analytics' && view !== 'analytics' && AO.Analytics && AO.Analytics._teardown) {
    AO.Analytics._teardown();
  }
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector('.sidebar-nav a[data-view="' + view + '"]');
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  const views = { dashboard: 'Dashboard', actions: 'Actions', hierarchy: 'Hierarchy',
                  goals: 'Goals', calendar: 'Calendar', sessions: 'Sessions', scratch: 'Scratchpad',
                  google: 'Google', analytics: 'Analytics', export: 'Export' };
  if (view === 'dashboard') c.innerHTML = AO.DashboardView();
  else if (view === 'actions') c.innerHTML = AO.ActionsView();
  else if (view === 'hierarchy') { c.innerHTML = AO.HierarchyView(); AO.renderHierarchy(); }
  else if (view === 'goals') { c.innerHTML = AO.GoalsView(); AO.bindGoals(); }
  else if (view === 'calendar') { c.innerHTML = AO.CalendarView(); AO.Calendar.bind(); }
  else if (view === 'sessions') { c.innerHTML = AO.SessionsView(); AO.bindSessions(); }
  else if (view === 'scratch') { c.innerHTML = AO.ScratchView(); AO.bindScratch(); }
  else if (view === 'google') { c.innerHTML = AO.GoogleView(); AO.Google.bind(); }
  else if (view === 'analytics') { c.innerHTML = AO.AnalyticsView(); AO.Analytics.bind(); }
  else if (view === 'export') c.innerHTML = AO.ExportView();
  else c.innerHTML = '<div class="content-header"><h1>Not found</h1></div>';
  if (view === 'dashboard') AO.bindDashboard();
  if (view === 'actions') AO.bindActions();
};

AO.setupGlobalSearch = function () {
  const s = document.getElementById('globalSearch');
  if (s) s.addEventListener('input', function () {
    if (AO.currentView === 'actions') AO.renderActionList(AO.Store.searchActions(this.value));
  });
};

AO.setupKeyboard = function () {
  document.addEventListener('keydown', function (e) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); AO.CommandPalette.toggle(); }
    else if (meta && e.key.toLowerCase() === 'n') { e.preventDefault(); AO.Action.openEditor(); }
    else if (e.key === 'n' && !isInputFocused() && AO.currentView === 'actions') { AO.Action.openEditor(); }
    // Space — toggle the timer (open start popover / stop running)
    else if (e.key === ' ' && !isInputFocused()) {
      e.preventDefault();
      const active = AO.Store.getActiveSession();
      if (active) AO.Session.stop();
      else AO.Session.openStart();
    }
    // F1 (?) — quick help
    else if (e.key === 'F1') { e.preventDefault(); AO.Help.toggle(); }
    else if (e.key === '?' && !isInputFocused()) { AO.Help.open(); }
    if (e.key === 'Escape') { AO.CommandPalette.close(); AO.Action.closeEditor(); AO.Action.closeDetail(); AO.Help.close(); AO.Session.closeStart(); }
  });
};
function isInputFocused() {
  const t = document.activeElement && document.activeElement.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}

AO.setupHeaderButtons = function () {
  const na = document.getElementById('btnNewAction'); if (na) na.addEventListener('click', () => AO.Action.openEditor());
  const im = document.getElementById('btnImport'); if (im) im.addEventListener('click', () => document.getElementById('importFile').click());
  const fi = document.getElementById('importFile'); if (fi) fi.addEventListener('change', e => AO.importFile(e));
  const sv = document.getElementById('btnSaveAction'); if (sv) sv.addEventListener('click', () => AO.Action.saveEditor());
  const sy = document.getElementById('btnSync'); if (sy) sy.addEventListener('click', () => AO.doGoogleSync());
  const hp = document.getElementById('btnHelp'); if (hp) hp.addEventListener('click', () => AO.Help.toggle());
};

/* ── Help modal (F1 / ?) — quick in-app guidance ─────────────── */
AO.Help = AO.Help || {};
AO.Help.open = function () {
  const m = document.getElementById('helpModal');
  if (m) m.classList.remove('hidden');
};
AO.Help.close = function () {
  const m = document.getElementById('helpModal');
  if (m) m.classList.add('hidden');
};
AO.Help.toggle = function () {
  const m = document.getElementById('helpModal');
  if (!m) return;
  if (m.classList.contains('hidden')) AO.Help.open(); else AO.Help.close();
};

AO.renderKindNav = function () {
  const stats = AO.Store.getStats();
  const nav = document.getElementById('kindNav'); if (!nav || !stats.by_kind) return;
  nav.innerHTML = Object.entries(stats.by_kind).sort((a, b) => b[1] - a[1]).map(kc =>
    '<li><a href="#actions" data-view="actions" onclick="AO.filterKind(\'' + kc[0] + '\')">' +
    '<span class="nav-icon"><ao-icon name="' + (AO.KIND_ICONS[kc[0]] || 'circle') + '" size="15"></ao-icon></span>' +
    kc[0] + '<span class="sidebar-count">' + kc[1] + '</span></a></li>').join('');
};

AO.filterKind = function (k) {
  AO.navigate('actions');
  AO._kindFilter = k;
  setTimeout(() => AO.renderActionList(), 0);
};

AO.importFile = async function (e) {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const res = await fetch('/aoos/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const r = await res.json();
    AO.toast('Imported ' + (r.imported_actions || 0) + ' actions, ' + (r.imported_blocks || 0) + ' blocks');
    await AO.Store.refreshFromAPI();
  } catch (err) { AO.toast('Import failed: invalid JSON'); }
  e.target.value = '';
};

AO.refreshGoogleStatus = async function () {
  try {
    const res = await fetch('/aoos/api/calendar/google/status');
    const d = await res.json();
    const pill = document.getElementById('gcPill');
    if (pill) {
      pill.textContent = 'GC: ' + d.status;
      pill.style.color = d.status === 'connected' ? '#2D6A4F' : (d.status === 'mock' ? '#9A9589' : '#B4742A');
    }
  } catch (e) { /* ignore */ }
};

AO.doGoogleSync = async function () {
  AO.toast('Syncing Google Calendar…');
  try {
    const res = await fetch('/aoos/api/calendar/google/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const d = await res.json();
    if (d.status === 'mock') AO.toast('Mock mode — local data only. Add client_secret.json to enable live sync.');
    else AO.toast('Synced: pulled ' + d.pulled + ', pushed ' + d.pushed);
    await AO.Store.refreshFromAPI();
  } catch (e) { AO.toast('Sync failed'); }
  AO.refreshGoogleStatus();
};

AO.ExportView = function () {
  const s = AO.Store.getStats();
  return '<div class="content-header"><div><span class="eyebrow">Derivative</span><h1>Export</h1></div>' +
    '<div class="actions"><a class="btn btn-primary btn-sm" href="/aoos/api/export"><ao-icon name="download" size="15"></ao-icon> Download JSON</a></div></div>' +
    '<div class="card"><div class="card-body"><p>Export all actions and calendar blocks as JSON conforming to <code>spec/aoos/schema.json</code>. Use Import to merge back in by id.</p>' +
    '<p class="text-muted text-sm">Actions: ' + (s.total_actions || 0) + ' · Blocks: ' + (s.total_blocks || 0) + '.</p></div></div>';
};

AO.esc = function (s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
AO.kindColor = function (k) { return AO.KIND_COLORS[k] || '#9A9589'; };
AO.prettyEnum = function (s) {
  if (s == null) return '—'; return String(s).replace(/[-_]/g, ' ').replace(/(?:^|\s)\S/g, c => c.toUpperCase());
};
AO.toast = function (msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(AO._toastTimer); AO._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
};
AO.badge = function (cls, text) { return '<span class="badge ' + cls + '">' + AO.esc(text) + '</span>'; };
AO.fmtDate = function (iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
