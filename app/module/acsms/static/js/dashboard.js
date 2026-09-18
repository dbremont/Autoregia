/* ════════════════════════════════════════════════════════════
   ACSMS Dashboard — the capability system at a glance.
   Greeting + stat cards, the Next Practice recommendation (with
   derived reasons), the 12-week trajectory chart, recent activity,
   capability gaps, the attention queue, and a right rail
   (capability state / quick actions / keep going).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Dashboard = {
  activityExpanded: false,

  render() {
    return `<div class="dash-layout">
      <div class="dash-main">
        <div class="dash-greeting animate-in">
          <div><h1 id="dashGreeting"></h1>
            <p class="catalog-lede">Here's your capability system at a glance.</p></div>
          <span class="dash-date num" id="dashDate"></span>
        </div>
        <div class="dash-stat-row animate-in delay-1" id="dashStats"></div>
        <div id="dashHero" class="animate-in delay-2"></div>
        <div class="animate-in delay-2" id="trajectoryCard"></div>
        <div class="chart-grid-2 animate-in delay-3">
          <div>${ACSMS.view.card('Feed', 'Recent activity',
            `<div class="act-list" id="dashActivity"></div>
             <div style="text-align:right;padding-top:var(--space-2)">
               <button class="btn btn-ghost btn-sm" id="activityToggle">View all</button>
             </div>`)}
        </div>
        <div>${ACSMS.view.card('Gaps', 'Capability gaps',
          `<div id="dashGaps"></div>`,
          'Where to focus next — domains by average mastery.')}
        </div>
        <div class="animate-in delay-3">
          ${ACSMS.view.card('Tracking', 'Needs attention',
            `<div class="queue" id="attentionQueue"></div>`,
            'Skills the tracking layer flagged — no practice yet, or stale beyond twice the target cadence.')}
        </div>
      </div>
      <aside class="catalog-rail animate-in delay-2" id="dashRail"></aside>
    </div>`;
  },

  afterRender() {
    const stats = ACSMS.Store.stats();
    this.renderGreeting();
    this.renderStats(stats);
    this.renderHero(stats);
    this.renderTrajectory(stats);
    this.renderActivity();
    this.renderGaps(stats);
    this.renderQueue(stats);
    this.renderRail(stats);
  },

  // ── greeting ──
  renderGreeting() {
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
    const g = document.getElementById('dashGreeting');
    if (g) g.textContent = part;
    const d = document.getElementById('dashDate');
    if (d) d.textContent = new Date().toLocaleDateString('en-US',
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  },

  // ── stat cards ──
  statCard(icon, value, label, sub, extra = '') {
    return `<div class="dash-card animate-in">
      <span class="dash-card-icon">${ACSMS.icon(icon, 20)}</span>
      <div class="dash-card-body">
        <div class="dash-card-top"><span class="dash-card-value">${value}</span>${extra}</div>
        <div class="dash-card-label">${label}</div>
        <div class="dash-card-sub">${sub}</div>
      </div>
    </div>`;
  },

  renderStats(stats) {
    const el = document.getElementById('dashStats');
    if (!el) return;
    if (!stats) { el.innerHTML = `<div class="dash-card"><span class="dash-card-value">—</span><div class="dash-card-sub">stats unavailable</div></div>`; return; }
    const now = stats.practices.last_7d, prev = stats.practices.prev_7d;
    const delta = now - prev;
    const deltaPill = prev > 0 || delta !== 0
      ? `<span class="delta-pill ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta > 0 ? '↗ +' : delta < 0 ? '↘ ' : ''}${delta}${delta > 0 ? '%' : ''}</span>`
      : '';
    const cons = stats.weekly.pct;
    const consColor = cons >= 70 ? 'var(--color-success)' : 'var(--color-warning)';
    el.innerHTML =
      this.statCard('layers', stats.skills.total, 'Skills', 'defined in your catalog') +
      this.statCard('zap', stats.skills.active, 'Active', 'being developed') +
      this.statCard('activity', now, 'Practiced this week', `vs. ${prev} last week`, deltaPill) +
      `<div class="dash-card animate-in">
        <span class="dash-card-icon" style="background:var(--gold-tint);color:var(--gold-ink)">${ACSMS.icon('gauge', 20)}</span>
        <div class="dash-card-body">
          <div class="dash-card-top"><span class="dash-card-value">${cons}%</span></div>
          <div class="dash-card-label">Practice consistency</div>
          <div class="dash-card-sub">target ≥ 70%</div>
          <div class="rail-domain-bar" style="margin-top:var(--space-1)"><i style="width:${cons}%;background:${consColor}"></i></div>
        </div>
      </div>`;
  },

  // ── next practice hero ──
  renderHero(stats) {
    const el = document.getElementById('dashHero');
    if (!el) return;
    const np = stats?.next_practice;
    if (!np) {
      el.innerHTML = `<div class="hero-card"><p class="rail-empty" style="margin:0">Define a skill — the recommendation engine needs a catalog.</p></div>`;
      return;
    }
    const reasonIcon = (r) =>
      r.startsWith('Never') ? 'flag' :
      r.startsWith('Target') ? 'clock' :
      r.startsWith('Flagged') ? 'alert-triangle' :
      r.startsWith('Connected') ? 'route' : 'signal';
    const reasons = np.reasons.length ? np.reasons : ['Most due right now'];
    const pct = Math.round((np.level || 0) / 5 * 100);
    el.innerHTML = `<div class="hero-card">
      <div class="hero-eyebrow">${ACSMS.icon('target', 15)} NEXT PRACTICE</div>
      <div class="hero-grid">
        <div class="hero-main">
          <div class="hero-skill">
            <span class="skill-row-icon big">${ACSMS.icon(ACSMS.domainIcon(np.domain), 22)}</span>
            <div class="hero-skill-body">
              <div class="hero-name"><a href="#skills/${np.id}">${ACSMS.esc(np.name)}</a>
                <span class="pill accent">${ACSMS.esc(np.domain || 'General')}</span></div>
              ${np.description ? `<div class="hero-desc">${ACSMS.esc(np.description)}</div>` : ''}
            </div>
          </div>
          <div class="hero-state">
            <span class="hero-state-label">Current state</span>
            <div class="lvl-bar hero-lvl"><i style="width:${pct}%"></i></div>
            <span class="num">${np.level || 0}/5</span>
          </div>
          <div class="hero-meta">
            <div><label>Target frequency</label><b>${np.target_per_week}×/week</b></div>
            <div><label>Last practiced</label><b>${np.last_practiced_ms ? ACSMS.fmtAgo(np.last_practiced_ms) : 'never'}</b></div>
            <div><label>Reports</label><b>${np.practice_count}</b></div>
          </div>
          <button class="btn btn-primary" id="heroStart">Start practice ${ACSMS.icon('arrow-right', 15)}</button>
        </div>
        <div class="hero-why">
          <h4>Why this one?</h4>
          <ul>${reasons.map(r =>
            `<li><span class="act-dot">${ACSMS.icon(reasonIcon(r), 12)}</span><span>${ACSMS.esc(r)}</span></li>`).join('')}</ul>
          <a class="hero-details" href="#skills/${np.id}">View details ${ACSMS.icon('arrow-right', 13)}</a>
        </div>
      </div>
    </div>`;
    document.getElementById('heroStart')?.addEventListener('click', () => ACSMS.capture.open(np.id));
  },

  // ── trajectory ──
  renderTrajectory(stats) {
    const el = document.getElementById('trajectoryCard');
    if (!el) return;
    const traj = stats?.trajectory || [];
    if (!traj.length) { el.innerHTML = ''; return; }
    const fmt = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const targets = ACSMS.Store.skills()
      .filter(s => (s.status || 'active') === 'active')
      .reduce((t, s) => t + (s.target_per_week || 0), 0);
    const series = [
      { name: 'Practice', color: 'var(--oxford)', values: traj.map(w => targets ? Math.min(100, Math.round(100 * w.practices / targets)) : 0) },
      { name: 'Performance', color: 'var(--gold)', values: traj.map(w => w.performance) },
      { name: 'Consistency', color: 'var(--color-success)', values: traj.map(w => w.consistency) },
    ];
    const legend = series.map(s =>
      `<span class="chart-legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.name}</span>`).join('');
    el.innerHTML = ACSMS.view.card('Trajectory', 'Practice & improvement trajectory',
      ACSMS.Charts.line({ labels: traj.map(w => fmt(w.start_ms)), series }),
      'Your progress across key dimensions (last 12 weeks).',
      `<span class="chart-legend">${legend}</span>`);
  },

  // ── recent activity ──
  renderActivity() {
    const el = document.getElementById('dashActivity');
    if (!el) return;
    const EVENTS = { created: ['plus', 'Defined'], updated: ['pencil', 'Updated'], paused: ['pause', 'Paused'], activated: ['play', 'Activated'], retired: ['archive', 'Retired'] };
    const all = ACSMS.Store.activity() || [];
    const items = this.activityExpanded ? all : all.slice(0, 5);
    el.innerHTML = items.length ? items.map(a => {
      const [icon, verb] = a.type === 'practice' ? ['activity', 'Practiced'] : (EVENTS[a.event] || ['pencil', 'Updated']);
      const domain = ACSMS.Store.skillById(a.skill_id || a.id)?.domain;
      return `<a class="act-row" href="#skills/${a.skill_id || a.id}">
        <span class="act-dot">${ACSMS.icon(icon, 12)}</span>
        <span class="act-body"><span class="act-title">${ACSMS.esc(a.skill_name || '')}</span>
        <span class="act-sub">${verb} · ${ACSMS.fmtAgo(a.at_ms)}</span></span>
        ${domain ? `<span class="pill gold">${ACSMS.esc(domain)}</span>` : ''}
      </a>`;
    }).join('') : '<p class="rail-empty">Nothing yet — log the first practice.</p>';
    el.querySelectorAll('.act-row').forEach(a =>
      a.addEventListener('click', (e) => { e.preventDefault(); ACSMS.navigate(a.getAttribute('href').slice(1)); }));
    const t = document.getElementById('activityToggle');
    if (t) {
      t.textContent = this.activityExpanded ? 'View less' : 'View all';
      t.style.visibility = all.length > 5 ? 'visible' : 'hidden';
      t.onclick = () => { this.activityExpanded = !this.activityExpanded; this.renderActivity(); };
    }
  },

  // ── capability gaps ──
  renderGaps(stats) {
    const el = document.getElementById('dashGaps');
    if (!el) return;
    const doms = [...(stats?.domains || [])].sort((a, b) => a.level_pct - b.level_pct);
    el.innerHTML = doms.length ? doms.map(d => `
      <div class="rail-domain">
        <div class="rail-domain-head"><span>${ACSMS.esc(d.domain)}</span><span class="num">${d.level_pct}%</span></div>
        <div class="rail-domain-bar"><i style="width:${d.level_pct}%"></i></div>
      </div>`).join('') : '<p class="rail-empty">No skills yet.</p>';
  },

  // ── attention queue ──
  renderQueue(stats) {
    const q = document.getElementById('attentionQueue');
    if (!q) return;
    if (!stats) { q.innerHTML = ''; return; }
    if (stats.attention.length) {
      q.innerHTML = stats.attention.map(a => {
        const neglected = a.state === 'neglected';
        const tgt = a.target_per_week ? ` · target ${a.target_per_week}×/wk` : '';
        const sub = neglected
          ? `neglected — last practiced ${ACSMS.fmtAgo(a.last_practiced_ms)}${tgt}`
          : `never practiced — defined ${ACSMS.fmtAgo(a.created_at_ms)}${tgt}`;
        return `<a class="queue-item q-${a.state}" href="#skills/${a.id}" data-skill="${a.id}">
          <span class="q-icon">${ACSMS.icon(neglected ? 'alert-triangle' : 'clock', 16)}</span>
          <span class="q-body"><span class="q-title">${ACSMS.esc(a.name)}</span><span class="q-sub">${sub}</span></span>
          <span class="q-act">view skill ${ACSMS.icon('arrow-right', 13)}</span>
        </a>`;
      }).join('');
      q.querySelectorAll('[data-skill]').forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault();
        ACSMS.navigate('skills/' + a.dataset.skill);
      }));
    } else {
      q.innerHTML = `<div class="empty-state" style="padding:var(--space-8) var(--space-4)"><h3>Nothing flagged</h3><p>Every active skill has fresh practice — the tracking layer is quiet.</p></div>`;
    }
  },

  // ── right rail ──
  renderRail(stats) {
    const rail = document.getElementById('dashRail');
    if (!rail) return;
    if (!stats) { rail.innerHTML = ''; return; }

    const overall = stats.overall_level_pct || 0;
    const doms = [...(stats.domains || [])].sort((a, b) => b.level_pct - a.level_pct);
    const domainRows = doms.map(d => `
      <div class="rail-domain">
        <div class="rail-domain-head"><span>${ACSMS.esc(d.domain)}</span><span class="num">${d.level_pct}%</span></div>
        <div class="rail-domain-bar"><i style="width:${d.level_pct}%"></i></div>
      </div>`).join('');

    const w = stats.weekly || { pct: 0, practiced_skills: 0, active_skills: 0 };
    const wp = stats.weekly_prev || { pct: 0 };
    const diff = w.pct - wp.pct;
    const keepSub = diff === 0 ? 'Same as last week.'
      : `That's ${Math.abs(diff)}% ${diff > 0 ? 'higher' : 'lower'} than last week.`;

    const actions = [
      ['layers', 'Browse skill catalog', 'Explore all skills and domains', () => ACSMS.navigate('skills')],
      ['route', 'View skill paths', 'See ordered learning paths', () => ACSMS.navigate('paths')],
      ['plus', 'Add new skill', 'Track a skill you care about', () => ACSMS.Skills.openModal(null)],
      ['activity', 'Log practice', 'Self-report a session', () => ACSMS.capture.open()],
    ];

    rail.innerHTML = `
      <div class="rail-card">
        <h4>Capability state</h4>
        <div class="rail-domain-head"><span>Overall progress</span><span class="num">${overall}%</span></div>
        <div class="rail-domain-bar"><i style="width:${overall}%"></i></div>
        <div style="margin-top:var(--space-4)">${domainRows}</div>
        <a class="hero-details" href="#skills" style="margin-top:var(--space-3)">View full capability map ${ACSMS.icon('arrow-right', 13)}</a>
      </div>
      <div class="rail-card">
        <h4>Quick actions</h4>
        <div class="quick-actions">${actions.map((a, i) =>
          `<button class="quick-action" data-qa="${i}">
             <span class="act-dot">${ACSMS.icon(a[0], 13)}</span>
             <span class="act-body"><span class="act-title">${a[1]}</span><span class="act-sub">${a[2]}</span></span>
             <span class="q-act">${ACSMS.icon('arrow-right', 13)}</span>
           </button>`).join('')}</div>
      </div>
      <div class="rail-card rail-keepgoing">
        <h4>Keep going</h4>
        <p>You're ${w.pct}% consistent this week. ${keepSub}</p>
        <div class="rail-domain-bar"><i style="width:${w.pct}%"></i></div>
        <button class="btn btn-primary btn-sm" id="viewProgress" style="margin-top:var(--space-3)">View progress ${ACSMS.icon('arrow-right', 13)}</button>
      </div>`;
    rail.querySelectorAll('[data-qa]').forEach(b =>
      b.addEventListener('click', () => actions[parseInt(b.dataset.qa, 10)][3]()));
    document.getElementById('viewProgress')?.addEventListener('click', () =>
      document.getElementById('trajectoryCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  },
};
