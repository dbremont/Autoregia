/* ════════════════════════════════════════════════════════════
   AIAS Editor — capture · edit · detail · transitions · notes
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};
AI.Editor = (() => {
  const DEF = {
    sources: ['Problem', 'Opportunity', 'Commitment', 'Request', 'Identity', 'Habit', 'Curiosity'],
    priorities: ['Critical', 'High', 'Medium', 'Low'],
    statuses: ['Generated', 'Evaluated', 'Selected', 'Committed', 'In Progress', 'Paused', 'Needs Review', 'Deferred', 'Blocked', 'Completed', 'Cancelled', 'Superseded', 'Merged'],
    confidences: ['Very Low', 'Low', 'Medium', 'High', 'Very High']
  };
  function tax() { return Object.assign({}, DEF, AI.Store.getTaxonomy() || {}); }

  /* ── Quick capture overlay ─────────────────────────────── */
  function openCapture() {
    const t = tax();
    const html = `
      <div class="modal-overlay" id="capOverlay">
        <div class="modal" style="max-width:520px">
          <div class="modal-header"><h2>Quick capture</h2>
            <button class="btn-icon" data-close>${AI.icon('x', 17)}</button></div>
          <div class="modal-body">
            <div class="field">
              <label class="field-label">What wants attention?</label>
              <textarea class="textarea" id="capDesc" placeholder="An intention, a problem, an opportunity…" autofocus></textarea>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">Source</label>
                <select class="select" id="capSrc">${opts(t.sources, 'Problem')}</select></div>
              <div class="field"><label class="field-label">Priority</label>
                <select class="select" id="capPri">${opts(t.priorities, 'Medium')}</select></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" data-close>Cancel</button>
            <button class="btn btn-primary btn-sm" id="capSave">${AI.icon('inbox', 14)} Capture candidate</button>
          </div>
        </div>
      </div>`;
    mount(html, () => {
      const desc = document.getElementById('capDesc').value.trim();
      if (!desc) { AI.app.toast('Describe the intention first'); return; }
      AI.Store.add({
        description: desc,
        source: document.getElementById('capSrc').value,
        priority: document.getElementById('capPri').value,
        status: 'Generated', confidence: 'Medium'
      }).then(() => { close(); AI.app.toast('Candidate captured into triage'); });
    });
    document.getElementById('capDesc').focus();
  }

  /* ── Full editor (new / edit) ──────────────────────────── */
  function openNew() { openEdit(null); }
  function openEdit(id) {
    const it = id ? AI.Store.getById(id) : null;
    const t = tax();
    const html = `
      <div class="modal-overlay" id="edOverlay">
        <div class="modal" style="max-width:720px">
          <div class="modal-header"><h2>${it ? 'Edit intention' : 'New intention'}</h2>
            <button class="btn-icon" data-close>${AI.icon('x', 17)}</button></div>
          <div class="modal-body">
            <div class="field"><label class="field-label">Description</label>
              <textarea class="textarea" id="fDesc" placeholder="What the agent intends to bring about">${esc(it && it.description)}</textarea></div>
            <div class="field"><label class="field-label">Expected value / rationale</label>
              <input class="input" id="fValue" value="${esc(it && it.expected_value)}" placeholder="What is gained by succeeding"></div>
            <div class="field-row">
              <div class="field"><label class="field-label">Source</label>
                <select class="select" id="fSrc">${opts(t.sources, (it && it.source) || 'Problem')}</select></div>
              <div class="field"><label class="field-label">Priority</label>
                <select class="select" id="fPri">${opts(t.priorities, (it && it.priority) || 'Medium')}</select></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">Status</label>
                <select class="select" id="fStatus">${opts(t.statuses, (it && it.status) || 'Generated')}</select></div>
              <div class="field"><label class="field-label">Confidence</label>
                <select class="select" id="fConf">${opts(t.confidences, (it && it.confidence) || 'Medium')}</select></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">Deadline</label>
                <input class="input" type="date" id="fDeadline" value="${esc(it && it.deadline) || ''}"></div>
              <div class="field"><label class="field-label">Owner</label>
                <input class="input" id="fOwner" value="${esc(it && it.owner) || 'Self'}"></div>
            </div>
            <div class="field"><label class="field-label">Constraints</label>
              ${chips('fConstraints', (it && it.constraints) || [], 'add constraint')}</div>
            <div class="field"><label class="field-label">Dependencies</label>
              ${chips('fDeps', (it && it.dependencies) || [], 'add dependency')}</div>
            <div class="field-row">
              <div class="field"><label class="field-label">Review schedule</label>
                <input class="input" id="fReview" value="${esc(it && it.review_schedule)}" placeholder="e.g. every Friday"></div>
              <div class="field"><label class="field-label">Termination condition</label>
                <input class="input" id="fTerm" value="${esc(it && it.termination_condition)}" placeholder="when is it done?"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" data-close>Cancel</button>
            <button class="btn btn-primary btn-sm" id="edSave">${AI.icon('check', 14)} Save intention</button>
          </div>
        </div>
      </div>`;
    mount(html, () => {
      const desc = document.getElementById('fDesc').value.trim();
      if (!desc) { AI.app.toast('Description is required'); return; }
      const data = {
        description: desc,
        expected_value: val('fValue'),
        source: val('fStatus') && document.getElementById('fSrc').value,
        priority: document.getElementById('fPri').value,
        status: document.getElementById('fStatus').value,
        confidence: document.getElementById('fConf').value,
        deadline: val('fDeadline') || null,
        owner: val('fOwner') || 'Self',
        constraints: readChips('fConstraints'),
        dependencies: readChips('fDeps'),
        review_schedule: val('fReview') || null,
        termination_condition: val('fTerm')
      };
      const done = it ? AI.Store.update(it.id, data) : AI.Store.add(data);
      done.then(() => { close(); AI.app.toast(it ? 'Intention updated' : 'Intention created'); });
    });
  }

  /* ── Detail view ───────────────────────────────────────── */
  function openDetail(id) {
    const it = AI.Store.getById(id);
    if (!it) return;
    const t = tax();
    const notes = (it.notes || []).slice().reverse();
    const html = `
      <div class="modal-overlay" id="dtOverlay">
        <div class="modal" style="max-width:760px">
          <div class="modal-header">
            <div><div class="eyebrow mono">${esc(it.id)}</div>
              <h2>Intention</h2></div>
            <button class="btn-icon" data-close>${AI.icon('x', 17)}</button>
          </div>
          <div class="modal-body">
            <div class="detail-eyebrow">
              <span class="badge src-${slug(it.source)}">${esc(it.source)}</span>
              <span class="badge pri-${it.priority}"><span class="dot"></span>${esc(it.priority)}</span>
              <span class="badge">${esc(it.status)}</span>
              <span class="badge">conf · ${esc(it.confidence)}</span>
            </div>
            <div class="detail-desc">${esc(it.description)}</div>
            ${it.expected_value ? `<div class="detail-value">${esc(it.expected_value)}</div>` : ''}
            <div class="detail-grid">
              ${df('Deadline', it.deadline || '—', true)}
              ${df('Owner', it.owner)}
              ${df('Review schedule', it.review_schedule || '—')}
              ${df('Termination', it.termination_condition || '—')}
            </div>
            ${it.constraints && it.constraints.length ? `${lbl('Constraints')}${chipList(it.constraints)}` : ''}
            ${it.dependencies && it.dependencies.length ? `${lbl('Dependencies')}${chipList(it.dependencies)}` : ''}

            ${lbl('Set status')}
            <div class="transition-bar">
              ${transitionBtns(it.status, t.statuses)}
            </div>

            ${lbl('Revision log' + (notes.length ? ` · ${notes.length}` : ''))}
            ${notes.length ? `<ul class="rev-log">${notes.map(n => `<li>
                <span class="rev-kind">${esc(n.kind)}</span><span class="rev-at">${fmt(n.at)}</span>
                ${n.text ? `<div class="rev-text">${esc(n.text)}</div>` : ''}
              </li>`).join('')}</ul>` : `<div class="empty" style="padding:var(--space-3)">No revisions yet.</div>`}
            <div class="note-add">
              <input class="input" id="noteText" placeholder="Add a revision note…">
              <button class="btn btn-secondary btn-sm" id="noteAdd">${AI.icon('message-square', 13)} Note</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger btn-sm" id="dtDelete">${AI.icon('trash-2', 13)} Delete</button>
            <span style="flex:1"></span>
            <button class="btn btn-secondary btn-sm" data-close>Close</button>
            <button class="btn btn-primary btn-sm" id="dtEdit">${AI.icon('pencil', 13)} Edit</button>
          </div>
        </div>
      </div>`;
    mount(html, null);
    document.getElementById('dtEdit').addEventListener('click', () => {
      const id = it.id; close(); openEdit(id);
    });
    document.getElementById('dtDelete').addEventListener('click', () => {
      if (confirm('Delete this intention? This cannot be undone.')) {
        AI.Store.remove(it.id).then(() => { close(); AI.app.toast('Intention removed'); });
      }
    });
    document.getElementById('noteAdd').addEventListener('click', () => {
      const text = document.getElementById('noteText').value.trim();
      if (!text) return;
      AI.Store.addNote(it.id, { kind: 'comment', text }).then(() => {
        close(); openDetail(it.id); AI.app.toast('Note added');
      });
    });
    document.querySelectorAll('[data-transition]').forEach(b =>
      b.addEventListener('click', () => {
        const status = b.getAttribute('data-transition');
        AI.Store.update(it.id, { status }).then(() => { close(); openDetail(it.id); });
      }));
  }

  /* ── transition buttons (contextual) ──────────────────── */
  function transitionBtns(current, all) {
    const ADVANCE = ['Generated', 'Evaluated', 'Selected', 'Committed', 'In Progress', 'Completed'];
    const QUICK = ['Paused', 'Needs Review', 'Deferred', 'Cancelled'];
    const out = [];
    const idx = ADVANCE.indexOf(current);
    if (idx >= 0 && idx < ADVANCE.length - 1) {
      out.push(primary(ADVANCE[idx + 1]));
    }
    if (current !== 'Completed') out.push(secondary('Completed', 'check'));
    QUICK.forEach(s => { if (s !== current) out.push(secondary(s)); });
    if (current !== 'Committed' && current !== 'In Progress') out.push(secondary('Committed'));
    return out.join('');
  }
  function primary(status) { return `<button class="btn btn-primary btn-sm" data-transition="${status}">${AI.icon('arrow-right', 12)} ${status}</button>`; }
  function secondary(status, icon) { return `<button class="btn btn-secondary btn-sm" data-transition="${status}">${AI.icon(icon || 'sliders', 12)} ${status}</button>`; }

  /* ── helpers ───────────────────────────────────────────── */
  function mount(html, onSave) {
    close();
    const root = document.createElement('div'); root.innerHTML = html;
    const overlay = root.firstElementChild;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    if (onSave) {
      const btn = overlay.querySelector('#capSave, #edSave');
      if (btn) btn.addEventListener('click', onSave);
      overlay.querySelector('textarea, input') && overlay.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave();
      });
    }
    document.addEventListener('keydown', onEsc);
  }
  function onEsc(e) { if (e.key === 'Escape') close(); }
  function close() {
    document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
    document.removeEventListener('keydown', onEsc);
    AI.app && AI.app.render && AI.app.render();
  }

  function opts(arr, sel) { return arr.map(v => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join(''); }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function lbl(t) { return `<div class="section-label">${esc(t)}</div>`; }
  function df(label, value, mono) { return `<div class="detail-field"><div class="df-label">${esc(label)}</div><div class="df-value${mono ? ' mono' : ''}">${esc(value)}</div></div>`; }
  function chipList(arr) { return `<div class="list-chips">${arr.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>`; }

  function chips(id, arr, ph) {
    return `<div class="chip-input" id="${id}">${arr.map(c => chip(c)).join('')}<input placeholder="${esc(ph)}" data-chip-input="${id}"></div>`;
  }
  function chip(text) { return `<span class="chip">${esc(text)}<button type="button" data-chip-remove>${AI.icon('x', 11)}</button></span>`; }
  function readChips(id) {
    const el = document.getElementById(id); if (!el) return [];
    return Array.from(el.querySelectorAll('.chip')).map(c => c.textContent.trim());
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function slug(s) { return String(s || '').toLowerCase(); }
  function fmt(iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }

  // chip-input behaviour (delegated, wired on mount)
  document.addEventListener('keydown', e => {
    const inp = e.target;
    if (!inp || !inp.dataset || !inp.dataset.chipInput) return;
    const id = inp.dataset.chipInput;
    const wrap = document.getElementById(id);
    if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
      e.preventDefault();
      wrap.insertBefore(makeChip(inp.value.trim()), inp);
      inp.value = '';
    } else if (e.key === 'Backspace' && !inp.value && wrap.querySelector('.chip')) {
      wrap.querySelector('.chip:last-of-type').remove();
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-chip-remove]');
    if (b) b.closest('.chip').remove();
  });
  function makeChip(text) { const s = document.createElement('span'); s.className = 'chip'; s.innerHTML = esc(text) + `<button type="button" data-chip-remove>${AI.icon('x', 11)}</button>`; return s; }

  return { openNew, openEdit, openDetail, openCapture, close };
})();
