/* PWOS Scratchpad - Component S (a single markdown working document)
 *
 * One persistent Markdown document (with LaTeX math) — the agent's short-term
 * working surface. Edit (textarea) ↔ Preview (rendered) toggle, save
 * (Ctrl/Cmd+S or autosave), and share by link with view/edit permission.
 * Rendering is handled by PW.Markdown (js/md.js) + KaTeX.
 *
 * Design: Autoregia UI spec — Oxford/parchment, Spectral/Inter/IBM Plex Mono. */
window.PW = window.PW || {};
PW.Scratch = PW.Scratch || {};
PW._scratchMode = 'edit';          // 'edit' | 'preview'
PW._scratchDirty = false;
PW._scratchShareOpen = false;

/* ── View ────────────────────────────────────────────────────────────── */
PW.ScratchView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component S · working document</span><h1>Scratchpad</h1>' +
    '<p class="content-sub">One markdown document (with LaTeX) for whatever is in front of mind right now.</p></div>' +
    '<div class="actions" id="scratchToolbar"></div></div>' +
    '<div class="scratch-status" id="scratchStatus"></div>' +
    '<div class="scratch-share hidden" id="scratchShare"></div>' +
    '<div id="scratchSurface"></div>';
};
PW.bindScratch = function () { PW.renderScratch(); };

PW.renderScratch = async function () {
  await PW.Store.refreshFromAPI();
  PW.Scratch._renderToolbar();
  PW.Scratch._renderStatus();
  PW.Scratch._renderSurface();
  if (PW._scratchShareOpen) PW.Scratch._renderShare();
};

PW.Scratch._renderToolbar = function () {
  const tb = document.getElementById('scratchToolbar');
  if (!tb) return;
  const edit = PW._scratchMode === 'edit';
  tb.innerHTML =
    '<div class="seg">' +
      '<button class="seg-btn' + (edit ? ' is-active' : '') + '" onclick="PW.Scratch.setMode(\'edit\')"><pw-icon name="pencil-line" size="14"></pw-icon> Edit</button>' +
      '<button class="seg-btn' + (!edit ? ' is-active' : '') + '" onclick="PW.Scratch.setMode(\'preview\')"><pw-icon name="book-open" size="14"></pw-icon> Preview</button>' +
    '</div>' +
    '<button class="btn btn-ghost btn-sm' + (PW._scratchShareOpen ? ' is-active' : '') + '" onclick="PW.Scratch.toggleShare()"><pw-icon name="share-2" size="14"></pw-icon> Share</button>' +
    '<button class="btn btn-primary btn-sm" onclick="PW.Scratch.save()"><pw-icon name="check" size="14"></pw-icon> Save</button>';
};

PW.Scratch._renderSurface = function () {
  const el = document.getElementById('scratchSurface');
  if (!el) return;
  const doc = PW.Store.getScratch() || {};
  if (PW._scratchMode === 'preview') {
    el.innerHTML = '<div class="card"><div class="card-body"><div class="md scratch-doc">' + PW.Markdown.render(doc.body) + '</div></div></div>';
    return;
  }
  el.innerHTML = '<div class="card"><div class="card-body">' +
    '<textarea id="scratchArea" class="scratch-area" placeholder="# A heading\n\nWrite freely — markdown + LaTeX supported.  $A = \\pi r^2$\n\nCtrl/Cmd+S to save.">' + PW.esc(doc.body || '') + '</textarea>' +
    '</div></div>';
  const ta = document.getElementById('scratchArea');
  ta.addEventListener('input', function () {
    PW._scratchDirty = true;
    PW.Scratch._renderStatus();
    clearTimeout(PW._scratchSaveTimer);
    PW._scratchSaveTimer = setTimeout(PW.Scratch.save, 1200);
  });
  ta.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); PW.Scratch.save(); }
  });
  ta.addEventListener('blur', function () { if (PW._scratchDirty) PW.Scratch.save(); });
};

PW.Scratch._renderStatus = function () {
  const el = document.getElementById('scratchStatus');
  if (!el) return;
  const doc = PW.Store.getScratch() || {};
  const w = (doc.body || '').trim() ? (doc.body || '').trim().split(/\s+/).length : 0;
  el.innerHTML = (PW._scratchDirty ? '<span class="scratch-dirty">unsaved changes</span>' : '<span class="scratch-saved">saved</span>') +
    ' &middot; ' + w + ' word' + (w === 1 ? '' : 's') +
    (doc.updated_at ? ' &middot; last saved ' + PW.Scratch._relative(doc.updated_at) : '');
};

