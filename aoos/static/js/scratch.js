/* AOOS Scratchpad - Component S (a single markdown working document)
 *
 * One persistent Markdown document (with LaTeX math) — the agent's short-term
 * working surface. Edit (textarea) ↔ Preview (rendered) toggle, save
 * (Ctrl/Cmd+S or autosave), and share by link with view/edit permission.
 * Rendering is handled by AO.Markdown (js/md.js) + KaTeX.
 *
 * Design: Autoregia UI spec — Oxford/parchment, Spectral/Inter/IBM Plex Mono. */
window.AO = window.AO || {};
AO.Scratch = AO.Scratch || {};
AO._scratchMode = 'edit';          // 'edit' | 'preview'
AO._scratchDirty = false;
AO._scratchShareOpen = false;

/* ── View ────────────────────────────────────────────────────────────── */
AO.ScratchView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component S · working document</span><h1>Scratchpad</h1>' +
    '<p class="content-sub">One markdown document (with LaTeX) for whatever is in front of mind right now.</p></div>' +
    '<div class="actions" id="scratchToolbar"></div></div>' +
    '<div class="scratch-status" id="scratchStatus"></div>' +
    '<div class="scratch-share hidden" id="scratchShare"></div>' +
    '<div id="scratchSurface"></div>';
};
AO.bindScratch = function () { AO.renderScratch(); };

AO.renderScratch = async function () {
  await AO.Store.refreshFromAPI();
  AO.Scratch._renderToolbar();
  AO.Scratch._renderStatus();
  AO.Scratch._renderSurface();
  if (AO._scratchShareOpen) AO.Scratch._renderShare();
};

AO.Scratch._renderToolbar = function () {
  const tb = document.getElementById('scratchToolbar');
  if (!tb) return;
  const edit = AO._scratchMode === 'edit';
  tb.innerHTML =
    '<div class="seg">' +
      '<button class="seg-btn' + (edit ? ' is-active' : '') + '" onclick="AO.Scratch.setMode(\'edit\')"><ao-icon name="pencil-line" size="14"></ao-icon> Edit</button>' +
      '<button class="seg-btn' + (!edit ? ' is-active' : '') + '" onclick="AO.Scratch.setMode(\'preview\')"><ao-icon name="book-open" size="14"></ao-icon> Preview</button>' +
    '</div>' +
    '<button class="btn btn-ghost btn-sm' + (AO._scratchShareOpen ? ' is-active' : '') + '" onclick="AO.Scratch.toggleShare()"><ao-icon name="share-2" size="14"></ao-icon> Share</button>' +
    '<button class="btn btn-primary btn-sm" onclick="AO.Scratch.save()"><ao-icon name="check" size="14"></ao-icon> Save</button>';
};

AO.Scratch._renderSurface = function () {
  const el = document.getElementById('scratchSurface');
  if (!el) return;
  const doc = AO.Store.getScratch() || {};
  if (AO._scratchMode === 'preview') {
    el.innerHTML = '<div class="card"><div class="card-body"><div class="md scratch-doc">' + AO.Markdown.render(doc.body) + '</div></div></div>';
    return;
  }
  el.innerHTML = '<div class="card"><div class="card-body">' +
    '<textarea id="scratchArea" class="scratch-area" placeholder="# A heading\n\nWrite freely — markdown + LaTeX supported.  $A = \\pi r^2$\n\nCtrl/Cmd+S to save.">' + AO.esc(doc.body || '') + '</textarea>' +
    '</div></div>';
  const ta = document.getElementById('scratchArea');
  ta.addEventListener('input', function () {
    AO._scratchDirty = true;
    AO.Scratch._renderStatus();
    clearTimeout(AO._scratchSaveTimer);
    AO._scratchSaveTimer = setTimeout(AO.Scratch.save, 1200);
  });
  ta.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); AO.Scratch.save(); }
  });
  ta.addEventListener('blur', function () { if (AO._scratchDirty) AO.Scratch.save(); });
};

AO.Scratch._renderStatus = function () {
  const el = document.getElementById('scratchStatus');
  if (!el) return;
  const doc = AO.Store.getScratch() || {};
  const w = (doc.body || '').trim() ? (doc.body || '').trim().split(/\s+/).length : 0;
  el.innerHTML = (AO._scratchDirty ? '<span class="scratch-dirty">unsaved changes</span>' : '<span class="scratch-saved">saved</span>') +
    ' &middot; ' + w + ' word' + (w === 1 ? '' : 's') +
    (doc.updated_at ? ' &middot; last saved ' + AO.Scratch._relative(doc.updated_at) : '');
};

