/* ════════════════════════════════════════════════════════════
   PRS Record — CRUD, Editor, Viewer, List
   ════════════════════════════════════════════════════════════ */
PRS.record = {
  currentFilter: null,
  currentTypeFilter: null
};

const TYPE_COLORS = {
  Goal:'#8B1A1A', Decision:'#4A7C59', Task:'#C17930', Project:'#4A6FA5',
  Event:'#B08D57', Observation:'#2D6A4F', Hypothesis:'#6B5B95',
  Question:'#C17930', Principle:'#8B1A1A', Reference:'#4A6FA5', Lesson:'#B08D57',
  Idea:'#9A9589', Meeting:'#4A6FA5', Procedure:'#2D6A4F', Commitment:'#8B1A1A',
  Constraint:'#B33A3A', Resource:'#4A7C59', Opportunity:'#B08D57'
};

PRS.record.renderList = function() {
  const records = this.currentFilter
    ? PRS.Store.search(this.currentFilter)
    : this.currentTypeFilter
      ? PRS.Store.getByType(this.currentTypeFilter)
      : PRS.Store.getAll();

  return `
    <div class="content-header">
      <div><span class="eyebrow">Archive</span><h1>Records</h1></div>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" onclick="PRS.record.openEditor()"><prs-icon name="plus" size="15"></prs-icon> New Record</button>
      </div>
    </div>
    <div class="list-toolbar">
      <select onchange="PRS.record.filterByStatus(this.value)">
        <option value="">All Statuses</option>
        <option>Active</option><option>Draft</option><option>Pending</option>
        <option>Completed</option><option>Archived</option><option>Blocked</option>
      </select>
      <select onchange="PRS.record.filterByPriority(this.value)">
        <option value="">All Priorities</option>
        <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
      </select>
      <span class="list-count">${records.length} records</span>
    </div>
    <div class="record-list">
      ${records.length === 0 ? '<div class="empty-state"><div class="empty-icon"><prs-icon name="file-text" size="46"></prs-icon></div><h3>No records found</h3><p>Create your first record to get started.</p></div>'
        : records.map((r,i) => this.cardHTML(r,i)).join('')}
    </div>`;
};

