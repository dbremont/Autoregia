/* ════════════════════════════════════════════════════════════
    SOPCS Dashboard — the catalog at a glance: shape, review
    candidates, recent activity, retrieval health. One payload
    (GET /api/overview), no vendor charts — token-colored bars.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.Dashboard = {
  render() {
    return `<div class="animate-in" id="dashWrap">
      <div class="content-header">
        <div><span class="eyebrow">Overview</span><h1>Dashboard</h1></div>
        <div class="actions">
          <button class="btn btn-primary" id="dashNew">${SOPCS.icon('plus', 16)} New SOP</button>
        </div>
      </div>
      <div id="dashBody"><div class="empty-state"><h3>Loading…</h3></div></div>
    </div>`;
  },

  afterRender() {
    document.getElementById('dashNew')?.addEventListener('click', () => SOPCS.navigate('new'));
    document.getElementById('dashBody').addEventListener('click', (e) => {
      const doc = e.target.closest('[data-doc]');
      if (doc) { SOPCS.navigate('doc/' + doc.dataset.doc); return; }
      const tag = e.target.closest('[data-tag]');
      if (tag) {
        SOPCS.Store.state.tag = tag.dataset.tag;
        SOPCS.Store.state.page = 1;
        SOPCS.navigate('library');
      }
    });
    SOPCS.Store.overview().then((ov) => {
      this.paint(ov);
      this.loadClusters();
    }).catch((err) => {
      document.getElementById('dashBody').innerHTML =
        `<div class="empty-state"><h3>Could not load the overview</h3><p>${SOPCS.esc(err.message)}</p></div>`;
    });
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this._onResize = () => { if (this._chart) this._chart.resize(); };
    window.addEventListener('resize', this._onResize);
  },

  paint(ov) {
    const cat = ov.catalog;
    const emb = ov.retrieval.embeddings;
    const embLive = emb.backend && emb.backend.available;
    const maxAct = Math.max(1, ...ov.activity.map((a) => a.count));

    const stat = (val, label, sub) => `
      <div class="stat-card"><div class="stat-value">${val}</div>
      <div class="stat-label">${label}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;

    document.getElementById('dashBody').innerHTML = `
      <div class="stat-row">
        ${stat(cat.sops, 'procedures',
          `${cat.by_status.active || 0} active · ${cat.by_status.draft || 0} draft · ${cat.by_status.deprecated || 0} deprecated`)}
        ${stat(cat.words.toLocaleString(), 'words',
          `${cat.reading_minutes} min total read`)}
        ${stat(ov.revisions.total, 'revisions', 'history kept forever')}
        ${stat(ov.figures, 'figures', 'attached images')}
        ${stat(embLive ? `${emb.indexed}/${emb.sops}` : 'off', 'semantic',
          embLive ? (emb.lag ? `${emb.lag} awaiting index` : 'index current') : 'install fastembed')}
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><h3>Shape of the catalog</h3><span class="eyebrow">lifecycle</span></div>
          <div class="bar-list">
            ${['active', 'draft', 'deprecated'].map((s) => this.bar(
              s, cat.by_status[s] || 0, cat.sops,
              s === 'active' ? 'var(--color-success)'
                : s === 'draft' ? 'var(--gold)' : 'var(--ink-6)')).join('')}
          </div>
          <div class="card-footer">
            <span class="stat-label">top tags</span>
            <div class="facet-row" style="margin:0">
              ${ov.top_tags.map((t) => `<button class="facet-chip" data-tag="${SOPCS.esc(t.tag)}">#${SOPCS.esc(t.tag)} <span class="rc-tag">${t.count}</span></button>`).join('') || '<span class="toc-empty">no tags yet</span>'}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Edit activity</h3><span class="eyebrow">revisions · 30 days</span></div>
          <div class="act-chart" aria-hidden="true">
            ${ov.activity.map((a) => `<div class="act-col" title="${a.day}: ${a.count} revision(s)">
              <div class="act-fill" style="height:${Math.round((a.count / maxAct) * 100)}%"></div></div>`).join('')}
          </div>
          <div class="card-footer"><span class="stat-label">${ov.activity[0].day} → ${ov.activity[29].day}</span>
            <span class="rc-tag">${ov.revisions.total} revision(s) total</span></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><h3>Recently updated</h3><span class="eyebrow">the live edge</span></div>
          <div class="dash-list">
            ${ov.recent.map((d) => this.docRow(d)).join('') || '<div class="toc-empty">The catalog is empty.</div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Needs review</h3>
            <span class="eyebrow">active · untouched ${ov.stale_days}+ days</span></div>
          <div class="dash-list">
            ${ov.stale_active.map((d) => this.docRow(d, true)).join('')
              || '<div class="toc-empty">Nothing stale — every active procedure is fresh.</div>'}
          </div>
        </div>
      </div>

      <div class="card" id="topicCard">
        <div class="card-header"><h3>Semantic clusters</h3><span class="eyebrow">topic graph</span></div>
        <div class="toc-empty" style="padding:var(--space-6)">Loading…</div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Latest revisions</h3><span class="eyebrow">across the catalog</span></div>
        <div class="data-table-scroll">
          <table class="data-table">
            <thead><tr><th>when</th><th>procedure</th><th>rev</th><th>note</th><th class="num">words</th></tr></thead>
            <tbody>
              ${ov.revisions.recent.map((r) => `
                <tr class="row-link" data-doc="${SOPCS.esc(r.sop_id)}">
                  <td class="text-mono">${SOPCS.esc(SOPCS.Store.fmtDate(r.created_at))}</td>
                  <td>${SOPCS.esc(r.title || r.sop_id)}</td>
                  <td class="text-mono">r${r.seq}</td>
                  <td>${r.comment ? SOPCS.esc(r.comment) : '<em class="rc-tag">no note</em>'}</td>
                  <td class="text-mono num">${r.words ?? '—'}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="toc-empty">No revisions yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ── semantic clusters (the topic graph) ────────────────────────────────
  async loadClusters() {
    const el = document.getElementById('topicCard');
    if (!el) return;
    let res;
    try {
      res = await SOPCS.Store.clusters();
    } catch (err) {
      el.innerHTML = `<div class="toc-empty">${SOPCS.esc(err.message)}</div>`;
      return;
    }
    const meta = res.meta || {};
    if (meta.backend === 'none') {
      const reason = meta.reason || 'unavailable';
      const notComputed = reason.startsWith('not computed');
      const tooFew = reason.startsWith('too few');
      el.innerHTML = `
        <div class="card-header"><h3>Semantic clusters</h3><span class="eyebrow">topic graph</span></div>
        <div class="empty-state" style="padding:var(--space-8) var(--space-5)">
          <div class="empty-icon">${SOPCS.icon('scatter-chart', 30)}</div>
          <h3>${tooFew ? 'Too few to cluster' : 'No cluster map yet'}</h3>
          <p>${tooFew ? SOPCS.esc(reason)
            : 'Compute a semantic map of the catalog — SOPs grouped by meaning, positioned by similarity.'}</p>
          ${tooFew ? '' : `<button class="btn btn-primary btn-sm" id="clusterCompute" style="margin-top:var(--space-3)">${SOPCS.icon('sparkles', 14)} Compute clusters</button>
          <div class="form-hint" style="margin-top:var(--space-2)">requires numpy (lexical) or fastembed + reindex (semantic)</div>`}
        </div>`;
      const btn = document.getElementById('clusterCompute');
      btn?.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'computing…';
        try {
          await SOPCS.Store.computeClusters();
          this.loadClusters();
        } catch (err) {
          SOPCS.toast(err.message);
          btn.disabled = false; btn.textContent = 'Compute clusters';
        }
      });
      return;
    }
    this.drawClusters(res);
  },

  drawClusters(res) {
    const el = document.getElementById('topicCard');
    const meta = res.meta || {};
    const pal = AUTOREGIA.CHART.category(8);
    const assignments = res.assignments || {};
    // legend: cluster id → {label, count, color}
    const clusters = {};
    Object.values(assignments).forEach((a) => {
      if (!clusters[a.cluster]) {
        const idx = parseInt(a.cluster.slice(1), 10) - 1;
        clusters[a.cluster] = { label: a.label, count: 0, color: pal[idx % pal.length] };
      }
      clusters[a.cluster].count += 1;
    });
    el.innerHTML = `
      <div class="card-header">
        <h3>Semantic clusters</h3>
        <span class="eyebrow">${SOPCS.esc(meta.backend)} · k=${meta.k} · n=${meta.n}</span>
      </div>
      <div class="facet-row" style="margin-bottom:var(--space-2)">
        ${Object.entries(clusters).map(([cid, c]) =>
          `<span class="facet-chip" style="cursor:default"><span class="lg-dot" style="background:${c.color}"></span>${SOPCS.esc(c.label)} <span class="rc-tag">${c.count}</span></span>`).join('')}
      </div>
      <div id="topicGraph" class="topic-graph"></div>
      <div class="card-footer"><span class="stat-label">click a node to open the procedure</span>
        <span class="rc-tag">position = semantic similarity (PCA)</span></div>`;

    const host = document.getElementById('topicGraph');
    if (!window.echarts) {
      host.innerHTML = '<div class="toc-empty">echarts not loaded</div>';
      return;
    }
    host.innerHTML = '';
    if (this._chart) { this._chart.dispose(); this._chart = null; }
    const chart = echarts.init(host);
    this._chart = chart;
    const w = host.clientWidth || 600, h = host.clientHeight || 320;
    const scale = 0.45 * Math.min(w, h);
    const nodes = Object.entries(assignments).map(([sid, a]) => {
      const idx = parseInt(a.cluster.slice(1), 10) - 1;
      return {
        id: sid, name: a.title || sid,
        x: w / 2 + a.x * scale, y: h / 2 + a.y * scale,
        symbolSize: 9 + 26 * Math.min(1, (a.words || 0) / 1500),
        itemStyle: { color: pal[idx % pal.length] },
      };
    });
    chart.setOption({
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: { formatter: (p) => p.dataType === 'edge'
        ? `${p.data.source} ↔ ${p.data.target} · ${p.data.value}`
        : `${p.data.name} <span style="opacity:.6">(${p.data.id})</span>` },
      series: [{
        type: 'graph', layout: 'none', roam: true,
        label: { show: true, position: 'right', fontSize: 9, color: '#44413B',
                 formatter: (p) => p.data.name.length > 34 ? p.data.name.slice(0, 33) + '…' : p.data.name },
        lineStyle: { color: '#C9C4B8', opacity: 0.55, width: 1.1, curveness: 0 },
        emphasis: { focus: 'adjacency', label: { fontWeight: 600 } },
        data: nodes,
        links: (res.edges || []).map((e) => ({ source: e.source, target: e.target, value: e.value })),
      }],
    });
    chart.on('click', (p) => {
      if (p.dataType === 'node') SOPCS.navigate('doc/' + p.data.id);
    });
  },

  bar(label, n, total, color) {
    const pct = total ? Math.round((n / total) * 100) : 0;
    return `<div class="bar-row">
      <span class="bar-label">${label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="bar-val">${n}</span>
    </div>`;
  },

  docRow(d, warn) {
    return `<div class="dash-doc ${warn ? 'is-stale' : ''}" data-doc="${SOPCS.esc(d.id)}">
      <span class="badge badge-${SOPCS.esc(d.status)}">${SOPCS.esc(d.status)}</span>
      <span class="dash-doc-title">${SOPCS.esc(d.title)}</span>
      <span class="rc-tag">${SOPCS.esc(SOPCS.Store.readTime(d.reading_minutes))}</span>
      <span class="rc-tag">${SOPCS.esc(SOPCS.Store.fmtDate(d.updated_at))}</span>
      <span class="dash-doc-arrow">${SOPCS.icon('chevron-right', 14)}</span>
    </div>`;
  },
};
