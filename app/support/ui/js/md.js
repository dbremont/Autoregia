/* ════════════════════════════════════════════════════════════
   Autoregia Shared Markdown Renderer (served at /ui/js/md.js)
   AUTOREGIA.Markdown — a small, dependency-free, XSS-safe
   renderer (escape-then-render) shared by every surface that
   renders markdown (AOOS Scratchpad + share page, SOPCS reader
   + editor preview). Supports a practical subset of
   GitHub-flavored Markdown:

     headings (#…######)          → <h1..h6> with deterministic
                                    anchor ids h-1, h-2, … (one
                                    counter over ALL headings, in
                                    document order — TOC producers
                                    must use the same numbering)
     unordered / ordered lists    fenced code blocks
     task lists - [ ] / - [x]     blockquotes
     pipe tables (GFM subset)     horizontal rules (---, ***)
     links [text](href)           images ![alt](src)
     bold **…**, italic *…*,      inline code `…`
     math $…$ / $$…$$ via KaTeX when loaded (else a fallback span)

   URLs are whitelisted: http/https/mailto plus relative,
   root-relative and #fragment links — everything else
   (javascript:, data:, vbscript:, …) renders inert.
   ════════════════════════════════════════════════════════════ */
window.AUTOREGIA = window.AUTOREGIA || {};
AUTOREGIA.Markdown = AUTOREGIA.Markdown || {};

AUTOREGIA.Markdown._esc = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

/* URL whitelist — called on the ESCAPED href/src (quotes are already
   &quot; so the attribute can be built by plain concatenation). */
AUTOREGIA.Markdown._safeUrl = function (url) {
  const u = String(url).replace(/&amp;/g, '&');
  if (/^(https?:|mailto:)/i.test(u)) return true;
  if (/^(\/|\.\.?\/|#)/.test(u)) return true;          // root/relative/fragment
  if (/^[a-z0-9-]+:/i.test(u)) return false;            // any other scheme
  return true;                                          // schemeless = relative
};

AUTOREGIA.Markdown._renderMath = function (tex, display) {
  if (window.katex) {
    try {
      return window.katex.renderToString(tex, { displayMode: !!display, throwOnError: false });
    } catch (e) { /* fall through */ }
  }
  return '<span class="md-math-fallback">' + AUTOREGIA.Markdown._esc(tex) + '</span>';
};

/* Extract all math spans up front, replacing each with a placeholder token.
   The token contains only a NUL byte + digits, so it survives the
   HTML-escaping and line-wise Markdown pass unchanged; it is substituted
   back at the end. */
AUTOREGIA.Markdown._extractMath = function (text, stash) {
  let t = String(text);
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) { return stash(AUTOREGIA.Markdown._renderMath(tex, true)); });
  t = t.replace(/\\\[([\s\S]+?)\\\]/g, function (m, tex) { return stash(AUTOREGIA.Markdown._renderMath(tex, true)); });
  t = t.replace(/\\\(([\s\S]+?)\\\)/g, function (m, tex) { return stash(AUTOREGIA.Markdown._renderMath(tex, false)); });
  // inline $...$: opener not preceded by $, first/last inner char not space or $, single line.
  t = t.replace(/\$([^\s$])([^$\n]*?[^\s$])?\$/g, function (m, a, b) {
    return stash(AUTOREGIA.Markdown._renderMath(a + (b || ''), false));
  });
  return t;
};

AUTOREGIA.Markdown._inline = function (s) {
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {   // images first
    if (!AUTOREGIA.Markdown._safeUrl(src)) return m;
    return '<img src="' + src + '" alt="' + alt + '" loading="lazy">';
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
    if (!AUTOREGIA.Markdown._safeUrl(href)) return txt;
    return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
  });
  return s;
};

/* GFM pipe table: a header row containing `|`, then a separator row of
   `|`, `-`, `:` and spaces. Cells keep the escape-then-render contract. */
AUTOREGIA.Markdown._tableRows = function (line) {
  if (line.indexOf('|') < 0) return null;
  const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
  return cells.map(function (c) { return c.trim(); });
};
AUTOREGIA.Markdown._isTableSep = function (line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
};

