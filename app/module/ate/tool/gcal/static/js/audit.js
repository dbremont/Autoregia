/* ════════════════════════════════════════════════════════════
    GCAL Audit — every mutation of the connections, the settings,
    and the logs, recorded with actor, action, and change
    details. The trail is never pruned and never deletable.
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.Audit = (() => {
  const v = GCAL.view;
  const ACTION_COLOR = {
    'connection.create': '#3F6E50', 'connection.test': '#3F6092',
    'connection.disconnect': '#B4742A', 'connection.delete': '#A33434',
    'settings.update': '#5C4E78', 'executions.clear': '#A33434',
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
          ${['all', 'connection', 'execution', 'settings'].map(t => `<button class="seg-btn ${state.entity_type === t ? 'active' : ''}" data-entity="${t}">${t}</button>`).join('')}
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
        <td class="src-ago">${GCAL.Store.fmtTime(e.ts)}</td>
        <td><span class="src-health"><span class="src-dot" style="background:${ACTION_COLOR[e.action] || '#8C877B'}"></span>${GCAL.esc(e.action)}</span></td>
        <td class="src-id">${GCAL.esc(e.entity_type)}${e.entity_id && e.entity_id !== '*' ? ` · ${GCAL.esc(e.entity_id)}` : ''}</td>
        <td class="text-sm">${GCAL.esc(e.summary)}${e.details && Object.keys(e.details).length ? ` <span class="src-id" title="${GCAL.esc(JSON.stringify(e.details))}">⌗</span>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  async function load() {
    try {
      entries = await GCAL.Store.audit({
        action: state.action === 'all' ? undefined : state.action,
        entity_type: state.entity_type === 'all' ? undefined : state.entity_type,
      });
    } catch (e) { entries = []; GCAL.toast(e.message); }
    draw();
  }

  function afterRender() {
    document.getElementById('audAction')?.addEventListener('change', (e) => { state.action = e.target.value; load(); });
    document.querySelectorAll('[data-entity]').forEach(b => b.addEventListener('click', () => {
      state.entity_type = b.dataset.entity; GCAL.navigate('audit');
    }));
    load();
  }

  return { render, afterRender };
})();