/* ── Share panel (view / edit links) ─────────────────────────────────── */
PW.Scratch.toggleShare = function () {
  PW._scratchShareOpen = !PW._scratchShareOpen;
  PW.Scratch._renderToolbar();
  const panel = document.getElementById('scratchShare');
  if (PW._scratchShareOpen) { panel.classList.remove('hidden'); PW.Scratch._renderShare(); }
  else { panel.classList.add('hidden'); }
};

PW.Scratch._renderShare = function () {
  const panel = document.getElementById('scratchShare');
  if (!panel) return;
  const shares = (PW.Store.getScratch() || {}).shares || [];
  const list = shares.map(function (s) {
    const url = (location.origin + '/pwos/share/' + s.token);
    const editable = s.permission === 'edit';
    return '<div class="share-row">' +
      '<span class="share-perm ' + (editable ? 'is-edit' : 'is-view') + '" title="Permission">' +
        '<pw-icon name="' + (editable ? 'pencil-line' : 'book-open') + '" size="12"></pw-icon> ' + s.permission + '</span>' +
      '<input class="input share-url" value="' + PW.esc(url) + '" readonly onclick="this.select()">' +
      '<button class="btn-icon-inline" title="Open in new tab" onclick="window.open(\'' + url + '\', \'_blank\')"><pw-icon name="external-link" size="14"></pw-icon></button>' +
      '<button class="btn-icon-inline" title="Copy link" onclick="PW.Scratch.copyUrl(\'' + url + '\')"><pw-icon name="clipboard-list" size="14"></pw-icon></button>' +
      '<button class="btn-icon-inline" title="Revoke" onclick="PW.Scratch.revokeShare(\'' + s.token + '\')"><pw-icon name="trash-2" size="14"></pw-icon></button>' +
      '</div>';
  }).join('');
  panel.innerHTML =
    '<div class="share-create">' +
      '<span class="share-label">Create a link:</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="PW.Scratch.createShare(\'view\')"><pw-icon name="book-open" size="13"></pw-icon> View-only</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="PW.Scratch.createShare(\'edit\')"><pw-icon name="pencil-line" size="13"></pw-icon> Editable</button>' +
      '<span class="share-hint">view links are read-only; edit links can change the document.</span>' +
    '</div>' +
    (shares.length ? '<div class="share-list">' + list + '</div>' : '<div class="share-empty">No active links yet.</div>');
};

PW.Scratch.createShare = async function (permission) {
  const g = await PW.Store.createScratchShare(permission);
  if (!g) { PW.toast('Could not create link'); return; }
  PW.toast((permission === 'edit' ? 'Editable' : 'View') + ' link created');
  PW.Scratch._renderShare();
};

PW.Scratch.revokeShare = async function (token) {
  if (!confirm('Revoke this share link?')) return;
  await PW.Store.revokeScratchShare(token);
  PW.toast('Link revoked');
  PW.Scratch._renderShare();
};

PW.Scratch.copyUrl = async function (url) {
  try { await navigator.clipboard.writeText(url); PW.toast('Link copied'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); PW.toast('Link copied'); } catch (_) { PW.toast('Copy failed'); }
    document.body.removeChild(ta);
  }
};

/* ── Actions ─────────────────────────────────────────────────────────── */
PW.Scratch._relative = function (iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
};

PW.Scratch.setMode = async function (mode) {
  if (PW._scratchMode === mode) return;
  if (PW._scratchDirty) await PW.Scratch.save();
  PW._scratchMode = mode;
  PW.Scratch._renderToolbar();
  PW.Scratch._renderSurface();
};

PW.Scratch.save = async function () {
  clearTimeout(PW._scratchSaveTimer);
  if (PW._scratchMode !== 'edit') { PW._scratchDirty = false; PW.Scratch._renderStatus(); return; }
  const ta = document.getElementById('scratchArea');
  if (!ta) return;
  await PW.Store.updateScratch(ta.value);
  PW._scratchDirty = false;
  PW.Scratch._renderStatus();
};
