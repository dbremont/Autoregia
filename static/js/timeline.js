/* ════════════════════════════════════════════════════════════
   PRS Timeline — Vertical Chronological Record Timeline
   ════════════════════════════════════════════════════════════ */
PRS.Timeline = {
  render() {
    const records = [...PRS.Store.getAll()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return `
    <div class="content-header"><div><span class="eyebrow">Chronology</span><h1>Timeline</h1></div>
      <div class="actions"><span class="text-sm text-muted">${records.length} records, chronological</span></div>
    </div>
    <div class="timeline" id="timelineEl">
      ${records.map(r=>{
        const tc = TYPE_COLORS[r.record_type]||'#888';
        return `<div class="timeline-node">
          <div class="timeline-dot" style="border-color:${tc};background:${tc}22;"></div>
          <div class="timeline-date">${new Date(r.created_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})}</div>
          <div class="timeline-content" onclick="PRS.record.showDetail('${r.id}')">
            <span class="rc-type" style="background:${tc}15;color:${tc};font-size:10px;">${r.record_type}</span>
            <strong>${this.esc(r.content)}</strong>
            <p class="text-xs text-muted" style="margin-top:4px;">${r.id} · ${r.status}</p>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },
  esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
};