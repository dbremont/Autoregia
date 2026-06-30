/* PWOS App - Main Application, Router, View Switching, Shared helpers */
window.PW = window.PW || {};

PW.KIND_COLORS = {
  Objective: '#7A1A2A', Initiative: '#B4742A', Project: '#3F6092',
  Task: '#2D6A4F', Routine: '#6B5B95', Commitment: '#A33434',
};
PW.KIND_ICONS = {
  Objective: 'target', Initiative: 'flag', Project: 'folder',
  Task: 'list-checks', Routine: 'repeat', Commitment: 'handshake',
};
PW.SCHED_COLORS = {
  unscheduled: '#9A9589', scheduled: '#3F6092', deferred: '#B4742A',
  'in-progress': '#2D6A4F', done: '#7A1A2A',
};
PW.ENUMS = {
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

PW.init = async function () {
  await PW.Store.load();
  this.currentView = 'actions';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.renderKindNav();
  this.refreshGoogleStatus();
  PW.Store.subscribe(() => { this.renderKindNav(); });
  this.navigate(this.getHashView() || 'dashboard');
};

PW.setupRouter = function () {
  window.addEventListener('hashchange', () => {
    const v = this.getHashView(); if (v) this.navigate(v);
  });
};
PW.getHashView = function () { return location.hash.slice(1); };

PW.navigate = function (view) {
  if (this.currentView === 'analytics' && view !== 'analytics' && PW.Analytics && PW.Analytics._teardown) {
    PW.Analytics._teardown();
  }
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector('.sidebar-nav a[data-view="' + view + '"]');
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  const views = { dashboard: 'Dashboard', actions: 'Actions', hierarchy: 'Hierarchy',
                  calendar: 'Calendar', google: 'Google', analytics: 'Analytics', export: 'Export' };
  if (view === 'dashboard') c.innerHTML = PW.DashboardView();
  else if (view === 'actions') c.innerHTML = PW.ActionsView();
  else if (view === 'hierarchy') { c.innerHTML = PW.HierarchyView(); PW.renderHierarchy(); }
  else if (view === 'calendar') { c.innerHTML = PW.CalendarView(); PW.Calendar.bind(); }
  else if (view === 'google') { c.innerHTML = PW.GoogleView(); PW.Google.bind(); }
  else if (view === 'analytics') { c.innerHTML = PW.AnalyticsView(); PW.Analytics.bind(); }
  else if (view === 'export') c.innerHTML = PW.ExportView();
  else c.innerHTML = '<div class="content-header"><h1>Not found</h1></div>';
  if (view === 'dashboard') PW.bindDashboard();
  if (view === 'actions') PW.bindActions();
};

PW.setupGlobalSearch = function () {
  const s = document.getElementById('globalSearch');
  if (s) s.addEventListener('input', function () {
    if (PW.currentView === 'actions') PW.renderActionList(PW.Store.searchActions(this.value));
  });
};

PW.setupKeyboard = function () {
  document.addEventListener('keydown', function (e) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); PW.CommandPalette.toggle(); }
    else if (meta && e.key.toLowerCase() === 'n') { e.preventDefault(); PW.Action.openEditor(); }
    else if (e.key === 'n' && !isInputFocused() && PW.currentView === 'actions') { PW.Action.openEditor(); }
    // F1 (?) — quick help
    else if (e.key === 'F1') { e.preventDefault(); PW.Help.toggle(); }
    else if (e.key === '?' && !isInputFocused()) { PW.Help.open(); }
    if (e.key === 'Escape') { PW.CommandPalette.close(); PW.Action.closeEditor(); PW.Action.closeDetail(); PW.Help.close(); }
  });
};
function isInputFocused() {
  const t = document.activeElement && document.activeElement.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
}

PW.setupHeaderButtons = function () {
  const na = document.getElementById('btnNewAction'); if (na) na.addEventListener('click', () => PW.Action.openEditor());
  const im = document.getElementById('btnImport'); if (im) im.addEventListener('click', () => document.getElementById('importFile').click());
  const fi = document.getElementById('importFile'); if (fi) fi.addEventListener('change', e => PW.importFile(e));
  const sv = document.getElementById('btnSaveAction'); if (sv) sv.addEventListener('click', () => PW.Action.saveEditor());
  const sy = document.getElementById('btnSync'); if (sy) sy.addEventListener('click', () => PW.doGoogleSync());
  const hp = document.getElementById('btnHelp'); if (hp) hp.addEventListener('click', () => PW.Help.toggle());
};

