/* ════════════════════════════════════════════════════════════
    SARL Review — one text edition task in full: the workflow
    strip (created → reviewed → applied | discarded), the
    document with finding spans marked, the declared criteria,
    findings grouped by dimension and ordered by severity, and —
    after Apply — the corrected text beside its change log.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.ReviewDetail = (() => {
  const DIM_LABEL = {
    ortotipografica: 'Ortotipográfica',
    linguistica: 'Lingüística',
    estilistica: 'Estilística',
    terminologica: 'Terminológica',
  };
  const SEV_RANK = { error: 0, warning: 1, suggestion: 2 };

  function workflowStrip(task) {
    const stages = [];
    const done = s => task.state !== 'created' || s === 'created';
    const now = s => s === task.state;
    const when = s => ({
      created: task.created_at,
      reviewed: task.reviewed_at,
      applied: task.applied_at,
      discarded: task.updated_at,
    }[s]);
    const order = task.state === 'discarded'
      ? ['created', 'discarded']
      : (task.state === 'applied' ? ['created', 'reviewed', 'applied']
                                  : ['created', 'reviewed']);
    order.forEach((s, i) => {
      const cls = now(s) ? 'now' : (done(s) ? 'done' : '');
      stages.push(`<span class="wf-stage ${cls}">
        <span class="src-dot" style="background:${now(s) ? 'var(--oxford)' : 'var(--color-success)'}"></span>
        ${s}${when(s) && now(s) ? ` <span class="wf-when">· ${SARL.esc(SARL.Store.fmtTime(when(s)))}</span>` : ''}
      </span>`);
      if (i < order.length - 1) stages.push('<span class="wf-arrow">→</span>');
    });
    if (task.state === 'reviewed') {
      stages.push('<span class="wf-arrow">→</span>',
        '<span class="wf-stage">applied | discarded</span>');
    }
    return `<div class="workflow-strip">${stages.join('')}</div>`;
  }

  function markText(task) {
    // Build the annotated preview: spans in document order, disposition-
    // aware. Overlapping spans are rare (accepts are exclusive); the
    // first span wins and later overlaps render as plain text.
    const text = task.input.content;
    const spans = (task.findings || [])
      .filter(f => f.end > f.start)
      .sort((a, b) => a.start - b.start || b.end - a.end);
    let out = '', cursor = 0, lastEnd = -1;
    for (const f of spans) {
      if (f.start < lastEnd || f.start < cursor) continue;
      out += SARL.esc(text.slice(cursor, f.start));
      const cls = f.disposition !== 'pending' ? ` class="disp-${f.disposition}"` : '';
      out += `<mark${cls} title="${SARL.esc(f.rule_id)}: ${SARL.esc(f.message)}">${SARL.esc(text.slice(f.start, f.end))}</mark>`;
      cursor = f.end;
      lastEnd = f.end;
    }
    out += SARL.esc(text.slice(cursor));
    return out;
  }

  function findingCard(f) {
    const open = ReviewDetail._task && ReviewDetail._task.state === 'reviewed';
    const suggestion = f.suggestion != null
      ? `<div class="finding-suggestion">${SARL.icon('arrow-right', 13)}
           <span class="text-mono">${f.suggestion === '' ? '(delete)' : SARL.esc(f.suggestion)}</span></div>`
      : '';
    const advisory = f.suggestion == null
      ? '<span class="form-hint">advisory — no direct replacement</span>' : '';
    const actions = open ? `
      <div class="finding-actions">
        ${f.disposition === 'pending' ? `
          <button class="btn btn-sm btn-secondary" data-disp="accepted" data-fid="${SARL.esc(f.id)}">${SARL.icon('check', 13)} accept</button>
          <button class="btn btn-sm btn-ghost" data-disp="rejected" data-fid="${SARL.esc(f.id)}">${SARL.icon('x', 13)} reject</button>`
        : `<span class="disp-mark">${SARL.esc(f.disposition)}</span>
           <button class="btn btn-sm btn-ghost" data-disp="pending" data-fid="${SARL.esc(f.id)}">undo</button>`}
        ${advisory}
      </div>` : (f.disposition !== 'pending'
        ? `<div class="finding-actions"><span class="disp-mark">${SARL.esc(f.disposition)}</span></div>` : '');
    return `
      <div class="finding-card sev-${SARL.esc(f.severity)} disp-${SARL.esc(f.disposition)}" id="finding-${SARL.esc(f.id)}">
        <div class="finding-top">
          ${SARL.view.sevChip(f.severity)}
          <span class="finding-rule">${SARL.esc(f.rule_id)}${f.engine === 'languagetool' ? ' · external' : ''}</span>
        </div>
        <div class="finding-evidence">${SARL.esc(f.evidence)}</div>
        <div class="finding-msg">${SARL.esc(f.message)}</div>
        ${suggestion}
        ${actions}
      </div>`;
  }

  const ReviewDetail = {
    _task: null,

    render(task) {
      this._task = task;
      const byDim = {};
      (task.findings || []).forEach(f => (byDim[f.dimension] = byDim[f.dimension] || []).push(f));
      const groups = Object.entries(byDim).map(([dim, fs]) => {
        fs.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.start - b.start);
        return `<div class="finding-group">
          <div class="finding-group-head"><h3>${DIM_LABEL[dim] || SARL.esc(dim)}</h3>
            <span class="results-meta">${fs.length} finding(s)</span></div>
          ${fs.map(findingCard).join('')}
        </div>`;
      }).join('');

      const applied = task.state === 'applied';
      const corrected = task.corrected_text || '';
      const report = applied ? `
        <div class="chart-card animate-in" style="margin-top:var(--space-4)">
          <div class="chart-head">
            <div><span class="eyebrow">apply</span><h3>Corrected text</h3></div>
            <div class="seg" id="corrTabs" role="group" aria-label="corrected text view">
              <button type="button" class="seg-btn active" data-cv="raw">Raw</button>
              <button type="button" class="seg-btn" data-cv="rendered">Rendered</button>
            </div>
          </div>
          <pre class="code-view" id="corrRaw" style="white-space:pre-wrap">${SARL.esc(corrected)}</pre>
          <div class="md-preview hidden" id="corrMd">${corrected && window.AUTOREGIA.Markdown ? AUTOREGIA.Markdown.render(corrected) : ''}</div>
        </div>
        <div class="chart-card animate-in" style="margin-top:var(--space-4)">
          <div class="chart-head"><div><span class="eyebrow">apply</span><h3>Change log · ${(task.change_log || []).length}</h3></div></div>
          ${(task.change_log || []).map(c => `
            <div class="change-row">
              <span class="finding-rule">${SARL.esc(c.rule_id)}</span>
              <span><span class="change-del">${SARL.esc(c.before)}</span> → <span class="change-ins">${SARL.esc(c.after)}</span></span>
            </div>`).join('') || '<div class="empty-state">nothing was applied</div>'}
        </div>` : '';

      const gids = task.input.glossary_ids || [];
      const glossNames = gids.map(id => {
        const g = SARL.Store.glossaryById(id);
        return g ? g.name : id;
      }).join(', ');

      const openActions = task.state === 'reviewed' ? `
          <button class="btn btn-primary btn-sm" id="tdApply">${SARL.icon('check-circle', 14)} Apply accepted</button>
          <button class="btn btn-secondary btn-sm" id="tdDiscard">${SARL.icon('archive', 14)} Discard</button>`
        : (task.state === 'created' ? `
          <button class="btn btn-primary btn-sm" id="tdReview">${SARL.icon('play', 14)} Run review</button>
          <button class="btn btn-secondary btn-sm" id="tdDiscard">${SARL.icon('archive', 14)} Discard</button>` : '');

      return `
        <div class="chart-card animate-in" id="taskDetail">
          <div class="chart-head">
            <div><span class="eyebrow">task · the documented review process</span>
              <h3><a href="#tasks" class="back-link" title="All tasks">${SARL.icon('chevron-left', 16)}</a>
                ${SARL.esc(task.title || task.id)}
                ${task.title ? `<span class="src-id" style="margin-left:6px">${SARL.esc(task.id)}</span>` : ''}
                ${SARL.view.statePill(task.state)}</h3></div>
            <div class="actions">
              ${openActions}
              <button class="btn-icon" id="tdClose" aria-label="Back to the task set">${SARL.icon('x', 16)}</button>
            </div>
          </div>
          ${workflowStrip(task)}
          <div class="duo-grid">
            <div>
              <div class="eyebrow" style="margin-bottom:4px">declared criteria</div>
              <div class="meta-table">
                ${mrow('document', `${task.input.content.length} chars · markdown`)}
                ${mrow('language', SARL.esc(task.input.language) + (task.input.register ? ` · ${SARL.esc(task.input.register)}` : ''))}
                ${mrow('criteria · dimensions', (task.input.dimensions || []).map(d => `<span class="dim-tag">${SARL.esc(d)}</span>`).join(' '))}
                ${mrow('criteria · glossaries', glossNames ? SARL.esc(glossNames) : '—')}
                ${task.state !== 'created' ? mrow('packs engaged', (task.packs_engaged || []).map(p => `<span class="term-chip">${SARL.esc(p)}</span>`).join('') || '—') : ''}
                ${task.state !== 'created' ? mrow('findings', `${task.counts.total} — ` +
                  Object.entries(task.counts.by_severity).map(([s, n]) => `${n} ${s}`).join(', ')) : ''}
                ${task.state !== 'created' ? mrow('dispositions', (() => { const d = { pending: 0, accepted: 0, rejected: 0 };
                  (task.findings || []).forEach(f => d[f.disposition]++);
                  return `${d.accepted} accepted · ${d.rejected} rejected · ${d.pending} pending`; })()) : ''}
              </div>
            </div>
            <div>
              <div class="eyebrow" style="margin-bottom:4px">the document${task.findings.length ? ', findings marked' : ''}</div>
              <div class="text-preview">${markText(task)}</div>
            </div>
          </div>
        </div>
        <div class="animate-in" style="margin-top:var(--space-4)">
          <div class="finding-group-head"><h3>Findings</h3>
            <span class="results-meta">grouped by dimension · ordered by severity</span></div>
          ${task.state === 'created'
            ? '<div class="empty-state">the review has not run yet — run it from the workflow strip above</div>'
            : ((task.findings || []).length ? groups
               : '<div class="empty-state">no findings — the document passed clean</div>')}
        </div>
        ${report}`;
    },

    bind(afterChange) {
      const task = this._task;
      document.getElementById('tdClose')?.addEventListener('click', () => {
        this._task = null; SARL.Tasks.clearDetail();
      });
      // corrected text: Raw | Rendered
      document.querySelectorAll('#corrTabs [data-cv]').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('#corrTabs [data-cv]').forEach(x => x.classList.toggle('active', x === b));
        const rendered = b.dataset.cv === 'rendered';
        document.getElementById('corrRaw')?.classList.toggle('hidden', rendered);
        document.getElementById('corrMd')?.classList.toggle('hidden', !rendered);
      }));
      document.getElementById('tdReview')?.addEventListener('click', async () => {
        try {
          await SARL.Store.reviewTask(task.id);
          SARL.toast('review run — findings recorded');
          afterChange();
        } catch (e) { SARL.toast(e.message); }
      });
      document.getElementById('tdApply')?.addEventListener('click', async () => {
        try {
          await SARL.Store.applyTask(task.id);
          SARL.toast('applied — corrected text composed');
          afterChange();
        } catch (e) { SARL.toast(e.message); }
      });
      document.getElementById('tdDiscard')?.addEventListener('click', async () => {
        const ok = await SARL.confirm({
          title: 'Discard this task?',
          message: 'The task stays in the journal, marked discarded; no corrected text is composed.',
          confirmText: 'Discard',
        });
        if (!ok) return;
        try {
          await SARL.Store.discardTask(task.id);
          SARL.toast('task discarded');
          afterChange();
        } catch (e) { SARL.toast(e.message); }
      });
      document.querySelectorAll('[data-disp]').forEach(b => b.addEventListener('click', async () => {
        try {
          await SARL.Store.setDisposition(task.id, b.dataset.fid, b.dataset.disp);
          afterChange();
        } catch (e) { SARL.toast(e.message); }
      }));
    },
  };

  function mrow(k, val) { return `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${val}</span></div>`; }

  return ReviewDetail;
})();
