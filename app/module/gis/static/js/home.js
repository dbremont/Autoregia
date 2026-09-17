/* ════════════════════════════════════════════════════════════
   GIS Home — the General Index view.

   One filtered, paginated projection of every entry:
   hero stats · kind-group tabs · table/grid · pagination,
   flanked by a right rail (quick actions, filters, tags,
   knowledge-graph preview, recent activity).
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};

PT.HomeIndex = (() => {
  const PER_PAGE = 12;
  const state = {
    q: '', group: '', kinds: [], space: '', pinned: false, tag: '',
    sort: 'relevance', page: 1, mode: 'list',
  };
  let overview = null;
  let tagsExpanded = false;
  let railGraphChart = null;

  // ── helpers ────────────────────────────────────────────────
  function fmtDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    return isNaN(d) ? PT.esc(s) : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function rel(ts) {
    if (!ts) return '';
    const s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (isNaN(s)) return '';
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function kindBadge(kind) {
    const c = PT.kindColor(kind);
    return '<span class="ix-kind-badge" style="color:' + c + ';background:' + c + '1A;border-color:' + c + '40">' +
      PT.esc(PT.prettyEnum(kind)) + '</span>';
  }
  function localOverview() {
    const entries = PT.Store.getAll();
    const kinds = {}; let relCount = 0; const tags = {}; let week = 0;
    const cutoff = Date.now() - 7 * 86400000;
    entries.forEach(e => {
      kinds[e.object_kind] = (kinds[e.object_kind] || 0) + 1;
      relCount += (e.relations || []).length;
      (e.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; });
      if (e.updated_at && new Date(e.updated_at).getTime() >= cutoff) week++;
    });
    const groups = {};
    Object.keys(PT.KIND_GROUPS).forEach(g => {
      groups[g] = PT.KIND_GROUPS[g].reduce((n, k) => n + (kinds[k] || 0), 0);
    });
    return {
      total: entries.length, added_this_week: week,
      kinds: Object.keys(kinds).length, relationships: relCount,
      last_updated: entries.reduce((m, e) => (e.updated_at || '') > m ? e.updated_at : m, '') || null,
      by_kind: kinds, by_group: groups,
      by_space: entries.reduce((a, e) => { const s = e.space || 'personal'; a[s] = (a[s] || 0) + 1; return a; }, {}),
      top_tags: Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, c]),
    };
  }

  // ── query building ─────────────────────────────────────────
  function queryParams() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.group) p.set('group', state.group);
    if (state.kinds.length) p.set('kinds', state.kinds.join(','));
    if (state.space) p.set('space', state.space);
    if (state.pinned) p.set('pinned', 'true');
    if (state.tag) p.set('tag', state.tag);
    if (state.sort !== 'relevance') p.set('sort', state.sort);
    p.set('page', state.page); p.set('per_page', PER_PAGE);
    return p.toString();
  }

  function localIndex() {
    let entries = PT.Store.getAll();
    const q = state.q.toLowerCase();
    if (state.group) { const g = PT.KIND_GROUPS[state.group] || []; entries = entries.filter(e => g.includes(e.object_kind)); }
    if (state.kinds.length) entries = entries.filter(e => state.kinds.includes(e.object_kind));
    if (state.space === 'favorites') entries = entries.filter(e => e.pinned);
    else if (state.space) entries = entries.filter(e => (e.space || 'personal') === state.space);
    if (state.tag) entries = entries.filter(e => (e.tags || []).some(t => t.toLowerCase() === state.tag.toLowerCase()));
    if (q) entries = PT.Store.search(state.q);
    const by = {
      name: (a, b) => (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1,
      created: (a, b) => (b.created_at || '') > (a.created_at || '') ? 1 : -1,
      updated: (a, b) => (b.updated_at || '') > (a.updated_at || '') ? 1 : -1,
    }[state.sort];
    if (by) entries = [...entries].sort(by);
    else if (q) entries = entries;
    else entries = [...entries].sort((a, b) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
      ((b.updated_at || '') > (a.updated_at || '') ? 1 : -1));
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / PER_PAGE));
    const page = Math.min(state.page, pages);
    return { entries: entries.slice((page - 1) * PER_PAGE, page * PER_PAGE), total, page, pages };
  }

  // ── render: static shell ───────────────────────────────────
  function statCards() {
    const o = overview;
    return (
      card('Total Entries', o ? o.total : '—', o && o.added_this_week ? '+' + o.added_this_week + ' this week' : '', 'book-open') +
      card('Kinds', o ? o.kinds : '—', 'across categories', 'layers') +
      card('Relationships', o ? o.relationships : '—', 'linked items', 'share-2') +
      card('Updated', o && o.last_updated ? fmtDate(o.last_updated) : '—', 'latest change', 'calendar')
    );
    function card(label, value, sub, icon) {
      return '<div class="ix-stat"><span class="ix-stat-icon">' + PT.icon(icon, 20) + '</span>' +
        '<div><div class="ix-stat-label">' + label + '</div>' +
        '<div class="ix-stat-value">' + value + '</div>' +
        (sub ? '<div class="ix-stat-sub">' + PT.esc(sub) + '</div>' : '') + '</div></div>';
    }
  }

  function tabsHTML() {
    const groups = [['', 'All']].concat(Object.keys(PT.KIND_GROUPS).map(g => [g, PT.prettyEnum(g)]));
    return groups.map(g => {
      const id = g[0], label = g[1];
      const count = overview ? (overview.by_group[id] || (id === '' ? overview.total : 0)) : null;
      const active = (id === '' && !state.group) || state.group === id;
      return '<button class="ix-tab' + (active ? ' active' : '') + '" data-group="' + id + '">' + label +
        (count != null ? ' <span class="ix-tab-count">' + count + '</span>' : '') + '</button>';
    }).join('');
  }

  function activeChips() {
    const chips = [];
    if (state.space === 'favorites') chips.push(['pinned', 'Favorites']);
    else if (state.space) chips.push(['space', PT.prettyEnum(state.space)]);
    if (state.tag) chips.push(['tag', '#' + state.tag]);
    state.kinds.forEach(k => chips.push(['kind:' + k, PT.prettyEnum(k)]));
    if (!chips.length) return '';
    return chips.map(c => '<button class="ix-chip" data-clear="' + PT.esc(c[0]) + '">' + PT.esc(c[1]) +
      '<pt-icon name="x" size="11"></pt-icon></button>').join('');
  }

  function render() {
    const sortOpts = [
      ['relevance', 'Relevance'], ['updated', 'Recently Updated'],
      ['name', 'Name'], ['created', 'Recently Added'],
    ].map(o => '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('');
    return '<div class="home">' +
      '<section class="home-main">' +
        '<div class="home-hero">' +
          '<div class="eyebrow">Entry Point</div>' +
          '<h1 class="home-hero-title">General Index</h1>' +
          '<div class="hero-rule"></div>' +
          '<p class="home-hero-lede">Your complete knowledge space. Everything from tools and technologies ' +
          'to projects, people, places and ideas — organized, searchable and connected.</p>' +
        '</div>' +
        '<div class="home-stats" id="homeStats">' + statCards() + '</div>' +
        '<div class="home-tabs" id="homeTabs">' + tabsHTML() + '</div>' +
        '<div class="home-toolbar">' +
          '<div class="ix-chips" id="ixChips">' + activeChips() + '</div>' +
          '<div class="home-toolbar-right">' +
            '<label class="ix-sort-label">' + PT.icon('arrow-up-down', 13) + ' Sort</label>' +
            '<select id="ixSort" aria-label="Sort entries">' + sortOpts + '</select>' +
            '<div class="ix-mode-toggle">' +
              '<button id="ixModeList" class="ix-mode-btn' + (state.mode === 'list' ? ' active' : '') + '" title="List view" aria-label="List view">' + PT.icon('list', 15) + '</button>' +
              '<button id="ixModeGrid" class="ix-mode-btn' + (state.mode === 'grid' ? ' active' : '') + '" title="Grid view" aria-label="Grid view">' + PT.icon('layout-grid', 15) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="homeResults" class="home-results"><p class="text-muted">Consulting the index…</p></div>' +
        '<div class="home-pagination" id="homePagination"></div>' +
      '</section>' +
      '<aside class="home-rail">' +
        '<div class="rail-card"><div class="rail-title">' + PT.icon('command', 13) + ' Quick Actions</div>' +
          '<div class="rail-quick">' +
            '<button class="rail-quick-btn" id="railAdd"><pt-icon name="plus" size="15"></pt-icon><span>Add</span></button>' +
            '<button class="rail-quick-btn" id="railImport"><pt-icon name="upload" size="15"></pt-icon><span>Import</span></button>' +
            '<button class="rail-quick-btn" id="railGraph"><pt-icon name="share-2" size="15"></pt-icon><span>Graph</span></button>' +
          '</div></div>' +
        '<div class="rail-card"><div class="rail-title">' + PT.icon('sliders-horizontal', 13) + ' Filters <button class="rail-clear" id="railClear">Clear all</button></div>' +
          '<div class="rail-sub">Spaces</div>' +
          '<div class="rail-spaces" id="railSpaces"></div>' +
          '<div class="rail-sub">Kinds</div>' +
          '<input type="search" id="railKindSearch" class="rail-search" placeholder="Search kinds…">' +
          '<div class="rail-checks" id="railKinds"></div></div>' +
        '<div class="rail-card"><div class="rail-title">' + PT.icon('tag', 13) + ' Tags</div>' +
          '<input type="search" id="railTagSearch" class="rail-search" placeholder="Search tags…">' +
          '<div class="rail-tags" id="railTags"></div></div>' +
        '<div class="rail-card"><div class="rail-title">' + PT.icon('share-2', 13) + ' Knowledge Graph</div>' +
          '<div id="railGraph" class="rail-graph"></div>' +
          '<a class="rail-link" href="#graph">Explore relationships between entries <pt-icon name="arrow-right" size="13"></pt-icon></a></div>' +
        '<div class="rail-card"><div class="rail-title">' + PT.icon('history', 13) + ' Recent Activity</div>' +
          '<div id="railActivity" class="rail-activity"><p class="text-muted text-sm">…</p></div></div>' +
      '</aside>' +
    '</div>';
  }

  // ── results painting ───────────────────────────────────────
  function rowHTML(e) {
    const icon = PT.KIND_ICONS[e.object_kind] || 'circle';
    const color = PT.kindColor(e.object_kind);
    const tags = (e.tags || []).slice(0, 3).map(t =>
      '<span class="ix-tag" data-tag="' + PT.esc(t) + '">#' + PT.esc(t) + '</span>').join('');
    return '<div class="ix-row" onclick="PT.openEntry(\'' + e.id + '\')">' +
      '<div class="ix-entity"><span class="ix-entity-icon" style="color:' + color + ';background:' + color + '14">' + PT.icon(icon, 17) + '</span>' +
        '<span class="ix-entity-name">' + PT.esc(e.name) + '</span>' +
        (e.pinned ? '<span class="ix-pin">' + PT.icon('pin', 12) + '</span>' : '') + '</div>' +
      '<div class="ix-desc">' + PT.esc(e.summary || '—') + '</div>' +
      '<div class="ix-kindcell">' + kindBadge(e.object_kind) + '</div>' +
      '<div class="ix-tags">' + tags + '</div>' +
      '<div class="ix-updated">' + fmtDate(e.updated_at) + '</div>' +
      '<div class="ix-chevron">' + PT.icon('chevron-right', 15) + '</div>' +
    '</div>';
  }

  function paintResults(data, offline) {
    const box = document.getElementById('homeResults'); if (!box) return;
    if (offline) {
      box.insertAdjacentHTML('afterbegin',
        '<div class="ix-offline-banner" role="status">Server unreachable — showing locally cached entries.</div>');
    }
    if (!data.entries.length) {
      box.innerHTML = '<div class="empty-state"><div class="empty-icon">' + PT.icon('search', 40) + '</div>' +
        '<h3>Nothing found</h3><p>No entries match the current filters. Clear a filter or add a new entry.</p></div>';
      paintPagination(data); return;
    }
    if (state.mode === 'grid') {
      box.innerHTML = '<div class="ix-grid">' + data.entries.map(e => PT.Entry._card(e)).join('') + '</div>';
    } else {
      box.innerHTML = '<div class="ix-table"><div class="ix-head">' +
        '<div>Entity</div><div>Description</div><div>Kind</div><div>Tags</div><div>Updated</div><div></div>' +
        '</div>' + data.entries.map(rowHTML).join('') + '</div>';
    }
    paintPagination(data);
  }

  function paintPagination(data) {
    const box = document.getElementById('homePagination'); if (!box) return;
    const from = data.total === 0 ? 0 : (data.page - 1) * PER_PAGE + 1;
    const to = Math.min(data.page * PER_PAGE, data.total);
    let nums = '';
    const span = 2, p = data.page, last = data.pages;
    const pages = new Set([1, last]);
    for (let i = p - span; i <= p + span; i++) if (i >= 1 && i <= last) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    let prev = 0;
    sorted.forEach(n => {
      if (prev && n - prev > 1) nums += '<span class="ix-page-gap">…</span>';
      nums += '<button class="ix-page-btn' + (n === p ? ' active' : '') + '" data-page="' + n + '">' + n + '</button>';
      prev = n;
    });
    box.innerHTML = '<span class="ix-page-info">Showing ' + from + ' – ' + to + ' of ' + data.total + ' entries</span>' +
      '<div class="ix-pages">' +
      '<button class="ix-page-btn nav" data-page="' + Math.max(1, p - 1) + '"' + (p === 1 ? ' disabled' : '') + '>' + PT.icon('chevron-left', 14) + '</button>' +
      nums +
      '<button class="ix-page-btn nav" data-page="' + Math.min(last, p + 1) + '"' + (p === last ? ' disabled' : '') + '>' + PT.icon('chevron-right', 14) + '</button>' +
      '</div>';
  }

  // ── rail painting ──────────────────────────────────────────
  function paintSpaces() {
    const box = document.getElementById('railSpaces'); if (!box) return;
    box.innerHTML = PT.SPACES.map(s => {
      const active = s.id === 'favorites' ? state.pinned : state.space === s.id;
      return '<button class="rail-space' + (active ? ' active' : '') + '" data-space="' + s.id + '">' +
        PT.icon(s.icon, 13) + ' ' + s.label + '</button>';
    }).join('');
  }

  function paintKinds(filter) {
    const box = document.getElementById('railKinds'); if (!box || !overview) return;
    const entries = Object.entries(overview.by_kind).sort((a, b) => b[1] - a[1]);
    const f = (filter || '').toLowerCase();
    box.innerHTML = entries.filter(k => !f || k[0].includes(f) || PT.prettyEnum(k[0]).toLowerCase().includes(f))
      .map(k => {
        const on = state.kinds.includes(k[0]);
        return '<label class="rail-check"><input type="checkbox" data-kind="' + PT.esc(k[0]) + '"' + (on ? ' checked' : '') + '>' +
          '<span class="rail-check-dot" style="background:' + PT.kindColor(k[0]) + '"></span>' +
          '<span class="rail-check-name">' + PT.prettyEnum(k[0]) + '</span>' +
          '<span class="rail-check-count">' + k[1] + '</span></label>';
      }).join('');
  }

  function paintTags(filter) {
    const box = document.getElementById('railTags'); if (!box || !overview) return;
    const all = overview.top_tags || [];
    const f = (filter || '').toLowerCase();
    const list = all.filter(t => !f || t[0].toLowerCase().includes(f));
    const shown = tagsExpanded ? list : list.slice(0, 6);
    box.innerHTML = shown.map(t =>
      '<button class="rail-tag' + (state.tag === t[0] ? ' active' : '') + '" data-tagchip="' + PT.esc(t[0]) + '">#' + PT.esc(t[0]) +
      '<span>' + t[1] + '</span></button>').join('') +
      (list.length > 6 ? '<button class="rail-more" id="railMore">' + (tagsExpanded ? 'Show less' : 'Show more…') + '</button>' : '');
  }

  function paintActivity(events) {
    const box = document.getElementById('railActivity'); if (!box) return;
    if (!events || !events.length) {
      box.innerHTML = '<p class="text-muted text-sm">No activity recorded yet.</p>'; return;
    }
    const meta = {
      added: { icon: 'plus', cls: 'ok' }, updated: { icon: 'edit', cls: 'info' },
      viewed: { icon: 'eye', cls: 'neutral' }, deleted: { icon: 'trash-2', cls: 'danger' },
    };
    box.innerHTML = events.slice(0, 8).map(ev => {
      const m = meta[ev.kind] || meta.viewed;
      const verb = { added: 'Added', updated: 'Updated', viewed: 'Viewed', deleted: 'Deleted' }[ev.kind] || ev.kind;
      return '<div class="rail-event" onclick="PT.openEntry(\'' + PT.esc(ev.entry_id) + '\')">' +
        '<span class="rail-event-icon ' + m.cls + '">' + PT.icon(m.icon, 13) + '</span>' +
        '<span class="rail-event-text">' + verb + ': ' + PT.esc(ev.entry_name || ev.entry_id) + '</span>' +
        '<span class="rail-event-time">' + rel(ev.ts) + '</span></div>';
    }).join('');
  }

  function initRailGraph() {
    const el = document.getElementById('railGraph'); if (!el) return;
    if (typeof echarts === 'undefined') { el.innerHTML = ''; return; }
    const entries = PT.Store.getAll();
    const byId = {}, byName = {};
    entries.forEach(e => { byId[e.id] = e; byName[(e.name || '').toLowerCase()] = e; });
    const linked = new Set();
    const links = [];
    entries.forEach(e => (e.relations || []).forEach(r => {
      const t = byId[r.target] || byName[(r.target || '').toLowerCase()];
      if (!t) return;
      linked.add(e.id); linked.add(t.id);
      links.push({ source: e.id, target: t.id });
    }));
    const nodes = entries.filter(e => linked.has(e.id)).map(e => ({
      id: e.id, name: e.name, symbolSize: 7,
      itemStyle: { color: PT.kindColor(e.object_kind) },
    }));
    if (railGraphChart) { railGraphChart.dispose(); railGraphChart = null; }
    railGraphChart = echarts.init(el, null, { renderer: 'canvas' });
    railGraphChart.setOption({
      animation: false,
      series: [{
        type: 'graph', layout: 'force', roam: false,
        force: { repulsion: 60, edgeLength: [18, 55], gravity: 0.25 },
        data: nodes, links: links,
        lineStyle: { color: '#C9C4B8', width: 1, opacity: 0.6 },
        emphasis: { disabled: true },
        label: { show: false },
      }],
    });
    railGraphChart.on('click', p => { if (p.dataType === 'node') PT.openEntry(p.data.id); });
  }

  // ── data fetching ──────────────────────────────────────────
  let loadedOnce = false;
  function ixSkeleton() {
    const row = '<div class="ix-sk-row"><span class="ix-sk ix-sk-badge"></span>' +
      '<span class="ix-sk w40"></span><span class="ix-sk w60"></span>' +
      '<span class="ix-sk w20"></span><span class="ix-sk w25"></span></div>';
    return '<div class="ix-skeleton">' + row.repeat(6) + '</div>';
  }
  function fetchIndex() {
    const box = document.getElementById('homeResults');
    if (box && !loadedOnce) box.innerHTML = ixSkeleton();
    fetch('/gis/api/index?' + queryParams())
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { loadedOnce = true; paintResults(data, false); })
      .catch(() => { loadedOnce = true; paintResults(localIndex(), true); });
  }
  function fetchOverview() {
    fetch('/gis/api/overview')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(o => { overview = o; refreshRail(); })
      .catch(() => { overview = localOverview(); refreshRail(); });
  }
  function fetchActivity() {
    fetch('/gis/api/activity?limit=8')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(paintActivity)
      .catch(() => paintActivity([]));
  }
  function refreshRail() {
    const stats = document.getElementById('homeStats');
    if (stats) stats.innerHTML = statCards();
    const tabs = document.getElementById('homeTabs');
    if (tabs) tabs.innerHTML = tabsHTML();
    paintSpaces();
    paintKinds(document.getElementById('railKindSearch')?.value || '');
    paintTags(document.getElementById('railTagSearch')?.value || '');
    initRailGraph();
  }

  // ── public filters (sidebar, header search, reference links) ──
  function resetPage() { state.page = 1; }
  function setQuery(q) { state.q = q || ''; resetPage(); paintChips(); fetchIndex(); }
  function setGroup(group) {
    state.group = group || ''; state.kinds = []; resetPage();
    document.querySelectorAll('.ix-tab').forEach(t => t.classList.toggle('active', t.dataset.group === group));
    paintChips(); fetchIndex();
  }
  function filterKind(kind) {
    state.kinds = [kind]; state.group = ''; resetPage();
    paintChips(); refreshRail(); fetchIndex();
  }
  function filterAll() {
    state.kinds = []; state.group = ''; resetPage();
    paintChips(); refreshRail(); fetchIndex();
  }
  function filterSpace(space) {
    if (space === 'favorites') { state.pinned = !state.pinned; state.space = state.pinned ? '' : state.space; }
    else { state.space = state.space === space ? '' : space; state.pinned = false; }
    resetPage(); paintChips(); refreshRail(); fetchIndex();
  }
  function paintChips() {
    const box = document.getElementById('ixChips'); if (box) box.innerHTML = activeChips();
  }

  // ── afterRender: bind everything ───────────────────────────
  function afterRender() {
    fetchOverview();
    fetchIndex();
    fetchActivity();

    document.getElementById('homeTabs').addEventListener('click', e => {
      const tab = e.target.closest('.ix-tab'); if (!tab) return;
      state.group = tab.dataset.group || ''; state.kinds = []; resetPage();
      document.querySelectorAll('.ix-tab').forEach(t => t.classList.toggle('active', t === tab));
      paintChips(); fetchIndex();
    });
    document.getElementById('ixSort').addEventListener('change', e => { state.sort = e.target.value; resetPage(); fetchIndex(); });
    document.getElementById('ixModeList').addEventListener('click', () => setMode('list'));
    document.getElementById('ixModeGrid').addEventListener('click', () => setMode('grid'));

    const results = document.getElementById('homeResults');
    results.addEventListener('click', e => {
      const tag = e.target.closest('.ix-tag');
      if (tag) { e.stopPropagation(); state.tag = tag.dataset.tag; resetPage(); paintChips(); paintTags(''); fetchIndex(); }
    });
    document.getElementById('homePagination').addEventListener('click', e => {
      const btn = e.target.closest('.ix-page-btn'); if (!btn || btn.disabled) return;
      state.page = parseInt(btn.dataset.page, 10); fetchIndex();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('ixChips').addEventListener('click', e => {
      const chip = e.target.closest('.ix-chip'); if (!chip) return;
      const c = chip.dataset.clear;
      if (c === 'pinned') state.pinned = false;
      else if (c === 'space') state.space = '';
      else if (c === 'tag') state.tag = '';
      else if (c.startsWith('kind:')) state.kinds = state.kinds.filter(k => k !== c.slice(5));
      resetPage(); paintChips(); refreshRail(); fetchIndex();
    });

    document.getElementById('railAdd').addEventListener('click', () => PT.Entry.openEditor());
    document.getElementById('railImport').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('railGraph').addEventListener('click', () => PT.navigate('graph'));
    document.getElementById('railClear').addEventListener('click', () => {
      state.kinds = []; state.group = ''; state.space = ''; state.pinned = false; state.tag = '';
      const gs = document.getElementById('globalSearch');
      if (gs && state.q) { gs.value = ''; }
      state.q = ''; resetPage(); refreshRail(); fetchIndex();
    });
    document.getElementById('railKindSearch').addEventListener('input', e => paintKinds(e.target.value));
    document.getElementById('railSpaces').addEventListener('click', e => {
      const chip = e.target.closest('.rail-space'); if (!chip) return;
      filterSpace(chip.dataset.space);
    });
    document.getElementById('railKinds').addEventListener('change', e => {
      const k = e.target.dataset.kind; if (!k) return;
      state.kinds = e.target.checked ? state.kinds.concat([k]) : state.kinds.filter(x => x !== k);
      resetPage(); paintChips(); fetchIndex();
    });
    document.getElementById('railTagSearch').addEventListener('input', e => paintTags(e.target.value));
    document.getElementById('railTags').addEventListener('click', e => {
      if (e.target.closest('#railMore')) { tagsExpanded = !tagsExpanded; paintTags(document.getElementById('railTagSearch').value); return; }
      const chip = e.target.closest('.rail-tag'); if (!chip) return;
      state.tag = state.tag === chip.dataset.tagchip ? '' : chip.dataset.tagchip;
      resetPage(); paintTags(document.getElementById('railTagSearch').value); paintChips(); fetchIndex();
    });
  }

  function setMode(mode) {
    state.mode = mode;
    document.getElementById('ixModeList').classList.toggle('active', mode === 'list');
    document.getElementById('ixModeGrid').classList.toggle('active', mode === 'grid');
    fetchIndex();
  }

  return { render, afterRender, setQuery, setGroup, filterKind, filterAll, filterSpace };
})();
