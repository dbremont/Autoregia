/* ════════════════════════════════════════════════════════════
    GCAL Connections — the manager: the set of live connections
    with health and usage, the connection detail
    (`#connections/<id>`), and the connect modal whose form is
    generated from the connector's own setup + credential
    schemas — different systems, different forms.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Connections = (() => {
  const v = GCAL.view;
  let detail = null;

  const HEALTH_COLOR = { connected: '#3F6E50', error: '#A33434', disconnected: '#8C877B', awaiting_consent: '#B4742A' };

  function healthPill(c) {
    return `<span class="src-health"><span class="src-dot" style="background:${HEALTH_COLOR[c.state] || '#8C877B'}"></span>${GCAL.esc(c.state)}</span>`;
  }

  function renderList() {
    const cs = GCAL.Store.connections();
    return `
      ${v.header('Connections', `<button class="btn btn-primary btn-sm" id="conNew">${GCAL.icon('plus', 14)} New Connection</button>`)}
      ${!cs.length ? '<div class="empty-state">no connections — connect the first app from the registry</div>' : `
      <div class="conn-grid animate-in">${cs.map(c => `
        <div class="conn-card st-${GCAL.esc(c.state)}" data-id="${GCAL.esc(c.id)}" role="button" tabindex="0">
          <div>${healthPill(c)}</div>
          <h3>${GCAL.esc(c.name)}</h3>
          <div class="conn-sub">${GCAL.esc(c.connector_id)} · ${GCAL.esc(c.id)}</div>
        </div>`).join('')}</div>`}`;
  }

  function renderDetailHost(sub) {
    return `<div id="connDetailRoot" data-conn="${GCAL.esc(sub)}">
      <div class="empty-state">loading the connection…</div></div>`;
  }

  function render(sub) {
    return (sub && sub !== 'new') ? renderDetailHost(sub) : renderList();
  }

  // ── connection detail ──
  function detailHTML(c) {
    const recent = c.recent || [];
    const credRows = Object.entries(c.credentials || {}).map(([k, val]) =>
      `<div class="meta-row"><span class="meta-key">${GCAL.esc(k)}</span><span class="meta-val"><span class="masked">${GCAL.esc(val)}</span></span></div>`).join('');
    const actions = [];
    if (c.state === 'disconnected') {
      actions.push(`<button class="btn btn-primary btn-sm" id="cdTest" disabled title="reconnect first">Test</button>`);
      if ((GCAL.Store.connectorById(c.connector_id) || {}).auth_scheme === 'oauth2') {
        actions.push(`<button class="btn btn-primary btn-sm" id="cdConsent">${GCAL.icon('lock', 14)} Connect (consent)</button>`);
      } else {
        actions.push(`<span class="form-hint">reconnect by editing credentials — delete and re-create for now</span>`);
      }
    } else {
      actions.push(`<button class="btn btn-primary btn-sm" id="cdTest">${GCAL.icon('activity', 14)} Test</button>`);
      actions.push(`<button class="btn btn-secondary btn-sm" id="cdRun">Run an action →</button>`);
      actions.push(`<button class="btn btn-ghost btn-sm" id="cdDisconnect">${GCAL.icon('x', 14)} Disconnect</button>`);
    }
    actions.push(`<button class="btn btn-ghost btn-sm" id="cdDelete">${GCAL.icon('trash-2', 13)} delete</button>`);
    return `
      <div class="chart-card animate-in" id="connDetail">
        <div class="chart-head">
          <div><span class="eyebrow">connection</span>
            <h3><a href="#connections" class="back-link">${GCAL.icon('chevron-left', 16)}</a>
              ${GCAL.esc(c.name)} ${healthPill(c)}</h3></div>
          <div class="actions">${actions.join('')}</div>
        </div>
        <div class="duo-grid">
          <div class="meta-table">
            ${mrow('connector', `<span class="term-chip">${GCAL.esc(c.connector_id)}</span>`)}
            ${mrow('settings', `<pre class="code-view" style="max-height:160px">${GCAL.esc(JSON.stringify(c.settings || {}, null, 2))}</pre>`)}
            ${mrow('credentials', credRows || '<span class="empty-inline">none stored</span>')}
          </div>
          <div class="meta-table">
            ${mrow('health', `${c.consecutive_failures || 0} consecutive failure(s)`)}
            ${mrow('used', c.last_used_at ? GCAL.Store.fmtTime(c.last_used_at) : 'never')}
            ${mrow('tested', c.last_tested_at ? `${GCAL.Store.fmtTime(c.last_tested_at)} — ${GCAL.esc((c.last_test || {}).result || '?')}` : 'never')}
            ${mrow('last connected', c.last_connected_at ? GCAL.Store.fmtTime(c.last_connected_at) : '—')}
            ${mrow('defined', GCAL.Store.fmtTime(c.created_at))}
          </div>
        </div>
      </div>
      <div class="chart-card animate-in" style="margin-top:var(--space-4)">
        <div class="chart-head"><div><span class="eyebrow">use</span><h3>Recent executions · ${c.executions_total ?? recent.length}</h3></div>
          <a href="#executions" class="text-mono text-xs">full log →</a></div>
        ${recent.length ? recent.map(r => `
          <div class="ov-feed-item" data-exec="${GCAL.esc(r.id)}" style="cursor:pointer">
            <span class="src-dot" style="background:${r.status === 'ok' ? '#3F6E50' : '#A33434'}"></span>
            <span class="src-feed-t">${GCAL.esc(GCAL.Store.fmtTime(r.created_at).slice(11))}</span>
            <span class="ov-feed-x"><b>${GCAL.esc(r.action)}</b> — ${GCAL.esc(r.status)}${r.error ? ` · ${GCAL.esc(r.error.slice(0, 80))}` : ''}</span>
          </div>`).join('') : '<div class="empty-state">never used — run its first action from the runner</div>'}
      </div>`;
  }
  function mrow(k, val) { return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`; }

  async function drawDetail(sub) {
    const root = document.getElementById('connDetailRoot');
    if (!root) return;
    try {
      detail = await GCAL.Store.connection_(sub);
    } catch (e) {
      root.innerHTML = `<div class="empty-state"><h3>connection not found</h3>
        <p><a class="back-link" href="#connections">← all connections</a></p></div>`;
      return;
    }
    root.innerHTML = detailHTML(detail);
    bindDetail();
  }

  async function refreshDetail() {
    if (!detail) { GCAL.navigate('connections'); return; }
    const y = window.scrollY;
    try {
      detail = await GCAL.Store.connection_(detail.id);
      await GCAL.Store.loadConnections();
    } catch (e) { GCAL.toast(e.message); }
    const root = document.getElementById('connDetailRoot');
    if (!root) { GCAL.navigate('connections'); return; }
    root.innerHTML = detailHTML(detail);
    bindDetail();
    window.scrollTo(0, y);
  }

  function bindDetail() {
    document.querySelectorAll('#connDetailRoot [data-exec]').forEach(el =>
      el.addEventListener('click', () => {
        GCAL.navigate('executions'); setTimeout(() => GCAL.Executions.showExecution(el.dataset.exec), 80);
      }));
    document.getElementById('cdTest')?.addEventListener('click', async () => {
      try {
        await GCAL.Store.testConnection(detail.id);
        GCAL.toast('test recorded');
        refreshDetail();
      } catch (e) { GCAL.toast(e.message); }
    });
    document.getElementById('cdRun')?.addEventListener('click', () => {
      GCAL.navigate('runner'); setTimeout(() => GCAL.Runner.preset(detail.id), 80);
    });
    document.getElementById('cdDisconnect')?.addEventListener('click', async () => {
      const ok = await GCAL.confirm({
        title: 'Disconnect this connection?',
        message: 'Access is revoked and stored credentials are voided. Settings and execution history stay.',
        confirmText: 'Disconnect',
      });
      if (!ok) return;
      try {
        await GCAL.Store.disconnectConnection(detail.id);
        GCAL.toast('disconnected');
        refreshDetail();
      } catch (e) { GCAL.toast(e.message); }
    });
    document.getElementById('cdDelete')?.addEventListener('click', async () => {
      const ok = await GCAL.confirm({
        title: 'Delete this connection?',
        message: 'The connection and its credentials are purged. Past executions stay in the log.',
        confirmText: 'Delete',
      });
      if (!ok) return;
      try {
        await GCAL.Store.deleteConnection(detail.id);
        GCAL.toast('connection deleted');
        detail = null;
        GCAL.navigate('connections');
      } catch (e) { GCAL.toast(e.message); }
    });
  }

  // ── connect: the schema-generated form ──
  function fieldInput(prefix, f, val) {
    const id = `${prefix}-${f.name}`;
    const v = val != null ? val : (f.default != null ? f.default : '');
    if (f.type === 'boolean') {
      return `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400">
        <input type="checkbox" id="${id}" data-f="${GCAL.esc(f.name)}" style="width:auto" ${v ? 'checked' : ''}> ${GCAL.esc(f.name)}</label>`;
    }
    if (f.type === 'select') {
      return `<select id="${id}" data-f="${GCAL.esc(f.name)}">
        ${(f.options || []).map(o => `<option value="${GCAL.esc(o)}" ${String(v) === String(o) ? 'selected' : ''}>${GCAL.esc(o)}</option>`).join('')}</select>`;
    }
    const type = f.type === 'number' ? 'number' : (f.type === 'password' ? 'password' : 'text');
    return `<input id="${id}" data-f="${GCAL.esc(f.name)}" type="${type}" value="${GCAL.esc(v)}" placeholder="${GCAL.esc(f.description || f.name)}">`;
  }

  function openCreate(preselect) {
    const reg = GCAL.Store.registry();
    document.getElementById('modalTitle').textContent = 'Connect an app';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-group"><label for="ccConnector">connector</label>
        <select id="ccConnector">
          ${reg.map(c => `<option value="${GCAL.esc(c.id)}" ${preselect === c.id ? 'selected' : ''}>${GCAL.esc(c.name)} — ${GCAL.esc(c.auth_scheme)}</option>`).join('')}
        </select></div>
      <div class="form-group"><label for="ccName">connection name</label>
        <input id="ccName" type="text" placeholder="e.g. work github"></div>
      <div class="form-group"><label>settings — this connector's connection model</label>
        <div id="ccSetup"></div></div>
      <div class="form-group"><label>credentials — vaulted, masked everywhere</label>
        <div id="ccCreds"></div></div>`;
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn btn-secondary btn-sm" id="ccCancel">Cancel</button>
      <button class="btn btn-primary btn-sm" id="ccSave">${GCAL.icon('check', 13)} Connect</button>`;
    const drawSchemas = () => {
      const c = GCAL.Store.connectorById(document.getElementById('ccConnector').value);
      document.getElementById('ccSetup').innerHTML = (c.setup_schema || []).map(f => `
        <div class="form-group"><label for="cc-s-${GCAL.esc(f.name)}">${GCAL.esc(f.name)}${f.required ? ' *' : ''}</label>
          ${fieldInput('cc-s', f)}<span class="form-hint">${GCAL.esc(f.description || '')}</span></div>`).join('')
        || '<div class="empty-inline">no settings</div>';
      document.getElementById('ccCreds').innerHTML = (c.credentials_schema || []).map(f => `
        <div class="form-group"><label for="cc-c-${GCAL.esc(f.name)}">${GCAL.esc(f.name)}${f.required ? ' *' : ''}</label>
          ${fieldInput('cc-c', f)}<span class="form-hint">${GCAL.esc(f.description || '')}</span></div>`).join('')
        || '<div class="empty-inline">no credentials — connects immediately</div>';
    };
    drawSchemas();
    document.getElementById('ccConnector').addEventListener('change', drawSchemas);
    document.getElementById('ccCancel').addEventListener('click', closeModal);
    document.getElementById('ccSave').addEventListener('click', async () => {
      const read = (sel) => {
        const out = {};
        document.querySelectorAll(sel).forEach(el => {
          out[el.dataset.f] = el.type === 'checkbox' ? el.checked
            : (el.type === 'number' && el.value !== '' ? +el.value : el.value);
        });
        return out;
      };
      try {
        const doc = await GCAL.Store.createConnection({
          connector_id: document.getElementById('ccConnector').value,
          name: document.getElementById('ccName').value.trim(),
          settings: read('#ccSetup [data-f]'),
          credentials: read('#ccCreds [data-f]'),
        });
        GCAL.toast(`connected — ${doc.id}`);
        closeModal();
        await GCAL.Store.loadConnections();
        showConnection(doc.id);
      } catch (e) { GCAL.toast(e.message); }
    });
    document.getElementById('modal').classList.remove('hidden');
    AUTOREGIA.dialog(document.getElementById('modal'), {
      label: 'Connect an app',
      onClose: () => document.getElementById('modal').classList.add('hidden'),
    });
  }

  function closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  function showConnection(id) { GCAL.navigate('connections/' + id); }

  function afterRender(sub) {
    // bind the journal chrome in both faces (the #connections/new face
    // renders the list, then opens the connect modal over it)
    document.getElementById('conNew')?.addEventListener('click', () => openCreate(null));
    document.querySelectorAll('.conn-card[data-id]').forEach(el =>
      el.addEventListener('click', () => { location.hash = '#connections/' + el.dataset.id; }));
    if (sub === 'new') openCreate(null);
    else if (sub) drawDetail(sub);
  }

  return { render, afterRender, showConnection, openCreate };
})();
