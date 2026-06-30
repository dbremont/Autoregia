/* ════════════════════════════════════════════════════════════
   PRAS — Index search, filters & deliberation rendering
   - loads /api/deliberations → renders the index grouped by domain
   - live-searches /api/search?q= as the user types
   - status & type filters narrow the index
   ════════════════════════════════════════════════════════════ */
(function () {
  var input = document.getElementById('searchInput');
  var resultsEl = document.getElementById('searchResults');
  var domainEl = document.getElementById('domainGroups');
  var practiceCard = document.getElementById('practiceCard');
  var statusSel = document.getElementById('filterStatus');
  var typeSel = document.getElementById('filterType');
  var debounceTimer = null;
  var ALL = [];

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function highlight(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    var before = text.slice(0, i);
    var match = text.slice(i, i + q.length);
    var after = text.slice(i + q.length);
    return esc(before) + '<mark>' + esc(match) + '</mark>' + esc(after);
  }

  function pills(d) {
    var html = '<span class="pill status-' + esc(d.status) + '">' + esc(d.status) + '</span>';
    return html;
  }

  // ── Render the deliberation index grouped by domain ──────────
  function renderIndex() {
    var statusF = statusSel ? statusSel.value : '';
    var typeF = typeSel ? typeSel.value : '';

    // Practice: update the main-entry card from data if present
    var practice = ALL.filter(function (d) { return d.is_practice; })[0];
    if (practice && practiceCard) {
      var h2 = practiceCard.querySelector('h2');
      var p = practiceCard.querySelector('p');
      if (h2) h2.textContent = practice.title;
      if (p) p.textContent = practice.summary;
      practiceCard.style.display = (!statusF && !typeF) ? '' : 'none';
    }

    var rest = ALL.filter(function (d) {
      if (d.is_practice) return false;
      if (statusF && d.status !== statusF) return false;
      if (typeF && d.type !== typeF) return false;
      return true;
    });

    if (!rest.length) {
      domainEl.innerHTML = '<p class="result-snippet" style="text-align:center">No deliberations match these filters.</p>';
      return;
    }

    var byDomain = {};
    rest.forEach(function (d) {
      (byDomain[d.domain] = byDomain[d.domain] || []).push(d);
    });
    var html = '';
    Object.keys(byDomain).sort().forEach(function (domain) {
      html += '<div class="domain-group"><h3>' + esc(domain) + '</h3><div class="doc-grid">';
      byDomain[domain].forEach(function (d) {
        var meta = esc(d.type) + ' · ' + esc(d.date || '—');
        html += '<a class="doc-card" href="' + d.path + '">' +
          '<div class="doc-tags">' + pills(d) + ' <span class="type-chip">' + esc(d.type) + '</span></div>' +
          '<h4>' + esc(d.title) + '</h4>' +
          '<p>' + esc(d.summary) + '</p>' +
          '<div class="doc-meta">' + meta + (d.feeds.length ? ' · feeds: ' + esc(d.feeds.join(', ')) : '') + '</div>' +
          '</a>';
      });
      html += '</div></div>';
    });
    domainEl.innerHTML = html;
  }

  // ── Search rendering ─────────────────────────────────────────
  function renderResults(data) {
    if (!data.query) { resultsEl.innerHTML = ''; return; }
    if (!data.results.length) {
      resultsEl.innerHTML = '<div class="search-section-label">No matches for “' + esc(data.query) + '”</div>';
      return;
    }
    var html = '<div class="search-section-label">' + data.count + ' match' + (data.count === 1 ? '' : 'es') + ' for “' + esc(data.query) + '”</div>';
    data.results.forEach(function (r) {
      html += '<a class="result-item" href="' + r.path + '">' +
        '<div class="result-title">' + esc(r.title) + ' <span class="result-meta">· ' + esc(r.domain) + '</span></div>' +
        '<div class="result-meta"><span class="pill status-' + esc(r.status) + '">' + esc(r.status) + '</span> ' + esc(r.type) + '</div>' +
        '<div class="result-snippet">' + highlight(r.snippet, data.query) + '</div></a>';
    });
    resultsEl.innerHTML = html;
  }

  function doSearch(q) {
    if (!q.trim()) { resultsEl.innerHTML = ''; return; }
    fetch('/pras/api/search?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(renderResults)
      .catch(function () { resultsEl.innerHTML = ''; });
  }

  // ── Wire up ──────────────────────────────────────────────────
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { doSearch(input.value); }, 140);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(debounceTimer); doSearch(input.value); }
      if (e.key === 'Escape') { input.value = ''; resultsEl.innerHTML = ''; input.blur(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  if (statusSel) statusSel.addEventListener('change', renderIndex);
  if (typeSel) typeSel.addEventListener('change', renderIndex);

  fetch('/pras/api/deliberations')
    .then(function (r) { return r.json(); })
    .then(function (docs) { ALL = docs; renderIndex(); })
    .catch(function () {
      if (domainEl) domainEl.innerHTML = '<p class="result-snippet" style="text-align:center">Could not load the deliberation index. Are documents present in ./deliberations/?</p>';
    });
})();
