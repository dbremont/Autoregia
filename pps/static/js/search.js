/* ════════════════════════════════════════════════════════════
   PPS — Index search & document rendering
   - loads /api/policies → renders the document index grouped by domain
   - live-searches /api/search?q= as the user types
   ════════════════════════════════════════════════════════════ */
(function () {
  var input = document.getElementById('searchInput');
  var resultsEl = document.getElementById('searchResults');
  var domainEl = document.getElementById('domainGroups');
  var charterCard = document.getElementById('charterCard');
  var debounceTimer = null;

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

  // ── Render the document index grouped by domain ─────────────
  function renderIndex(docs) {
    // Charter: update the main-entry card from data if present
    var charter = docs.filter(function (d) { return d.is_charter; })[0];
    if (charter && charterCard) {
      var h2 = charterCard.querySelector('h2');
      var p = charterCard.querySelector('p');
      if (h2) h2.textContent = charter.title;
      if (p) p.textContent = charter.summary;
    }
    // Remaining docs grouped by domain
    var rest = docs.filter(function (d) { return !d.is_charter; });
    var byDomain = {};
    rest.forEach(function (d) {
      (byDomain[d.domain] = byDomain[d.domain] || []).push(d);
    });
    var html = '';
    Object.keys(byDomain).sort().forEach(function (domain) {
      html += '<div class="domain-group"><h3>' + esc(domain) + '</h3><div class="doc-grid">';
      byDomain[domain].forEach(function (d) {
        html += '<a class="doc-card" href="' + d.path + '">' +
          '<h4>' + esc(d.title) + '</h4>' +
          '<p>' + esc(d.summary) + '</p></a>';
      });
      html += '</div></div>';
    });
    if (domainEl) domainEl.innerHTML = html;
  }

  function renderEmpty(message) {
    if (domainEl) domainEl.innerHTML = '<p class="result-snippet" style="text-align:center">' + esc(message) + '</p>';
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
        '<div class="result-title">' + esc(r.title) + ' <span class="result-domain">· ' + esc(r.domain) + '</span></div>' +
        '<div class="result-snippet">' + highlight(r.snippet, data.query) + '</div></a>';
    });
    resultsEl.innerHTML = html;
  }

  function doSearch(q) {
    if (!q.trim()) { resultsEl.innerHTML = ''; return; }
    fetch('/api/search?q=' + encodeURIComponent(q))
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
    // "/" focuses search (when not already in an input)
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  fetch('/api/policies')
    .then(function (r) { return r.json(); })
    .then(renderIndex)
    .catch(function () { renderEmpty('Could not load the policy index. Are policy documents present in ./policies/?'); });
})();
