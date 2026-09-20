/* ════════════════════════════════════════════════════════════
    GCAL Views — shared card helpers (mirrors WOS.view).
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};
GCAL.view = {
  header(title, actionsHtml = '') {
    return `<div class="content-header"><div><h1>${title}</h1></div><div class="actions">${actionsHtml}</div></div>`;
  },
  statCard(value, label, color = '') {
    return `<div class="stat-card animate-in"><div class="stat-value" ${color ? `style="color:${color}"` : ''}>${value}</div><div class="stat-label">${label}</div></div>`;
  },
  pill(text, kind = '') { return `<span class="pill ${kind}">${text}</span>`; },
  statePill(s) { return `<span class="state-pill state-${GCAL.esc(s)}">${GCAL.esc(s)}</span>`; },
  barList(pairs, colors = {}) {
    const max = Math.max(1, ...pairs.map(([, n]) => n));
    return `<div class="bar-list-mini">${pairs.map(([k, n]) => `
      <div class="bar-mini-row">
        <span class="bm-label" title="${GCAL.esc(k)}">${GCAL.esc(k)}</span>
        <span class="bm-track"><span class="bm-fill" style="width:${Math.round((n / max) * 100)}%;${colors[k] ? `background:${colors[k]}` : ''}"></span></span>
        <span class="bm-val">${n}</span>
      </div>`).join('') || '<div class="empty-inline">—</div>'}</div>`;
  },
  schemaTable(fields) {
    if (!fields || !fields.length) return '<div class="empty-inline">—</div>';
    return `<div class="schema-table">${fields.map(f => `
      <span class="sk">${GCAL.esc(f.name)}${f.required ? ' <span class="req">*</span>' : ''}</span>
      <span class="sv">${GCAL.esc(f.type)}${f.default != null && f.default !== '' ? ` · default ${GCAL.esc(f.default)}` : ''}${f.description ? ` — ${GCAL.esc(f.description)}` : ''}</span>`).join('')}</div>`;
  },
};
