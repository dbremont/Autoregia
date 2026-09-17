/* ════════════════════════════════════════════════════════════
   CTES Settings — the persisted, editable defaults (run path
   behavior) plus the read-only environment panel (CTES_* env
   vars, CouchDB location). Mutations are audited server-side.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Settings = (() => {
  const v = CTES.view;
  let data = null;

  function render() {
    return `
      ${v.header('Settings')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">Defaults for the run path — each run, handle, or spec may override them. Every change is recorded in the audit trail. Environment-derived values are read-only.</p>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">defaults</span><h3>Run behavior</h3></div></div>
          <form id="setForm">
            <div class="form-row-ctes">
              <div class="form-group"><label for="sTimeout">default timeout · s</label><input id="sTimeout" type="number" min="1" max="600" data-key="default_timeout_s"></div>
              <div class="form-group"><label for="sBackend">default backend</label>
                <select id="sBackend" data-key="default_backend">
                  <option value="auto">auto (docker when available)</option>
                  <option value="docker">docker</option>
                  <option value="subprocess">subprocess</option>
                </select></div>
            </div>
            <div class="form-row-ctes">
              <div class="form-group"><label for="sLogLimit">run log limit · chars</label><input id="sLogLimit" type="number" min="1000" max="200000" step="1000" data-key="log_limit"></div>
              <div class="form-group"><label for="sRetention">run retention · docs (0 = unlimited)</label><input id="sRetention" type="number" min="0" max="100000" data-key="run_retention"></div>
            </div>
            <div class="form-group">
              <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:var(--text-sm);font-weight:400">
                <input type="checkbox" id="sNetwork" data-key="allow_network" style="width:auto">
                allow network by default for newly registered handles
              </label>
              <span class="form-hint">the container backend still isolates each run unless the handle opts in</span>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">${CTES.icon('check', 13)} Save</button>
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
      data = res;
      const s = res.settings || {};
      document.querySelectorAll('#setForm [data-key]').forEach(el => {
        const k = el.dataset.key;
        if (el.type === 'checkbox') el.checked = !!s[k];
        else el.value = s[k] != null ? s[k] : '';
      });
      const e = res.environment || {};
      const row = (k, val) => `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val"><code class="text-mono text-xs">${CTES.esc(val)}</code></span></div>`;
      document.getElementById('setEnv').innerHTML = [
        row('docker image', e.docker_image || '—'),
        row('image local', e.docker_image_ready ? 'ready' : 'pulled on first use'),
        row('docker mem / cpus', `${e.docker_mem || '—'} / ${e.docker_cpus || '—'}`),
        row('couchdb', e.couchdb_url || '—'),
        row('database', e.db || '—'),
        row('packages dir', e.packages_dir || 'packages/'),
      ].join('');
    }).catch((e) => {
      document.getElementById('setEnv').innerHTML = `<div class="empty-state">could not load settings — ${CTES.esc(e.message)}</div>`;
    });

    document.getElementById('setForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = {};
      document.querySelectorAll('#setForm [data-key]').forEach(el => {
        const k = el.dataset.key;
        if (el.type === 'checkbox') body[k] = el.checked;
        else if (el.value !== '') body[k] = isNaN(+el.value) ? el.value : +el.value;
      });
      try {
        await CTES.Store.saveSettings(body);
        CTES.toast('settings saved — audited');
        document.getElementById('setStatus').textContent = 'saved';
      } catch (e) {
        CTES.toast(e.message);
        document.getElementById('setStatus').textContent = e.message;
      }
    });
  }

  return { render, afterRender };
})();
