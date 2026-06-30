/* PWOS Analytics Dashboard — S3* (Audit) read-only surface over app.todoist.
 *
 * Conforms to spec/pwos/analytics.md. A sectioned, sophisticated dashboard:
 * composite indices, flow & funnel, temporal behaviour, health & risk,
 * projects & activity, comparative radar, and auto-insights.
 * Charts: self-hosted Apache ECharts, themed to the design tokens.
 */
window.PW = window.PW || {};

/* ── Design tokens → ECharts theme ───────────────────────────── */
PW._echartsTheme = function () {
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n).trim() || fb);
  return {
    ink: tok('--ink-1', '#2C2A26'), muted: tok('--color-text-muted', '#8C877B'),
    faint: tok('--color-text-faint', '#A7A296'), border: tok('--color-border', '#E2DED4'),
    surface: tok('--color-surface', '#FFFFFF'), surface2: tok('--color-surface-2', '#F4F1EA'),
    paper: tok('--paper', '#FAFAF6'), oxford: tok('--oxford', '#7A1A2A'),
    gold: tok('--gold', '#A8854A'), success: tok('--color-success', '#3F6E50'),
    warning: tok('--color-warning', '#B4742A'), danger: tok('--color-danger', '#A33434'),
    info: tok('--color-info', '#3F6092'),
    serif: tok('--font-display', 'Spectral, Georgia, serif').split(',')[0],
    body: tok('--font-body', 'Inter, sans-serif').split(',')[0],
    mono: tok('--font-mono', 'IBM Plex Mono, monospace').split(',')[0],
  };
};
PW._anPalette = ['#7A1A2A', '#3F6092', '#A8854A', '#2D6A4F', '#6B5B95',
                 '#B4742A', '#3F6E50', '#962030', '#5C4E78', '#8C877B'];
PW._anCharts = [];
PW._anDispose = function () {
  PW._anCharts.forEach(c => { try { c.dispose(); } catch (e) {} });
  PW._anCharts = [];
};
PW._anBase = function (extra) {
  const t = PW._theme;
  return Object.assign({
    textStyle: { fontFamily: t.body, color: t.ink, fontSize: 12 },
    tooltip: {
      backgroundColor: t.surface, borderColor: t.border, borderWidth: 1,
      textStyle: { color: t.ink, fontFamily: t.body, fontSize: 12 },
      extraCssText: 'box-shadow:0 4px 12px rgba(30,28,25,0.08);border-radius:4px;',
    },
    grid: { left: 48, right: 24, top: 36, bottom: 32, containLabel: false },
    color: PW._anPalette,
  }, extra || {});
};

/* ── View scaffold + filter state ────────────────────────────── */
PW.AnalyticsView = function () {
  return '<div class="content-header">' +
    '<div><span class="eyebrow">S3* · Audit Surface · app.todoist</span><h1>Analytics Dashboard</h1></div>' +
    '<div class="actions an-toolbar">' + PW.Analytics._filters() +
    '<button class="btn btn-ghost btn-sm" id="btnAnRefresh" title="Recompute"><pw-icon name="refresh-cw" size="15"></pw-icon> Refresh</button>' +
    '<a class="btn btn-ghost btn-sm" id="btnAnExport" href="#" title="Export JSON"><pw-icon name="download" size="15"></pw-icon> Export</a>' +
    '</div></div>' +
    '<div class="an-nav" id="anNav"></div>' +
    '<div id="anBody"><div class="an-skeleton-grid">' +
      Array(8).fill('<div class="an-skeleton"></div>').join('') + '</div></div>';
};
PW.Analytics = PW.Analytics || {};
PW.Analytics._window = 30;
PW.Analytics._project = '';
PW.Analytics._SECTIONS = [
  ['overview', 'Overview'], ['flow', 'Flow & Funnel'], ['temporal', 'Temporal'],
  ['health', 'Health & Risk'], ['dynamics', 'State Dynamics'], ['projects', 'Projects & Activity'], ['compare', 'Compare & Insight'],
];
PW.Analytics._filters = function () {
  const wins = [[7, '7d'], [30, '30d'], [90, '90d'], [365, '1y']];
  return '<div class="view-switch">' + wins.map(w =>
    '<button class="view-switch-btn' + (PW.Analytics._window === w[0] ? ' is-active' : '') +
    '" onclick="PW.Analytics.setWindow(' + w[0] + ')">' + w[1] + '</button>').join('') + '</div>' +
    '<select class="select an-select" id="anProject" onchange="PW.Analytics.setProject(this.value)">' +
    '<option value="">All projects</option></select>';
};
PW.Analytics.setWindow = function (w) { PW.Analytics._window = w; PW.Analytics.render(); };
PW.Analytics.setProject = function (p) { PW.Analytics._project = p; PW.Analytics.render(); };
PW.Analytics.bind = function () { PW.Analytics.render(); PW.Analytics._wireHeader(); };
PW.Analytics._teardown = function () {
  PW._anDispose();
  window.removeEventListener('resize', PW.Analytics._resize);
};
PW.Analytics._wireHeader = function () {
  const r = document.getElementById('btnAnRefresh');
  if (r) r.onclick = () => PW.Analytics.render();
  const e = document.getElementById('btnAnExport');
  if (e) e.href = '/api/analytics/export?window=' + PW.Analytics._window;
};

/* ── Fetch helpers ───────────────────────────────────────────── */
PW._anGet = async function (path) {
  const res = await fetch(path); if (!res.ok) throw new Error(path + ' → ' + res.status);
  return res.json();
};
PW._anQuery = function (extra) {
  const p = new URLSearchParams(); p.set('window', PW.Analytics._window);
  if (PW.Analytics._project) p.set('project', PW.Analytics._project);
  if (extra) for (const k in extra) p.set(k, extra[k]);
  return p.toString();
};

