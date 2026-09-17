/* ════════════════════════════════════════════════════════════
   PBS Record — CRUD, Editor, Viewer, List
   ════════════════════════════════════════════════════════════ */
PBS.record = {
  currentFilter: null,
  currentTypeFilter: null
};

const TYPE_COLORS = {
  Goal:'#7A1A2A', Decision:'#2D6A4F', Task:'#B4742A', Project:'#3F6092',
  Event:'#A8854A', Observation:'#2D6A4F', Hypothesis:'#5C4E78',
  Question:'#B4742A', Principle:'#7A1A2A', Reference:'#3F6092', Lesson:'#A8854A',
  Idea:'#8C877B', Meeting:'#3F6092', Procedure:'#2D6A4F', Commitment:'#7A1A2A',
  Constraint:'#A33434', Resource:'#2D6A4F', Opportunity:'#A8854A'
};

PBS.record.renderList = function() {
  const records = this.currentFilter
    ? PBS.Store.search(this.currentFilter)
    : this.currentTypeFilter
      ? PBS.Store.getByType(this.currentTypeFilter)
      : PBS.Store.getAll();

  return `
    <div class="content-header">
      <div><span class="eyebrow">Archive</span><h1>Records</h1></div>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" onclick="PBS.record.openEditor()"><pbs-icon name="plus" size="15"></pbs-icon> New Record</button>
      </div>
    </div>
    <div class="list-toolbar">
      <select onchange="PBS.record.filterByStatus(this.value)">
        <option value="">All Statuses</option>
        <option>Active</option><option>Draft</option><option>Pending</option>
        <option>Completed</option><option>Archived</option><option>Blocked</option>
      </select>
      <select onchange="PBS.record.filterByPriority(this.value)">
        <option value="">All Priorities</option>
        <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
      </select>
      <span class="list-count">${records.length} records</span>
    </div>
    <div class="record-list">
      ${records.length === 0 ? '<div class="empty-state"><div class="empty-icon"><pbs-icon name="file-text" size="46"></pbs-icon></div><h3>No records found</h3><p>Create your first record to get started.</p></div>'
        : records.map((r,i) => this.cardHTML(r,i)).join('')}
    </div>`;
};

