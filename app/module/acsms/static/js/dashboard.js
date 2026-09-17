/* ════════════════════════════════════════════════════════════
   ACSMS Dashboard — practice health at a glance.
   Stats, the attention queue (skills the tracking layer flagged:
   never-practiced / neglected), and the recent practice stream.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Dashboard = {
  render() {
    return `<div class="animate-in">${ACSMS.view.header('Dashboard', `<button class="btn btn-primary btn-sm" id="dashLogBtn">${ACSMS.icon('plus', 15)} Log practice</button>`)}</div>
      <div class="stat-row animate-in delay-1" id="dashStats"></div>
      <div class="chart-grid-2">
        <div class="animate-in delay-2">
          ${ACSMS.view.card('Tracking', 'Needs attention',
            `<div class="queue" id="attentionQueue"></div>`,
            'Skills the tracking layer flagged — no practice yet, or stale beyond twice the target cadence.')}
        </div>
        <div class="animate-in delay-3">
          ${ACSMS.view.card('Stream', 'Recent practice',
            `<div class="practice-feed" id="recentFeed"></div>`)}
        </div>
      </div>`;
  },

  afterRender() {
    document.getElementById('dashLogBtn')?.addEventListener('click', () => ACSMS.capture.open());
    const stats = ACSMS.Store.stats();
    const el = document.getElementById('dashStats');
    if (!el) return;
    if (!stats) { el.innerHTML = ACSMS.view.statCard('—', 'stats unavailable'); return; }
    el.innerHTML =
      ACSMS.view.statCard(stats.skills.active, 'Active skills') +
      ACSMS.view.statCard(stats.practices.last_7d, 'Practices · 7d') +
      ACSMS.view.statCard(stats.states.neglected, 'Neglected', stats.states.neglected ? 'var(--color-danger)' : '') +
      ACSMS.view.statCard(stats.states['never-practiced'], 'Never practiced', stats.states['never-practiced'] ? 'var(--color-warning)' : '');

    const q = document.getElementById('attentionQueue');
    if (stats.attention.length) {
      q.innerHTML = stats.attention.map(a => {
        const neglected = a.state === 'neglected';
        const tgt = a.target_per_week ? ` · target ${a.target_per_week}×/wk` : '';
        const sub = neglected
          ? `neglected — last practiced ${ACSMS.fmtAgo(a.last_practiced_ms)}${tgt}`
          : `never practiced — defined ${ACSMS.fmtAgo(a.created_at_ms)}${tgt}`;
        return `<a class="queue-item q-${a.state}" href="#practice" data-skill="${a.id}">
          <span class="q-icon">${ACSMS.icon(neglected ? 'alert-triangle' : 'clock', 16)}</span>
          <span class="q-body"><span class="q-title">${ACSMS.esc(a.name)}</span><span class="q-sub">${sub}</span></span>
          <span class="q-act">log practice ${ACSMS.icon('arrow-right', 13)}</span>
        </a>`;
      }).join('');
      q.querySelectorAll('[data-skill]').forEach(a => a.addEventListener('click', async (e) => {
        e.preventDefault();
        await ACSMS.Store.applyFilter({ skill: a.dataset.skill });
        ACSMS.navigate('practice');
      }));
    } else {
      q.innerHTML = `<div class="empty-state" style="padding:var(--space-8) var(--space-4)"><h3>Nothing flagged</h3><p>Every active skill has fresh practice — the tracking layer is quiet.</p></div>`;
    }

    const feed = document.getElementById('recentFeed');
    const recent = stats.recent || [];
    feed.innerHTML = recent.length
      ? recent.map(ACSMS.Practice.practiceCard).join('')
      : `<div class="empty-state" style="padding:var(--space-8) var(--space-4)"><h3>No practice yet</h3><p>Self-report the first session to start the history.</p></div>`;
    feed.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const ok = await AUTOREGIA.confirmDialog({
        title: 'Delete practice report?',
        message: 'This removes the self-report from the skill’s history.',
        confirmText: 'Delete',
      });
      if (!ok) return;
      try {
        await ACSMS.Store.deletePractice(b.dataset.del);
        await ACSMS.Store.refresh();
        ACSMS.navigate('dashboard'); ACSMS.updateFooter();
      } catch (e) { ACSMS.toast('Could not delete: ' + e.message); }
    }));
  },
};
