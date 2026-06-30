/* PTOCS Browse — faceted pivot cards */
PT.Browse = {
  render() {
    return '<div class="content-header"><div><span class="eyebrow">Navigation</span><h1>Browse</h1></div></div>' +
      '<div class="browse-pivot" id="browsePivot"><p class="text-muted">Loading facets…</p></div>';
  },
  async afterRender() {
    let data;
    try { const r = await fetch('/ptocs/api/browse'); data = await r.json(); }
    catch (e) { data = PT.Store.getAll().length ? this._localFacets() : {}; }
    this._renderFacets(data);
  },
  _localFacets() {
    const entries = PT.Store.getAll();
    const count = function (key) {
      const m = {};
      entries.forEach(function (e) {
        let v;
        if (key === 'system_served') v = (e.strategic && e.strategic.system_served) || 'unassigned';
        else if (key === 'object_kind') v = e.object_kind;
        else if (key === 'status') v = e.status;
        else if (key === 'priority') v = e.priority;
        else if (key === 'domain') v = e.domain || 'Unspecified';
        else if (key === 'hosting_model') v = e.hosting_model;
        else if (key === 'category') v = e.category || 'unspecified';
        else v = e[key];
        m[v] = (m[v] || 0) + 1;
      });
      return m;
    };
    return { object_kind: count('object_kind'), domain: count('domain'), category: count('category'),
             status: count('status'), priority: count('priority'), system_served: count('system_served'),
             hosting_model: count('hosting_model') };
  },
  _renderFacets(data) {
    const c = document.getElementById('browsePivot'); if (!c) return;
    const dims = [
      ['object_kind', 'Object Kind'], ['domain', 'Domain'], ['category', 'Category'],
      ['status', 'Status'], ['priority', 'Priority'], ['system_served', 'System Served'],
      ['hosting_model', 'Hosting Model'],
    ];
    const total = PT.Store.getAll().length || 1;
    c.innerHTML = dims.map(function (d) {
      const key = d[0], label = d[1];
      const counts = data[key] || {};
      const entries = Object.entries(counts).sort(function (a,b) { return b[1]-a[1]; });
      return '<div class="pivot-card"><h4>' + label + '</h4>' +
        entries.map(function (kv) {
          const val = kv[0], n = kv[1];
          const pct = Math.round(n / total * 100);
          const dotColor = (key === 'object_kind') ? PT.kindColor(val) : 'var(--rule-gold)';
          return '<div class="pivot-row" onclick="PT.Browse.drill(\'' + key + '\',\'' + val + '\')">' +
            '<span class="pivot-label"><span class="pivot-dot" style="background:' + dotColor + '"></span>' + (key === 'system_served' ? PT.prettySystem(val) : PT.prettyEnum(val)) + '</span>' +
            '<span class="pivot-bar"><span style="width:' + pct + '%"></span></span>' +
            '<span class="pivot-count">' + n + '</span></div>';
        }).join('') + '</div>';
    }).join('');
  },
  drill(key, val) {
    PT.navigate('catalog');
    setTimeout(function () {
      const f = {};
      if (key === 'object_kind') f.kind = val;
      else if (key === 'status') f.status = val;
      else if (key === 'priority') f.priority = val;
      else if (key === 'domain') f.domain = val;
      else if (key === 'system_served') f.system = val;
      PT.Entry.applyFilters(f);
    }, 80);
  },
};
