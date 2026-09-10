/* ════════════════════════════════════════════════════════════
   GIS Reference — user-facing plates about the Index itself.

   Three reading pages (standalone-document archetype):
   • Data Sources — where the Index's content comes from and lives
   • Documentation — how to use the Index
   • About — what the Index is
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};

PT.Reference = (() => {

  // ── shared scaffold ────────────────────────────────────────
  function plate(eyebrow, title, lede, body) {
    return '<div class="doc-plate">' +
      '<header class="doc-masthead"><div class="eyebrow">' + eyebrow + '</div>' +
      '<h1>' + title + '</h1><div class="hero-rule"></div>' +
      '<p class="doc-lede">' + lede + '</p></header>' +
      body +
      '<footer class="doc-colophon">GIS · General Index System — VSM System 4 · Intelligence</footer>' +
      '</div>';
  }
  function section(label, inner) {
    return '<section class="doc-section"><h2 class="doc-label">' + label + '</h2>' + inner + '</section>';
  }
  function p(text) { return '<p>' + text + '</p>'; }
  function table(head, rows) {
    return '<table class="doc-table"><thead><tr>' +
      head.map(h => '<th>' + h + '</th>').join('') +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }
  // Link that opens the Index home pre-filtered.
  function ixLink(label, fn) {
    return '<a href="#index" class="doc-link" onclick="' + fn + '">' + label + '</a>';
  }

  // ── Data Sources ───────────────────────────────────────────
  function sources() {
    const rows = PT.Store.getAll()
      .filter(e => e.object_kind === 'data_source')
      .sort((a, b) => (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1);
    const open = e => {
      const u = (e.provenance && e.provenance.source_url) || (e.usage && e.usage.docs_url);
      return u ? ' <a class="doc-ext" href="' + PT.esc(u) + '" target="_blank" rel="noopener" title="' + PT.esc(u) + '">↗</a>' : '';
    };
    const body = rows.length
      ? table(['Source', 'Provides', 'Domain', 'Tags'], rows.map(e => [
          '<a class="doc-link" style="cursor:pointer;" onclick="PT.openEntry(\'' + e.id + '\')">' + PT.esc(e.name) + '</a>' + open(e),
          PT.esc(e.summary || '—'),
          PT.esc(e.domain || '—'),
          (e.tags || []).map(t => '<code class="doc-tag">#' + PT.esc(t) + '</code>').join(' ') || '—',
        ]))
      : '<div class="doc-prose"><p>No data sources recorded yet. Add entries of kind ' +
        '<b>Data Source</b> — feeds, APIs, datasets — and they will be listed here.</p></div>';
    const tail = '<div class="doc-prose"><p>' +
      ixLink('Open the data sources in the Index →', "PT.HomeIndex.filterAll(); PT.HomeIndex.setGroup('data')") +
      '</p></div>';
    return plate('Reference', 'Data Sources',
      'The feeds, APIs, and datasets the Index draws facts from — ' + rows.length + ' recorded.',
      section('The list', body) + tail);
  }

  // ── Documentation ──────────────────────────────────────────
  const KINDS = [
    ['Software Tool', 'tools', 'software_tool', 'Applications you operate directly — editors, browsers, converters.'],
    ['Library / Framework', 'tools', 'library_framework', 'Code you build upon rather than run — Flask, ECharts.'],
    ['Language', 'tools', 'language', 'Programming or notation languages — Python, SQL.'],
    ['Service Platform', 'services', 'service_platform', 'Hosted platforms you use over the network — GitHub, AWS, Figma.'],
    ['Infrastructure', 'infra', 'infrastructure', 'The substrate everything runs on — servers, containers, databases.'],
    ['Data Source', 'data', 'data_source', 'Places the Index draws facts from — APIs, feeds, market data.'],
    ['Document', 'documents', 'document', 'Written artifacts — papers, references, standards.'],
    ['Reference Artifact', 'documents', 'reference_artifact', 'Normative material consulted, not consumed — RFCs, manuals.'],
    ['Hardware Device', 'tools', 'hardware_device', 'Physical equipment — laptops, e-readers, recorders.'],
    ['Physical Instrument', 'more', 'physical_instrument', 'Physical objects supporting practice — furniture, instruments.'],
    ['Workflow Method', 'more', 'workflow_method', 'Named procedures — release pipelines, review rituals.'],
    ['Capability Skill', 'more', 'capability_skill', 'Abilities you exercise — prompt engineering, negotiation.'],
    ['Person', 'people', 'person', 'People in the loop — advisors, collaborators, points of contact.'],
    ['Project', 'projects', 'project', 'Endeavors that bundle other entries — this very system.'],
    ['Other', 'more', 'other', 'Anything that resists the categories above.'],
  ];

  function handbook() {
    const body =
      section('The Index view', '<div class="doc-prose">' +
        p('The home of the system. The <b>search box</b> in the header filters everything as you ' +
          'type. Below the headline stats, <b>tabs</b> group entries coarsely — All, Documents, ' +
          'Tools, Services, Infra, Data, People, Projects, More. The table can flip between a ' +
          '<b>list</b> (scan) and a <b>grid</b> (browse), is sorted by relevance, recency, name, or ' +
          'addition order, and paginates at twelve rows.') +
        p('The panel on the right holds the working controls: <b>Quick Actions</b> (add, import, ' +
          'graph), <b>Filters</b> — a space selector and per-kind checkboxes with live counts — and ' +
          '<b>Tags</b>, the vocabulary you actually use. Below them, a miniature of the <b>Knowledge ' +
          'Graph</b> and the latest <b>Activity</b>. Click any row, card, or tag to go deeper.') +
        '</div>') +

      section('Where entries come from', '<div class="doc-prose">' +
        p('Every entry enters the Index through one of three doors:') +
        p('<b>The editor.</b> Press <kbd>N</kbd> (or <b>Add Entry</b>) and fill the form. ' +
          'The essentials are a name, a kind, and a one-line summary — everything else can wait.') +
        p('<b>Import.</b> The <b>Import</b> button accepts a JSON array of entries and merges them ' +
          'by id — existing entries are never overwritten, new ids are added. The Export page hands ' +
          'you the whole Index in that same shape, so export → edit → import is a valid round trip.') +
        p('<b>The seed catalog.</b> A brand-new database starts with a small generated catalog ' +
          'so the Index is never empty on first look. It is ordinary data — edit or retire it like ' +
          'anything else. Entries live in a <b>local document database</b> on this machine; a ' +
          'companion log records what is added, updated, viewed, or deleted.') +
        '</div>') +

      section('The Dashboard', '<div class="doc-prose">' +
        p('One analytics surface, six tabs — each answers a different question about the Index:') +
        '</div>' +
        table(['Tab', 'Answers'], [
          ['Overview', 'What does the Index hold right now — composition, pinned, recent.'],
          ['Coverage', 'Where the Index backs your systems and domains — and where it is thin.'],
          ['Structure', 'How the Index hangs together — dependency chains, single points of failure, duplicates.'],
          ['Health', 'What needs attention — staleness, orphans, concentration risk.'],
          ['Cost &amp; Trust', 'What it costs, and how well-evidenced each entry is.'],
          ['Activity', 'How the Index has been moving — adds, updates, views, deletions.'],
        ]) +
        '<div class="doc-prose">' +
        p('The <b>Refresh</b> button recomputes every projection from the live database.') +
        '</div>') +

      section('Anatomy of an entry', '<div class="doc-prose">' +
        p('An entry is a <b>point → element</b> pair: the point is the handle you remember ' +
          '(a name, an alias), the element is what it resolves to. Around that, each entry carries ' +
          'as much or as little metadata as you care to record:') +
        '</div>' +
        table(['Group', 'What it answers'], [
          ['Identity', 'Name, id, and aliases — the handles the index can be searched by.'],
          ['Description', 'Summary, purpose, function, detail — what it is and why it exists.'],
          ['Classification', 'Kind, category, domain, tags — where it sits in the taxonomy.'],
          ['Provenance', 'Vendor, version, license, source — where it came from.'],
          ['State', 'Status and priority — is it active, on trial, or retired; how much it matters.'],
          ['Cost', 'Kind, amount, period — what it costs, if anything.'],
          ['Epistemic', 'Fit confidence and evidence level — how sure you are it serves you.'],
          ['Strategic', 'System served, capability — which part of your operation it supports.'],
          ['Relationships', 'Typed links to other entries — depends on, alternative to, part of…'],
          ['Annotations', 'A dated commentary log — reviews, questions, corrections.'],
        ])) +

      section('Kinds', '<div class="doc-prose">' +
        p('Every entry has exactly one kind. Kinds roll up into the coarse tabs of the Index ' +
          '(Tools, Services, Infra, Data, Documents, People, Projects, More). Click a kind to see ' +
          'its entries:') +
        '</div>' +
        table(['Kind', 'Belongs to', 'Meaning'], KINDS.map(k => [
          ixLink(k[0], "PT.HomeIndex.filterKind('" + k[2] + "')"),
          ixLink(PT.prettyEnum(k[1]), "PT.HomeIndex.filterAll(); PT.HomeIndex.setGroup('" + k[1] + "')"),
          k[3],
        ]))) +

      section('Spaces', '<div class="doc-prose">' +
        p('Each entry belongs to one <b>space</b> — a soft boundary between the strata of your life. ' +
          'Spaces are filters, not silos: nothing is hidden, only grouped.') +
        '</div>' +
        table(['Space', 'Meaning'], [
          [ixLink('Personal', "PT.HomeIndex.filterSpace('personal')"), 'Life outside employment — home tooling, reading, health, finance.'],
          [ixLink('Work', "PT.HomeIndex.filterSpace('work')"), 'Professional practice — the tools and services of the job.'],
          [ixLink('Projects', "PT.HomeIndex.filterSpace('projects')"), 'Bounded efforts with an end state — each project an entry of its own.'],
          [ixLink('Favorites', "PT.HomeIndex.filterSpace('favorites')"), 'Whatever you pinned — the short list, shown on the Dashboard Overview.'],
        ])) +

      section('Graph', '<div class="doc-prose">' +
        p('The whole Index as one connected model. Nodes are entries (colored by kind, sized by ' +
          'connection count), edges are typed relationships — filter by relation kind with the ' +
          'selector above the chart. Click a node to open the entry; hover to isolate its ' +
          'neighborhood. Entries with no relationships sit at the rim — the Health tab counts them ' +
          'as orphans.') +
        '</div>') +

      section('Organizing', '<div class="doc-prose">' +
        p('<b>Pin</b> an entry to promote it to Favorites and the Overview\u2019s quick list. ' +
          '<b>Retire</b> when something is no longer in use but worth remembering — it leaves the ' +
          'active counts but stays in the Index. <b>Delete</b> only when it should vanish entirely; ' +
          'deletion is recorded in the activity log but cannot be undone. <b>Annotations</b> are a ' +
          'dated commentary log on any entry — reviews, questions, cost changes — without touching ' +
          'the entry\u2019s content.') +
        '</div>') +

      section('Keyboard &amp; commands', '<div class="doc-prose">' + p('A few accelerators:') + '</div>' +
        table(['Keys', 'Action'], [
          ['<kbd>Ctrl/Cmd + K</kbd>', 'Command palette — commands plus instant entry search.'],
          ['<kbd>N</kbd>', 'New entry.'],
          ['<kbd>Esc</kbd>', 'Close palette, editor, or detail.'],
          ['<kbd>Enter</kbd> in search', 'Open the palette with the current query.'],
        ]));
    return plate('Reference', 'Documentation',
      'How to use the Index — every view, control, and shortcut, in plain language.',
      body);
  }

  // ── About ──────────────────────────────────────────────────
  function about() {
    const body =
      section('The idea', '<div class="doc-prose">' +
        p('The General Index is a catalog of <b>handles</b>. Each entry is a point — a name you ' +
          'will remember — pointing at an element: a tool, a service, a document, a dataset, a ' +
          'person, a project, a practice. The element may live anywhere; the Index only insists on ' +
          'the handle and what it connects to.') +
        p('Handles alone would be a list. The Index adds <b>relationships</b> — depends on, ' +
          'alternative to, part of, enables — so the catalog becomes a model: you can see what ' +
          'hangs off what, what duplicates what, and what falls over if a single node is removed.') +
        '</div>') +

      section('Why', '<div class="doc-prose">' +
        p('Because context decays. Tools pile up, subscriptions renew silently, provenance is ' +
          'forgotten, and the same capability gets re-acquired under a new name. The Index pushes ' +
          'back: one place, searchable in seconds, honest about cost and evidence, and — through ' +
          'the Dashboard — willing to tell you when it is thin, stale, or fragile.') +
        '</div>') +

      section('Role', '<div class="doc-prose">' +
        p('Within Autoregia — a Personal Viable System Model — the Index is <b>System 4, ' +
          'Intelligence</b>: the function that looks outward and inward, maintains the model of ' +
          'what exists, and informs policy. It is the entry point to everything the operator knows ' +
          'and uses.') +
        '</div>') +

      section('Colophon', '<div class="doc-prose">' +
        p('Version v0.2 · Flask, CouchDB, and vanilla HTML/CSS/JS — no frameworks, no trackers, ' +
          'self-hosted type. Set in Spectral, Inter, and IBM Plex Mono on parchment.') +
        '</div>');
    return plate('Reference', 'About the Index',
      'What the General Index System is, why it exists, and the part it plays.',
      body);
  }

  return { sources, handbook, about };
})();
