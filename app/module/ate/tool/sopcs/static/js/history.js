/* ════════════════════════════════════════════════════════════
    SOPCS History — the version panel of a procedure: revision
    list, unified diff with +/- tinting, forward-only restore.
    The modal is per-tool markup (ui.spec §12) opened through the
    shared AUTOREGIA.dialog contract.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.History = {
  _doc: null,
  _dialog: null,

  open(doc) {
    this._doc = doc;
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal hist-modal" role="dialog">
        <div class="modal-header">
          <h2>History — ${SOPCS.esc(doc.title)}</h2>
          <button class="btn-icon" aria-label="Close" data-x="close">${SOPCS.icon('x', 16)}</button>
        </div>
        <div class="modal-body hist-layout">
          <div class="hist-list" id="histList"><div class="toc-empty">Loading…</div></div>
          <div class="hist-diff" id="histDiff">
            <div class="toc-empty">Select a revision to see what changed.</div>
          </div>
        </div>
      </div>`;
    ov.querySelector('[data-x="close"]').addEventListener('click', () => this.close());
    document.body.appendChild(ov);
    // onClose removes the overlay for EVERY close path (button, Esc, scrim) —
    // the dialog core only unbinds listeners, it never touches the DOM.
    this._dialog = AUTOREGIA.dialog(ov, {
      label: 'Version history',
      onClose: () => ov.remove(),
    });
    this.loadList();
  },

  close() { this._dialog?.close(); this._dialog = null; },

  async loadList() {
    const el = document.getElementById('histList');
    try {
      const revs = await SOPCS.Store.revisions(this._doc.id);
      if (!revs.length) {
        el.innerHTML = '<div class="toc-empty">No revisions yet.</div>';
        return;
      }
      el.innerHTML = revs.map((r) => `
        <button class="hist-item" data-seq="${r.seq}">
          <span class="hist-seq">r${r.seq}</span>
          <span class="hist-body">
            <span class="hist-when">${SOPCS.esc(SOPCS.Store.fmtDate(r.created_at))}${r.seq === this._doc.revision ? ' · current' : ''}</span>
            <span class="hist-comment">${r.comment ? SOPCS.esc(r.comment) : '<em>no note</em>'}</span>
          </span>
          <span class="hist-words">${r.words}w</span>
        </button>`).join('');
      el.querySelectorAll('.hist-item').forEach((b) =>
        b.addEventListener('click', () => {
          el.querySelectorAll('.hist-item').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          this.showDiff(parseInt(b.dataset.seq, 10));
        }));
    } catch (err) {
      el.innerHTML = `<div class="toc-empty">${SOPCS.esc(err.message)}</div>`;
    }
  },

  async showDiff(seq, against) {
    const el = document.getElementById('histDiff');
    el.innerHTML = '<div class="toc-empty">Computing diff…</div>';
    try {
      const d = await SOPCS.Store.revisionDiff(this._doc.id, seq, against);
      const vsLabel = against === 'latest' ? 'vs previous' : 'vs current';
      el.innerHTML = `
        <div class="hist-diff-head">
          <span class="pill accent">${SOPCS.esc(d.from_label)}</span>
          <span class="hist-arrow">→</span>
          <span class="pill accent">${SOPCS.esc(d.to_label)}</span>
          <span class="spacer"></span>
          <button class="btn btn-secondary btn-sm" id="histToggle">${vsLabel}</button>
          <button class="btn btn-primary btn-sm" id="histRestore" ${seq === this._doc.revision ? 'disabled title="this is the current version"' : ''}>${SOPCS.icon('history', 13)} Restore</button>
        </div>
        <pre class="diff-view">${this.diffHTML(d.diff)}</pre>`;
      el.querySelector('#histToggle').addEventListener('click', () =>
        this.showDiff(seq, against === 'latest' ? undefined : 'latest'));
      el.querySelector('#histRestore').addEventListener('click', () => this.restore(seq));
    } catch (err) {
      el.innerHTML = `<div class="toc-empty">${SOPCS.esc(err.message)}</div>`;
    }
  },

  // unified diff text → tinted lines (headers faint, '-' red, '+' green)
  diffHTML(diff) {
    return (diff || '').split('\n').map((line) => {
      const esc = SOPCS.esc(line);
      if (/^(\+\+\+|---)/.test(line)) return `<span class="dl-file">${esc || ' '}</span>`;
      if (/^@@/.test(line)) return `<span class="dl-hunk">${esc || ' '}</span>`;
      if (/^\+/.test(line)) return `<span class="dl-add">${esc || ' '}</span>`;
      if (/^-/.test(line)) return `<span class="dl-del">${esc || ' '}</span>`;
      return `<span class="dl-ctx">${esc || ' '}</span>`;
    }).join('\n');
  },

  async restore(seq) {
    const ok = await SOPCS.confirm({
      title: 'Restore revision',
      message: `Restore “${this._doc.title}” to r${seq}? The current content is kept in history — restoring creates a new revision.`,
      confirmText: 'Restore',
    });
    if (!ok) return;
    try {
      await SOPCS.Store.restore(this._doc.id, seq);
      SOPCS.toast(`restored to r${seq}`);
      this.close();
      SOPCS.Store.loadDocs().catch(() => {});
      SOPCS.navigate('doc/' + this._doc.id);
    } catch (err) { SOPCS.toast(err.message); }
  },
};