/* ── Main render ─────────────────────────────────────────────── */
PW.Analytics.render = async function () {
  PW._theme = PW._echartsTheme();
  const tb = document.querySelector('.an-toolbar');
  if (tb) { tb.innerHTML = PW.Analytics._filters(); PW.Analytics._wireHeader(); }
  const nav = document.getElementById('anNav');
  if (nav) nav.innerHTML = PW.Analytics._SECTIONS.map(s =>
    '<a class="an-nav-chip" data-target="sec-' + s[0] + '" onclick="PW.Analytics._jump(\'sec-' + s[0] + '\')">' +
    s[1] + '</a>').join('');
  const body = document.getElementById('anBody');
  if (!body) return;
  PW._anDispose();
  body.innerHTML = '<div class="an-skeleton-grid">' + Array(10).fill('<div class="an-skeleton"></div>').join('') + '</div>';
  try {
    const q = PW._anQuery();
    const data = await Promise.all([
      PW._anGet('/api/analytics/performance?' + q),
      PW._anGet('/api/analytics/indices?' + q),
      PW._anGet('/api/analytics/summary?' + q),
      PW._anGet('/api/analytics/throughput?' + q),
      PW._anGet('/api/analytics/trajectory?' + q),
      PW._anGet('/api/analytics/funnel?' + q),
      PW._anGet('/api/analytics/rhythm?' + q),
      PW._anGet('/api/analytics/hourly?' + q),
      PW._anGet('/api/analytics/monthly?months=6' + (PW.Analytics._project ? '&project=' + PW.Analytics._project : '')),
      PW._anGet('/api/analytics/cycletime?' + q),
      PW._anGet('/api/analytics/priority-debt?days=180' + (PW.Analytics._project ? '&project=' + PW.Analytics._project : '')),
      PW._anGet('/api/analytics/projects-intelligence?' + q),
      PW._anGet('/api/analytics/labels?' + PW._anQuery({ limit: 12 })),
      PW._anGet('/api/analytics/habits?' + PW._anQuery({ window: 60 })),
      PW._anGet('/api/analytics/activity?limit=40'),
      PW._anGet('/api/analytics/radar?' + q),
      PW._anGet('/api/analytics/insights?' + q),
      PW._anGet('/api/analytics/reliability?' + q),
      PW._anGet('/api/analytics/aging'),
      PW._anGet('/api/analytics/markov?' + q),
      PW._anGet('/api/analytics/markov-evolution?months=6' + (PW.Analytics._project ? '&project=' + PW.Analytics._project : '')),
    ]);
    const D = {};
    [D.performance, D.indices, D.summary, D.throughput, D.trajectory, D.funnel, D.rhythm, D.hourly,
     D.monthly, D.cycletime, D.priorityDebt, D.projIntel, D.labels, D.habits,
     D.activity, D.radar, D.insights, D.reliability, D.aging, D.markov, D.markovEvo] = data;
    D.heatmap = await PW._anGet('/api/analytics/heatmap?year=' + new Date(D.summary.today).getFullYear());

    // populate project filter
    const sel = document.getElementById('anProject');
    if (sel) {
      const cur = PW.Analytics._project;
      sel.innerHTML = '<option value="">All projects</option>' +
        (D.projIntel.projects || []).map(p =>
          '<option value="' + p.project_id + '"' + (p.project_id === cur ? ' selected' : '') + '>' +
          PW.esc(p.name) + '</option>').join('');
    }
    PW.Analytics._paint(D);
  } catch (e) {
    body.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠</div>' +
      '<h3>Could not load analytics</h3><p>' + PW.esc(e.message) + '</p></div>';
  }
};

PW.Analytics._jump = function (id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.an-nav-chip').forEach(c => c.classList.remove('is-active'));
  const chip = document.querySelector('.an-nav-chip[data-target="' + id + '"]');
  if (chip) chip.classList.add('is-active');
};

/* ── Section header helper ───────────────────────────────────── */
PW._anSection = function (id, eyebrow, title, sub, inner) {
  return '<section class="an-section" id="sec-' + id + '">' +
    '<div class="an-section-head"><span class="an-section-eyebrow">' + eyebrow + '</span>' +
    '<h2 class="an-section-title">' + title + '</h2>' +
    (sub ? '<span class="an-section-sub">' + sub + '</span>' : '') + '</div>' +
    '<div class="an-section-body">' + inner + '</div></section>';
};
PW._anCard = function (id, title, sub, reading, span) {
  return '<div class="card an-chart-card' + (span ? ' an-span-' + span : '') + '">' +
    '<div class="card-body">' +
    '<div class="an-card-head"><h3>' + title + '</h3>' + (sub ? '<span class="an-sub">' + sub + '</span>' : '') + '</div>' +
    '<div class="an-chart" id="' + id + '"></div>' +
    (reading ? '<div class="an-reading">' + reading + '</div>' : '') +
    '</div></div>';
};

/* ── Paint: build all sections, then render charts ───────────── */
PW.Analytics._paint = function (D) {
  const body = document.getElementById('anBody');
  const t = PW._theme;
  const win = D.summary.window_days >= 365 ? '12 months' : (D.summary.window_days + ' days');
  const k = D.summary.kpi;

  body.innerHTML =
    PW.Analytics._performanceSection(D.performance) +
    PW._anSection('overview', 'Composite health', 'Overview',
      'single-number readings · decomposable', PW.Analytics._overviewCards(D)) +
    PW._anSection('flow', 'Execution', 'Flow & Funnel',
      'how work moves from created to done · last ' + win,
      PW._anCard('anThroughput', 'Throughput', 'created vs completed + 7-day velocity', null, 2) +
      PW._anCard('anTrajectory', 'Backlog Trajectory', 'cumulative created − completed',
        PW._trajReading(D.trajectory)) +
      PW._anCard('anFunnel', 'Completion Funnel', 'where tasks drop off', PW._funnelReading(D.funnel), 2)) +
    PW._anSection('temporal', 'Behaviour', 'Temporal Patterns',
      'when work actually happens',
      PW._anCard('anRhythm', 'Weekly Rhythm', 'mean completions per weekday', PW._rhythmReading(D.rhythm)) +
      PW._anCard('anHourly', 'Hourly Productivity', 'completion density · hour × weekday', PW._hourlyReading(D.hourly), 2) +
      PW._anCard('anMonthly', 'Monthly Comparison', 'last 6 months · trajectory verdicts', null, 3)) +
    PW._anSection('health', 'Risk', 'Health & Risk',
      'estimate realism · debt accumulation · reliability',
      PW._anCard('anCycletime', 'Cycle-Time by Priority', 'p50 / p90 created → completed', PW._cycletimeReading(D.cycletime)) +
      PW._anCard('anPriorityDebt', 'Priority Debt', 'cumulative P1+P2 open', PW._priorityDebtReading(D.priorityDebt), 2) +
      PW._anCard('anOverdue', 'Overdue Distribution', 'how far past due', PW._overdueReading(D.reliability)) +
      PW._anCard('anAging', 'Backlog Aging', 'open items by age', null)) +
    PW._anSection('dynamics', 'Markov', 'State Dynamics',
      'where work flows, where it gets trapped',
      PW._anCard('anMarkovMatrix', 'Transition Matrix', 'P[next state | current state]', PW._markovMatrixReading(D.markov), 2) +
      PW._anCard('anMarkovFate', 'Empirical Fate', 'from each state — % ending on-time', null, 1) +
      PW._anCard('anMarkovGraph', 'State Flow Diagram', 'directed Markov graph · edge = P(next | current) · node badge = dwell', null, 3) +
      PW._anCard('anMarkovEvo', 'Evolution', 'key transition probabilities over time', null, 3)) +
    PW._anSection('projects', 'Momentum', 'Projects & Activity',
      'where energy flows · what just happened',
      PW._anCard('anProjIntel', 'Project Intelligence', 'recent velocity vs baseline', null, 2) +
      PW._anCard('anLabels', 'Top Labels', 'items touched', null) +
      PW._anCard('anHabits', 'Streak & Habits', 'consistency of recurring work', PW._habitsReading(D.habits)) +
      PW._anCard('anActivity', 'Recent Activity Stream', 'timeline · session-detected', null, 2)) +
    PW._anSection('compare', 'S3* voice', 'Compare & Insight',
      'this vs last · auto-generated findings',
      PW._anCard('anRadar', 'Radar Comparison', 'this period vs previous', null) +
      PW._anInsightsCard(D.insights) +
      PW._anCard('anHeatmap', 'Activity Heatmap', '365-day completion intensity', null, 3)) +
    PW._anSection('eval', 'Audit', 'Evaluation Mapping',
      'PWOS criteria → indicator',
      '<div class="card an-chart-card an-span-3"><div class="card-body">' +
      An_EvalTable(D.summary, D.throughput, D.reliability, D.indices) + '</div></div>');

  // render charts after layout
  requestAnimationFrame(() => {
    PW.Analytics._renderGauges(D.indices);
    PW.Analytics._chartThroughput(D.throughput);
    PW.Analytics._chartTrajectory(D.trajectory);
    PW.Analytics._chartFunnel(D.funnel);
    PW.Analytics._chartRhythm(D.rhythm);
    PW.Analytics._chartHourly(D.hourly);
    PW.Analytics._chartMonthly(D.monthly);
    PW.Analytics._chartCycletime(D.cycletime);
    PW.Analytics._chartPriorityDebt(D.priorityDebt);
    PW.Analytics._chartOverdue(D.reliability);
    PW.Analytics._chartAging(D.aging);
    PW.Analytics._chartMarkovMatrix(D.markov);
    PW.Analytics._chartMarkovGraph(D.markov);
    PW.Analytics._renderMarkovFate(D.markov);
    PW.Analytics._chartMarkovEvolution(D.markovEvo);
    PW.Analytics._chartProjIntel(D.projIntel);
    PW.Analytics._chartLabels(D.labels);
    PW.Analytics._renderHabits(D.habits);
    PW.Analytics._renderActivity(D.activity);
    PW.Analytics._chartRadar(D.radar);
    PW.Analytics._renderHeatmap(D.heatmap);
    window.addEventListener('resize', PW.Analytics._resize);
  });
};

