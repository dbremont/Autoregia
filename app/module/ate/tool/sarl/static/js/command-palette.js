/* ════════════════════════════════════════════════════════════
    SARL Command Palette — Ctrl+K. Navigation + search across
    tasks, glossaries, and phrase collections (chained into the
    click→filter bus).
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.CommandPalette = {
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
      { icon: 'plus', title: 'New Task', sub: 'The document first, then the set of checks', action: () => { this.close(); SARL.navigate('tasks/new'); } },
      { icon: 'download', title: 'Export', sub: 'Download tasks + authorities as JSON', action: () => { this.close(); SARL.exportData(); } },
      { icon: 'file-text', title: 'Documentation', sub: 'How the shell works', action: () => { this.close(); SARL.navigate('documentation'); } },
      { icon: 'search', title: 'Focus search', sub: 'Search the task set from the header', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      ...SARL.VIEWS.map(t => ({ icon: t.icon, title: t.label, sub: `Go to ${t.label} — ${t.desc}`, action: () => { this.close(); t.action ? SARL.runAction(t.action) : SARL.navigate(t.id); } })),
    ];
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));

    const tasks = q.length > 1
      ? SARL.Store.tasksPage().filter(t => (t.id + ' ' + (t.excerpt || '')).toLowerCase().includes(q)).slice(0, 5)
      : [];
    const glossaries = q.length > 1
      ? SARL.Store.glossaries().filter(g => (g.id + ' ' + (g.name || '')).toLowerCase().includes(q)).slice(0, 4)
      : [];

    let html = '<div class="cmd-group-label">Commands</div>';
    filtered.forEach(c => {
      html += `<div class="cmd-result-item data-cmd"><span class="cmd-result-icon">${SARL.icon(c.icon, 17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    if (tasks.length) {
      html += '<div class="cmd-group-label">Tasks in view</div>';
      tasks.forEach(t => {
        html += `<div class="cmd-result-item data-task" data-task="${SARL.esc(t.id)}"><span class="cmd-result-icon" style="color:var(--oxford)">${SARL.icon('list', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${SARL.esc(t.id)} — ${SARL.esc(t.state)}</div><div class="cmd-result-subtitle">${SARL.esc((t.excerpt || '').slice(0, 72))}</div></div></div>`;
      });
    }
    if (glossaries.length) {
      html += '<div class="cmd-group-label">Glossaries</div>';
      glossaries.forEach(g => {
        html += `<div class="cmd-result-item data-glossary" data-glossary="${SARL.esc(g.id)}"><span class="cmd-result-icon" style="color:var(--gold)">${SARL.icon('book-open', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${SARL.esc(g.name)}</div><div class="cmd-result-subtitle">${SARL.esc(g.language)} · ${g.entry_count || (g.entries || []).length} entries</div></div></div>`;
      });
    }
    el.innerHTML = html;
    this._bindCommands(filtered);
    this._bindTasks();
    this._bindGlossaries();
    this._highlight();

    // journal search — async, guarded against out-of-order renders
    if (q.length > 1) {
      try {
        const rows = await fetch(`api/tasks?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json());
        if (seq !== this._seq) return;                       // stale response
        if (rows.length) {
          let rhtml = '<div class="cmd-group-label">Task journal</div>';
          rows.forEach(t => {
            rhtml += `<div class="cmd-result-item data-task" data-task="${SARL.esc(t.id)}"><span class="cmd-result-icon" style="color:var(--gold)">${SARL.icon('search', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${SARL.esc(t.id)} — ${SARL.esc(t.state)}</div><div class="cmd-result-subtitle">${SARL.esc((t.excerpt || '').slice(0, 72))}</div></div></div>`;
          });
          el.insertAdjacentHTML('beforeend', rhtml);
          this._bindTasks(); this._highlight();
        }
      } catch (e) { /* journal search is best-effort */ }
    }
  },

  _bindCommands(commands) {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-cmd').forEach((item, i) => {
      item.addEventListener('click', () => commands[i]?.action?.());
    });
  },
  _bindTasks() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-task').forEach(item => {
      item.addEventListener('click', () => {
        this.close(); SARL.Tasks.showTask(item.dataset.task);
      });
    });
  },
  _bindGlossaries() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-glossary').forEach(item => {
      item.addEventListener('click', () => { this.close(); SARL.navigate('glossaries'); });
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
  i.addEventListener('input', (e) => SARL.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') SARL.CommandPalette.close();
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
