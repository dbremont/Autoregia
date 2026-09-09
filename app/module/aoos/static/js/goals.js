/* AOOS Goals — Component G (Goal Tracking). The objective layer:
 * measurable goals (target vs current) decomposed into Key Results,
 * with status, momentum, deadline, and a check-in to update reality. */
window.AO = window.AO || {};

AO.GoalsView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component G · Goal Tracking</span>' +
    '<h1>Goals</h1></div><div class="actions"><button class="btn btn-ghost btn-sm" id="btnGoalsRefresh">' +
    '<ao-icon name="refresh-cw" size="15"></ao-icon> Refresh</button></div></div>' +
    '<div id="goalsGrid"></div>';
};

AO.bindGoals = function () {
  const r = document.getElementById('btnGoalsRefresh');
  if (r) r.onclick = () => AO.renderGoals();
  AO.renderGoals();
};

AO._GOAL_STATUS_COLOR = {
  'on-track': '#3F6E50', 'at-risk': '#B4742A', 'off-track': '#A33434',
  'achieved': '#3F6E50', 'dormant': '#8C877B',
};
AO._GOAL_MOMENTUM_GLYPH = { advancing: '▲', stalled: '▶', regressing: '▼' };

AO._goalPill = function (text, color) {
  return '<span class="badge" style="background:' + color + '22;color:' + color + ';border-color:' + color + '44">' + AO.esc(text) + '</span>';
};

AO.renderGoals = async function () {
  const grid = document.getElementById('goalsGrid'); if (!grid) return;
  grid.innerHTML = '<div class="card"><div class="card-body"><p class="text-muted">Loading goals…</p></div></div>';
  let goals = [];
  try {
    goals = await fetch('/aoos/api/goals').then(r => r.json());
  } catch (e) { grid.innerHTML = '<div class="empty-state"><h3>Could not load goals</h3><p>' + AO.esc(e.message) + '</p></div>'; return; }
  if (!goals.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon"><ao-icon name="target" size="40"></ao-icon></div>' +
      '<h3>No tracked goals</h3><p>Attach a <code>goal</code> extension to an Objective action to start tracking it.</p></div>';
    return;
  }
  const rank = { 'off-track': 0, 'at-risk': 1, 'dormant': 2, 'on-track': 3, 'achieved': 4 };
  goals.sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.progress_pct - b.progress_pct);
  // headline strip
  const avg = Math.round(goals.reduce((s, g) => s + g.progress_pct, 0) / goals.length);
  const atRisk = goals.filter(g => g.status === 'at-risk' || g.status === 'off-track').length;
  const adv = goals.filter(g => g.momentum === 'advancing').length;
  const reg = goals.filter(g => g.momentum === 'regressing').length;
  grid.innerHTML =
    AO._statCard('Tracked Goals', goals.length, 'target', '#7A1A2A') +
    AO._statCard('Mean Progress', avg + '%', 'trending-up', '#3F6092') +
    AO._statCard('At Risk', atRisk, 'alert-triangle', atRisk ? '#A33434' : '#8C877B') +
    AO._statCard('Advancing', adv, 'arrow-up', '#3F6E50') +
    AO._statCard('Regressing', reg, 'arrow-down', reg ? '#A33434' : '#8C877B') +
    '<div class="card stat-card stat-card-wide"><div class="card-body"><div class="stat-label">Goal Tracking — target vs current</div>' +
    goals.map(g => AO._goalCard(g)).join('') + '</div></div>';
  // wire check-in toggles
  grid.querySelectorAll('[data-checkin]').forEach(btn => {
    btn.onclick = () => { const f = document.getElementById('checkin-' + btn.dataset.checkin); if (f) f.classList.toggle('hidden'); };
  });
  grid.querySelectorAll('[data-save-checkin]').forEach(btn => {
    btn.onclick = () => AO._saveGoalCheckIn(btn.dataset.saveCheckin);
  });
};