/* ── My Performance scorecard (hero) ─────────────────────────── */
PW.Analytics._performanceSection = function (perf) {
  const t = PW._theme;
  const statusColor = { 'on-track': t.success, 'at-risk': t.warning, 'off-track': t.danger };
  const overall = perf.overall_progress;
  const oCol = statusColor[perf.verdict] || t.warning;
  // overall verdict ring (CSS conic gradient)
  const heroRing = '<div class="an-perf-hero-ring" style="--p:' + overall + ';--c:' + oCol + '">' +
    '<div class="an-perf-hero-inner"><span class="an-perf-hero-val">' + Math.round(overall) +
    '%</span><span class="an-perf-hero-verdict">' + PW.prettyEnum(perf.verdict) + '</span></div></div>';
  // narrative: pick the two most-off-track goals to name
  const sorted = perf.goals.slice().sort((a, b) => a.progress - b.progress);
  const worst = sorted[0], on = perf.goals.filter(g => g.status === 'on-track');
  let narrative = 'Overall you are <strong style="color:' + oCol + '">' + PW.prettyEnum(perf.verdict) +
    '</strong> · ' + perf.goals_on_track + ' of ' + perf.goals_total + ' goals on-track.';
  if (worst && worst.status !== 'on-track') {
    narrative += ' Weakest front: <strong>' + PW.esc(worst.name) + '</strong> (' + worst.progress + '%).';
  }
  if (on.length) {
    narrative += ' Holding: <strong>' + on.map(g => PW.esc(g.name)).join('</strong>, <strong>') + '</strong>.';
  }
  // goal cards
  const goalCards = perf.goals.map(g => {
    const col = statusColor[g.status] || t.warning;
    const ring = '<div class="an-perf-ring" style="--p:' + g.progress + ';--c:' + col + '">' +
      '<span>' + Math.round(g.progress) + '%</span></div>';
    const krs = g.key_results.map(kr => {
      const kcol = statusColor[kr.status] || t.warning;
      const dirSym = kr.direction === 'gte' ? '≥' : '≤';
      return '<div class="an-kr">' +
        '<div class="an-kr-head"><span class="an-kr-label">' + PW.prettyEnum(kr.label) + '</span>' +
        '<span class="an-kr-vals"><span class="an-kr-cur" style="color:' + kcol + '">' +
        PW._fmtVal(kr.current, kr.unit) + '</span> <span class="an-kr-tgt">' + dirSym + ' ' +
        PW._fmtVal(kr.target, kr.unit) + '</span></span></div>' +
        '<div class="an-kr-bar"><div class="an-kr-fill" style="width:' + Math.max(2, kr.progress) +
        '%;background:' + kcol + '"></div><span class="an-kr-status" style="color:' + kcol + '">' +
        PW.prettyEnum(kr.status) + '</span></div></div>';
    }).join('');
    return '<div class="card an-perf-goal' + (g.status === 'off-track' ? ' is-critical' : '') + '">' +
      '<div class="card-body">' +
      '<div class="an-perf-goal-head">' + ring +
      '<div><div class="an-perf-goal-family">' + PW.esc(g.family) + '</div>' +
      '<div class="an-perf-goal-name">' + PW.esc(g.name) + '</div></div></div>' +
      '<div class="an-perf-goal-desc">' + PW.esc(g.description) + '</div>' +
      '<div class="an-perf-krs">' + krs + '</div></div></div>';
  }).join('');
  return PW._anSection('performance', 'S4/S5 intention · S3* evidence',
    'My Performance', 'operational health scorecard',
    '<div class="an-perf-hero">' + heroRing +
    '<div class="an-perf-narrative">' + narrative + '</div></div>' +
    '<div class="an-perf-goals">' + goalCards + '</div>');
};

PW._fmtVal = function (v, unit) {
  if (unit === '%') return (Math.round(v * 10) / 10) + '%';
  if (unit === '0-100') return Math.round(v * 10) / 10;
  return v;
};

/* ── Overview cards (3 gauges + KPI strip) ───────────────────── */
PW.Analytics._overviewCards = function (D) {
  const idx = D.indices;
  const k = D.summary.kpi;
  const win = D.summary.window_days >= 365 ? '12 mo' : (D.summary.window_days + 'd');
  const gauge = (key, label, invert) => {
    const v = idx[key].value, band = idx[key].band;
    const color = invert
      ? (band === 'high' ? PW._theme.danger : (band === 'moderate' ? PW._theme.warning : PW._theme.success))
      : (band === 'viable' ? PW._theme.success : (band === 'developing' ? PW._theme.warning : PW._theme.danger));
    const subTxt = key === 'productivity' ? 'higher is better'
      : (key === 'backlog_pressure' ? 'lower is better' : 'lower is better');
    return '<div class="card an-gauge-card"><div class="card-body">' +
      '<div class="an-card-head"><h3>' + PW.prettyEnum(key) + '</h3><span class="an-sub">' + subTxt + '</span></div>' +
      '<div class="an-gauge" id="anGauge_' + key + '"></div></div></div>';
  };
  const kpi = (label, value, icon, color, sub) =>
    '<div class="card an-kpi"><div class="card-body">' +
    '<div class="an-kpi-top"><pw-icon name="' + icon + '" size="15" style="color:' + color + '"></pw-icon>' +
    '<span class="an-kpi-label">' + label + '</span></div>' +
    '<div class="an-kpi-value" style="color:' + color + '">' + value + '</div>' +
    '<div class="an-kpi-sub">' + (sub || '') + '</div></div></div>';
  return '<div class="an-gauges">' +
    gauge('productivity', 'Productivity', false) +
    gauge('backlog_pressure', 'Backlog Pressure', true) +
    gauge('fragmentation', 'Fragmentation', true) +
    '</div>' +
    '<div class="an-kpis">' +
    kpi('Completed', k.completed, 'check-circle', PW._theme.success, '+' + Math.round(k.completion_rate) + '% rate · ' + win) +
    kpi('Open Backlog', k.open, 'inbox', PW._theme.info, k.overdue + ' overdue') +
    kpi('Completion Rate', k.completion_rate + '%', 'percent', PW._theme.oxford, k.total_items + ' tracked') +
    kpi('Cycle p50', (D.cycletime.by_priority.reduce((s, p) => s + p.p50, 0) / 4).toFixed(1) + 'd', 'clock', PW._theme.gold, 'median days') +
    kpi('Streak', k.current_streak + 'd', 'flame', '#B4742A', 'longest ' + D.habits.longest_streak + 'd') +
    kpi('Adherence', D.reliability.deadline_adherence + '%', 'target', PW._theme.success, D.reliability.met + ' met') +
    '</div>';
};

