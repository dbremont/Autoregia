/* ════════════════════════════════════════════════════════════
   CTES Runs — the execution journal: the ground-truth stream.
   Control strip (free text + handle + status + window), filter
   chips, paged run list, and a full detail panel. Every other
   view feeds into this one via the click→filter bus.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Runs = (() => {
  const v = CTES.view;
  const STATUS_COLOR = { completed: '#3F6092', failed: '#A33434', timed_out: '#B4742A' };
  let selectedId = null, selected = null, loading = false;

  function statusPill(s) {
    const c = STATUS_COLOR[s] || '#8C877B';
    return `<span class="src-health"><span class="src-dot" style="background:${c}"></span>${CTES.esc(s)}</span>`;
  }

  function chipBar() {
    const st = CTES.Store.getState();
    const chips = [];
    if (st.handle) chips.push(`<span class="filter-chip" data-clear="handle">${CTES.esc(st.handle)} ${CTES.icon('x', 11)}</span>`);
    if (st.status) chips.push(`<span class="filter-chip" data-clear="status">${CTES.esc(st.status)} ${CTES.icon('x', 11)}</span>`);
    if (st.q) chips.push(`<span class="filter-chip" data-clear="q">“${CTES.esc(st.q)}” ${CTES.icon('x', 11)}</span>`);
    if (!chips.length) return '';
    return `<div class="filter-chips">${chips.join('')}
      <button class="btn btn-secondary btn-sm" id="clearAll">${CTES.icon('refresh', 13)} clear all</button>
    </div>`;
  }

  function runRow(r) {
    return `<tr data-id="${CTES.esc(r.id)}" role="button" tabindex="0" style="cursor:pointer${r.id === selectedId ? ';background:rgba(122,26,42,.05)' : ''}">
      <td><div class="src-src-names"><div class="src-name">${CTES.esc(r.handle_id)}${r.task_spec_id ? ` <span class="src-id">· spec ${CTES.esc(r.task_spec_id)}</span>` : ''}</div>
        <div class="src-id">${CTES.esc(r.id)} · ${CTES.esc(r.backend)} · sha ${CTES.esc((r.code_sha256 || '').slice(0, 8))}</div></div></td>
      <td>${statusPill(r.status)}</td>
      <td class="src-num">${CTES.Store.fmtDur(r.duration_ms)}</td>
      <td class="src-ago">${CTES.Store.fmtTime(r.ended_at || r.started_at)}</td>
    </tr>`;
  }

  function render() {
    const st = CTES.Store.getState();
    const pg = CTES.Store.getPaging();
    const handles = CTES.Store.handles();
    const rows = CTES.Store.runsPage();
    const summary = CTES.Store.filterSummary();
    const pager = `<div class="pager animate-in">
        <button class="btn btn-secondary btn-sm" id="pagePrev" ${pg.page > 1 ? '' : 'disabled'}>${CTES.icon('chevron-left', 14)} prev</button>
        <span class="results-meta">page ${pg.page}</span>
        <button class="btn btn-secondary btn-sm" id="pageNext" ${pg.has_more ? '' : 'disabled'}>next ${CTES.icon('chevron-right', 14)}</button>
      </div>`;
    const list = !rows.length
      ? '<div class="empty-state">no runs in this slice of the journal</div>'
      : `<table class="src-table"><thead><tr><th>Run</th><th>Status</th><th>Duration</th><th>Ended</th></tr></thead><tbody>${rows.map(runRow).join('')}</tbody></table>${pager}`;
    return `
      ${v.header('Runs')}
      ${selected ? renderDetail(selected) : ''}
      <form class="search-bar animate-in" id="runsForm">
        <div class="search-input-wrap">
          <span class="search-icon">${CTES.icon('search', 15)}</span>
          <input type="search" id="runsQ" placeholder="Search input, result, error, spec…" value="${CTES.esc(st.q || '')}" aria-label="Search runs">
        </div>
        <select id="runsHandle" class="src-select" style="max-width:180px" aria-label="Filter by handle">
          <option value="">all handles</option>
          ${handles.map(h => `<option value="${CTES.esc(h.id)}" ${st.handle === h.id ? 'selected' : ''}>${CTES.esc(h.id)}</option>`).join('')}
        </select>
        <div class="seg" role="group" aria-label="status filter">
          ${['', 'completed', 'failed', 'timed_out'].map(s => `<button type="button" class="seg-btn ${st.status === s || (!st.status && !s) ? 'active' : ''}" data-runstatus="${s}">${s || 'all'}</button>`).join('')}
        </div>
        <button type="submit" class="btn btn-primary">${CTES.icon('search', 15)} Search</button>
      </form>
      <div class="search-controls animate-in">
        ${CTES.view.windowSeg()}
        <span class="results-meta">${loading ? 'searching…' : `${rows.length} in view${summary ? ` · filter: ${summary}` : ''}`}</span>
      </div>
      ${chipBar()}
      <div class="chart-card animate-in">${list}</div>`;
  }

  function renderDetail(r) {
    return `<div class="chart-card animate-in" id="runDetail">
      <div class="chart-head">
        <div><span class="eyebrow">run detail</span><h3>${CTES.esc(r.id)}</h3></div>
        <button class="btn-icon" id="runDetailClose" aria-label="Close detail">${CTES.icon('x', 16)}</button>
      </div>
      <div class="duo-grid">
        <div>
          <div class="meta-table">
            ${mrow('handle', `<a href="#handlers/${CTES.esc(r.handle_id)}" class="text-mono text-xs">${CTES.esc(r.handle_id)}</a>`)}
            ${mrow('status', statusPill(r.status))}
            ${mrow('backend', CTES.esc(r.backend) + (r.image ? ` · <code class="text-mono text-xs">${CTES.esc(r.image)}</code>` : ''))}
            ${mrow('entry point', `<code class="text-mono text-xs">${CTES.esc(r.entry_point || '—')}</code>`)}
            ${mrow('code sha256', `<code class="text-mono text-xs">${CTES.esc(r.code_sha256 || '—')}</code> (${r.code_files || '?'} files)`)}
            ${mrow('task spec', r.task_spec_id ? `<a href="#tasks" class="text-mono text-xs">${CTES.esc(r.task_spec_id)}</a>${r.spec && r.spec.objective ? ` — ${CTES.esc(r.spec.objective)}` : ''}` : '—')}
            ${mrow('started / ended', `${CTES.Store.fmtTime(r.started_at)} → ${CTES.Store.fmtTime(r.ended_at)}`)}
            ${mrow('duration / timeout', `${CTES.Store.fmtDur(r.duration_ms)} / ${CTES.Store.fmtDur((r.timeout_s || 0) * 1000)}`)}
            ${mrow('exit code', r.exit_code != null ? r.exit_code : '—')}
            ${r.error ? mrow('error', `<span style="color:#A33434">${CTES.esc(r.error)}</span>`) : ''}
          </div>
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom:4px">input</div>
          <pre class="code-view">${CTES.esc(JSON.stringify(r.input ?? {}, null, 2))}</pre>
          <div class="eyebrow" style="margin:8px 0 4px">result</div>
          <pre class="code-view">${r.result != null ? CTES.esc(JSON.stringify(r.result, null, 2)) : '<span class="text-faint">null</span>'}</pre>
        </div>
      </div>
      <div class="eyebrow" style="margin:8px 0 4px">log · stdout + stderr</div>
      <pre class="code-view">${CTES.esc((r.stdout || '') + (r.stderr || '')) || '<span class="text-faint">—</span>'}</pre>
    </div>`;
  }
  function mrow(k, val) { return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`; }

  async function showRun(id) {
    try {
      selected = await CTES.Store.run_(id);
      selectedId = id;
      CTES.navigate('runs');
    } catch (e) { CTES.toast(e.message); }
  }

  function render2() { return render(); }

  function afterRender() {
    document.getElementById('runsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      run({
        q: document.getElementById('runsQ').value.trim() || null,
        handle: document.getElementById('runsHandle').value || null,
      });
    });
    document.querySelectorAll('[data-runstatus]').forEach(b => b.addEventListener('click', () => {
      run({ status: b.dataset.runstatus || null });
    }));
    document.querySelectorAll('[data-clear]').forEach(c => c.addEventListener('click', () => run({ [c.dataset.clear]: null })));
    document.getElementById('clearAll')?.addEventListener('click', () => { CTES.Store.resetFilter(); run({}); });
    document.getElementById('pagePrev')?.addEventListener('click', () => CTES.Store.prevPage().then(() => CTES.navigate('runs')));
    document.getElementById('pageNext')?.addEventListener('click', () => CTES.Store.nextPage().then(() => CTES.navigate('runs')));
    document.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => showRun(tr.dataset.id)));
    document.getElementById('runDetailClose')?.addEventListener('click', () => { selected = null; selectedId = null; CTES.navigate('runs'); });
    document.getElementById('lastRunLink')?.addEventListener('click', (e) => {
      e.preventDefault(); showRun(e.currentTarget.dataset.run);
    });
  }

  async function run(patch) {
    loading = true;
    selected = null; selectedId = null;
    await CTES.Store.applyFilter(patch);
    loading = false;
    CTES.navigate('runs');
  }

  return { render, afterRender, showRun };
})();