AO._goalCard = function (g) {
  const sc = AO._GOAL_STATUS_COLOR[g.status] || '#8C877B';
  const mg = AO._GOAL_MOMENTUM_GLYPH[g.momentum] || '▶';
  const mc = g.momentum === 'advancing' ? '#3F6E50' : g.momentum === 'regressing' ? '#A33434' : '#B4742A';
  const dir = (g.target || {}).direction === 'lte' ? '≤' : '≥';
  const tval = (g.target || {}).value, tunit = (g.target || {}).unit || '';
  const dl = g.deadline ? new Date(g.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const krs = (g.key_results || []).map(kr => {
    const kd = kr.direction === 'lte' ? '≤' : '≥';
    const kprog = kr.target ? Math.round((kr.direction === 'lte'
      ? (kr.current <= kr.target ? 100 : Math.max(0, kr.target / kr.current * 100))
      : Math.min(100, kr.current / kr.target * 100))) : 0;
    const kcol = kprog >= 100 ? '#3F6E50' : kprog >= 60 ? '#B4742A' : '#A33434';
    return '<div class="kr-row"><div class="kr-meta"><span class="kr-desc">' + AO.esc(kr.description) +
      '</span><span class="kr-val text-mono">' + kr.current + ' ' + kd + ' ' + kr.target + ' ' + AO.esc(kr.unit || '') + '</span></div>' +
      '<div class="kr-track"><div class="kr-fill" style="width:' + kprog + '%;background:' + kcol + '"></div></div></div>';
  }).join('');
  return '<div class="goal-card">' +
    '<div class="goal-head"><div><div class="goal-eyebrow">' + AO.esc(g.horizon || '') + ' · ' + AO.esc(g.objective_id || g.id) + '</div>' +
    '<h3 class="goal-title">' + AO.esc(g.title) + '</h3></div>' +
    '<div class="goal-pills">' + AO._goalPill(g.status, sc) +
    ' <span class="badge" style="background:' + mc + '22;color:' + mc + ';border-color:' + mc + '44">' + mg + ' ' + g.momentum + '</span></div></div>' +
    '<div class="goal-progress"><div class="goal-prog-track"><div class="goal-prog-fill" style="width:' + g.progress_pct + '%;background:' + sc + '"></div></div>' +
    '<div class="goal-prog-label"><strong>' + g.progress_pct + '%</strong> · current ' + g.current + ' ' + tunit + ' ' + dir + ' target ' + tval + ' ' + tunit + '</div></div>' +
    (krs ? '<div class="goal-krs"><div class="goal-kr-label">Key Results</div>' + krs + '</div>' : '') +
    '<div class="goal-foot"><span class="text-muted text-sm">Deadline ' + dl + '</span>' +
    '<button class="btn btn-secondary btn-sm" data-checkin="' + g.id + '"><ao-icon name="edit" size="13"></ao-icon> Check in</button></div>' +
    '<div class="checkin-form hidden" id="checkin-' + g.id + '">' +
    '<label class="form-label">New current value (' + AO.esc(tunit || 'value') + ')</label>' +
    '<input type="number" step="any" id="cin-' + g.id + '" value="' + g.current + '">' +
    '<button class="btn btn-primary btn-sm" data-save-checkin="' + g.id + '">Save check-in</button></div>' +
    '</div>';
};

AO._saveGoalCheckIn = async function (id) {
  const inp = document.getElementById('cin-' + id); if (!inp) return;
  const current = parseFloat(inp.value);
  if (isNaN(current)) { AO.toast('Enter a numeric value'); return; }
  // fetch the current goal, recompute progress, append history
  let g;
  try { g = await fetch('/aoos/api/goals/' + id).then(r => r.json()); } catch (e) { AO.toast('Load failed'); return; }
  const dir = (g.target || {}).direction === 'lte' ? 'lte' : 'gte';
  const base = g.baseline != null ? g.baseline : 0;
  const tgt = (g.target || {}).value;
  let pct = g.progress_pct;
  if (tgt != null) {
    const span = (tgt - base) || 1;
    pct = dir === 'gte' ? Math.max(0, Math.min(100, Math.round((current - base) / span * 100)))
      : Math.max(0, Math.min(100, Math.round((base - current) / (base - tgt || 1) * 100)));
  }
  const today = new Date().toISOString().slice(0, 10);
  const history = (g.progress_history || []).filter(h => h.date !== today);
  history.push({ date: today, pct });
  history.sort((a, b) => a.date < b.date ? -1 : 1);
  const status = pct >= 100 ? 'achieved' : pct >= 70 ? 'on-track' : pct >= 40 ? 'at-risk' : 'off-track';
  const goal = Object.assign({}, g);
  goal.current = current; goal.progress_pct = pct; goal.status = status; goal.progress_history = history;
  // the API expects the action's `goal` field; g is the projected view — reconstruct the extension
  const ext = { objective_id: g.objective_id, target: g.target, baseline: g.baseline,
    current: current, progress_pct: pct, status: status, horizon: g.horizon,
    deadline: g.deadline, owner: g.owner, key_results: g.key_results, progress_history: history };
  try {
    await fetch('/aoos/api/actions/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: ext }) });
    AO.toast('Check-in saved · ' + pct + '%');
    AO.renderGoals();
  } catch (e) { AO.toast('Save failed'); }
};
