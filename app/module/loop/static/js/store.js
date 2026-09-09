/* ════════════════════════════════════════════════════════════
   LOOP Store — intention↔reality gap computations.
   The organizing principle: every panel pairs an intention (the
   set-point the agent declared — a commitment, a goal target, an
   estimate, a resource floor, an intended outcome) against the
   measured reality, and surfaces the gap the agent must reconcile.
   Closing those gaps over time is how the agent stays coherent.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.Store = (() => {
  const KEY = 'loop_dataset';
  let ds = {};
  let windowDays = 30;

  async function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) { try { ds = JSON.parse(stored); } catch {} }
    if (!ds || !ds.records) {
      try { const r = await fetch('api/dataset'); if (r.ok) { ds = await r.json(); saveLocal(); } } catch {}
    }
    if (!ds || !ds.records) {
      try { const r = await fetch('data/mock_loop.json'); if (r.ok) { ds = await r.json(); saveLocal(); } } catch (e) { console.warn('dataset unavailable', e); }
    }
    return ds;
  }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(ds)); } catch {} }
  const getDataset = () => ds;
  const setWindow = (d) => { windowDays = d; };
  const getWindow = () => windowDays;

  const S = {
    mean: a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0,
    median: a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; },
    clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)),
    round: (x, d = 2) => +(x).toFixed(d),
  };
  const T = ts => ts ? Date.parse(ts.replace('Z', '')) : 0;
  const DAY = 86400000;

  function endMs() {
    let mx = 0;
    (ds.environment_events || []).forEach(e => { const t = T(e.occurred_at); if (t > mx) mx = t; });
    (ds.events || []).forEach(e => { const t = T(e.occurred_at); if (t > mx) mx = t; });
    if (!mx && ds.essential_variables) ds.essential_variables.forEach(d => { const t = Date.parse(d.date); if (t > mx) mx = t; });
    return mx || Date.now();
  }
  function bounds() {
    const end = endMs();
    const start = windowDays >= 9999 ? 0 : end - windowDays * DAY;
    return { start, end };
  }
  const inWin = ts => { const b = bounds(); const t = T(ts); return t >= b.start && t <= b.end; };

  const fRecords = () => (ds.records || []).filter(r => inWin(r.created_at));
  const fActions = () => (ds.actions || []).filter(a => inWin(a.registered_at));
  const fSessions = () => (ds.sessions || []).filter(s => inWin(s.ended_at));
  const fDelibs = () => (ds.deliberations || []).filter(d => inWin(d.date));
  const fEssential = () => (ds.essential_variables || []).filter(e => inWin(e.date + 'T12:00:00Z'));
  const now = () => bounds().end;

  function dailyBuckets() {
    const { start, end } = bounds();
    const days = windowDays >= 9999 ? (ds.window?.days || Math.ceil((end - start) / DAY)) : windowDays;
    const realStart = end - days * DAY;
    const keys = [];
    for (let i = 0; i < days; i++) keys.push(new Date(realStart + i * DAY).toISOString().slice(0, 10));
    return { days, realStart, keys };
  }

  // ═══════════════════════════════════════════════════════════
  // GAP: Commitments — the word. deadline/status (intention) vs kept (reality)
  // ═══════════════════════════════════════════════════════════
  function commitmentsGap() {
    const recs = fRecords();
    const comms = recs.filter(r => r.record_type === 'Commitment');
    const N = now();
    const withDue = comms.filter(r => r.deadline);
    const kept = comms.filter(r => r.status === 'Completed');
    const overdue = withDue.filter(r => T(r.deadline) < N && r.status !== 'Completed' && r.status !== 'Archived');
    const open = comms.filter(r => r.status === 'Active' || r.status === 'Pending');
    // each commitment as an intention↔reality row
    const rows = comms.map(r => {
      const due = r.deadline ? T(r.deadline) : null;
      const isKept = r.status === 'Completed';
      const isOver = due && due < N && !isKept && r.status !== 'Archived';
      const gap = isOver ? Math.min(999, Math.round((N - due) / DAY)) : 0; // days overdue = the gap
      return { id: r.id, content: r.content, domain: r.domain, priority: r.priority, status: r.status, deadline: r.deadline, kept: isKept, overdue: !!isOver, gapDays: gap };
    }).sort((a, b) => b.gapDays - a.gapDays);
    // reliability trajectory: cumulative kept vs broken, bucketed by completion/deadline month
    const reliability = withDue.length ? S.round(kept.length / withDue.length, 2) : 0;
    return { total: comms.length, open: open.length, kept: kept.length, overdue: overdue.length, reliability, rows };
  }

  // ═══════════════════════════════════════════════════════════
  // GAP: Goals — target (intention) vs progress (reality)
  // ═══════════════════════════════════════════════════════════
  function goalsGap() {
    const goals = fRecords().filter(r => r.record_type === 'Goal' && r.target_pct != null);
    const rows = goals.map(g => {
      const target = g.target_pct;
      const progress = g.progress_pct;
      return { id: g.id, content: g.content, domain: g.domain, target, progress, gap: target - progress, momentum: g.momentum, status: g.status };
    }).sort((a, b) => b.gap - a.gap);
    const avgGap = rows.length ? S.round(S.mean(rows.map(r => r.gap)), 0) : 0;
    const advancing = rows.filter(r => r.momentum === 'advancing').length;
    const stalled = rows.filter(r => r.momentum === 'stalled').length;
    const regressing = rows.filter(r => r.momentum === 'regressing').length;
    return { total: rows.length, avgGap, advancing, stalled, regressing, rows };
  }

  // ═══════════════════════════════════════════════════════════
  // GAP: Plan vs Actual — estimate (intention) vs spent effort (reality)
  // ═══════════════════════════════════════════════════════════
  function planGap() {
    const acts = fActions();
    const sess = fSessions();
    const byAction = {};
    sess.forEach(s => { (byAction[s.action_id] = byAction[s.action_id] || []).push(s); });
    const rows = acts.map(a => {
      const ss = byAction[a.id] || [];
      const actual = S.round(ss.reduce((s, x) => s + x.duration_min, 0) / 60, 1);
      const est = a.effort_estimate_h;
      const ratio = est ? actual / est : 0;
      const overrun = ratio > 1.15;
      return { id: a.id, project: a.project, domain: a.domain, est, actual, ratio: S.round(ratio, 2), gap: S.round(actual - est, 1), overrun, status: a.status, n: ss.length };
    }).filter(r => r.n > 0).sort((a, b) => b.ratio - a.ratio);
    const overruns = rows.filter(r => r.overrun).length;
    const accuracy = rows.length ? S.round(S.mean(rows.map(r => r.ratio)), 2) : 0; // 1.0 = perfectly calibrated
    const totalEst = S.round(rows.reduce((s, r) => s + r.est, 0), 1);
    const totalActual = S.round(rows.reduce((s, r) => s + r.actual, 0), 1);
    return { total: rows.length, overruns, accuracy, totalEst, totalActual, planGap: S.round(totalActual - totalEst, 1), rows };
  }

  // ═══════════════════════════════════════════════════════════
  // GAP: Resources — floor/band (intention) vs actual level (reality)
  // ═══════════════════════════════════════════════════════════
  function resourcesGap() {
    const ess = fEssential();
    if (!ess.length) return { days: 0, vars: [], series: [] };
    const vars = [
      { key: 'energy', label: 'Energy', floor: ess[0].energy_floor ?? 40, vals: ess.map(d => d.energy) },
      { key: 'attention', label: 'Attention', floor: ess[0].attention_floor ?? 40, vals: ess.map(d => d.attention) },
      { key: 'focus_pct', label: 'Focus', floor: ess[0].focus_floor ?? 30, vals: ess.map(d => d.focus_pct) },
      { key: 'sleep_h', label: 'Sleep', floor: ess[0].sleep_floor ?? 6.5, vals: ess.map(d => d.sleep_h), unit: 'h' },
    ];
    const summary = vars.map(v => {
      const breaches = v.vals.filter(x => x < v.floor).length;
      const mean = S.round(S.mean(v.vals), v.unit === 'h' ? 1 : 0);
      const below = S.round(S.clamp(v.floor - mean, 0, 99), v.unit === 'h' ? 1 : 0);
      return { key: v.key, label: v.label, floor: v.floor, mean, breaches, breachPct: S.round(breaches / v.vals.length, 2), below, unit: v.unit || '' };
    });
    // overload: time used vs capacity
    const overload = ess.filter(d => d.time_used_h > d.time_capacity_h).length;
    const series = ess.map(d => ({ date: d.date.slice(5), energy: d.energy, attention: d.attention, focus: d.focus_pct, sleep: d.sleep_h, used: d.time_used_h, cap: d.time_capacity_h }));
    return { days: ess.length, vars: summary, overloadDays: overload, overloadPct: S.round(overload / ess.length, 2), series };
  }

  // ═══════════════════════════════════════════════════════════
  // GAP: Deviation — intended outcome vs observed outcome
  // ═══════════════════════════════════════════════════════════
  function deviationGap() {
    const dels = fDelibs();
    const devs = dels.filter(d => d.type === 'deviation');
    const open = devs.filter(d => d.status === 'open');
    const concluded = devs.filter(d => d.status === 'concluded');
    const enacted = devs.filter(d => d.status === 'enacted');
    const rows = [...devs].sort((a, b) => T(b.date) - T(a.date)).slice(0, 30).map(d => ({
      id: d.id, title: d.title, domain: d.domain, status: d.status, date: d.date,
      observation: d.observation, adaptation: d.adaptation,
    }));
    // closure over time: cumulative enacted vs opened
    const { keys } = dailyBuckets(); const idx = {}; keys.forEach((k, i) => { idx[k] = i; });
    const opened = keys.map(() => 0), closed = keys.map(() => 0);
    devs.forEach(d => { const k = new Date(T(d.date)).toISOString().slice(0, 10); if (k in idx) { opened[idx[k]]++; if (d.status === 'enacted') closed[idx[k]]++; } });
    let runO = 0, runC = 0;
    const trajectory = keys.map((k, i) => { runO += opened[i]; runC += closed[i]; return { x: k.slice(5), open: runO, closed: runC }; });
    return { total: devs.length, open: open.length, concluded: concluded.length, enacted: enacted.length, closureRate: devs.length ? S.round(enacted.length / devs.length, 2) : 0, rows, trajectory };
  }

  // ═══════════════════════════════════════════════════════════
  // THE GAP (hero) — rank every intention domain by its gap
  // ═══════════════════════════════════════════════════════════
  function gapOverview() {
    const com = commitmentsGap();
    const goals = goalsGap();
    const plan = planGap();
    const res = resourcesGap();
    const dev = deviationGap();
    // normalized 0..100 gap severity per domain (higher = worse)
    const commitGap = com.total ? S.round((com.overdue / com.total) * 100) : 0;
    const goalGap = goals.avgGap; // 0..100 (target-progress)
    const planGapSev = plan.total ? S.clamp(S.round((plan.overruns / plan.total) * 100), 0, 100) : 0;
    const resourceGap = res.vars.length ? S.round(S.mean(res.vars.map(v => v.breachPct)) * 100) : 0;
    const deviationGapSev = dev.total ? S.round((dev.open / dev.total) * 100) : 0;
    const domains = [
      { id: 'commitments', label: 'Commitments · the word', icon: 'flag', gap: commitGap, detail: `${com.overdue} of ${com.total} overdue · reliability ${Math.round(com.reliability * 100)}%`, view: 'commitments' },
      { id: 'goals', label: 'Goals · direction', icon: 'target', gap: goalGap, detail: `avg ${goals.avgGap} pts short · ${goals.stalled + goals.regressing} stalled/regressing`, view: 'goals' },
      { id: 'plan', label: 'Plan vs Actual · effort', icon: 'git-branch', gap: planGapSev, detail: `${plan.overruns} of ${plan.total} overruns · accuracy ${plan.accuracy}×`, view: 'plan' },
      { id: 'resources', label: 'Resources · sustain', icon: 'activity', gap: resourceGap, detail: `${res.overloadDays} overload days · ${res.vars.filter(v => v.breaches > 0).length} reserves breaching floor`, view: 'resources' },
      { id: 'deviation', label: 'Deviation · outcomes', icon: 'alert-triangle', gap: deviationGapSev, detail: `${dev.open} open · closure ${Math.round(dev.closureRate * 100)}%`, view: 'deviation' },
    ].sort((a, b) => b.gap - a.gap);
    // aggregate coherence reading (inverse of mean gap)
    const meanGap = S.round(S.mean(domains.map(d => d.gap)));
    const coherence = S.round(S.clamp(100 - meanGap, 0, 100));
    const metIntentions = (com.total - com.overdue) + (goals.total - goals.rows.filter(r => r.gap > 30).length);
    const totalIntentions = com.total + goals.total;
    return { domains, meanGap, coherence, metIntentions, totalIntentions,
      commitGap, goalGap, planGapSev, resourceGap, deviationGapSev };
  }

  function summary() {
    const g = gapOverview();
    return { counts: { goals: goalsGap().total, commitments: commitmentsGap().total, deviations: deviationGap().total } };
  }

  return {
    load, getDataset, setWindow, getWindow, bounds, now,
    commitmentsGap, goalsGap, planGap, resourcesGap, deviationGap, gapOverview, summary,
    fRecords, fActions, fSessions, fDelibs, fEssential, dailyBuckets,
  };
})();