/* ── Readings (inline auto-insights per chart) ───────────────── */
PW._trajReading = d => {
  if (!d.series || !d.series.length) return '';
  const first = d.series[0].cumulative, last = d.series[d.series.length - 1].cumulative;
  const delta = last - first;
  const sign = delta > 0 ? 'grew by ' + delta : (delta < 0 ? 'shrank by ' + Math.abs(delta) : 'held steady');
  return '<pw-icon name="trending-up" size="13"></pw-icon> Backlog ' + sign + ' over the window.';
};
PW._funnelReading = d => {
  const s = d.stages || [];
  if (s.length < 4) return '';
  const dueRate = Math.round(s[1].value / Math.max(1, s[0].value) * 100);
  const compRate = Math.round(s[2].value / Math.max(1, s[0].value) * 100);
  return '<pw-icon name="activity" size="13"></pw-icon> ' + dueRate + '% get a due date; ' + compRate + '% of created items get completed.';
};
PW._rhythmReading = d => d.peak_day
  ? '<pw-icon name="calendar" size="13"></pw-icon> Peak day: <strong>' + d.peak_day + '</strong>.'
  : '';
PW._hourlyReading = d => '<pw-icon name="clock" size="13"></pw-icon> Peak focus window: <strong>' + d.peak.label + '</strong>.';
PW._cycletimeReading = d => {
  const p1 = (d.by_priority || []).find(p => p.priority === 1);
  const p4 = (d.by_priority || []).find(p => p.priority === 4);
  if (!p1 || !p4) return '';
  return '<pw-icon name="clock" size="13"></pw-icon> P1 median cycle: <strong>' + p1.p50 + 'd</strong>; P4: <strong>' + p4.p50 + 'd</strong>.';
};
PW._priorityDebtReading = d => '<pw-icon name="alert-triangle" size="13"></pw-icon> Currently <strong>' + d.current + '</strong> high-priority items open.';
PW._overdueReading = d => {
  const b = d.overdue_buckets || {};
  const total = (b['0-7d'] || 0) + (b['7-30d'] || 0) + (b['30-90d'] || 0) + (b['90+d'] || 0);
  return '<pw-icon name="alert-triangle" size="13"></pw-icon> ' + total + ' overdue; ' + (b['90+d'] || 0) + ' past 90 days.';
};
PW._habitsReading = d => '<pw-icon name="flame" size="13"></pw-icon> Current streak <strong>' + d.current_streak + 'd</strong>; longest <strong>' + d.longest_streak + 'd</strong>.';

/* ── Insights card (text panel) ──────────────────────────────── */
PW._anInsightsCard = function (data) {
  const toneColor = { danger: PW._theme.danger, warning: PW._theme.warning, success: PW._theme.success, info: PW._theme.info };
  const items = (data.findings || []).map(f =>
    '<div class="an-insight"><span class="an-insight-dot" style="background:' + (toneColor[f.tone] || PW._theme.info) + '"></span>' +
    '<span class="an-insight-text">' + PW.esc(f.text) + '</span></div>').join('');
  return '<div class="card an-chart-card an-span-2"><div class="card-body">' +
    '<div class="an-card-head"><h3>Auto-Insights</h3><span class="an-sub">the S3* auditor voice</span></div>' +
    '<div class="an-insights">' + (items || '<p class="text-muted">No findings.</p>') + '</div></div></div>';
};

/* ── Chart mount helper ──────────────────────────────────────── */
PW._anMount = function (id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const c = echarts.init(el, null, { renderer: 'canvas' });
  PW._anCharts.push(c);
  return c;
};

/* ── Markov: matrix heatmap, sankey, fate, evolution ─────────── */
PW._markovMatrixReading = function (d) {
  if (!d || !d.matrix) return '';
  const idx = {};
  (d.states || []).forEach((s, i) => { idx[s.id] = i; });
  const slip = d.matrix[idx.active] && d.matrix[idx.active][idx.overdue];
  const staleTrap = d.matrix[idx.stale] && d.matrix[idx.stale][idx.stale];
  const bits = [];
  if (slip != null) bits.push('<strong>' + Math.round(slip * 100) + '%</strong> of Active items slip to Overdue');
  if (staleTrap != null) bits.push('Stale is a <strong>' + Math.round(staleTrap * 100) + '%</strong> trap');
  return bits.length ? '<pw-icon name="git-branch" size="13"></pw-icon> ' + bits.join(' · ') + '.' : '';
};

PW.Analytics._chartMarkovMatrix = function (data) {
  const c = PW._anMount('anMarkovMatrix'); if (!c) return;
  const t = PW._theme, states = data.states || [], m = data.matrix || [];
  const labels = states.map(s => s.label);
  const heatData = [];
  let maxV = 0.001;
  for (let i = 0; i < states.length; i++)
    for (let j = 0; j < states.length; j++) {
      const v = (m[i] && m[i][j]) || 0;
      if (i !== j && v > maxV) maxV = v;
      heatData.push([j, i, v]);
    }
  c.setOption(PW._anBase({
    tooltip: { formatter: p => labels[p.value[1]] + ' → ' + labels[p.value[0]] + ': ' + (p.value[2] * 100).toFixed(1) + '%' },
    grid: { left: 84, right: 16, top: 8, bottom: 60, containLabel: false },
    xAxis: { type: 'category', data: labels, splitArea: { show: false },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono, rotate: 38, interval: 0 } },
    yAxis: { type: 'category', data: labels, splitArea: { show: false },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    visualMap: { min: 0, max: maxV, calculable: false, show: false,
      inRange: { color: ['#F4F1EA', '#E0B3BB', '#C77685', '#962030', '#7A1A2A'] } },
    series: [{
      type: 'heatmap', data: heatData,
      label: { show: true, formatter: p => p.value[2] >= 0.005 ? (p.value[2] * 100).toFixed(0) + (p.value[2] >= 0.1 ? '%' : '') : '',
        color: p => p.value[2] > maxV * 0.55 ? '#FAF1E6' : t.ink, fontSize: 9, fontFamily: t.mono },
      itemStyle: { borderRadius: 3, borderColor: t.surface, borderWidth: 2 },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(122,26,42,0.3)' } },
    }],
  }));
};

