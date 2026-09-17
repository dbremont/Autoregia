/* ════════════════════════════════════════════════════════════
   CTES Handlers — the register and its manager.
   Catalog: searchable, status-filtered table of handles.
   Detail (handlers/<id>): metadata, code viewer, stats, run
   panel, history, and the full lifecycle — edit, activate/
   inactivate, manual delete. Every mutation is audited server-side.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Handlers = (() => {
  const v = CTES.view;
  const STATUS_COLOR = { active: '#3F6E50', inactive: '#8C877B', missing: '#A33434' };
  const state = {
    q: '', status: 'all',           // catalog filters
    detail: null, detailId: null,   // detail data
    selectedFile: null, fileCache: {},
    editing: false,
  };

  function statusPill(h) {
    const s = h.code_on_disk === false ? 'missing' : (h.status || 'active');
    const label = h.code_on_disk === false ? `${h.status || 'active'} · no code` : (h.status || 'active');
    const c = STATUS_COLOR[s] || '#8C877B';
    return `<span class="src-health"><span class="src-dot" style="background:${c}"></span>${CTES.esc(label)}</span>`;
  }

  /* ── catalog ──────────────────────────────────────────────── */
  function filteredHandles() {
    let rows = CTES.Store.handles();
    if (state.status !== 'all') rows = rows.filter(h => (h.status || 'active') === state.status);
    if (state.q) {
      const q = state.q.toLowerCase();
      rows = rows.filter(h => (h.id + ' ' + (h.name || '') + ' ' + (h.description || '') + ' ' + h.entry_point).toLowerCase().includes(q));
    }
    return rows;
  }

  function renderCatalog() {
    const rows = filteredHandles();
    const table = !rows.length
      ? '<div class="empty-state">no handles match — register one or scan packages/</div>'
      : `<table class="src-table"><thead><tr><th>Handle</th><th>Entry point</th><th>Status</th><th>Timeout</th><th>Runs</th></tr></thead><tbody>
        ${rows.map(h => `<tr data-id="${CTES.esc(h.id)}" role="button" tabindex="0" style="cursor:pointer">
          <td><div class="src-src-names"><div class="src-name">${CTES.esc(h.name || h.id)}</div><div class="src-id">${CTES.esc(h.id)}</div></div></td>
          <td class="src-id">${CTES.esc(h.entry_point)}</td>
          <td>${statusPill(h)}</td>
          <td class="src-num">${CTES.Store.fmtDur((h.timeout_s || 60) * 1000)}</td>
          <td class="src-num">${h.stats ? h.stats.total : '—'}</td>
        </tr>`).join('')}</tbody></table>`;
    return `
      ${v.header('Handlers', `<button class="btn btn-primary btn-sm" id="regToggle">${CTES.icon('edit', 14)} Register</button>`)}
      <div class="filter-bar animate-in">
        <div class="search-input-wrap">
          <span class="search-icon">${CTES.icon('search', 15)}</span>
          <input type="search" id="hQ" placeholder="Filter the register…" value="${CTES.esc(state.q)}" aria-label="Filter handles">
        </div>
        <div class="seg" role="group" aria-label="status filter">
          ${['all', 'active', 'inactive'].map(s => `<button class="seg-btn ${state.status === s ? 'active' : ''}" data-status="${s}">${s}</button>`).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" id="scanBtn" title="Re-read packages/ manifests">${CTES.icon('refresh', 13)} Scan</button>
      </div>
      <div class="chart-card animate-in" id="regFormCard" style="display:none">
        <div class="chart-head"><div><span class="eyebrow">registration</span><h3>Register a handle</h3></div></div>
        <form id="regForm" class="form-grid-ctes">
          <div class="form-group"><label for="regId">id</label><input id="regId" required pattern="[a-z][a-z0-9-]{1,31}" placeholder="my-handle"><span class="form-hint">lowercase letters, digits, '-'</span></div>
          <div class="form-group"><label for="regEntry">entry point</label><input id="regEntry" required placeholder="main:run"><span class="form-hint">module:function</span></div>
          <div class="form-group"><label for="regName">name</label><input id="regName" placeholder="My Handle"></div>
          <div class="form-group"><label for="regTimeout">timeout · s</label><input id="regTimeout" type="number" min="1" max="600" placeholder="default from settings"></div>
          <div class="form-group" style="grid-column:1/-1"><label for="regDesc">description</label><input id="regDesc" placeholder="What this handle accomplishes."></div>
          <div style="grid-column:1/-1;display:flex;gap:10px;align-items:center">
            <button type="submit" class="btn btn-primary btn-sm">Register</button>
            <span class="form-hint">creates packages/&lt;id&gt;/ with a manifest and a skeleton main.py — put your code there.</span>
          </div>
        </form>
      </div>
      <div class="chart-card animate-in">${table}</div>`;
  }

  /* ── detail ───────────────────────────────────────────────── */
  function renderDetail() {
    const h = state.detail;
    if (!h) return `${v.header('Handler')}<div class="empty-state">loading…</div>`;
    const inactive = (h.status || 'active') !== 'active';
    const actions = `
      <button class="btn btn-primary btn-sm" id="dRun" ${inactive || h.code_on_disk === false ? 'disabled title="handle is inactive or code missing"' : ''}>${CTES.icon('play', 13)} Run</button>
      <button class="btn btn-secondary btn-sm" id="dEdit">${CTES.icon('edit', 13)} Edit</button>
      <button class="btn btn-secondary btn-sm" id="dStatus">${CTES.icon(inactive ? 'check-circle' : 'pause', 13)} ${inactive ? 'Activate' : 'Inactivate'}</button>
      <button class="btn btn-ghost btn-sm" id="dDelete" style="color:var(--color-danger,#A33434)">${CTES.icon('trash-2', 13)} Delete</button>`;
    const files = (h.files || []).map(f =>
      `<span class="facet-chip data-file" data-file="${CTES.esc(f)}">${CTES.icon('file-text', 12)} ${CTES.esc(f)}</span>`).join('') ||
      '<span class="text-faint text-sm">no code on disk</span>';
    const st = h.stats || { total: 0, by_status: {}, last_run: null };
    return `
      ${v.header(`<a href="#handlers" class="back-link">${CTES.icon('arrow-left', 14)}</a> ${CTES.esc(h.id)}`, actions)}
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">registration</span><h3>${CTES.esc(h.name || h.id)}</h3></div><div>${statusPill(h)}</div></div>
          <div class="meta-table">
            ${metaRow('entry point', `<code class="text-mono text-xs">${CTES.esc(h.entry_point)}</code>`)}
            ${metaRow('description', CTES.esc(h.description || '—'))}
            ${metaRow('timeout', CTES.Store.fmtDur((h.timeout_s || 60) * 1000))}
            ${metaRow('network', h.network ? 'allowed' : 'none (isolated)')}
            ${metaRow('image', h.image ? `<code class="text-mono text-xs">${CTES.esc(h.image)}</code>` : 'backend default')}
            ${metaRow('code path', `<code class="text-mono text-xs">${CTES.esc(h.code_path)}</code>`)}
            ${metaRow('registered', CTES.Store.fmtTime(h.created_at))}
            ${metaRow('updated', CTES.Store.fmtTime(h.updated_at))}
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">execution record</span><h3>Runs</h3></div></div>
          <div class="stat-row">
            ${v.statCard(st.total, 'total')}
            ${v.statCard(st.by_status.completed || 0, 'completed', '#3F6E50')}
            ${v.statCard((st.by_status.failed || 0) + (st.by_status.timed_out || 0), 'failed', '#A33434')}
          </div>
          <div class="meta-table">
            ${metaRow('last run', st.last_run ? `<a href="#runs" class="text-mono text-xs" id="lastRunLink" data-run="${CTES.esc(st.last_run.id)}">${CTES.esc(st.last_run.id)}</a> — ${CTES.esc(st.last_run.status)} · ${CTES.Store.fmtTime(st.last_run.started_at)}` : '—')}
            ${metaRow('code sha256', h.code_sha256 ? 'see runs (snapshot per run)' : '—')}
          </div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">code</span><h3>Files</h3></div><span class="form-hint">read-only — edit on disk, then Scan</span></div>
        <div class="facet-row">${files}</div>
        <pre class="code-view" id="codeView"><span class="text-faint">select a file</span></pre>
      </div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">dispatch</span><h3>Run this handle</h3></div></div>
          <form id="dRunForm">
            <div class="form-group"><label for="dPayload">payload · JSON</label><textarea id="dPayload" rows="5" spellcheck="false">{}</textarea></div>
            <div class="form-row-ctes">
              <div class="form-group"><label for="dTimeout">timeout · s</label><input id="dTimeout" type="number" min="1" max="600" placeholder="${h.timeout_s || 'default'}"></div>
              <div class="form-group"><label for="dBackend">backend</label>
                <select id="dBackend"><option value="">default</option><option value="docker">docker</option><option value="subprocess">subprocess</option></select></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">${CTES.icon('play', 13)} Run</button>
            <div class="form-hint" id="dRunStatus" style="margin-top:8px"></div>
          </form>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">outcome</span><h3>Latest dispatch</h3></div></div>
          <div id="dOutcome"><div class="empty-state">— no run yet —</div></div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Handle history</h3></div><span class="form-hint">most recent first</span></div>
        <div id="dHistory"><div class="empty-state">loading…</div></div>
      </div>`;
  }

  function metaRow(k, val) {
    return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`;
  }

  /* ── render dispatch ──────────────────────────────────────── */
  function render(sub) {
    if (sub) {
      if (state.detailId !== sub) { state.detail = null; state.detailId = sub; state.selectedFile = null; state.fileCache = {}; state.editing = false; }
      return renderDetail();
    }
    state.detailId = null; state.detail = null;
    return renderCatalog();
  }

  /* ── behaviors ────────────────────────────────────────────── */
  function showOutcome(host, run) {
    host.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        <span class="pill ${run.status === 'completed' ? 'gold' : ''}" style="${run.status === 'completed' ? '' : 'color:#A33434'}">${CTES.esc(run.status)}</span>
        <span class="src-id">${CTES.esc(run.id)}</span>
        <span class="text-faint text-xs">${CTES.esc(run.backend)} · ${CTES.Store.fmtDur(run.duration_ms)} · sha ${CTES.esc((run.code_sha256 || '').slice(0, 8))}</span>
      </div>
      ${run.error ? `<p class="text-sm" style="color:#A33434;margin-bottom:6px">${CTES.esc(run.error)}</p>` : ''}
      <div class="eyebrow" style="margin-bottom:4px">result</div>
      <pre class="code-view">${run.result != null ? CTES.esc(JSON.stringify(run.result, null, 2)) : '<span class="text-faint">null</span>'}</pre>
      <div class="eyebrow" style="margin:8px 0 4px">log</div>
      <pre class="code-view">${CTES.esc((run.stdout || '') + (run.stderr || '')) || '<span class="text-faint">—</span>'}</pre>`;
  }

  async function loadDetail(sub) {
    try {
      state.detail = await CTES.Store.handleDetail(state.detailId);
      state.detail.code_on_disk = state.detail.code_on_disk !== false;
      CTES.navigate('handlers/' + sub);
    } catch (e) { CTES.toast(e.message); }
  }

  function drawHistory() {
    const host = document.getElementById('dHistory');
    const runs = state.detailRuns || [];
    if (!runs.length) { host.innerHTML = '<div class="empty-state">no runs yet</div>'; return; }
    host.innerHTML = `<table class="src-table"><thead><tr><th>Run</th><th>Status</th><th>Duration</th><th>Started</th><th>Spec</th></tr></thead><tbody>
      ${runs.map(r => `<tr data-run="${CTES.esc(r.id)}" role="button" tabindex="0" style="cursor:pointer">
        <td class="src-id">${CTES.esc(r.id)}</td>
        <td><span class="pill" style="${r.status === 'completed' ? 'color:#3F6E50' : 'color:#A33434'}">${CTES.esc(r.status)}</span></td>
        <td class="src-num">${CTES.Store.fmtDur(r.duration_ms)}</td>
        <td class="src-ago">${CTES.Store.fmtTime(r.started_at)}</td>
        <td class="src-id">${CTES.esc(r.task_spec_id || '—')}</td>
      </tr>`).join('')}</tbody></table>`;
    host.querySelectorAll('tr[data-run]').forEach(tr => tr.addEventListener('click', () => {
      CTES.navigate('runs'); setTimeout(() => CTES.Runs.showRun(tr.dataset.run), 80);
    }));
  }

  function bindDetail() {
    const h = state.detail;
    if (!h) {
      loadDetail(state.detailId);
      return;
    }
    const inactive = (h.status || 'active') !== 'active';

    document.getElementById('dEdit')?.addEventListener('click', () => { state.editing = true; openEditForm(); });
    document.getElementById('dStatus')?.addEventListener('click', async () => {
      try {
        await CTES.Store.setHandleStatus(h.id, inactive ? 'active' : 'inactive');
        CTES.toast(`handle ${inactive ? 'activated' : 'inactivated'}`);
        await CTES.Store.loadHandles(); loadDetail(h.id);
      } catch (e) { CTES.toast(e.message); }
    });
    document.getElementById('dDelete')?.addEventListener('click', async () => {
      const yes = await CTES.confirm({
        title: 'Delete handle',
        message: `Permanently delete '${h.id}' — the register doc and the code directory (packages/${h.id}/) are purged. Run history and audit are kept. This cannot be undone.`,
        confirmText: 'Delete',
      });
      if (!yes) return;
      try {
        await CTES.Store.deleteHandle(h.id);
        CTES.toast(`deleted ${h.id}`);
        await CTES.Store.loadHandles();
        CTES.navigate('handlers');
      } catch (e) { CTES.toast(e.message); }
    });

    document.querySelectorAll('.facet-chip.data-file').forEach(chip => chip.addEventListener('click', async () => {
      const f = chip.dataset.file;
      if (!state.fileCache[f]) {
        try {
          const res = await CTES.Store.handleFile(h.id, f);
          state.fileCache[f] = res.content + (res.truncated ? '\n… truncated' : '');
        } catch (e) { state.fileCache[f] = '— could not read: ' + e.message; }
      }
      document.getElementById('codeView').textContent = state.fileCache[f];
    }));

    document.getElementById('dRunForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('dRunStatus');
      let payload;
      try { payload = JSON.parse(document.getElementById('dPayload').value || '{}'); }
      catch (err) { CTES.toast('payload is not valid JSON: ' + err.message); return; }
      const body = { handle_id: h.id, input: payload };
      const t = document.getElementById('dTimeout').value;
      const b = document.getElementById('dBackend').value;
      if (t) body.timeout_s = parseInt(t, 10);
      if (b) body.backend = b;
      status.textContent = 'dispatching…';
      try {
        const run = await CTES.Store.runHandle(body);
        showOutcome(document.getElementById('dOutcome'), run);
        status.textContent = '';
        state.detailRuns = [run, ...(state.detailRuns || [])].slice(0, 50);
        drawHistory();
      } catch (err) { status.textContent = err.message; CTES.toast(err.message); }
    });

    CTES.Store.handleRuns(h.id).then(runs => { state.detailRuns = runs; drawHistory(); })
      .catch(() => { state.detailRuns = []; drawHistory(); });
  }

  function openEditForm() {
    const h = state.detail;
    const card = document.createElement('div');
    card.className = 'chart-card animate-in';
    card.id = 'editCard';
    card.innerHTML = `
      <div class="chart-head"><div><span class="eyebrow">edit</span><h3>Update '${CTES.esc(h.id)}'</h3></div></div>
      <form id="editForm" class="form-grid-ctes">
        <div class="form-group"><label for="eName">name</label><input id="eName" value="${CTES.esc(h.name || '')}"></div>
        <div class="form-group"><label for="eEntry">entry point</label><input id="eEntry" value="${CTES.esc(h.entry_point)}" required></div>
        <div class="form-group"><label for="eTimeout">timeout · s</label><input id="eTimeout" type="number" min="1" max="600" value="${h.timeout_s || 60}"></div>
        <div class="form-group"><label for="eImage">image · docker</label><input id="eImage" value="${CTES.esc(h.image || '')}" placeholder="backend default"></div>
        <div class="form-group" style="grid-column:1/-1"><label for="eDesc">description</label><input id="eDesc" value="${CTES.esc(h.description || '')}"></div>
        <div class="form-group" style="grid-column:1/-1"><label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400"><input type="checkbox" id="eNetwork" ${h.network ? 'checked' : ''} style="width:auto"> allow network access (overrides container isolation)</label></div>
        <div style="grid-column:1/-1;display:flex;gap:10px">
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
          <button type="button" class="btn btn-secondary btn-sm" id="eCancel">Cancel</button>
        </div>
      </form>`;
    document.querySelector('.content-header').after(card);
    document.getElementById('eCancel').addEventListener('click', () => { card.remove(); state.editing = false; });
    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await CTES.Store.updateHandle(h.id, {
          name: document.getElementById('eName').value,
          entry_point: document.getElementById('eEntry').value,
          timeout_s: parseInt(document.getElementById('eTimeout').value, 10),
          image: document.getElementById('eImage').value || null,
          description: document.getElementById('eDesc').value,
          network: document.getElementById('eNetwork').checked,
        });
        CTES.toast('handle updated');
        await CTES.Store.loadHandles();
        state.editing = false;
        loadDetail(h.id);
      } catch (err) { CTES.toast(err.message); }
    });
  }

  function bindCatalog() {
    document.getElementById('regToggle')?.addEventListener('click', () => {
      const card = document.getElementById('regFormCard');
      card.style.display = card.style.display === 'none' ? '' : 'none';
    });
    document.getElementById('hQ')?.addEventListener('input', (e) => {
      state.q = e.target.value;
      const cards = document.querySelectorAll('.chart-card.animate-in');
      const tableCard = cards[cards.length - 1];
      if (tableCard) {
        tableCard.innerHTML = renderCatalogTable();
        bindTableRows();
      }
    });
    document.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => {
      state.status = b.dataset.status; CTES.navigate('handlers');
    }));
    document.getElementById('scanBtn')?.addEventListener('click', async () => {
      try {
        const r = await CTES.Store.scanPackages();
        CTES.toast(`scanned: ${r.handles.length} handle(s)`);
        await CTES.Store.loadHandles();
        CTES.navigate('handlers');
      } catch (e) { CTES.toast(e.message); }
    });
    bindTableRows();
    document.getElementById('regForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const h = await CTES.Store.registerHandle({
          id: document.getElementById('regId').value.trim(),
          entry_point: document.getElementById('regEntry').value.trim(),
          name: document.getElementById('regName').value.trim() || undefined,
          description: document.getElementById('regDesc').value.trim() || undefined,
          timeout_s: document.getElementById('regTimeout').value || undefined,
        });
        CTES.toast(`registered ${h.id} — add your code to packages/${h.id}/`);
        await CTES.Store.loadHandles();
        CTES.navigate('handlers/' + h.id);
      } catch (err) { CTES.toast(err.message); }
    });
  }

  function renderCatalogTable() {
    const rows = filteredHandles();
    if (!rows.length) return '<div class="empty-state">no handles match</div>';
    return `<table class="src-table"><thead><tr><th>Handle</th><th>Entry point</th><th>Status</th><th>Timeout</th><th>Runs</th></tr></thead><tbody>
      ${rows.map(h => `<tr data-id="${CTES.esc(h.id)}" role="button" tabindex="0" style="cursor:pointer">
        <td><div class="src-src-names"><div class="src-name">${CTES.esc(h.name || h.id)}</div><div class="src-id">${CTES.esc(h.id)}</div></div></td>
        <td class="src-id">${CTES.esc(h.entry_point)}</td>
        <td>${statusPill(h)}</td>
        <td class="src-num">${CTES.Store.fmtDur((h.timeout_s || 60) * 1000)}</td>
        <td class="src-num">${h.stats ? h.stats.total : '—'}</td>
      </tr>`).join('')}</tbody></table>`;
  }
  function bindTableRows() {
    document.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => CTES.navigate('handlers/' + tr.dataset.id)));
  }

  function afterRender(sub) {
    if (sub) {
      bindDetail();
      return;
    }
    bindCatalog();
  }

  return { render, afterRender, showOutcome };
})();
