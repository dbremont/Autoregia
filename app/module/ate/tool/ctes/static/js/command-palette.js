/* ════════════════════════════════════════════════════════════
   CTES Command Palette — Ctrl+K. Navigation + search across
   handles, task specs, and the run journal (chained into the
   click→filter bus).
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.CommandPalette = {
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
      { icon: 'refresh', title: 'Scan packages', sub: 'Re-read packages/ manifests into the register', action: async () => { this.close(); try { const r = await CTES.Store.scanPackages(); CTES.toast(`scanned: ${r.handles.length} handle(s)`); await CTES.Store.loadHandles(); CTES.navigate(CTES.current); } catch (e) { CTES.toast(e.message); } } },
      { icon: 'download', title: 'Export', sub: 'Download register + specs + runs as JSON', action: () => { this.close(); CTES.exportData(); } },
      { icon: 'book-open', title: 'Documentation', sub: 'How the shell works', action: () => { this.close(); CTES.navigate('documentation'); } },
      { icon: 'search', title: 'Focus search', sub: 'Filter the run journal from the header', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      ...CTES.VIEWS.map(t => ({ icon: t.icon, title: t.label, sub: `Go to ${t.label} — ${t.desc}`, action: () => { this.close(); t.action ? CTES.runAction(t.action) : CTES.navigate(t.id); } })),
    ];
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));

    const handles = q.length > 1
      ? CTES.Store.handles().filter(h => (h.id + ' ' + (h.name || '') + ' ' + (h.description || '')).toLowerCase().includes(q)).slice(0, 5)
      : [];

    let html = '<div class="cmd-group-label">Commands</div>';
    filtered.forEach(c => {
      html += `<div class="cmd-result-item data-cmd"><span class="cmd-result-icon">${CTES.icon(c.icon, 17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    if (handles.length) {
      html += '<div class="cmd-group-label">Handlers</div>';
      handles.forEach(h => {
        html += `<div class="cmd-result-item data-handler" data-handler="${CTES.esc(h.id)}"><span class="cmd-result-icon" style="color:var(--oxford)">${CTES.icon('box', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${CTES.esc(h.id)} — ${CTES.esc(h.name || '')}</div><div class="cmd-result-subtitle">${CTES.esc(h.entry_point)} · ${CTES.esc(h.status || 'active')}</div></div></div>`;
      });
    }
    el.innerHTML = html;
    this._bindCommands(filtered);
    this._bindHandlers();
    this._highlight();

    // runs search — async, guarded against out-of-order renders
    if (q.length > 1) {
      try {
        const runs = await fetch(`api/runs?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json());
        if (seq !== this._seq) return;                       // stale response
        if (runs.length) {
          let rhtml = '<div class="cmd-group-label">Runs</div>';
          runs.forEach(r => {
            rhtml += `<div class="cmd-result-item data-run" data-run="${CTES.esc(r.id)}"><span class="cmd-result-icon" style="color:var(--gold)">${CTES.icon('radio', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${CTES.esc(r.id)} — ${CTES.esc(r.status)}</div><div class="cmd-result-subtitle">${CTES.esc(r.handle_id)} · ${CTES.esc(CTES.Store.fmtTime(r.started_at))}</div></div></div>`;
          });
          el.insertAdjacentHTML('beforeend', rhtml);
          this._bindRuns(); this._highlight();
        }
      } catch (e) { /* journal search is best-effort */ }
    }
  },

  _bindCommands(commands) {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-cmd').forEach((item, i) => {
      item.addEventListener('click', () => commands[i]?.action?.());
    });
  },
  _bindRuns() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-run').forEach(item => {
      item.addEventListener('click', () => {
        this.close(); CTES.navigate('runs');
        setTimeout(() => CTES.Runs.showRun(item.dataset.run), 80);
      });
    });
  },
  _bindHandlers() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-handler').forEach(item => {
      item.addEventListener('click', () => { this.close(); CTES.navigate('handlers/' + item.dataset.handler); });
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
  i.addEventListener('input', (e) => CTES.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') CTES.CommandPalette.close();
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
