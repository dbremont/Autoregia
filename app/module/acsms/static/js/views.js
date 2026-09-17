/* ════════════════════════════════════════════════════════════
   ACSMS Views — shared card helpers (mirrors WOS.view).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.view = {
  // No eyebrow above the H1: the section name already lives in the
  // sidebar; repeating it in appContent is noise (design decision).
  header(title, actionsHtml = '') {
    return `<div class="content-header"><div><h1>${title}</h1></div><div class="actions">${actionsHtml}</div></div>`;
  },
  card(eyebrow, title, bodyHtml, sub = '', actionsHtml = '') {
    return `<div class="chart-card animate-in">
      <div class="chart-head"><div><span class="eyebrow">${eyebrow}</span><h3>${title}</h3></div>${actionsHtml}</div>
      ${sub ? `<div class="chart-sub">${sub}</div>` : ''}
      ${bodyHtml}
    </div>`;
  },
  statCard(value, label, color = '') {
    return `<div class="stat-card animate-in"><div class="stat-value" ${color ? `style="color:${color}"` : ''}>${value}</div><div class="stat-label">${label}</div></div>`;
  },
  pill(text, kind = '', cls = '') { return `<span class="pill ${kind} ${cls}">${text}</span>`; },
};

// Lifecycle status pill (chosen) vs tracking state pill (computed server-side).
ACSMS.statusPill = function (status) {
  const map = { active: ['', 'active'], paused: ['info', 'paused'], retired: ['', 'retired'] };
  const [kind, label] = map[status || 'active'] || ['', status];
  return `<span class="pill ${kind}">${label}</span>`;
};
ACSMS.statePill = function (state) {
  const map = { 'never-practiced': ['warning', 'never practiced'], 'on-track': ['success', 'on track'], 'neglected': ['danger', 'neglected'], 'paused': ['info', 'paused'], 'retired': ['', 'retired'] };
  const [kind, label] = map[state] || ['', state];
  return `<span class="pill state-pill-${state}">${label}</span>`;
};
