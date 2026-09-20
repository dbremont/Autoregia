/* ════════════════════════════════════════════════════════════
    SARL Glossaries — the terminological authorities: named,
    language-tagged sets of entries (preferred term, forbidden
    variants, aliases). Enforced by the terminologica dimension.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Glossaries = (() => {
  const v = SARL.view;
  let editing = null; // glossary doc being edited in the modal

  function render() {
    const gs = SARL.Store.glossaries();
    return `
      ${v.header('Glossaries', `<button class="btn btn-primary btn-sm" id="gloNew">${SARL.icon('plus', 14)} New Glossary</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">A glossary is a terminological authority: forbidden terms raise <em>errors</em>, unpreferred aliases <em>warnings</em>, and terminology drift across one text is flagged. Attach glossaries when submitting a task.</p>
      ${!gs.length ? '<div class="empty-state">no glossaries — create the first authority</div>' : gs.map(g => `
        <div class="chart-card animate-in" style="margin-bottom:var(--space-4)">
          <div class="chart-head">
            <div><span class="eyebrow">${SARL.esc(g.language)} · ${SARL.esc(g.domain || 'general')}</span>
              <h3>${SARL.esc(g.name)} ${g.enabled ? '' : v.pill('disabled')}</h3></div>
            <div class="actions">
              <button class="btn btn-secondary btn-sm" data-edit="${SARL.esc(g.id)}">${SARL.icon('pencil', 13)} edit</button>
              <button class="btn btn-ghost btn-sm" data-del="${SARL.esc(g.id)}">${SARL.icon('trash-2', 13)} delete</button>
            </div>
          </div>
          ${(g.note) ? `<div class="chart-sub">${SARL.esc(g.note)}</div>` : ''}
          <div class="meta-section">
            ${(g.entries || []).map(e => `
              <div class="entry-row">
                <span class="entry-preferred">${SARL.esc(e.preferred)}</span>
                <span class="entry-forbidden entry-terms">${(e.forbidden || []).map(t => `<span class="term-chip">${SARL.esc(t)}</span>`).join('') || '<span class="empty-inline">—</span>'}</span>
                <span class="entry-terms">${(e.aliases || []).map(t => `<span class="term-chip">${SARL.esc(t)}</span>`).join('') || '<span class="empty-inline">—</span>'}</span>
                <span class="src-ago">${SARL.esc(e.note || '')}</span>
              </div>`).join('') || '<div class="empty-state">no entries</div>'}
          </div>
        </div>`).join('')}`;
  }

  // ── modal editor ──
  function openModal(g) {
    editing = g || { name: '', language: 'es', domain: 'general', enabled: true, entries: [] };
    document.getElementById('modalTitle').textContent = g ? 'Edit glossary' : 'New glossary';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-row-sarl">
        <div class="form-group"><label for="geName">name</label>
          <input id="geName" type="text" value="${SARL.esc(editing.name || '')}"></div>
        <div class="form-group"><label for="geLang">language</label>
          <select id="geLang">
            ${['es', 'en'].map(l => `<option value="${l}" ${editing.language === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div class="form-group"><label for="geDomain">domain</label>
          <input id="geDomain" type="text" value="${SARL.esc(editing.domain || 'general')}"></div>
        <div class="form-group"><label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400;margin-top:22px">
          <input type="checkbox" id="geEnabled" style="width:auto" ${editing.enabled !== false ? 'checked' : ''}> enabled</label></div>
      </div>
      <div class="form-group"><label>entries — preferred · forbidden · aliases · note</label></div>
      <div id="geEntries"></div>
      <button class="btn btn-secondary btn-sm" id="geAdd">${SARL.icon('plus', 13)} add entry</button>`;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary btn-sm" id="geCancel">Cancel</button>
      <button class="btn btn-primary btn-sm" id="geSave">${SARL.icon('check', 13)} Save</button>`;
    const drawEntries = () => {
      document.getElementById('geEntries').innerHTML = (editing.entries || []).map((e, i) => `
        <div class="entry-edit-grid">
          <input type="text" data-ei="${i}" data-ek="preferred" placeholder="preferred" value="${SARL.esc(e.preferred || '')}">
          <input type="text" data-ei="${i}" data-ek="forbidden" placeholder="forbidden (comma-sep)" value="${SARL.esc((e.forbidden || []).join(', '))}">
          <input type="text" data-ei="${i}" data-ek="aliases" placeholder="aliases (comma-sep)" value="${SARL.esc((e.aliases || []).join(', '))}">
          <input type="text" data-ei="${i}" data-ek="note" placeholder="note" value="${SARL.esc(e.note || '')}">
          <button class="btn-icon" data-erm="${i}" aria-label="Remove entry">${SARL.icon('x', 14)}</button>
        </div>`).join('');
      document.querySelectorAll('[data-ek]').forEach(inp => inp.addEventListener('input', () => {
        const e = editing.entries[+inp.dataset.ei];
        const k = inp.dataset.ek;
        if (k === 'preferred' || k === 'note') e[k] = inp.value;
        else e[k] = inp.value.split(',').map(s => s.trim()).filter(Boolean);
      }));
      document.querySelectorAll('[data-erm]').forEach(b => b.addEventListener('click', () => {
        editing.entries.splice(+b.dataset.erm, 1);
        drawEntries();
      }));
    };
    if (!editing.entries.length) editing.entries = [{ preferred: '', forbidden: [], aliases: [], note: '' }];
    drawEntries();
    document.getElementById('geAdd').addEventListener('click', () => {
      editing.entries.push({ preferred: '', forbidden: [], aliases: [], note: '' });
      drawEntries();
    });
    document.getElementById('geCancel').addEventListener('click', closeModal);
    document.getElementById('geSave').addEventListener('click', async () => {
      editing.name = document.getElementById('geName').value;
      editing.language = document.getElementById('geLang').value;
      editing.domain = document.getElementById('geDomain').value || 'general';
      editing.enabled = document.getElementById('geEnabled').checked;
      editing.entries = (editing.entries || []).filter(e => (e.preferred || '').trim());
      try {
        if (editing.id) await SARL.Store.updateGlossary(editing.id, editing);
        else await SARL.Store.createGlossary(editing);
        SARL.toast('glossary saved — audited');
        closeModal();
        await SARL.Store.loadGlossaries();
        SARL.navigate('glossaries');
      } catch (e) { SARL.toast(e.message); }
    });
    document.getElementById('modal').classList.remove('hidden');
    AUTOREGIA.dialog(document.getElementById('modal'), {
      label: 'Glossary editor',
      onClose: () => document.getElementById('modal').classList.add('hidden'),
    });
  }

  function closeModal() {
    const ov = document.getElementById('modal');
    ov.classList.add('hidden');
  }

  function afterRender() {
    document.getElementById('gloNew')?.addEventListener('click', () => openModal(null));
    document.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => {
        const g = SARL.Store.glossaries().find(x => x.id === b.dataset.edit);
        if (g) openModal(JSON.parse(JSON.stringify(g)));
      }));
    document.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', async () => {
        const ok = await SARL.confirm({
          title: 'Delete this glossary?',
          message: 'Past tasks keep their recorded findings; new reviews can no longer enforce it.',
          confirmText: 'Delete',
        });
        if (!ok) return;
        try {
          await SARL.Store.deleteGlossary(b.dataset.del);
          SARL.toast('glossary deleted');
          await SARL.Store.loadGlossaries();
          SARL.navigate('glossaries');
        } catch (e) { SARL.toast(e.message); }
      }));
  }

  return { render, afterRender };
})();
