/* ════════════════════════════════════════════════════════════
   PRS Study — Record Study (Analysis) Mocks
   Record Time Reference Evolution · Record Time Line ·
   Activity Heat Map · Topic Landscape Evolution ·
   Record Embedding Graph · Recurrence Map
   ════════════════════════════════════════════════════════════ */
PRS.Study = {
  // Active sub-analysis tab
  tab: 'time-reference',
  esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;},

  render() {
    const tabs = [
      ['time-reference', 'Time Reference Evolution', 'clock'],
      ['time-line',      'Record Time Line', 'list'],
      ['heat-map',       'Activity Heat Map', 'layout-grid'],
      ['topic-landscape','Topic Landscape Evolution', 'target'],
      ['embedding',      'Record Embedding Graph', 'share-2'],
      ['recurrence',     'Recurrence Map', 'refresh-cw'],
    ];
    const bar = tabs.map(([k,label,ic]) =>
      `<button class="study-tab ${k===this.tab?'active':''}" data-tab="${k}" onclick="PRS.Study.switch('${k}')">${PRS.icon(ic,14)} ${label}</button>`
    ).join('');
    return `
    <div class="content-header"><div><span class="eyebrow">Analysis</span><h1>Record Study</h1></div>
      <div class="actions"><span class="text-sm text-muted">Derivative · <span class="badge badge-draft">Mock</span></span></div>
    </div>
    <div class="study-tabs">${bar}</div>
    <div id="studyBody" class="animate-in"></div>`;
  },

  switch(tab) {
    this.tab = tab;
    document.querySelectorAll('.study-tab').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-tab')===tab);
    });
    this.renderBody();
  },

  renderBody() {
    const el = document.getElementById('studyBody');
    if (!el) return;
    const map = {
      'time-reference':  () => this.renderTimeReference(),
      'time-line':       () => this.renderTimeLine(),
      'heat-map':        () => this.renderHeatMap(),
      'topic-landscape': () => this.renderTopicLandscape(),
      'embedding':       () => this.renderEmbedding(),
      'recurrence':      () => this.renderRecurrence(),
    };
    el.innerHTML = (map[this.tab] || map['time-reference'])();
    const draw = {
      'time-reference':  'drawTimeReference',
      'time-line':       'drawTimeLine',
      'heat-map':        'drawHeatMap',
      'topic-landscape': 'drawTopicLandscape',
      'embedding':       'drawEmbedding',
      'recurrence':      'drawRecurrence',
    }[this.tab];
    if (draw) setTimeout(()=>this[draw](), 30);
  },

  /* ── 1. Time Reference Evolution ────────────────────── */
  drawTimeReference() {
    const el = document.getElementById('studyTR'); if (!el) return;
    const records = PRS.Store.getAll();
    const months = [...new Set(records.map(r=>(r.created_at||'').slice(0,7)).filter(Boolean))].sort();
    const series = { Horizon:{} };
    records.forEach(r=>{
      const m=(r.created_at||'').slice(0,7); if(!m) return;
      const v = r.horizon || 'Unknown';
      series.Horizon[v] = series.Horizon[v]||{}; series.Horizon[v][m]=(series.Horizon[v][m]||0)+1;
    });
    const W = el.clientWidth||700, H=300, padL=40, padB=28, padT=16, padR=120;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const stacks = ['Immediate','Short-term','Medium-term','Long-term'];
    const palette=['#8B1A1A','#4A7C59','#C17930','#4A6FA5'];
    // cumulative counts per month
    const cum = months.map(()=>0);
    let svg=`<svg class="study-svg" viewBox="0 0 ${W} ${H}">`;
    for (let i=0;i<=4;i++){const y=padT+plotH-(i/4)*plotH;svg+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#EEE"/>`;}
    months.forEach((m,i)=>{const x=padL+(months.length>1?(i/(months.length-1))*plotW:0);
      svg+=`<text x="${x}" y="${H-10}" font-size="9" fill="#999" text-anchor="middle">${m}</text>`;});
    const maxCum = months.map((_,mi)=>stacks.reduce((s,c)=>s+(series.Horizon[c]?.[months[mi]]||0),0));
    const peak = Math.max(...maxCum,1);
    stacks.forEach((cat,si)=>{
      const pts=[];
      months.forEach((m,i)=>{cum[i]+=series.Horizon[cat]?.[m]||0; pts.push([padL+(months.length>1?(i/(months.length-1))*plotW:0), padT+plotH-(cum[i]/peak)*plotH]);});
      const color=palette[si];
      let path=`M ${pts[0][0]},${padT+plotH}`;
      pts.forEach(p=>path+=` L ${p[0]},${p[1]}`);
      path+=` L ${pts[pts.length-1][0]},${padT+plotH} Z`;
      svg+=`<path d="${path}" fill="${color}" opacity="0.55"><title>${cat}</title></path>`;
    });
    stacks.forEach((c,si)=>{const x=W-padR+8, y=padT+si*18;
      svg+=`<rect x="${x}" y="${y}" width="11" height="11" fill="${palette[si]}" opacity="0.7"/>`;
      svg+=`<text x="${x+16}" y="${y+9}" font-size="10" fill="#666">${c}</text>`;});
    svg+=`</svg>`;
    el.innerHTML=svg;
  },

  /* ── 2. Record Time Line (scatter: day × hour) ─────── */
  renderTimeLine() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Record Time Line</h3>
      <span class="text-xs text-muted">Each point is a record · x = day · y = hour of day</span></div>
      <div class="card-body"><div class="study-viz" id="studyTL"></div></div></div>
    <div class="card animate-in delay-1"><div class="card-body">
      <p class="text-sm text-muted">Mocked: every record is plotted by its creation timestamp — the horizontal axis spans the recording
      period (day) and the vertical axis is the hour of day. Points are colored by <code>record_type</code>.</p></div></div>`;
  },
  drawTimeLine() {
    const el = document.getElementById('studyTL'); if (!el) return;
    const records = PRS.Store.getAll().filter(r=>r.created_at);
    const times = records.map(r=>new Date(r.created_at).getTime()).filter(t=>!isNaN(t));
    if (!times.length) { el.innerHTML='<p class="text-xs text-muted">No timestamped records.</p>'; return; }
    const minT = Math.min(...times), maxT = Math.max(...times);
    const span = Math.max(maxT-minT, 1);
    const W=el.clientWidth||700, H=300, padL=40, padB=34, padT=12, padR=12;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    // y-axis: 0..24 hours
    let svg=`<svg class="study-svg" viewBox="0 0 ${W} ${H}">`;
    // horizontal gridlines + hour labels (every 4h)
    for (let h=0; h<=24; h+=4){
      const y = padT + (h/24)*plotH;
      svg+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#EEE"/>`;
      svg+=`<text x="${padL-6}" y="${y+3}" font-size="9" fill="#999" text-anchor="end">${String(h).padStart(2,'0')}:00</text>`;
    }
    // x-axis: date ticks (start / mid / end)
    const fmt = (t)=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const xT = (t)=> padL + ((t-minT)/span)*plotW;
    [minT,(minT+maxT)/2,maxT].forEach((t,i)=>{
      const x=xT(t);
      svg+=`<text x="${x}" y="${H-14}" font-size="9" fill="#999" text-anchor="${i===0?'start':i===2?'end':'middle'}">${fmt(t)}</text>`;
    });
    // points
    records.forEach(r=>{
      const t=new Date(r.created_at).getTime(); if(isNaN(t)) return;
      const d=new Date(r.created_at);
      const hour = d.getUTCHours() + d.getUTCMinutes()/60;
      const x=xT(t);
      const y=padT+(hour/24)*plotH;
      const color=TYPE_COLORS[r.record_type]||'#999';
      svg+=`<circle class="graph-node" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" opacity="0.85" onclick="PRS.record.showDetail('${r.id}')"><title>${this.esc((r.content||'').slice(0,50))} · ${r.record_type} · ${new Date(r.created_at).toISOString().slice(0,16)}</title></circle>`;
    });
    svg+=`</svg>`;
    el.innerHTML=svg;
  },

  /* ── 3. Activity Heat Map ───────────────────────────── */
  renderHeatMap() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Activity Heat Map</h3>
      <span class="text-xs text-muted">GitHub-style contribution grid (last 180 days)</span></div>
      <div class="card-body"><div class="heatmap-container" id="studyHM"></div></div></div>`;
  },
  drawHeatMap() {
    const el = document.getElementById('studyHM'); if (!el) return;
    const records = PRS.Store.getAll();
    const now = new Date(); const daysAgo = 180; const dayCounts = {};
    for (let i = daysAgo; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate()-i); dayCounts[d.toISOString().split('T')[0]] = 0; }
    records.forEach(r => { if (r.created_at) { const d = r.created_at.split('T')[0]; if (dayCounts[d]!==undefined) dayCounts[d]++; } });
    const entries = Object.entries(dayCounts);
    const maxCount = Math.max(...entries.map(e=>e[1]),1);
    const weeks = Math.ceil(entries.length/7); const cellSize=12, cellGap=3;
    const w=weeks*(cellSize+cellGap)+30, h=7*(cellSize+cellGap)+20;
    let svg=`<svg class="heatmap-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day,i)=>{svg+=`<text x="0" y="${i*(cellSize+cellGap)+cellSize+2}" class="heatmap-label">${day}</text>`;});
    const colors=['#EDE9E1','#C9D8C4','#A5CC9E','#7BBF78','#5AAF56'];
    entries.forEach(([date,count],i)=>{const week=Math.floor(i/7), dow=i%7;
      const x=28+week*(cellSize+cellGap), y=dow*(cellSize+cellGap);
      const intensity=count===0?0:Math.ceil((count/maxCount)*4);
      svg+=`<rect class="heatmap-cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${colors[intensity]}" rx="2"><title>${date}: ${count}</title></rect>`;});
    svg+=`</svg>`;
    el.innerHTML=svg;
  },

  /* ── 4. Topic Landscape Evolution ───────────────────── */
  renderTopicLandscape() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Topic Landscape Evolution</h3>
      <span class="text-xs text-muted">Bubble size = record count per domain; growth trajectory mocked over time</span></div>
      <div class="card-body"><div class="study-viz" id="studyTL2"></div></div></div>
    <div class="card animate-in delay-1"><div class="card-body">
      <p class="text-sm text-muted">Mocked: each <code>domain</code> is plotted as a bubble. The dashed arcs suggest the
      evolution path each topic took from first appearance to its current footprint.</p></div></div>`;
  },

  /* ── 1. Time Reference Evolution ────────────────────── */
  renderTimeReference() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Record Time Reference Evolution</h3>
      <span class="text-xs text-muted">Distribution of temporal fields (Horizon, Relevance, Validity) over time</span></div>
      <div class="card-body"><div class="study-viz" id="studyTR"></div></div></div>
    <div class="card animate-in delay-1"><div class="card-body">
      <p class="text-sm text-muted">Mocked: each record's <code>horizon</code>, <code>relevance</code>, and <code>validity</code>
      are aggregated by creation month. The stacked area tracks how the orientation of recorded state shifts across time.</p></div></div>`;
  },
  drawTopicLandscape() {
    const el = document.getElementById('studyTL2'); if (!el) return;
    const records = PRS.Store.getAll();
    const domains = {};
    records.forEach(r=>{const d=r.domain||'General'; domains[d]=(domains[d]||0)+1;});
    const entries = Object.entries(domains).sort((a,b)=>b[1]-a[1]);
    const W=el.clientWidth||700, H=320, cx=W/2, cy=H/2;
    const palette=['#8B1A1A','#4A7C59','#C17930','#4A6FA5','#B08D57','#2D6A4F','#6B5B95','#9A9589'];
    const positions = entries.map((e,i)=>{
      const angle=(i/entries.length)*2*Math.PI + i*0.3;
      const radius=60+Math.sqrt(e[1])*16;
      return {name:e[0], count:e[1], x:cx+radius*Math.cos(angle), y:cy+radius*Math.sin(angle), color:palette[i%palette.length]};
    });
    const maxC=Math.max(...entries.map(e=>e[1]),1);
    let svg=`<svg class="study-svg" viewBox="0 0 ${W} ${H}">`;
    positions.forEach(p=>{
      svg+=`<path d="M ${cx},${cy} Q ${(cx+p.x)/2 + 30},${(cy+p.y)/2 - 30} ${p.x},${p.y}" stroke="${p.color}" stroke-width="1" stroke-dasharray="3 3" fill="none" opacity="0.5"/>`;
    });
    positions.forEach(p=>{
      const r=Math.max(14,(p.count/maxC)*36);
      svg+=`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${p.color}" opacity="0.35" stroke="${p.color}"/>`;
      svg+=`<text x="${p.x}" y="${p.y-2}" text-anchor="middle" font-size="11" fill="#333" font-weight="600">${this.esc(p.name)}</text>`;
      svg+=`<text x="${p.x}" y="${p.y+12}" text-anchor="middle" font-size="10" fill="#777">${p.count}</text>`;
    });
    svg+=`</svg>`;
    el.innerHTML=svg;
  },

  /* ── 5. Record Embedding Graph ──────────────────────── */
  renderEmbedding() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Record Embedding Graph</h3>
      <span class="text-xs text-muted">2D semantic projection (mock) · colored by domain</span></div>
      <div class="card-body"><div class="study-viz" id="studyEMB"></div></div></div>
    <div class="card animate-in delay-1"><div class="card-body">
      <p class="text-sm text-muted">Mocked: a deterministic pseudo-embedding places each record in 2D space, clustered by
      <code>domain</code>. In production this would be the output of an embedding model with neighbor links drawn for
      semantic proximity.</p></div></div>`;
  },
  drawEmbedding() {
    const el = document.getElementById('studyEMB'); if (!el) return;
    const records = PRS.Store.getAll();
    const domains = [...new Set(records.map(r=>r.domain||'General'))];
    const W=el.clientWidth||700, H=340;
    const palette=['#8B1A1A','#4A7C59','#C17930','#4A6FA5','#B08D57','#2D6A4F','#6B5B95','#9A9589'];
    const centers = domains.map((d,i)=>{const a=(i/domains.length)*2*Math.PI;
      return {domain:d, x:W/2+110*Math.cos(a), y:H/2+90*Math.sin(a), color:palette[i%palette.length]};});
    let svg=`<svg class="study-svg" viewBox="0 0 ${W} ${H}">`;
    centers.forEach(c=>{
      svg+=`<circle cx="${c.x}" cy="${c.y}" r="70" fill="${c.color}" opacity="0.07"/>`;
      svg+=`<text x="${c.x}" y="${c.y-72}" text-anchor="middle" font-size="10" fill="#999">${this.esc(c.domain)}</text>`;
    });
    records.forEach(r=>{
      const di = domains.indexOf(r.domain||'General');
      const c = centers[di]; if(!c) return;
      const seed = (r.id||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0);
      const a=(seed%360)*Math.PI/180; const rad=10+(seed%45);
      const x=c.x+rad*Math.cos(a), y=c.y+rad*Math.sin(a);
      svg+=`<circle class="graph-node" cx="${x}" cy="${y}" r="4" fill="${c.color}" opacity="0.85" onclick="PRS.record.showDetail('${r.id}')"><title>${this.esc((r.content||'').slice(0,40))}</title></circle>`;
    });
    svg+=`</svg>`;
    el.innerHTML=svg;
  },

  /* ── 6. Recurrence Map ──────────────────────────────── */
  renderRecurrence() {
    return `
    <div class="card animate-in"><div class="card-header"><h3>Recurrence Map</h3>
      <span class="text-xs text-muted">Recurring records by cadence (Daily / Weekly / Monthly / Yearly)</span></div>
      <div class="card-body"><div class="study-viz" id="studyREC"></div></div></div>
    <div class="card animate-in delay-1"><div class="card-body">
      <p class="text-sm text-muted">Mocked: records with a non-<code>None</code> <code>recurrence</code> field are grouped by
      cadence. The radial map places each cadence on a ring; recurring items appear as spokes to be surfaced on schedule.</p></div></div>`;
  },
  drawRecurrence() {
    const el = document.getElementById('studyREC'); if (!el) return;
    const records = PRS.Store.getAll();
    const cadences = ['Daily','Weekly','Monthly','Yearly','Custom'];
    const groups = {}; cadences.forEach(c=>groups[c]=records.filter(r=>(r.recurrence||'None')===c));
    const W=el.clientWidth||700, H=320, cx=W/2, cy=H/2;
    const maxR=Math.min(W,H)/2-40;
    const palette=['#8B1A1A','#4A7C59','#C17930','#4A6FA5','#B08D57'];
    let svg=`<svg class="study-svg" viewBox="0 0 ${W} ${H}">`;
    cadences.forEach((c,i)=>{const r=maxR*((i+1)/cadences.length);
      svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EEE"/>`;
      svg+=`<text x="${cx}" y="${cy-r+14}" text-anchor="middle" font-size="10" fill="#999">${c}</text>`;});
    cadences.forEach((c,ci)=>{
      const r=maxR*((ci+1)/cadences.length);
      const items=groups[c]; if(!items.length) return;
      items.forEach((it,idx)=>{
        const a=(idx/Math.max(items.length,1))*2*Math.PI + ci*0.5;
        const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a);
        const color=palette[ci];
        svg+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="1" opacity="0.4"/>`;
        svg+=`<circle class="graph-node" cx="${x}" cy="${y}" r="5" fill="${color}" onclick="PRS.record.showDetail('${it.id}')"><title>${this.esc((it.content||'').slice(0,40))} (${c})</title></circle>`;
      });
    });
    svg+=`<circle cx="${cx}" cy="${cy}" r="8" fill="#8B1A1A"/>`;
    svg+=`</svg>`;
    el.innerHTML=svg;
  }
};

