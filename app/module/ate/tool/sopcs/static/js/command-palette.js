/* ════════════════════════════════════════════════════════════
    SOPCS Command Palette — Ctrl+K. Navigation, actions, and
    catalog search (full-text, falling back per backend).
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};
SOPCS.CommandPalette = {
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
      { icon: 'plus', title: 'New SOP', sub: 'Write a standard operating procedure', action: () => { this.close(); SOPCS.navigate('new'); } },
      { icon: 'refresh', title: 'Re-index embeddings', sub: 'Recompute semantic vectors for the catalog', action: async () => {
          this.close();
          try {
            const r = await SOPCS.Store.reindex();
            SOPCS.toast(`re-indexed ${r.indexed} procedure(s)`);
            await SOPCS.Store.loadSelf();
            SOPCS.updateFooter();
          } catch (e) { SOPCS.toast(e.message); }
        } },
      { icon: 'search', title: 'Focus search', sub: 'Search the catalog from the header', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      { icon: 'info', title: 'About', sub: 'What SOPCS is', action: () => { this.close(); SOPCS.navigate('about'); } },
      ...SOPCS.VIEWS.map((v) => ({ icon: v.icon, title: v.label, sub: `Go to ${v.label} — ${v.desc}`, action: () => { this.close(); SOPCS.navigate(v.id); } })),
    ];
    const filtered = commands.filter((c) => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));

    let html = '<div class="cmd-group-label">Commands</div>';
    filtered.forEach((c) => {
      html += `<div class="cmd-result-item data-cmd"><span class="cmd-result-icon">${SOPCS.icon(c.icon, 17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    el.innerHTML = html;
    this._bindCommands(filtered);
    this._highlight();

    // catalog search — async, guarded against out-of-order renders
    if (q.length > 1) {
      try {
        const res = await fetch(`api/search?q=${encodeURIComponent(q)}&limit=5`).then((r) => r.json());
        if (seq !== this._seq) return;                       // stale response
        if (res.items && res.items.length) {
          let shtml = `<div class="cmd-group-label">${res.mode === 'semantic' ? 'Semantic matches' : 'Catalog matches'}</div>`;
          res.items.forEach((d) => {
            shtml += `<div class="cmd-result-item data-doc" data-doc="${SOPCS.esc(d.id)}"><span class="cmd-result-icon" style="color:var(--oxford)">${SOPCS.icon('book-open', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${SOPCS.esc(d.title)}</div><div class="cmd-result-subtitle">${SOPCS.esc(d.id)} · ${SOPCS.esc(d.status)} · ${SOPCS.esc(SOPCS.Store.readTime(d.reading_minutes))}</div></div></div>`;
          });
          el.insertAdjacentHTML('beforeend', shtml);
          this._bindDocs(); this._highlight();
        }
      } catch (e) { /* catalog search is best-effort */ }
    }
  },

  _bindCommands(commands) {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-cmd').forEach((item, i) => {
      item.addEventListener('click', () => commands[i]?.action?.());
    });
  },
  _bindDocs() {
    document.querySelectorAll('#cmdResults .cmd-result-item.data-doc').forEach((item) => {
      item.addEventListener('click', () => { this.close(); SOPCS.navigate('doc/' + item.dataset.doc); });
    });
  },
  _highlight() {
    const it = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
    if (it.length && !it.some((x) => x.classList.contains('active'))) {
      it[0].classList.add('active');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const i = document.getElementById('cmdInput');
  if (!i) return;
  i.addEventListener('input', (e) => SOPCS.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') SOPCS.CommandPalette.close();
    if (e.key === 'Enter') { const f = document.querySelector('#cmdResults .cmd-result-item.active') || document.querySelector('#cmdResults .cmd-result-item'); if (f) f.click(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const it = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
      if (!it.length) return;
      const cur = it.findIndex((x) => x.classList.contains('active'));
      it[cur]?.classList.remove('active');
      const next = e.key === 'ArrowDown' ? Math.min(cur + 1, it.length - 1) : Math.max(cur - 1, 0);
      it[next]?.classList.add('active'); it[next]?.scrollIntoView({ block: 'nearest' });
    }
  });
});