PW.Analytics._chartMarkovGraph = function (data) {
  const c = PW._anMount('anMarkovGraph'); if (!c) return;
  const t = PW._theme, states = data.states || [], m = data.matrix || [];
  const idx = {}; states.forEach((s, i) => { idx[s.id] = i; });
  // Fixed positions: horizontal = progress toward done; vertical = health
  // (entries left, terminals right, deterioration drops toward the bottom).
  const POS = {
    inbox: [90, 175], scheduled: [90, 385], active: [440, 280],
    overdue: [700, 400], stale: [320, 520],
    done_on_time: [925, 165], done_late: [925, 450],
  };
  const maxVisits = Math.max(1, ...states.map(s => s.visits));
  const nodes = states.map(s => {
    const i = idx[s.id];
    const dwell = (m[i] && m[i][i]) || 0;
    const size = 30 + Math.sqrt(s.visits / maxVisits) * 26;
    return {
      id: s.id, name: s.label, x: POS[s.id][0], y: POS[s.id][1],
      symbolSize: size, value: s.visits, dwell: dwell,
      itemStyle: {
        color: s.color,
        borderColor: s.absorbing ? t.gold : '#FFFFFF',
        borderWidth: s.absorbing ? 3 : 2,
        shadowBlur: 6, shadowColor: 'rgba(30,28,25,0.12)',
      },
      label: {
        show: true, position: 'inside',
        formatter: '{name|' + s.label + '}\n{dwell|' + (dwell >= 0.005 ? '↻ ' + Math.round(dwell * 100) + '%' : '') + '}',
        rich: {
          name: { fontSize: 11, fontWeight: 600, color: PW._contrastText(s.color), fontFamily: t.body, lineHeight: 13 },
          dwell: { fontSize: 9, color: PW._contrastText(s.color), opacity: 0.85, fontFamily: t.mono, lineHeight: 11 },
        },
      },
    };
  });
  // Off-diagonal edges (the actual flows); self-loops shown as the node badge.
  const links = [];
  for (let i = 0; i < states.length; i++) {
    for (let j = 0; j < states.length; j++) {
      if (i === j) continue;
      const v = (m[i] && m[i][j]) || 0;
      if (v < 0.003) continue;
      links.push({
        source: states[i].id, target: states[j].id, value: v,
        lineStyle: {
          width: 1.2 + v * 9, color: states[i].color, opacity: 0.3 + v * 1.2, curveness: 0.22,
        },
        label: { show: v >= 0.02, formatter: Math.round(v * 100) + '%',
          fontSize: 9.5, fontFamily: t.mono, color: t.ink,
          backgroundColor: t.surface, padding: [1.5, 4], borderRadius: 3, borderWidth: 0.5, borderColor: t.border },
      });
    }
  }
  c.setOption(PW._anBase({
    tooltip: { formatter: p => p.dataType === 'edge'
      ? states.find(s => s.id === p.data.source).label + ' → ' + states.find(s => s.id === p.data.target).label +
        ': ' + (p.data.value * 100).toFixed(1) + '%'
      : p.data.name + ' · ' + (p.data.dwell >= 0.005 ? 'dwell ' + Math.round(p.data.dwell * 100) + '%, ' : '') +
        p.data.value + ' item-days' },
    series: [{
      type: 'graph', layout: 'none', roam: true, draggable: true,
      focusNodeAdjacency: true,
      data: nodes, links: links,
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 9],
      emphasis: { focus: 'adjacency',
        lineStyle: { opacity: 1, width: 4 },
        label: { fontSize: 11 } },
      lineStyle: { color: '#8C877B', opacity: 0.5 },
    }],
  }));
};

// contrast text color (light on dark fills, dark on light fills)
PW._contrastText = function (hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#FFFFFF';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1E1C19' : '#FAF1E6';
};

PW.Analytics._renderMarkovFate = function (data) {
  const el = document.getElementById('anMarkovFate'); if (!el) return;
  const t = PW._theme;
  const states = (data.states || []).filter(s => !s.absorbing);
  const fate = data.fate || {};
  const rows = states.map(s => {
    const f = fate[s.id] || { done_on_time: 0, done_late: 0, open: 0, total: 0 };
    const tot = Math.max(1, f.total);
    const ot = f.done_on_time / tot * 100, lt = f.done_late / tot * 100, op = f.open / tot * 100;
    return '<div class="an-fate-row">' +
      '<div class="an-fate-label">' + PW.esc(s.label) + '</div>' +
      '<div class="an-fate-bar">' +
        '<div class="an-fate-seg an-fate-ot" style="width:' + ot + '%" title="On-time: ' + Math.round(ot) + '%"></div>' +
        '<div class="an-fate-seg an-fate-lt" style="width:' + lt + '%" title="Late: ' + Math.round(lt) + '%"></div>' +
        '<div class="an-fate-seg an-fate-op" style="width:' + op + '%" title="Still open: ' + Math.round(op) + '%"></div>' +
      '</div>' +
      '<div class="an-fate-pct" style="color:' + (ot >= 50 ? t.success : ot >= 20 ? t.warning : t.danger) + '">' +
        Math.round(ot) + '%</div></div>';
  }).join('');
  el.innerHTML = '<div class="an-fate">' + rows + '</div>' +
    '<div class="an-fate-legend"><span class="an-fate-sw an-fate-ot"></span>on-time' +
    '<span class="an-fate-sw an-fate-lt"></span>late' +
    '<span class="an-fate-sw an-fate-op"></span>still open</div>';
};

