/* ════════════════════════════════════════════════════════════
   ACSMS Skill Paths — ordered curricula that sequence skills
   into programs. Each path card shows derived progress (share of
   members with practice) and a stepper whose current step is the
   first member still needing work. Define/edit happens in a
   modal with an ordered skill picker.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Paths = {
  render() {
    const actions = `<button class="btn btn-primary btn-sm" id="definePathBtn">${ACSMS.icon('plus', 15)} Define path</button>`;
    return `<div class="animate-in">${ACSMS.view.header('Skill Paths', actions)}
      <p class="catalog-lede">Ordered curricula: sequence skills into programs, follow the current step, and let progress emerge from the practice stream.</p>
      </div>
      <div class="path-grid" id="pathGrid"></div>`;
  },

  cardHTML(p) {
    const archived = (p.status || 'active') === 'archived';
    const steps = p.members.map((m, i) => {
      const done = m.practice_count > 0;
      const current = p.current_step === i;
      const cls = current ? 'current' : (done ? 'done' : 'todo');
      return `<button class="step ${cls}" data-skill="${m.id}" title="${m.state} · level ${m.level}/5">
        <span class="step-dot">${done ? ACSMS.icon('check', 12) : i + 1}</span>
        <span class="step-body">
          <span class="step-name">${ACSMS.esc(m.name)}</span>
          <span class="step-sub">${current ? 'current · ' : ''}${m.state} · lvl ${m.level}/5</span>
        </span>
        ${current && !archived ? `<span class="step-act">log practice ${ACSMS.icon('arrow-right', 12)}</span>` : ''}
      </button>`;
    }).join('');
    return `<div class="path-card animate-in" data-id="${p.id}">
      <div class="path-head">
        <div>
          <h3>${ACSMS.esc(p.name)}</h3>
          ${p.description ? `<p class="path-desc">${ACSMS.esc(p.description)}</p>` : ''}
        </div>
        <div class="path-actions">
          ${archived ? '<span class="pill">archived</span>' : ''}
          <button class="btn-icon" data-edit="${p.id}" title="Edit path" aria-label="Edit path">${ACSMS.icon('pencil', 14)}</button>
          <button class="btn-icon" data-lifecycle="${p.id}" title="${archived ? 'Restore' : 'Archive'}" aria-label="Archive path">${ACSMS.icon(archived ? 'play' : 'archive', 14)}</button>
          <button class="btn-icon" data-del="${p.id}" title="Delete path" aria-label="Delete path">${ACSMS.icon('trash-2', 14)}</button>
        </div>
      </div>
      <div class="path-progress">
        <div class="lvl-bar"><i style="width:${p.completion_pct}%"></i></div>
        <span class="num">${p.practiced_count}/${p.members.length} practiced · ${p.completion_pct}%</span>
      </div>
      <div class="stepper">${steps || '<p class="rail-empty">Empty path — edit it to add skills.</p>'}</div>
    </div>`;
  },

  renderCards() {
    const grid = document.getElementById('pathGrid');
    if (!grid) return;
    const paths = ACSMS.Store.paths();
    grid.innerHTML = paths.length
      ? paths.map(p => this.cardHTML(p)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><h3>No paths defined</h3>
         <p>A path sequences skills into a deliberate program — define one and pick the skills, in order.</p></div>`;
    grid.querySelectorAll('.path-card [data-skill]').forEach(b =>
      b.addEventListener('click', () => {
        if (b.classList.contains('current')) ACSMS.capture.open(b.dataset.skill);
        ACSMS.navigate('skills/' + b.dataset.skill);
      }));
    grid.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => this.openModal(ACSMS.Store.pathById(b.dataset.edit))));
    grid.querySelectorAll('[data-lifecycle]').forEach(b =>
      b.addEventListener('click', async () => {
        const p = ACSMS.Store.pathById(b.dataset.lifecycle);
        const status = (p.status || 'active') === 'archived' ? 'active' : 'archived';
        try {
          await ACSMS.Store.updatePath(p.id, { status });
          await ACSMS.Store.loadPaths();
          this.renderCards();
          ACSMS.toast(status === 'archived' ? 'Path archived' : 'Path restored');
        } catch (e) { ACSMS.toast('Could not update: ' + e.message); }
      }));
    grid.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', async () => {
        const p = ACSMS.Store.pathById(b.dataset.del);
        const ok = await AUTOREGIA.confirmDialog({
          title: 'Delete this path?',
          message: `“${p.name}” is a view over skills — deleting it removes the sequence but never the skills or their practice history.`,
          confirmText: 'Delete path',
        });
        if (!ok) return;
        try {
          await ACSMS.Store.deletePath(p.id);
          await ACSMS.Store.loadPaths();
          this.renderCards();
          ACSMS.updateFooter();
          ACSMS.toast('Path deleted');
        } catch (e) { ACSMS.toast('Could not delete: ' + e.message); }
      }));
  },

  // ── define / edit modal with ordered skill picker ──
  openModal(path) {
    const isEdit = !!path;
    const ordered = isEdit ? [...(path.skill_ids || [])] : [];
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'Edit' : 'Define'} path">
      <div class="modal-header"><h2>${isEdit ? 'Edit path' : 'Define path'}</h2>
        <button class="btn-icon" aria-label="Close" data-close>${AUTOREGIA._xSvg}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group span-2"><label for="pt-name">Name</label>
            <input type="text" id="pt-name" maxlength="120" placeholder="e.g. Data & reasoning foundations" value="${isEdit ? ACSMS.esc(path.name) : ''}"></div>
          <div class="form-group span-2"><label for="pt-desc">Description</label>
            <textarea id="pt-desc" rows="2" placeholder="What does this program accomplish?">${isEdit ? ACSMS.esc(path.description || '') : ''}</textarea></div>
          <div class="form-group"><label for="pt-add">Add skill</label>
            <select id="pt-add"><option value="">Select a skill…</option></select></div>
        </div>
        <div class="picker-cols">
          <div class="picker-col">
            <label>Sequence (in order)</label>
            <div class="pick-list" id="pt-seq"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" data-save>${isEdit ? 'Save path' : 'Define path'}</button>
      </div></div>`;
    document.body.appendChild(ov);
    const dlg = AUTOREGIA.dialog(ov, { label: isEdit ? 'Edit path' : 'Define path' });
    const close = () => { dlg.close(); ov.remove(); };
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));

    const sel = ov.querySelector('#pt-add');
    const seqEl = ov.querySelector('#pt-seq');
    function refreshPicker() {
      const available = ACSMS.Store.skills().filter(s => !ordered.includes(s.id));
      sel.innerHTML = '<option value="">Select a skill…</option>' +
        available.map(s => `<option value="${s.id}">${ACSMS.esc(s.name)}</option>`).join('');
      seqEl.innerHTML = ordered.length
        ? ordered.map((sid, i) => {
          const s = ACSMS.Store.skillById(sid);
          return `<div class="pick-item" draggable="false">
            <span class="pick-idx num">${i + 1}</span>
            <span class="pick-name">${ACSMS.esc(s ? s.name : sid)}</span>
            <span class="pick-btns">
              <button class="btn-icon" data-move="-1" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ACSMS.icon('arrow-up', 13)}</button>
              <button class="btn-icon" data-move="1" data-i="${i}" ${i === ordered.length - 1 ? 'disabled' : ''} aria-label="Move down">${ACSMS.icon('arrow-down', 13)}</button>
              <button class="btn-icon" data-remove="${i}" aria-label="Remove">${ACSMS.icon('x', 13)}</button>
            </span></div>`;
        }).join('')
        : '<p class="rail-empty">No skills yet — add the first step.</p>';
      seqEl.querySelectorAll('[data-move]').forEach(b => b.addEventListener('click', () => {
        const i = parseInt(b.dataset.i, 10), d = parseInt(b.dataset.move, 10);
        [ordered[i], ordered[i + d]] = [ordered[i + d], ordered[i]];
        refreshPicker();
      }));
      seqEl.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
        ordered.splice(parseInt(b.dataset.remove, 10), 1);
        refreshPicker();
      }));
    }
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      if (ordered.length >= 20) { ACSMS.toast('A path holds at most 20 skills'); return; }
      ordered.push(sel.value);
      refreshPicker();
    });
    refreshPicker();

    ov.querySelector('[data-save]').addEventListener('click', async () => {
      const body = {
        name: ov.querySelector('#pt-name').value.trim(),
        description: ov.querySelector('#pt-desc').value.trim(),
        skill_ids: ordered,
      };
      if (!body.name) { ACSMS.toast('A path needs a name'); return; }
      try {
        if (isEdit) await ACSMS.Store.updatePath(path.id, body);
        else await ACSMS.Store.createPath(body);
        await ACSMS.Store.refresh();
        this.renderCards();
        ACSMS.updateFooter();
        ACSMS.toast(isEdit ? 'Path updated' : 'Path defined — follow the current step');
        close();
      } catch (e) { ACSMS.toast('Could not save: ' + e.message); }
    });
    setTimeout(() => ov.querySelector('#pt-name').focus(), 100);
  },

  afterRender() {
    document.getElementById('definePathBtn')?.addEventListener('click', () => this.openModal(null));
    this.renderCards();
  },
};
