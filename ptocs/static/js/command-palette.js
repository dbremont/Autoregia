/* PTOCS Command Palette — Ctrl+K universal command interface */
PT.CommandPalette = {
  open(initialQuery) {
    const overlay = document.getElementById('cmdPalette');
    overlay.classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || '';
    input.focus();
    this.renderResults('');
  },
  close() { const o = document.getElementById('cmdPalette'); if (o) o.classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query || '').toLowerCase();
    const commands = [
      { icon: 'plus', title: 'New Entry', sub: 'Register a new technical object', action: function () { PT.Entry.openEditor(); } },
      { icon: 'gauge', title: 'Go to Dashboard', sub: 'At-a-glance statistics', action: function () { PT.navigate('dashboard'); } },
      { icon: 'list', title: 'Browse Catalog', sub: 'All technical objects', action: function () { PT.navigate('catalog'); } },
      { icon: 'layout-grid', title: 'Browse Facets', sub: 'Pivot by kind/domain/status', action: function () { PT.navigate('browse'); } },
      { icon: 'share-2', title: 'Relationship Graph', sub: 'Visualize entry relationships', action: function () { PT.navigate('graph'); } },
      { icon: 'bar-chart-3', title: 'Statistical Overlay', sub: 'Coverage, gaps, redundancy, cost', action: function () { PT.navigate('analysis'); } },
      { icon: 'download', title: 'Export Catalog', sub: 'Download as JSON', action: function () { PT.navigate('export'); } },
      { icon: 'search', title: 'Search Catalog…', sub: 'Focus the search box', action: function () { document.getElementById('globalSearch').focus(); } },
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    commands.filter(function (c) { return !q || c.title.toLowerCase().indexOf(q) >= 0 || c.sub.toLowerCase().indexOf(q) >= 0; })
      .forEach(function (c) {
        html += '<div class="cmd-result-item" data-action="cmd"><span class="cmd-result-icon">' + PT.icon(c.icon, 17) + '</span>' +
          '<div class="cmd-result-text"><div class="cmd-result-title">' + c.title + '</div><div class="cmd-result-subtitle">' + c.sub + '</div></div></div>';
      });
    if (q.length > 1) {
      const results = PT.Store.search(q).slice(0, 8);
      if (results.length) {
        html += '<div class="cmd-group-label">Entries</div>';
        results.forEach(function (r) {
          html += '<div class="cmd-result-item" onclick="PT.CommandPalette.close();PT.Entry.showDetail(\'' + r.id + '\')">' +
            '<span class="cmd-result-icon" style="color:' + PT.kindColor(r.object_kind) + '">' + PT.icon(PT.KIND_ICONS[r.object_kind] || 'circle', 16) + '</span>' +
            '<div class="cmd-result-text"><div class="cmd-result-title">' + PT.esc(r.name) + '</div>' +
            '<div class="cmd-result-subtitle">' + PT.prettyEnum(r.object_kind) + ' · ' + r.id + ' · ' + PT.prettyEnum(r.status) + '</div></div></div>';
        });
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.cmd-result-item[data-action]').forEach(function (item, i) {
      item.addEventListener('click', function () { PT.CommandPalette.close(); commands[i] && commands[i].action && commands[i].action(); });
    });
  },
};

document.addEventListener('DOMContentLoaded', function () {
  const cmdInput = document.getElementById('cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', function (e) { PT.CommandPalette.renderResults(e.target.value); });
    cmdInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') PT.CommandPalette.close();
      if (e.key === 'Enter') { const first = document.querySelector('#cmdResults .cmd-result-item'); if (first) first.click(); }
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
