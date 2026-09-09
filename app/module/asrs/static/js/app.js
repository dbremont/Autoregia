/* ════════════════════════════════════════════════════════════
   ASRS — Agent Self Representation System
   Renders the integrated self-representation (World + Model + Self + Policy)
   and the consistency check. Prefix `/asrs/` is baked in for the unified router.
   ════════════════════════════════════════════════════════════ */
(function () {
  var elComposition = document.getElementById('composition');
  var elParts = document.getElementById('parts');
  var elCheck = document.getElementById('check');
  var elState = document.getElementById('state');

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  // ── Composition diagram ──────────────────────────────────────
  function renderComposition(world, model, policy) {
    var ext = world.external || {}, intl = world.internal || {};
    var half = function (tag, name, desc, ref) {
      return '<div class="half">' +
        '<div class="half-tag">' + esc(tag) + '</div>' +
        '<div class="half-name">' + esc(name) + '</div>' +
        '<p class="half-desc">' + esc(desc) + '</p>' +
        '<div class="half-model">' + esc(ref) + '</div>' +
        '</div>';
    };
    elComposition.innerHTML =
      '<div class="comp-layer">' +
        '<div class="layer-head"><span class="layer-tag">' + esc(policy.ref || 'PPS') + '</span>' +
        '<span class="layer-name">Policy System</span></div>' +
        '<p class="layer-note">Normative — what the agent ought to do and be.</p>' +
        '<div class="comp-arrow">▼ writes charter · values · principles · commitments</div>' +
      '</div>' +
      '<div class="world-frame">' +
        '<div class="frame-label">WORLD = (EXTERNAL, INTERNAL)</div>' +
        '<div class="world-halves">' +
          half('EXTERNAL', 'Model — ' + (model.label || 'PWMS'),
               model.description || 'Typed ontology of the external world.', model.ref || 'PWMS') +
          half('INTERNAL', 'Self Model — ' + ((world.internal||{}).label || 'PSMS'),
               intl.description || 'Typed model of the agent.', intl.model || 'PSMS') +
        '</div>' +
      '</div>' +
      '<div class="comp-arrow" style="margin-top:14px">▲ read by Perception · Situation Model · Decision · Regulation ▲</div>';
  }

  // ── Facet helpers ────────────────────────────────────────────
  function facet(label, itemsHtml) {
    if (!itemsHtml) return '';
    return '<div class="facet"><div class="facet-label">' + esc(label) + '</div>' + itemsHtml + '</div>';
  }
  function itemLine(name, meta, desc) {
    return '<div class="facet-item"><span class="fi-name">' + esc(name) +
      (meta ? '</span><span class="fi-meta">' + esc(meta) + '</span>' : '</span>') +
      (desc ? '<span class="fi-desc">' + esc(desc) + '</span>' : '') + '</div>';
  }

  function renderModel(model) {
    var et = (model.entity_types || []).map(function (t) { return itemLine(t.name, null, t.description); }).join('');
    var rt = (model.relation_types || []).map(function (t) { return itemLine(t.name, null, t.description); }).join('');
    var ev = (model.event_types || []).map(function (t) { return itemLine(t.name, null, t.description); }).join('');
    var dm = (model.domains || []).map(function (t) { return itemLine(t.name, null, t.description); }).join('');
    return partCard(model.ref || 'PWMS', model.label || 'Model',
      model.description || 'Typed ontology of the external world.',
      facet('Entity types', et) + facet('Relation types', rt) +
      facet('Event types', ev) + facet('Domains', dm));
  }

  function renderSelf(selfModel) {
    var id = selfModel.identity || {};
    var idHtml = itemLine(id.name || '—', id.charter_ref, id.narrative);

    var capHtml = (selfModel.capabilities || []).map(function (c) {
      return itemLine(c.name, c.proficiency, (c.tool_fluencies || []).join(', '));
    }).join('');

    // resources with usage bars, computed from commitments
    var usage = {};
    (selfModel.commitments || []).forEach(function (c) {
      if (c.draws_on) usage[c.draws_on] = (usage[c.draws_on] || 0) + (c.cost || 0);
    });
    var resHtml = (selfModel.resources || []).map(function (r) {
      var used = usage[r.id] || 0;
      var cap = r.capacity || 0;
      var pct = cap ? Math.min(100, Math.round(used / cap * 100)) : 0;
      var over = used > cap;
      return '<div class="facet-item" style="flex-direction:column;align-items:stretch;gap:0">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">' +
        '<span class="fi-name">' + esc(r.name) + '</span>' +
        '<span class="fi-meta">' + used + ' / ' + cap + ' ' + esc(r.unit || '') + '</span></div>' +
        '<div class="usage-bar' + (over ? ' over' : '') + '"><span style="width:' + pct + '%"></span></div>' +
        '<div class="usage-meta' + (over ? ' over' : '') + '">' + esc(r.replenishes || '') +
        (over ? '  ·  over by ' + (used - cap) : '') + '</div></div>';
    }).join('');

    var belHtml = (selfModel.beliefs || []).map(function (b) {
      return itemLine(b.claim, b.confidence, b.subject);
    }).join('');

    var comHtml = (selfModel.commitments || []).map(function (c) {
      return itemLine(c.name, (c.cost ? c.cost + ' ' : '') + (c.domain || ''), c.draws_on ? 'draws on ' + c.draws_on + (c.violates ? ' · violates ' + c.violates : '') : '');
    }).join('');

    var conHtml = (selfModel.constraints || []).map(function (k) {
      return itemLine(k.name, k.id, k.rule + (k.source ? ' · ' + k.source : ''));
    }).join('');

    var facets =
      facet('Identity', idHtml) + facet('Capabilities', capHtml) + facet('Resources', resHtml) +
      facet('Beliefs / mental models', belHtml) + facet('Commitments', comHtml) + facet('Constraints', conHtml);

    return partCard(selfModel.ref || 'PSMS', selfModel.label || 'Self Model',
      selfModel.description || 'Typed model of the agent.',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 28px">' + facets + '</div>');
  }

  function renderPolicy(policy) {
    var ch = policy.charter || {};
    var chHtml = itemLine(ch.purpose || '—', null, ch.apex_ref ? 'apex: ' + ch.apex_ref : null);

    var valHtml = (policy.values || []).map(function (v) {
      return itemLine(v.name, '#' + v.rank, v.note);
    }).join('');
    var prHtml = (policy.principles || []).map(function (p) {
      return itemLine(p.name, null, null);
    }).join('');
    var pcmHtml = (policy.commitments || []).map(function (c) {
      return itemLine(c.name, c.domain, null);
    }).join('');
    var dpHtml = (policy.domain_policies || []).map(function (d) {
      return itemLine(d.name, null, d.ref);
    }).join('');

    return partCard(policy.ref || 'PPS', policy.label || 'Policy System',
      policy.description || 'Normative layer.',
      facet('Charter', chHtml) + facet('Values (ranked)', valHtml) +
      facet('Principles', prHtml) + facet('Commitments', pcmHtml) + facet('Domain policies', dpHtml));
  }

  function partCard(ref, name, desc, inner) {
    return '<div class="part-card">' +
      '<div class="part-head"><h3>' + esc(name) + '</h3><span class="part-ref">' + esc(ref) + '</span></div>' +
      '<p class="part-desc">' + esc(desc) + '</p>' +
      '<div class="facet-grid">' + inner + '</div></div>';
  }

  // ── Consistency check ────────────────────────────────────────
  function renderCheck(check) {
    var ok = check.ok;
    var banner = '<div class="check-banner ' + (ok ? 'ok' : 'issues') + '">' +
      '<div class="check-dot"></div>' +
      '<div><div class="check-title">' +
        (ok ? 'Self-representation is internally consistent.' :
             check.count + ' finding' + (check.count === 1 ? '' : 's') + ' needing attention') +
      '</div><div class="check-sub">' +
        (ok ? 'No resource over-allocation, constraint violation, or value drift detected.' :
             'The integrated model disagrees with itself — resolve before acting on it.') +
      '</div></div></div>';

    var findings = '';
    if (!ok && check.findings && check.findings.length) {
      findings = '<div class="findings">' + check.findings.map(function (f) {
        return '<div class="finding ' + (f.severity === 'medium' ? 'sev-medium' : '') + '">' +
          '<div class="f-kind">' + esc(f.kind) + '</div>' +
          '<p class="f-msg">' + esc(f.message) + '</p></div>';
      }).join('') + '</div>';
    }
    elCheck.innerHTML = banner + findings;
  }

  // ── Load & wire up ───────────────────────────────────────────
  Promise.all([
    fetch('/asrs/api/representation').then(function (r) { return r.json(); }),
    fetch('/asrs/api/check').then(function (r) { return r.json(); })
  ]).then(function (res) {
    var rep = res[0], check = res[1];
    renderComposition(rep.world || {}, rep.model || {}, rep.policy || {});
    elParts.innerHTML =
      renderModel(rep.model || {}) + renderSelf(rep.self || {}) + renderPolicy(rep.policy || {});
    renderCheck(check);
    if (elState) elState.style.display = 'none';
  }).catch(function () {
    if (elState) elState.textContent = 'Could not load the self-representation. Is the ASRS server running?';
  });
})();