PW.Analytics._chartMarkovEvolution = function (data) {
  const c = PW._anMount('anMarkovEvo'); if (!c) return;
  const t = PW._theme, labels = data.labels || [], kts = data.key_transitions || [];
  const colors = [t.success, t.danger, t.info, t.warning];
  c.setOption(PW._anBase({
    legend: { data: kts.map(k => k.name), top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
    tooltip: { trigger: 'axis', formatter: p => {
      let s = p[0].axisValue + '<br/>';
      p.forEach(x => { s += x.marker + ' ' + x.seriesName + ': ' + x.value + '%<br/>'; });
      return s;
    } },
    grid: { left: 40, right: 20, top: 40, bottom: 28 },
    xAxis: { type: 'category', data: labels, boundaryGap: false,
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'value', name: '%', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: kts.map((k, i) => ({
      name: k.name, type: 'line', data: k.values, smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: colors[i % colors.length], width: 2 },
      itemStyle: { color: colors[i % colors.length] },
    })),
  }));
};

/* ── Charts: existing (refined) ──────────────────────────────── */
PW.Analytics._renderGauges = function (idx) {
  const t = PW._theme;
  const keys = [['productivity', false], ['backlog_pressure', true], ['fragmentation', true]];
  keys.forEach(([key, invert]) => {
    const el = document.getElementById('anGauge_' + key);
    if (!el) return;
    const v = idx[key].value, band = idx[key].band;
    const color = invert
      ? (band === 'high' ? t.danger : band === 'moderate' ? t.warning : t.success)
      : (band === 'viable' ? t.success : band === 'developing' ? t.warning : t.danger);
    const c = echarts.init(el, null, { renderer: 'canvas' });
    PW._anCharts.push(c);
    const comps = idx[key].components;
    const compRows = Object.entries(comps).map(([k2, v2]) =>
      '{name|' + PW.prettyEnum(k2) + '}{val|' + v2 + '}').join('\n');
    c.setOption(PW._anBase({
      series: [{
        type: 'gauge', startAngle: 200, endAngle: -20, radius: '78%', center: ['50%', '58%'],
        min: 0, max: 100, splitNumber: 5,
        progress: { show: true, width: 11, roundCap: true, itemStyle: { color: color } },
        axisLine: { lineStyle: { width: 11, color: [[0.4, '#E2DED4'], [0.7, '#E2DED4'], [1, '#E2DED4']] } },
        pointer: { show: false },
        axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true, offsetCenter: [0, '-2%'],
          formatter: '{value}', fontSize: 30, fontFamily: t.serif, fontWeight: 600, color: color,
        },
        data: [{ value: v }],
      }],
      graphic: [{
        type: 'text', left: 'center', top: '72%',
        style: { text: PW.prettyEnum(band), fill: color, fontSize: 10, fontFamily: t.mono,
                 textAlign: 'center', textTransform: 'uppercase' },
      }],
    }));
    // decomposed sub-components beneath the gauge (as plain HTML, not ECharts)
    const compHtml = '<div class="an-gauge-comps">' + Object.entries(comps).map(([k2, v2]) =>
      '<div class="an-gauge-comp"><span class="an-gauge-comp-k">' + PW.prettyEnum(k2) +
      '</span><span class="an-gauge-comp-v">' + v2 + '</span></div>').join('') + '</div>';
    el.parentElement.insertAdjacentHTML('beforeend', compHtml);
  });
};

