/* ════════════════════════════════════════════════════════════
   ACSMS About + Documentation — pages rendered in appContent.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};

ACSMS.Documentation = {
  render() {
    const binds = ACSMS.VIEWS.filter(v => !v.action).map(v =>
      `<div class="kbd-row"><span>${v.label} — <em class="text-muted">${v.desc}</em></span><span><a href="#${v.id}" class="text-mono text-xs">#${v.id}</a></span></div>`).join('');
    return `<div class="animate-in">${ACSMS.view.header('Documentation')}<div class="docs-page"><div class="docs-prose">
      <h4>Purpose</h4>
      <p>A tracking system for the agent's deliberate growth: <strong>skills are defined</strong> in a catalog, <strong>practice is self-reported</strong> against them, and the tracking layer closes the loop — flagging the skills that never receive practice or whose practice went stale.</p>
      <h4>The two document kinds</h4>
      <p>A <strong>skill</strong> is a capability definition: name, description, tags, a lifecycle status (active, paused, retired) and a cadence target (practices per week). A <strong>practice</strong> is one self-reported session bound to an <em>existing</em> skill — you cannot report practice on a skill that does not exist. Each report carries a date, duration, notes, a quality and confidence self-rating (1–5), and optionally a link to the evidence output.</p>
      <h4>Automated tracking</h4>
      <p>Every skill carries a computed <em>practice state</em>: <span class="pill state-pill-on-track">on track</span> (fresh practice), <span class="pill state-pill-neglected">neglected</span> (last practice older than twice the target interval) or <span class="pill state-pill-never-practiced">never practiced</span>. Flagged skills land in the dashboard's attention queue — the loop back to the Review and Cull stages of the improvement lifecycle. Practiced skills cannot be hard-deleted; they leave through retirement, so the cull decision is recorded.</p>
      <h4>Self-reporting</h4>
      <p>The form lives on Practice (and in the quick-capture overlay, <span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span>). Record what was done and what was produced — exposure is not acquisition; output is the test.</p>
      <h4>Navigation</h4><div class="kbd-grid">${binds}</div>
      <h4>Shortcuts</h4>
      <div class="kbd-grid">
        <div class="kbd-row"><span>Command palette</span><span><span class="kbd">Ctrl</span> <span class="kbd">K</span></span></div>
        <div class="kbd-row"><span>Quick capture</span><span><span class="kbd">Ctrl</span> <span class="kbd">⇧</span> <span class="kbd">N</span></span></div>
        <div class="kbd-row"><span>Focus search</span><span><span class="kbd">/</span></span></div>
        <div class="kbd-row"><span>Dismiss overlays</span><span><span class="kbd">Esc</span></span></div>
      </div>
    </div></div></div>`;
  },
  afterRender() {},
};

ACSMS.About = {
  render() {
    return `<div class="animate-in">${ACSMS.view.header('About')}<div class="docs-page"><div class="docs-prose">
      <h4>What it is</h4>
      <p><strong>ACSMS — the Agent Capability Self Management System</strong> — is Autoregia's <em>substrate</em> sub-system (VSM System 4, directed inward). Where WOS points System 4 at the external world, ACSMS points it at the agent itself: it manages the deliberate growth of the agent's own capabilities.</p>
      <h4>The analogy</h4>
      <p>An <strong>athlete's training regime</strong> or an organization's <strong>R&amp;D function</strong>. Performance today is produced by the current capability set; the regime exists to change that set deliberately — identifying weaknesses, scheduling practice, demanding evidence, and retiring what no longer serves.</p>
      <h4>This build</h4>
      <p>This dashboard materializes the <em>Practice → Evidence → Review → Cull</em> span of the improvement lifecycle: a skill catalog, a validated self-report practice stream, and the automated tracking layer that flags skills without practice. Upstream systems (PTOCS gap analysis, PRAS adaptations, AIAS commitments) will feed the Detect → Deliberate → Commit stages.</p>
      <h4>Storage</h4>
      <p>Skills and practices persist as documents in CouchDB (db <code class="text-mono">acsms</code>), seeded from <code class="text-mono">data/skills.json</code> on first run.</p>
      <h4>Further reading</h4>
      <div class="kbd-grid">
        <div class="kbd-row"><span>Specification</span><span><code class="text-mono text-xs">spec/acsms/README.md</code></span></div>
        <div class="kbd-row"><span>Seed catalog</span><span><code class="text-mono text-xs">app/module/acsms/data/skills.json</code></span></div>
      </div>
    </div></div></div>`;
  },
  afterRender() {},
};
