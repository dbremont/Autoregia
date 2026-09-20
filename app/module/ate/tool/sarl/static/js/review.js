/* ════════════════════════════════════════════════════════════
    SARL Review — the documented review process, as a pipeline.
    Stage tracker (Intake → Criteria → Review → Findings →
    Resolution → Verify → Complete) over a three-pane layout:
    the task record and its criteria on the left, the document
    (Read | Annotated, finding highlights, pager) in the center,
    the resolution rail (filterable finding cards, Apply/Ignore)
    on the right. Verify shows the corrected text + change log.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};
SARL.ReviewDetail = (() => {
  const SEV_RANK = { error: 0, warning: 1, suggestion: 2 };
  const DIM_META = {
    ortotipografica: ['Ortografía', 'tipografía, tildes, signos'],
    linguistica: ['Gramática', 'concordancia, usos, haber / a ver'],
    estilistica: ['Estilo', 'claridad, muletillas, registro'],
    terminologica: ['Glosario', 'términos y nombres propios'],
  };

  const ReviewDetail = {
    _task: null,
    _sel: null,               // selected finding id
    _view: 'annotated',       // 'annotated' | 'read'
    _filters: { severity: '', dimension: '' },

    // ── derived views over the task ──────────────────────────
    _ordered(task) {
      return [...(task.findings || [])].sort((a, b) =>
        a.start - b.start || SEV_RANK[a.severity] - SEV_RANK[b.severity]
        || a.id.localeCompare(b.id, undefined, { numeric: true }));
    },
    _visible(task) {
      const f = this._filters;
      return this._ordered(task).filter(x =>
        (!f.severity || x.severity === f.severity)
        && (!f.dimension || x.dimension === f.dimension));
    },
    _resolved(task) {
      return (task.findings || []).filter(x => x.disposition !== 'pending').length;
    },

    // ── the pipeline header ──────────────────────────────────
    _stages(task) {
      const fs = task.findings || [];
      const total = fs.length;
      const resolved = this._resolved(task);
      const reviewed = task.state !== 'created';
      const applied = task.state === 'applied';
      const allResolved = total === 0 || resolved === total;
      const st = (label, opts) => Object.assign({ label, state: 'todo' }, opts);
      const list = [
        st('Intake', { state: 'done' }),
        st('Criteria', { state: 'done' }),
        st('Review', { state: reviewed ? 'done' : 'current' }),
        st('Findings', { state: reviewed ? 'done' : 'todo', sub: String(total) }),
        st('Resolution', {
          state: applied || allResolved ? 'done'
               : resolved > 0 ? 'progress' : (reviewed ? 'current' : 'todo'),
          sub: `${resolved}/${total}`,
        }),
        st('Verify', { state: applied ? 'done' : (reviewed && allResolved ? 'current' : 'todo') }),
        st('Complete', { state: applied ? 'done' : 'todo' }),
      ];
      if (!list.some(s => s.state === 'current') && task.state !== 'applied') {
        const first = list.find(s => s.state === 'todo');
        if (first) first.state = 'current';
      }
      return list;
    },

    _head(task) {
      const stages = this._stages(task).map((s, i) => `
        <span class="pipe-stage ${s.state}">
          <span class="st-n">${s.state === 'done' ? '✓' : i + 1}</span>
          ${s.label}${s.sub ? ` <span class="st-sub">${s.sub}</span>` : ''}
        </span>`).join('<span class="pipe-arrow">→</span>');
      const pending = (task.findings || []).length - this._resolved(task);
      let actions = '';
      if (task.state === 'created') {
        actions = `
          <button class="btn btn-primary btn-sm" id="tdReview">${SARL.icon('play', 14)} Run review</button>
          <button class="btn btn-ghost btn-sm" id="tdDiscard">${SARL.icon('archive', 14)} Discard</button>`;
      } else if (task.state === 'reviewed') {
        actions = `
          <span class="results-meta">${pending ? `${pending} pending` : 'all resolved'}</span>
          <button class="btn btn-primary btn-sm" id="tdApply">${SARL.icon('check-circle', 14)} Complete review</button>
          <button class="btn btn-ghost btn-sm" id="tdDiscard">${SARL.icon('archive', 14)} Discard</button>`;
      } else if (task.state === 'applied') {
        actions = v_pill('completed');
      } else {
        actions = v_pill('discarded');
      }
      return `<div class="pipe-head animate-in">
        <div class="pipe-stages">${stages}</div>
        <div class="pipe-actions">${actions}</div>
      </div>`;
    },

    // ── left rail: the task record + criteria ────────────────
    _left(task) {
      const dims = task.input.dimensions || [];
      const gidList = task.input.glossary_ids || [];
      const criteria = dims.map(d => {
        const meta = DIM_META[d] || [d, ''];
        return `<label class="crit-row"><input type="checkbox" checked disabled>
          <span><strong>${SARL.esc(meta[0])}</strong>
          <span class="crit-desc">${SARL.esc(meta[1])}</span></span></label>`;
        }).join('');
      const gloss = gidList.length ? gidList.map(id => {
        const g = SARL.Store.glossaryById(id);
        return `<label class="crit-row"><input type="checkbox" checked disabled>
          <span><strong>${SARL.esc(g ? g.name : id)}</strong>
          <span class="crit-desc">glosario · ${g ? (g.entry_count || (g.entries || []).length) + ' entradas' : 'adjunto'}</span></span></label>`;
      }).join('') : '<div class="empty-inline">sin glosario adjunto</div>';
      return `
        <div class="pipe-left">
          <a href="#tasks" class="back-link">← all tasks</a>
          <div class="pl-id">${SARL.esc(task.id)} ${SARL.view.statePill(task.state)}</div>
          <div class="pl-title">${SARL.esc(task.title || 'Revisión lingüística')}</div>
          <div class="pl-meta">defined ${SARL.esc(SARL.Store.fmtTime(task.created_at))} · by you</div>
          <nav class="pl-nav">
            <a href="#tasks/${SARL.esc(task.id)}" data-nav="document" class="active">${SARL.icon('file-text', 15)} Document</a>
            <a href="#tasks/${SARL.esc(task.id)}" data-nav="findings">${SARL.icon('flag', 15)} Findings <span class="nav-count">${(task.findings || []).length}</span></a>
            <a href="#tasks/${SARL.esc(task.id)}" data-nav="criteria">${SARL.icon('check-circle', 15)} Criteria</a>
            <a href="#audit">${SARL.icon('history', 15)} History</a>
          </nav>
          <div class="pl-criteria" id="criteriaBlock">
            <div class="pl-crit-head">CRITERIA (${dims.length + (gidList.length ? 1 : 0)})</div>
            ${criteria}${gloss}
            ${task.state === 'created' ? '<div class="form-hint">criteria are locked at definition</div>' : ''}
          </div>
          <div class="pl-colophon">“El buen lenguaje no solo comunica; también constituye confianza.”</div>
        </div>`;
    },

    // ── center: the document ─────────────────────────────────
    _annotatedHTML(task) {
      const text = task.input.content;
      const ordered = this._ordered(task);
      const num = {};
      ordered.forEach((f, i) => (num[f.id] = i + 1));
      let out = '', cursor = 0, lastEnd = -1;
      for (const f of ordered) {
        if (f.end <= f.start) continue;
        if (f.start < lastEnd || f.start < cursor) continue;
        out += SARL.esc(text.slice(cursor, f.start));
        const off = this._isOff(f) ? ' hl-off' : '';
        const disp = f.disposition === 'accepted' ? ' hl-accepted'
                   : f.disposition === 'rejected' ? ' hl-ignored' : '';
        const act = this._sel === f.id ? ' hl-active' : '';
        out += `<mark class="finding-hl sev-${SARL.esc(f.severity)}${disp}${act}${off}"
          data-fid="${SARL.esc(f.id)}" title="${SARL.esc(f.rule_id)} — ${SARL.esc(f.message)}">${
          SARL.esc(text.slice(f.start, f.end))}<span class="hl-num">${num[f.id]}</span></mark>`;
        cursor = f.end;
        lastEnd = f.end;
      }
      out += SARL.esc(text.slice(cursor));
      return out;
    },

    _isOff(f) {
      return (this._filters.severity && f.severity !== this._filters.severity)
          || (this._filters.dimension && f.dimension !== this._filters.dimension);
    },

    _doc(task) {
      const visible = this._visible(task).filter(f => f.end > f.start);
      const idx = visible.findIndex(f => f.id === this._sel);
      const pos = visible.length ? (idx >= 0 ? idx + 1 : 1) : 0;
      const md = task.input.content;
      return `
        <div class="pipe-doc">
          <div class="doc-head">
            <div class="doc-title">${SARL.esc(task.title || task.id)}
              <span class="term-chip">${SARL.esc(task.input.language)}</span>
              ${task.input.register ? `<span class="term-chip">${SARL.esc(task.input.register)}</span>` : ''}
            </div>
            <div class="doc-tools">
              <div class="seg" id="docViewTabs">
                <button type="button" class="seg-btn ${this._view === 'annotated' ? 'active' : ''}" data-view="annotated">Annotated</button>
                <button type="button" class="seg-btn ${this._view === 'read' ? 'active' : ''}" data-view="read">Read</button>
              </div>
            </div>
          </div>
          <div class="doc-page doc-annotated ${this._view === 'annotated' ? '' : 'hidden'}" id="docAnnotated">${this._annotatedHTML(task)}</div>
          <div class="doc-page md-preview doc-read ${this._view === 'read' ? '' : 'hidden'}" id="docRead">${
            window.AUTOREGIA && AUTOREGIA.Markdown ? AUTOREGIA.Markdown.render(md) : SARL.esc(md)}</div>
          <div class="doc-foot">
            <span class="results-meta">${visible.length} finding(s) in view</span>
            <div class="pager" style="padding:0">
              <button class="btn btn-secondary btn-sm" id="docPrev" ${visible.length ? '' : 'disabled'}>${SARL.icon('chevron-left', 14)}</button>
              <span class="results-meta">${visible.length ? `${pos} / ${visible.length}` : '—'}</span>
              <button class="btn btn-secondary btn-sm" id="docNext" ${visible.length ? '' : 'disabled'}>${SARL.icon('chevron-right', 14)}</button>
            </div>
            <span class="results-meta">${md.length} chars · markdown</span>
          </div>
        </div>`;
    },

    // ── right rail: resolution ───────────────────────────────
    _card(f, n) {
      const task = this._task;
      const open = task.state === 'reviewed';
      const dim = DIM_META[f.dimension] ? DIM_META[f.dimension][0] : f.dimension;
      const suggestion = f.suggestion != null
        ? `<div class="rail-suggestion"><span class="finding-rule">${f.suggestion === '' ? '(delete)' : '→ ' + SARL.esc(f.suggestion)}</span></div>`
        : '';
      const actions = open ? (
        f.disposition === 'pending'
          ? `<div class="rail-actions">
               <button class="btn btn-primary btn-sm" data-disp="accepted" data-fid="${SARL.esc(f.id)}">Apply</button>
               <button class="btn btn-secondary btn-sm" data-disp="rejected" data-fid="${SARL.esc(f.id)}">Ignore</button>
             </div>`
          : `<div class="rail-actions"><span class="disp-mark">${SARL.esc(f.disposition === 'accepted' ? 'applied' : 'ignored')}</span>
               <button class="btn btn-ghost btn-sm" data-disp="pending" data-fid="${SARL.esc(f.id)}">undo</button></div>`)
        : (f.disposition !== 'pending'
          ? `<div class="rail-actions"><span class="disp-mark">${SARL.esc(f.disposition === 'accepted' ? 'applied' : 'ignored')}</span></div>` : '');
      return `
        <div class="rail-card sev-${SARL.esc(f.severity)} disp-${SARL.esc(f.disposition)} ${this._sel === f.id ? 'active' : ''}" data-fid="${SARL.esc(f.id)}">
          <div class="rail-top">
            <span class="rail-num rn-${SARL.esc(f.severity)}">${n}</span>
            ${SARL.view.sevChip(f.severity)}
            <span class="dim-tag">${SARL.esc(dim)}</span>
            <span class="rail-line">L${f.line || '—'} · ¶${f.paragraph || '—'}</span>
          </div>
          <div class="rail-evidence">${SARL.esc(f.evidence)}</div>
          <div class="rail-msg">${SARL.esc(f.message)}</div>
          ${suggestion}
          ${actions}
        </div>`;
    },

    _rail(task) {
      const visible = this._visible(task);
      const ordered = this._ordered(task);
      const num = {};
      ordered.forEach((f, i) => (num[f.id] = i + 1));
      const dimsPresent = [...new Set(this._ordered(task).map(f => f.dimension))];
      const cards = visible.map(f => this._card(f, num[f.id])).join('');
      return `
        <div class="pipe-right" id="railPane">
          <div class="rail-head">
            <div class="rail-tabs"><span class="rail-tab active">Findings</span>
              <span class="pill">${ordered.length}</span></div>
            <div class="rail-filters">
              <select id="fltSeverity" class="src-select" aria-label="Filter by severity">
                <option value="">All severities</option>
                ${['error', 'warning', 'suggestion'].map(s => `<option value="${s}" ${this._filters.severity === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <select id="fltDimension" class="src-select" aria-label="Filter by dimension">
                <option value="">All dimensions</option>
                ${dimsPresent.map(d => `<option value="${d}" ${this._filters.dimension === d ? 'selected' : ''}>${SARL.esc(DIM_META[d] ? DIM_META[d][0] : d)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="rail-list" id="railList">
            ${task.state === 'created'
              ? '<div class="empty-state">the review has not run yet</div>'
              : (cards || '<div class="empty-state">no findings match</div>')}
          </div>
        </div>`;
    },

    // ── verify surface (applied) ─────────────────────────────
    _report(task) {
      if (task.state !== 'applied') return '';
      const corrected = task.corrected_text || '';
      return `
        <div class="chart-card animate-in" id="verifyBlock">
          <div class="chart-head">
            <div><span class="eyebrow">verify</span><h3>Corrected text</h3></div>
            <div class="seg" id="corrTabs">
              <button type="button" class="seg-btn active" data-cv="raw">Raw</button>
              <button type="button" class="seg-btn" data-cv="rendered">Rendered</button>
            </div>
          </div>
          <pre class="code-view" id="corrRaw" style="white-space:pre-wrap">${SARL.esc(corrected)}</pre>
          <div class="md-preview hidden" id="corrMd">${corrected && window.AUTOREGIA && AUTOREGIA.Markdown ? AUTOREGIA.Markdown.render(corrected) : ''}</div>
        </div>
        <div class="chart-card animate-in" style="margin-top:var(--space-4)">
          <div class="chart-head"><div><span class="eyebrow">change log</span><h3>${(task.change_log || []).length} change(s)</h3></div></div>
          ${(task.change_log || []).map(c => `
            <div class="change-row">
              <span class="finding-rule">${SARL.esc(c.rule_id)}</span>
              <span><span class="change-del">${SARL.esc(c.before)}</span> → <span class="change-ins">${SARL.esc(c.after)}</span></span>
            </div>`).join('') || '<div class="empty-state">nothing was applied</div>'}
        </div>`;
    },

    // ── render + interactions ────────────────────────────────
    render(task) {
      this._task = task;
      return `<div class="review-pipeline animate-in" id="taskPipeline">
          ${this._head(task)}
          <div class="pipe-grid">
            ${this._left(task)}
            ${this._doc(task)}
            ${this._rail(task)}
          </div>
          ${this._report(task)}
        </div>`;
    },

    bind(refresh) {
      const task = this._task;
      const R = this;

      // stage actions
      document.getElementById('tdReview')?.addEventListener('click', async () => {
        try { await SARL.Store.reviewTask(task.id); SARL.toast('review run — findings recorded'); refresh(); }
        catch (e) { SARL.toast(e.message); }
      });
      document.getElementById('tdApply')?.addEventListener('click', async () => {
        const pending = (task.findings || []).length - R._resolved(task);
        if (pending > 0) {
          const ok = await SARL.confirm({
            title: 'Complete with pending findings?',
            message: `${pending} finding(s) are still pending — they will stay unresolved and out of the corrected text.`,
            confirmText: 'Complete review',
          });
          if (!ok) return;
        }
        try { await SARL.Store.applyTask(task.id); SARL.toast('review completed — corrected text composed'); refresh(); }
        catch (e) { SARL.toast(e.message); }
      });
      document.getElementById('tdDiscard')?.addEventListener('click', async () => {
        const ok = await SARL.confirm({
          title: 'Discard this task?',
          message: 'The task stays in the set, marked discarded; no corrected text is composed.',
          confirmText: 'Discard',
        });
        if (!ok) return;
        try { await SARL.Store.discardTask(task.id); SARL.toast('task discarded'); refresh(); }
        catch (e) { SARL.toast(e.message); }
      });

      // left nav — scroll anchors
      document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = { document: '.pipe-doc', findings: '#railPane', criteria: '#criteriaBlock' }[a.dataset.nav];
        if (a.dataset.nav === 'findings' && R._view === 'read') R.setView('annotated');
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));

      // document pane
      document.querySelectorAll('#docViewTabs [data-view]').forEach(b => b.addEventListener('click', () => {
        R.setView(b.dataset.view);
      }));
      const step = (dir) => {
        const vis = R._visible(task).filter(f => f.end > f.start);
        if (!vis.length) return;
        let i = vis.findIndex(f => f.id === R._sel);
        i = i < 0 ? 0 : (i + dir + vis.length) % vis.length;
        R.select(vis[i].id);
      };
      document.getElementById('docPrev')?.addEventListener('click', () => step(-1));
      document.getElementById('docNext')?.addEventListener('click', () => step(1));

      // highlights
      document.querySelectorAll('#docAnnotated .finding-hl').forEach(m => {
        m.addEventListener('click', () => R.select(m.dataset.fid));
      });

      // rail
      document.getElementById('fltSeverity')?.addEventListener('change', (e) => {
        R._filters.severity = e.target.value; refresh({ keepScroll: true });
      });
      document.getElementById('fltDimension')?.addEventListener('change', (e) => {
        R._filters.dimension = e.target.value; refresh({ keepScroll: true });
      });
      document.querySelectorAll('.rail-card').forEach(c => {
        c.addEventListener('click', () => R.select(c.dataset.fid));
      });
      document.querySelectorAll('[data-disp]').forEach(b => b.addEventListener('click', async (e) => {
        e.stopPropagation();
        try { await SARL.Store.setDisposition(task.id, b.dataset.fid, b.dataset.disp); refresh({ keepScroll: true }); }
        catch (err) { SARL.toast(err.message); }
      }));

      // verify surface
      document.querySelectorAll('#corrTabs [data-cv]').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('#corrTabs [data-cv]').forEach(x => x.classList.toggle('active', x === b));
        const rendered = b.dataset.cv === 'rendered';
        document.getElementById('corrRaw')?.classList.toggle('hidden', rendered);
        document.getElementById('corrMd')?.classList.toggle('hidden', !rendered);
      }));
    },

    setView(view) {
      this._view = view;
      document.querySelectorAll('#docViewTabs [data-view]').forEach(x =>
        x.classList.toggle('active', x.dataset.view === view));
      document.getElementById('docAnnotated')?.classList.toggle('hidden', view !== 'annotated');
      document.getElementById('docRead')?.classList.toggle('hidden', view !== 'read');
    },

    select(fid) {
      this._sel = fid;
      if (this._view === 'read') this.setView('annotated');
      document.querySelectorAll('#docAnnotated .finding-hl').forEach(m =>
        m.classList.toggle('hl-active', m.dataset.fid === fid));
      const mark = document.querySelector(`#docAnnotated .finding-hl[data-fid="${fid}"]`);
      mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelectorAll('.rail-card').forEach(c =>
        c.classList.toggle('active', c.dataset.fid === fid));
      const card = document.querySelector(`.rail-card[data-fid="${fid}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // pager position refresh
      const vis = this._visible(this._task).filter(f => f.end > f.start);
      const i = vis.findIndex(f => f.id === fid);
      const pos = document.querySelector('.doc-foot .results-meta:nth-of-type(2)');
      if (pos && i >= 0) pos.textContent = `${i + 1} / ${vis.length}`;
    },
  };

  function v_pill(text) { return `<span class="state-pill state-${text}">${text}</span>`; }

  return ReviewDetail;
})();
