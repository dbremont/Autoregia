/* ════════════════════════════════════════════════════════════
    SARL Phrases — the phrase catalog: editable muletilla / filler
    lists per language that the estilo pack consults at review
    time. The engine reads these docs live; edits apply at once.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Phrases = (() => {
  const v = SARL.view;
  let editing = null;

  function render() {
    const ps = SARL.Store.phrases();
    return `
      ${v.header('Phrase Catalog', `<button class="btn btn-primary btn-sm" id="phrNew">${SARL.icon('plus', 14)} New Collection</button>`)}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The engine's phrase lists, made editable: enabled collections feed the <span class="dim-tag">estilística</span> muletilla rule at review time — disable a collection and its phrases stop firing on the next task.</p>
      ${!ps.length ? '<div class="empty-state">no phrase collections — create the first list</div>' : ps.map(p => `
        <div class="chart-card animate-in" style="margin-bottom:var(--space-4)">
          <div class="chart-head">
            <div><span class="eyebrow">${SARL.esc(p.language)} · ${SARL.esc(p.kind)}</span>
              <h3>${SARL.esc(p.name)} ${p.enabled ? '' : v.pill('disabled')}</h3></div>
            <div class="actions">
              <span class="results-meta">${(p.phrases || []).length} phrases</span>
              <button class="btn btn-secondary btn-sm" data-edit="${SARL.esc(p.id)}">${SARL.icon('pencil', 13)} edit</button>
              <button class="btn btn-ghost btn-sm" data-del="${SARL.esc(p.id)}">${SARL.icon('trash-2', 13)} delete</button>
            </div>
          </div>
          ${(p.note) ? `<div class="chart-sub">${SARL.esc(p.note)}</div>` : ''}
          <div>${(p.phrases || []).map(t => `<span class="term-chip">${SARL.esc(t)}</span>`).join('') || '<div class="empty-state">no phrases</div>'}</div>
        </div>`).join('')}`;
  }

  function openModal(p) {
    editing = p || { name: '', language: 'any', kind: 'muletilla', enabled: true, phrases: [] };
    document.getElementById('modalTitle').textContent = p ? 'Edit phrase collection' : 'New phrase collection';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-row-sarl">
        <div class="form-group"><label for="peName">name</label>
          <input id="peName" type="text" value="${SARL.esc(editing.name || '')}"></div>
        <div class="form-group"><label for="peLang">language</label>
          <select id="peLang">
            ${['es', 'en', 'any'].map(l => `<option value="${l}" ${editing.language === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div class="form-group"><label for="peKind">kind</label>
          <select id="peKind">
            ${['muletilla', 'filler', 'formulaic', 'other'].map(k => `<option value="${k}" ${editing.kind === k ? 'selected' : ''}>${k}</option>`).join('')}
          </select></div>
        <div class="form-group"><label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400;margin-top:22px">
          <input type="checkbox" id="peEnabled" style="width:auto" ${editing.enabled !== false ? 'checked' : ''}> enabled</label></div>
      </div>
      <div class="form-group phrase-host"><label for="pePhrases">phrases — one per line</label>
        <textarea id="pePhrases" placeholder="cabe destacar que&#10;it should be noted that">${SARL.esc((editing.phrases || []).join('\n'))}</textarea>
        <span class="form-hint">matched case-insensitively as whole phrases; whitespace-flexible</span>
      </div>`;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary btn-sm" id="peCancel">Cancel</button>
      <button class="btn btn-primary btn-sm" id="peSave">${SARL.icon('check', 13)} Save</button>`;
    document.getElementById('peCancel').addEventListener('click', closeModal);
    document.getElementById('peSave').addEventListener('click', async () => {
      editing.name = document.getElementById('peName').value;
      editing.language = document.getElementById('peLang').value;
      editing.kind = document.getElementById('peKind').value;
      editing.enabled = document.getElementById('peEnabled').checked;
      editing.phrases = document.getElementById('pePhrases').value
        .split('\n').map(s => s.trim()).filter(Boolean);
      try {
        if (editing.id) await SARL.Store.updatePhrases(editing.id, editing);
        else await SARL.Store.createPhrases(editing);
        SARL.toast('phrase collection saved — audited');
        closeModal();
        await SARL.Store.loadPhrases();
        SARL.navigate('phrases');
      } catch (e) { SARL.toast(e.message); }
    });
    document.getElementById('modal').classList.remove('hidden');
    AUTOREGIA.dialog(document.getElementById('modal'), {
      label: 'Phrase collection editor',
      onClose: () => document.getElementById('modal').classList.add('hidden'),
    });
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  function afterRender() {
    document.getElementById('phrNew')?.addEventListener('click', () => openModal(null));
    document.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => {
        const p = SARL.Store.phrases().find(x => x.id === b.dataset.edit);
        if (p) openModal(JSON.parse(JSON.stringify(p)));
      }));
    document.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', async () => {
        const ok = await SARL.confirm({
          title: 'Delete this phrase collection?',
          message: 'Its phrases stop feeding the estilística rule on the next review.',
          confirmText: 'Delete',
        });
        if (!ok) return;
        try {
          await SARL.Store.deletePhrases(b.dataset.del);
          SARL.toast('collection deleted');
          await SARL.Store.loadPhrases();
          SARL.navigate('phrases');
        } catch (e) { SARL.toast(e.message); }
      }));
  }

  return { render, afterRender };
})();