PW.Analytics._chartThroughput = function (data) {
  const c = PW._anMount('anThroughput'); if (!c) return;
  const t = PW._theme, days = data.days || [];
  c.setOption(PW._anBase({
    legend: { data: ['Created', 'Completed', '7-day velocity'], top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    grid: { left: 40, right: 20, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: days.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono, interval: Math.floor(days.length / 8) },
      axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [
      { name: 'Created', type: 'bar', data: days.map(d => d.created),
        itemStyle: { color: t.surface2, borderRadius: [2, 2, 0, 0] } },
      { name: 'Completed', type: 'bar', data: days.map(d => d.completed),
        itemStyle: { color: t.oxford, borderRadius: [2, 2, 0, 0] } },
      { name: '7-day velocity', type: 'line', data: days.map(d => d.velocity),
        smooth: true, symbol: 'none', lineStyle: { color: t.gold, width: 2 },
        areaStyle: { color: 'rgba(168,133,74,0.10)' } },
    ],
  }));
};
PW.Analytics._chartTrajectory = function (data) {
  const c = PW._anMount('anTrajectory'); if (!c) return;
  const t = PW._theme, s = data.series || [];
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: s.map(d => d.date.slice(5)), boundaryGap: false,
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono, interval: Math.floor(s.length / 6) } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [{ type: 'line', data: s.map(d => d.cumulative), smooth: true, symbol: 'none',
      lineStyle: { color: t.info, width: 2 },
      areaStyle: { color: 'rgba(63,96,146,0.12)' } }],
  }));
};
PW.Analytics._chartFunnel = function (data) {
  const c = PW._anMount('anFunnel'); if (!c) return;
  const t = PW._theme, stages = data.stages || [];
  c.setOption(PW._anBase({
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{ type: 'funnel', left: '8%', right: '8%', top: 8, bottom: 8,
      minSize: '24%', gap: 2,
      label: { color: t.ink, fontSize: 11, fontFamily: t.body, formatter: '{b}  {c}' },
      itemStyle: { borderColor: t.surface, borderWidth: 1 },
      data: stages.map((s, i) => ({ value: s.value, name: s.name,
        itemStyle: { color: [t.oxford, t.info, t.gold, t.success][i] || t.surface2 } })) }],
  }));
};
PW.Analytics._chartRhythm = function (data) {
  const c = PW._anMount('anRhythm'); if (!c) return;
  const t = PW._theme, wd = data.weekdays || [];
  c.setOption(PW._anBase({
    legend: { data: ['Avg completed', 'Due'], top: 0, right: 4,
      textStyle: { color: t.muted, fontSize: 10 }, itemWidth: 10, itemHeight: 8 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: wd.map(w => w.name), axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    yAxis: [{ type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } }],
    series: [
      { name: 'Avg completed', type: 'bar', data: wd.map(w => w.avg_completed),
        itemStyle: { color: t.oxford, borderRadius: [3, 3, 0, 0] }, barWidth: '38%' },
    ],
  }));
};
PW.Analytics._chartHourly = function (data) {
  const c = PW._anMount('anHourly'); if (!c) return;
  const t = PW._theme, m = data.matrix || [];
  const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = []; for (let h = 0; h < 24; h++) hours.push(h);
  const heatData = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++)
    heatData.push([h, d, m[d][h]]);
  const maxV = data.max || 1;
  c.setOption(PW._anBase({
    tooltip: { formatter: p => dows[p.value[1]] + ' ' + PW._fmtHr(p.value[0]) + ': ' + p.value[2] + ' completed' },
    grid: { left: 40, right: 12, top: 8, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: hours.map(PW._fmtHr), splitArea: { show: false },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: t.faint, fontSize: 9, fontFamily: t.mono, interval: 2 } },
    yAxis: { type: 'category', data: dows, splitArea: { show: false },
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    visualMap: { min: 0, max: maxV, calculable: false, orient: 'horizontal',
      left: 'center', bottom: 0, show: false,
      inRange: { color: ['#F4F1EA', '#E0B3BB', '#C77685', '#962030', '#7A1A2A'] } },
    series: [{ type: 'heatmap', data: heatData,
      label: { show: false },
      itemStyle: { borderRadius: 2, borderColor: t.surface, borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(122,26,42,0.3)' } } }],
  }));
};
PW._fmtHr = function (h) {
  if (h === 0) return '12a'; if (h < 12) return h + 'a';
  if (h === 12) return '12p'; return (h - 12) + 'p';
};
PW.Analytics._chartMonthly = function (data) {
  const c = PW._anMount('anMonthly'); if (!c) return;
  const t = PW._theme, ms = data.months || [];
  c.setOption(PW._anBase({
    legend: { data: ['Created', 'Completed'], top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ms.map(m => m.label + ' ' + String(m.year).slice(2)),
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [
      { name: 'Created', type: 'bar', data: ms.map(m => m.created),
        itemStyle: { color: t.surface2, borderRadius: [2, 2, 0, 0] } },
      { name: 'Completed', type: 'bar', data: ms.map(m => m.completed),
        itemStyle: { color: t.oxford, borderRadius: [2, 2, 0, 0] },
        label: { show: true, position: 'top', color: t.muted, fontSize: 9, fontFamily: t.mono,
          formatter: p => {
            const m = ms[p.dataIndex]; const tr = m.trajectory;
            if (!tr) return ''; const icon = tr === 'improving' ? '↗' : (tr === 'declining' ? '↘' : '→');
            const col = tr === 'improving' ? t.success : (tr === 'declining' ? t.danger : t.faint);
            return '{val|' + icon + '}';
          }, rich: { val: { color: t.faint, fontSize: 11 } } } },
    ],
  }));
};
PW.Analytics._chartCycletime = function (data) {
  const c = PW._anMount('anCycletime'); if (!c) return;
  const t = PW._theme, ps = data.by_priority || [];
  c.setOption(PW._anBase({
    legend: { data: ['p50', 'p90'], top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 10 }, itemWidth: 10, itemHeight: 8 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ps.map(p => p.label.replace('P', '')),
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'value', name: 'days', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [
      { name: 'p50', type: 'bar', data: ps.map(p => p.p50), itemStyle: { color: t.gold, borderRadius: [3, 3, 0, 0] }, barWidth: '30%' },
      { name: 'p90', type: 'bar', data: ps.map(p => p.p90), itemStyle: { color: t.surface2, borderRadius: [3, 3, 0, 0] }, barWidth: '30%' },
    ],
  }));
};
PW.Analytics._chartPriorityDebt = function (data) {
  const c = PW._anMount('anPriorityDebt'); if (!c) return;
  const t = PW._theme, s = data.series || [];
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: s.map(d => d.date.slice(5)), boundaryGap: false,
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono, interval: Math.floor(s.length / 6) } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [{ type: 'line', data: s.map(d => d.open_high_priority), smooth: true, symbol: 'none',
      lineStyle: { color: t.danger, width: 2 }, areaStyle: { color: 'rgba(163,52,52,0.12)' } }],
  }));
};
PW.Analytics._chartOverdue = function (data) {
  const c = PW._anMount('anOverdue'); if (!c) return;
  const t = PW._theme, order = ['0-7d', '7-30d', '30-90d', '90+d'], b = data.overdue_buckets || {};
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 12, bottom: 28 },
    xAxis: { type: 'category', data: order, axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [{ type: 'bar', data: order.map(k => b[k] || 0), barWidth: '52%',
      itemStyle: { color: t.danger, borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: t.muted, fontSize: 10, fontFamily: t.mono } }],
  }));
};
PW.Analytics._chartAging = function (data) {
  const c = PW._anMount('anAging'); if (!c) return;
  const t = PW._theme, order = ['0-7d', '7-30d', '30-90d', '90-180d', '180+d'], b = data.buckets || {};
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 12, bottom: 28 },
    xAxis: { type: 'category', data: order, axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    series: [{ type: 'bar', data: order.map((k, i) => ({ value: b[k] || 0, itemStyle: { color: PW._anPalette[i] } })),
      barWidth: '52%', itemStyle: { borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: t.muted, fontSize: 10, fontFamily: t.mono } }],
  }));
};
PW.Analytics._chartProjIntel = function (data) {
  const c = PW._anMount('anProjIntel'); if (!c) return;
  const t = PW._theme, ps = (data.projects || []).slice(0, 8);
  const verdictColor = { heating: t.success, cooling: t.warning, steady: t.info, dormant: t.faint };
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Recent', 'Baseline'], top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 10 }, itemWidth: 10, itemHeight: 8 },
    grid: { left: 8, right: 30, top: 32, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'category', data: ps.map(p => (p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name)).reverse(),
      axisLine: { lineStyle: { color: t.border } }, axisLabel: { color: t.ink, fontSize: 10 } },
    series: [
      { name: 'Recent', type: 'bar', data: ps.slice().reverse().map(p => p.recent_completed),
        itemStyle: { color: t.oxford }, barWidth: '32%' },
      { name: 'Baseline', type: 'bar', data: ps.slice().reverse().map(p => p.baseline_completed),
        itemStyle: { color: t.surface2 }, barWidth: '32%' },
    ],
  }));
};
PW.Analytics._chartLabels = function (data) {
  const c = PW._anMount('anLabels'); if (!c) return;
  const t = PW._theme, labs = data.labels || [];
  c.setOption(PW._anBase({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
      axisLabel: { color: t.faint, fontSize: 10, fontFamily: t.mono } },
    yAxis: { type: 'category', data: labs.map(l => l.label).reverse(),
      axisLine: { lineStyle: { color: t.border } },
      axisLabel: { color: t.ink, fontSize: 10, fontFamily: t.mono } },
    series: [{ type: 'bar', data: labs.map(l => ({ value: l.count, itemStyle: { color: l.color_hex } })).reverse(),
      barWidth: '54%', itemStyle: { borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: t.muted, fontSize: 10, fontFamily: t.mono } }],
  }));
};
PW.Analytics._chartRadar = function (data) {
  const c = PW._anMount('anRadar'); if (!c) return;
  const t = PW._theme, dims = data.dimensions || [];
  c.setOption(PW._anBase({
    legend: { data: ['This period', 'Previous'], top: 0, right: 8,
      textStyle: { color: t.muted, fontSize: 10 }, itemWidth: 10, itemHeight: 8 },
    radar: { indicator: dims.map(d => ({ name: d, max: 100 })),
      radius: '62%', center: ['50%', '56%'],
      axisName: { color: t.ink, fontSize: 10, fontFamily: t.body },
      splitLine: { lineStyle: { color: t.border } },
      splitArea: { areaStyle: { color: [t.surface, t.surface2] } },
      axisLine: { lineStyle: { color: t.border } } },
    series: [{ type: 'radar', data: [
      { value: dims.map(d => data.current[d] || 0), name: 'This period',
        areaStyle: { color: 'rgba(122,26,42,0.18)' }, lineStyle: { color: t.oxford, width: 2 },
        itemStyle: { color: t.oxford } },
      { value: dims.map(d => data.previous[d] || 0), name: 'Previous',
        areaStyle: { color: 'rgba(168,133,74,0.10)' }, lineStyle: { color: t.gold, width: 1.5, type: 'dashed' },
        itemStyle: { color: t.gold } },
    ] }],
  }));
};

/* ── Habits: streak calendar + habit rings ───────────────────── */
PW.Analytics._renderHabits = function (data) {
  const el = document.getElementById('anHabits'); if (!el) return;
  const t = PW._theme;
  const days = data.days || [];
  const maxC = Math.max(1, ...days.map(d => d.count));
  let cal = '<div class="an-habit-cal">';
  days.forEach(d => {
    const v = d.count;
    const lv = v === 0 ? 0 : Math.min(4, Math.ceil(v / maxC * 4));
    const fill = ['#EEEAE0', '#E0B3BB', '#C77685', '#A04050', '#7A1A2A'][lv];
    cal += '<span class="an-habit-cell" style="background:' + fill + '" title="' + d.date + ': ' + v + '"></span>';
  });
  cal += '</div>';
  let rings = '<div class="an-habit-rings">';
  (data.habits || []).slice(0, 5).forEach(h => {
    const pct = Math.min(100, h.consistency);
    const col = pct >= 80 ? t.success : (pct >= 50 ? t.gold : t.danger);
    const short = (h.content || '').replace(/^(Implement|Draft|Review|Reply to|Refactor|Fix|Outline|Read|Weekly review|Plan|Annotate|Clean up|Backup|Schedule|Pay|Deploy|Sketch|Pair|Audit|Index)\s*/i, '').slice(0, 26);
    rings += '<div class="an-habit-row"><div class="an-habit-ring" style="--p:' + pct + ';--c:' + col + '">' +
             '<span>' + Math.round(pct) + '%</span></div>' +
             '<div class="an-habit-meta"><div class="an-habit-name">' + PW.esc(short || h.content) + '</div>' +
             '<div class="an-habit-sub">' + h.completed_in_window + ' / ~' + h.expected + ' done</div></div></div>';
  });
  rings += '</div>';
  el.innerHTML = cal + rings;
};

