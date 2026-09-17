/* ════════════════════════════════════════════════════════════
   ACSMS Skills — the capability catalog, its right rail, and the
   per-skill detail view (#skills/<id> sub-route).
   Catalog: domain chips, filter, sort, pagination, rich rows with
   level bars, kebab menus. Detail: statistics, weekly sparkline,
   the skill's practice stream, path memberships, change log.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};

ACSMS.DOMAIN_ICONS = {
  'data & analytics': 'database', 'language': 'globe', 'learning': 'graduation-cap',
  'reasoning': 'brain', 'technical': 'code', 'art': 'heart', 'general': 'box',
};
ACSMS.domainIcon = function (domain) {
  return ACSMS.DOMAIN_ICONS[(domain || 'general').toLowerCase()] || 'box';
};
ACSMS.domainDatalistId = 'domainDatalist';
ACSMS.domainOptionsHTML = function () {
  const domains = [...new Set(ACSMS.Store.skills().map(s => s.domain || 'General'))].sort();
  return `<datalist id="${ACSMS.domainDatalistId}">` +
    domains.map(d => `<option value="${ACSMS.esc(d)}">`).join('') + '</datalist>';
};

ACSMS.Catalog = { q: '', domain: null, sort: 'recent', page: 0, PAGE: 5 };

const STATE_SORT = { 'neglected': 0, 'never-practiced': 1, 'on-track': 2, 'paused': 3, 'retired': 4 };

ACSMS.Skills = {
  // ── router entry ──
  render(sub) {
    if (sub) return this.renderDetail(sub);
    return this.renderCatalog();
  },
  afterRender(sub) {
    if (sub) this.afterRenderDetail(sub);
    else this.afterRenderCatalog();
  },

  // ══ Catalog ══════════════════════════════════════════════
  renderCatalog() {
    const C = ACSMS.Catalog;
    const actions = `<button class="btn btn-primary btn-sm" id="defineSkillBtn">${ACSMS.icon('plus', 15)} Define skill</button>`;
    return `<div class="catalog-layout">
      <div class="catalog-main">
        <div class="animate-in">${ACSMS.view.header('Skill Catalog', actions)}
          <p class="catalog-lede">A curated collection of skills, organized by domain, with practice status, progress and performance history.</p>
        </div>
        <div class="chip-row animate-in delay-1" id="domainChips"></div>
        <div class="catalog-toolbar animate-in delay-1">
          <div class="catalog-filter">
            <span class="search-icon">${ACSMS.icon('search', 15)}</span>
            <input type="search" id="catalogFilter" placeholder="Filter skills by name, description, or tags…" value="${ACSMS.esc(C.q)}">
          </div>
          <select id="catalogSort" class="sort-select" aria-label="Sort skills">
            <option value="recent" ${C.sort === 'recent' ? 'selected' : ''}>Sort: Most recent</option>
            <option value="name" ${C.sort === 'name' ? 'selected' : ''}>Sort: Name</option>
            <option value="state" ${C.sort === 'state' ? 'selected' : ''}>Sort: Practice state</option>
          </select>
        </div>
        <div class="animate-in delay-2">
          <div class="skill-rows" id="skillRows"></div>
          <div class="catalog-pager" id="catalogPager"></div>
        </div>
      </div>
      <aside class="catalog-rail animate-in delay-2" id="catalogRail"></aside>
    </div>`;
  },

  filteredSkills() {
    const C = ACSMS.Catalog;
    let list = [...ACSMS.Store.skills()];
    if (C.domain) list = list.filter(s => (s.domain || 'General') === C.domain);
    if (C.q) {
      const q = C.q.toLowerCase();
      list = list.filter(s => (s.name + ' ' + (s.description || '') + ' ' + (s.tags || []).join(' '))
        .toLowerCase().includes(q));
    }
    if (C.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (C.sort === 'state') list.sort((a, b) =>
      (STATE_SORT[a.practice_state] ?? 9) - (STATE_SORT[b.practice_state] ?? 9) ||
      a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.updated_at_ms || 0) - (a.updated_at_ms || 0)); // recent
    return list;
  },

  renderChips() {
    const C = ACSMS.Catalog;
    const skills = ACSMS.Store.skills();
    const byDomain = {};
    skills.forEach(s => {
      const d = s.domain || 'General';
      byDomain[d] = (byDomain[d] || 0) + 1;
    });
    const domains = Object.keys(byDomain).sort((a, b) => byDomain[b] - byDomain[a] || a.localeCompare(b));
    const chip = (label, count, active, domain) =>
      `<button class="chip ${active ? 'active' : ''}" data-domain="${ACSMS.esc(domain)}">${label}&nbsp;(${count})</button>`;
    document.getElementById('domainChips').innerHTML =
      chip('All', skills.length, !C.domain, '') + ' ' +
      domains.map(d => chip(ACSMS.esc(d), byDomain[d], C.domain === d, d)).join('');
  },

  renderRows() {
    const C = ACSMS.Catalog;
    const list = this.filteredSkills();
    const pages = Math.max(1, Math.ceil(list.length / C.PAGE));
    C.page = Math.min(C.page, pages - 1);
    const slice = list.slice(C.page * C.PAGE, (C.page + 1) * C.PAGE);
    const rows = document.getElementById('skillRows');
    rows.innerHTML = slice.length
      ? slice.map(s => this.rowHTML(s)).join('')
      : `<div class="empty-state"><h3>No skills match</h3><p>Adjust the filters, or define the skill — practice can only be reported on defined skills.</p></div>`;
    const from = list.length ? C.page * C.PAGE + 1 : 0;
    const to = Math.min((C.page + 1) * C.PAGE, list.length);
    document.getElementById('catalogPager').innerHTML =
      `<span class="pager-info">Showing ${from}–${to} of ${list.length} skill${list.length === 1 ? '' : 's'}</span>
       <span class="pager-btns">
         <button class="btn btn-secondary btn-sm" data-page="prev" ${C.page === 0 ? 'disabled' : ''}>‹</button>
         <span class="pager-ind">${C.page + 1} / ${pages}</span>
         <button class="btn btn-secondary btn-sm" data-page="next" ${C.page >= pages - 1 ? 'disabled' : ''}>›</button>
       </span>`;
    this.bindRows();
  },

  rowHTML(s) {
    const retired = (s.status || 'active') === 'retired';
    const last = s.last_practiced_ms ? ACSMS.fmtAgo(s.last_practiced_ms) : 'never';
    const pct = Math.round((s.level || 0) / 5 * 100);
    return `<div class="skill-row" data-id="${s.id}">
      <span class="skill-row-icon" title="${ACSMS.esc(s.domain || 'General')}">${ACSMS.icon(ACSMS.domainIcon(s.domain), 18)}</span>
      <div class="skill-row-main">
        <div class="skill-row-title">${ACSMS.esc(s.name)}</div>
        ${s.description ? `<div class="skill-row-desc">${ACSMS.esc(s.description)}</div>` : ''}
        ${s.tags?.length ? `<div class="skill-tags">${s.tags.map(t => `<span class="pill gold">${ACSMS.esc(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="skill-row-domain"><span class="dom-icon">${ACSMS.icon(ACSMS.domainIcon(s.domain), 14)}</span><span>${ACSMS.esc(s.domain || 'General')}</span></div>
      <div class="skill-row-status">${ACSMS.statusPill(s.status)}</div>
      <div class="skill-row-progress">
        <div class="lvl-bar"><i style="width:${pct}%"></i></div>
        <span class="lvl-frac">${s.level || 0}/5</span>
        <span class="lvl-pct">${pct}%</span>
      </div>
      <div class="skill-row-target num">${s.target_per_week ? s.target_per_week + '×/wk' : '—'}</div>
      <div class="skill-row-last num">${retired ? '—' : last}</div>
      <div class="skill-row-actions">
        <button class="btn-icon" data-stats="${s.id}" title="Statistics" aria-label="Open skill detail">${ACSMS.icon('bar-chart-3', 15)}</button>
        <button class="btn-icon" data-edit="${s.id}" title="Edit" aria-label="Edit skill">${ACSMS.icon('pencil', 15)}</button>
        <button class="btn-icon" data-kebab="${s.id}" title="More" aria-label="More actions">${ACSMS.icon('ellipsis', 15)}</button>
      </div>
    </div>`;
  },

  bindRows() {
    document.querySelectorAll('#skillRows .skill-row').forEach(row =>
      row.addEventListener('click', () => ACSMS.navigate('skills/' + row.dataset.id)));
    document.querySelectorAll('#skillRows [data-stats]').forEach(b =>
      b.addEventListener('click', (e) => { e.stopPropagation(); ACSMS.navigate('skills/' + b.dataset.stats); }));
    document.querySelectorAll('#skillRows [data-edit]').forEach(b =>
      b.addEventListener('click', (e) => { e.stopPropagation(); this.openModal(ACSMS.Store.skillById(b.dataset.edit)); }));
    document.querySelectorAll('#skillRows [data-kebab]').forEach(b =>
      b.addEventListener('click', (e) => { e.stopPropagation(); this.openKebab(e, b.dataset.kebab); }));
    document.querySelectorAll('#domainChips .chip').forEach(ch =>
      ch.addEventListener('click', () => {
        ACSMS.Catalog.domain = ch.dataset.domain || null;
        ACSMS.Catalog.page = 0;
        this.renderChips(); this.renderRows();
      }));
    const filter = document.getElementById('catalogFilter');
    filter?.addEventListener('input', () => {
      ACSMS.Catalog.q = filter.value.trim();
      ACSMS.Catalog.page = 0;
      this.renderRows();
    });
    document.getElementById('catalogSort')?.addEventListener('change', (e) => {
      ACSMS.Catalog.sort = e.target.value;
      this.renderRows();
    });
    document.querySelectorAll('#catalogPager [data-page]').forEach(b =>
      b.addEventListener('click', () => {
        ACSMS.Catalog.page += b.dataset.page === 'next' ? 1 : -1;
        this.renderRows();
      }));
  },

  // ── kebab popover (log practice / pause / retire / delete) ──
  closeKebab() { document.querySelectorAll('.kebab-menu').forEach(m => m.remove()); },
  openKebab(ev, skillId) {
    this.closeKebab();
    const s = ACSMS.Store.skillById(skillId);
    if (!s) return;
    const retired = (s.status || 'active') === 'retired';
    const paused = s.status === 'paused';
    const items = [
      { icon: 'plus', label: 'Log practice', act: () => ACSMS.capture.open(s.id), hide: retired },
      { icon: 'bar-chart-3', label: 'Statistics', act: () => ACSMS.navigate('skills/' + s.id) },
      { icon: paused ? 'play' : 'pause', label: paused ? 'Activate' : 'Pause', act: () => this.setStatus(s, paused ? 'active' : 'paused') },
      { icon: retired ? 'play' : 'archive', label: retired ? 'Reactivate' : 'Retire (cull)', act: () => retired ? this.setStatus(s, 'active') : this.retire(s), hide: retired },
      { icon: 'trash-2', label: 'Delete', act: () => this.destroy(s), hide: s.practice_count > 0 },
    ];
    const menu = document.createElement('div');
    menu.className = 'kebab-menu';
    menu.innerHTML = items.filter(i => !i.hide).map((i, idx) =>
      `<button class="kebab-item" data-idx="${idx}">${ACSMS.icon(i.icon, 15)} ${i.label}</button>`).join('');
    document.body.appendChild(menu);
    const r = ev.currentTarget.getBoundingClientRect();
    menu.style.top = Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
    menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 8) + 'px';
    menu.querySelectorAll('.kebab-item').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeKebab();
      items.filter(i => !i.hide)[parseInt(btn.dataset.idx, 10)].act();
    }));
    setTimeout(() => document.addEventListener('click', this.closeKebab, { once: true }), 0);
  },

  async setStatus(s, status) {
    try {
      await ACSMS.Store.updateSkill(s.id, { status });
      await ACSMS.Store.refresh();
      this.refreshCurrent();
      ACSMS.updateFooter();
      ACSMS.toast(`Skill ${status === 'paused' ? 'paused' : status === 'retired' ? 'retired — decision recorded' : 'activated'}`);
    } catch (e) { ACSMS.toast('Could not update: ' + e.message); }
  },
  async retire(s) {
    const ok = await AUTOREGIA.confirmDialog({
      title: 'Retire this skill?',
      message: `“${s.name}” keeps its practice history but leaves active maintenance — the cull decision is recorded and practice can no longer be reported on it.`,
      confirmText: 'Retire',
    });
    if (ok) this.setStatus(s, 'retired');
  },
  async destroy(s) {
    const ok = await AUTOREGIA.confirmDialog({
      title: 'Delete this skill?',
      message: `“${s.name}” has no practice history, so it can be hard-deleted. Practiced skills must be retired instead.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await ACSMS.Store.deleteSkill(s.id);
      await ACSMS.Store.refresh();
      this.refreshCurrent();
      ACSMS.toast('Skill deleted');
    } catch (e) { ACSMS.toast('Could not delete: ' + e.message); }
  },
  refreshCurrent() {
    if (ACSMS.currentBase === 'skills') ACSMS.navigate(ACSMS.current);
    else this.renderRows();
  },

  afterRenderCatalog() {
    document.getElementById('defineSkillBtn')?.addEventListener('click', () => this.openModal(null));
    this.renderChips();
    this.renderRows();
    this.renderRail();
  },

  // ══ Right rail ═══════════════════════════════════════════
  donutSVG(segments) {
    // segments: [{value, color}] — stroke-dasharray on a 100-unit circumference
    const total = segments.reduce((t, s) => t + s.value, 0);
    let acc = 0;
    const circles = segments.filter(s => s.value > 0).map(s => {
      const pct = 100 * s.value / total;
      const c = `<circle r="15.9155" cx="21" cy="21" fill="none" style="stroke:${s.color}" stroke-width="6"
        stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - acc}" stroke-linecap="butt"></circle>`;
      acc += pct;
      return c;
    }).join('');
    return `<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="progress overview">${circles}</svg>`;
  },

  renderRail() {
    const rail = document.getElementById('catalogRail');
    if (!rail) return;
    const st = ACSMS.Store.stats();
    if (!st) { rail.innerHTML = ''; return; }

    const states = st.states;
    const nonRetired = st.skills.total - states.retired;
    const donut = this.donutSVG([
      { value: states['on-track'], color: 'var(--color-success)' },
      { value: states['neglected'], color: 'var(--color-danger)' },
      { value: states['never-practiced'], color: 'var(--color-warning)' },
      { value: states.paused, color: 'var(--color-info)' },
    ]);
    const legend = [
      ['On track', states['on-track'], 'var(--color-success)'],
      ['Neglected', states['neglected'], 'var(--color-danger)'],
      ['Never practiced', states['never-practiced'], 'var(--color-warning)'],
      ['Paused', states.paused, 'var(--color-info)'],
      ['Retired', states.retired, 'var(--ink-5)'],
    ].map(([label, n, color]) =>
      `<div class="legend-row"><span class="legend-dot" style="background:${color}"></span><span>${label}</span><span class="legend-val num">${n}</span></div>`).join('');

    const domainRows = (st.domains || []).map(d => {
      const onTrack = d['on-track'] || 0;
      const pct = d.total ? Math.round(100 * onTrack / d.total) : 0;
      return `<div class="rail-domain">
        <div class="rail-domain-head"><span>${ACSMS.esc(d.domain)}</span><span class="num">${d.total}</span></div>
        <div class="rail-domain-bar"><i style="width:${pct}%"></i></div>
      </div>`;
    }).join('');

    const EVENTS = { created: ['plus', 'Defined'], updated: ['pencil', 'Updated'], paused: ['pause', 'Paused'], activated: ['play', 'Activated'], retired: ['archive', 'Retired'] };
    const actRows = (ACSMS.Store.activity() || []).slice(0, 8).map(a => {
      const [icon, verb] = a.type === 'practice'
        ? ['activity', 'Practiced']
        : (EVENTS[a.event] || ['pencil', 'Updated']);
      const href = a.type === 'practice' ? 'skills/' + a.skill_id : 'skills/' + a.id;
      return `<a class="act-row" href="#${href}">
        <span class="act-dot">${ACSMS.icon(icon, 12)}</span>
        <span class="act-body"><span class="act-title">${ACSMS.esc(a.skill_name || '')}</span>
        <span class="act-sub">${verb} · ${ACSMS.fmtAgo(a.at_ms)}</span></span>
      </a>`;
    }).join('');

    const w = st.weekly || { pct: 0, practiced_skills: 0, active_skills: 0 };
    rail.innerHTML = `
      <div class="rail-card">
        <h4>Progress Overview</h4>
        <div class="donut-wrap">
          ${donut}
          <div class="donut-center"><div class="donut-big">${nonRetired}/${st.skills.total}</div><div class="donut-sub">skills active</div></div>
        </div>
        <div class="legend">${legend}</div>
      </div>
      <div class="rail-card">
        <h4>Domains</h4>
        ${domainRows || '<p class="rail-empty">No skills yet.</p>'}
      </div>
      <div class="rail-card">
        <h4>Recent Activity</h4>
        <div class="act-list">${actRows || '<p class="rail-empty">Nothing yet — log the first practice.</p>'}</div>
      </div>
      <div class="rail-card rail-keepgoing">
        <h4>Keep going</h4>
        <p>You're ${w.pct}% of the way to your weekly practice milestone.</p>
        <div class="rail-domain-bar"><i style="width:${w.pct}%"></i></div>
        <span class="rail-note num">${w.practiced_skills}/${w.active_skills} skills practiced this week</span>
      </div>`;
    rail.querySelectorAll('.act-row').forEach(a =>
      a.addEventListener('click', (e) => { e.preventDefault(); ACSMS.navigate(a.getAttribute('href').slice(1)); }));
  },

  // ══ Skill detail (#skills/<id>) ══════════════════════════
  renderDetail(skillId) {
    const s = ACSMS.Store.skillById(skillId);
    if (!s) return `<div class="animate-in">${ACSMS.view.header('Skill')}
      <div class="empty-state"><h3>Skill not found</h3><p><a href="#skills">← Back to the catalog</a></p></div></div>`;
    const retired = (s.status || 'active') === 'retired';
    return `<div class="animate-in">
      <a class="back-link" href="#skills">← Skill Catalog</a>
      <div class="detail-hero">
        <span class="skill-row-icon big">${ACSMS.icon(ACSMS.domainIcon(s.domain), 22)}</span>
        <div class="detail-hero-main">
          <div class="detail-title-row">
            <h1>${ACSMS.esc(s.name)}</h1>
            ${ACSMS.statusPill(s.status)} ${ACSMS.statePill(s.practice_state)}
          </div>
          <div class="detail-meta">
            <span class="dom-icon">${ACSMS.icon(ACSMS.domainIcon(s.domain), 14)}</span> ${ACSMS.esc(s.domain || 'General')}
            <span class="dot-sep">·</span> target ${s.target_per_week}×/wk
            <span class="dot-sep">·</span> level ${s.level || 0}/5
            ${s.tags?.length ? `<span class="dot-sep">·</span> ${s.tags.map(t => `<span class="pill gold">${ACSMS.esc(t)}</span>`).join(' ')}` : ''}
          </div>
          ${s.description ? `<p class="detail-desc">${ACSMS.esc(s.description)}</p>` : ''}
        </div>
        <div class="detail-hero-actions">
          <button class="btn btn-primary btn-sm" id="detailLogBtn" ${retired ? 'disabled title="Skill is retired"' : ''}>${ACSMS.icon('plus', 15)} Log practice</button>
          <button class="btn btn-secondary btn-sm" id="detailEditBtn">${ACSMS.icon('pencil', 14)} Edit</button>
          <button class="btn-icon" id="detailKebab" aria-label="More actions">${ACSMS.icon('ellipsis', 15)}</button>
        </div>
      </div>
      <div class="stat-row animate-in delay-1" id="detailStats"></div>
      <div class="chart-grid-2">
        <div class="animate-in delay-2">${ACSMS.view.card('Tracking', 'Practice rhythm',
          `<div id="detailSpark"></div>`,
          'Weekly self-reports over the last 12 weeks.')}
        </div>
        <div class="animate-in delay-2">${ACSMS.view.card('Programs', 'Path memberships',
          `<div id="detailPaths"></div>`)}
        </div>
      </div>
      <div class="animate-in delay-3" style="margin-bottom:var(--space-6)">
        ${ACSMS.view.card('Stream', 'Practice log',
          `<div class="practice-feed" id="detailFeed"></div>`)}
      </div>
      <div class="animate-in delay-4">
        ${ACSMS.view.card('History', 'Change log',
          `<div class="change-log" id="detailChanges"></div>`,
          'Every definition, edit, and lifecycle decision recorded on this skill.')}
      </div>
    </div>`;
  },

  renderDetailData(skillId, practices) {
    const s = ACSMS.Store.skillById(skillId);
    if (!s) return;
    const statsEl = document.getElementById('detailStats');
    const now = Date.now();
    const total = practices.length;
    const avg = (k) => {
      const vals = practices.map(p => p[k]).filter(v => v != null);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    };
    const q = avg('quality'), c = avg('confidence');
    const target4 = (s.target_per_week || 1) * 4;
    const last28 = practices.filter(p => (p.practiced_at_ms || 0) >= now - 28 * 86_400_000).length;
    const consistencyPct = Math.min(100, Math.round(100 * last28 / target4));
    statsEl.innerHTML =
      ACSMS.view.statCard(total, 'Practice reports') +
      ACSMS.view.statCard(s.last_practiced_ms ? ACSMS.fmtAgo(s.last_practiced_ms) : 'never', 'Last practiced') +
      ACSMS.view.statCard(q ? `${q}/5` : '—', 'Avg quality') +
      ACSMS.view.statCard(c ? `${c}/5` : '—', 'Avg confidence') +
      ACSMS.view.statCard(`${last28}/${target4}`, '28d vs target', consistencyPct < 50 && total ? 'var(--color-warning)' : '');

    // 12-week sparkline (hand-rolled SVG bars — no chart dependency)
    const weeks = 12;
    const counts = new Array(weeks).fill(0);
    practices.forEach(p => {
      const age = now - (p.practiced_at_ms || 0);
      const w = Math.floor(age / (7 * 86_400_000));
      if (w >= 0 && w < weeks) counts[weeks - 1 - w]++;
    });
    const max = Math.max(1, ...counts);
    const bars = counts.map((n, i) => {
      const h = Math.round(4 + 56 * n / max);
      return `<rect x="${i * 24 + 6}" y="${64 - h}" width="14" height="${h}" rx="2"
        style="fill:${n ? 'var(--oxford)' : 'var(--color-surface-2)'}"><title>${n} practice${n === 1 ? '' : 's'} · week -${weeks - 1 - i}</title></rect>`;
    }).join('');
    const spark = document.getElementById('detailSpark');
    if (spark) spark.innerHTML = `<svg viewBox="0 0 300 68" class="sparkline">${bars}</svg>
      <div class="spark-caption num">total ${total} report${total === 1 ? '' : 's'} · ${s.practice_state}</div>`;

    const pathsIn = ACSMS.Store.paths().filter(p => (p.skill_ids || []).includes(skillId));
    const pathsEl = document.getElementById('detailPaths');
    if (pathsEl) pathsEl.innerHTML = pathsIn.length
      ? pathsIn.map(p => `<a class="path-chip" href="#paths" data-path="${p.id}">
          <span>${ACSMS.icon('route', 14)}</span> ${ACSMS.esc(p.name)}
          <span class="num">${p.completion_pct}%</span></a>`).join('')
      : `<p class="rail-empty">Not part of any path — <a href="#paths">browse skill paths</a>.</p>`;
    pathsEl?.querySelectorAll('[data-path]').forEach(a =>
      a.addEventListener('click', (e) => { e.preventDefault(); ACSMS.navigate('paths'); }));

    const feed = document.getElementById('detailFeed');
    if (feed) {
      feed.innerHTML = practices.length
        ? practices.map(ACSMS.Practice.practiceCard).join('')
        : `<div class="empty-state"><h3>No practice reported</h3><p>Log the first session — the tracking layer needs history.</p></div>`;
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
          ACSMS.navigate(ACSMS.current);
          ACSMS.updateFooter();
        } catch (e) { ACSMS.toast('Could not delete: ' + e.message); }
      }));
    }

    const changes = s.changes || [];
    const EVENTS = { created: ['plus', 'Defined'], updated: ['pencil', 'Updated'], paused: ['pause', 'Paused'], activated: ['play', 'Activated'], retired: ['archive', 'Retired'] };
    const fmtVal = (f, v) => f === 'target_per_week' ? `${v}×/wk`
      : Array.isArray(v) ? (v.length ? v.join(', ') : '—')
      : (v == null || v === '' ? '—' : String(v));
    const log = document.getElementById('detailChanges');
    if (log) log.innerHTML = changes.length ? [...changes].reverse().slice(0, 12).map(ch => {
      const [icon, verb] = EVENTS[ch.event] || ['pencil', 'Updated'];
      const diffs = (ch.changes || []).map(d =>
        `<span class="change-diff"><b>${d.field}</b> ${ACSMS.esc(fmtVal(d.field, d.from))} → ${ACSMS.esc(fmtVal(d.field, d.to))}</span>`);
      return `<div class="change-row">
        <span class="act-dot">${ACSMS.icon(icon, 12)}</span>
        <span class="act-body"><span class="act-title">${verb}
          <span class="num">${ACSMS.fmtAgo(ch.at_ms)}</span></span>
          <span class="act-sub">${diffs.join(' ') || 'initial definition'}</span></span>
      </div>`;
    }).join('') : '<p class="rail-empty">No changes recorded.</p>';
  },

  afterRenderDetail(skillId) {
    const s = ACSMS.Store.skillById(skillId);
    if (!s) return;
    document.getElementById('detailLogBtn')?.addEventListener('click', () => ACSMS.capture.open(skillId));
    document.getElementById('detailEditBtn')?.addEventListener('click', () => this.openModal(s));
    document.getElementById('detailKebab')?.addEventListener('click', (e) => this.openKebab(e, skillId));
    // full history for this skill (the store only pages the global stream)
    ACSMS.Store.loadSkillPractices(skillId).then(practices => this.renderDetailData(skillId, practices));
  },

  // ══ Define / edit modal ══════════════════════════════════
  openModal(skill) {
    const isEdit = !!skill;
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    const lvlBtns = [0, 1, 2, 3, 4, 5].map(n =>
      `<button type="button" data-val="${n}" class="${(skill?.level || 0) === n ? 'active' : ''}">${n}</button>`).join('');
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'Edit' : 'Define'} skill">
      <div class="modal-header"><h2>${isEdit ? 'Edit skill' : 'Define skill'}</h2>
        <button class="btn-icon" aria-label="Close" data-close>${AUTOREGIA._xSvg}</button></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group span-2"><label for="sk-name">Name</label>
            <input type="text" id="sk-name" maxlength="120" placeholder="e.g. Systems thinking" value="${isEdit ? ACSMS.esc(skill.name) : ''}"></div>
          <div class="form-group span-2"><label for="sk-desc">Description</label>
            <textarea id="sk-desc" rows="3" placeholder="What does being capable here mean? What evidence demonstrates it?">${isEdit ? ACSMS.esc(skill.description || '') : ''}</textarea></div>
          <div class="form-group"><label for="sk-domain">Domain</label>
            <input type="text" id="sk-domain" list="${ACSMS.domainDatalistId}" maxlength="40" placeholder="e.g. Technical" value="${isEdit ? ACSMS.esc(skill.domain || 'General') : 'General'}">
            ${ACSMS.domainOptionsHTML()}</div>
          <div class="form-group"><label for="sk-tags">Tags</label>
            <input type="text" id="sk-tags" placeholder="comma, separated" value="${isEdit ? ACSMS.esc((skill.tags || []).join(', ')) : ''}"></div>
          <div class="form-group"><label for="sk-target">Target (per week)</label>
            <input type="number" id="sk-target" min="0.25" max="70" step="0.25" value="${isEdit ? (skill.target_per_week || 1) : 1}">
            <div class="form-hint">Drives the neglected detector: stale at 2× the target interval.</div></div>
          <div class="form-group"><label>Status</label>
            <select id="sk-status">
              <option value="active" ${isEdit && skill.status !== 'active' ? '' : 'selected'}>active</option>
              <option value="paused" ${isEdit && skill.status === 'paused' ? 'selected' : ''}>paused</option>
              ${isEdit ? `<option value="retired" ${skill.status === 'retired' ? 'selected' : ''}>retired</option>` : ''}
            </select></div>
          <div class="form-group rating-field"><label>Level (mastery 0–5)</label>
            <div class="rating-seg" id="sk-level">${lvlBtns}</div>
            <span class="rating-hint">Self-assessed progress; shown as the catalog bar.</span></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" data-close>Cancel</button>
        <button class="btn btn-primary btn-sm" data-save>${isEdit ? 'Save changes' : 'Define skill'}</button>
      </div></div>`;
    document.body.appendChild(ov);
    const dlg = AUTOREGIA.dialog(ov, { label: isEdit ? 'Edit skill' : 'Define skill' });
    const close = () => { dlg.close(); ov.remove(); };
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    const lvl = ov.querySelector('#sk-level');
    lvl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      lvl.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    ov.querySelector('[data-save]').addEventListener('click', async () => {
      const body = {
        name: ov.querySelector('#sk-name').value.trim(),
        description: ov.querySelector('#sk-desc').value.trim(),
        tags: ov.querySelector('#sk-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        domain: ov.querySelector('#sk-domain').value.trim() || 'General',
        target_per_week: parseFloat(ov.querySelector('#sk-target').value) || 1,
        status: ov.querySelector('#sk-status').value,
        level: parseInt(lvl.querySelector('.active')?.dataset.val || '0', 10),
      };
      if (!body.name) { ACSMS.toast('A skill needs a name'); return; }
      try {
        if (isEdit) await ACSMS.Store.updateSkill(skill.id, body);
        else await ACSMS.Store.createSkill(body);
        await ACSMS.Store.refresh();
        this.refreshCurrent();
        ACSMS.updateFooter();
        ACSMS.toast(isEdit ? 'Skill updated — change recorded' : 'Skill defined — practice can now be reported on it');
        close();
      } catch (e) { ACSMS.toast('Could not save: ' + e.message); }
    });
    setTimeout(() => ov.querySelector('#sk-name').focus(), 100);
  },
};
