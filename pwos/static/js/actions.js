/* PWOS Actions - list, editor, detail (Component A) */
window.PW = window.PW || {};

PW.ActionsView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component A · Work Organization</span><h1>Action Constructs</h1></div>' +
    '<div class="actions"><button class="btn btn-primary btn-sm" onclick="PW.Action.openEditor()"><pw-icon name="plus" size="15"></pw-icon> New Action</button></div></div>' +
    '<div class="filter-bar" id="actionFilters"></div>' +
    '<div id="actionList"></div>';
};

PW.bindActions = function () {
  PW.renderActionList();
};

PW.renderActionList = function (list) {
  let actions = list || PW.Store.getActions();
  if (PW._kindFilter) actions = actions.filter(a => a.kind === PW._kindFilter);
  const fb = document.getElementById('actionFilters');
  if (fb) {
    const kinds = [''].concat(PW.ENUMS.kind);
    fb.innerHTML = '<select class="select" id="filterKind"><option value="">All kinds</option>' +
      kinds.slice(1).map(k => '<option value="' + k + '"' + (PW._kindFilter === k ? ' selected' : '') + '>' + k + '</option>').join('') +
      '</select> <select class="select" id="filterSched"><option value="">All states</option>' +
      PW.ENUMS.scheduling_state.map(s => '<option value="' + s + '">' + PW.prettyEnum(s) + '</option>').join('') +
      '</select> <label class="filter-check"><input type="checkbox" id="filterPinned"> Pinned only</label> ' +
      '<label class="filter-check"><input type="checkbox" id="filterBlocked"> Blocked only</label>';
    document.getElementById('filterKind').addEventListener('change', function () { PW._kindFilter = this.value; PW.renderActionList(); });
    document.getElementById('filterSched').addEventListener('change', function () { PW._schedFilter = this.value; PW.renderActionList(); });
    document.getElementById('filterPinned').addEventListener('change', function () { PW._pinnedFilter = this.checked; PW.renderActionList(); });
    document.getElementById('filterBlocked').addEventListener('change', function () { PW._blockedFilter = this.checked; PW.renderActionList(); });
  }
  if (PW._schedFilter) actions = actions.filter(a => a.scheduling_state === PW._schedFilter);
  if (PW._pinnedFilter) actions = actions.filter(a => a.pinned);
  if (PW._blockedFilter) actions = actions.filter(a => (a.dependencies || []).some(d => d.kind === 'blocked-by'));
  const el = document.getElementById('actionList');
  if (!el) return;
  if (!actions.length) { el.innerHTML = '<p class="text-muted">No actions match.</p>'; return; }
  el.innerHTML = actions.map(a => PW._actionCard(a)).join('');
};

PW._actionCard = function (a) {
  const color = PW.kindColor(a.kind);
  const eff = a.effort_estimate ? (a.effort_estimate.value + ' ' + a.effort_estimate.unit) : '—';
  const proj = (a.strategic || {}).project || '—';
  const blocked = (a.dependencies || []).some(d => d.kind === 'blocked-by');
  return '<div class="card action-card" onclick="PW.Action.showDetail(\'' + a.id + '\')">' +
    '<div class="card-body">' +
    '<div class="card-row"><span class="rc-type" style="background:' + color + '15;color:' + color + '">' + a.kind + '</span>' +
    (a.pinned ? '<pw-icon name="bookmark" size="14" style="color:#B4742A"></pw-icon>' : '') +
    (blocked ? '<span class="badge badge-danger">blocked</span>' : '') +
    '<span class="text-muted text-sm mono" style="margin-left:auto">' + a.id + '</span></div>' +
    '<div class="card-title">' + PW.esc(a.record_id) + '</div>' +
    '<div class="card-meta"><span>Effort: ' + eff + '</span> · <span>Project: ' + PW.esc(proj) + '</span> · <span>' + PW.prettyEnum(a.scheduling_state) + '</span></div>' +
    '</div></div>';
};

PW.Action = PW.Action || {};
PW.Action.openEditor = function (existing) {
  const modal = document.getElementById('actionModal');
  const title = document.getElementById('actionModalTitle');
  const body = document.getElementById('actionModalBody');
  title.textContent = existing ? 'Edit Action' : 'New Action';
  PW._editing = existing || null;
  const a = existing || {};
  const opts = function (arr, sel) { return arr.map(v => '<option value="' + v + '"' + (sel === v ? ' selected' : '') + '>' + (v ? PW.prettyEnum(v) : '—') + '</option>').join(''); };
  body.innerHTML =
    '<div class="form-grid">' +
    '<label class="form-field"><span>Kind</span><select class="select" id="f_kind">' + opts(PW.ENUMS.kind, a.kind || 'Task') + '</select></label>' +
    '<label class="form-field"><span>PRS Record Id</span><input class="input" id="f_record" value="' + PW.esc(a.record_id || '') + '" placeholder="REC-2026-…"></label>' +
    '<label class="form-field"><span>Scheduling State</span><select class="select" id="f_sched">' + opts(PW.ENUMS.scheduling_state, a.scheduling_state || 'unscheduled') + '</select></label>' +
    '<label class="form-field"><span>Project</span><input class="input" id="f_project" value="' + PW.esc((a.strategic || {}).project || '') + '" placeholder="P-…"></label>' +
    '<label class="form-field"><span>Objective</span><input class="input" id="f_objective" value="' + PW.esc((a.strategic || {}).objective || '') + '" placeholder="O-…"></label>' +
    '<label class="form-field"><span>Initiative</span><input class="input" id="f_initiative" value="' + PW.esc((a.strategic || {}).initiative || '') + '" placeholder="I-…"></label>' +
    '<label class="form-field"><span>Effort Value</span><input class="input" id="f_effval" type="number" step="0.5" value="' + ((a.effort_estimate || {}).value || '') + '"></label>' +
    '<label class="form-field"><span>Effort Unit</span><select class="select" id="f_effunit">' + opts(PW.ENUMS.effort_unit, (a.effort_estimate || {}).unit) + '</select></label>' +
    '<label class="form-field"><span>Confidence</span><select class="select" id="f_effconf">' + opts(PW.ENUMS.confidence, (a.effort_estimate || {}).confidence) + '</select></label>' +
    '<label class="form-field"><span>Capacity Resource</span><select class="select" id="f_capres">' + opts(PW.ENUMS.capacity_resource, (a.capacity_profile || {}).resource) + '</select></label>' +
    '<label class="form-field"><span>Capacity Band</span><select class="select" id="f_capband">' + opts(PW.ENUMS.capacity_band, (a.capacity_profile || {}).band) + '</select></label>' +
    '<label class="form-field form-field-wide"><span>Pinned</span><label class="filter-check"><input type="checkbox" id="f_pinned" ' + (a.pinned ? 'checked' : '') + '></label></label>' +
    '</div>';
  modal.classList.remove('hidden');
};
PW.Action.closeEditor = function () { document.getElementById('actionModal').classList.add('hidden'); PW._editing = null; };

