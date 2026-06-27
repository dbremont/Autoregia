/* ════════════════════════════════════════════════════════════
   PRS Complementary — Mock Feature Panels
   ════════════════════════════════════════════════════════════ */
PRS.Complementary = {
  renderCalendar() {
    return `<div class="content-header"><div><span class="eyebrow">Integration</span><h1>Calendar</h1></div></div>
    <div class="card animate-in"><div class="card-header"><h3>${PRS.icon('calendar',16)} Google Calendar</h3>
      <span class="badge badge-active">Connected</span></div>
      <div class="card-body">
        <p style="margin-bottom:var(--space-4);color:var(--color-text-secondary);font-size:var(--text-sm);">
          Calendar integration is simulated. Events derived from Event-type records and deadlines.</p>
        ${this._mockCalendarEvents()}</div></div>`;
  },
  _mockCalendarEvents() {
    const ev = PRS.Store.getAll().filter(r=>r.record_type==='Event'||r.deadline).slice(0,6);
    return ev.map(e=>`<div style="display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border-light);">
      <div style="width:3px;height:36px;background:${TYPE_COLORS[e.record_type]||'var(--oxford)'};border-radius:2px;"></div>
      <div><div style="font-weight:500;font-size:var(--text-sm);">${e.content}</div>
      <div class="text-xs text-muted">${e.deadline?new Date(e.deadline).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}):'No date'} · ${e.id}</div></div></div>`).join('');
  },

  renderSuggestions() {
    return `<div class="content-header"><div><span class="eyebrow">Intelligence</span><h1>Suggestions</h1></div></div>
    <div class="grid-2 animate-in">
      <div class="card"><div class="card-header"><h3>${PRS.icon('bot',16)} LLM Autocomplete</h3><span class="badge badge-draft">Mock</span></div>
        <div class="card-body"><p class="text-sm">AI-powered suggestions as you type.</p>
          <div style="background:var(--color-surface-2);border-radius:var(--radius-md);padding:var(--space-3);margin-top:var(--space-3);font-size:var(--text-sm);border-left:2px solid var(--gold);">
            <div style="color:var(--oxford);font-weight:600;display:flex;align-items:center;gap:6px;">${PRS.icon('lightbulb',14)} Suggestion</div>"Consider linking to REC-2026-00003"</div></div></div></div>
      <div class="card"><div class="card-header"><h3>${PRS.icon('target',16)} Related Records</h3><span class="badge badge-active">Active</span></div>
        <div class="card-body" id="suggestionRelated"></div></div>
      <div class="card"><div class="card-header"><h3>${PRS.icon('bar-chart-3',16)} Pattern Detection</h3><span class="badge badge-pending">Mock</span></div>
        <div class="card-body"><p class="text-sm">Recurrence & pattern mining from recording patterns.</p>
          <div style="background:var(--color-surface-2);border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);">
            ${PRS.icon('refresh-cw',14)} Weekly review pattern detected<br>${PRS.icon('trending-up',14)} Recording rate: +23% vs last month</div></div></div>
      <div class="card"><div class="card-header"><h3>${PRS.icon('mic',16)} Voice Input</h3><span class="badge badge-draft">Mock</span></div>
        <div class="card-body"><p class="text-sm">Voice-to-text capture using Web Speech API.</p>
          <button class="btn btn-secondary btn-sm" data-vc="0" onclick="var l=this.querySelector('[data-vlabel]');if(this.dataset.vc==='0'){this.dataset.vc='1';l.textContent='Listening…';setTimeout(function(){l.textContent='Start Voice Capture';},2000);}">${PRS.icon('mic',15)} <span data-vlabel>Start Voice Capture</span></button></div></div>
    </div>`;
  },
  renderExport() {
    return `<div class="content-header"><div><span class="eyebrow">Data</span><h1>Export / Import</h1></div></div>
    <div class="grid-2 animate-in">
      <div class="card"><div class="card-header"><h3>${PRS.icon('download',16)} Export Data</h3></div>
        <div class="card-body"><p class="text-sm" style="margin-bottom:var(--space-3);">Download all records as JSON backup.</p>
          <button class="btn btn-primary btn-sm" onclick="PRS.Complementary.doExport()">${PRS.icon('download',15)} Export JSON</button></div></div>
      <div class="card"><div class="card-header"><h3>${PRS.icon('upload',16)} Import Data</h3></div>
        <div class="card-body"><p class="text-sm" style="margin-bottom:var(--space-3);">Import from JSON file. Merges by ID.</p>
          <input type="file" accept=".json" onchange="PRS.Complementary.doImport(this.files[0])" style="font-size:var(--text-xs);"></div></div>
      <div class="card" style="grid-column:1/-1;"><div class="card-header"><h3>${PRS.icon('lock',16)} Encryption Status</h3><span class="badge badge-completed">Mock</span></div>
        <div class="card-body"><p class="text-sm">Data encryption at rest is planned. Currently stored in localStorage plain text.</p>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-3);flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:var(--color-success-light);border-radius:14px;font-size:11px;color:var(--status-active);">${PRS.icon('check',13)} Local Storage</span>
            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:var(--color-warning-light);border-radius:14px;font-size:11px;color:var(--status-pending);">${PRS.icon('circle',8)} Encryption Pending</span>
            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:var(--color-info-light);border-radius:14px;font-size:11px;color:var(--status-scheduled);">${PRS.icon('check',13)} Autosave On</span>
          </div></div></div>
    </div>`;
  },
  doExport() {
    const blob = new Blob([JSON.stringify(PRS.Store.getAll(),null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='prs_export.json';a.click();URL.revokeObjectURL(a.href);
  },
  doImport(file) {
    if(!file)return;
    const r=new FileReader();
    r.onload=async(e)=>{
      try{const d=JSON.parse(e.target.result);if(Array.isArray(d)){let n=0;
        for(const it of d){if(it.id&&!PRS.Store.getById(it.id)){await PRS.Store.add(it);n++;}}
        alert(`Imported ${n} records.`);PRS.navigate(PRS.currentView);}
      }catch(err){alert('Invalid JSON file.');}
    };r.readAsText(file);
  }
};