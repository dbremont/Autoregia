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
  input.setAttribute('aria-expanded', 'true');
  setTimeout(() => input.focus(), 30);
  AO.CommandPalette.render('');
  input.oninput = function () { AO.CommandPalette.render(this.value); };
};

AO.CommandPalette.close = function () {
  const p = document.getElementById('cmdPalette');
  if (p) p.classList.add('hidden');
  const input = document.getElementById('cmdInput');
  if (input) input.setAttribute('aria-expanded', 'false');
};

AO.CommandPalette._active = -1;

AO.CommandPalette._items = function () {
  return Array.prototype.slice.call(document.querySelectorAll('#cmdResults .cmd-item'));
};

AO.CommandPalette._setActive = function (next) {
  const items = AO.CommandPalette._items();
  if (!items.length) return;
  next = Math.max(0, Math.min(next, items.length - 1));
  items.forEach(function (it, i) {
    it.classList.toggle('sel', i === next);
    it.setAttribute('aria-selected', i === next ? 'true' : 'false');
  });
  items[next].scrollIntoView({ block: 'nearest' });
  const input = document.getElementById('cmdInput');
  if (input) input.setAttribute('aria-activedescendant', items[next].id);
  AO.CommandPalette._active = next;
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
    { label: 'Open full documentation', icon: 'book-open', run: () => window.open('/aoos/docs', '_blank') },
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
  AO.CommandPalette._active = -1;
  const input = document.getElementById('cmdInput');
  if (input) input.removeAttribute('aria-activedescendant');
  if (!all.length) { results.innerHTML = '<div class="cmd-empty" role="status">No matches</div>'; return; }
  results.innerHTML = all.map((c, i) =>
    '<div class="cmd-item" id="cmd-opt-' + i + '" role="option" aria-selected="false" data-idx="' + i + '"><ao-icon name="' + c.icon + '" size="16"></ao-icon><span>' + AO.esc(c.label) + '</span></div>').join('');
  results.querySelectorAll('.cmd-item').forEach((item, i) => {
    item.onclick = function () { AO.CommandPalette.close(); all[i].run(); };
  });
};

/* Keyboard: ↑/↓ navigate, Enter selects the active (or first) result. */
document.addEventListener('keydown', function (e) {
  const p = document.getElementById('cmdPalette');
  if (!p || p.classList.contains('hidden')) return;
  const input = document.getElementById('cmdInput');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = AO.CommandPalette._items();
    if (!items.length) return;
    const cur = AO.CommandPalette._active;
    const next = e.key === 'ArrowDown'
      ? (cur < 0 ? 0 : Math.min(cur + 1, items.length - 1))
      : Math.max(cur - 1, 0);
    AO.CommandPalette._setActive(next);
  } else if (e.key === 'Enter') {
    const items = AO.CommandPalette._items();
    if (!items.length) return;
    e.preventDefault();
    const idx = AO.CommandPalette._active >= 0 ? AO.CommandPalette._active : 0;
    items[idx].click();
  }
});
