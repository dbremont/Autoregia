/* ════════════════════════════════════════════════════════════
    GCAL Runner — use: pick a connection, pick an action grouped
    by kind, fill the schema-generated parameter form, run. The
    gateway answers with the result or a 409 reconnect hint; both
    land in the execution log.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Runner = (() => {
  const v = GCAL.view;
  let connId = null, actionId = null, lastResult = null;

  function render() {
    const cs = GCAL.Store.connections().filter(c => c.state === 'connected');
    return `
      ${v.header('Runner')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">Use drives the lifecycle: every run is gated on the connection's state, logged as evidence, and feeds its health. Disconnected or errored connections answer with the reconnect path, not a bare failure.</p>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="form-group"><label for="rnConn">connection</label>
            <select id="rnConn">
              <option value="">— pick a connected app —</option>
              ${cs.map(c => `<option value="${GCAL.esc(c.id)}" ${connId === c.id ? 'selected' : ''}>${GCAL.esc(c.name)} · ${GCAL.esc(c.connector_id)}</option>`).join('')}
            </select>
            <span class="form-hint">${cs.length} connected · ${GCAL.Store.connections().length} total — <a href="#connections">manage</a></span></div>
          <div class="form-group"><label for="rnAction">action</label>
            <select id="rnAction"><option value="">— pick an action —</option></select></div>
          <div id="rnParams"></div>
          <button class="btn btn-primary" id="rnRun" disabled>${GCAL.icon('play', 15)} Run</button>
          <span class="form-hint" id="rnStatus" style="margin-left:8px"></span>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">result</span><h3>Last run</h3></div></div>
          <div id="rnResult"><div class="empty-state">nothing run yet</div></div>
        </div>
      </div>`;
  }

  function actionsOf(conn) {
    const def = GCAL.Store.connectorById(conn.connector_id);
    return (def && def.actions) || [];
  }

  function drawActions() {
    const conn = GCAL.Store.connectionById(connId);
    const host = document.getElementById('rnAction');
    const acts = conn ? actionsOf(conn) : [];
    host.innerHTML = '<option value="">— pick an action —</option>' +
      acts.map(a => `<option value="${GCAL.esc(a.id)}" ${actionId === a.id ? 'selected' : ''}>${GCAL.esc(a.kind)} · ${GCAL.esc(a.id)}</option>`).join('');
    if (actionId && !acts.some(a => a.id === actionId)) actionId = null;
    drawParams();
  }

  function drawParams() {
    const conn = GCAL.Store.connectionById(connId);
    const host = document.getElementById('rnParams');
    const act = conn ? actionsOf(conn).find(a => a.id === actionId) : null;
    document.getElementById('rnRun').disabled = !act;
    if (!act) { host.innerHTML = ''; return; }
    host.innerHTML = (act.params || []).map(f => `
      <div class="form-group"><label for="rn-p-${GCAL.esc(f.name)}">${GCAL.esc(f.name)}${f.required ? ' *' : ''}</label>
        ${paramInput(f)}
        <span class="form-hint">${GCAL.esc(f.description || '')}${f.default != null && f.default !== '' ? ` · default ${GCAL.esc(f.default)}` : ''}</span></div>`).join('');
  }

  function paramInput(f) {
    const id = `rn-p-${f.name}`;
    if (f.type === 'boolean') {
      return `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400">
        <input type="checkbox" id="${id}" data-p="${GCAL.esc(f.name)}" style="width:auto" ${f.default ? 'checked' : ''}> ${GCAL.esc(f.name)}</label>`;
    }
    if (f.type === 'select') {
      return `<select id="${id}" data-p="${GCAL.esc(f.name)}">
        ${(f.options || []).map(o => `<option value="${GCAL.esc(o)}" ${String(f.default) === String(o) ? 'selected' : ''}>${GCAL.esc(o)}</option>`).join('')}</select>`;
    }
    const type = f.type === 'number' ? 'number' : 'text';
    const val = f.default != null ? f.default : '';
    return f.name === 'body' || f.name === 'payload' || f.name === 'doc' || f.name === 'selector'
      ? `<textarea id="${id}" data-p="${GCAL.esc(f.name)}" style="font-family:var(--font-mono);font-size:var(--text-2sm)">${GCAL.esc(val)}</textarea>`
      : `<input id="${id}" data-p="${GCAL.esc(f.name)}" type="${type}" value="${GCAL.esc(val)}">`;
  }

  function drawResult(res) {
    lastResult = res;
    const host = document.getElementById('rnResult');
    if (!res) { host.innerHTML = '<div class="empty-state">nothing run yet</div>'; return; }
    if (res.ok === False || res.error) {
      host.innerHTML = `
        <div class="meta-table">
          <div class="meta-row"><span class="meta-key">status</span><span class="meta-val" style="color:#A33434">error${res.class ? ` · ${GCAL.esc(res.class)}` : ''}</span></div>
          <div class="meta-row"><span class="meta-key">error</span><span class="meta-val">${GCAL.esc(res.error || res.message || '')}</span></div>
          ${res.reconnect ? `<div class="meta-row"><span class="meta-key">reconnect</span><span class="meta-val">${GCAL.esc(res.reconnect.message || JSON.stringify(res.reconnect))}</span></div>` : ''}
          ${res.execution_id ? `<div class="meta-row"><span class="meta-key">logged</span><span class="meta-val"><a href="#executions" class="text-mono text-xs">${GCAL.esc(res.execution_id)}</a></span></div>` : ''}
        </div>`;
      return;
    }
    host.innerHTML = `
      <div class="meta-table">
        <div class="meta-row"><span class="meta-key">status</span><span class="meta-val" style="color:#3F6E50">ok · ${GCAL.Store.fmtDur(res.duration_ms)}</span></div>
        ${res.execution_id ? `<div class="meta-row"><span class="meta-key">logged</span><span class="meta-val"><a href="#executions" class="text-mono text-xs">${GCAL.esc(res.execution_id)}</a></span></div>` : ''}
      </div>
      <div class="eyebrow" style="margin:8px 0 4px">result</div>
      <pre class="code-view">${GCAL.esc(JSON.stringify(res.result ?? res, null, 2))}</pre>`;
  }

  async function run() {
    document.getElementById('rnStatus').textContent = 'running…';
    const params = {};
    document.querySelectorAll('#rnParams [data-p]').forEach(el => {
      params[el.dataset.p] = el.type === 'checkbox' ? el.checked
        : (el.type === 'number' && el.value !== '' ? +el.value : el.value);
    });
    // the gateway's 409/502 bodies carry reconnect hints and execution ids —
    // read the JSON either way so none of it is dropped
    try {
      const r = await fetch('./api/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connId, action: actionId, params }),
      });
      const body = await r.json().catch(() => ({ error: 'HTTP ' + r.status }));
      if (r.ok) {
        drawResult(Object.assign({ ok: true }, body));
        GCAL.toast('run logged');
      } else {
        drawResult(Object.assign({ ok: false }, body));
      }
      document.getElementById('rnStatus').textContent = '';
      GCAL.Store.loadConnections().catch(() => {});
    } catch (e) {
      drawResult({ ok: false, error: e.message });
      document.getElementById('rnStatus').textContent = '';
    }
  }

  function preset(id) {
    connId = id; actionId = null; lastResult = null;
    GCAL.navigate('runner');
  }

  function afterRender() {
    if (!GCAL.Store.connectionById(connId)) { connId = null; actionId = null; }
    const cs = GCAL.Store.connections().filter(c => c.state === 'connected');
    if (!connId && cs.length === 1) connId = cs[0].id;
    drawActions();
    document.getElementById('rnConn')?.addEventListener('change', (e) => {
      connId = e.target.value || null; actionId = null; drawActions();
    });
    document.getElementById('rnAction')?.addEventListener('change', (e) => {
      actionId = e.target.value || null; drawParams();
    });
    document.getElementById('rnRun')?.addEventListener('click', run);
    if (lastResult) drawResult(lastResult);
  }

  return { render, afterRender, preset };
})();
