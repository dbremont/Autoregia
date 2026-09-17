/* ════════════════════════════════════════════════════════════
   ACSMS Skills — the capability catalog.
   Define, edit, pause/retire, and (when unpracticed) delete
   skills. Each row joins the tracking layer: computed practice
   state, last practiced, practice count.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Skills = {
  render() {
    const actions = `<button class="btn btn-primary btn-sm" id="defineSkillBtn">${ACSMS.icon('plus', 15)} Define skill</button>`;
    return `<div class="animate-in">${ACSMS.view.header('Skill Catalog', actions)}</div>
      <div class="animate-in delay-1">
        ${ACSMS.view.card('Catalog', 'Defined skills',
          `<div class="data-table-scroll"><table class="data-table" id="skillsTable">
             <thead><tr><th>Skill</th><th>Status</th><th>Practice state</th><th>Target</th><th>Last practiced</th><th class="num">Reports</th><th></th></tr></thead>
             <tbody></tbody>
           </table></div>`,
          'Definition is not acquisition — the state column tracks what practice history says.')}
      </div>`;
  },

  rowHTML(s) {
    const retired = (s.status || 'active') === 'retired';
    const paused = s.status === 'paused';
    const last = s.last_practiced_ms ? ACSMS.fmtAgo(s.last_practiced_ms) : 'never';
    const tgt = s.target_per_week ? (Number.isInteger(s.target_per_week) ? s.target_per_week : s.target_per_week.toFixed(2).replace(/\.?0+$/, '')) + '×/wk' : '—';
    return `<tr data-id="${s.id}">
      <td><div><span class="skill-name">${ACSMS.esc(s.name)}</span></div>
        ${s.description ? `<div class="skill-desc">${ACSMS.esc(s.description)}</div>` : ''}
        ${s.tags?.length ? `<div class="skill-tags">${s.tags.map(t => `<span class="pill gold">${ACSMS.esc(t)}</span>`).join('')}</div>` : ''}
      </td>
      <td>${ACSMS.statusPill(s.status)}</td>
      <td>${ACSMS.statePill(s.practice_state)}</td>
      <td class="num">${tgt}</td>
      <td class="num">${retired ? '—' : last}</td>
      <td class="num">${s.practice_count}</td>
      <td><span class="row-actions">
        <button class="btn-icon" data-edit="${s.id}" title="Edit" aria-label="Edit skill">${ACSMS.icon('pencil', 14)}</button>
        ${retired
          ? `<button class="btn-icon" data-activate="${s.id}" title="Reactivate" aria-label="Reactivate skill">${ACSMS.icon('play', 14)}</button>`
          : `<button class="btn-icon" data-lifecycle="${s.id}" title="${paused ? 'Activate' : 'Pause'}" aria-label="Toggle pause">${ACSMS.icon(paused ? 'play' : 'pause', 14)}</button>`}
        ${s.practice_count === 0
          ? `<button class="btn-icon" data-del="${s.id}" title="Delete (no practice history)" aria-label="Delete skill">${ACSMS.icon('trash-2', 14)}</button>`
          : `<button class="btn-icon" data-cull="${s.id}" title="${retired ? 'Retired' : 'Retire (cull)'}" ${retired ? 'disabled' : ''} aria-label="Retire skill">${ACSMS.icon('archive', 14)}</button>`}
      </span></td>
    </tr>`;
  },

  renderRows() {
    const tb = document.querySelector('#skillsTable tbody');
    if (!tb) return;
    const skills = ACSMS.Store.skills();
    tb.innerHTML = skills.length
      ? skills.map(s => this.rowHTML(s)).join('')
      : `<tr><td colspan="7"><div class="empty-state"><h3>No skills defined</h3><p>Define the first skill — then practice can be reported against it.</p></div></td></tr>`;
    this.bindRows();
  },

  bindRows() {
    const view = this;
    document.querySelectorAll('#skillsTable [data-edit]').forEach(b => b.addEventListener('click', () => {
      view.openModal(ACSMS.Store.skillById(b.dataset.edit));
    }));
    document.querySelectorAll('#skillsTable [data-lifecycle]').forEach(b => b.addEventListener('click', async () => {
      const s = ACSMS.Store.skillById(b.dataset.lifecycle);
      const next = s.status === 'paused' ? 'active' : 'paused';
      try { await ACSMS.Store.updateSkill(s.id, { status: next }); await ACSMS.Store.refresh(); view.renderRows(); ACSMS.updateFooter(); ACSMS.toast(`Skill ${next === 'paused' ? 'paused' : 'activated'}`); }
      catch (e) { ACSMS.toast('Could not update: ' + e.message); }
    }));
    document.querySelectorAll('#skillsTable [data-activate]').forEach(b => b.addEventListener('click', async () => {
      try { await ACSMS.Store.updateSkill(b.dataset.activate, { status: 'active' }); await ACSMS.Store.refresh(); view.renderRows(); ACSMS.toast('Skill reactivated'); }
      catch (e) { ACSMS.toast('Could not update: ' + e.message); }
    }));
    document.querySelectorAll('#skillsTable [data-cull]').forEach(b => b.addEventListener('click', async () => {
      const s = ACSMS.Store.skillById(b.dataset.cull);
      const ok = await AUTOREGIA.confirmDialog({
        title: 'Retire this skill?',
        message: `“${s.name}” keeps its practice history but leaves active maintenance — the cull decision is recorded and practice can no longer be reported on it.`,
        confirmText: 'Retire',
      });
      if (!ok) return;
      try { await ACSMS.Store.updateSkill(s.id, { status: 'retired' }); await ACSMS.Store.refresh(); view.renderRows(); ACSMS.updateFooter(); ACSMS.toast('Skill retired — decision recorded'); }
      catch (e) { ACSMS.toast('Could not retire: ' + e.message); }
    }));
    document.querySelectorAll('#skillsTable [data-del]').forEach(b => b.addEventListener('click', async () => {
      const s = ACSMS.Store.skillById(b.dataset.del);
      const ok = await AUTOREGIA.confirmDialog({
        title: 'Delete this skill?',
        message: `“${s.name}” has no practice history, so it can be hard-deleted. Practiced skills must be retired instead.`,
        confirmText: 'Delete',
      });
      if (!ok) return;
      try { await ACSMS.Store.deleteSkill(s.id); await ACSMS.Store.refresh(); view.renderRows(); ACSMS.updateFooter(); ACSMS.toast('Skill deleted'); }
      catch (e) { ACSMS.toast('Could not delete: ' + e.message); }
    }));
  },

  // ── define / edit modal ──
  openModal(skill) {
    const isEdit = !!skill;
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'Edit' : 'Define'} skill">
      <div class="modal-header"><h2>${isEdit ? 'Edit skill' : 'Define skill'}</h2>
        <button class="btn-icon" aria-label="Close" data-close>${AUTOREGIA._xSvg}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group span-2"><label for="sk-name">Name</label>
            <input type="text" id="sk-name" maxlength="120" placeholder="e.g. Systems thinking" value="${isEdit ? ACSMS.esc(skill.name) : ''}"></div>
          <div class="form-group span-2"><label for="sk-desc">Description</label>
            <textarea id="sk-desc" rows="3" placeholder="What does being capable here mean? What evidence demonstrates it?">${isEdit ? ACSMS.esc(skill.description || '') : ''}</textarea></div>
          <div class="form-group"><label for="sk-tags">Tags</label>
            <input type="text" id="sk-tags" placeholder="comma, separated" value="${isEdit ? ACSMS.esc((skill.tags || []).join(', ')) : ''}"></div>
          <div class="form-group"><label for="sk-target">Target (per week)</label>
            <input type="number" id="sk-target" min="0.25" max="70" step="0.25" value="${isEdit ? (skill.target_per_week || 1) : 1}">
            <div class="form-hint">Drives the neglected detector: stale at 2× the target interval.</div></div>
          <div class="form-group span-2"><label for="sk-status">Status</label>
            <select id="sk-status">
              <option value="active" ${isEdit && skill.status !== 'active' ? '' : 'selected'}>active</option>
              <option value="paused" ${isEdit && skill.status === 'paused' ? 'selected' : ''}>paused</option>
              ${isEdit ? `<option value="retired" ${skill.status === 'retired' ? 'selected' : ''}>retired</option>` : ''}
            </select></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" data-save>${isEdit ? 'Save changes' : 'Define skill'}</button>
      </div></div>`;
    document.body.appendChild(ov);
    const dlg = AUTOREGIA.dialog(ov, { label: isEdit ? 'Edit skill' : 'Define skill' });
    const close = () => { dlg.close(); ov.remove(); };
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    ov.querySelector('[data-save]').addEventListener('click', async () => {
      const body = {
        name: ov.querySelector('#sk-name').value.trim(),
        description: ov.querySelector('#sk-desc').value.trim(),
        tags: ov.querySelector('#sk-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        target_per_week: parseFloat(ov.querySelector('#sk-target').value) || 1,
        status: ov.querySelector('#sk-status').value,
      };
      if (!body.name) { ACSMS.toast('A skill needs a name'); return; }
      try {
        if (isEdit) await ACSMS.Store.updateSkill(skill.id, body);
        else await ACSMS.Store.createSkill(body);
        await ACSMS.Store.refresh();
        this.renderRows(); ACSMS.updateFooter();
        ACSMS.toast(isEdit ? 'Skill updated' : 'Skill defined — practice can now be reported on it');
        close();
      } catch (e) { ACSMS.toast('Could not save: ' + e.message); }
    });
    setTimeout(() => ov.querySelector('#sk-name').focus(), 100);
  },

  afterRender() {
    this.renderRows();
    document.getElementById('defineSkillBtn')?.addEventListener('click', () => this.openModal(null));
  },
};
