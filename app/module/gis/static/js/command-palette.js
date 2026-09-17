/* GIS Command Palette — Ctrl+K universal command interface */
PT.CommandPalette = {
  open(initialQuery) {
    try { input.setAttribute('aria-expanded','true'); } catch(e){}
    const overlay = document.getElementById('cmdPalette');
    overlay.classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || '';
    input.focus();
    this.renderResults('');
  },
  close() {
    try { document.getElementById('cmdInput').setAttribute('aria-expanded','false'); } catch(e){} const o = document.getElementById('cmdPalette'); if (o) o.classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query || '').toLowerCase();
    const commands = [
      { icon: 'plus', title: 'New Entry', sub: 'Register a new technical object', action: function () { PT.Entry.openEditor(); } },
      { icon: 'list', title: 'Go to Index', sub: 'The General Index home', action: function () { PT.navigate('index'); } },
      { icon: 'gauge', title: 'Go to Dashboard', sub: 'Overview, coverage, structure, health, cost, activity', action: function () { PT.navigate('dashboard'); } },
      { icon: 'share-2', title: 'Graph', sub: 'Visualize entry relationships', action: function () { PT.navigate('graph'); } },
      { icon: 'download', title: 'Export Catalog', sub: 'Download as JSON', action: function () { PT.navigate('export'); } },
      { icon: 'search', title: 'Search the Index…', sub: 'Focus the search box', action: function () { document.getElementById('globalSearch').focus(); } },
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    const visible = commands.filter(function (c) { return !q || c.title.toLowerCase().indexOf(q) >= 0 || c.sub.toLowerCase().indexOf(q) >= 0; });
    visible.forEach(function (c) {
      html += '<div class="cmd-result-item" data-action="cmd"><span class="cmd-result-icon">' + PT.icon(c.icon, 17) + '</span>' +
        '<div class="cmd-result-text"><div class="cmd-result-title">' + c.title + '</div><div class="cmd-result-subtitle">' + c.sub + '</div></div></div>';
    });
    if (q.length > 1) {
      const results = PT.Store.search(q).slice(0, 8);
      if (results.length) {
        html += '<div class="cmd-group-label">Entries</div>';
        results.forEach(function (r) {
          html += '<div class="cmd-result-item" onclick="PT.CommandPalette.close();PT.openEntry(\'' + r.id + '\')">' +
            '<span class="cmd-result-icon" style="color:' + PT.kindColor(r.object_kind) + '">' + PT.icon(PT.KIND_ICONS[r.object_kind] || 'circle', 16) + '</span>' +
            '<div class="cmd-result-text"><div class="cmd-result-title">' + PT.esc(r.name) + '</div>' +
            '<div class="cmd-result-subtitle">' + PT.prettyEnum(r.object_kind) + ' · ' + r.id + ' · ' + PT.prettyEnum(r.status) + '</div></div></div>';
        });
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.cmd-result-item').forEach((it, i) => {
      it.id = 'cmd-opt-' + i;
      it.setAttribute('role', 'option');
      it.setAttribute('aria-selected', it.classList.contains('active') ? 'true' : 'false');
    });
    el.querySelectorAll('.cmd-result-item[data-action]').forEach(function (item, i) {
      item.addEventListener('click', function () { PT.CommandPalette.close(); visible[i] && visible[i].action && visible[i].action(); });
    });
  },
};

document.addEventListener('DOMContentLoaded', function () {
  const cmdInput = document.getElementById('cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', function (e) { PT.CommandPalette.renderResults(e.target.value); });
    cmdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') PT.CommandPalette.close();
      if (e.key === 'Enter') { const first = document.querySelector('#cmdResults .cmd-result-item.active') || document.querySelector('#cmdResults .cmd-result-item'); if (first) first.click(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.prototype.slice.call(document.querySelectorAll('#cmdResults .cmd-result-item'));
        const cur = items.findIndex(function (i) { return i.classList.contains('active'); });
        items[cur] && items[cur].classList.remove('active');
        const next = e.key === 'ArrowDown' ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);
        items[next] && items[next].classList.add('active');
        items[next] && items[next].scrollIntoView({ block: 'nearest' });
      }
    });
  }
});
