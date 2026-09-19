/* ════════════════════════════════════════════════════════════
    SOPCS Reader — one procedure: metadata header, rendered
    markdown (shared renderer), sticky TOC rail, edit/delete.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.Reader = {
  _id: null,

  render(id) {
    this._id = id;
    return `<div class="animate-in" id="readerWrap">
      <a class="back-link" href="#library">${SOPCS.icon('chevron-left', 14)} Library</a>
      <div class="empty-state"><h3>Loading…</h3></div>
    </div>`;
  },

  afterRender() {
    SOPCS.Store.getDoc(this._id).then((doc) => {
      this.paint(doc);
    }).catch((err) => {
      const wrap = document.getElementById('readerWrap');
      wrap.innerHTML = `<div class="empty-state"><h3>Could not load the procedure</h3>
        <p>${SOPCS.esc(err.message)}</p>
        <button class="btn btn-secondary btn-sm" onclick="location.hash='#library'">Back to the library</button></div>`;
    });
  },

  paint(doc) {
    const badge = `<span class="badge badge-${SOPCS.esc(doc.status)}">${SOPCS.esc(doc.status)}</span>`;
    const tags = (doc.tags || []).map((t) => `<span class="pill gold">#${SOPCS.esc(t)}</span>`).join(' ');
    const toc = (doc.toc || []);
    const tocHTML = toc.length
      ? toc.map((h) => `<a class="toc-l${h.level}" href="#${h.anchor}" data-anchor="${h.anchor}">${SOPCS.esc(h.text)}</a>`).join('')
      : '<div class="toc-empty">No headings</div>';

    const wrap = document.getElementById('readerWrap');
    wrap.innerHTML = `
      <div class="detail-header reader-head">
        <div>
          <span class="eyebrow">SOP · ${SOPCS.esc(doc.id)}</span>
          <h1>${SOPCS.esc(doc.title)}</h1>
          <div class="rc-meta">
            ${badge}
            <span class="rc-domain">${SOPCS.icon('clock', 12)} ${SOPCS.esc(SOPCS.Store.readTime(doc.reading_minutes))} · ${doc.words} words</span>
            <span class="rc-domain">${SOPCS.icon('history', 12)} updated ${SOPCS.esc(SOPCS.Store.fmtDate(doc.updated_at))}</span>
            ${tags}
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary btn-sm" id="docHistory">${SOPCS.icon('history', 14)} History</button>
          <button class="btn btn-secondary btn-sm" id="docEdit">${SOPCS.icon('pencil', 14)} Edit</button>
          <button class="btn btn-secondary btn-sm" id="docDelete">${SOPCS.icon('trash-2', 14)} Delete</button>
        </div>
      </div>
      ${doc.summary ? `<p class="rc-preview" style="max-width:var(--measure);margin-bottom:var(--space-6)">${SOPCS.esc(doc.summary)}</p>` : ''}
      <div class="doc-grid-reader">
        <article class="doc-body">${AUTOREGIA.Markdown.render(doc.body)}</article>
        <aside class="toc-rail">
          <div class="toc-title">Contents</div>
          <nav class="toc-list" id="tocList">${tocHTML}</nav>
        </aside>
      </div>`;

    wrap.querySelector('#docHistory').addEventListener('click', () => SOPCS.History.open(doc));
    wrap.querySelector('#docEdit').addEventListener('click', () => SOPCS.navigate(`doc/${doc.id}/edit`));
    wrap.querySelector('#docDelete').addEventListener('click', async () => {
      const ok = await SOPCS.confirm({
        title: 'Delete procedure',
        message: `Delete “${doc.title}” (${doc.id})? Its figures and embedding are removed with it. This cannot be undone.`,
        confirmText: 'Delete',
      });
      if (!ok) return;
      try {
        await SOPCS.Store.deleteDoc(doc.id);
        SOPCS.toast('procedure deleted');
        SOPCS.Store.loadDocs().catch(() => {});
        SOPCS.navigate('library');
      } catch (err) { SOPCS.toast(err.message); }
    });

    wrap.querySelector('#tocList').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-anchor]');
      if (!a) return;
      e.preventDefault();
      const target = document.getElementById(a.dataset.anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      wrap.querySelectorAll('#tocList a').forEach((x) => x.style.borderLeftColor = '');
      a.style.borderLeftColor = 'var(--oxford)';
    });
  },
};
