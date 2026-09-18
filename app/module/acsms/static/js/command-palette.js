/* ════════════════════════════════════════════════════════════
   ACSMS Command Palette — Ctrl+K. Navigation + skill jump:
   typing filters the catalog; picking a skill opens its detail
   view (where its practice log lives).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.CommandPalette = {
  open(initialQuery) {
    try { input.setAttribute('aria-expanded', 'true'); } catch (e) { /* noop */ }
    document.getElementById('cmdPalette').classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = initialQuery || ''; input.focus(); this.renderResults('');
  },
  close() { document.getElementById('cmdPalette').classList.add('hidden'); },
  renderResults(query) {
    const el = document.getElementById('cmdResults');
    const q = (query || '').toLowerCase();
    const navCmds = ACSMS.VIEWS.map(t => ({
      icon: t.icon, title: t.label, sub: `Go to ${t.label} — ${t.desc}`,
      action: () => { this.close(); ACSMS.navigate(t.id); }
    }));
    const commands = [
      { icon: 'plus', title: 'Log practice', sub: 'Quick-capture a self-reported session', action: () => { this.close(); ACSMS.capture.open(); } },
      { icon: 'book-open', title: 'Documentation', sub: 'About this dashboard', action: () => { this.close(); ACSMS.navigate('documentation'); } },
      { icon: 'search', title: 'Focus Search', sub: 'Filter the skill catalog from the header', action: () => { this.close(); document.getElementById('globalSearch')?.focus(); } },
      ...navCmds,
    ];
    let html = '<div class="cmd-group-label">Commands</div>';
    const filtered = commands.filter(c => !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q));
    filtered.forEach(c => {
      html += `<div class="cmd-result-item"><span class="cmd-result-icon">${ACSMS.icon(c.icon, 17)}</span><div class="cmd-result-text"><div class="cmd-result-title">${c.title}</div><div class="cmd-result-subtitle">${c.sub}</div></div></div>`;
    });
    // skill jump
    if (q.length > 0) {
      const skills = ACSMS.Store.skills().filter(s =>
        (s.name + ' ' + (s.tags || []).join(' ')).toLowerCase().includes(q)).slice(0, 6);
      if (skills.length) {
        html += '<div class="cmd-group-label">Skills</div>';
        skills.forEach(s => {
          html += `<div class="cmd-result-item"><span class="cmd-result-icon" style="color:var(--oxford)">${ACSMS.icon('layers', 16)}</span><div class="cmd-result-text"><div class="cmd-result-title">${ACSMS.esc(s.name)}</div><div class="cmd-result-subtitle">${s.practice_state} · level ${s.level || 0}/5 · ${s.practice_count} report${s.practice_count === 1 ? '' : 's'}</div></div></div>`;
        });
        const offset = filtered.length;
        el.querySelectorAll('.cmd-result-item').forEach((item, i) => {
          if (i >= offset) item.addEventListener('click', () => {
            this.close();
            ACSMS.navigate('skills/' + skills[i - offset].id);
          });
        });
      }
    }
    el.innerHTML = html;
    [...el.querySelectorAll('.cmd-result-item')].forEach((item, i) => {
      if (i < filtered.length) item.addEventListener('click', () => filtered[i].action?.());
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const i = document.getElementById('cmdInput');
  if (!i) return;
  i.addEventListener('input', (e) => ACSMS.CommandPalette.renderResults(e.target.value));
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ACSMS.CommandPalette.close();
    if (e.key === 'Enter') { const f = document.querySelector('#cmdResults .cmd-result-item'); if (f) f.click(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const it = [...document.querySelectorAll('#cmdResults .cmd-result-item')];
      const cur = it.findIndex(x => x.classList.contains('active'));
      it[cur]?.classList.remove('active');
      const next = e.key === 'ArrowDown' ? Math.min(cur + 1, it.length - 1) : Math.max(cur - 1, 0);
      it[next]?.classList.add('active'); it[next]?.scrollIntoView({ block: 'nearest' });
    }
  });
});
