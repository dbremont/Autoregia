/* ════════════════════════════════════════════════════════════
   AIAS App — shell wiring · navigation · dashboard · list
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};
AI.app = (() => {
  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'gauge' },
    { id: 'board',     label: 'Intent Board', icon: 'layers' },
    { id: 'active',    label: 'Active Set', icon: 'target' },
    { id: 'list',      label: 'All Intentions', icon: 'list' }
  ];
  let current = 'board';
  let mainEl, navEl, searchEl;

  function init() {
    mainEl = document.getElementById('appContent');
    navEl = document.getElementById('sidebarNav');
    searchEl = document.getElementById('globalSearch');

    // build nav
    navEl.innerHTML = VIEWS.map(v =>
      `<li><a href="#${v.id}" data-view="${v.id}"><span class="nav-icon">${AI.icon(v.icon, 17)}</span>${v.label}</a></li>`).join('');
    navEl.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); setView(a.getAttribute('data-view'));
    }));

    // header actions
    document.getElementById('btnNew').addEventListener('click', () => AI.Editor.openNew());
    document.getElementById('btnCapture').addEventListener('click', () => AI.Editor.openCapture());
    document.getElementById('btnExport').addEventListener('click', exportData);

    searchEl.addEventListener('input', () => render());
    searchEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { searchEl.value = ''; render(); searchEl.blur(); }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'n' && !inField(e) && !modalOpen()) { e.preventDefault(); AI.Editor.openNew(); }
      if (e.key === '/' && !inField(e) && !modalOpen()) { e.preventDefault(); searchEl.focus(); }
    });

    AI.Store.subscribe(() => render());
    AI.Store.load().then(() => {
      const h = location.hash.replace('#', '');
      setView(VIEWS.some(v => v.id === h) ? h : 'board');
    });
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '');
      if (VIEWS.some(v => v.id === h)) setView(h);
    });
  }

  function inField(e) {
    const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }
  function modalOpen() { return !!document.querySelector('.modal-overlay:not(.hidden), .cmd-overlay:not(.hidden)'); }

  function setView(view) {
    if (!VIEWS.some(v => v.id === view)) view = 'board';
    current = view;
    history.replaceState(null, '', '#' + view);
    navEl.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.getAttribute('data-view') === view));
    render();
  }

  function getQuery() { return (searchEl.value || '').trim(); }

  function render() {
    const q = getQuery();
    if (q) return renderSearch(q);
    if (current === 'dashboard') return AI.Dashboard.render(mainEl);
    if (current === 'list') return AI.List.render(mainEl);
    if (current === 'active') return AI.Board.render(mainEl, { activeOnly: true });
    return AI.Board.render(mainEl);
  }

  function renderSearch(q) {
    const results = AI.Store.search(q);
    mainEl.innerHTML = `<div class="view-header">
        <div><div class="eyebrow">Search</div>
        <div class="view-title">Intentions matching <em>${esc(q)}</em></div></div>
        <div class="view-sub">${results.length} found</div>
      </div>` +
      (results.length ? table(results) : `<div class="empty">No intentions match this query.</div>`);
    mainEl.querySelectorAll('tr[data-id]').forEach(tr =>
      tr.addEventListener('click', () => AI.Editor.openDetail(tr.getAttribute('data-id'))));
  }

  function table(items) {
    return `<table class="table"><thead><tr>
      <th>Intent</th><th>Source</th><th>Priority</th><th>Status</th><th>Deadline</th>
      </tr></thead><tbody>` +
      items.map(i => `<tr data-id="${esc(i.id)}">
        <td><div style="font-weight:500;color:var(--ink-1)">${esc(i.description)}</div>
          <div class="mono" style="font-size:var(--text-2xs);color:var(--color-text-faint)">${esc(i.id)}</div></td>
        <td><span class="badge src-${slug(i.source)}">${esc(i.source)}</span></td>
        <td><span class="badge pri-${i.priority}"><span class="dot"></span>${esc(i.priority)}</span></td>
        <td class="mono" style="font-size:var(--text-xs);color:var(--color-text-secondary)">${esc(i.status)}</td>
        <td class="mono" style="font-size:var(--text-xs);color:var(--color-text-muted)">${i.deadline ? esc(i.deadline) : '—'}</td>
      </tr>`).join('') + `</tbody></table>`;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(AI.Store.getAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'aias_export.json'; a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported the Intent Store');
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function slug(s) { return String(s || '').toLowerCase(); }

  // shared table renderer for the List view
  function renderTable(el, items, title, sub) {
    el.innerHTML = `<div class="view-header"><div><div class="eyebrow">Intent Store</div>
      <div class="view-title">${title}</div></div><div class="view-sub">${sub}</div></div>` +
      (items.length ? table(items) : `<div class="empty">No intentions.</div>`);
    el.querySelectorAll('tr[data-id]').forEach(tr =>
      tr.addEventListener('click', () => AI.Editor.openDetail(tr.getAttribute('data-id'))));
  }

  return { init, setView, toast, esc, slug, renderTable, exportData };
})();
