/* ════════════════════════════════════════════════════════════
   WOS Self Monitoring — "What is the system working on right
   now?" Observability of ongoing computations, especially the
   tasks delegated to CTES. Data: /api/self/tasks (fixture until
   the CTES integration contract exists — see spec/ctes/).
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.SelfMonitoring = (() => {
  const v = WOS.view;
  const STATE_COLOR = {
    Created: '#C9C4B8', Submitted: '#8C877B', Pending: '#B4742A',
    Dispatched: '#A8854A', Running: '#3F6E50', Completed: '#3F6092',
    Failed: '#A33434', Cancelled: '#8C877B',
  };
  const filter = { state: 'all' };
  let data = null, selectedId = null;

  const fmtRel = (ms) => {
    if (!ms) return '—';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  };
  const fmtDur = (ms) => {
    if (ms == null) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  };
  const hhmmss = (ms) => ms ? new Date(ms).toTimeString().slice(0, 8) : '';

  function render(){
    return `
      ${v.header('Self Monitoring')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>What is the system working on right now?</strong> Observability of the ongoing computations — the tasks WOS delegates to the Computation Task Execution System, from submission to result. Fixture data until the CTES integration contract exists.</p>
      <div class="stat-row animate-in" id="smStats"></div>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">delegated tasks</span><h3>Task lifecycle</h3></div>
            <select class="src-select" id="smStateSel" aria-label="Filter by state">
              <option value="all">All states</option>
              ${Object.keys(STATE_COLOR).map(s=>`<option value="${s}">${s}</option>`).join('')}
            </select></div>
          <div id="smTable" style="min-height:200px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">task detail</span><h3 id="smDetailTitle">—</h3></div></div>
          <div id="smDetail" style="min-height:200px"><div class="empty-state">select a task</div></div>
        </div>
      </div>
      <div class="chart-card animate-in">
        <div class="chart-head"><div><span class="eyebrow">journal</span><h3>Recent execution events</h3></div></div>
        <div id="smJournal" style="min-height:100px"></div>
      </div>`;
  }

  function statePill(state){
    const c = STATE_COLOR[state] || '#8C877B';
    return `<span class="src-health"><span class="src-dot" style="background:${c}"></span>${WOS.esc(state)}</span>`;
  }

  function drawStats(){
    const t = (data && data.summary) || {};
    document.getElementById('smStats').innerHTML =
      v.statCard(t.total ?? '—', 'tasks in flight') +
      v.statCard(t.running ?? '—', 'running now', 'var(--color-accent)') +
      v.statCard((t.pending ?? 0) + (t.dispatched ?? 0), 'queued (pending+dispatched)') +
      v.statCard(t.completed ?? '—', 'completed') +
      v.statCard(t.failed ?? '—', 'failed');
  }

  function tasksForView(){
    let rows = (data && data.tasks) || [];
    if (filter.state !== 'all') rows = rows.filter(t => t.state === filter.state);
    return rows;
  }

  function drawTable(){
    const host = document.getElementById('smTable');
    const rows = tasksForView();
    if (!rows.length){ host.innerHTML = '<div class="empty-state">no tasks in this state</div>'; return; }
    host.innerHTML = `<table class="src-table">
      <thead><tr><th>Task</th><th>State</th><th>Priority</th><th>Submitted</th><th>Duration</th><th>Retries</th></tr></thead>
      <tbody>${rows.map(t=>`<tr data-id="${WOS.esc(t.id)}" role="button" tabindex="0" style="cursor:pointer${t.id===selectedId?';background:rgba(122,26,42,.05)':''}">
        <td><div class="src-src-names"><div class="src-name">${WOS.esc(t.objective)}</div>
          <div class="src-id">${WOS.esc(t.id)} · ${WOS.esc(t.operation)}</div></div></td>
        <td>${statePill(t.state)}</td>
        <td class="src-ago">${WOS.esc(t.priority)}</td>
        <td class="src-ago">${fmtRel(t.submitted_at_ms)}</td>
        <td class="src-num">${fmtDur(t.duration_ms)}</td>
        <td class="src-num ${t.retries ? 'src-up' : ''}">${t.retries || 0}</td>
      </tr>`).join('')}</tbody></table>`;
    host.querySelectorAll('tr[data-id]').forEach(tr=>tr.addEventListener('click', ()=>{
      selectedId = tr.dataset.id; drawTable(); drawDetail();
    }));
  }

  function drawDetail(){
    const host = document.getElementById('smDetail');
    const title = document.getElementById('smDetailTitle');
    const t = ((data && data.tasks) || []).find(x=>x.id === selectedId) ||
              tasksForView()[0] || null;
    if (!t){ host.innerHTML = '<div class="empty-state">select a task</div>'; title.textContent = '—'; return; }
    selectedId = t.id;
    title.textContent = t.id;
    const row = (k, val) => val ? `<div class="ov-link-row"><span class="ov-link-name">${k}</span><span class="ov-topic-pct" style="text-align:right">${val}</span></div>` : '';
    host.innerHTML = `
      <p class="text-sm" style="margin-bottom:var(--space-3)">${WOS.esc(t.objective)}</p>
      ${statePill(t.state)}
      <div style="margin-top:var(--space-3)">
        ${row('operation', WOS.esc(t.operation))}
        ${row('input', WOS.esc(t.input))}
        ${row('expected', WOS.esc(t.expected_output))}
        ${row('deadline', t.constraints && t.constraints.deadline_s ? fmtDur(t.constraints.deadline_s*1000) : '')}
        ${row('dependencies', t.dependencies && t.dependencies.length ? t.dependencies.map(WOS.esc).join(', ') : '')}
        ${row('target', WOS.esc(t.target))}
        ${t.result ? row('result', WOS.esc(t.result)) : ''}
        ${t.error ? row('error', `<span style="color:#A33434">${WOS.esc(t.error)}</span>`) : ''}
      </div>
      <div class="section" style="margin-top:var(--space-4)">
        <div class="eyebrow" style="margin-bottom:var(--space-2)">journal</div>
        ${(t.events||[]).slice().reverse().map(e=>`<div class="ov-feed-item">
          <span class="src-feed-dot" style="background:${STATE_COLOR[e.state]||'#8C877B'}"></span>
          <span class="src-feed-t">${hhmmss(e.ts_ms)}</span>
          <span class="ov-feed-x">${WOS.esc(e.state)} — ${WOS.esc(e.note)}</span></div>`).join('')}
      </div>`;
  }

  function drawJournal(){
    const host = document.getElementById('smJournal');
    const events = [];
    ((data && data.tasks) || []).forEach(t=>(t.events||[]).forEach(e=>
      events.push({ ...e, task: t.id, objective: t.objective })));
    events.sort((a,b)=>b.ts_ms-a.ts_ms);
    host.innerHTML = events.slice(0, 14).map(e=>`<div class="ov-feed-item">
      <span class="src-feed-dot" style="background:${STATE_COLOR[e.state]||'#8C877B'}"></span>
      <span class="src-feed-t">${hhmmss(e.ts_ms)}</span>
      <span class="ov-feed-x"><b>${WOS.esc(e.task)}</b> — ${WOS.esc(e.state)} · ${WOS.esc(e.note)}</span></div>`).join('')
      || '<div class="empty-state">no events yet</div>';
  }

  function afterRender(){
    fetch('./api/self/tasks')
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(j=>{
        data = j;
        if (!selectedId){ const running = j.tasks.find(t=>t.state==='Running'); selectedId = (running || j.tasks[0] || {}).id || null; }
        drawStats(); drawTable(); drawDetail(); drawJournal();
      })
      .catch(()=>{
        document.getElementById('smStats').innerHTML = '';
        document.getElementById('smTable').innerHTML = '<div class="empty-state">could not reach the store</div>';
      });
    document.getElementById('smStateSel')?.addEventListener('change', e=>{
      filter.state = e.target.value; drawTable();
    });
  }
  return { render, afterRender };
})();
