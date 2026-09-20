/* ════════════════════════════════════════════════════════════
    GCAL Executions — the evidence log: every run gated, logged,
    and health-tracked. Control strip (free text + connection +
    status), filter chips, paged list, and a full detail panel.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Executions = (() => {
  const v = GCAL.view;
  let selectedId = null, selected = null, loading = false;

  function chipBar() {
    const st = GCAL.Store.getState();
    const chips = [];
    if (st.connection) chips.push(`<span class="filter-chip" data-clear="connection">${GCAL.esc(st.connection)} ${GCAL.icon('x', 11)}</span>`);
    if (st.status) chips.push(`<span class="filter-chip" data-clear="status">${GCAL.esc(st.status)} ${GCAL.icon('x', 11)}</span>`);
    if (st.q) chips.push(`<span class="filter-chip" data-clear="q">“${GCAL.esc(st.q)}” ${GCAL.icon('x', 11)}</span>`);
    if (!chips.length) return '';
    return `<div class="filter-chips">${chips.join('')}
      <button class="btn btn-secondary btn-sm" id="clearAll">${GCAL.icon('refresh', 13)} clear all</button>
    </div>`;
  }

  function execRow(r) {
    return `<tr data-id="${GCAL.esc(r.id)}" role="button" tabindex="0" style="cursor:pointer${r.id === selectedId ? ';background:rgba(122,26,42,.05)' : ''}">
      <td><div class="src-name">${GCAL.esc(r.connector_id)} · ${GCAL.esc(r.action)}</div>
        <div class="src-id">${GCAL.esc(r.id)}${r.error ? ` · ${GCAL.esc(r.error.slice(0, 60))}` : ''}</div></td>
      <td><span class="src-health"><span class="src-dot" style="background:${r.status === 'ok' ? '#3F6E50' : '#A33434'}"></span>${GCAL.esc(r.status)}${r.class && r.class !== 'ok' ? ` · ${GCAL.esc(r.class)}` : ''}</span></td>
      <td class="src-num">${GCAL.Store.fmtDur(r.duration_ms)}</td>
      <td class="src-ago">${GCAL.Store.fmtTime(r.created_at)}</td>
    </tr>`;
  }

  function render() {
    const st = GCAL.Store.getState();
    const pg = GCAL.Store.getPaging();
    const conns = GCAL.Store.connections();
    const rows = GCAL.Store.execPage();
    const summary = GCAL.Store.filterSummary();
    const pager = `<div class="pager animate-in">
        <button class="btn btn-secondary btn-sm" id="pagePrev" ${pg.page > 1 ? '' : 'disabled'}>${GCAL.icon('chevron-left', 14)} prev</button>
        <span class="results-meta">page ${pg.page}</span>
        <button class="btn btn-secondary btn-sm" id="pageNext" ${pg.has_more ? '' : 'disabled'}>next ${GCAL.icon('chevron-right', 14)}</button>
      </div>`;
    const list = !rows.length
      ? '<div class="empty-state">no executions in this slice of the log</div>'
      : `<table class="src-table"><thead><tr><th>Run</th><th>Status</th><th>Duration</th><th>Ran</th></tr></thead><tbody>${rows.map(execRow).join('')}</tbody></table>${pager}`;
    return `
      ${v.header('Executions')}
      ${selected ? renderDetail(selected) : ''}
      <form class="search-bar animate-in" id="execForm">
        <div class="search-input-wrap">
          <span class="search-icon">${GCAL.icon('search', 15)}</span>
          <input type="search" id="execQ" placeholder="Search action, error, id…" value="${GCAL.esc(st.q || '')}" aria-label="Search executions">
        </div>
        <select id="execConn" class="src-select" style="max-width:200px" aria-label="Filter by connection">
          <option value="">all connections</option>
          ${conns.map(c => `<option value="${GCAL.esc(c.id)}" ${st.connection === c.id ? 'selected' : ''}>${GCAL.esc(c.name)}</option>`).join('')}
        </select>
        <div class="seg" role="group" aria-label="status filter">
          ${['', 'ok', 'error'].map(s => `<button type="button" class="seg-btn ${st.status === s || (!st.status && !s) ? 'active' : ''}" data-execstatus="${s}">${s || 'all'}</button>`).join('')}
        </div>
        <button type="submit" class="btn btn-primary">${GCAL.icon('search', 15)} Search</button>
      </form>
      <div class="search-controls animate-in">
        <span class="results-meta">${loading ? 'searching…' : `${rows.length} in view${summary ? ` · filter: ${summary}` : ''}`}</span>
        <button class="btn btn-ghost btn-sm" id="execClear" title="Clear the whole log">${GCAL.icon('trash-2', 13)} clear log</button>
      </div>
      ${chipBar()}
      <div class="chart-card animate-in">${list}</div>`;
  }

  function renderDetail(r) {
    return `<div class="chart-card animate-in" id="execDetail">
      <div class="chart-head">
        <div><span class="eyebrow">execution detail</span><h3>${GCAL.esc(r.id)}</h3></div>
        <button class="btn-icon" id="execDetailClose" aria-label="Close detail">${GCAL.icon('x', 16)}</button>
      </div>
      <div class="duo-grid">
        <div>
          <div class="meta-table">
            ${mrow('status', r.status + (r.class && r.class !== 'ok' ? ` · <span class="dim-tag">${GCAL.esc(r.class)}</span>` : ''))}
            ${mrow('connection', `<a href="#connections/${GCAL.esc(r.connection_id)}" class="text-mono text-xs">${GCAL.esc(r.connection_id)}</a>`)}
            ${mrow('connector · action', `${GCAL.esc(r.connector_id)} · <code class="text-mono text-xs">${GCAL.esc(r.action)}</code>`)}
            ${mrow('http', r.http_status != null ? r.http_status : '—')}
            ${mrow('duration', GCAL.Store.fmtDur(r.duration_ms))}
            ${mrow('ran', GCAL.Store.fmtTime(r.created_at))}
            ${r.error ? mrow('error', `<span style="color:#A33434">${GCAL.esc(r.error)}</span>`) : ''}
          </div>
        </div>
        <div>
          <div class="eyebrow" style="margin-bottom:4px">params</div>
          <pre class="code-view">${GCAL.esc(JSON.stringify(r.params ?? {}, null, 2))}</pre>
          <div class="eyebrow" style="margin:8px 0 4px">result</div>
          <pre class="code-view">${r.result != null ? GCAL.esc(JSON.stringify(r.result, null, 2)) : '<span class="text-faint">null</span>'}</pre>
        </div>
      </div>
      <div class="eyebrow" style="margin:8px 0 4px">response (truncated)</div>
      <pre class="code-view">${GCAL.esc(r.response || '') || '<span class="text-faint">—</span>'}</pre>
    </div>`;
  }
  function mrow(k, val) { return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`; }

  async function showExecution(id) {
    try {
      selected = await GCAL.Store.execution_(id);
      selectedId = id;
      GCAL.navigate('executions');
    } catch (e) { GCAL.toast(e.message); }
  }

  async function run(patch) {
    loading = true;
    selected = null; selectedId = null;
    await GCAL.Store.applyFilter(patch);
    loading = false;
    GCAL.navigate('executions');
  }

  function afterRender() {
    document.getElementById('execForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      run({
        q: document.getElementById('execQ').value.trim() || null,
        connection: document.getElementById('execConn').value || null,
      });
    });
    document.querySelectorAll('[data-execstatus]').forEach(b => b.addEventListener('click', () => {
      run({ status: b.dataset.execstatus || null });
    }));
    document.querySelectorAll('[data-clear]').forEach(c => c.addEventListener('click', () => run({ [c.dataset.clear]: null })));
    document.getElementById('clearAll')?.addEventListener('click', () => { GCAL.Store.resetFilter(); run({}); });
    document.getElementById('pagePrev')?.addEventListener('click', () => GCAL.Store.prevPage().then(() => GCAL.navigate('executions')));
    document.getElementById('pageNext')?.addEventListener('click', () => GCAL.Store.nextPage().then(() => GCAL.navigate('executions')));
    document.getElementById('execClear')?.addEventListener('click', async () => {
      const ok = await GCAL.confirm({
        title: 'Clear the execution log?',
        message: 'Every logged run is deleted. Connections, settings, and the audit trail stay.',
        confirmText: 'Clear',
      });
      if (!ok) return;
      try {
        await GCAL.Store.clearExecutions();
        GCAL.toast('log cleared');
        selected = null; selectedId = null;
        await GCAL.Store.loadExecutions();
        GCAL.navigate('executions');
      } catch (e) { GCAL.toast(e.message); }
    });
    document.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => showExecution(tr.dataset.id)));
    document.getElementById('execDetailClose')?.addEventListener('click', () => { selected = null; selectedId = null; GCAL.navigate('executions'); });
  }

  return { render, afterRender, showExecution };
})();