/* ── Help modal (F1 / ?) — quick in-app guidance ─────────────── */
PW.Help = PW.Help || {};
PW.Help.open = function () {
  const m = document.getElementById('helpModal');
  if (m) m.classList.remove('hidden');
};
PW.Help.close = function () {
  const m = document.getElementById('helpModal');
  if (m) m.classList.add('hidden');
};
PW.Help.toggle = function () {
  const m = document.getElementById('helpModal');
  if (!m) return;
  if (m.classList.contains('hidden')) PW.Help.open(); else PW.Help.close();
};

PW.renderKindNav = function () {
  const stats = PW.Store.getStats();
  const nav = document.getElementById('kindNav'); if (!nav || !stats.by_kind) return;
  nav.innerHTML = Object.entries(stats.by_kind).sort((a, b) => b[1] - a[1]).map(kc =>
    '<li><a href="#actions" data-view="actions" onclick="PW.filterKind(\'' + kc[0] + '\')">' +
    '<span class="nav-icon"><pw-icon name="' + (PW.KIND_ICONS[kc[0]] || 'circle') + '" size="15"></pw-icon></span>' +
    kc[0] + '<span class="sidebar-count">' + kc[1] + '</span></a></li>').join('');
};

PW.filterKind = function (k) {
  PW.navigate('actions');
  PW._kindFilter = k;
  setTimeout(() => PW.renderActionList(), 0);
};

PW.importFile = async function (e) {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const r = await res.json();
    PW.toast('Imported ' + (r.imported_actions || 0) + ' actions, ' + (r.imported_blocks || 0) + ' blocks');
    await PW.Store.refreshFromAPI();
  } catch (err) { PW.toast('Import failed: invalid JSON'); }
  e.target.value = '';
};

PW.refreshGoogleStatus = async function () {
  try {
    const res = await fetch('/api/calendar/google/status');
    const d = await res.json();
    const pill = document.getElementById('gcPill');
    if (pill) {
      pill.textContent = 'GC: ' + d.status;
      pill.style.color = d.status === 'connected' ? '#2D6A4F' : (d.status === 'mock' ? '#9A9589' : '#B4742A');
    }
  } catch (e) { /* ignore */ }
};

PW.doGoogleSync = async function () {
  PW.toast('Syncing Google Calendar…');
  try {
    const res = await fetch('/api/calendar/google/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const d = await res.json();
    if (d.status === 'mock') PW.toast('Mock mode — local data only. Add client_secret.json to enable live sync.');
    else PW.toast('Synced: pulled ' + d.pulled + ', pushed ' + d.pushed);
    await PW.Store.refreshFromAPI();
  } catch (e) { PW.toast('Sync failed'); }
  PW.refreshGoogleStatus();
};

PW.ExportView = function () {
  const s = PW.Store.getStats();
  return '<div class="content-header"><div><span class="eyebrow">Derivative</span><h1>Export</h1></div>' +
    '<div class="actions"><a class="btn btn-primary btn-sm" href="/api/export"><pw-icon name="download" size="15"></pw-icon> Download JSON</a></div></div>' +
    '<div class="card"><div class="card-body"><p>Export all actions and calendar blocks as JSON conforming to <code>spec/pwos/schema.json</code>. Use Import to merge back in by id.</p>' +
    '<p class="text-muted text-sm">Actions: ' + (s.total_actions || 0) + ' · Blocks: ' + (s.total_blocks || 0) + '.</p></div></div>';
};

PW.esc = function (s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };
PW.kindColor = function (k) { return PW.KIND_COLORS[k] || '#9A9589'; };
PW.prettyEnum = function (s) {
  if (s == null) return '—'; return String(s).replace(/[-_]/g, ' ').replace(/(?:^|\s)\S/g, c => c.toUpperCase());
};
PW.toast = function (msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(PW._toastTimer); PW._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
};
PW.badge = function (cls, text) { return '<span class="badge ' + cls + '">' + PW.esc(text) + '</span>'; };
PW.fmtDate = function (iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
