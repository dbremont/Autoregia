/* GIS App — Main Application, Router, View Switching, Shared helpers */
const PT = window.PT || {};

PT.KIND_COLORS = {
  software_tool: '#7A1A2A', library_framework: '#B4742A', service_platform: '#3F6092',
  data_source: '#2D6A4F', infrastructure: '#6B5B95', hardware_device: '#A8854A',
  physical_instrument: '#8C6E54', reference_artifact: '#3F6E50', workflow_method: '#5C4E78',
  capability_skill: '#9A9589', document: '#8C877B', language: '#2D6A4F',
  person: '#3F6092', project: '#7A1A2A', other: '#9A9589',
};
PT.KIND_ICONS = {
  software_tool: 'box', library_framework: 'layers', service_platform: 'cloud',
  data_source: 'database', infrastructure: 'server', hardware_device: 'cpu',
  physical_instrument: 'hard-drive', reference_artifact: 'book-open',
  workflow_method: 'workflow', capability_skill: 'graduation-cap',
  document: 'file-text', language: 'code', person: 'user', project: 'rocket',
  other: 'circle',
};
// Coarse groups behind the Index view tabs (mirrors server KIND_GROUPS).
PT.KIND_GROUPS = {
  documents: ['document', 'reference_artifact'],
  tools: ['software_tool', 'library_framework', 'language', 'hardware_device'],
  services: ['service_platform'],
  infra: ['infrastructure'],
  data: ['data_source'],
  people: ['person'],
  projects: ['project'],
  more: ['physical_instrument', 'workflow_method', 'capability_skill', 'other'],
};
PT.SPACES = [
  { id: 'personal', label: 'Personal', icon: 'user' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
];
PT.RELATION_COLORS = {
  depends_on: '#A33434', required_by: '#A33434', integrates_with: '#3F6092',
  alternative_to: '#B4742A', complements: '#3F6E50', contains: '#6B5B95',
  part_of: '#6B5B95', references: '#8C877B', enables: '#2D6A4F',
  version_of: '#9A9589', supersedes: '#7A1A2A', consumes: '#A8854A', produces: '#A8854A',
};
PT.ENUMS = {
  object_kind: ['software_tool','library_framework','service_platform','data_source','infrastructure','hardware_device','physical_instrument','reference_artifact','workflow_method','capability_skill','document','language','person','project','other'],
  status: ['provisional','active','trial','backup','deprecated','retired'],
  priority: ['critical','high','medium','low'],
  workflow_state: ['candidate','adopted','in_review','phasing_out','removed'],
  lifecycle_state: ['provisional','active','deprecated','retired','superseded'],
  hosting_model: ['local','self_hosted','cloud','hybrid','physical'],
  access_model: ['open','free','freemium','paid','subscription','api_key','oauth','license','invitation','offline'],
  interface: ['gui','cli','tui','api','library','web','hardware','document','none'],
  fit_confidence: ['very_low','low','medium','high','very_high'],
  evidence_level: ['none','anecdotal','observational','experimental','established'],
  system_served: ['system_1_operations','system_2_coordination','system_3_control','system_3_audit_accounting','system_4_intelligence','system_5_policy'],
  relation_kind: ['references','related_to','part_of','contains','extends','version_of','supersedes','duplicates','depends_on','required_by','integrates_with','consumes','produces','alternative_to','complements','provided_by','enables','serves','precedes','replaced_by','recommends','root_cause_of'],
  annotation_kind: ['comment','question','review','correction','migration','cost_change','provenance_note'],
  annotation_state: ['open','resolved','superseded'],
  cost_kind: ['free','one_time','subscription','usage_based','maintenance','opportunity'],
};

PT.init = async function () {
  await PT.Store.load();
  this.currentView = 'index';
  this.setupRouter();
  this.setupGlobalSearch();
  this.setupKeyboard();
  this.setupHeaderButtons();
  this.navigate(this.getHashView() || 'index');
  if (location.hash.indexOf('#entry=') === 0) PT.handleEntryHash();
};

PT.setupRouter = function () {
  window.addEventListener('hashchange', function () {
    if (location.hash.indexOf('#entry=') === 0) { PT.handleEntryHash(); return; }
    const v = PT.getHashView(); if (v) PT.navigate(v);
  });
};
PT.getHashView = function () { return location.hash.slice(1); };

// Deep-linkable entries: #entry=OBJ-… opens the detail modal; Back closes it.
PT.openEntry = function (id) {
  if (!id) return;
  const target = '#entry=' + id;
  if (location.hash === target) { PT.Entry.showDetail(id); return; }
  location.hash = target;
};
PT.handleEntryHash = function () {
  const m = location.hash.match(/^#entry=(.+)$/);
  if (m) {
    const e = PT.Store.getById(m[1]);
    if (e) PT.Entry.showDetail(e.id);
    else PT.toast('Entry not found: ' + m[1]);
  } else {
    PT.Entry.closeDetail();
  }
};

PT.navigate = function (view) {
  this.currentView = view; location.hash = '#' + view;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector('.sidebar-nav a[data-view="' + view + '"]');
  if (active) active.classList.add('active');
  const c = document.getElementById('appContent');
  switch (view) {
    case 'index':       c.innerHTML = PT.HomeIndex.render(); break;
    case 'dashboard':   c.innerHTML = PT.Dashboard.render(); break;
    case 'graph':       c.innerHTML = PT.Graph.render(); break;
    case 'sources':     c.innerHTML = PT.Reference.sources(); break;
    case 'handbook':    c.innerHTML = PT.Reference.handbook(); break;
    case 'about':       c.innerHTML = PT.Reference.about(); break;
    case 'export':      c.innerHTML = PT.ExportView(); break;
    default:            c.innerHTML = PT.HomeIndex.render();
  }
  setTimeout(function () {
    if (view === 'index')       PT.HomeIndex.afterRender();
    if (view === 'dashboard')   PT.Dashboard.afterRender();
    if (view === 'graph')       PT.Graph.afterRender();
  }, 50);
};

PT.setupGlobalSearch = function () {
  const input = document.getElementById('globalSearch'); let timer;
  input.addEventListener('input', function (e) { clearTimeout(timer); timer = setTimeout(function () {
    const q = e.target.value.trim();
    if (q.length > 0) {
      if (PT.currentView !== 'index') PT.navigate('index');
      setTimeout(function () { PT.HomeIndex.setQuery(q); }, 50);
    } else if (PT.currentView === 'index') { PT.HomeIndex.setQuery(''); }
  }, 250); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); PT.CommandPalette.open(input.value); input.blur(); }
  });
};

