/* ════════════════════════════════════════════════════════════
   CTES Task Specs — registered intents that reference a handle
   directly: objective, payload template, expected output,
   constraints. Emitting a spec resolves its handler and runs it
   synchronously; the run records which spec produced it.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Tasks = (() => {
  const v = CTES.view;
  let selectedId = null, selected = null, editing = false;

  function handlerName(id) {
    const h = CTES.Store.handleById(id);
    return h ? h.id : `${id} (unregistered)`;
  }

  function render() {
    const specs = CTES.Store.specs();
    const table = !specs.length
      ? '<div class="empty-state">no task specs — register an intent below</div>'
      : `<table class="src-table"><thead><tr><th>Spec</th><th>Handler</th><th>Priority</th><th>Timeout</th><th>Mode</th></tr></thead><tbody>
        ${specs.map(s => `<tr data-id="${CTES.esc(s.id)}" role="button" tabindex="0" style="cursor:pointer${s.id === selectedId ? ';background:rgba(122,26,42,.05)' : ''}">
          <td><div class="src-src-names"><div class="src-name">${CTES.esc(s.objective)}</div><div class="src-id">${CTES.esc(s.id)}</div></div></td>
          <td class="src-id">${CTES.esc(handlerName(s.handler_id))}</td>
          <td>${CTES.esc(s.priority || 'normal')}</td>
          <td class="src-num">${CTES.Store.fmtDur(((s.constraints || {}).timeout_s || 60) * 1000)}</td>
          <td class="src-ago">${CTES.esc(s.temporal_mode || 'sync')}</td>
        </tr>`).join('')}</tbody></table>`;
    return `
      ${v.header('Task Specs', `<button class="btn btn-primary btn-sm" id="taskToggle">${CTES.icon('edit', 14)} New spec</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">A task spec is the stable description of work — <em>what</em> is to be accomplished and under which constraints — bound to a <strong>handle</strong>, the code that knows <em>how</em>. Emitters submit specs; the register evolves independently of them.</p>
      <div class="chart-card animate-in" id="taskFormCard" style="display:${editing ? '' : 'none'}">
        <div class="chart-head"><div><span class="eyebrow">${selected ? 'edit' : 'registration'}</span><h3 id="taskFormTitle">${selected ? `Update '${CTES.esc(selected.id)}'` : 'Register a task spec'}</h3></div></div>
        <form id="taskForm" class="form-grid-ctes">
          <div class="form-group"><label for="tHandler">handler · id</label>
            <select id="tHandler" required>${CTES.Store.handles().map(h => `<option value="${CTES.esc(h.id)}" ${selected && selected.handler_id === h.id ? 'selected' : ''}>${CTES.esc(h.id)} — ${CTES.esc(h.name || '')}</option>`).join('')}</select>
            <span class="form-hint">the direct reference — the code that runs</span></div>
          <div class="form-group"><label for="tPriority">priority</label>
            <select id="tPriority">${['normal', 'low', 'high'].map(p => `<option ${selected && (selected.priority || 'normal') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
          <div class="form-group" style="grid-column:1/-1"><label for="tObjective">objective</label><input id="tObjective" required placeholder="What is to be accomplished." value="${CTES.esc(selected ? selected.objective : '')}"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="tExpected">expected output</label><input id="tExpected" placeholder="What a completed run should produce." value="${CTES.esc(selected ? (selected.expected_output || '') : '')}"></div>
          <div class="form-group"><label for="tTimeout">timeout · s</label><input id="tTimeout" type="number" min="1" max="600" value="${selected ? ((selected.constraints || {}).timeout_s || 60) : ''}" placeholder="default from settings"></div>
          <div class="form-group"><label for="tDeadline">deadline · s (soft)</label><input id="tDeadline" type="number" min="0" value="${selected ? ((selected.constraints || {}).deadline_s ?? '') : ''}" placeholder="—"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="tPayload">payload template · JSON</label><textarea id="tPayload" rows="4" spellcheck="false">${selected ? CTES.esc(JSON.stringify(selected.payload || {}, null, 2)) : '{}'}</textarea></div>
          <div style="grid-column:1/-1;display:flex;gap:10px">
            <button type="submit" class="btn btn-primary btn-sm">${selected ? 'Save' : 'Register spec'}</button>
            ${selected ? '<button type="button" class="btn btn-secondary btn-sm" id="tNew">New instead</button>' : ''}
          </div>
        </form>
      </div>
      <div class="chart-card animate-in">${table}</div>
      <div class="chart-card animate-in" id="taskDetailCard" style="display:none"></div>`;
  }

  function renderDetailCard(s) {
    const runs = s.runs || [];
    return `
      <div class="chart-head">
        <div><span class="eyebrow">spec detail</span><h3>${CTES.esc(s.objective)}</h3></div>
        <button class="btn-icon" id="taskDetailClose" aria-label="Close">${CTES.icon('x', 16)}</button>
      </div>
      <div class="duo-grid">
        <div class="meta-table">
          ${mrow('id', `<code class="text-mono text-xs">${CTES.esc(s.id)}</code>`)}
          ${mrow('handler', `<a href="#handlers/${CTES.esc(s.handler_id)}" class="text-mono text-xs">${CTES.esc(handlerName(s.handler_id))}</a>`)}
          ${mrow('expected output', CTES.esc(s.expected_output || '—'))}
          ${mrow('priority · mode', `${CTES.esc(s.priority || 'normal')} · ${CTES.esc(s.temporal_mode || 'sync')}`)}
          ${mrow('constraints', `timeout ${CTES.Store.fmtDur(((s.constraints || {}).timeout_s || 60) * 1000)}${(s.constraints || {}).deadline_s ? ` · deadline ${CTES.Store.fmtDur(s.constraints.deadline_s * 1000)}` : ''}`)}
          ${mrow('registered', CTES.Store.fmtTime(s.created_at))}
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom:4px">payload template</div>
          <pre class="code-view">${CTES.esc(JSON.stringify(s.payload || {}, null, 2))}</pre>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-primary btn-sm" id="tEmit" ${(CTES.Store.handleById(s.handler_id) || {}).status === 'inactive' ? 'disabled title="handler inactive"' : ''}>${CTES.icon('play', 13)} Emit now</button>
            <button class="btn btn-secondary btn-sm" id="tEdit">${CTES.icon('edit', 13)} Edit</button>
            <button class="btn btn-ghost btn-sm" id="tDelete" style="color:var(--color-danger,#A33434)">${CTES.icon('trash-2', 13)} Delete</button>
          </div>
          <div class="form-hint" id="tEmitStatus" style="margin-top:6px"></div>
        </div>
      </div>
      <div class="eyebrow" style="margin:10px 0 4px">recent runs of this spec</div>
      ${!runs.length ? '<div class="empty-state">never emitted</div>' :
        `<table class="src-table"><tbody>${runs.map(r => `
          <tr data-run="${CTES.esc(r.id)}" role="button" tabindex="0" style="cursor:pointer">
            <td class="src-id">${CTES.esc(r.id)}</td>
            <td><span class="pill" style="${r.status === 'completed' ? 'color:#3F6E50' : 'color:#A33434'}">${CTES.esc(r.status)}</span></td>
            <td class="src-num">${CTES.Store.fmtDur(r.duration_ms)}</td>
            <td class="src-ago">${CTES.Store.fmtTime(r.started_at)}</td>
          </tr>`).join('')}</tbody></table>`}`;
  }
  function mrow(k, val) { return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`; }

  async function select(id) {
    try {
      selected = await fetch(`api/tasks/${id}`).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      selectedId = id;
      CTES.navigate('tasks');
    } catch (e) { CTES.toast(e.message); }
  }

  function afterRender() {
    document.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => select(tr.dataset.id)));
    document.getElementById('taskToggle')?.addEventListener('click', () => {
      selected = null; selectedId = null; editing = true;
      CTES.navigate('tasks');
      setTimeout(() => document.getElementById('taskFormCard')?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    document.getElementById('tNew')?.addEventListener('click', () => { selected = null; selectedId = null; CTES.navigate('tasks'); });

    document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      let payload;
      try { payload = JSON.parse(document.getElementById('tPayload').value || '{}'); }
      catch (err) { CTES.toast('payload template is not valid JSON: ' + err.message); return; }
      const body = {
        handler_id: document.getElementById('tHandler').value,
        objective: document.getElementById('tObjective').value,
        expected_output: document.getElementById('tExpected').value,
        priority: document.getElementById('tPriority').value,
        payload,
        constraints: {
          timeout_s: document.getElementById('tTimeout').value || undefined,
          deadline_s: document.getElementById('tDeadline').value || undefined,
        },
      };
      try {
        if (selected) { await CTES.Store.updateSpec(selected.id, body); CTES.toast('spec updated'); }
        else { const s = await CTES.Store.createSpec(body); CTES.toast(`spec ${s.id} registered`); }
        await CTES.Store.loadSpecs();
        selected = null; selectedId = null; editing = false;
        CTES.navigate('tasks');
      } catch (err) { CTES.toast(err.message); }
    });

    const card = document.getElementById('taskDetailCard');
    if (selected && card) {
      card.style.display = '';
      card.innerHTML = renderDetailCard(selected);
      card.querySelector('#taskDetailClose')?.addEventListener('click', () => { selected = null; selectedId = null; CTES.navigate('tasks'); });
      card.querySelectorAll('tr[data-run]').forEach(tr => tr.addEventListener('click', () => {
        CTES.navigate('runs'); setTimeout(() => CTES.Runs.showRun(tr.dataset.run), 80);
      }));
      card.querySelector('#tEdit')?.addEventListener('click', () => { editing = true; CTES.navigate('tasks'); setTimeout(() => document.getElementById('taskFormCard')?.scrollIntoView({ behavior: 'smooth' }), 80); });
      card.querySelector('#tDelete')?.addEventListener('click', async () => {
        const yes = await CTES.confirm({
          title: 'Delete task spec',
          message: `Delete spec '${selected.id}'? Past runs keep their reference to it.`,
          confirmText: 'Delete',
        });
        if (!yes) return;
        try { await CTES.Store.deleteSpec(selected.id); CTES.toast('spec deleted'); await CTES.Store.loadSpecs(); selected = null; selectedId = null; CTES.navigate('tasks'); }
        catch (e) { CTES.toast(e.message); }
      });
      card.querySelector('#tEmit')?.addEventListener('click', async () => {
        const status = card.querySelector('#tEmitStatus');
        status.textContent = 'emitting — resolving handler, dispatching…';
        try {
          const run = await CTES.Store.emitSpec(selected.id);
          status.innerHTML = `run <a href="#runs" class="text-mono text-xs" id="emitRunLink">${CTES.esc(run.id)}</a> — ${CTES.esc(run.status)}`;
          document.getElementById('emitRunLink')?.addEventListener('click', (e) => {
            e.preventDefault(); CTES.navigate('runs'); setTimeout(() => CTES.Runs.showRun(run.id), 80);
          });
        } catch (e) { status.textContent = e.message; }
      });
    }
  }

  return { render, afterRender };
})();
