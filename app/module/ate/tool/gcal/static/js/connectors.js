/* ════════════════════════════════════════════════════════════
    GCAL Connectors — the registry: every connector, its type
    and auth scheme, its actions and their schemas, and the
    Connect button that opens the manager with this connector.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Connectors = (() => {
  const v = GCAL.view;

  function render() {
    const reg = GCAL.Store.registry();
    return `
      ${v.header('Connectors')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)">The catalog of doors: each connector declares its connection model — settings and credential shapes, action schemas, health contract. Adding a connector is adding one module; the manager dispatches into it.</p>
      ${!reg.length ? '<div class="empty-state">no connectors registered</div>' : reg.map(c => `
        <div class="chart-card animate-in" style="margin-bottom:var(--space-4)">
          <div class="chart-head">
            <div><span class="eyebrow">${GCAL.esc(c.type)} · ${GCAL.esc(c.auth_scheme)}</span>
              <h3>${GCAL.esc(c.name)} ${v.pill(c.status)}</h3></div>
            <div class="actions">
              <button class="btn btn-primary btn-sm" data-connect="${GCAL.esc(c.id)}">${GCAL.icon('plug', 14)} Connect</button>
            </div>
          </div>
          <div class="chart-sub">${GCAL.esc(c.summary)}</div>
          <div class="duo-grid" style="margin-bottom:0">
            <div>
              <div class="eyebrow" style="margin-bottom:4px">actions · ${c.actions.length}</div>
              ${(c.actions || []).map(a => `
                <div class="meta-row"><span class="meta-key"><span class="kind-tag">${GCAL.esc(a.kind)}</span></span>
                  <span class="meta-val"><code class="text-mono text-xs">${GCAL.esc(a.id)}</code> — ${GCAL.esc(a.summary || '')}</span></div>`).join('')}
            </div>
            <div>
              <div class="eyebrow" style="margin-bottom:4px">setup schema</div>
              ${v.schemaTable(c.setup_schema)}
              <div class="eyebrow" style="margin:8px 0 4px">credentials schema</div>
              ${v.schemaTable(c.credentials_schema)}
            </div>
          </div>
        </div>`).join('')}`;
  }

  function afterRender() {
    document.querySelectorAll('[data-connect]').forEach(b =>
      b.addEventListener('click', () => {
        GCAL.navigate('connections');
        setTimeout(() => GCAL.Connections.openCreate(b.dataset.connect), 80);
      }));
  }

  return { render, afterRender };
})();