PT.setupKeyboard = function () {
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); PT.CommandPalette.open(''); }
    if (e.key === 'n' && !isInputFocused()) { e.preventDefault(); PT.Entry.openEditor(); }
    if (e.key === '/' && !isInputFocused()) { e.preventDefault(); document.getElementById('globalSearch').focus(); }
    if (e.key === 'Escape') {
      PT.CommandPalette.close(); PT.Entry.closeEditor(); PT.Entry.closeDetail();
      const anyOpen = ['entryModal', 'detailModal', 'cmdPalette'].some(function (id) {
        const el = document.getElementById(id); return el && !el.classList.contains('hidden');
      });
      if (!anyOpen && PT.currentView === 'graph' && PT.Graph.clear) PT.Graph.clear();
    }
  });
};
function isInputFocused() {
  const t = document.activeElement && document.activeElement.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || (document.activeElement && document.activeElement.contentEditable === 'true');
}

PT.setupHeaderButtons = function () {
  const ne = document.getElementById('btnNewEntry'); if (ne) ne.addEventListener('click', function () { PT.Entry.openEditor(); });
  const im = document.getElementById('btnImport'); if (im) im.addEventListener('click', function () { document.getElementById('importFile').click(); });
  const fi = document.getElementById('importFile'); if (fi) fi.addEventListener('change', function (e) { PT.importFile(e); });
  const sv = document.getElementById('btnSaveEntry'); if (sv) sv.addEventListener('click', function () { PT.Entry.saveEditor(); });
};

PT.importFile = async function (e) {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    const res = await fetch('/gis/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const r = await res.json();
    PT.toast('Imported ' + r.imported + ' entries (total ' + r.total + ')');
    await PT.Store.refreshFromAPI();
  } catch (err) { PT.toast('Import failed: invalid JSON'); }
  e.target.value = '';
};

PT.ExportView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Derivative</span><h1>Export</h1></div>' +
    '<div class="actions"><a class="btn btn-primary btn-sm" href="/gis/api/export"><pt-icon name="download" size="15"></pt-icon> Download JSON</a></div></div>' +
    '<div class="card"><div class="card-body"><p>Export the entire catalog as a JSON array of entry objects. Use the Import button (top-right) to merge entries back in by id.</p>' +
    '<p class="text-muted text-sm">Total entries: ' + PT.Store.getStats().total + '.</p></div></div>';
};

PT.prettyEnum = function (s) {
  if (s == null) return '—';
  return String(s).replace(/_/g, ' ').replace(/(?:^|\s)\S/g, function (c) { return c.toUpperCase(); });
};
PT.prettySystem = function (s) {
  return (s || 'unassigned').replace(/^system_(\d)/, 'S$1').replace(/_/g, ' ').replace(/(?:^|\s)\S/g, function (c) { return c.toUpperCase(); });
};
PT.esc = function (s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };

PT.confirmDialog = function (opts) { return AUTOREGIA.confirmDialog(opts); };
PT.kindColor = function (k) { return PT.KIND_COLORS[k] || '#9A9589'; };
PT.toast = function (msg) { AUTOREGIA.toast(msg); };
PT.badge = function (cls, text) { return '<span class="badge ' + cls + '">' + PT.esc(text) + '</span>'; };
