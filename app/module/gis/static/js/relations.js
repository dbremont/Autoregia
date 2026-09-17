/* ════════════════════════════════════════════════════════════
   GIS Graph — the knowledge-graph workbench.

   Two modes:
   • Network  — force layout of the whole index
   • Cluster  — nodes grouped by kind on deterministic centers

   Shared: filter toolbar (kind / status / relation / search),
   icon-badge nodes with typed edge labels, zoom controls,
   legend + visible-count cards, and a node inspector aside.
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};

PT.Graph = (() => {
  const state = { mode: 'network', kind: '', status: '', relation: '', q: '', selected: null };
  let chart = null;
  let zoomLevel = 1;
  const symbolCache = {};

  // ── node badge as SVG data-URI (white circle, kind ring, kind icon) ──
  function nodeSymbol(kind) {
    if (symbolCache[kind]) return symbolCache[kind];
    const c = PT.kindColor(kind);
    const glyph = (PT._icons && (PT._icons[PT.KIND_ICONS[kind]] || PT._icons.circle)) || '';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<circle cx="24" cy="24" r="22" fill="#FFFFFF" stroke="' + c + '" stroke-width="3"/>' +
      '<g transform="translate(12,12)" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + glyph + '</g>' +
      '</svg>';
    const uri = 'image://' + 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    symbolCache[kind] = uri;
    return uri;
  }

  // ── data assembly ──────────────────────────────────────────
  function resolveIndex() {
    const byId = {}, byName = {};
    PT.Store.getAll().forEach(function (e) {
      byId[e.id] = e; byName[(e.name || '').toLowerCase()] = e;
    });
    return { byId, byName };
  }

  function visibleEntries() {
    const q = state.q.toLowerCase();
    return PT.Store.getAll().filter(function (e) {
      if (state.kind && e.object_kind !== state.kind) return false;
      if (state.status && e.status !== state.status) return false;
      if (q) {
        const hay = ((e.name || '') + ' ' + (e.summary || '') + ' ' + (e.tags || []).join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function buildGraph() {
    const { byId, byName } = resolveIndex();
    const vis = visibleEntries();
    const visIds = {}; vis.forEach(e => { visIds[e.id] = 1; });

    const links = [];
    const seen = {};
    function resolve(t) { return byId[t] || byName[(t || '').toLowerCase()]; }
    vis.forEach(function (e) {
      (e.relations || []).forEach(function (r) {
        if (state.relation && r.kind !== state.relation) return;
        const t = resolve(r.target);
        if (!t || !visIds[t.id] || t.id === e.id) return;
        const key = e.id + '>' + t.id + ':' + r.kind;
        if (seen[key]) return; seen[key] = 1;
        links.push({ source: e.id, target: t.id, kind: r.kind, notes: r.notes || '' });
      });
    });

    const degree = {};
    links.forEach(l => { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; });

    const nodes = vis.map(function (e) {
      const d = degree[e.id] || 0;
      return {
        id: e.id, name: e.name || e.id, _entry: e, _kind: e.object_kind,
        symbol: nodeSymbol(e.object_kind),
        symbolSize: Math.min(24 + d * 4, 46),
        _degree: d,
      };
    });
    return { nodes, links };
  }

  // ── option builders ────────────────────────────────────────
  function baseSeries(nodes, links) {
    return {
      type: 'graph', roam: true, draggable: true,
      zoom: zoomLevel,
      data: nodes.map(function (n) {
        return Object.assign({}, n, {
          label: {
            show: true, position: 'bottom', distance: 4,
            formatter: '{n|' + n.name + '}\n{k|' + PT.prettyEnum(n._kind) + '}',
            rich: {
              n: { fontSize: 11, fontWeight: 600, color: '#2C2A26', align: 'center', lineHeight: 15 },
              k: { fontSize: 9, color: '#8C877B', align: 'center', fontFamily: 'Inter, sans-serif' },
            },
          },
        });
      }),
      links: links.map(function (l) {
        return {
          source: l.source, target: l.target, value: l.kind.replace(/_/g, ' '),
          lineStyle: { color: PT.RELATION_COLORS[l.kind] || '#8C877B', width: 1.4, opacity: 0.65, curveness: 0.12 },
        };
      }),
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 7],
      edgeLabel: {
        show: true, formatter: '{c}',
        color: '#8C877B', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace',
        padding: [1, 2], backgroundColor: 'rgba(250,250,246,0.85)', borderRadius: 2,
      },
      emphasis: { focus: 'adjacency', lineStyle: { width: 2.6 }, label: { show: true } },
      tooltip: {
        formatter: function (p) {
          if (p.dataType === 'edge') return PT.esc(p.data.value);
          const e = p.data._entry;
          return '<b>' + PT.esc(e.name) + '</b><br>' + PT.esc(PT.prettyEnum(e.object_kind)) +
            ' · ' + PT.esc(PT.prettyEnum(e.status));
        },
        textStyle: { fontSize: 11 },
      },
    };
  }

  function networkOption(nodes, links) {
    return {
      animation: false,
      series: [Object.assign(baseSeries(nodes, links), {
        layout: 'force',
        force: { repulsion: 260, edgeLength: [80, 170], gravity: 0.09, layoutAnimation: false },
      })],
    };
  }

  function clusterOption(nodes, links) {
    const groups = {};
    nodes.forEach(n => { (groups[n._kind] = groups[n._kind] || []).push(n); });
    const kinds = Object.keys(groups);
    const R = 330;
    const placed = {};
    kinds.forEach(function (k, i) {
      const ang = (i / Math.max(kinds.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const kx = R * Math.cos(ang), ky = R * Math.sin(ang) * 0.72;
      const g = groups[k];
      const r = 34 + Math.min(g.length * 13, 110);
      g.forEach(function (n, j) {
        const a = (j / g.length) * Math.PI * 2 + i * 0.8;
        placed[n.id] = { x: Math.round(kx + r * Math.cos(a)), y: Math.round(ky + r * Math.sin(a)) };
      });
    });
    const data = nodes.map(function (n) {
      const p = placed[n.id] || { x: 0, y: 0 };
      return Object.assign({}, n, { x: p.x, y: p.y });
    });
    return {
      animation: false,
      series: [Object.assign(baseSeries(nodes, links), {
        layout: 'none',
        data: data,
      })],
    };
  }

  // ── paint ──────────────────────────────────────────────────
  function draw() {
    const el = document.getElementById('graphChart');
    if (!el || typeof echarts === 'undefined') return;
    const { nodes, links } = buildGraph();

    // selection must stay within the visible set
    if (state.selected && !nodes.some(n => n.id === state.selected)) state.selected = null;

    if (chart) chart.dispose();
    chart = echarts.init(el);
    const option = state.mode === 'cluster'
      ? clusterOption(nodes, links)
      : networkOption(nodes, links);
    chart.setOption(option);
    chart.on('click', function (p) {
      if (p.dataType === 'node' && p.data._entry) select(p.data._entry.id);
    });
    chart.getZr().on('click', function (ev) {
      if (!ev.target) clear();  // clicked empty canvas
    });

    document.getElementById('graphVisible').innerHTML =
      '<b>' + nodes.length + '</b> nodes<br><b>' + links.length + '</b> relationships';

    renderInspector();
  }

  // ── inspector ──────────────────────────────────────────────
  function relationsOf(entry) {
    const { byId, byName } = resolveIndex();
    function resolve(t) { return byId[t] || byName[(t || '').toLowerCase()]; }
    const out = (entry.relations || []).map(function (r) {
      const t = resolve(r.target);
      return t ? { kind: r.kind, other: t, notes: r.notes || '', dir: 'out' } : null;
    }).filter(Boolean);
    const inn = [];
    PT.Store.getAll().forEach(function (other) {
      (other.relations || []).forEach(function (r) {
        const t = resolve(r.target);
        if (t && t.id === entry.id) inn.push({ kind: r.kind, other: other, notes: r.notes || '', dir: 'in' });
      });
    });
    return out.concat(inn);
  }

  function renderInspector() {
    const layout = document.getElementById('graphLayout'); if (!layout) return;
    let box = document.getElementById('graphInspector');
    const e = state.selected ? PT.Store.getById(state.selected) : null;
    if (!e) {
      if (box) box.remove();
      layout.classList.remove('has-inspector');
      if (chart) setTimeout(function () { chart.resize(); }, 0);
      return;
    }
    if (!box) {
      box = document.createElement('aside');
      box.className = 'graph-inspector';
      box.id = 'graphInspector';
      layout.appendChild(box);
    }
    layout.classList.add('has-inspector');
    const rels = relationsOf(e);
    const prov = e.provenance || {}, usage = e.usage || {};
    const mi = function (k, v) {
      return '<div class="insp-row"><span class="insp-key">' + k + '</span><span class="insp-val">' + (v == null || v === '' ? '—' : v) + '</span></div>';
    };
    const tags = (e.tags || []).map(t => '<code class="doc-tag">#' + PT.esc(t) + '</code>').join(' ');
    const relRows = rels.map(function (r) {
      return '<div class="insp-rel" onclick="PT.Graph.select(\'' + r.other.id + '\')">' +
        '<span class="insp-rel-kind">' + PT.esc(r.kind.replace(/_/g, ' ')) + '</span>' +
        '<span class="insp-rel-arrow">' + (r.dir === 'out' ? '→' : '←') + '</span>' +
        '<span class="insp-rel-name">' + PT.esc(r.other.name) + '</span>' +
        '<span class="insp-rel-kind2">' + PT.esc(PT.prettyEnum(r.other.object_kind)) + '</span></div>';
    }).join('');
    const sources = [];
    if (prov.source_url) sources.push(['Source', prov.source_url]);
    if (usage.docs_url) sources.push(['Docs', usage.docs_url]);

    box.innerHTML =
      '<div class="insp-card">' +
        '<div class="insp-head">' +
          '<span class="insp-badge" style="color:' + PT.kindColor(e.object_kind) + ';background:' + PT.kindColor(e.object_kind) + '14;border-color:' + PT.kindColor(e.object_kind) + '55">' +
            PT.icon(PT.KIND_ICONS[e.object_kind] || 'circle', 20) + '</span>' +
          '<div class="insp-head-text">' +
            '<div class="insp-name">' + PT.esc(e.name) + '</div>' +
            '<div class="insp-kind">' + PT.esc(PT.prettyEnum(e.object_kind)) + '</div>' +
          '</div>' +
          PT.badge('badge-status-' + e.status, PT.prettyEnum(e.status)) +
          '<button class="insp-close" onclick="PT.Graph.clear()" title="Close inspector">' + PT.icon('x', 14) + '</button>' +
        '</div>' +
        (tags ? '<div class="insp-tags">' + tags + '</div>' : '') +
        (e.summary ? '<p class="insp-summary">' + PT.esc(e.summary) + '</p>' : '') +
      '</div>' +
      '<div class="insp-card"><div class="rail-title">' + PT.icon('clipboard-list', 13) + ' Details</div>' +
        mi('Type', PT.esc(PT.prettyEnum(e.object_kind))) +
        mi('Domain', PT.esc(e.domain || '—')) +
        mi('Status', PT.esc(PT.prettyEnum(e.status))) +
        mi('Priority', PT.esc(PT.prettyEnum(e.priority))) +
        mi('Space', PT.esc(PT.prettyEnum(e.space || 'personal'))) +
        mi('Owner', PT.esc(e.owner || 'self')) +
        mi('Updated', e.updated_at ? new Date(e.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—') +
      '</div>' +
      '<div class="insp-card"><div class="rail-title">' + PT.icon('git-branch', 13) + ' Key Relationships <span class="insp-count">' + rels.length + '</span></div>' +
        (rels.length ? '<div class="insp-rels">' + relRows + '</div>' : '<p class="text-muted text-sm">No relationships.</p>') +
      '</div>' +
      (sources.length ? '<div class="insp-card"><div class="rail-title">' + PT.icon('external-link', 13) + ' Sources</div>' +
        sources.map(function (s) {
          return '<a class="insp-source" href="' + PT.esc(s[1]) + '" target="_blank" rel="noopener">' +
            '<span>' + s[0] + '</span><span class="insp-source-url">' + PT.esc(String(s[1]).replace(/^https?:\/\//, '').slice(0, 28)) + ' ↗</span></a>';
        }).join('') + '</div>' : '') +
      '<div class="insp-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="PT.Entry.openEditor(PT.Store.getById(\'' + e.id + '\'))">' + PT.icon('edit', 14) + ' Edit</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="PT.togglePin(\'' + e.id + '\')">' + PT.icon('pin', 14) + ' ' + (e.pinned ? 'Unpin' : 'Pin') + '</button>' +
      '</div>';
    if (chart) setTimeout(function () { chart.resize(); }, 0);
  }

  function select(id) {
    state.selected = state.selected === id ? null : id;  // click again to dismiss
    renderInspector();
  }

  function clear() {
    if (!state.selected) return;
    state.selected = null;
    renderInspector();
  }

  // ── legend ─────────────────────────────────────────────────
  function renderLegend() {
    const box = document.getElementById('graphLegend'); if (!box) return;
    const counts = {};
    PT.Store.getAll().forEach(e => { counts[e.object_kind] = (counts[e.object_kind] || 0) + 1; });
    box.innerHTML = '<div class="legend-title">Node Types</div>' +
      Object.entries(counts).sort((a, b) => b[1] - a[1]).map(k =>
        '<div class="legend-row"><span class="legend-dot" style="background:' + PT.kindColor(k[0]) + '"></span>' +
        PT.prettyEnum(k[0]) + '<span class="legend-count">' + k[1] + '</span></div>').join('');
  }

  // ── shell + bindings ───────────────────────────────────────
  function render() {
    const kindOpts = ['<option value="">All Kinds</option>'].concat(
      PT.ENUMS.object_kind.map(k => '<option value="' + k + '"' + (state.kind === k ? ' selected' : '') + '>' + PT.prettyEnum(k) + '</option>')).join('');
    const statusOpts = ['<option value="">All Status</option>'].concat(
      PT.ENUMS.status.map(k => '<option value="' + k + '"' + (state.status === k ? ' selected' : '') + '>' + PT.prettyEnum(k) + '</option>')).join('');
    const relOpts = ['<option value="">All Relations</option>'].concat(
      PT.ENUMS.relation_kind.map(k => '<option value="' + k + '"' + (state.relation === k ? ' selected' : '') + '>' + k.replace(/_/g, ' ') + '</option>')).join('');
    return '<div class="graph-header">' +
      '<div class="graph-title"><span class="eyebrow">Graph</span><h1>Knowledge Graph</h1></div>' +
      '<div class="dash-tabs graph-tabs">' +
        '<button class="dash-tab' + (state.mode === 'network' ? ' active' : '') + '" data-mode="network">' + PT.icon('share-2', 14) + ' Network</button>' +
        '<button class="dash-tab' + (state.mode === 'cluster' ? ' active' : '') + '" data-mode="cluster">' + PT.icon('layers', 14) + ' Cluster</button>' +
      '</div>' +
    '</div>' +
    '<div class="graph-layout" id="graphLayout">' +
        '<div class="graph-stage">' +
          '<div class="graph-canvas-toolbar">' +
            '<select id="gKind" class="graph-select" aria-label="Filter by kind">' + kindOpts + '</select>' +
            '<select id="gStatus" class="graph-select" aria-label="Filter by status">' + statusOpts + '</select>' +
            '<select id="gRelation" class="graph-select" aria-label="Relation depth">' + relOpts + '</select>' +
            '<div class="graph-search-wrap">' +
              '<span class="search-glyph"><pt-icon name="search" size="13"></pt-icon></span>' +
              '<input type="search" id="gSearch" class="graph-search" placeholder="Search in graph…" aria-label="Search in graph" value="' + PT.esc(state.q) + '">' +
            '</div>' +
          '</div>' +
          '<div class="graph-canvas">' +
            '<div id="graphChart"></div>' +
            '<div class="graph-zoom">' +
              '<button id="gZoomIn" title="Zoom in">' + PT.icon('plus', 14) + '</button>' +
              '<button id="gZoomOut" title="Zoom out">' + PT.icon('minus', 14) + '</button>' +
              '<button id="gZoomFit" title="Fit">' + PT.icon('target', 14) + '</button>' +
            '</div>' +
            '<div class="graph-legend-card" id="graphLegend"></div>' +
            '<div class="graph-visible" id="graphVisible"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function zoom(factor) {
    zoomLevel = Math.min(3, Math.max(0.35, zoomLevel * factor));
    if (chart) chart.setOption({ series: [{ zoom: zoomLevel }] });
  }
  function fit() {
    zoomLevel = 1;
    if (chart) chart.setOption({ series: [{ zoom: 1 }] });
  }

  function afterRender() {
    const self = this;
    document.querySelectorAll('.graph-tabs .dash-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        state.mode = t.dataset.mode; zoomLevel = 1;
        document.querySelectorAll('.graph-tabs .dash-tab').forEach(x => x.classList.toggle('active', x === t));
        draw();
      });
    });
    const bind = function (id, ev, fn) { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    let timer;
    bind('gKind', 'change', e => { state.kind = e.target.value; draw(); });
    bind('gStatus', 'change', e => { state.status = e.target.value; draw(); });
    bind('gRelation', 'change', e => { state.relation = e.target.value; draw(); });
    bind('gSearch', 'input', e => {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = e.target.value.trim(); draw(); }, 220);
    });
    bind('gZoomIn', 'click', () => zoom(1.25));
    bind('gZoomOut', 'click', () => zoom(0.8));
    bind('gZoomFit', 'click', fit);
    window.addEventListener('resize', onResize);
    renderLegend();
    draw();
  }
  function onResize() { if (chart) chart.resize(); }

  return { render, afterRender, select, clear };
})();
