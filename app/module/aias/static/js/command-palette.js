/* ════════════════════════════════════════════════════════════
   AIAS Command Palette — Ctrl/Cmd + K
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};
AI.Cmd = (() => {
  let sel = 0; let items = []; let input; let results; let overlay;

  function open() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-search">
          <span>${AI.icon('search', 18)}</span>
          <input id="cmdInput" placeholder="Type a command or search intentions…" autocomplete="off">
          <span class="kbd-hint">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
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

  function close() { if (overlay) { overlay.remove(); overlay = null; } document.removeEventListener('keydown', onEsc); }
  function onEsc(e) {
    if (e.key === 'Escape') close();
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay ? close() : open(); }
  }

  function commands(q) {
    const nav = [
      { kind: 'View', title: 'Go to Dashboard', icon: 'gauge', run: () => AI.app.setView('dashboard') },
      { kind: 'View', title: 'Go to Intent Board', icon: 'layers', run: () => AI.app.setView('board') },
      { kind: 'View', title: 'Go to Active Set', icon: 'target', run: () => AI.app.setView('active') },
      { kind: 'View', title: 'Go to All Intentions', icon: 'list', run: () => AI.app.setView('list') },
      { kind: 'Action', title: 'New intention', icon: 'plus', run: () => AI.Editor.openNew() },
      { kind: 'Action', title: 'Quick capture candidate', icon: 'inbox', run: () => AI.Editor.openCapture() },
      { kind: 'Action', title: 'Export Intent Store (JSON)', icon: 'download', run: () => AI.app.exportData() }
    ].filter(c => !q || c.title.toLowerCase().includes(q));
    return nav;
  }

  function update(qRaw) {
    const q = qRaw.toLowerCase().trim();
    const cmds = commands(q);
    const matches = q ? AI.Store.search(q).slice(0, 8) : [];
    items = cmds.map(c => ({ type: 'cmd', ...c }))
      .concat(matches.map(i => ({ type: 'intent', title: i.description, meta: i.id, status: i.status, id: i.id })));
    sel = 0;
    render();
  }

  function render() {
    if (!items.length) { results.innerHTML = `<div class="cmd-empty">No matches.</div>`; return; }
    results.innerHTML = items.map((it, i) => {
      if (it.type === 'cmd') {
        return `<div class="cmd-item ${i === sel ? 'sel' : ''}" data-i="${i}">
          <span class="cmd-icon">${AI.icon(it.icon, 16)}</span>
          <span class="cmd-title">${AI.app.esc(it.title)}</span>
          <span class="cmd-meta">${AI.app.esc(it.kind)}</span></div>`;
      }
      return `<div class="cmd-item ${i === sel ? 'sel' : ''}" data-i="${i}">
        <span class="cmd-icon">${AI.icon('bookmark', 16)}</span>
        <span class="cmd-title">${AI.app.esc(it.title)}</span>
        <span class="cmd-meta">${AI.app.esc(it.status)}</span></div>`;
    }).join('');
    results.querySelectorAll('.cmd-item').forEach(el => {
      const i = +el.getAttribute('data-i');
      el.addEventListener('mouseenter', () => { sel = i; render(); });
      el.addEventListener('click', () => activate(i));
    });
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; render(); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(sel); }
  }

  function activate(i) {
    const it = items[i]; if (!it) return;
    close();
    if (it.type === 'cmd') it.run();
    else AI.Editor.openDetail(it.id);
  }

  function init() { document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay ? close() : open(); } }); }

  return { open, close, init };
})();
