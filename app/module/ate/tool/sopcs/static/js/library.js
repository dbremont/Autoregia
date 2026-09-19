/* ════════════════════════════════════════════════════════════
    SOPCS Library — the catalog view: search (lexical / semantic /
    auto), status + tag facets, sort, pagination, record cards.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.Library = {
  render() {
    return `<div class="animate-in">
      <div class="lib-hero">
        <div class="lib-hero-text">
          <span class="eyebrow lib-hero-eyebrow">Catalog</span>
          <h1>Standard Operating Procedures</h1>
        </div>
        <div class="actions">
          <button class="btn lib-hero-btn" id="libNew">${SOPCS.icon('plus', 16)} New SOP</button>
        </div>
      </div>
      <div class="lib-controls">
        <div class="search-bar lib-search-row">
          <div class="search-input-wrap">
            <span class="search-icon">${SOPCS.icon('search', 15)}</span>
            <input type="search" id="libSearch" placeholder="Search the catalog… (full text)" aria-label="Search the catalog" autocomplete="off">
          </div>
        </div>
        <div class="lib-controls-row">
          <div class="lib-ctrl-group">
            <span class="lib-ctrl-label">search mode</span>
            <div class="seg" id="modeSeg" role="group" aria-label="Search mode">
              <button class="seg-btn" data-mode="auto">auto</button>
              <button class="seg-btn" data-mode="lexical">lexical</button>
              <button class="seg-btn" data-mode="semantic" title="semantic search — requires fastembed">semantic</button>
            </div>
          </div>
          <div class="lib-ctrl-group">
            <span class="lib-ctrl-label">status</span>
            <div class="seg" id="statusSeg" role="group" aria-label="Status filter">
              <button class="seg-btn" data-status="">all</button>
              <button class="seg-btn" data-status="draft">draft</button>
              <button class="seg-btn" data-status="active">active</button>
              <button class="seg-btn" data-status="deprecated">deprecated</button>
            </div>
          </div>
          <div class="lib-ctrl-group">
            <span class="lib-ctrl-label">sort</span>
            <select id="sortSel" class="sort-select" aria-label="Sort order">
              <option value="updated">recently updated</option>
              <option value="created">recently created</option>
              <option value="title">title A–Z</option>
            </select>
          </div>
        </div>
      </div>
      <div class="facet-row" id="tagChips"></div>
      <div id="docList"><div class="empty-state"><h3>Loading…</h3></div></div>
      <div class="pager" id="docPager"></div>
    </div>`;
  },

  afterRender() {
    document.getElementById('libNew')?.addEventListener('click', () => SOPCS.navigate('new'));
    const si = document.getElementById('libSearch');
    si.value = SOPCS.Store.state.q;
    let deb = null;
    si?.addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(() => this.runSearch(si.value.trim()), 260);
    });
    si?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(deb); this.runSearch(si.value.trim()); }
      if (e.key === 'Escape') { si.value = ''; this.runSearch(''); }
    });
    document.querySelectorAll('#modeSeg .seg-btn').forEach(b =>
      b.addEventListener('click', () => this.runSearch(SOPCS.Store.state.q, b.dataset.mode)));
    document.querySelectorAll('#statusSeg .seg-btn').forEach(b =>
      b.addEventListener('click', async () => {
        SOPCS.Store.state.status = b.dataset.status || null;
        SOPCS.Store.state.page = 1;
        this.syncSegs();
        await this.refresh();
      }));
    const sortSel = document.getElementById('sortSel');
    sortSel?.addEventListener('change', async () => {
      SOPCS.Store.state.sort = sortSel.value;
      SOPCS.Store.state.page = 1;
      this.syncSegs();
      await this.refresh();
    });
    document.getElementById('docPager')?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-page]');
      if (!b || b.disabled) return;
      SOPCS.Store.state.page = parseInt(b.dataset.page, 10);
      this.refresh().catch((err) => SOPCS.toast(err.message));
    });
    document.getElementById('tagChips')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.facet-chip[data-tag]');
      if (!chip) return;
      SOPCS.Store.state.tag = SOPCS.Store.state.tag === chip.dataset.tag ? null : chip.dataset.tag;
      SOPCS.Store.state.page = 1;
      this.refresh().catch((err) => SOPCS.toast(err.message));
    });
    document.getElementById('docList')?.addEventListener('click', (e) => {
      const card = e.target.closest('.record-card[data-doc]');
      if (card) SOPCS.navigate('doc/' + card.dataset.doc);
    });
    this.syncSegs();
    this.refresh().catch((err) => {
      document.getElementById('docList').innerHTML =
        `<div class="empty-state"><h3>Could not load the catalog</h3><p>${SOPCS.esc(err.message)}</p></div>`;
    });
  },

  syncSegs() {
    const st = SOPCS.Store.state;
    document.querySelectorAll('#modeSeg .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === st.mode));
    document.querySelectorAll('#statusSeg .seg-btn').forEach(b =>
      b.classList.toggle('active', (b.dataset.status || null) === st.status));
    // semantic mode is only meaningful when the embeddings backend exists
    const backend = SOPCS.Store.backend();
    const semBtn = document.querySelector('#modeSeg [data-mode="semantic"]');
    if (semBtn) {
      const available = !backend || backend.available;
      semBtn.disabled = !available;
      semBtn.title = available ? 'semantic search' : 'semantic search unavailable — install fastembed';
    }
    const sortSel = document.getElementById('sortSel');
    if (sortSel && !document.activeElement?.matches?.('#sortSel')) sortSel.value = st.sort;
  },

  // runSearch: enter search mode (q) or leave it (empty q → catalog browse)
  async runSearch(q, mode) {
    const st = SOPCS.Store.state;
    st.page = 1;
    try {
      if (q) {
        await SOPCS.Store.search(q, mode);
      } else {
        SOPCS.Store.clearSearch();
        if (mode) st.mode = mode;
        await SOPCS.Store.loadDocs();
      }
      this.syncSegs();
      this.paint();
    } catch (err) {
      if (err.status === 501) {
        // semantic unavailable — say so, fall back to lexical, retry once
        SOPCS.toast('semantic search unavailable — using lexical');
        st.mode = 'lexical';
        this.syncSegs();
        try { await this.runSearch(q, 'lexical'); } catch (e2) { SOPCS.toast(e2.message); }
      } else {
        SOPCS.toast(err.message);
      }
    }
  },

  async refresh() {
    if (SOPCS.Store.searching()) {
      await SOPCS.Store.search();        // re-run with current state
    } else {
      await SOPCS.Store.loadDocs();
    }
    this.paint();
  },

  paint() {
    const searching = SOPCS.Store.searching();
    const st = SOPCS.Store.state;
    const res = SOPCS.Store.docs();
    const items = searching ? res.items : res.items;

    const backend = SOPCS.Store.backend();
    const sortSel = document.getElementById('sortSel');
    if (sortSel) sortSel.disabled = searching;   // ranking belongs to search

    // tag facets (hidden while searching — facets filter the catalog)
    const tags = SOPCS.Store.tags() || [];
    document.getElementById('tagChips').innerHTML = searching ? '' : tags.map(t =>
      `<button class="facet-chip${st.tag === t.tag ? ' on' : ''}" data-tag="${SOPCS.esc(t.tag)}">${SOPCS.esc(t.tag)} <span class="rc-tag">${t.count}</span></button>`
    ).join('');

    const list = document.getElementById('docList');
    if (!items.length) {
      list.innerHTML = `<div class="search-empty">
        <h3>${searching ? 'Nothing matches' : 'The catalog is empty'}</h3>
        <p>${searching ? `No procedure matches “${SOPCS.esc(st.q)}”${st.status ? ' with the current filter' : ''}.` : 'Write the first standard operating procedure.'}</p>
        ${searching ? `<button class="btn btn-secondary btn-sm" id="libClear">Clear search</button>`
                    : `<button class="btn btn-primary btn-sm" id="libNewEmpty">${SOPCS.icon('plus', 14)} New SOP</button>`}
      </div>`;
      document.getElementById('libClear')?.addEventListener('click', () => {
        document.getElementById('libSearch').value = '';
        this.runSearch('');
      });
      document.getElementById('libNewEmpty')?.addEventListener('click', () => SOPCS.navigate('new'));
    } else {
      list.innerHTML = `<div class="doc-grid">` + items.map((d) => this.card(d)).join('') + `</div>`;
    }

    // pager (catalog browsing only; search results come back as one list)
    const pager = document.getElementById('docPager');
    if (!searching && res.pages > 1) {
      pager.innerHTML = `
        <button class="btn btn-secondary btn-sm" data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''}>${SOPCS.icon('chevron-left', 14)} Prev</button>
        <span class="pager-ind">page ${res.page} / ${res.pages}</span>
        <button class="btn btn-secondary btn-sm" data-page="${res.page + 1}" ${!res.has_more ? 'disabled' : ''}>Next ${SOPCS.icon('chevron-right', 14)}</button>`;
    } else {
      pager.innerHTML = '';
    }

    if (searching && backend && !backend.available && st.mode === 'semantic') {
      SOPCS.toast('semantic search unavailable — install fastembed to enable it');
    }
  },

  card(d) {
    const statusBadge = `<span class="badge badge-${SOPCS.esc(d.status)}">${SOPCS.esc(d.status)}</span>`;
    const tags = (d.tags || []).slice(0, 4).map((t) => `<span class="rc-tag">#${SOPCS.esc(t)}</span>`).join(' ');
    const accent = d.status === 'active' ? 'var(--color-success)'
      : d.status === 'draft' ? 'var(--gold)' : 'var(--ink-6)';
    return `<div class="record-card" data-doc="${SOPCS.esc(d.id)}" style="--rc-accent: ${accent}">
      <span class="rc-type">${SOPCS.icon('book-open', 11)} sop · ${SOPCS.esc(d.id)}</span>
      <div class="rc-title"><a class="rc-title-link" href="#doc/${SOPCS.esc(d.id)}">${SOPCS.esc(d.title)}</a></div>
      <div class="rc-preview">${SOPCS.esc(d.summary || '')}</div>
      <div class="rc-meta">
        ${statusBadge}
        <span class="rc-domain">${SOPCS.icon('clock', 12)} ${SOPCS.esc(SOPCS.Store.readTime(d.reading_minutes))}</span>
        <span class="rc-domain">${SOPCS.icon('history', 12)} ${SOPCS.esc(SOPCS.Store.fmtDate(d.updated_at))}</span>
        ${tags}
      </div>
    </div>`;
  },
};
