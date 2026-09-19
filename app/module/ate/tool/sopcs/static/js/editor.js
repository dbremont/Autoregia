/* ════════════════════════════════════════════════════════════
    SOPCS Editor — create/update a procedure. Metadata fields,
    markdown textarea with toolbar, Write/Preview toggle, and
    image insertion via file picker, clipboard paste, or
    drag-and-drop (uploads → CouchDB attachment → markdown).
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.Editor = {
  _id: null,        // null → create
  _dirty: false,
  _uploading: false,

  render(id) {
    this._id = id || null;
    this._dirty = false;
    return `<div class="animate-in" id="editorWrap">
      <a class="back-link" href="${this._id ? `#doc/${SOPCS.esc(this._id)}` : '#library'}">${SOPCS.icon('chevron-left', 14)} ${this._id ? 'Back to the procedure' : 'Library'}</a>
      <div class="content-header">
        <div><span class="eyebrow">${this._id ? 'Editing' : 'New procedure'}</span>
        <h1 id="edHeading">${this._id ? 'Edit SOP' : 'Write a Standard Operating Procedure'}</h1></div>
      </div>
      <div class="editor-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="edTitle">Title</label>
            <input type="text" id="edTitle" placeholder="Deploying Autoregia" maxlength="120">
          </div>
          <div class="form-group">
            <label for="edId">Identifier (slug)</label>
            <input type="text" id="edId" placeholder="deploying-autoregia" maxlength="64" ${this._id ? 'disabled' : ''}>
            <div class="form-hint">Lowercase letters, digits, '-'. Derived from the title when empty.</div>
          </div>
        </div>
        <div class="form-group">
          <label for="edSummary">Summary</label>
          <textarea id="edSummary" rows="2" maxlength="280" placeholder="One line on what this procedure accomplishes (derived from the body when empty)"></textarea>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="edTags">Tags (comma-separated)</label>
            <input type="text" id="edTags" placeholder="deployment, docker, operations">
          </div>
          <div class="form-group">
            <label for="edStatus">Status</label>
            <select id="edStatus">
              <option value="draft">draft — being written or revised</option>
              <option value="active">active — the way this is done</option>
              <option value="deprecated">deprecated — kept for the record</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="edBody">Body (markdown — figures welcome)</label>
          <div class="editor-toolbar">
            <button class="tb-btn" data-md="h2" title="Heading">H2</button>
            <button class="tb-btn" data-md="h3" title="Sub-heading">H3</button>
            <span class="tb-sep"></span>
            <button class="tb-btn" data-md="bold" title="Bold"><strong>B</strong></button>
            <button class="tb-btn" data-md="italic" title="Italic"><em>I</em></button>
            <button class="tb-btn" data-md="code" title="Inline code">${SOPCS.icon('code', 13)}</button>
            <span class="tb-sep"></span>
            <button class="tb-btn" data-md="link" title="Link">${SOPCS.icon('link-2', 13)}</button>
            <button class="tb-btn" data-md="ul" title="Bullet list">${SOPCS.icon('list', 13)}</button>
            <button class="tb-btn" data-md="task" title="Task list">${SOPCS.icon('check', 13)}</button>
            <button class="tb-btn" data-md="table" title="Table">${SOPCS.icon('table', 13)}</button>
            <span class="tb-sep"></span>
            <button class="tb-btn" data-md="image" id="edImgBtn" title="Insert image (picker · paste · drag-and-drop)">${SOPCS.icon('upload', 13)} Image</button>
            <div class="seg editor-toggle" id="edToggle" role="group" aria-label="Editor mode">
              <button class="seg-btn active" data-pane="write">write</button>
              <button class="seg-btn" data-pane="preview">preview</button>
            </div>
          </div>
          <div class="editor-body">
            <textarea id="edBody" placeholder="# Purpose&#10;&#10;Why this procedure exists…"></textarea>
            <div id="edPreview" class="doc-body" aria-live="polite"></div>
          </div>
          <input type="file" id="edImgFile" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
        </div>
        <div class="editor-foot">
          <span class="uploading-note" id="edNote"></span>
          <span class="spacer"></span>
          <button class="btn btn-secondary" id="edCancel">Cancel</button>
          <button class="btn btn-primary" id="edSave">${SOPCS.icon('check', 15)} Save</button>
        </div>
      </div>
    </div>`;
  },

  afterRender() {
    const wrap = document.getElementById('editorWrap');
    const ta = document.getElementById('edBody');

    if (this._id) {
      SOPCS.Store.getDoc(this._id).then((doc) => {
        document.getElementById('edTitle').value = doc.title || '';
        document.getElementById('edId').value = doc.id || '';
        document.getElementById('edSummary').value = doc.summary || '';
        document.getElementById('edTags').value = (doc.tags || []).join(', ');
        document.getElementById('edStatus').value = doc.status || 'draft';
        ta.value = doc.body || '';
        document.getElementById('edHeading').textContent = doc.title || 'Edit SOP';
      }).catch((err) => SOPCS.toast(err.message));
    }

    // slug follows the title while creating
    if (!this._id) {
      document.getElementById('edTitle').addEventListener('input', (e) => {
        const el = document.getElementById('edId');
        if (el.dataset.touched) return;
        el.value = (e.target.value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
      });
      document.getElementById('edId').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
    }

    // dirty tracking → unload guard
    const markDirty = () => { this._dirty = true; };
    ['edTitle', 'edSummary', 'edTags', 'edStatus'].forEach((idv) =>
      document.getElementById(idv).addEventListener('input', markDirty));
    ta.addEventListener('input', markDirty);
    this._unload = (e) => { if (this._dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', this._unload);

    // toolbar → markdown insertions
    wrap.querySelector('.editor-toolbar').addEventListener('click', (e) => {
      const b = e.target.closest('.tb-btn[data-md]');
      if (!b || b.disabled) return;
      const kind = b.dataset.md;
      if (kind === 'image') { document.getElementById('edImgFile').click(); return; }
      this.applyMarkdown(kind);
    });

    // write / preview toggle
    wrap.querySelector('#edToggle').addEventListener('click', (e) => {
      const b = e.target.closest('.seg-btn');
      if (!b) return;
      wrap.querySelectorAll('#edToggle .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
      const preview = document.getElementById('edPreview');
      const on = b.dataset.pane === 'preview';
      preview.classList.toggle('on', on);
      ta.style.display = on ? 'none' : '';
      if (on) preview.innerHTML = AUTOREGIA.Markdown.render(ta.value);
    });

    // image: picker / paste / drag-and-drop
    document.getElementById('edImgFile').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) this.upload(f);
      e.target.value = '';
    });
    ta.addEventListener('paste', (e) => {
      const files = Array.from((e.clipboardData || {}).files || []);
      const img = files.find((f) => /^image\//.test(f.type));
      if (img) { e.preventDefault(); this.upload(img); }
    });
    ['dragover', 'dragenter'].forEach((ev) => ta.addEventListener(ev, (e) => {
      e.preventDefault(); ta.classList.add('drop');
    }));
    ['dragleave', 'dragend'].forEach((ev) => ta.addEventListener(ev, () => ta.classList.remove('drop')));
    ta.addEventListener('drop', (e) => {
      e.preventDefault(); ta.classList.remove('drop');
      const files = Array.from(e.dataTransfer?.files || []);
      const img = files.find((f) => /^image\//.test(f.type));
      if (img) this.upload(img);
    });

    // save / cancel
    document.getElementById('edSave').addEventListener('click', () => this.save());
    document.getElementById('edCancel').addEventListener('click', async () => {
      if (this._dirty) {
        const ok = await SOPCS.confirm({
          title: 'Discard changes',
          message: 'Discard unsaved changes to this procedure?',
          confirmText: 'Discard',
        });
        if (!ok) return;
      }
      this.leave();
    });
    ta.focus();
  },

  leave() {
    this._dirty = false;
    window.removeEventListener('beforeunload', this._unload);
    SOPCS.navigate(this._id ? `doc/${this._id}` : 'library');
  },

  // ── toolbar insertions around the selection ──
  applyMarkdown(kind) {
    const ta = document.getElementById('edBody');
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    const [before, after, placeholder] = {
      h2:     ['## ', '', 'Heading'],
      h3:     ['### ', '', 'Sub-heading'],
      bold:   ['**', '**', 'bold text'],
      italic: ['*', '*', 'italic text'],
      code:   ['`', '`', 'code'],
      link:   ['[', '](https://)', 'link text'],
      ul:     ['- ', '', 'item'],
      task:   ['- [ ] ', '', 'task'],
      table:  ['', '', '| Column | Column |\n|---|---|\n| value | value |'],
    }[kind] || ['', '', ''];
    const body = sel || placeholder;
    const insert = kind === 'table' || kind === 'h2' || kind === 'h3' || kind === 'ul' || kind === 'task'
      ? (ta.value.slice(0, s) === '' || ta.value.slice(0, s).endsWith('\n') ? '' : '\n') + before + body + after + '\n'
      : before + body + after;
    ta.setRangeText(insert, s, e, kind === 'table' || kind === 'h2' || kind === 'h3' ? 'end' : 'select');
    ta.focus();
    this._dirty = true;
  },

  // ── image upload → markdown snippet at the cursor ──
  upload(file) {
    if (this._uploading) return;
    this._uploading = true;
    const note = document.getElementById('edNote');
    const btn = document.getElementById('edImgBtn');
    note.textContent = `uploading ${file.name || 'figure'}…`;
    btn.disabled = true;
    SOPCS.Store.uploadImage(file).then((res) => {
      const ta = document.getElementById('edBody');
      ta.setRangeText((ta.value.slice(0, ta.selectionStart) === '' || ta.value.slice(0, ta.selectionStart).endsWith('\n') ? '' : '\n')
        + res.markdown + '\n', ta.selectionStart, ta.selectionEnd, 'end');
      ta.focus();
      this._dirty = true;
      SOPCS.toast('figure inserted');
    }).catch((err) => SOPCS.toast(err.message)).finally(() => {
      this._uploading = false;
      note.textContent = '';
      btn.disabled = false;
    });
  },

  async save() {
    const title = document.getElementById('edTitle').value.trim();
    const body = document.getElementById('edBody').value;
    if (!title) { SOPCS.toast('a title is required'); document.getElementById('edTitle').focus(); return; }
    if (!body.trim()) { SOPCS.toast('the body is required (markdown)'); document.getElementById('edBody').focus(); return; }
    const payload = {
      title,
      body,
      summary: document.getElementById('edSummary').value.trim(),
      tags: document.getElementById('edTags').value,
      status: document.getElementById('edStatus').value,
    };
    const idField = document.getElementById('edId');
    if (!this._id && idField.value.trim()) payload.id = idField.value.trim();
    const btn = document.getElementById('edSave');
    btn.disabled = true;
    try {
      const doc = this._id
        ? await SOPCS.Store.updateDoc(this._id, payload)
        : await SOPCS.Store.createDoc(payload);
      this._dirty = false;
      window.removeEventListener('beforeunload', this._unload);
      SOPCS.toast(this._id ? 'procedure updated' : 'procedure created');
      SOPCS.Store.loadTags().catch(() => {});
      SOPCS.Store.loadDocs().catch(() => {});
      SOPCS.navigate('doc/' + doc.id);
    } catch (err) {
      SOPCS.toast(err.message);
      btn.disabled = false;
    }
  },
};
