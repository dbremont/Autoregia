/* ════════════════════════════════════════════════════════════
   PRS Summary — Record Summary (Daily / Weekly / Monthly / Annual)
   ════════════════════════════════════════════════════════════ */
PRS.Summary = {
  period: 'daily',
  esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;},

  render() {
    const periods = [['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['annual','Annual']];
    const today = new Date().toISOString().slice(0,10);
    const bar = periods.map(([k,label])=>
      `<button class="study-tab ${k===this.period?'active':''}" data-period="${k}" onclick="PRS.Summary.setPeriod('${k}')">${label}</button>`
    ).join('');
    return `
    <div class="content-header"><div><span class="eyebrow">Digest</span><h1>Record Summary</h1></div>
      <div class="actions"><span class="text-sm text-muted">Rollups · <span class="badge badge-draft">Mock</span></span></div>
    </div>
    <div class="study-tabs">${bar}</div>
    <div class="summary-controls">
      <label class="text-sm text-muted">Anchor date</label>
      <input type="date" id="summaryAnchor" value="${today}" onchange="PRS.Summary.renderBody()">
    </div>
    <div id="summaryBody" class="animate-in"></div>`;
  },

  setPeriod(p) {
    this.period = p;
    document.querySelectorAll('.study-tab[data-period]').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-period')===p);
    });
    this.renderBody();
  },

  renderBody() {
    const el = document.getElementById('summaryBody');
    if (!el) return;
    const anchorInput = document.getElementById('summaryAnchor');
    const anchor = anchorInput ? anchorInput.value : new Date().toISOString().slice(0,10);
    const map = {
      daily:   () => this.renderDaily(anchor),
      weekly:  () => this.renderWeekly(anchor),
      monthly: () => this.renderMonthly(anchor),
      annual:  () => this.renderAnnual(anchor),
    };
    el.innerHTML = (map[this.period] || map.daily)();
  },

  /* ── date helpers ───────────────────────────────────── */
  _range(anchor, period) {
    const end = new Date(anchor);
    let start = new Date(anchor);
    if (period==='daily') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    else if (period==='weekly') { const d=start.getDay()||7; start.setDate(start.getDate()-d+1); end.setTime(start.getTime()); end.setDate(end.getDate()+6); }
    else if (period==='monthly') { start.setDate(1); end.setMonth(start.getMonth()+1,0); }
    else if (period==='annual') { start.setMonth(0,1); end.setMonth(11,31); }
    return [start, end];
  },
  _inRange(records, start, end) {
    return records.filter(r=>{const t=new Date(r.created_at).getTime(); return t>=start.getTime() && t<=end.getTime();});
  },
  _topBy(records, field, n=5) {
    const counts = {};
    records.forEach(r=>{const v=r[field]||'—'; counts[v]=(counts[v]||0)+1;});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,n);
  },

  /* ── shared digest card ─────────────────────────────── */
  _digest(period, rangeLabel, inRange) {
    const stats = PRS.Store.getStats();
    const topTypes = this._topBy(inRange,'record_type');
    const topDomains = this._topBy(inRange,'domain');
    const topTags = this._topBy(inRange,'tags');
    const tagCounts = {};
    inRange.forEach(r=>(r.tags||[]).forEach(t=>{tagCounts[t]=(tagCounts[t]||0)+1;}));
    const topTagEntries = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const statusCounts = this._topBy(inRange,'status');
    const deadlines = inRange.filter(r=>r.deadline).length;
    const annotations = inRange.reduce((s,r)=>s+((r.annotations||[]).length),0);
    const highlights = [...inRange].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
    const accent = {'daily':'#8B1A1A','weekly':'#4A6FA5','monthly':'#4A7C59','annual':'#C17930'}[period];

    const pillRow = (entries) => entries.length
      ? `<div class="summary-pill-row">${entries.map(([k,v])=>`<span class="summary-pill"><span class="summary-pill-k">${this.esc(k)}</span><span class="summary-pill-v">${v}</span></span>`).join('')}</div>`
      : `<p class="text-xs text-muted">No data in range.</p>`;

    return `
    <div class="card animate-in">
      <div class="card-header" style="border-left:4px solid ${accent};">
        <h3>${rangeLabel}</h3>
        <span class="badge badge-active">${inRange.length} records</span>
      </div>
      <div class="card-body">
        <div class="summary-statline">
          <div class="summary-stat"><span class="ss-num">${inRange.length}</span><span class="ss-lbl">Records</span></div>
          <div class="summary-stat"><span class="ss-num">${deadlines}</span><span class="ss-lbl">Deadlines</span></div>
          <div class="summary-stat"><span class="ss-num">${annotations}</span><span class="ss-lbl">Annotations</span></div>
          <div class="summary-stat"><span class="ss-num">${stats.total}</span><span class="ss-lbl">All-time</span></div>
        </div>
        <div class="summary-grid">
          <div><h4 class="summary-h4">Top Types</h4>${pillRow(topTypes)}</div>
          <div><h4 class="summary-h4">Top Domains</h4>${pillRow(topDomains)}</div>
          <div><h4 class="summary-h4">Top Tags</h4>${pillRow(topTagEntries)}</div>
          <div><h4 class="summary-h4">Status Mix</h4>${pillRow(statusCounts)}</div>
        </div>
        <h4 class="summary-h4" style="margin-top:var(--space-5);">Highlights</h4>
        <div class="summary-highlights">
          ${highlights.length ? highlights.map(r=>`
            <div class="summary-hl" onclick="PRS.record.showDetail('${r.id}')">
              <span class="summary-hl-dot" style="background:${TYPE_COLORS[r.record_type]||'#999'};"></span>
              <div>
                <div class="summary-hl-title">${this.esc((r.content||'').slice(0,80))}</div>
                <div class="summary-hl-meta">${r.record_type} · ${r.id} · ${new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              </div>
            </div>`).join('') : `<p class="text-xs text-muted">No records in this period.</p>`}
        </div>
        <p class="text-xs text-muted" style="margin-top:var(--space-4);">Mocked: generated client-side from stored records. Automated summary generation is a planned backend feature.</p>
      </div>
    </div>`;
  },

  /* ── periods ────────────────────────────────────────── */
  renderDaily(anchor) {
    const [s,e] = this._range(anchor,'daily');
    const inRange = this._inRange(PRS.Store.getAll(), s, e);
    const label = new Date(anchor).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    return this._digest('daily', `Daily Digest — ${label}`, inRange);
  },
  renderWeekly(anchor) {
    const [s,e] = this._range(anchor,'weekly');
    const inRange = this._inRange(PRS.Store.getAll(), s, e);
    const fmt = (d)=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    return this._digest('weekly', `Weekly Digest — ${fmt(s)} to ${fmt(e)}`, inRange);
  },
  renderMonthly(anchor) {
    const [s,e] = this._range(anchor,'monthly');
    const inRange = this._inRange(PRS.Store.getAll(), s, e);
    const label = new Date(anchor).toLocaleDateString('en-US',{year:'numeric',month:'long'});
    return this._digest('monthly', `Monthly Digest — ${label}`, inRange);
  },
  renderAnnual(anchor) {
    const [s,e] = this._range(anchor,'annual');
    const inRange = this._inRange(PRS.Store.getAll(), s, e);
    const year = new Date(anchor).getFullYear();
    return this._digest('annual', `Annual Digest — ${year}`, inRange);
  }
};

