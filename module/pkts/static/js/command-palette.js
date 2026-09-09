/* ════════════════════════════════════════════════════════════
   PKTS Command Palette — Ctrl+K Universal Command Interface
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.CommandPalette = {
  open(initialQuery) {
    document.getElementById('cmdPalette').classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || ''; input.focus(); this.renderResults('');
  },
  close() { document.getElementById('cmdPalette').classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query||'').toLowerCase();
    const navCmds = PKTS.TABS.map(t=>({icon:t.icon, title:t.label, sub:`Navigate to the ${t.label} tab`,
      action:()=>{this.close();PKTS.navigate(t.id);}}));
    const commands = [
      {icon:'pencil-line',title:'Quick Capture',sub:'Open scratchpad for quick capture',action:()=>PKTS.scratchpad.open()},
      {icon:'download',title:'Export Dataset',sub:'Download the keystroke dataset as JSON',action:()=>{this.close();PKTS.exportData();}},
      {icon:'keyboard',title:'Keyword Bindings',sub:'View navigation bindings',action:()=>{this.close();PKTS.openDocs('bindings');}},
      {icon:'clipboard-list',title:'Documentation',sub:'Open PKTS documentation',action:()=>{this.close();PKTS.openDocs('docs');}},
      {icon:'search',title:'Search Events...',sub:'Focus the global search field',action:()=>{this.close();document.getElementById('globalSearch').focus();}},
      ...navCmds,
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));
    filtered.forEach(c => {
      html += `<div class="cmd-result-item">
        <span class="cmd-result-icon">${PKTS.icon(c.icon,17)}</span>
        <div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div>
      </div>`;
    });
    if (q.length > 1) {
      const evs = PKTS.Store.getEvents().filter(e=> (e.event.key||'').toLowerCase().includes(q) || e.session_id.toLowerCase().includes(q) || e.event_id.toLowerCase().includes(q)).slice(0,8);
      if (evs.length) {
        html += '<div class="cmd-group-label">Events</div>';
        evs.forEach(e => {
          html += `<div class="cmd-result-item">
            <span class="cmd-result-icon" style="color:var(--oxford)">${PKTS.icon('circle-dot',16)}</span>
            <div class="cmd-result-text"><div class="cmd-result-title">${PKTS.esc(e.event.key||e.event.key_code)} · ${PKTS.esc(e.session_id)}</div>
            <div class="cmd-result-subtitle">${PKTS.esc(e.event_id)} · dwell ${e.timing.hold_time_ms}ms</div></div>
          </div>`;
        });
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.cmd-result-item').forEach((item,i)=> item.addEventListener('click', () => filtered[i]?.action?.()));
  }
};

document.addEventListener('DOMContentLoaded',() => {
  const cmdInput = document.getElementById('cmdInput');
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => PKTS.CommandPalette.renderResults(e.target.value));
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') PKTS.CommandPalette.close();
      if (e.key === 'Enter') { const f=document.querySelector('#cmdResults .cmd-result-item'); if(f) f.click(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
        const cur = items.findIndex(i=>i.classList.contains('active'));
        items[cur]?.classList.remove('active');
        const next = e.key==='ArrowDown'?Math.min(cur+1,items.length-1):Math.max(cur-1,0);
        items[next]?.classList.add('active'); items[next]?.scrollIntoView({block:'nearest'});
      }
    });
  }
});
