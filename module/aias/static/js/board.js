/* ════════════════════════════════════════════════════════════
   AIAS Board — the Active Intent Set, in four columns
   Triage Queue · Active Set · Monitoring · Retrospective
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};
AI.Board = (() => {
  const COLS = [
    { id: 'triage',       title: 'Triage Queue',   hint: 'candidates awaiting evaluation', accent: false,
      statuses: ['Generated', 'Evaluated'] },
    { id: 'active',       title: 'Active Intent Set', hint: 'committed & being pursued', accent: true,
      statuses: ['Selected', 'Committed', 'In Progress'] },
    { id: 'monitoring',   title: 'Monitoring',     hint: 'suspended · awaiting input', accent: false,
      statuses: ['Paused', 'Needs Review', 'Deferred', 'Blocked'] },
    { id: 'retrospective',title: 'Retrospective',  hint: 'completed · abandoned · superseded', accent: false,
      statuses: ['Completed', 'Cancelled', 'Superseded', 'Merged'] }
  ];

  function render(el, opts) {
    opts = opts || {};
    const all = AI.Store.getAll();
    el.innerHTML = `<div class="view-header">
        <div><div class="eyebrow">Intent Management</div>
        <div class="view-title">The <em>Intent Board</em></div></div>
        <div class="view-sub">${opts.activeOnly ? 'the authoritative active set' : 'the scheduler, in columns'}</div>
      </div>`;

    const grid = document.createElement('div');
    grid.className = 'board';
    const cols = opts.activeOnly ? COLS.filter(c => c.id === 'active') : COLS;
    cols.forEach(col => grid.appendChild(renderColumn(col, all)));
    el.appendChild(grid);
  }

  function renderColumn(col, all) {
    const items = all.filter(i => col.statuses.includes(i.status));
    const wrap = document.createElement('div');
    wrap.className = 'column' + (col.accent ? ' col-accent' : '');
    wrap.innerHTML = `
      <div class="column-head">
        <span class="column-title">${AI.icon(col.accent ? 'target' : iconFor(col.id), 13)} ${col.title}</span>
        <span class="column-count">${items.length}</span>
      </div>
      <div class="column-body"></div>
      ${items.length === 0 ? `<div class="column-hint">${col.hint}</div>` : ''}`;
    const body = wrap.querySelector('.column-body');
    items.forEach(i => body.insertAdjacentHTML('beforeend', card(i)));
    wrap.querySelectorAll('.intent-card').forEach(c =>
      c.addEventListener('click', () => AI.Editor.openDetail(c.getAttribute('data-id'))));
    return wrap;
  }

  function iconFor(id) {
    return ({ triage: 'inbox', monitoring: 'pause', retrospective: 'archive' })[id] || 'layers';
  }

  function card(i) {
    const dl = i.deadline ? deadlineChip(i.deadline) : '';
    const conf = i.confidence && i.confidence !== 'Medium'
      ? `<span class="badge" title="confidence">${AI.app.esc(i.confidence)}</span>` : '';
    return `<div class="intent-card pri-${i.priority}" data-id="${AI.app.esc(i.id)}">
        <div class="ic-bar"></div>
        <div class="ic-desc">${AI.app.esc(i.description)}</div>
        <div class="ic-meta">
          <span class="badge src-${AI.app.slug(i.source)}">${AI.app.esc(i.source)}</span>
          <span class="badge pri-${i.priority}"><span class="dot"></span>${AI.app.esc(i.priority)}</span>
          ${dl} ${conf}
        </div>
      </div>`;
  }

  function deadlineChip(dl) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dl + 'T00:00:00');
    const over = !isNaN(d.getTime()) && d < today;
    return `<span class="ic-deadline${over ? ' over' : ''}">${AI.icon('calendar', 11)}${AI.app.esc(dl)}</span>`;
  }

  return { render };
})();