/* ── Activity stream ─────────────────────────────────────────── */
PW.Analytics._renderActivity = function (data) {
  const el = document.getElementById('anActivity'); if (!el) return;
  const t = PW._theme;
  const groups = (data.groups || []).slice(0, 6);
  const prioHex = { 1: '#962030', 2: '#B4742A', 3: '#A8854A', 4: '#8C877B' };
  el.innerHTML = '<div class="an-activity">' + groups.map(g => {
    const d = new Date(g.date + 'T00:00:00Z');
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const net = g.completed - g.created;
    const netTxt = net >= 0 ? '<span class="an-act-net up">+' + net + '</span>' : '<span class="an-act-net down">' + net + '</span>';
    return '<div class="an-act-day"><div class="an-act-day-head">' +
      '<span class="an-act-date">' + label + '</span>' +
      '<span class="an-act-stats">' + g.completed + ' done · ' + g.created + ' new ' + netTxt +
      (g.sessions > 1 ? ' · ' + g.sessions + ' sessions' : '') + '</span></div>' +
      '<div class="an-act-events">' + g.events.slice(0, 7).map(e => {
        const isDone = e.kind === 'completed';
        const col = isDone ? t.success : t.info;
        const pcol = prioHex[e.priority] || t.faint;
        return '<div class="an-act-ev"><span class="an-act-dot" style="background:' + col + '"></span>' +
          '<span class="an-act-time">' + (e.ts || '').slice(11, 16) + '</span>' +
          '<span class="an-act-prio" style="color:' + pcol + '">P' + (e.priority || 4) + '</span>' +
          '<span class="an-act-content">' + PW.esc((e.content || '').slice(0, 48)) + '</span></div>';
      }).join('') + '</div></div>';
  }).join('') + '</div>';
};

/* ── Year heatmap (GitHub-style, SVG) ─────────────────────────── */
PW.Analytics._renderHeatmap = function (data) {
  const el = document.getElementById('anHeatmap'); if (!el) return;
  const counts = {}; (data.cells || []).forEach(c => { counts[c.date] = c.count; });
  const year = data.year || new Date().getFullYear();
  const Jan1 = new Date(Date.UTC(year, 0, 1));
  const Dec31 = new Date(Date.UTC(year, 11, 31));
  const startPad = (Jan1.getUTCDay() + 6) % 7;
  const cols = []; let col = new Array(startPad).fill(null);
  const fmt = d => d.toISOString().slice(0, 10);
  const cur = new Date(Jan1);
  while (cur <= Dec31) {
    col.push({ date: fmt(cur), count: counts[fmt(cur)] || 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (col.length === 7) { cols.push(col); col = []; }
  }
  if (col.length) cols.push(col);
  const cell = 11, gap = 3;
  const lvColor = ['#EEEAE0', '#F4E8EA', '#E0B3BB', '#C77685', '#A04050', '#7A1A2A'];
  const lv = v => v <= 0 ? 0 : v <= 2 ? 1 : v <= 5 ? 2 : v <= 8 ? 3 : v <= 12 ? 4 : 5;
  const w = cols.length * (cell + gap) + 14;
  const h = 7 * (cell + gap) + 18;
  let svg = '<svg class="an-heatmap-svg" viewBox="0 0 ' + w + ' ' + h +
    '" width="100%" preserveAspectRatio="xMinYMid meet" role="img" aria-label="completion heatmap">';
  const dow = ['M', '', 'W', '', 'F', '', ''];
  for (let di = 0; di < 7; di++) if (dow[di])
    svg += '<text x="0" y="' + (di * (cell + gap) + cell - 1) + '" class="an-hm-axis">' + dow[di] + '</text>';
  cols.forEach((cl, ci) => cl.forEach((cellData, ri) => {
    if (cellData === null) return;
    const x = 14 + ci * (cell + gap), y = ri * (cell + gap), v = cellData.count;
    svg += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell +
      '" rx="2" ry="2" fill="' + lvColor[lv(v)] + '" class="an-hm-cell"><title>' +
      cellData.date + ': ' + v + ' completed</title></rect>';
  }));
  svg += '</svg><div class="an-hm-legend"><span class="an-hm-axis">Less</span>';
  lvColor.forEach(c => svg += '<span class="an-hm-sw" style="background:' + c + '"></span>');
  svg += '<span class="an-hm-axis">More</span></div>';
  el.innerHTML = svg;
};

PW.Analytics._resize = function () {
  PW._anCharts.forEach(c => { try { c.resize(); } catch (e) {} });
};

/* Eval table (global helper, kept for the table section) */
function An_EvalTable(summary, throughput, reliability, indices) {
  const k = summary.kpi;
  const rows = [
    ['Execution Throughput — Completion Rate', k.completion_rate + '%', 'on-target'],
    ['Execution Throughput — Throughput Stability', 'σ² ' + throughput.throughput_stability_variance,
     throughput.throughput_stability_variance < 15 ? 'steady' : 'variable'],
    ['Commitment Reliability — Deadline Adherence', reliability.deadline_adherence + '%',
     reliability.deadline_adherence >= 80 ? 'on-target' : 'at-risk'],
    ['Commitment Reliability — Slippage Detection', k.overdue + ' overdue', k.overdue > 50 ? 'at-risk' : 'watch'],
    ['Viability Contribution — Operating Stability', indices.productivity.value + ' Productivity Index',
     indices.productivity.band === 'viable' ? 'on-target' : 'developing'],
    ['Coordination Coherence — Focus', indices.fragmentation.value + ' Fragmentation',
     indices.fragmentation.band === 'low' ? 'on-target' : 'watch'],
    ['Capacity Adherence — Overload Frequency', '—', 'awaiting PKTS feed'],
  ];
  const tone = s => s === 'on-target' ? PW._theme.success
    : s === 'at-risk' ? PW._theme.danger
    : s === 'awaiting PKTS feed' ? PW._theme.faint : PW._theme.warning;
  return '<table class="an-eval-table"><tbody>' +
    rows.map(r => '<tr><td class="an-eval-crit">' + PW.esc(r[0]) + '</td>' +
      '<td class="an-eval-val">' + PW.esc(r[1]) + '</td>' +
      '<td class="an-eval-state" style="color:' + tone(r[2]) + '">' + PW.prettyEnum(r[2]) + '</td></tr>').join('') +
    '</tbody></table>';
}
