/* ════════════════════════════════════════════════════════════
   GIS Index — the General Index: point → element directory.

   Two sources merged into one window:
   • local entries (this system's store, editable — the canonical index)
   • a read-only fan-out across the running systems' public APIs,
     each item deep-linked back into its system of origin.

   A system that is down simply contributes nothing.
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};

PT.GISIndex = (() => {
  // Read-only fan-out sources. map(r) → {point, element, href, system}
  const SOURCES = [
    { sys: 'PRS',  url: '/prs/api/records',          map: r => ({ point: (r.title || r.content || r.id || '').slice(0, 90), element: r.detail || r.summary || '', href: '/prs/' }) },
    { sys: 'PKTS', url: '/pkts/api/sessions',        map: s => ({ point: s.label || s.name || s.id, element: s.summary || 'typing session', href: '/pkts/' }) },
    { sys: 'AIAS', url: '/aias/api/intents',         map: i => ({ point: i.description || i.id, element: i.expected_value || ('intent · ' + (i.status || '')), href: '/aias/' }) },
    { sys: 'AOOS', url: '/aoos/api/actions',         map: a => ({ point: a.title || a.name || a.description || a.id, element: a.summary || a.notes || 'action', href: '/aoos/' }) },
    { sys: 'PEOS', url: '/peos/api/observations',    map: o => ({ point: (o.title || o.headline || o.id || '').slice(0, 90), element: o.summary || o.source || 'observation', href: '/peos/' }) },
    { sys: 'AWES', url: '/awes/api/sessions',        map: s => ({ point: s.description || s.id, element: 'execution · ' + (s.status || ''), href: '/awes/' }) },
    { sys: 'PRAS', url: '/pras/api/deliberations',   map: d => ({ point: d.title || d.id, element: d.summary || 'deliberation', href: '/pras/deliberations/' + (d.path || '') }) },
    { sys: 'PPS',  url: '/pps/api/policies',         map: p => ({ point: p.title || p.id, element: p.summary || 'policy', href: '/pps/policies/' + (p.path || '') }) },
  ];

  let remote = [];      // {point, element, href, system}
  let fetched = false;
  let filterSys = '', filterQ = '';

  function localRows() {
    return PT.Store.getAll().map(e => {
      const t = e.target || {};
      let href = '#catalog', badge = 'Index', external = false;
      if (t.url || (e.provenance && e.provenance.source_url)) {
        href = t.url || e.provenance.source_url; badge = t.kind || 'External'; external = true;
      } else if (t.system && t.ref) {
        href = '/gis/' + t.system + '/' + t.ref; badge = t.system.toUpperCase(); 
      }
      return { point: e.name, aliases: e.aliases || [], element: e.summary || '',
               kind: e.object_kind, tags: e.tags || [], href, badge, external,
               system: 'Index', editable: true, id: e.id };
    });
  }

  function allRows() {
    return localRows().concat(remote.map(r => ({ ...r, aliases: [], tags: [], kind: 'remote', editable: false })));
  }

  function render() {
    const kinds = [...new Set(PT.Store.getAll().map(e => e.object_kind).filter(Boolean))].sort();
    return '<div class="content-header"><div><span class="eyebrow">Entry point to everything</span>' +
      '<h1>General Index</h1></div>' +
      '<div class="actions">' +
      '<button class="btn btn-ghost btn-sm" id="gisRefresh"><pt-icon name="refresh-cw" size="15"></pt-icon> Refresh</button>' +
      '<button class="btn btn-primary btn-sm" id="gisAdd"><pt-icon name="plus" size="15"></pt-icon> Add Point</button>' +
      '</div></div>' +
      '<div class="gis-toolbar">' +
      '<input type="search" id="gisFilterQ" placeholder="Filter the index…" value="' + PT.esc(filterQ) + '">' +
      '<select id="gisFilterSys"><option value="">All sources</option>' +
      SOURCES.map(s => '<option value="' + s.sys + '"' + (filterSys === s.sys ? ' selected' : '') + '>' + s.sys + '</option>').join('') +
      '<option value="Index"' + (filterSys === 'Index' ? ' selected' : '') + '>Index (editable)</option>' +
      '</select><span class="gis-count" id="gisCount"></span></div>' +
      '<div class="card"><div class="card-body" id="gisRows"><p class="text-muted">Gathering the index…</p></div></div>' +
      '<style>' +
      '.gis-toolbar{display:flex;gap:10px;align-items:center;margin:0 0 14px;flex-wrap:wrap}' +
      '.gis-toolbar input[type=search]{flex:1;min-width:220px;font-family:var(--sans);font-size:14px;padding:9px 13px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink)}' +
      '.gis-toolbar select{font-family:var(--sans);font-size:13px;padding:9px 11px;border:1px solid var(--rule);border-radius:8px;background:var(--surface);color:var(--ink)}' +
      '.gis-count{font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.04em}' +
      '.gis-row{display:grid;grid-template-columns:minmax(200px,1.1fr) 24px minmax(220px,1.3fr) auto auto;gap:14px;align-items:baseline;padding:12px 4px;border-bottom:1px solid var(--rule-soft)}' +
      '.gis-row:last-child{border-bottom:none}' +
      '.gis-row:hover{background:var(--gold-tint)}' +
      '.gis-point{font-family:var(--sans);font-size:14.5px;font-weight:600;color:var(--ink)}' +
      '.gis-point .gis-alias{font-family:var(--mono);font-size:10px;color:var(--muted);margin-left:7px}' +
      '.gis-arrow{color:var(--gold);text-align:center}' +
      '.gis-element{font-family:var(--sans);font-size:13px;color:var(--ink-soft);line-height:1.45}' +
      '.gis-el-link{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--rule)}' +
      '.gis-el-link:hover{border-color:var(--accent)}' +
      '.gis-sys{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);border:1px solid var(--rule);border-radius:999px;padding:2px 9px;background:var(--gold-tint);white-space:nowrap;text-decoration:none}' +
      '.gis-kind{font-family:var(--mono);font-size:9.5px;color:var(--muted);white-space:nowrap}' +
      '.gis-tag{font-family:var(--mono);font-size:9.5px;color:var(--muted)}' +
      '</style>';
  }

  function rowHTML(r) {
    const el = r.href && r.href !== '#catalog'
      ? '<a class="gis-el-link" href="' + PT.esc(r.href) + '"' + (r.external ? ' target="_blank" rel="noopener"' : '') + '>' + PT.esc((r.element || '—').slice(0, 140)) + ' ↗</a>'
      : PT.esc((r.element || '—').slice(0, 140));
    const aliases = (r.aliases || []).slice(0, 2).map(a => '<span class="gis-alias">' + PT.esc(a) + '</span>').join('');
    const tags = (r.tags || []).slice(0, 3).map(t => '<span class="gis-tag">#' + PT.esc(t) + '</span>').join(' ');
    return '<div class="gis-row" data-sys="' + PT.esc(r.system) + '" data-q="' + PT.esc((r.point + ' ' + r.element + ' ' + (r.tags||[]).join(' ')).toLowerCase()) + '">' +
      '<span class="gis-point">' + PT.esc(r.point || '—') + aliases + '</span>' +
      '<span class="gis-arrow">→</span>' +
      '<span class="gis-element">' + el + '</span>' +
      '<a class="gis-sys" href="' + (r.href && r.href !== '#catalog' ? PT.esc(r.href) : '#catalog') + '">' + PT.esc(r.badge || r.system) + '</a>' +
      '<span class="gis-kind">' + PT.esc(r.kind || '') + ' ' + tags + '</span>' +
      '</div>';
  }

  function paint() {
    const box = document.getElementById('gisRows'); if (!box) return;
    let rows = allRows();
    const q = filterQ.toLowerCase();
    if (filterSys) rows = rows.filter(r => r.system === filterSys);
    if (q) rows = rows.filter(r => (r.point + ' ' + (r.element||'') + ' ' + (r.tags||[]).join(' ') + ' ' + (r.aliases||[]).join(' ')).toLowerCase().includes(q));
    const count = document.getElementById('gisCount');
    if (count) count.textContent = rows.length + ' / ' + allRows().length + ' entries';
    box.innerHTML = rows.length
      ? rows.map(rowHTML).join('')
      : '<p class="text-muted">The index is empty — add a point or refresh the fan-out.</p>';
  }

  async function fetchRemote() {
    const jobs = SOURCES.map(s =>
      fetch(s.url).then(r => r.ok ? r.json() : []).then(j => {
        const rows = (Array.isArray(j) ? j : (j && j.results) || []).slice(0, 40).map(s.map);
        rows.forEach(x => { x.system = s.sys; x.badge = s.sys; x.kind = 'remote'; x.external = false; });
        return rows;
      }).catch(() => []));
    const groups = await Promise.all(jobs);
    remote = []; groups.forEach(g => remote = remote.concat(g));
    fetched = true; paint();
  }

  function afterRender() {
    const rf = document.getElementById('gisRefresh');
    if (rf) rf.addEventListener('click', function () { rf.disabled = true; fetchRemote().then(function(){ rf.disabled = false; }); });
    const add = document.getElementById('gisAdd');
    if (add) add.addEventListener('click', addPoint);
    const fq = document.getElementById('gisFilterQ');
    if (fq) fq.addEventListener('input', function () { filterQ = fq.value.trim(); paint(); });
    const fs = document.getElementById('gisFilterSys');
    if (fs) fs.addEventListener('change', function () { filterSys = fs.value; paint(); });
    if (!fetched) fetchRemote(); else paint();
  }

  function addPoint() {
    const name = window.prompt('Point — the handle for this entry (e.g. "autoregia repo"):');
    if (!name) return;
    const url = window.prompt('Element — the target URL (GitHub project, document, service…):') || '';
    const tags = (window.prompt('Tags (comma-separated, optional):') || '').split(',').map(s => s.trim()).filter(Boolean);
    PT.Store.add({
      name, summary: url ? '→ ' + url : '',
      object_kind: 'reference_artifact', tags,
      target: { kind: url.startsWith('http') ? 'external' : 'internal', system: null, url: url || null, ref: null },
      provenance: { source_url: url || null, vendor: null, version: null, license: null, acquired_at: null },
    }).then(function () { PT.toast('Point added to the index'); });
  }

  return { render, afterRender };
})();