AUTOREGIA.Markdown.render = function (body) {
  if (!body) return '<p class="md-empty">The document is empty.</p>';
  const M = AUTOREGIA.Markdown;
  const maths = [];
  function stash(html) { maths.push(html); return '\u0000' + (maths.length - 1) + '\u0000'; }
  const raw = M._extractMath(body, stash);

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let heading = 0;                                   // anchor counter — ALL headings
  let para = [];
  function flush() { if (para.length) { out.push('<p>' + M._inline(para.join(' ')) + '</p>'); para = []; } }
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {                                              // fenced code
      flush(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + M._esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    if (/^\s*$/.test(line)) { flush(); i++; continue; }
    const hm = line.match(/^(#{1,6})\s+(.*)$/);                           // heading (+anchor)
    if (hm) {
      flush(); heading++;
      out.push('<h' + hm[1].length + ' id="h-' + heading + '">' +
        M._inline(M._esc(hm[2])) + '</h' + hm[1].length + '>');
      i++; continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
    if (i + 1 < lines.length && M._isTableSep(lines[i + 1])) {            // pipe table
      const head = M._tableRows(line);
      if (head && head.length > 1) {
        flush();
        let html = '<table><thead><tr>';
        head.forEach(function (c) { html += '<th>' + M._inline(M._esc(c)) + '</th>'; });
        html += '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && !/^\s*$/.test(lines[i])) {
          const row = M._tableRows(lines[i]) || [];
          html += '<tr>';
          head.forEach(function (_, c) {
            html += '<td>' + M._inline(M._esc(row[c] || '')) + '</td>';
          });
          html += '</tr>';
          i++;
        }
        html += '</tbody></table>';
        out.push(html);
        continue;
      }
    }
    const tm = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);              // task list item
    if (tm) {
      flush();
      const done = tm[1].toLowerCase() === 'x';
      out.push('<div class="md-task' + (done ? ' is-done' : '') + '"><input type="checkbox" disabled' +
        (done ? ' checked' : '') + '> ' + M._inline(M._esc(tm[2])) + '</div>');
      i++; continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {                                       // unordered list
      flush(); const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + M._inline(M._esc(lines[i].replace(/^\s*[-*]\s+/, ''))) + '</li>'); i++; }
      out.push('<ul>' + items.join('') + '</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {                                      // ordered list
      flush(); const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push('<li>' + M._inline(M._esc(lines[i].replace(/^\s*\d+\.\s+/, ''))) + '</li>'); i++; }
      out.push('<ol>' + items.join('') + '</ol>'); continue;
    }
    if (/^\s*>\s?/.test(line)) {                                          // blockquote
      flush(); const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(M._esc(lines[i].replace(/^\s*>\s?/, ''))); i++; }
      out.push('<blockquote><p>' + M._inline(buf.join('<br>')) + '</p></blockquote>'); continue;
    }
    para.push(M._esc(line)); i++;                                         // paragraph
  }
  flush();

  let html = out.join('\n');
  // Reinsert rendered math (display blocks should sit outside <p>; KaTeX display
  // is an inline-block span, so leaving it inline is acceptable for this surface).
  html = html.replace(/\u0000(\d+)\u0000/g, function (m, n) { return maths[+n]; });
  return html;
};

/* Heading outline of a markdown body — mirrors the renderer's anchor
   numbering exactly (h-<n>, one counter over ALL headings). ``maxLevel``
   bounds which headings are listed; anchors stay globally consistent. */
AUTOREGIA.Markdown.outline = function (body, maxLevel) {
  const M = AUTOREGIA.Markdown;
  const max = maxLevel || 6;
  const toc = [];
  let n = 0;
  String(body || '').replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
    const m = line.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (!m) return;
    n++;
    if (m[1].length <= max) {
      toc.push({ level: m[1].length, text: M._esc(m[2]).replace(/[*_`]/g, ''), anchor: 'h-' + n });
    }
  });
  return toc;
};
