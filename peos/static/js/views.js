/* ════════════════════════════════════════════════════════════
   PEOS Views — shared card helpers (mirrors LOOP.view)
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.view = {
  header(eyebrow, title, actionsHtml='') {
    return `<div class="content-header"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1></div><div class="actions">${actionsHtml}</div></div>`;
  },
  chartCard(id, eyebrow, title, sub='') {
    return `<div class="chart-card animate-in">
      <div class="chart-head"><div><span class="eyebrow">${eyebrow}</span><h3>${title}</h3></div></div>
      ${sub?`<div class="chart-sub">${sub}</div>`:''}
      <div class="chart-box" id="${id}"></div>
    </div>`;
  },
  statCard(value, label, color='') {
    return `<div class="stat-card animate-in"><div class="stat-value" ${color?`style="color:${color}"`:''}>${value}</div><div class="stat-label">${label}</div></div>`;
  },
  pill(text, kind='') { return `<span class="pill ${kind}">${text}</span>`; },
  windowSeg() {
    const btns = PEOS.Store.WINDOWS().map(w=>`<button class="seg-btn" data-h="${w.h}">${w.label}</button>`).join('');
    return `<div class="seg" id="windowSeg">${btns}</div>`;
  },
};
