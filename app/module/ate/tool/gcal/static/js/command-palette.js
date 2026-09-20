/* ════════════════════════════════════════════════════════════
    GCAL Command Palette — Ctrl+K. Navigation + search across
    connectors, connections, and the execution log (chained into
    the click→filter bus).
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.CommandPalette = {
  _seq: 0,

  open(initialQuery) {
    document.getElementById('cmdPalette').classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || ''; input.focus();
    this.renderResults('');
  },
  close() { document.getElementById('cmdPalette').classList.add('hidden'); },

  async renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query || '').toLowerCase();
    const seq = ++this._seq;

    const commands = [
      { icon: 'plug', title: 'New Connection', sub: 'Connect an app from the registry', action: () => { this.close(); GCAL.navigate('connections'); setTimeout(() => GCAL.Connections.openCreate(null), 80); } },
      { icon: 'play', title: 'Runner', sub: 'Run an action over a connection', action: () => { this.close(); GCAL.navigate('runner'); } },
      { icon: 'download', title: 'Export', sub: 'Download registry + connections as JSON', action: () => { this.close(); GCAL.exportData(); } },
      { icon: 'file-text', title: 'Documentation', sub: 'How the shell works', action: () => { this.close(); GCAL.navigate('documentation'); } },
      { icon: 'search', title: 'Focus search', sub: 'Search the execution log from the header', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      ...GCAL.VIEWS.map(t => ({ icon: t.icon, title: t.label, sub: `Go to ${t.label} — ${t.desc}`, action: () => { this.close(); t.action ? GCAL.runAction(t.action) : GCAL.navigate(t.id); } })),
    ];
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));

    const connectors = q.length > 1
      ? GCAL.Store.registry().filter(c => (c.id + ' ' + (c.name || '')).toLowerCase().includes(q)).slice(0, 4)
      : [];
    const connections = q.length > 1
      ? GCAL.Store.connections().filter(c => (c.id + ' ' + (c.name || '')).toLowerCase().includes(q)).slice(0, 4)
      : [];

    let html = '<div class="cmd-group-label">Commands</div>';
    filtered.forEach(c => {
      html += `<div class="cmd-result-item data-cmd"><span class="cmd-result-icon">${GCAL.icon(c.icon, 17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    if (connectors.length) {
      html += '<div class="cmd-group-label">Connectors</div>';
      connectors.forEach(c => {
        html += `<div class="cmd-result-item data-connector" data-connector="${GCAL.esc(c.id)}"><span class="cmd-result-icon" style="color:var(--gold)">${GCAL.icon('box', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${GCAL.esc(c.name)}</div><div class="cmd-result-subtitle">${GCAL.esc(c.id)} · ${GCAL.esc(c.auth_scheme)}</div></div></div>`;
      });
    }
    if (connections.length) {
      html += '<div class="cmd-group-label">Connections</div>';
      connections.forEach(c => {
        html += `<div class="cmd-result-item data-connection" data-connection="${GCAL.esc(c.id)}"><span class="cmd-result-icon" style="color:var(--oxford)">${GCAL.icon('plug', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${GCAL.esc(c.name)}</div><div class="cmd-result-subtitle">${GCAL.esc(c.connector_id)} · ${GCAL.esc(c.state)}</div></div></div>`;
      });
    }
    el.innerHTML = html;
    this._bindCommands(filtered);
    this._bindGroups();
    this._highlight();

    // log search — async, guarded against out-of-order renders
    if (q.length > 1) {
      try {
        const rows = await fetch(`api/executions?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json());
        if (seq !== this._seq) return;                       // stale response
        if (rows.length) {
          let rhtml = '<div class="cmd-group-label">Executions</div>';
          rows.forEach(r => {
            rhtml += `<div class="cmd-result-item data-exec" data-exec="${GCAL.esc(r.id)}"><span class="cmd-result-icon" style="color:var(--gold)">${GCAL.icon('history', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${GCAL.esc(r.connector_id)} · ${GCAL.esc(r.action)} — ${GCAL.esc(r.status)}</div><div class="cmd-result-subtitle">${GCAL.esc(r.id)}</div></div></div>`;
          });
          el.insertAdjacentHTML('beforeend', rhtml);
          this._bindGroups(); this._highlight();
        }
      } catch (e) { /* log search is best-effort */ }
    }
  },

  _bindCommands(commands) {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-cmd').forEach((item, i) => {
      item.addEventListener('click', () => commands[i]?.action?.());
    });
  },
  _bindGroups() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-connector').forEach(item => {
      item.addEventListener('click', () => { this.close(); GCAL.navigate('connectors'); });
    });
    document.querySelectorAll('#cmdResults .cmd-result-item.data-connection').forEach(item => {
      item.addEventListener('click', () => { this.close(); GCAL.Connections.showConnection(item.dataset.connection); });
    });
    document.querySelectorAll('#cmdResults .cmd-result-item.data-exec').forEach(item => {
      item.addEventListener('click', () => {
        this.close(); GCAL.navigate('executions');
        setTimeout(() => GCAL.Executions.showExecution(item.dataset.exec), 80);
      });
    });
  },
  _highlight() {
    const it = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
    if (it.length && !it.some(x => x.classList.contains('active'))) {
      it[0].classList.add('active');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const i = document.getElementById('cmdInput');
  if (!i) return;
  i.addEventListener('input', (e) => GCAL.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') GCAL.CommandPalette.close();
    if (e.key === 'Enter') { const f = document.querySelector('#cmdResults .cmd-result-item.active') || document.querySelector('#cmdResults .cmd-result-item'); if (f) f.click(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const it = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
      if (!it.length) return;
      const cur = it.findIndex(x => x.classList.contains('active'));
      it[cur]?.classList.remove('active');
      const next = e.key === 'ArrowDown' ? Math.min(cur + 1, it.length - 1) : Math.max(cur - 1, 0);
      it[next]?.classList.add('active'); it[next]?.scrollIntoView({ block: 'nearest' });
    }
  });
});
