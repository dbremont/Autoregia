/* PTOCS Relations — relationship graph view (ECharts force layout) */
PT.Graph = {
  _chart: null,
  render() {
    const legend = ['depends_on','integrates_with','alternative_to','complements','contains','references','enables'].map(function (k) {
      return '<span class="legend-item"><span class="legend-line" style="background:' + (PT.RELATION_COLORS[k]||'#8C877B') + '"></span>' + k.replace(/_/g,' ') + '</span>';
    }).join('');
    const kindLegend = Object.keys(PT.KIND_COLORS).map(function (k) {
      return '<span class="legend-item"><span class="legend-swatch" style="background:' + PT.KIND_COLORS[k] + '"></span>' + PT.prettyEnum(k) + '</span>';
    }).join('');
    return '<div class="content-header"><div><span class="eyebrow">Navigation</span><h1>Relationship Graph</h1></div>' +
      '<div class="actions"><select id="graphFilter" class="text-sm" style="padding:var(--space-1) var(--space-3);border:var(--hairline) solid var(--color-border);border-radius:var(--radius-sm);">' +
        '<option value="">All relation kinds</option>' +
        PT.ENUMS.relation_kind.map(function (k) { return '<option value="' + k + '">' + k.replace(/_/g,' ') + '</option>'; }).join('') +
      '</select></div></div>' +
      '<div class="graph-legend"><span class="sidebar-label" style="padding:0;margin:0;">Edges</span>' + legend + '<span class="sidebar-label" style="padding:0;margin:0 0 0 var(--space-4);">Nodes</span>' + kindLegend + '</div>' +
      '<div class="graph-container"><div id="graphChart" style="width:100%;height:560px;"></div></div>';
  },
  afterRender() {
    this._render();
    const sel = document.getElementById('graphFilter');
    if (sel) sel.addEventListener('change', () => { this._render(sel.value); });
    window.addEventListener('resize', this._onResize);
  },
  _onResize() { if (PT.Graph._chart) PT.Graph._chart.resize(); },
  _render(kindFilter) {
    const el = document.getElementById('graphChart'); if (!el || !window.echarts) return;
    const entries = PT.Store.getAll();
    const byId = {}; const byName = {};
    entries.forEach(function (e) { byId[e.id] = e; byName[e.name.toLowerCase()] = e; });
    const nodes = entries.map(function (e) {
      return { id: e.id, name: e.name, symbolSize: 26 + (e.relations ? e.relations.length * 3 : 0),
        itemStyle: { color: PT.kindColor(e.object_kind) },
        label: { show: true, color: '#2C2A26', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        category: PT.prettyEnum(e.object_kind), _entryId: e.id };
    });
    const links = [];
    const seen = {};
    entries.forEach(function (e) {
      (e.relations || []).forEach(function (r) {
        if (kindFilter && r.kind !== kindFilter) return;
        let t = byId[r.target] || byName[(r.target || '').toLowerCase()];
        if (!t) return;
        const key = e.id + '->' + t.id + ':' + r.kind;
        if (seen[key]) return; seen[key] = 1;
        links.push({ source: e.id, target: t.id, value: r.kind,
          lineStyle: { color: PT.RELATION_COLORS[r.kind] || '#8C877B', width: 1.4, opacity: 0.7, curveness: 0.15 } });
      });
    });
    if (this._chart) { this._chart.dispose(); }
    this._chart = echarts.init(el);
    this._chart.setOption({
      tooltip: { formatter: function (p) {
        if (p.dataType === 'edge') return p.data.value.replace(/_/g,' ');
        return '<b>' + p.data.name + '</b><br>' + (p.data.category || '');
      } },
      series: [{ type: 'graph', layout: 'force', roam: true, draggable: true,
        force: { repulsion: 220, edgeLength: [70, 160], gravity: 0.08 },
        data: nodes, links: links, focusNodeAdjacency: true,
        edgeSymbol: ['none', 'arrow'], edgeSymbolSize: [0, 7],
        lineStyle: { color: '#8C877B' }, emphasis: { focus: 'adjacency', lineStyle: { width: 3 } } }],
    });
    this._chart.on('click', function (p) {
      if (p.dataType === 'node' && p.data._entryId) PT.Entry.showDetail(p.data._entryId);
    });
  },
};