PBS.record.cardHTML = function(r, i) {
  const typeColor = TYPE_COLORS[r.record_type] || '#888';
  const statusClass = r.status?.toLowerCase().replace(' ','-') || 'draft';
  const priClass = r.priority?.toLowerCase() || 'medium';
  return `
    <div class="record-card animate-in delay-${(i%5)+1}" style="--rc-accent:${typeColor};" onclick="PBS.record.showDetail('${r.id}')">
      <span class="rc-type" style="background:${typeColor}15;color:${typeColor}">${r.record_type}</span>
      <div class="rc-title">${this.esc(r.content)}</div>
      ${r.detail ? `<div class="rc-preview">${this.esc(r.detail)}</div>` : ''}
      <div class="rc-meta">
        <span class="badge badge-${statusClass}">${r.status||'Draft'}</span>
        <span class="badge pri-${priClass}">${r.priority||'Medium'}</span>
        ${r.domain ? `<span class="rc-domain"><pbs-icon name="folder" size="13"></pbs-icon> ${r.domain}</span>` : ''}
        ${r.tags && r.tags.length ? r.tags.slice(0,3).map(t=>`<span class="rc-tag">#${t}</span>`).join(' ') : ''}
        <span style="margin-left:auto;font-family:var(--font-mono);font-size:var(--text-2xs);">${r.id}</span>
      </div>
    </div>`;
};

PBS.record.esc = function(s) {
  if (!s) return '';
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
};

PBS.record.filterByType = function(type) {
  this.currentTypeFilter = type;
  PBS.navigate('records');
};

PBS.record.filterByStatus = function(status) {
  // Re-render with status filter applied
  const container = document.getElementById('appContent');
  let records = this.currentTypeFilter ? PBS.Store.getByType(this.currentTypeFilter) : PBS.Store.getAll();
  if (status) records = records.filter(r => r.status === status);
  container.querySelector('.list-count').textContent = `${records.length} records`;
  const listEl = container.querySelector('.record-list');
  listEl.innerHTML = records.length ? records.map((r,i)=>this.cardHTML(r,i)).join('')
    : '<div class="empty-state"><h3>No matching records</h3></div>';
};

PBS.record.filterByPriority = function(pri) {
  const container = document.getElementById('appContent');
  let records = this.currentTypeFilter ? PBS.Store.getByType(this.currentTypeFilter) : PBS.Store.getAll();
  if (pri) records = records.filter(r => r.priority === pri);
  container.querySelector('.list-count').textContent = `${records.length} records`;
  const listEl = container.querySelector('.record-list');
  listEl.innerHTML = records.length ? records.map((r,i)=>this.cardHTML(r,i)).join('')
    : '<div class="empty-state"><h3>No matching records</h3></div>';
};

// ── Record Editor Modal ────────────────────────────────
PBS.record.openEditor = function(id) {
  const rec = id ? PBS.Store.getById(id) : null;
  document.getElementById('modalTitle').textContent = rec ? 'Edit Record' : 'New Record';
  document.getElementById('modalBody').innerHTML = this.editorForm(rec);
  const ov = document.getElementById('recordModal');
  ov.classList.remove('hidden');
  this._modal = AUTOREGIA.dialog(ov, { label: rec ? 'Edit record' : 'New record' });
  document.getElementById('edContent')?.focus();
};

PBS.record.closeModal = function() {
  document.getElementById('recordModal').classList.add('hidden');
  if (this._modal) { this._modal.close(); this._modal = null; }
};

PBS.record.editorForm = function(rec) {
  return `<div class="form-group"><label for="edContent">Content *</label>
    <textarea id="edContent" rows="2" placeholder="What do you want to record?">${rec?this.esc(rec.content):''}</textarea></div>
    <div class="form-error" id="edError" role="alert" hidden></div>
    <div class="form-group"><label for="edDetail">Detail / Notes</label>
      <textarea id="edDetail" rows="4" placeholder="Extended information...">${rec?this.esc(rec.detail):''}</textarea></div>
    <div class="meta-grid">
      <div class="form-group"><label for="edType">Type</label><select id="edType">
        ${['Idea','Goal','Decision','Task','Project','Event','Observation','Hypothesis','Question','Principle','Reference','Lesson','Meeting','Procedure','Commitment','Constraint','Resource','Opportunity'].map(t=>`<option${rec?.record_type===t?' selected':''}>${t}</option>`).join('')}
      </select></div>
      <div class="form-group"><label for="edStatus">Status</label><select id="edStatus">
        ${['Draft','Active','Pending','Blocked','Completed','Archived','Scheduled','Cancelled'].map(s=>`<option${rec?.status===s?' selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-group"><label for="edPriority">Priority</label><select id="edPriority">
        ${['Critical','High','Medium','Low'].map(p=>`<option${rec?.priority===p?' selected':''}>${p}</option>`).join('')}
      </select></div>
      <div class="form-group"><label for="edDomain">Domain</label><input type="text" id="edDomain" value="${rec?this.esc(rec.domain||''):'Software Engineering'}"></div>
      <div class="form-group"><label for="edSubject">Subject</label><input type="text" id="edSubject" value="${rec?this.esc(rec.subject||''):''}"></div>
      <div class="form-group"><label for="edProject">Project</label><input type="text" id="edProject" value="${rec?this.esc(rec.project||''):'PBS Implementation'}"></div>
      <div class="form-group"><label for="edConfidence">Confidence</label><select id="edConfidence">
        ${['Very Low','Low','Medium','High','Very High'].map(c=>`<option${rec?.confidence===c?' selected':''}>${c}</option>`).join('')}
      </select></div>
      <div class="form-group"><label for="edDeadline">Deadline</label><input type="date" id="edDeadline" value="${rec?.deadline?rec.deadline.split('T')[0]:''}"></div>
    </div>
    <div class="meta-section open">
      <div class="meta-section-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="chevron"><pbs-icon name="chevron-right" size="14"></pbs-icon></span> Tags
      </div>
      <div class="meta-section-body">
        <div class="tag-input-container" id="tagInputContainer" onclick="this.querySelector('input').focus()">
          ${(rec?.tags||[]).map(t=>this.tagChipHTML(t)).join('')}
          <input type="text" placeholder="Add tag + Enter" aria-label="Add tag" onkeydown="if(event.key==='Enter'){event.preventDefault();PBS.record.addTagFromInput(this);}">
        </div>
      </div>
    </div>`;
};

PBS.record.tagChipHTML = function(t) {
  return `<span class="tag-chip">${this.esc(t)}<button type="button" class="remove-tag" aria-label="Remove tag ${this.esc(t)}" onclick="event.stopPropagation();this.parentElement.remove()"><pbs-icon name="x" size="11"></pbs-icon></button></span>`;
};

PBS.record.addTagFromInput = function(input) {
  const v = input.value.trim();
  if (!v) return;
  input.insertAdjacentHTML('beforebegin', this.tagChipHTML(v));
  input.value = '';
};

// ── Save Record Handler ────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.id === 'btnSaveRecord') { PBS.record.saveCurrent(); }
});

