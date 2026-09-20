/* ════════════════════════════════════════════════════════════
    SARL Views — shared card helpers (mirrors WOS.view).
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.view = {
  header(title, actionsHtml = '') {
    return `<div class="content-header"><div><h1>${title}</h1></div><div class="actions">${actionsHtml}</div></div>`;
  },
  statCard(value, label, color = '') {
    return `<div class="stat-card animate-in"><div class="stat-value" ${color ? `style="color:${color}"` : ''}>${value}</div><div class="stat-label">${label}</div></div>`;
  },
  pill(text, kind = '') { return `<span class="pill ${kind}">${text}</span>`; },
  statePill(s) { return `<span class="state-pill state-${SARL.esc(s)}">${SARL.esc(s)}</span>`; },
  sevChip(s) { return `<span class="sev-chip sev-${SARL.esc(s)}">${SARL.esc(s)}</span>`; },
  barList(pairs, colors = {}) {
    const max = Math.max(1, ...pairs.map(([, n]) => n));
    return `<div class="bar-list-mini">${pairs.map(([k, n]) => `
      <div class="bar-mini-row">
        <span class="bm-label" title="${SARL.esc(k)}">${SARL.esc(k)}</span>
        <span class="bm-track"><span class="bm-fill" style="width:${Math.round((n / max) * 100)}%;${colors[k] ? `background:${colors[k]}` : ''}"></span></span>
        <span class="bm-val">${n}</span>
      </div>`).join('') || '<div class="empty-inline">—</div>'}</div>`;
  },
};
