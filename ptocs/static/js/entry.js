/* PTOCS Entry — Catalog list, filters, editor modal, detail modal */
PT.Entry = {
  _filters: {},

  filterKind(kind) { this.applyFilters(Object.assign({}, this._filters, { kind: kind })); PT.navigate('catalog'); },

  applyFilters(f) {
    this._filters = f || {};
    const list = document.getElementById('entryListContainer');
    if (!list) return;
    list.innerHTML = this._renderCards(this._filtered());
    const count = document.getElementById('listCount');
    if (count) count.textContent = this._filtered().length + ' of ' + PT.Store.getAll().length;
  },

  _filtered() {
    let entries = PT.Store.getAll();
    const f = this._filters;
    if (f.kind) entries = entries.filter(function (e) { return e.object_kind === f.kind; });
    if (f.status) entries = entries.filter(function (e) { return e.status === f.status; });
    if (f.domain) entries = entries.filter(function (e) { return e.domain === f.domain; });
    if (f.priority) entries = entries.filter(function (e) { return e.priority === f.priority; });
    if (f.system) entries = entries.filter(function (e) { return e.strategic && e.strategic.system_served === f.system; });
    if (f.q) {
      const q = f.q.toLowerCase();
      entries = PT.Store.search(f.q).map(function (e) { delete e._sc; return e; });
    }
    return entries;
  },

  renderList() {
    const entries = PT.Store.getAll();
    const kindOpts = PT.ENUMS.object_kind.map(function (k) { return '<option value="' + k + '">' + PT.prettyEnum(k) + '</option>'; }).join('');
    const statusOpts = PT.ENUMS.status.map(function (k) { return '<option value="' + k + '">' + PT.prettyEnum(k) + '</option>'; }).join('');
    return '<div class="content-header"><div><span class="eyebrow">Catalog</span><h1>Technical Objects</h1></div>' +
      '<div class="actions"><button class="btn btn-primary btn-sm" onclick="PT.Entry.openEditor()"><pt-icon name="plus" size="15"></pt-icon> New Entry</button></div></div>' +
      '<div class="list-toolbar">' +
        '<input type="search" id="catalogSearch" placeholder="Filter entries…" autocomplete="off">' +
        '<select id="fKind"><option value="">All Kinds</option>' + kindOpts + '</select>' +
        '<select id="fStatus"><option value="">All Status</option>' + statusOpts + '</select>' +
        '<button class="btn btn-ghost btn-sm" onclick="PT.Entry.clearFilters()"><pt-icon name="x" size="14"></pt-icon> Clear</button>' +
        '<span class="list-count" id="listCount">' + entries.length + ' of ' + entries.length + '</span>' +
      '</div>' +
      '<div class="entry-list" id="entryListContainer">' + this._renderCards(entries) + '</div>';
  },

  _renderCards(entries) {
    if (!entries.length) return '<div class="empty-state"><div class="empty-icon">' + PT.icon('box', 40) + '</div><h3>No entries</h3><p>Adjust filters or create a new entry.</p></div>';
    return entries.map(function (e) { return PT.Entry._card(e); }).join('');
  },

  _card(e) {
    const color = PT.kindColor(e.object_kind);
    const kindIcon = PT.KIND_ICONS[e.object_kind] || 'circle';
    return '<div class="entry-card" style="--kind-color:' + color + '" onclick="PT.Entry.showDetail(\'' + e.id + '\')">' +
      '<div class="entry-card-head"><div><div class="entry-card-name">' + PT.esc(e.name) + '</div>' +
      '<div class="entry-card-id">' + PT.esc(e.id) + '</div></div>' +
      '<pt-icon name="' + kindIcon + '" size="20" style="color:' + color + '"></pt-icon></div>' +
      '<div class="entry-card-summary">' + PT.esc(e.summary) + '</div>' +
      '<div class="entry-card-meta">' +
        PT.badge('badge-status-' + e.status, PT.prettyEnum(e.status)) +
        PT.badge('badge-priority-' + e.priority, PT.prettyEnum(e.priority)) +
        '<span class="mini-badge">' + PT.prettyEnum(e.object_kind) + '</span>' +
        (e.domain ? '<span class="mini-badge">' + PT.esc(e.domain) + '</span>' : '') +
        (e.relations && e.relations.length ? '<span class="mini-badge">' + PT.icon('git-branch',12) + ' ' + e.relations.length + '</span>' : '') +
      '</div></div>';
  },

  afterRender() {
    const self = this;
    const cs = document.getElementById('catalogSearch');
    if (cs) cs.addEventListener('input', function (e) { self.applyFilters(Object.assign({}, self._filters, { q: e.target.value })); });
    const fk = document.getElementById('fKind'); if (fk) fk.addEventListener('change', function (e) { self.applyFilters(Object.assign({}, self._filters, { kind: e.target.value })); });
    const fs = document.getElementById('fStatus'); if (fs) fs.addEventListener('change', function (e) { self.applyFilters(Object.assign({}, self._filters, { status: e.target.value })); });
  },

  clearFilters() {
    this._filters = {};
    const cs = document.getElementById('catalogSearch'); if (cs) cs.value = '';
    const fk = document.getElementById('fKind'); if (fk) fk.value = '';
    const fs = document.getElementById('fStatus'); if (fs) fs.value = '';
    this.applyFilters({});
  },

  // ── Editor modal ──
  _editing: null,
  openEditor(entry) {
    const isEdit = !!entry;
    this._editing = isEdit ? entry.id : null;
    document.getElementById('entryModalTitle').textContent = isEdit ? 'Edit Entry' : 'New Entry';
    document.getElementById('entryModalBody').innerHTML = this._editorForm(isEdit ? entry : null);
    document.getElementById('entryModal').classList.remove('hidden');
    setTimeout(function () { const n = document.getElementById('fld_name'); if (n) n.focus(); }, 60);
  },
  closeEditor() { document.getElementById('entryModal').classList.add('hidden'); this._editing = null; },

  _editorForm(e) {
    e = e || {};
    const prov = e.provenance || {};
    const cost = e.cost || {};
    const usage = e.usage || {};
    const epi = e.epistemic || {};
    const strat = e.strategic || {};
    const sel = function (arr, val) {
      return arr.map(function (o) { return '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + PT.prettyEnum(o) + '</option>'; }).join('');
    };
    return '<div class="form-grid">' +
      f('Name', '<input id="fld_name" value="' + PT.esc(e.name) + '">', true) +
      f('Object Kind', '<select id="fld_object_kind">' + sel(PT.ENUMS.object_kind, e.object_kind) + '</select>') +
      f('Category', '<input id="fld_category" value="' + PT.esc(e.category) + '">') +
      f('Domain', '<input id="fld_domain" value="' + PT.esc(e.domain) + '">') +
      f('Status', '<select id="fld_status">' + sel(PT.ENUMS.status, e.status) + '</select>') +
      f('Priority', '<select id="fld_priority">' + sel(PT.ENUMS.priority, e.priority) + '</select>') +
      f('Hosting', '<select id="fld_hosting_model">' + sel(PT.ENUMS.hosting_model, e.hosting_model) + '</select>') +
      f('Access', '<select id="fld_access_model">' + sel(PT.ENUMS.access_model, e.access_model) + '</select>') +
      f('Summary', '<input id="fld_summary" value="' + PT.esc(e.summary) + '">', true) +
      f('Purpose', '<input id="fld_purpose" value="' + PT.esc(e.purpose) + '">', true) +
      f('Function', '<input id="fld_function" value="' + PT.esc(e.function) + '">', true) +
      f('Detail', '<textarea id="fld_detail">' + PT.esc(e.detail) + '</textarea>', true) +
      f('Vendor', '<input id="fld_vendor" value="' + PT.esc(prov.vendor) + '">') +
      f('Version', '<input id="fld_version" value="' + PT.esc(prov.version) + '">') +
      f('License', '<input id="fld_license" value="' + PT.esc(prov.license) + '">') +
      f('Source URL', '<input id="fld_source_url" value="' + PT.esc(prov.source_url) + '">') +
      f('Interface', '<select id="fld_interface">' + sel(PT.ENUMS.interface, usage.interface) + '</select>') +
      f('Docs URL', '<input id="fld_docs_url" value="' + PT.esc(usage.docs_url) + '">') +
      f('Cost Kind', '<select id="fld_cost_kind">' + sel(PT.ENUMS.cost_kind, cost.kind) + '</select>') +
      f('Cost Amount', '<input id="fld_cost_amount" type="number" step="0.01" value="' + (cost.amount || '') + '">') +
      f('Cost Currency', '<input id="fld_cost_currency" value="' + PT.esc(cost.currency) + '">') +
      f('System Served', '<select id="fld_system_served"><option value="">—</option>' + sel(PT.ENUMS.system_served, strat.system_served) + '</select>') +
      f('Capability', '<input id="fld_capability" value="' + PT.esc(strat.capability) + '">') +
      f('Fit Confidence', '<select id="fld_fit"><option value="">—</option>' + sel(PT.ENUMS.fit_confidence, epi.fit_confidence) + '</select>') +
      f('Evidence Level', '<select id="fld_evidence"><option value="">—</option>' + sel(PT.ENUMS.evidence_level, epi.evidence_level) + '</select>') +
      f('Rating (0-5)', '<input id="fld_rating" type="number" min="0" max="5" step="0.5" value="' + (epi.rating != null ? epi.rating : '') + '">') +
      f('Tags', '<input id="fld_tags" value="' + PT.esc((e.tags || []).join(', ')) + '">', true) +
      '</div>';
    function f(label, control, full) {
      return '<div class="form-field' + (full ? ' full' : '') + '"><label>' + label + '</label>' + control + '</div>';
    }
  },

  async saveEditor() {
    const g = function (id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const n = function (id) { const v = g(id); return v === '' ? null : parseFloat(v); };
    const tags = g('fld_tags').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    const payload = {
      name: g('fld_name') || 'Untitled',
      object_kind: g('fld_object_kind'), category: g('fld_category') || null,
      domain: g('fld_domain') || null, status: g('fld_status'), priority: g('fld_priority'),
      hosting_model: g('fld_hosting_model'), access_model: g('fld_access_model'),
      summary: g('fld_summary'), purpose: g('fld_purpose'), function: g('fld_function'),
      detail: g('fld_detail'), tags: tags,
      provenance: { vendor: g('fld_vendor') || null, version: g('fld_version') || null,
        license: g('fld_license') || null, source_url: g('fld_source_url') || null,
        acquired_at: (this._editing && PT.Store.getById(this._editing) && PT.Store.getById(this._editing).provenance || {}).acquired_at || null },
      usage: { interface: g('fld_interface'), docs_url: g('fld_docs_url') || null },
      cost: { kind: g('fld_cost_kind'), amount: n('fld_cost_amount'), currency: g('fld_cost_currency') || null },
      strategic: { system_served: g('fld_system_served') || null, capability: g('fld_capability') || null },
      epistemic: { fit_confidence: g('fld_fit') || 'medium', evidence_level: g('fld_evidence') || 'anecdotal', rating: n('fld_rating') },
    };
    if (this._editing) {
      await PT.Store.update(this._editing, payload);
      PT.toast('Entry updated');
    } else {
      await PT.Store.add(payload);
      PT.toast('Entry created');
    }
    this.closeEditor();
    if (PT.currentView === 'catalog') PT.navigate('catalog');
    if (PT.currentView === 'dashboard') PT.navigate('dashboard');
  },

  // ── Detail modal ──
  showDetail(id) {
    const e = PT.Store.getById(id); if (!e) return;
    document.getElementById('detailTitle').textContent = e.name;
    document.getElementById('detailBody').innerHTML = this._detailBody(e);
    document.getElementById('detailModal').classList.remove('hidden');
    // bind annotation form
    const ab = document.getElementById('annSubmit');
    if (ab) ab.addEventListener('click', function () { PT.Entry.submitAnnotation(id); });
    // bind collapsible sections
    document.querySelectorAll('.meta-section-header').forEach(function (h) {
      h.addEventListener('click', function () { h.parentElement.classList.toggle('open'); });
    });
  },
  closeDetail() { document.getElementById('detailModal').classList.add('hidden'); },

  _detailBody(e) {
    const color = PT.kindColor(e.object_kind);
    const prov = e.provenance || {}, cost = e.cost || {}, usage = e.usage || {}, epi = e.epistemic || {}, strat = e.strategic || {};
    const anns = e.annotations || [];
    const rels = e.relations || [];
    const mi = function (k, v) { return '<div class="meta-item"><span class="meta-key">' + k + '</span><span class="meta-val">' + (v == null || v === '' ? '<span class="text-faint">—</span>' : v) + '</span></div>'; };
    const link = function (u) { return u ? '<a href="' + PT.esc(u) + '" target="_blank" rel="noopener">' + PT.esc(u) + '</a>' : '<span class="text-faint">—</span>'; };
    const sec = function (title, open, inner) {
      return '<div class="meta-section' + (open ? ' open' : '') + '"><div class="meta-section-header"><span class="chevron">' + PT.icon('chevron-right',14) + '</span>' + title + '</div><div class="meta-section-body">' + inner + '</div></div>';
    };
    let html = '<div class="entry-detail"><div class="detail-header"><div>' +
      '<div class="detail-title">' + PT.esc(e.name) + '</div>' +
      '<div class="detail-id">' + PT.esc(e.id) + ' · ' + PT.prettyEnum(e.object_kind) + '</div></div>' +
      '<div class="detail-meta-bar" style="margin:0;flex-direction:column;align-items:flex-end;border:none;padding:0;">' +
        PT.badge('badge-status-' + e.status, PT.prettyEnum(e.status)) + PT.badge('badge-priority-' + e.priority, PT.prettyEnum(e.priority)) +
      '</div></div>';
    if (e.summary) html += '<div class="detail-section"><div class="detail-content"><p>' + PT.esc(e.summary) + '</p></div></div>';
    if (e.purpose) html += '<div class="detail-purpose"><strong>Purpose —</strong> ' + PT.esc(e.purpose) + '</div>';
    if (e.function) html += '<div class="detail-function"><strong>Function —</strong> ' + PT.esc(e.function) + '</div>';
    if (e.detail) html += '<div class="detail-section"><h4>Detail</h4><div class="detail-content">' + PT.esc(e.detail).replace(/\n/g, '<br>') + '</div></div>';
    // Classification
    html += sec('Classification', true, '<div class="meta-grid">' +
      mi('Kind', PT.prettyEnum(e.object_kind)) + mi('Category', PT.prettyEnum(e.category)) +
      mi('Domain', PT.esc(e.domain)) + mi('Status', PT.prettyEnum(e.status)) +
      mi('Priority', PT.prettyEnum(e.priority)) + mi('Lifecycle', PT.prettyEnum(e.lifecycle_state)) +
      mi('Workflow', PT.prettyEnum(e.workflow_state)) + mi('Tags', (e.tags || []).join(', ')) +
      '</div>');
    // Provenance & Delivery
    html += sec('Provenance & Delivery', false, '<div class="meta-grid">' +
      mi('Vendor', PT.esc(prov.vendor)) + mi('Version', PT.esc(prov.version)) +
      mi('License', PT.esc(prov.license)) + mi('Source', link(prov.source_url)) +
      mi('Acquired', fmtDate(prov.acquired_at)) + mi('Hosting', PT.prettyEnum(e.hosting_model)) +
      mi('Access', PT.prettyEnum(e.access_model)) + mi('Interface', PT.prettyEnum(usage.interface)) +
      mi('Docs', link(usage.docs_url)) + mi('Invocation', PT.esc(usage.invocation)) +
      '</div>');
    // Cost & Strategic
    html += sec('Cost & Strategic', false, '<div class="meta-grid">' +
      mi('Cost Kind', PT.prettyEnum(cost.kind)) + mi('Amount', cost.amount ? (cost.currency || '') + ' ' + cost.amount : '—') +
      mi('Period', PT.esc(cost.period)) + mi('System Served', PT.prettySystem(strat.system_served)) +
      mi('Capability', PT.esc(strat.capability)) + mi('Objective', PT.esc(strat.objective)) +
      '</div>');
    // Epistemic
    html += sec('Epistemic', false, '<div class="meta-grid">' +
      mi('Fit Confidence', PT.prettyEnum(epi.fit_confidence)) + mi('Evidence', PT.prettyEnum(epi.evidence_level)) +
      mi('Rating', epi.rating != null ? epi.rating + ' / 5' : '—') + mi('Last Used', fmtDate(e.last_used_at)) +
      '</div>');
    // Relations
    if (rels.length) {
      html += '<div class="detail-section"><h4>Relationships</h4><div class="relations-list">' +
        rels.map(function (r) { return '<div class="relation-row"><span class="relation-kind">' + r.kind.replace(/_/g,' ') + '</span>' +
          '<span class="relation-arrow">→</span><span class="relation-target" onclick="PT.Entry.showDetail(\'' + r.target + '\')">' + PT.esc(targetName(r.target)) + '</span>' +
          (r.notes ? '<span class="relation-notes">' + PT.esc(r.notes) + '</span>' : '') + '</div>'; }).join('') + '</div></div>';
    }
    // Annotations
    html += '<div class="detail-section"><h4>Annotation Log</h4><div class="annotation-list">' +
      (anns.length ? anns.map(function (a) { return '<div class="annotation ' + a.state + '"><div class="annotation-head">' +
        '<span class="annotation-author">' + PT.esc(a.author) + '</span>' +
        '<span class="annotation-kind">' + a.kind.replace(/_/g,' ') + '</span>' +
        '<span class="annotation-state ' + a.state + '">' + a.state + '</span>' +
        '<span class="annotation-date">' + fmtDate(a.created_at) + '</span></div>' +
        '<div class="annotation-text">' + PT.esc(a.text) + '</div></div>'; }).join('') : '<p class="text-muted text-sm">No annotations yet.</p>') +
      '</div>' +
      '<div class="annotation-form"><textarea id="annText" placeholder="Add an annotation…"></textarea>' +
      '<div class="annotation-form-row"><select id="annKind" style="max-width:160px;">' + PT.ENUMS.annotation_kind.map(function (k) { return '<option value="' + k + '">' + k.replace(/_/g,' ') + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-primary btn-sm" id="annSubmit">Add</button></div></div>' +
      '</div>';
    // Footer actions
    html += '<div class="detail-section"><div class="card-footer"><button class="btn btn-secondary btn-sm" onclick="PT.Entry.openEditor(PT.Store.getById(\'' + e.id + '\'))"><pt-icon name="edit" size="15"></pt-icon> Edit</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="PT.retire(\'' + e.id + '\')"><pt-icon name="inbox" size="15"></pt-icon> Retire</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="PT.confirmDelete(\'' + e.id + '\')" style="color:var(--color-danger)"><pt-icon name="trash-2" size="15"></pt-icon> Delete</button></div></div>';
    html += '</div>';
    return html;
    function fmtDate(s) { if (!s) return '<span class="text-faint">—</span>'; const d = new Date(s); if (isNaN(d)) return PT.esc(s); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    function targetName(t) { const x = PT.Store.getById(t); return x ? x.name : t; }
  },

  async submitAnnotation(id) {
    const ta = document.getElementById('annText'); const ki = document.getElementById('annKind');
    if (!ta || !ta.value.trim()) return;
    await PT.Store.addAnnotation(id, { author: 'self', kind: ki ? ki.value : 'comment', text: ta.value.trim(), state: 'open' });
    PT.toast('Annotation added');
    this.showDetail(id);
  },
};

// Footer actions defined on the PT namespace (referenced by detail body).
PT.retire = async function (id) {
  await PT.Store.update(id, { status: 'retired', lifecycle_state: 'retired', workflow_state: 'removed' });
  PT.toast('Entry retired');
  PT.Entry.closeDetail();
  if (PT.currentView === 'catalog') PT.navigate('catalog');
};
PT.confirmDelete = function (id) {
  const e = PT.Store.getById(id); if (!e) return;
  if (confirm('Delete entry "' + e.name + '"? This cannot be undone.')) {
    PT.Store.remove(id).then(function () { PT.toast('Entry deleted'); PT.Entry.closeDetail(); if (PT.currentView === 'catalog') PT.navigate('catalog'); });
  }
};
