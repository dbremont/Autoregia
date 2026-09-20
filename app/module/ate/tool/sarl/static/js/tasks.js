/* ════════════════════════════════════════════════════════════
    SARL Tasks — the set of text edition tasks. Three faces on
    one route: `#tasks` is the searchable journal; `#tasks/new`
    is the definition view — the first step of the documented
    review process (the markdown document first, then the set of
    checks); `#tasks/<id>` is a task's process detail, rendered
    by SARL.ReviewDetail.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Tasks = (() => {
  const v = SARL.view;
  const DIMENSIONS = [
    ['ortotipografica', 'ortotipográfica'],
    ['linguistica', 'lingüística'],
    ['estilistica', 'estilística'],
    ['terminologica', 'terminológica'],
  ];
  let detail = null;   // the task doc currently on #tasks/<id>

  // ── journal face (#tasks) ─────────────────────────────────
  function chipBar() {
    const st = SARL.Store.getState();
    const chips = [];
    if (st.state) chips.push(`<span class="filter-chip" data-clear="state">${SARL.esc(st.state)} ${SARL.icon('x', 11)}</span>`);
    if (st.language) chips.push(`<span class="filter-chip" data-clear="language">${SARL.esc(st.language)} ${SARL.icon('x', 11)}</span>`);
    if (st.q) chips.push(`<span class="filter-chip" data-clear="q">“${SARL.esc(st.q)}” ${SARL.icon('x', 11)}</span>`);
    if (!chips.length) return '';
    return `<div class="filter-chips">${chips.join('')}
      <button class="btn btn-secondary btn-sm" id="clearAll">${SARL.icon('refresh', 13)} clear all</button>
    </div>`;
  }

  function taskRow(t) {
    const name = t.title || t.excerpt;
    return `<tr data-id="${SARL.esc(t.id)}" role="button" tabindex="0" style="cursor:pointer">
      <td><div class="src-name" title="${SARL.esc(t.excerpt)}">${SARL.esc(name.slice(0, 80))}</div>
        <div class="src-id">${SARL.esc(t.id)} · ${t.chars} chars · ${t.counts ? t.counts.total : '?'} findings</div></td>
      <td>${v.statePill(t.state)}</td>
      <td><span class="dim-tag">${SARL.esc(t.language)}</span></td>
      <td class="src-ago">${SARL.Store.fmtTime(t.created_at)}</td>
    </tr>`;
  }

  function renderJournal() {
    const st = SARL.Store.getState();
    const pg = SARL.Store.getPaging();
    const rows = SARL.Store.tasksPage();
    const summary = SARL.Store.filterSummary();
    const pager = `<div class="pager animate-in">
        <button class="btn btn-secondary btn-sm" id="pagePrev" ${pg.page > 1 ? '' : 'disabled'}>${SARL.icon('chevron-left', 14)} prev</button>
        <span class="results-meta">page ${pg.page}</span>
        <button class="btn btn-secondary btn-sm" id="pageNext" ${pg.has_more ? '' : 'disabled'}>next ${SARL.icon('chevron-right', 14)}</button>
      </div>`;
    const list = !rows.length
      ? '<div class="empty-state">no tasks in this slice of the set — define the first one</div>'
      : `<table class="src-table"><thead><tr><th>Task</th><th>State</th><th>Language</th><th>Defined</th></tr></thead><tbody>${rows.map(taskRow).join('')}</tbody></table>${pager}`;
    return `
      ${v.header('Tasks', `<button class="btn btn-primary btn-sm" id="tkNew">${SARL.icon('plus', 14)} New Task</button>`)}
      <form class="search-bar animate-in" id="tasksForm">
        <div class="search-input-wrap">
          <span class="search-icon">${SARL.icon('search', 15)}</span>
          <input type="search" id="tasksQ" placeholder="Search tasks — title, content, rule fired…" value="${SARL.esc(st.q || '')}" aria-label="Search tasks">
        </div>
        <div class="seg" role="group" aria-label="state filter">
          ${['', 'created', 'reviewed', 'applied', 'discarded'].map(s => `<button type="button" class="seg-btn ${st.state === s || (!st.state && !s) ? 'active' : ''}" data-taskstate="${s}">${s || 'all'}</button>`).join('')}
        </div>
        <select id="tasksLang" class="src-select" aria-label="Filter by language">
          <option value="">all languages</option>
          ${['es', 'en'].map(l => `<option value="${l}" ${st.language === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button type="submit" class="btn btn-primary">${SARL.icon('search', 15)} Search</button>
      </form>
      <div class="search-controls animate-in">
        <span class="results-meta">${`${rows.length} in view${summary ? ` · filter: ${summary}` : ''}`}</span>
        <button class="btn btn-ghost btn-sm" id="tkClear" title="Clear the whole set">${SARL.icon('trash-2', 13)} clear log</button>
      </div>
      ${chipBar()}
      <div class="chart-card animate-in">${list}</div>`;
  }

  // ── definition face (#tasks/new) — the first process step ──
  function renderDefine() {
    return `
      ${v.header('New Task', `<a href="#tasks" class="back-link">← all tasks</a>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The first step of the documented review process: write the <strong>markdown document</strong>, then declare the set of checks it must face. Defining journals the task in <em>created</em> — the review itself runs from the task detail.</p>
      <form id="defineForm" class="define-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">step one</span><h3>The document</h3></div></div>
          <div class="form-row-sarl">
            <div class="form-group"><label for="ntTitle">title <span class="text-muted">(optional)</span></label>
              <input id="ntTitle" type="text" maxlength="200" placeholder="e.g. README — draft 2"></div>
            <div class="form-group"><label for="ntLanguage">language</label>
              <select id="ntLanguage">
                <option value="es">es — español</option>
                <option value="en">en — English</option>
              </select></div>
            <div class="form-group"><label for="ntRegister">register</label>
              <select id="ntRegister">
                <option value="">— none —</option>
                <option value="technical">technical</option>
                <option value="formal">formal</option>
                <option value="editorial">editorial</option>
                <option value="personal">personal</option>
              </select></div>
          </div>
          <div class="form-group"><label for="ntContent">the document — markdown</label>
            <div class="md-editor md-editor-page">
              <div class="md-toolbar">
                <div class="seg" id="mdTabs" role="group" aria-label="editor mode">
                  <button type="button" class="seg-btn active" data-mdtab="write">Write</button>
                  <button type="button" class="seg-btn" data-mdtab="preview">Preview</button>
                </div>
                <div class="md-tools" id="mdTools">
                  <button type="button" class="md-tool" data-md="h2" title="Heading">H2</button>
                  <button type="button" class="md-tool" data-md="bold" title="Bold"><strong>B</strong></button>
                  <button type="button" class="md-tool" data-md="italic" title="Italic"><em>I</em></button>
                  <button type="button" class="md-tool" data-md="code" title="Inline code">‹›</button>
                  <button type="button" class="md-tool" data-md="link" title="Link">link</button>
                  <button type="button" class="md-tool" data-md="list" title="List">• list</button>
                </div>
              </div>
              <div id="mdWrite">
                <textarea id="ntContent" class="md-ta" placeholder="# Título&#10;&#10;Escribe aquí el documento en markdown — el motor nunca corrige dentro de código, enlaces ni marcas." required></textarea>
              </div>
              <div id="mdPreview" class="md-preview hidden"></div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">step two</span><h3>The checks</h3></div></div>
          <div class="form-group"><label>criteria · dimensions</label>
            <div class="check-list" id="ntDims">
              ${DIMENSIONS.map(([d, label]) => `
                <label><input type="checkbox" value="${d}" checked> ${label}</label>`).join('')}
            </div>
            <span class="form-hint">each dimension engages its rule packs at review time</span>
          </div>
          <div class="form-group"><label>criteria · glossaries to enforce</label>
            <div class="check-list" id="ntGlossaries"><div class="empty-inline">loading…</div></div>
            <span class="form-hint">forbidden terms raise errors; aliases, warnings</span>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="ntSave" style="margin-top:var(--space-2)">${SARL.icon('check', 15)} Define task</button>
          <div class="form-hint" style="margin-top:var(--space-2)">defining does not run the review — run it from the task detail</div>
        </div>
      </form>`;
  }

  function drawGlossaryChecks() {
    const gs = SARL.Store.glossaries();
    document.getElementById('ntGlossaries').innerHTML = gs.length
      ? gs.map(g => `
        <label><input type="checkbox" value="${SARL.esc(g.id)}" ${g.enabled ? 'checked' : ''}>
          ${SARL.esc(g.name)} <span class="text-muted">· ${g.entry_count || (g.entries || []).length} entries</span></label>`).join('')
      : '<div class="empty-inline">no glossaries — create one in Authorities</div>';
  }

  function bindDefine() {
    drawGlossaryChecks();
    const ta = document.getElementById('ntContent');
    const preview = document.getElementById('mdPreview');
    // Write | Preview over the shared renderer
    const renderPreview = () => { preview.innerHTML = AUTOREGIA.Markdown.render(ta.value || ''); };
    document.querySelectorAll('[data-mdtab]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-mdtab]').forEach(x => x.classList.toggle('active', x === b));
      const showPreview = b.dataset.mdtab === 'preview';
      document.getElementById('mdWrite').classList.toggle('hidden', showPreview);
      preview.classList.toggle('hidden', !showPreview);
      if (showPreview) renderPreview();
    }));
    // toolbar insertions at the cursor
    const wrap = (before, after = before) => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e) || (after === before ? '' : 'text');
      ta.setRangeText(before + sel + after, s, e, 'select');
      ta.focus();
    };
    const linePrefix = (prefix) => {
      const s = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      ta.setRangeText(prefix, s, s, 'end');
      ta.focus();
    };
    document.querySelectorAll('[data-md]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.md;
      if (a === 'h2') linePrefix('## ');
      else if (a === 'list') linePrefix('- ');
      else if (a === 'bold') wrap('**');
      else if (a === 'italic') wrap('*');
      else if (a === 'code') wrap('`');
      else if (a === 'link') wrap('[', '](https://)');
    }));
    document.getElementById('defineForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const content = ta.value;
      if (!content.trim()) { SARL.toast('the document is required'); ta.focus(); return; }
      const dims = [...document.querySelectorAll('#ntDims input:checked')].map(x => x.value);
      if (!dims.length) { SARL.toast('at least one dimension is required'); return; }
      const gids = [...document.querySelectorAll('#ntGlossaries input:checked')].map(x => x.value);
      try {
        const task = await SARL.Store.createTask({
          title: document.getElementById('ntTitle').value.trim() || null,
          content,
          language: document.getElementById('ntLanguage').value,
          register: document.getElementById('ntRegister').value || null,
          glossary_ids: gids,
          dimensions: dims,
        });
        SARL.toast(`task ${task.id} defined — run its review from the detail`);
        showTask(task.id);
      } catch (e) { SARL.toast(e.message); }
    });
    ta.focus();
  }

  // ── detail face (#tasks/<id>) ─────────────────────────────
  function renderDetailHost(sub) {
    return `<div id="taskDetailRoot" data-task="${SARL.esc(sub)}">
      <div class="empty-state">loading the task…</div></div>`;
  }

  function render(sub) {
    if (sub === 'new') return renderDefine();
    return sub ? renderDetailHost(sub) : renderJournal();
  }

  async function drawDetail(sub) {
    const root = document.getElementById('taskDetailRoot');
    if (!root) return;
    try {
      detail = await SARL.Store.task_(sub);
    } catch (e) {
      root.innerHTML = `<div class="empty-state">
        <h3>task not found</h3>
        <p><a class="back-link" href="#tasks">← all tasks</a></p></div>`;
      return;
    }
    root.innerHTML = SARL.ReviewDetail.render(detail);
    SARL.ReviewDetail.bind(refreshDetail);
  }

  async function refreshDetail() {
    if (!detail) { SARL.navigate('tasks'); return; }
    try {
      detail = await SARL.Store.task_(detail.id);
      await SARL.Store.loadTasks();
    } catch (e) { SARL.toast(e.message); }
    const root = document.getElementById('taskDetailRoot');
    if (!root) { SARL.navigate('tasks'); return; }
    root.innerHTML = SARL.ReviewDetail.render(detail);
    SARL.ReviewDetail.bind(refreshDetail);
  }

  function clearDetail() { detail = null; SARL.navigate('tasks'); }

  async function showTask(id) { SARL.navigate('tasks/' + id); }

  // ── journal events ────────────────────────────────────────
  async function run(patch) {
    await SARL.Store.applyFilter(patch);
    SARL.navigate('tasks');
  }

  function afterRender(sub) {
    if (sub === 'new') { bindDefine(); return; }
    if (sub) { drawDetail(sub); return; }
    document.getElementById('tkNew')?.addEventListener('click', () => SARL.navigate('tasks/new'));
    document.getElementById('tasksForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      run({
        q: document.getElementById('tasksQ').value.trim() || null,
        language: document.getElementById('tasksLang').value || null,
      });
    });
    document.querySelectorAll('[data-taskstate]').forEach(b => b.addEventListener('click', () => {
      run({ state: b.dataset.taskstate || null });
    }));
    document.querySelectorAll('[data-clear]').forEach(c => c.addEventListener('click', () => run({ [c.dataset.clear]: null })));
    document.getElementById('clearAll')?.addEventListener('click', () => { SARL.Store.resetFilter(); run({}); });
    document.getElementById('pagePrev')?.addEventListener('click', () => SARL.Store.prevPage().then(() => SARL.navigate('tasks')));
    document.getElementById('pageNext')?.addEventListener('click', () => SARL.Store.nextPage().then(() => SARL.navigate('tasks')));
    document.getElementById('tkClear')?.addEventListener('click', async () => {
      const ok = await SARL.confirm({
        title: 'Clear the task set?',
        message: 'Every text edition task, its findings, and its evidence are deleted. The audit trail stays.',
        confirmText: 'Clear',
      });
      if (!ok) return;
      try {
        await SARL.Store.clearTasks();
        SARL.toast('journal cleared');
        await SARL.Store.loadTasks();
        SARL.navigate('tasks');
      } catch (e) { SARL.toast(e.message); }
    });
    document.querySelectorAll('tr[data-id]').forEach(tr =>
      tr.addEventListener('click', () => { location.hash = '#tasks/' + tr.dataset.id; }));
  }

  return { render, afterRender, showTask, clearDetail };
})();
