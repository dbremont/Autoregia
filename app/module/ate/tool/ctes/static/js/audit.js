/* ════════════════════════════════════════════════════════════
   CTES Audit — every mutation of the register, the specs, and
   the settings, recorded with actor, action, and change details.
   The trail is never pruned and never deletable from the UI.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};
CTES.Audit = (() => {
  const v = CTES.view;
  const ACTION_COLOR = {
    'handle.register': '#3F6E50', 'handle.update': '#3F6092',
    'handle.activate': '#3F6E50', 'handle.inactivate': '#B4742A',
    'handle.delete': '#A33434', 'handle.scan': '#8C877B',
    'spec.create': '#3F6E50', 'spec.update': '#3F6092', 'spec.delete': '#A33434',
    'spec.emit': '#A8854A', 'settings.update': '#5C4E78', 'runs.clear': '#A33434',
  };
  const state = { action: 'all', entity_type: 'all' };
  let entries = [];

  function render() {
    return `
      ${v.header('Audit')}
      <div class="filter-bar animate-in">
        <select id="audAction" class="src-select" style="max-width:240px" aria-label="Filter by action">
          <option value="all">all actions</option>
          ${Object.keys(ACTION_COLOR).map(a => `<option value="${a}" ${state.action === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
        <div class="seg" role="group" aria-label="entity filter">
          ${['all', 'handle', 'task_spec', 'settings', 'run'].map(t => `<button class="seg-btn ${state.entity_type === t ? 'active' : ''}" data-entity="${t}">${t}</button>`).join('')}
        </div>
        <span class="results-meta">${entries.length} record${entries.length === 1 ? '' : 's'}</span>
      </div>
      <div class="chart-card animate-in" id="audTable"><div class="empty-state">loading…</div></div>`;
  }

  function draw() {
    const host = document.getElementById('audTable');
    if (!entries.length) { host.innerHTML = '<div class="empty-state">no audit records match</div>'; return; }
    host.innerHTML = `<table class="src-table"><thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead><tbody>
      ${entries.map(e => `<tr>
        <td class="src-ago">${CTES.Store.fmtTime(e.ts)}</td>
        <td><span class="src-health"><span class="src-dot" style="background:${ACTION_COLOR[e.action] || '#8C877B'}"></span>${CTES.esc(e.action)}</span></td>
        <td class="src-id">${CTES.esc(e.entity_type)}${e.entity_id && e.entity_id !== '*' ? ` · ${CTES.esc(e.entity_id)}` : ''}</td>
        <td class="text-sm">${CTES.esc(e.summary)}${e.details && Object.keys(e.details).length ? ` <span class="src-id" title="${CTES.esc(JSON.stringify(e.details))}">⌗</span>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  async function load() {
    try {
      entries = await CTES.Store.audit({
        action: state.action === 'all' ? undefined : state.action,
        entity_type: state.entity_type === 'all' ? undefined : state.entity_type,
      });
    } catch (e) { entries = []; CTES.toast(e.message); }
    draw();
  }

  function afterRender() {
    document.getElementById('audAction')?.addEventListener('change', (e) => { state.action = e.target.value; load(); });
    document.querySelectorAll('[data-entity]').forEach(b => b.addEventListener('click', () => {
      state.entity_type = b.dataset.entity; CTES.navigate('audit');
    }));
    load();
  }

  return { render, afterRender };
})();
