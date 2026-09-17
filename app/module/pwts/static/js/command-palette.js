/* ════════════════════════════════════════════════════════════
   PWTS Command Palette — Ctrl/Cmd + K (ui.spec §7.6/§8.1)
   ════════════════════════════════════════════════════════════ */
window.PWTS = window.PWTS || {};
PWTS.CommandPalette = (() => {
  let sel = 0; let items = []; let input; let results; let overlay;

  function commands(q) {
    return [
      { title: 'Refresh dashboard', icon: 'refresh-cw', run: () => document.getElementById('btnRefresh').click() },
      { title: 'Export analytics JSON', icon: 'download', run: () => document.getElementById('btnExport').click() },
      { title: 'Filter by app…', icon: 'search', run: () => { const f = document.getElementById('appFilter'); if (f) f.focus(); } },
      { title: 'Clear app filter', icon: 'x', run: () => { const f = document.getElementById('appFilter'); if (f) { f.value = ''; f.dispatchEvent(new Event('input')); } } }
    ].filter(c => !q || c.title.toLowerCase().includes(q));
  }

  function open() {
    if (overlay) { overlay.classList.remove('hidden'); input.focus(); return; }
    overlay = document.createElement('div');
    overlay.className = 'cmd-palette-overlay';
    overlay.innerHTML = `
      <div class="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmd-palette-search">
          <span aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input id="cmdInput" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="cmdResults" aria-label="Search commands" placeholder="Type a command…" autocomplete="off">
          <span class="kbd">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults" role="listbox" aria-label="Command results"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#cmdInput');
    results = overlay.querySelector('#cmdResults');
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => update(input.value));
    input.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', onEsc);
    update('');
    input.focus();
  }

  function close() {
    if (overlay) overlay.classList.add('hidden');
    document.removeEventListener('keydown', onEsc);
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function onEsc(e) {
    if (e.key === 'Escape') close();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay && !overlay.classList.contains('hidden') ? close() : open(); }
  }

  function update(qRaw) {
    const q = qRaw.toLowerCase().trim();
    items = commands(q);
    sel = 0;
    render();
  }

  function render() {
    if (!items.length) { results.innerHTML = '<div class="cmd-group-label">No matches</div>'; return; }
    results.innerHTML = items.map((it, i) => `
      <div class="cmd-result-item ${i === sel ? 'active' : ''}" id="cmd-opt-${i}" role="option" aria-selected="${i === sel}" data-i="${i}">
        <span class="cmd-result-icon">${icon(it.icon)}</span>
        <div class="cmd-result-text"><div class="cmd-result-title">${it.title}</div></div>
      </div>`).join('');
    results.querySelectorAll('.cmd-result-item').forEach(el => {
      const i = +el.getAttribute('data-i');
      el.addEventListener('mouseenter', () => { if (sel !== i) { sel = i; render(); } });
      el.addEventListener('click', () => activate(i));
    });
    const a = results.querySelector('.cmd-result-item.active');
    if (a) { a.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', a.id); }
  }

  function icon(name) {
    const paths = {
      'refresh-cw': '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
      'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
      'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
    };
    return `<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(sel); }
  }

  function activate(i) {
    const it = items[i]; if (!it) return;
    close();
    it.run();
  }

  function init() {
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    });
  }

  return { open, close, init };
})();