/* ── Share panel (view / edit links) ─────────────────────────────────── */
AO.Scratch.toggleShare = function () {
  AO._scratchShareOpen = !AO._scratchShareOpen;
  AO.Scratch._renderToolbar();
  const panel = document.getElementById('scratchShare');
  if (AO._scratchShareOpen) { panel.classList.remove('hidden'); AO.Scratch._renderShare(); }
  else { panel.classList.add('hidden'); }
};

AO.Scratch._renderShare = function () {
  const panel = document.getElementById('scratchShare');
  if (!panel) return;
  const shares = (AO.Store.getScratch() || {}).shares || [];
  const list = shares.map(function (s) {
    const url = (location.origin + '/aoos/share/' + s.token);
    const editable = s.permission === 'edit';
    return '<div class="share-row">' +
      '<span class="share-perm ' + (editable ? 'is-edit' : 'is-view') + '" title="Permission">' +
        '<ao-icon name="' + (editable ? 'pencil-line' : 'book-open') + '" size="12"></ao-icon> ' + s.permission + '</span>' +
      '<input class="input share-url" value="' + AO.esc(url) + '" readonly onclick="this.select()">' +
      '<button class="btn-icon-inline" title="Open in new tab" onclick="window.open(\'' + url + '\', \'_blank\')"><ao-icon name="external-link" size="14"></ao-icon></button>' +
      '<button class="btn-icon-inline" title="Copy link" onclick="AO.Scratch.copyUrl(\'' + url + '\')"><ao-icon name="clipboard-list" size="14"></ao-icon></button>' +
      '<button class="btn-icon-inline" title="Revoke" onclick="AO.Scratch.revokeShare(\'' + s.token + '\')"><ao-icon name="trash-2" size="14"></ao-icon></button>' +
      '</div>';
  }).join('');
  panel.innerHTML =
    '<div class="share-create">' +
      '<span class="share-label">Create a link:</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="AO.Scratch.createShare(\'view\')"><ao-icon name="book-open" size="13"></ao-icon> View-only</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="AO.Scratch.createShare(\'edit\')"><ao-icon name="pencil-line" size="13"></ao-icon> Editable</button>' +
      '<span class="share-hint">view links are read-only; edit links can change the document.</span>' +
    '</div>' +
    (shares.length ? '<div class="share-list">' + list + '</div>' : '<div class="share-empty">No active links yet.</div>');
};

AO.Scratch.createShare = async function (permission) {
  const g = await AO.Store.createScratchShare(permission);
  if (!g) { AO.toast('Could not create link'); return; }
  AO.toast((permission === 'edit' ? 'Editable' : 'View') + ' link created');
  AO.Scratch._renderShare();
};

AO.Scratch.revokeShare = async function (token) {
  if (!confirm('Revoke this share link?')) return;
  await AO.Store.revokeScratchShare(token);
  AO.toast('Link revoked');
  AO.Scratch._renderShare();
};

AO.Scratch.copyUrl = async function (url) {
  try { await navigator.clipboard.writeText(url); AO.toast('Link copied'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); AO.toast('Link copied'); } catch (_) { AO.toast('Copy failed'); }
    document.body.removeChild(ta);
  }
};

/* ── Actions ─────────────────────────────────────────────────────────── */
AO.Scratch._relative = function (iso) {
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

AO.Scratch.setMode = async function (mode) {
  if (AO._scratchMode === mode) return;
  if (AO._scratchDirty) await AO.Scratch.save();
  AO._scratchMode = mode;
  AO.Scratch._renderToolbar();
  AO.Scratch._renderSurface();
};

AO.Scratch.save = async function () {
  clearTimeout(AO._scratchSaveTimer);
  if (AO._scratchMode !== 'edit') { AO._scratchDirty = false; AO.Scratch._renderStatus(); return; }
  const ta = document.getElementById('scratchArea');
  if (!ta) return;
  await AO.Store.updateScratch(ta.value);
  AO._scratchDirty = false;
  AO.Scratch._renderStatus();
};