PBS.record.saveCurrent = async function() {
  const getTags = () => {
    const c = document.getElementById('tagInputContainer');
    if (!c) return [];
    return [...c.querySelectorAll('.tag-chip')]
      .map(el => (el.childNodes[0]?.textContent || '').trim())
      .filter(Boolean);
  };
  const data = {
    content: document.getElementById('edContent')?.value || '',
    detail: document.getElementById('edDetail')?.value || '',
    record_type: document.getElementById('edType')?.value || 'Idea',
    status: document.getElementById('edStatus')?.value || 'Draft',
    priority: document.getElementById('edPriority')?.value || 'Medium',
    domain: document.getElementById('edDomain')?.value || '',
    subject: document.getElementById('edSubject')?.value || '',
    project: document.getElementById('edProject')?.value || '',
    confidence: document.getElementById('edConfidence')?.value || 'Medium',
    deadline: document.getElementById('edDeadline')?.value || null,
    tags: getTags(),
    state_class: getStateClass(document.getElementById('edType')?.value||'Idea')
  };
  const errEl = document.getElementById('edError');
  if (!data.content.trim()) {
    if (errEl) { errEl.textContent = 'Content is required.'; errEl.hidden = false; }
    document.getElementById('edContent')?.focus();
    return;
  }
  if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
  const rec = await PBS.Store.add(data);
  this.closeModal();
  PBS.navigate(PBS.currentView);
  PBS.toast(rec && rec._persisted === false ? 'Record saved locally — sync pending' : 'Record saved');
};

function getStateClass(type) {
  const m = {Goal:'Internal Cognitive',Decision:'Internal Cognitive',Task:'Task State',
    Project:'Task State',Event:'Environmental State',Observation:'Reflective State',
    Hypothesis:'Knowledge State',Question:'Reflective State',Principle:'Identity State',
    Reference:'Knowledge State',Lesson:'Reflective State',Idea:'Internal Cognitive',
    Meeting:'Social State',Procedure:'Knowledge State',Commitment:'Social State',
    Constraint:'Environmental State',Resource:'Environmental State',Opportunity:'Environmental State'};
  return m[type]||'Internal Cognitive';
}

// ── Detail Viewer ──────────────────────────────────────
PBS.record.showDetail = function(id) {
  const rec = PBS.Store.getById(id);
  if (!rec) return;
  document.getElementById('detailTitle').textContent = rec.record_type;
  document.getElementById('detailBody').innerHTML = this.detailHTML(rec);
  const ov = document.getElementById('detailModal');
  ov.classList.remove('hidden');
  this._detailModal = AUTOREGIA.dialog(ov, { label: rec.record_type + ' detail' });
};
PBS.record.closeDetail = function() {
  document.getElementById('detailModal').classList.add('hidden');
  if (this._detailModal) { this._detailModal.close(); this._detailModal = null; }
};

