/* ════════════════════════════════════════════════════════════
   MAD Command Palette — Ctrl+K Universal Command Interface
   ════════════════════════════════════════════════════════════ */
MAD.CommandPalette = {
  open(initialQuery) {
    try { input.setAttribute('aria-expanded','true'); } catch(e){}
    const overlay = document.getElementById('cmdPalette');
    overlay.classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || '';
    input.focus();
    this.renderResults('');
  },
  close() {
    try { document.getElementById('cmdInput').setAttribute('aria-expanded','false'); } catch(e){} document.getElementById('cmdPalette').classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query||'').toLowerCase();
    // Commands
    const commands = [
      {icon:'plus',title:'New Record',sub:'Create a new record',action:()=>MAD.record.openEditor()},
      {icon:'pencil-line',title:'Quick Capture',sub:'Open scratchpad for quick capture',action:()=>MAD.scratchpad.open()},
      {icon:'inbox',title:'Working Memory',sub:'Open the browser-only working area',action:()=>{this.close();MAD.navigate('working');}},
      {icon:'file-text',title:'Generate Log Records',sub:'Promote working todos/notes into formal records',action:()=>{this.close();MAD.navigate('working');setTimeout(()=>MAD.Working.generate(),120);}},
      {icon:'gauge',title:'Go to Dashboard',sub:'Navigate to dashboard view',action:()=>{this.close();MAD.navigate('dashboard');}},
      {icon:'list',title:'Browse All Records',sub:'View all records list',action:()=>{this.close();MAD.navigate('records');}},
      {icon:'clock',title:'View Timeline',sub:'Chronological record timeline',action:()=>{this.close();MAD.navigate('timeline');}},
      {icon:'layout-grid',title:'Activity Heatmap',sub:'Record creation activity heatmap',action:()=>{this.close();MAD.navigate('heatmap');}},
      {icon:'share-2',title:'Relationship Graph',sub:'Visualize record relationships',action:()=>{this.close();MAD.navigate('graph');}},
      {icon:'search',title:'Search Records...',sub:'Search by content, tags, or ID',action:()=>{this.close();document.getElementById('globalSearch').focus();}}
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q))
      .forEach(c => {
        html += `<div class="cmd-result-item" data-action="cmd">
          <span class="cmd-result-icon">${MAD.icon(c.icon,17)}</span>
          <div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div>
        </div>`;
      });
    // Record results
    if (q.length > 1) {
      const results = MAD.Store.search(q).slice(0,8);
      if (results.length) {
        html += '<div class="cmd-group-label">Records</div>';
        results.forEach(r => {
          html += `<div class="cmd-result-item" onclick="MAD.CommandPalette.close();MAD.record.showDetail('${r.id}')">
            <span class="cmd-result-icon" style="color:${TYPE_COLORS[r.record_type]||'#999'}">${MAD.icon('circle-dot',16)}</span>
            <div class="cmd-result-text"><div class="cmd-result-title">${r.content.substring(0,60)}</div><div class="cmd-result-subtitle">${r.record_type} · ${r.id} · ${r.status}</div></div>
          </div>`;
        });
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.cmd-result-item').forEach((it, i) => {
      it.id = 'cmd-opt-' + i;
      it.setAttribute('role', 'option');
      it.setAttribute('aria-selected', it.classList.contains('active') ? 'true' : 'false');
    });
    // Bind click handlers
    el.querySelectorAll('.cmd-result-item[data-action]').forEach((item,i) => {
      item.addEventListener('click', () => { this.close(); commands[i]?.action?.(); });
    });
  }
};

document.addEventListener('DOMContentLoaded',() => {
  const cmdInput = document.getElementById('cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => MAD.CommandPalette.renderResults(e.target.value));
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') MAD.CommandPalette.close();
      if (e.key === 'Enter') {
        const first = document.querySelector('#cmdResults .cmd-result-item.active') || document.querySelector('#cmdResults .cmd-result-item');
        if (first) first.click();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
        const cur = items.findIndex(i=>i.classList.contains('active'));
        items[cur]?.classList.remove('active');
        const next = e.key==='ArrowDown'?Math.min(cur+1,items.length-1):Math.max(cur-1,0);
        items[next]?.classList.add('active');
        items.forEach((it,i)=>it.setAttribute('aria-selected', i===next ? 'true' : 'false'));
        if (items[next]) { items[next].scrollIntoView({block:'nearest'}); input.setAttribute('aria-activedescendant', items[next].id); }
      }
    });
  }
});