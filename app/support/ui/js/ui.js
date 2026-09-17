/* ════════════════════════════════════════════════════════════
   Autoregia Shared UI Behaviors (served at /ui/js/ui.js)
   dialog + confirmDialog + toast + api — the canonical
   implementations. Tools keep thin aliases (AO.toast =
   AUTOREGIA.toast …) so call sites never change. Markup is
   still owned per tool (ui.spec §12); behaviors are the layer
   that shares.
   ════════════════════════════════════════════════════════════ */
window.AUTOREGIA = window.AUTOREGIA || {};

/* APG dialog core (ui.spec §10.6, §7.5). Wraps an overlay element
   with the dialog contract: role="dialog" + aria-modal on the
   surface, focus trapped inside while open, focus restored to the
   invoker on close, Esc and scrim click close. Only the top-most
   dialog reacts to Esc/Tab. Returns { close, surface }. */
AUTOREGIA._dialogStack = AUTOREGIA._dialogStack || [];
AUTOREGIA.dialog = function (overlay, opts) {
  const o = opts || {};
  const surface = overlay.querySelector('.modal, [role="dialog"]') ||
                  overlay.firstElementChild || overlay;
  if (surface.getAttribute('role') !== 'dialog') surface.setAttribute('role', 'dialog');
  surface.setAttribute('aria-modal', 'true');
  if (o.label) surface.setAttribute('aria-label', o.label);

  const invoker = o.invoker || document.activeElement;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  let closed = false;

  const focusables = function () {
    return Array.prototype.filter.call(
      overlay.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'),
      function (el) { return el.getClientRects().length > 0; }
    );
  };

  const onKey = function (e) {
    if (AUTOREGIA._dialogStack[AUTOREGIA._dialogStack.length - 1] !== api) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onScrim = function (e) {
    if (e.target === overlay && o.scrimClose !== false) close();
  };

  const api = {
    surface: surface,
    close: function () {
      if (closed) return;
      closed = true;
      const i = AUTOREGIA._dialogStack.indexOf(api);
      if (i >= 0) AUTOREGIA._dialogStack.splice(i, 1);
      document.removeEventListener('keydown', onKey, true);
      overlay.removeEventListener('click', onScrim);
      if (!AUTOREGIA._dialogStack.length) document.body.style.overflow = prevOverflow;
      if (invoker && invoker.focus && document.contains(invoker)) invoker.focus();
      if (o.onClose) o.onClose();
    }
  };

  AUTOREGIA._dialogStack.push(api);
  document.addEventListener('keydown', onKey, true);
  overlay.addEventListener('click', onScrim);
  if (!overlay.isConnected) document.body.appendChild(overlay);

  if (o.autofocus !== false && !overlay.contains(document.activeElement)) {
    const target = surface.querySelector('[data-autofocus]') || focusables()[0];
    if (target && target.focus) target.focus();
  }
  return api;
};

/* APG confirm dialog (ui.spec §10.6). Resolves true/false.
   The shell must provide .modal-overlay/.modal/.btn css (§7.5). */
AUTOREGIA.confirmDialog = function (opts) {
  return new Promise(function (resolve) {
    let settled = false;
    const done = function (v) { if (!settled) { settled = true; resolve(v); } };
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal" role="dialog" style="max-width:420px">' +
      '<div class="modal-header"><h2>' + AUTOREGIA.esc(opts.title) + '</h2>' +
      '<button class="btn-icon" aria-label="Close" data-x="no">' + AUTOREGIA._xSvg + '</button></div>' +
      '<div class="modal-body"><p>' + AUTOREGIA.esc(opts.message) + '</p></div>' +
      '<div class="modal-footer"><button class="btn btn-secondary btn-sm" data-x="no">Cancel</button>' +
      '<button class="btn btn-primary btn-sm" style="background:var(--color-danger,#A33434);border-color:var(--color-danger,#A33434)" data-x="yes">' +
      AUTOREGIA.esc(opts.confirmText || 'Confirm') + '</button></div></div>';
    ov.addEventListener('click', function (e) {
      const b = e.target.closest('[data-x]');
      if (b) done(b.getAttribute('data-x') === 'yes');
    });
    document.body.appendChild(ov);
    const d = AUTOREGIA.dialog(ov, {
      label: opts.title,
      onClose: function () { done(false); ov.remove(); },
      autofocus: false
    });
    ov.querySelector('[data-x="yes"]').focus();
  });
};

/* Toast: textContent into #<id> (+ .show), auto-hide. */
AUTOREGIA.toast = function (msg, opts) {
  const o = opts || {};
  const t = document.getElementById(o.id || 'toast');
  if (!t) return;
  const cls = o.cls || 'show';
  t.textContent = msg; t.classList.add(cls);
  clearTimeout(t._autoregiaToastTimer);
  t._autoregiaToastTimer = setTimeout(function () { t.classList.remove(cls); }, o.ms || 2200);
};

/* Fetch wrapper: checks res.ok, throws Error{status} with the
   server's `error` field when present, parses JSON/text, and
   returns null on 204. Callers catch and surface via toast. */
AUTOREGIA.api = async function (url, opts) {
  const o = opts || {};
  const res = await fetch(url, {
    method: o.method || 'GET',
    headers: Object.assign(
      o.body != null ? { 'Content-Type': 'application/json' } : {},
      o.headers || {}
    ),
    body: o.body != null ? JSON.stringify(o.body) : undefined
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j && (j.error || j.message)) msg = j.error || j.message;
    } catch (e) { /* non-json error body */ }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.indexOf('json') >= 0 ? res.json() : res.text();
};

/* Chart palette helpers for canvas visualizations (ECharts cannot
   read CSS custom properties). Colors resolve from the token layer
   at call time with canonical hex fallbacks (ui.spec §11.1). */
AUTOREGIA.CHART = {
  _cache: {},
  _get(name, fallback) {
    if (!(name in this._cache)) {
      let v = '';
      try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
      this._cache[name] = v || fallback;
    }
    return this._cache[name];
  },
  /* Categorical series palette — every value is a §3 token. */
  category(n) {
    const g = (t, f) => this._get(t, f);
    const all = [
      g('--oxford', '#7A1A2A'), g('--color-warning', '#B4742A'),
      g('--color-info', '#3F6092'), g('--status-active', '#2D6A4F'),
      g('--class-identity', '#5C4E78'), g('--gold', '#A8854A'),
      g('--color-success', '#3F6E50'), g('--oxford-bright', '#962030'),
      g('--ink-5', '#8C877B'), g('--oxford-deep', '#641020')
    ];
    return n ? all.slice(0, n) : all;
  },
  /* Named semantic colors for chart accents/axes. */
  semantic() {
    const g = (t, f) => this._get(t, f);
    return {
      success: g('--color-success', '#3F6E50'),
      warning: g('--color-warning', '#B4742A'),
      danger: g('--color-danger', '#A33434'),
      info: g('--color-info', '#3F6092'),
      identity: g('--class-identity', '#5C4E78'),
      gold: g('--gold', '#A8854A'),
      oxford: g('--oxford', '#7A1A2A'),
      text: g('--color-text', '#2C2A26'),
      secondary: g('--color-text-secondary', '#5B574E'),
      muted: g('--ink-5', '#8C877B'),
      faint: g('--ink-6', '#A7A296'),
      border: g('--color-border', '#E2DED4'),
      paper: g('--paper', '#FAFAF6'),
      onAccent: g('--paper-on-accent', '#FAF1E6'),
      ink0: g('--ink-0', '#1E1C19')
    };
  },
  /* Perceptual ramp between two token colors (e.g. heatmaps). */
  _hex2rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  },
  ramp(fromToken, toToken, steps, fromFallback, toFallback) {
    const a = this._hex2rgb(this._get(fromToken, fromFallback || '#F6EFE1'));
    const b = this._hex2rgb(this._get(toToken, toFallback || '#A8854A'));
    const n = Math.max(2, steps || 5);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      out.push('rgb(' + a.map((c, j) => Math.round(c + (b[j] - c) * t)).join(',') + ')');
    }
    return out;
  }
};

/* ── internals ──────────────────────────────────────────── */
AUTOREGIA.esc = function (s) {
  if (s == null) return '';
  const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML;
};
AUTOREGIA._xSvg = '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
