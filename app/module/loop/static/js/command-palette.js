/* ════════════════════════════════════════════════════════════
   LOOP Command Palette — Ctrl+K universal command interface.
   Navigation across views + substrate search (chains, deliberations).
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.CommandPalette = {
  open(initialQuery) {
    document.getElementById('cmdPalette').classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || ''; input.focus(); this.renderResults('');
  },
  close() { document.getElementById('cmdPalette').classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query || '').toLowerCase();
    const navCmds = LOOP.VIEWS.map(t => ({ icon: t.icon, title: t.label, sub: `Navigate to ${t.label} — ${t.desc}`,
      action: () => { this.close(); LOOP.navigate(t.id); } }));
    const commands = [
      { icon: 'pencil-line', title: 'Quick Capture', sub: 'Open scratchpad for a fast observation', action: () => LOOP.scratchpad.open() },
      { icon: 'download', title: 'Export Substrate', sub: 'Download the whole-loop dataset as JSON', action: () => { this.close(); LOOP.exportData(); } },
      { icon: 'clipboard-list', title: 'Documentation', sub: 'Open the agency dashboard documentation', action: () => { this.close(); LOOP.openDocs(); } },
      { icon: 'search', title: 'Focus Search', sub: 'Focus the header search field', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      ...navCmds,
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));
    filtered.forEach(c => {
      html += `<div class="cmd-result-item">
        <span class="cmd-result-icon">${LOOP.icon(c.icon, 17)}</span>
        <div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div>
      </div>`;
    });
    // substrate search: chains + deliberations
    if (q.length > 1) {
      const ds = LOOP.Store.getDataset();
      const chains = (ds.chains || []).filter(c => c.correlation_id.toLowerCase().includes(q) || (c.feedback?.title || '').toLowerCase().includes(q)).slice(0, 6);
      if (chains.length) {
        html += '<div class="cmd-group-label">Causal Chains</div>';
        chains.forEach(c => {
          html += `<div class="cmd-result-item">
            <span class="cmd-result-icon" style="color:var(--oxford)">${LOOP.icon('route', 16)}</span>
            <div class="cmd-result-text"><div class="cmd-result-title">${LOOP.esc(c.feedback?.title || c.correlation_id)}</div>
            <div class="cmd-result-subtitle">${c.correlation_id} · ${c.closed ? 'closed' : 'open'}</div></div>
          </div>`;
        });
        el.querySelectorAll('.cmd-result-item').forEach((item, i) => item.addEventListener('click', () => filtered[i]?.action?.()));
      }
      const dels = (ds.deliberations || []).filter(d => (d.id + d.title + d.type + d.domain).toLowerCase().includes(q)).slice(0, 6);
      if (dels.length) {
        html += '<div class="cmd-group-label">Deliberations</div>';
        dels.forEach(d => {
          html += `<div class="cmd-result-item">
            <span class="cmd-result-icon" style="color:var(--gold)">${LOOP.icon('repeat', 16)}</span>
            <div class="cmd-result-text"><div class="cmd-result-title">${LOOP.esc(d.title)}</div>
            <div class="cmd-result-subtitle">${d.id} · ${d.type} · ${d.status}</div></div>
          </div>`;
        });
      }
    }
    el.innerHTML = html;
    const items = [...el.querySelectorAll('.cmd-result-item')];
    items.forEach((item, i) => {
      if (i < filtered.length) item.addEventListener('click', () => filtered[i]?.action?.());
      else {
        // substrate result → jump to cascade view
        item.addEventListener('click', () => { this.close(); LOOP.navigate('cascade'); });
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const cmdInput = document.getElementById('cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => LOOP.CommandPalette.renderResults(e.target.value));
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') LOOP.CommandPalette.close();
      if (e.key === 'Enter') { const f = document.querySelector('#cmdResults .cmd-result-item'); if (f) f.click(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
        const cur = items.findIndex(i => i.classList.contains('active'));
        items[cur]?.classList.remove('active');
        const next = e.key === 'ArrowDown' ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);
        items[next]?.classList.add('active'); items[next]?.scrollIntoView({ block: 'nearest' });
      }
    });
  }
});