PW.Action.saveEditor = async function () {
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const num = id => { const v = val(id); return v === '' ? null : parseFloat(v); };
  const data = {
    record_id: val('f_record') || undefined,
    kind: val('f_kind'),
    scheduling_state: val('f_sched'),
    strategic: { project: val('f_project') || null, objective: val('f_objective') || null, initiative: val('f_initiative') || null, capability: null },
    effort_estimate: { value: num('f_effval'), unit: val('f_effunit'), confidence: val('f_effconf') },
    capacity_profile: { resource: val('f_capres'), band: val('f_capband') },
    pinned: document.getElementById('f_pinned').checked,
  };
  if (PW._editing) { await PW.Store.updateAction(PW._editing.id, data); PW.toast('Action updated'); }
  else { await PW.Store.addAction(data); PW.toast('Action created'); }
  PW.Action.closeEditor();
};

PW.Action.showDetail = function (id) {
  const a = PW.Store.getById(id); if (!a) return;
  const color = PW.kindColor(a.kind);
  const body = document.getElementById('detailBody');
  document.getElementById('detailTitle').textContent = a.record_id;
  const eff = a.effort_estimate ? (a.effort_estimate.value + ' ' + PW.prettyEnum(a.effort_estimate.unit) + ' (' + a.effort_estimate.confidence + ')') : '—';
  const deps = (a.dependencies || []).map(d => '<div class="detail-row"><span class="badge badge-neutral">' + PW.prettyEnum(d.kind) + '</span> <span class="mono">' + PW.esc(d.target) + '</span></div>').join('') || '<p class="text-muted">None</p>';
  body.innerHTML =
    '<div class="detail-section"><span class="rc-type" style="background:' + color + '15;color:' + color + '">' + a.kind + '</span> ' +
    '<span class="badge badge-neutral">' + PW.prettyEnum(a.scheduling_state) + '</span> ' +
    (a.pinned ? '<span class="badge badge-warn">pinned</span>' : '') +
    '<span class="text-muted mono text-sm" style="margin-left:8px">' + a.id + '</span></div>' +
    '<div class="detail-grid">' +
    '<div class="detail-field"><label>PRS Record</label><span class="mono">' + PW.esc(a.record_id) + '</span></div>' +
    '<div class="detail-field"><label>Effort Estimate</label><span>' + eff + '</span></div>' +
    '<div class="detail-field"><label>Project</label><span>' + PW.esc((a.strategic || {}).project || '—') + '</span></div>' +
    '<div class="detail-field"><label>Objective</label><span>' + PW.esc((a.strategic || {}).objective || '—') + '</span></div>' +
    '<div class="detail-field"><label>Initiative</label><span>' + PW.esc((a.strategic || {}).initiative || '—') + '</span></div>' +
    '<div class="detail-field"><label>Capacity</label><span>' + PW.prettyEnum((a.capacity_profile || {}).resource) + ' · ' + PW.prettyEnum((a.capacity_profile || {}).band) + '</span></div>' +
    '<div class="detail-field"><label>Created</label><span>' + PW.fmtDate(a.created_at) + '</span></div>' +
    '<div class="detail-field"><label>Updated</label><span>' + PW.fmtDate(a.updated_at) + '</span></div>' +
    '</div>' +
    '<div class="detail-section"><h3>Dependencies</h3>' + deps + '</div>' +
    '<div class="detail-actions"><button class="btn btn-ghost btn-sm" onclick="PW.Action.edit(\'' + a.id + '\')"><pw-icon name="pencil-line" size="14"></pw-icon> Edit</button> ' +
    '<button class="btn btn-ghost btn-sm" onclick="PW.Store.togglePin(\'' + a.id + '\');PW.Action.closeDetail()"><pw-icon name="bookmark" size="14"></pw-icon> Pin</button> ' +
    '<button class="btn btn-ghost btn-sm" onclick="PW.confirmDelete(\'' + a.id + '\')"><pw-icon name="trash-2" size="14"></pw-icon> Delete</button></div>';
  document.getElementById('detailModal').classList.remove('hidden');
};
PW.Action.closeDetail = function () { document.getElementById('detailModal').classList.add('hidden'); };
PW.Action.edit = function (id) { PW.Action.closeDetail(); PW.Action.openEditor(PW.Store.getById(id)); };

PW.confirmDelete = async function (id) {
  if (confirm('Delete this action?')) { await PW.Store.removeAction(id); PW.Action.closeDetail(); PW.toast('Action deleted'); }
};
