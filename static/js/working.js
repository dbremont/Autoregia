/* ════════════════════════════════════════════════════════════
   PRS Working Memory — Browser-only working area (Todos + Notes).
   Generation captures the DELTA between the current working state
   and the last-logged baseline, producing ONE summary log record.
   The baseline is the only extra state stored to compute deltas.
   Flow is user-mediated: generate → review → approve / discard.
   ════════════════════════════════════════════════════════════ */
PRS.Working = (() => {
  const TODO_KEY = 'prs_working_todos';
  const NOTE_KEY = 'prs_working_notes';
  const BASELINE_KEY = 'prs_working_baseline';
  let noteSaveTimer = null;
  let pending = null; // proposed summary record awaiting approval

  /* ── Persistence (browser only) ─────────────────────── */
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const setKV = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const loadTodos = () => get(TODO_KEY) || [];
  const saveTodos = t => setKV(TODO_KEY, t);
  const loadNote = () => get(NOTE_KEY) || { text: '', updated_at: null };
  const loadBaseline = () => get(BASELINE_KEY) || { todos: [], note: { text: '' }, generated_at: null };
  const saveBaseline = b => setKV(BASELINE_KEY, { ...b, generated_at: new Date().toISOString() });
  const snapshot = () => ({ todos: loadTodos(), note: { text: loadNote().text || '' } });
  const genId = () => 'wm-' + Math.random().toString(36).substr(2, 7);
  const esc = s => { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  function counts() {
    const t = loadTodos();
    return { open: t.filter(x => !x.done).length, done: t.filter(x => x.done).length, total: t.length };
  }

  /* ── Todo operations ────────────────────────────────── */
  function addTodo() {
    const i = document.getElementById('wmTodoInput');
    const tx = (i?.value || '').trim();
    if (!tx) return;
    const t = loadTodos();
    t.unshift({ id: genId(), text: tx, done: false, created_at: new Date().toISOString() });
    saveTodos(t); i.value = ''; i.focus(); renderTodos(); renderActions();
  }
  function toggleTodo(id) {
    const t = loadTodos(); const x = t.find(z => z.id === id);
    if (x) { x.done = !x.done; saveTodos(t); renderTodos(); renderActions(); }
  }
  function removeTodo(id) { saveTodos(loadTodos().filter(z => z.id !== id)); renderTodos(); renderActions(); }
  function clearCompleted() { saveTodos(loadTodos().filter(t => !t.done)); renderTodos(); renderActions(); }

  function renderTodos() {
    const el = document.getElementById('wmTodoList');
    if (!el) return;
    const t = loadTodos();
    el.innerHTML = t.length ? t.map(x => `
      <div class="wm-todo ${x.done ? 'done' : ''}" data-id="${x.id}">
        <button class="wm-check" onclick="PRS.Working.toggleTodo('${x.id}')" aria-label="Toggle complete">${x.done ? PRS.icon('check', 13) : ''}</button>
        <span class="wm-todo-text">${esc(x.text)}</span>
        <button class="wm-del" onclick="PRS.Working.removeTodo('${x.id}')" aria-label="Delete todo">${PRS.icon('x', 13)}</button>
      </div>`).join('') : '<div class="wm-empty">No todos yet — add one above.</div>';
    const c = counts();
    const s = document.getElementById('wmTodoStat');
    if (s) s.textContent = `${c.open} open · ${c.done} done`;
  }

  /* ── Notes (autosaved) ──────────────────────────────── */
  function onNoteInput() {
    const ta = document.getElementById('wmNoteText');
    if (!ta) return;
    const s = document.getElementById('wmNoteStatus');
    if (s) s.textContent = 'saving…';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => saveNote(ta.value), 500);
  }
  function saveNote(text) {
    const n = { text, updated_at: new Date().toISOString() };
    setKV(NOTE_KEY, n); updSave(n.updated_at);
  }
  function updSave(u) {
    const s = document.getElementById('wmNoteStatus');
    if (!s) return;
    s.textContent = `saved ${new Date(u).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  /* ── Delta computation vs baseline ──────────────────── */
  function computeDelta() {
    const cur = snapshot(), base = loadBaseline();
    const curById = Object.fromEntries(cur.todos.map(t => [t.id, t]));
    const baseById = Object.fromEntries(base.todos.map(t => [t.id, t]));
    const added = cur.todos.filter(t => !baseById[t.id]);
    const removed = base.todos.filter(t => !curById[t.id]);
    const completed = [], reopened = [];
    cur.todos.forEach(t => {
      const b = baseById[t.id];
      if (b && b.done !== t.done) (t.done ? completed : reopened).push(t);
    });
    const noteBefore = base.note?.text || '';
    const noteAfter = cur.note?.text || '';
    const noteChanged = noteAfter.trim().length > 0 && noteAfter !== noteBefore;
    const size = added.length + removed.length + completed.length + reopened.length + (noteChanged ? 1 : 0);
    return { added, removed, completed, reopened, noteChanged, noteAfter, size };
  }

  function buildRecord(delta) {
    const parts = [];
    if (delta.added.length)    parts.push(`+ Added (${delta.added.length}): ${delta.added.map(t => t.text).join('; ')}`);
    if (delta.completed.length)parts.push(`✓ Completed (${delta.completed.length}): ${delta.completed.map(t => t.text).join('; ')}`);
    if (delta.reopened.length) parts.push(`↺ Reopened (${delta.reopened.length}): ${delta.reopened.map(t => t.text).join('; ')}`);
    if (delta.removed.length)  parts.push(`− Removed (${delta.removed.length}): ${delta.removed.map(t => t.text).join('; ')}`);
    if (delta.noteChanged)     parts.push('✎ Notes updated');
    const detail = (parts.length ? parts.join('\n') + '\n' : '') + 'Generated ' + new Date().toLocaleString();
    const content = `Working log — ${delta.size} change${delta.size === 1 ? '' : 's'}`;
    return {
      content, detail, record_type: 'Observation', status: 'Active', priority: 'Medium',
      domain: 'General', tags: ['working-memory', 'log'], state_class: 'Reflective State', confidence: 'Medium'
    };
  }

  /* ── Generation (user-mediated) ─────────────────────── */
  function generate() {
    const delta = computeDelta();
    if (delta.size === 0) { flash('No changes since last log.'); return; }
    pending = buildRecord(delta);
    openReview(pending, delta);
  }

  function openReview(rec, delta) {
    const body = document.getElementById('wmReviewBody');
    const tc = TYPE_COLORS[rec.record_type] || '#888';
    body.innerHTML = `
      <p class="wm-review-intro">
        A single log record will be created summarizing the
        <strong>${delta.size} change${delta.size === 1 ? '' : 's'}</strong> since the last log.
        On approval, the baseline advances to the current state, so the next delta
        starts fresh.
      </p>
      <div class="wm-review-card">
        <span class="rc-type" style="background:${tc}15;color:${tc};align-self:flex-start;">${rec.record_type}</span>
        <div class="wm-review-content">${esc(rec.content)}</div>
        <div class="wm-review-detail">${esc(rec.detail)}</div>
        <div class="wm-review-meta">${rec.tags.map(t => `<span class="rc-tag">#${t}</span>`).join(' ')}</div>
      </div>`;
    document.getElementById('wmReviewModal').classList.remove('hidden');
  }
  function closeReview() { document.getElementById('wmReviewModal').classList.add('hidden'); pending = null; }

  async function approve() {
    if (!pending) { closeReview(); return; }
    await PRS.Store.add({ ...pending });   // commit the reviewed delta summary
    saveBaseline(snapshot());              // advance baseline → next delta is relative to now
    closeReview(); renderTodos(); renderActions();
    flash('Log record created; baseline advanced.');
  }

  /* ── Tiny toast ─────────────────────────────────────── */
  function flash(msg) {
    const t = document.getElementById('wmToast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function renderActions() {
    const n = computeDelta().size;
    const btn = document.getElementById('wmGenBtn');
    if (btn) btn.disabled = n === 0;
    const b = document.getElementById('wmGenCount');
    if (b) b.textContent = n > 0 ? n : '';
  }

  /* ── Main render ────────────────────────────────────── */
  function render() {
    const note = loadNote(), c = counts(), bl = loadBaseline();
    const blTime = bl.generated_at ? new Date(bl.generated_at).toLocaleString() : 'never';
    return `
      <div class="content-header">
        <div><span class="eyebrow">Working Area</span><h1>Working Memory</h1></div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" id="wmGenBtn" onclick="PRS.Working.generate()">
            ${PRS.icon('inbox', 15)} Generate Log Record
            <span class="wm-gen-count" id="wmGenCount"></span>
          </button>
        </div>
      </div>
      <p class="wm-lede">
        A browser-only working area. “Generate” captures the <strong>delta</strong> since the
        last log as a single summary record — nothing is committed until you approve.
      </p>
      <p class="wm-baseline">Last log baseline: <span>${blTime}</span></p>
      <div class="grid-2 wm-grid animate-in">
        <div class="card wm-card">
          <div class="card-header">
            <h3>${PRS.icon('list', 16)} Todos</h3>
            <span class="wm-stat" id="wmTodoStat">${c.open} open · ${c.done} done</span>
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
    renderTodos(); renderActions();
    const ta = document.getElementById('wmNoteText');
    if (ta) ta.addEventListener('blur', () => { clearTimeout(noteSaveTimer); saveNote(ta.value); });
  }

  return { render, afterRender, addTodo, toggleTodo, removeTodo, clearCompleted,
           onNoteInput, generate, closeReview, approve };
})();
