/* AOOS Command Palette - universal Ctrl/Cmd+K interface */
window.AO = window.AO || {};

AO.CommandPalette = AO.CommandPalette || {};

AO.CommandPalette.toggle = function () {
  const p = document.getElementById('cmdPalette');
  if (p.classList.contains('hidden')) { AO.CommandPalette.open(); } else { AO.CommandPalette.close(); }
};

AO.CommandPalette.open = function () {
  const p = document.getElementById('cmdPalette');
  if (!p) return;
  p.classList.remove('hidden');
  const input = document.getElementById('cmdInput');
  input.value = '';
  setTimeout(() => input.focus(), 30);
  AO.CommandPalette.render('');
  input.oninput = function () { AO.CommandPalette.render(this.value); };
};

AO.CommandPalette.close = function () {
  const p = document.getElementById('cmdPalette');
  if (p) p.classList.add('hidden');
};

AO.CommandPalette._commands = function () {
  return [
    { label: 'Go to Dashboard', icon: 'gauge', run: () => AO.navigate('dashboard') },
    { label: 'Go to Analytics', icon: 'bar-chart-3', run: () => AO.navigate('analytics') },
    { label: 'Go to Actions', icon: 'list-checks', run: () => AO.navigate('actions') },
    { label: 'Go to Scratchpad', icon: 'file-text', run: () => AO.navigate('scratch') },
    { label: 'Go to Hierarchy', icon: 'git-fork', run: () => AO.navigate('hierarchy') },
    { label: 'Go to Goals', icon: 'target', run: () => AO.navigate('goals') },
    { label: 'Go to Calendar', icon: 'calendar', run: () => AO.navigate('calendar') },
    { label: 'Go to Sessions', icon: 'timer', run: () => AO.navigate('sessions') },
    { label: 'Go to Google Calendar', icon: 'cloud', run: () => AO.navigate('google') },
    { label: 'New Action', icon: 'plus', run: () => AO.Action.openEditor() },
    { label: 'Open Scratchpad', icon: 'file-text', run: () => { AO.navigate('scratch'); setTimeout(() => { const ta = document.getElementById('scratchArea'); if (ta) ta.focus(); }, 80); } },
    { label: 'Open Help (F1)', icon: 'help-circle', run: () => AO.Help.open() },
    { label: 'Sync Google Calendar', icon: 'refresh-cw', run: () => AO.doGoogleSync() },
    { label: 'Open full documentation', icon: 'book-open', run: () => window.open('/docs', '_blank') },
    { label: 'Export JSON', icon: 'download', run: () => window.open('/aoos/api/export', '_blank') },
  ];
};

AO.CommandPalette.render = function (query) {
  const results = document.getElementById('cmdResults');
  if (!results) return;
  const q = (query || '').toLowerCase().trim();
  const cmds = AO.CommandPalette._commands().filter(c => !q || c.label.toLowerCase().indexOf(q) !== -1);
  let actions = [];
  if (q) {
    actions = AO.Store.searchActions(query).slice(0, 6).map(a =>
      ({ label: a.record_id + ' · ' + a.kind, icon: AO.KIND_ICONS[a.kind] || 'circle',
         run: () => { AO.CommandPalette.close(); AO.navigate('actions'); setTimeout(() => AO.Action.showDetail(a.id), 50); } }));
  }
  const all = cmds.concat(actions);
  if (!all.length) { results.innerHTML = '<div class="cmd-empty">No matches</div>'; return; }
  results.innerHTML = all.map((c, i) =>
    '<div class="cmd-item" data-idx="' + i + '"><ao-icon name="' + c.icon + '" size="16"></ao-icon><span>' + AO.esc(c.label) + '</span></div>').join('');
  results.querySelectorAll('.cmd-item').forEach((item, i) => {
    item.onclick = function () { AO.CommandPalette.close(); all[i].run(); };
  });
};
