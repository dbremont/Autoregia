/* PWOS Command Palette - universal Ctrl/Cmd+K interface */
window.PW = window.PW || {};

PW.CommandPalette = PW.CommandPalette || {};

PW.CommandPalette.toggle = function () {
  const p = document.getElementById('cmdPalette');
  if (p.classList.contains('hidden')) { PW.CommandPalette.open(); } else { PW.CommandPalette.close(); }
};

PW.CommandPalette.open = function () {
  const p = document.getElementById('cmdPalette');
  if (!p) return;
  p.classList.remove('hidden');
  const input = document.getElementById('cmdInput');
  input.value = '';
  setTimeout(() => input.focus(), 30);
  PW.CommandPalette.render('');
  input.oninput = function () { PW.CommandPalette.render(this.value); };
};

PW.CommandPalette.close = function () {
  const p = document.getElementById('cmdPalette');
  if (p) p.classList.add('hidden');
};

PW.CommandPalette._commands = function () {
  return [
    { label: 'Go to Dashboard', icon: 'gauge', run: () => PW.navigate('dashboard') },
    { label: 'Go to Actions', icon: 'list-checks', run: () => PW.navigate('actions') },
    { label: 'Go to Hierarchy', icon: 'git-fork', run: () => PW.navigate('hierarchy') },
    { label: 'Go to Calendar', icon: 'calendar', run: () => PW.navigate('calendar') },
    { label: 'Go to Google Calendar', icon: 'cloud', run: () => PW.navigate('google') },
    { label: 'New Action', icon: 'plus', run: () => PW.Action.openEditor() },
    { label: 'Open Help (F1)', icon: 'help-circle', run: () => PW.Help.open() },
    { label: 'Sync Google Calendar', icon: 'refresh-cw', run: () => PW.doGoogleSync() },
    { label: 'Open full documentation', icon: 'book-open', run: () => window.open('/docs', '_blank') },
    { label: 'Export JSON', icon: 'download', run: () => window.open('/api/export', '_blank') },
  ];
};

PW.CommandPalette.render = function (query) {
  const results = document.getElementById('cmdResults');
  if (!results) return;
  const q = (query || '').toLowerCase().trim();
  const cmds = PW.CommandPalette._commands().filter(c => !q || c.label.toLowerCase().indexOf(q) !== -1);
  let actions = [];
  if (q) {
    actions = PW.Store.searchActions(query).slice(0, 6).map(a =>
      ({ label: a.record_id + ' · ' + a.kind, icon: PW.KIND_ICONS[a.kind] || 'circle',
         run: () => { PW.CommandPalette.close(); PW.navigate('actions'); setTimeout(() => PW.Action.showDetail(a.id), 50); } }));
  }
  const all = cmds.concat(actions);
  if (!all.length) { results.innerHTML = '<div class="cmd-empty">No matches</div>'; return; }
  results.innerHTML = all.map((c, i) =>
    '<div class="cmd-item" data-idx="' + i + '"><pw-icon name="' + c.icon + '" size="16"></pw-icon><span>' + PW.esc(c.label) + '</span></div>').join('');
  results.querySelectorAll('.cmd-item').forEach((item, i) => {
    item.onclick = function () { PW.CommandPalette.close(); all[i].run(); };
  });
};
