/* ════════════════════════════════════════════════════════════
    SARL Settings — the persisted, editable defaults of the review
    path, plus the read-only environment panel (engine packs, db,
    input caps). Mutations are audited server-side.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.Settings = (() => {
  const v = SARL.view;
  let data = null;

  function render() {
    return `
      ${v.header('Settings')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">Defaults for the review path — each submission may override language, register, glossaries, and dimensions. Every change is recorded in the audit trail. Environment-derived values are read-only. <strong>The LanguageTool URL wakes the dormant external engine</strong>; leave it empty and the live path stays purely deterministic.</p>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">defaults</span><h3>Review behavior</h3></div></div>
          <form id="setForm">
            <div class="form-row-sarl">
              <div class="form-group"><label for="sLang">default language</label>
                <select id="sLang" data-key="default_language">
                  <option value="es">es — español</option>
                  <option value="en">en — English</option>
                </select></div>
              <div class="form-group"><label for="sReg">default register</label>
                <select id="sReg" data-key="default_register">
                  <option value="">— none —</option>
                  <option value="technical">technical</option>
                  <option value="formal">formal</option>
                  <option value="editorial">editorial</option>
                  <option value="personal">personal</option>
                </select></div>
            </div>
            <div class="form-row-sarl">
              <div class="form-group"><label for="sMax">max findings / review</label>
                <input id="sMax" type="number" min="1" max="1000" data-key="max_findings"></div>
              <div class="form-group"><label for="sExcerpt">evidence excerpt · chars</label>
                <input id="sExcerpt" type="number" min="20" max="500" data-key="evidence_excerpt"></div>
            </div>
            <div class="form-row-sarl">
              <div class="form-group"><label for="sRetention">task retention · docs (0 = unlimited)</label>
                <input id="sRetention" type="number" min="0" max="100000" data-key="task_retention"></div>
              <div class="form-group"><label for="sLT">languagetool_url (empty = dormant)</label>
                <input id="sLT" type="text" data-key="languagetool_url" placeholder="https://languagetool:8010"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">${SARL.icon('check', 13)} Save</button>
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
        el.value = s[k] != null ? s[k] : '';
      });
      const e = res.environment || {};
      const row = (k, val) => `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val"><code class="text-mono text-xs">${SARL.esc(val)}</code></span></div>`;
      document.getElementById('setEnv').innerHTML = [
        row('couchdb', e.couchdb_url || '—'),
        row('database', e.db || '—'),
        row('max input chars', e.max_input_chars != null ? String(e.max_input_chars) : '—'),
        ...((e.packs || []).map(p => row(`pack · ${p.id}`, `${p.status} · ${p.languages.join(' ')}`))),
      ].join('');
    }).catch((e) => {
      document.getElementById('setEnv').innerHTML = `<div class="empty-state">could not load settings — ${SARL.esc(e.message)}</div>`;
    });

    document.getElementById('setForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = {};
      document.querySelectorAll('#setForm [data-key]').forEach(el => {
        const k = el.dataset.key;
        body[k] = el.value;
        if (['max_findings', 'evidence_excerpt', 'task_retention'].includes(k)) {
          body[k] = +el.value;
        }
      });
      try {
        await SARL.Store.saveSettings(body);
        SARL.toast('settings saved — audited');
        document.getElementById('setStatus').textContent = 'saved';
      } catch (e) {
        SARL.toast(e.message);
        document.getElementById('setStatus').textContent = e.message;
      }
    });
  }

  return { render, afterRender };
})();
