/* ════════════════════════════════════════════════════════════
    SOPCS App — sidebar router, keyboard, header search, chrome.
    Routes (hash): #dashboard · #library · #doc/<id> ·
    #doc/<id>/edit · #new · #about. The header search feeds the
    Library view.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};
const SOPCS = window.SOPCS;

SOPCS.VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'gauge', group: 'Catalog', desc: 'the catalog at a glance' },
  { id: 'library', label: 'Library', icon: 'book-open', group: 'Catalog', desc: 'the catalog of procedures' },
  { id: 'about', label: 'About', icon: 'info', group: 'System', desc: 'what SOPCS is' },
];

// Pre-shell hashes, kept as aliases so old bookmarks keep working.
SOPCS._ALIASES = { catalog: 'library', docs: 'library', home: 'dashboard' };

SOPCS.toast = function (msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
SOPCS.confirm = (opts) => AUTOREGIA.confirmDialog(opts);

SOPCS.init = async function () {
  try { await SOPCS.Store.load(); } catch (e) { console.error('load failed', e); }
  this.renderSidebar();
  this.setupRouter();
  this.setupKeyboard();
  this.setupHeader();
  this.navigate(this.getHash() || 'dashboard');
};

SOPCS.renderSidebar = function () {
  const nav = document.getElementById('sidebarNav');
  const groups = [];
  SOPCS.VIEWS.forEach((v) => {
    let g = groups[groups.length - 1];
    if (!g || g.name !== v.group) { g = { name: v.group, views: [] }; groups.push(g); }
    g.views.push(v);
  });
  nav.innerHTML = groups.map((g) =>
    `<div class="sidebar-label">${g.name}</div>` + g.views.map((v) =>
      `<a href="#${v.id}" data-view="${v.id}"><span class="nav-icon">${SOPCS.icon(v.icon, 16)}</span><span>${v.label}</span></a>`
    ).join('')
  ).join('');
};

SOPCS.setupRouter = function () {
  window.addEventListener('hashchange', () => { const v = this.getHash(); if (v !== undefined && v !== '') this.navigate(v); });
};
SOPCS.getHash = () => location.hash.replace(/^#\/?/, '');

SOPCS.navigate = function (route) {
  route = SOPCS._ALIASES[route] || route;
  const parts = route.split('/');
  let render, after = null, activeBase = 'library';

  if (parts[0] === 'doc' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    if (parts[2] === 'edit') { render = SOPCS.Editor.render(id); after = () => SOPCS.Editor.afterRender(); }
    else { render = SOPCS.Reader.render(id); after = () => SOPCS.Reader.afterRender(); }
  } else if (parts[0] === 'new') {
    render = SOPCS.Editor.render(null); after = () => SOPCS.Editor.afterRender();
  } else if (parts[0] === 'dashboard') {
    activeBase = 'dashboard';
    render = SOPCS.Dashboard.render(); after = () => SOPCS.Dashboard.afterRender();
  } else if (parts[0] === 'about') {
    activeBase = 'about'; render = SOPCS.About.render();
  } else {
    route = 'library';
    render = SOPCS.Library.render(); after = () => SOPCS.Library.afterRender();
  }

  this.current = route;
  if (('#' + route) !== location.hash) location.hash = '#' + route;
  document.querySelectorAll('.sidebar-nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === activeBase));
  const c = document.getElementById('appContent');
  c.innerHTML = render;
  c.scrollTop = 0;
  if (after) setTimeout(after, 20);
  this.updateFooter();
};

SOPCS.updateFooter = function () {
  const fd = document.getElementById('footerDocs');
  const self = SOPCS.Store.self();
  if (fd && self && self.catalog) fd.textContent = `${self.catalog.sops} sops · ${self.catalog.words} words`;
  const ff = document.getElementById('footerFilter');
  if (ff) {
    const st = SOPCS.Store.state;
    const bits = [];
    if (st.q) bits.push(`“${st.q}”`);
    if (st.status) bits.push(st.status);
    if (st.tag) bits.push(`#${st.tag}`);
    ff.textContent = bits.length ? bits.join(' · ') : 'no filter';
  }
};

SOPCS.setupKeyboard = function () {
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); SOPCS.CommandPalette.open(''); }
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if (e.key === 'Escape') { SOPCS.CommandPalette.close(); }
  });
};

SOPCS.setupHeader = function () {
  const gs = document.getElementById('globalSearch');
  gs?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      SOPCS.navigate('library');
      setTimeout(() => SOPCS.Library.runSearch(gs.value.trim()), 60);
    }
  });
};

// About — what SOPCS is (the system, not the shell).
SOPCS.About = {
  render() {
    return `<div class="animate-in"><div class="docs-page">
      <span class="eyebrow">About</span><h1>Standard Operating Procedure Catalog System</h1>
      <div class="docs-prose">
        <h4>What it is</h4>
        <p><strong>SOPCS</strong> is a tool of Autoregia's <em>Agent Toolbox Ecosystem</em> (ATE): the catalog of standard operating procedures — the written, reviewable way things are done. A procedure that lives only in habit cannot be audited, improved, or handed over; SOPCS makes it a document with a lifecycle.</p>
        <h4>The catalog</h4>
        <p>Each SOP is markdown with a slug, a title, a one-line summary, tags, and a lifecycle status: <em>draft → active → deprecated</em>. The library offers full-text and semantic search, status and tag facets, pagination, reading time, and a heading outline (TOC) whose anchors are produced by the shared markdown renderer.</p>
        <h4>Search</h4>
        <p><strong>Lexical</strong> search runs inside CouchDB — a design-doc token view queried by prefix, AND-composed across terms. <strong>Semantic</strong> search embeds bodies and queries with <code class="text-mono">fastembed</code> (BGE-small) when it is installed, and degrades gracefully when it is not: <code class="text-mono">pip install fastembed</code>, then <em>Re-index</em> in the command palette.</p>
        <h4>History</h4>
        <p>Every content change is snapshotted as a version. The reader's <em>History</em> panel shows what changed between versions (unified diff) and can restore any of them — restoring always creates a new version, so history is never rewritten.</p>
        <h4>Figures</h4>
        <p>Supporting images are uploaded in the editor (picker, paste, or drag-and-drop) and stored as CouchDB attachments — they persist with the database volume, not the container filesystem.</p>
        <h4>Dependability</h4>
        <p>The catalog, figures, embeddings, and the audit trail persist in CouchDB (db <code class="text-mono">sopcs</code>). Every mutation is audited; deleting a procedure removes its attachments and embedding with it.</p>
        <h4>Further reading</h4>
        <div class="kbd-grid">
          <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/sopcs/spec.md</code></span></div>
          <div class="kbd-row"><span>Decision log</span><span><code class="text-mono text-xs">log.md</code> — SOPCS entry</span></div>
          <div class="kbd-row"><span>Implementation</span><span><code class="text-mono text-xs">app/module/ate/tool/sopcs/</code></span></div>
        </div>
      </div>
    </div></div>`;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  SOPCS.init();
});