PBS.record.detailHTML = function(r) {
  const tc = TYPE_COLORS[r.record_type]||'#888';
  const sc = r.status?.toLowerCase().replace(' ','-')||'draft';
  const pc = r.priority?.toLowerCase()||'medium';
  return `<div class="record-detail">
    <div class="detail-header">
      <div>
        <div class="rc-type" style="background:${tc}15;color:${tc};margin-bottom:var(--space-2)">${r.record_type}</div>
        <h1 class="detail-title">${this.esc(r.content)}</h1>
        <div class="detail-id">${r.id}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="PBS.record.closeDetail();PBS.record.openEditor('${r.id}')">Edit</button>
    </div>
    <div class="detail-meta-bar">
      <span class="badge badge-${sc}">${r.status}</span>
      <span class="badge pri-${pc}">${r.priority}</span>
      ${r.domain?`<span class="rc-domain"><pbs-icon name="folder" size="14"></pbs-icon> ${this.esc(r.domain)}</span>`:''}
      ${r.created_at?`<span style="font-family:var(--font-mono);font-size:var(--text-2sm);">${new Date(r.created_at).toLocaleDateString()}</span>`:''}
      <span class="folio" style="margin-left:auto;font-family:var(--font-mono);font-size:var(--text-2sm);color:var(--color-text-faint);">${r.id}</span>
    </div>
    ${r.detail?`<div class="detail-section"><h4>Detail</h4><div class="detail-content"><p>${this.esc(r.detail)}</p></div></div>`:''}
    ${r.tags?.length?`<div class="detail-section"><h4>Tags</h4>${r.tags.map(t=>`<span class="tag-chip" style="cursor:default">#${t}</span>`).join(' ')}</div>`:''}
    ${r.links?.length?`<div class="detail-section"><h4>Relationships</h4><ul class="link-list">${r.links.map(l=>`<li class="link-item" onclick="PBS.record.showDetail('${l.target}')"><span class="link-type">${l.type}</span> <pbs-icon name="arrow-right" size="13"></pbs-icon> ${l.target}</li>`).join('')}</ul></div>`:''}
    ${r.annotations?.length?`<div class="detail-section"><h4>Annotations (${r.annotations.length})</h4><ul class="annotation-list">${r.annotations.map(a=>`<li class="annotation-item"><div class="annotation-kind">${a.kind}</div><div class="annotation-text">${this.esc(a.text)}</div><div class="annotation-meta">${a.author} · ${new Date(a.created_at).toLocaleDateString()}</div></li>`).join('')}</ul></div>`:''}
    <div class="meta-section">
      <div class="meta-section-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="chevron"><pbs-icon name="chevron-right" size="14"></pbs-icon></span> All Metadata
      </div>
      <div class="meta-section-body">
        <div class="meta-grid" style="font-size:var(--text-sm);color:var(--color-text-secondary);">
          <div><strong>State Class:</strong> ${r.state_class||'—'}</div><div><strong>Evidence:</strong> ${r.evidence_level||'—'}</div>
          <div><strong>Source:</strong> ${r.source_type||'—'}</div><div><strong>Horizon:</strong> ${r.horizon||'—'}</div>
          <div><strong>Relevance:</strong> ${r.relevance||'—'}</div><div><strong>Workflow:</strong> ${r.workflow_state||'—'}</div>
          <div><strong>Recurrence:</strong> ${r.recurrence||'—'}</div><div><strong>Validity:</strong> ${r.validity||'—'}</div>
          <div><strong>Owner:</strong> ${r.owner||'—'}</div>${r.deadline?`<div><strong>Deadline:</strong> ${r.deadline.split('T')[0]}</div>`:''}
          <div><strong>Updated:</strong> ${r.updated_at?new Date(r.updated_at).toLocaleString():'—'}</div>
        </div>
      </div>
    </div>
  </div>`;
};