PRS.record.cardHTML = function(r, i) {
  const typeColor = TYPE_COLORS[r.record_type] || '#888';
  const statusClass = r.status?.toLowerCase().replace(' ','-') || 'draft';
  const priClass = r.priority?.toLowerCase() || 'medium';
  return `
    <div class="record-card animate-in delay-${(i%5)+1}" style="--rc-accent:${typeColor};" onclick="PRS.record.showDetail('${r.id}')">
      <span class="rc-type" style="background:${typeColor}15;color:${typeColor}">${r.record_type}</span>
      <div class="rc-title">${this.esc(r.content)}</div>
      ${r.detail ? `<div class="rc-preview">${this.esc(r.detail)}</div>` : ''}
      <div class="rc-meta">
        <span class="badge badge-${statusClass}">${r.status||'Draft'}</span>
        <span class="badge pri-${priClass}">${r.priority||'Medium'}</span>
        ${r.domain ? `<span class="rc-domain"><prs-icon name="folder" size="13"></prs-icon> ${r.domain}</span>` : ''}
        ${r.tags && r.tags.length ? r.tags.slice(0,3).map(t=>`<span class="rc-tag">#${t}</span>`).join(' ') : ''}
        <span style="margin-left:auto;font-family:var(--font-mono);font-size:10px;">${r.id}</span>
      </div>
    </div>`;
};

PRS.record.esc = function(s) {
  if (!s) return '';
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
};

PRS.record.filterByType = function(type) {
  this.currentTypeFilter = type;
  PRS.navigate('records');
};

PRS.record.filterByStatus = function(status) {
  // Re-render with status filter applied
  const container = document.getElementById('appContent');
  let records = this.currentTypeFilter ? PRS.Store.getByType(this.currentTypeFilter) : PRS.Store.getAll();
  if (status) records = records.filter(r => r.status === status);
  container.querySelector('.list-count').textContent = `${records.length} records`;
  const listEl = container.querySelector('.record-list');
  listEl.innerHTML = records.length ? records.map((r,i)=>this.cardHTML(r,i)).join('')
    : '<div class="empty-state"><h3>No matching records</h3></div>';
};

PRS.record.filterByPriority = function(pri) {
  const container = document.getElementById('appContent');
  let records = this.currentTypeFilter ? PRS.Store.getByType(this.currentTypeFilter) : PRS.Store.getAll();
  if (pri) records = records.filter(r => r.priority === pri);
  container.querySelector('.list-count').textContent = `${records.length} records`;
  const listEl = container.querySelector('.record-list');
  listEl.innerHTML = records.length ? records.map((r,i)=>this.cardHTML(r,i)).join('')
    : '<div class="empty-state"><h3>No matching records</h3></div>';
};

// ── Record Editor Modal ────────────────────────────────
PRS.record.openEditor = function(id) {
  const rec = id ? PRS.Store.getById(id) : null;
  document.getElementById('modalTitle').textContent = rec ? 'Edit Record' : 'New Record';
  document.getElementById('modalBody').innerHTML = this.editorForm(rec);
  document.getElementById('recordModal').classList.remove('hidden');
};

PRS.record.closeModal = function() { document.getElementById('recordModal').classList.add('hidden'); };

PRS.record.editorForm = function(rec) {
  return `<div class="form-group"><label>Content *</label>
    <textarea id="edContent" rows="2" placeholder="What do you want to record?">${rec?this.esc(rec.content):''}</textarea></div>
    <div class="form-group"><label>Detail / Notes</label>
      <textarea id="edDetail" rows="4" placeholder="Extended information...">${rec?this.esc(rec.detail):''}</textarea></div>
    <div class="meta-grid">
      <div class="form-group"><label>Type</label><select id="edType">
        ${['Idea','Goal','Decision','Task','Project','Event','Observation','Hypothesis','Question','Principle','Reference','Lesson','Meeting','Procedure','Commitment','Constraint','Resource','Opportunity'].map(t=>`<option${rec?.record_type===t?' selected':''}>${t}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Status</label><select id="edStatus">
        ${['Draft','Active','Pending','Blocked','Completed','Archived','Scheduled','Cancelled'].map(s=>`<option${rec?.status===s?' selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Priority</label><select id="edPriority">
        ${['Critical','High','Medium','Low'].map(p=>`<option${rec?.priority===p?' selected':''}>${p}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Domain</label><input type="text" id="edDomain" value="${rec?this.esc(rec.domain||''):'Software Engineering'}"></div>
      <div class="form-group"><label>Subject</label><input type="text" id="edSubject" value="${rec?this.esc(rec.subject||''):''}"></div>
      <div class="form-group"><label>Project</label><input type="text" id="edProject" value="${rec?this.esc(rec.project||''):'PRS Implementation'}"></div>
      <div class="form-group"><label>Confidence</label><select id="edConfidence">
        ${['Very Low','Low','Medium','High','Very High'].map(c=>`<option${rec?.confidence===c?' selected':''}>${c}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Deadline</label><input type="date" id="edDeadline" value="${rec?.deadline?rec.deadline.split('T')[0]:''}"></div>
    </div>
    <div class="meta-section open">
      <div class="meta-section-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="chevron"><prs-icon name="chevron-right" size="14"></prs-icon></span> Tags
      </div>
      <div class="meta-section-body">
        <div class="tag-input-container" onclick="this.querySelector('input').focus()">
          ${(rec?.tags||[]).map(t=>`<span class="tag-chip">${t}<span class="remove-tag" onclick="event.stopPropagation();this.parentElement.remove()"><prs-icon name="x" size="11"></prs-icon></span></span>`).join('')}
          <input type="text" placeholder="Add tag + Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();const v=this.value.trim();if(v){const s=document.createElement(\'span\');s.className=\'tag-chip\';s.textContent=v;this.before(s);this.value=\'\';}}">
        </div>
      </div>
    </div>`;
};

// ── Save Record Handler ────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.id === 'btnSaveRecord') { PRS.record.saveCurrent(); }
});

PRS.record.saveCurrent = async function() {
  const getTags = () => {
    const c = document.getElementById('tagInputContainer');
    if (!c) return [];
    return [...c.querySelectorAll('.tag-chip')].map(el => el.textContent.trim());
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
  if (!data.content.trim()) { alert('Content is required'); return; }
  await PRS.Store.add(data);
  this.closeModal();
  PRS.navigate(PRS.currentView);
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
PRS.record.showDetail = function(id) {
  const rec = PRS.Store.getById(id);
  if (!rec) return;
  document.getElementById('detailTitle').textContent = rec.record_type;
  document.getElementById('detailBody').innerHTML = this.detailHTML(rec);
  document.getElementById('detailModal').classList.remove('hidden');
};
PRS.record.closeDetail = function() { document.getElementById('detailModal').classList.add('hidden'); };

PRS.record.detailHTML = function(r) {
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
      <button class="btn btn-secondary btn-sm" onclick="PRS.record.closeDetail();PRS.record.openEditor('${r.id}')">Edit</button>
    </div>
    <div class="detail-meta-bar">
      <span class="badge badge-${sc}">${r.status}</span>
      <span class="badge pri-${pc}">${r.priority}</span>
      ${r.domain?`<span class="rc-domain"><prs-icon name="folder" size="14"></prs-icon> ${this.esc(r.domain)}</span>`:''}
      ${r.created_at?`<span style="font-family:var(--font-mono);font-size:11px;">${new Date(r.created_at).toLocaleDateString()}</span>`:''}
      <span class="folio" style="margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--color-text-faint);">${r.id}</span>
    </div>
    ${r.detail?`<div class="detail-section"><h4>Detail</h4><div class="detail-content"><p>${this.esc(r.detail)}</p></div></div>`:''}
    ${r.tags?.length?`<div class="detail-section"><h4>Tags</h4>${r.tags.map(t=>`<span class="tag-chip" style="cursor:default">#${t}</span>`).join(' ')}</div>`:''}
    ${r.links?.length?`<div class="detail-section"><h4>Relationships</h4><ul class="link-list">${r.links.map(l=>`<li class="link-item" onclick="PRS.record.showDetail('${l.target}')"><span class="link-type">${l.type}</span> <prs-icon name="arrow-right" size="13"></prs-icon> ${l.target}</li>`).join('')}</ul></div>`:''}
    ${r.annotations?.length?`<div class="detail-section"><h4>Annotations (${r.annotations.length})</h4><ul class="annotation-list">${r.annotations.map(a=>`<li class="annotation-item"><div class="annotation-kind">${a.kind}</div><div class="annotation-text">${this.esc(a.text)}</div><div class="annotation-meta">${a.author} · ${new Date(a.created_at).toLocaleDateString()}</div></li>`).join('')}</ul></div>`:''}
    <div class="detail-section"><h4>All Metadata</h4>
      <div class="meta-grid" style="font-size:var(--text-sm);color:var(--color-text-secondary);">
        <div><strong>State Class:</strong> ${r.state_class||'—'}</div><div><strong>Evidence:</strong> ${r.evidence_level||'—'}</div>
        <div><strong>Source:</strong> ${r.source_type||'—'}</div><div><strong>Horizon:</strong> ${r.horizon||'—'}</div>
        <div><strong>Relevance:</strong> ${r.relevance||'—'}</div><div><strong>Workflow:</strong> ${r.workflow_state||'—'}</div>
        <div><strong>Recurrence:</strong> ${r.recurrence||'—'}</div><div><strong>Validity:</strong> ${r.validity||'—'}</div>
        <div><strong>Owner:</strong> ${r.owner||'—'}</div>${r.deadline?`<div><strong>Deadline:</strong> ${r.deadline.split('T')[0]}</div>`:''}
        <div><strong>Updated:</strong> ${r.updated_at?new Date(r.updated_at).toLocaleString():'—'}</div>
      </div>
    </div>
  </div>`;
};