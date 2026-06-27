/* ════════════════════════════════════════════════════════════
   PRS Working Memory — Browser-only working area (Todos + Notes)
   Supports user-mediated generation of formal PRS log records.
   ════════════════════════════════════════════════════════════ */
PRS.Working = (() => {
  const TODO_KEY = 'prs_working_todos';
  const NOTE_KEY = 'prs_working_notes';
  let noteSaveTimer = null;
  const reviewSel = {};

  /* ── Persistence (browser only) ─────────────────────── */
  function loadTodos() {
    try { return JSON.parse(localStorage.getItem(TODO_KEY)) || []; }
    catch { return []; }
  }
  function saveTodos(todos) {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  }
  function loadNote() {
    try {
      const n = JSON.parse(localStorage.getItem(NOTE_KEY));
      return n || { text: '', updated_at: null };
    } catch { return { text: '', updated_at: null }; }
  }
  function saveNote(text) {
    const note = { text, updated_at: new Date().toISOString() };
    localStorage.setItem(NOTE_KEY, JSON.stringify(note));
    updateSaveStatus(note.updated_at);
  }

  function genId() {
    return 'wm-' + Math.random().toString(36).substr(2, 7);
  }

  function esc(s) {
    if (!s) return '';
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  function counts() {
    const todos = loadTodos();
    return {
      open: todos.filter(t => !t.done).length,
      done: todos.filter(t => t.done).length,
      logged: todos.filter(t => t.logged).length,
      total: todos.length
    };
  }

  /* ── Todo operations ────────────────────────────────── */
  function addTodo() {
    const input = document.getElementById('wmTodoInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    const todos = loadTodos();
    todos.unshift({ id: genId(), text, done: false, logged: false, created_at: new Date().toISOString() });
    saveTodos(todos);
    input.value = '';
    input.focus();
    renderTodos();
    renderActions();
  }
  function toggleTodo(id) {
    const todos = loadTodos();
    const t = todos.find(x => x.id === id);
    if (t) { t.done = !t.done; saveTodos(todos); renderTodos(); renderActions(); }
  }
  function removeTodo(id) {
    saveTodos(loadTodos().filter(x => x.id !== id));
    renderTodos();
    renderActions();
  }
  function clearCompleted() {
    saveTodos(loadTodos().filter(t => !(t.done && !t.logged)));
    renderTodos();
    renderActions();
  }

  function renderTodos() {
    const el = document.getElementById('wmTodoList');
    if (!el) return;
    const todos = loadTodos();
    if (!todos.length) {
      el.innerHTML = '<div class="wm-empty">No todos yet — add one above.</div>';
    } else {
      el.innerHTML = todos.map(t => `
        <div class="wm-todo ${t.done ? 'done' : ''} ${t.logged ? 'logged' : ''}" data-id="${t.id}">
          <button class="wm-check" onclick="PRS.Working.toggleTodo('${t.id}')" aria-label="Toggle complete">
            ${t.done ? PRS.icon('check', 13) : ''}
          </button>
          <span class="wm-todo-text">${esc(t.text)}</span>
          ${t.logged ? '<span class="wm-logged-badge">logged</span>' : ''}
          <button class="wm-del" onclick="PRS.Working.removeTodo('${t.id}')" aria-label="Delete todo">${PRS.icon('x', 13)}</button>
        </div>
      `).join('');
    }
    const c = counts();
    const stat = document.getElementById('wmTodoStat');
    if (stat) stat.textContent = `${c.open} open · ${c.done} done${c.logged ? ` · ${c.logged} logged` : ''}`;
  }

  /* ── Action bar state ───────────────────────────────── */
  function renderActions() {
    const candidates = countCandidates(loadTodos(), loadNote());
    const btn = document.getElementById('wmGenBtn');
    if (btn) {
      btn.disabled = candidates === 0;
      const badge = document.getElementById('wmGenCount');
      if (badge) badge.textContent = candidates > 0 ? candidates : '';
    }
  }
  function countCandidates(todos, note) {
    const t = Array.isArray(todos) ? todos : loadTodos();
    const n = note || loadNote();
    let c = t.filter(x => !x.logged).length;
    if (n.text && n.text.trim()) c++;
    return c;
  }

  /* ── Record generation (user-mediated) ──────────────── */
  function generate() {
    const candidates = buildCandidates(loadTodos(), loadNote());
    if (!candidates.length) { flash('Nothing to generate yet.'); return; }
    openReview(candidates);
  }

  function buildCandidates(todos, note) {
    const candidates = [];
    const tag = 'working-memory';
    const unlogged = todos.filter(t => !t.logged);
    unlogged.forEach(t => {
      candidates.push({
        sourceId: t.id, kind: 'todo',
        record: {
          content: t.text, detail: '', record_type: 'Task',
          status: t.done ? 'Completed' : 'Active', priority: 'Medium',
          domain: 'General', tags: [tag], state_class: 'Task State', confidence: 'Medium'
        }
      });
    });
    if (note.text && note.text.trim()) {
      candidates.push({
        sourceId: 'note', kind: 'note',
        record: {
          content: summarizeNote(note.text), detail: note.text.trim(),
          record_type: 'Observation', status: 'Active', priority: 'Medium',
          domain: 'General', tags: [tag], state_class: 'Reflective State', confidence: 'Medium'
        }
      });
    }
    return candidates;
  }

  function summarizeNote(text) {
    const first = text.trim().split('\n')[0];
    return first.length > 70 ? first.slice(0, 67) + '…' : first;
  }

  /* ── Notes (autosaved) ──────────────────────────────── */
  function onNoteInput() {
    const ta = document.getElementById('wmNoteText');
    if (!ta) return;
    const status = document.getElementById('wmNoteStatus');
    if (status) status.textContent = 'saving…';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => saveNote(ta.value), 500);
  }
  function updateSaveStatus(updatedAt) {
    const status = document.getElementById('wmNoteStatus');
    if (!status) return;
    const time = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    status.textContent = `saved ${time}`;
  }

  function openReview(candidates) {
    const body = document.getElementById('wmReviewBody');
    const count = candidates.length;
    body.innerHTML = `
      <p class="wm-review-intro">
        Review the ${count} record${count === 1 ? '' : 's'} proposed from your working area.
        Toggle which to commit, then <strong>Approve</strong> to persist them as formal PRS records
        or <strong>Discard</strong> to leave working-memory unchanged.
      </p>
      <div class="wm-review-list">
        ${candidates.map((c, i) => reviewCardHTML(c, i)).join('')}
      </div>`;
    for (const k in reviewSel) delete reviewSel[k];
    candidates.forEach((_, i) => { reviewSel[i] = true; });
    updateReviewCount();
    document.getElementById('wmReviewModal').classList.remove('hidden');
  }

  function reviewCardHTML(c, i) {
    const r = c.record;
    const tc = TYPE_COLORS[r.record_type] || '#888';
    return `
      <div class="wm-review-card" data-idx="${i}">
        <label class="wm-review-check">
          <input type="checkbox" checked onchange="PRS.Working.toggleReviewSel(${i})">
          <span class="rc-type" style="background:${tc}15;color:${tc};">${r.record_type}</span>
        </label>
        <div class="wm-review-body">
          <div class="wm-review-content">${esc(r.content)}</div>
          ${r.detail ? `<div class="wm-review-detail">${esc(r.detail)}</div>` : ''}
          <div class="wm-review-meta">
            <span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>
            ${r.tags.map(t => `<span class="rc-tag">#${t}</span>`).join(' ')}
          </div>
        </div>
      </div>`;
  }

  function toggleReviewSel(i) { reviewSel[i] = !reviewSel[i]; updateReviewCount(); }
  function updateReviewCount() {
    const sel = Object.keys(reviewSel).filter(k => reviewSel[k]).length;
    const btn = document.getElementById('wmApproveBtn');
    if (btn) btn.disabled = sel === 0;
  }
  function closeReview() {
    document.getElementById('wmReviewModal').classList.add('hidden');
    for (const k in reviewSel) delete reviewSel[k];
  }

  async function approve() {
    const candidates = buildCandidates(loadTodos(), loadNote());
    const todos = loadTodos();
    let created = 0;
    const loggedTodoIds = new Set();
    let noteApproved = false;
    for (let i = 0; i < candidates.length; i++) {
      if (!reviewSel[i]) continue;
      const c = candidates[i];
      await PRS.Store.add({ ...c.record });
      created++;
      if (c.kind === 'todo') loggedTodoIds.add(c.sourceId);
      if (c.kind === 'note') noteApproved = true;
    }
    if (loggedTodoIds.size) {
      saveTodos(todos.map(t => loggedTodoIds.has(t.id) ? { ...t, logged: true } : t));
    }
    if (noteApproved) localStorage.removeItem(NOTE_KEY);
    closeReview();
    renderTodos();
    const ta = document.getElementById('wmNoteText');
    if (ta && noteApproved) { ta.value = ''; const s = document.getElementById('wmNoteStatus'); if (s) s.textContent = 'empty'; }
    renderActions();
    flash(`${created} record${created === 1 ? '' : 's'} created from working memory.`);
  }

  /* ── Tiny toast ─────────────────────────────────────── */
  function flash(msg) {
    const t = document.getElementById('wmToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ── Main render ────────────────────────────────────── */
  function render() {
    const note = loadNote();
    const c = counts();
    return `
      <div class="content-header">
        <div>
          <span class="eyebrow">Working Area</span>
          <h1>Working Memory</h1>
        </div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" id="wmGenBtn" onclick="PRS.Working.generate()">
            ${PRS.icon('inbox', 15)} Generate Log Records
            <span class="wm-gen-count" id="wmGenCount"></span>
          </button>
        </div>
      </div>
      <p class="wm-lede">
        A lightweight, browser-only working area for todos and notes.
        Nothing here is a formal record until you <strong>generate</strong> it
        and approve the proposal.
      </p>
      <div class="grid-2 wm-grid animate-in">
        <div class="card wm-card">
          <div class="card-header">
            <h3>${PRS.icon('list', 16)} Todos</h3>
            <span class="wm-stat" id="wmTodoStat">${c.open} open · ${c.done} done${c.logged ? ` · ${c.logged} logged` : ''}</span>
          </div>
          <div class="wm-todo-add">
            <input type="text" id="wmTodoInput" placeholder="Add a todo, press Enter…" onkeydown="if(event.key==='Enter'){event.preventDefault();PRS.Working.addTodo();}">
            <button class="btn btn-secondary btn-sm" onclick="PRS.Working.addTodo()">${PRS.icon('plus', 14)} Add</button>
          </div>
          <div class="wm-todo-list" id="wmTodoList"></div>
          <div class="wm-card-footer">
            <button class="btn btn-ghost btn-sm" onclick="PRS.Working.clearCompleted()">${PRS.icon('x', 13)} Clear completed</button>
          </div>
        </div>
        <div class="card wm-card">
          <div class="card-header">
            <h3>${PRS.icon('file-text', 16)} Working Notes</h3>
            <span class="wm-stat" id="wmNoteStatus">${note.updated_at ? 'saved ' + new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'empty'}</span>
          </div>
          <textarea id="wmNoteText" class="wm-note" placeholder="Jot working thoughts, fragments, context… autosaved to this browser." oninput="PRS.Working.onNoteInput()">${esc(note.text || '')}</textarea>
        </div>
      </div>
      <div class="wm-toast" id="wmToast"></div>`;
  }

  function afterRender() {
    renderTodos();
    renderActions();
    const ta = document.getElementById('wmNoteText');
    if (ta) ta.addEventListener('blur', () => { clearTimeout(noteSaveTimer); saveNote(ta.value); });
  }

  return { render, afterRender, addTodo, toggleTodo, removeTodo, clearCompleted,
           onNoteInput, generate, toggleReviewSel, closeReview, approve };
})();

