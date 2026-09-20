/* ════════════════════════════════════════════════════════════
    GCAL Settings — the persisted, editable defaults of the
    gateway and health engine, plus the read-only environment
    panel (connectors, db). Mutations are audited server-side.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Settings = (() => {
  const v = GCAL.view;

  function render() {
    return `
      ${v.header('Settings')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">Defaults for the execution gateway and the health engine. Every change is recorded in the audit trail. Environment-derived values are read-only.</p>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">defaults</span><h3>Gateway & health</h3></div></div>
          <form id="setForm">
            <div class="form-row-gcal">
              <div class="form-group"><label for="sTimeout">default timeout · s</label>
                <input id="sTimeout" type="number" min="1" max="300" data-key="default_timeout_s"></div>
              <div class="form-group"><label for="sFailures">max consecutive failures</label>
                <input id="sFailures" type="number" min="1" max="20" data-key="max_consecutive_failures"></div>
            </div>
            <div class="form-row-gcal">
              <div class="form-group"><label for="sRetention">execution retention · docs (0 = unlimited)</label>
                <input id="sRetention" type="number" min="0" max="100000" data-key="execution_retention"></div>
              <div class="form-group"><label for="sLimit">response limit · chars</label>
                <input id="sLimit" type="number" min="512" max="100000" step="512" data-key="response_limit"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">${GCAL.icon('check', 13)} Save</button>
            <span class="form-hint" id="setStatus" style="margin-left:10px"></span>
          </form>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">environment</span><h3>Read-only</h3></div></div>
          <div id="setEnv" class="meta-table"><div class="empty-state">loading…</div></div>
        </div>
      </div>`;
  }

  function afterRender() {
    fetch('api/settings').then(r => r.json()).then((res) => {
      const s = res.settings || {};
      document.querySelectorAll('#setForm [data-key]').forEach(el => {
        el.value = s[el.dataset.key] != null ? s[el.dataset.key] : '';
      });
      const e = res.environment || {};
      const row = (k, val) => `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val"><code class="text-mono text-xs">${GCAL.esc(val)}</code></span></div>`;
      document.getElementById('setEnv').innerHTML = [
        row('couchdb', e.couchdb_url || '—'),
        row('database', e.db || '—'),
        ...((e.connectors || []).map(c => row(`connector · ${c.id}`, `${c.status} · ${c.auth_scheme}`))),
      ].join('');
    }).catch((e) => {
      document.getElementById('setEnv').innerHTML = `<div class="empty-state">could not load settings — ${GCAL.esc(e.message)}</div>`;
    });

    document.getElementById('setForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = {};
      document.querySelectorAll('#setForm [data-key]').forEach(el => {
        if (el.value !== '') body[el.dataset.key] = +el.value;
      });
      try {
        await GCAL.Store.saveSettings(body);
        GCAL.toast('settings saved — audited');
        document.getElementById('setStatus').textContent = 'saved';
      } catch (e) {
        GCAL.toast(e.message);
        document.getElementById('setStatus').textContent = e.message;
      }
    });
  }

  return { render, afterRender };
})();
