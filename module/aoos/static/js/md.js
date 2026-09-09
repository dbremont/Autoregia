/* AOOS Markdown + LaTeX renderer (Component S shared surface).
 *
 * A small, dependency-free, XSS-safe renderer used by the Scratchpad (and the
 * public share page). Supports a practical subset of GitHub-flavored Markdown
 * (headings, lists, task lists, inline/block code, blockquotes, links, bold,
 * italic, paragraphs) plus LaTeX math via KaTeX:
 *   display math:  $$...$$   and   \[...\]
 *   inline math:   $...$     and   \(...\)
 *
 * Math is extracted on the raw text, rendered with KaTeX, and reinserted after
 * the Markdown pass so the math source is never escaped or mangled. If KaTeX is
 * absent, math falls back to an escaped <span> showing the source. */
window.AO = window.AO || {};
AO.Markdown = AO.Markdown || {};

AO.Markdown._esc = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

AO.Markdown._renderMath = function (tex, display) {
  if (window.katex) {
    try {
      return window.katex.renderToString(tex, { displayMode: !!display, throwOnError: false });
    } catch (e) { /* fall through */ }
  }
  return '<span class="md-math-fallback">' + AO.Markdown._esc(tex) + '</span>';
};

/* Extract all math spans up front, replacing each with a placeholder token. The
 * token contains only a NUL byte + digits, so it survives the HTML-escaping and
 * line-wise Markdown pass unchanged; it is substituted back at the end. */
AO.Markdown._extractMath = function (text, stash) {
  let t = String(text);
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) { return stash(AO.Markdown._renderMath(tex, true)); });
  t = t.replace(/\\\[([\s\S]+?)\\\]/g, function (m, tex) { return stash(AO.Markdown._renderMath(tex, true)); });
  t = t.replace(/\\\(([\s\S]+?)\\\)/g, function (m, tex) { return stash(AO.Markdown._renderMath(tex, false)); });
  // inline $...$: opener not preceded by $, first/last inner char not space or $, single line.
  t = t.replace(/\$([^\s$])([^$\n]*?[^\s$])?\$/g, function (m, a, b) {
    return stash(AO.Markdown._renderMath(a + (b || ''), false));
  });
  return t;
};

AO.Markdown._inline = function (s) {
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
    if (/^(https?:|mailto:)/i.test(href) || /^(\/|\.\.?\/|#)/.test(href)) {
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
    }
    return txt;
  });
  return s;
};

AO.Markdown.render = function (body) {
  if (!body) return '<p class="text-muted">The document is empty — switch to Edit to start writing.</p>';
  const maths = [];
  function stash(html) { maths.push(html); return '\u0000' + (maths.length - 1) + '\u0000'; }
  const raw = AO.Markdown._extractMath(body, stash);

  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  function flush() { if (para.length) { out.push('<p>' + AO.Markdown._inline(para.join(' ')) + '</p>'); para = []; } }
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {                                              // fenced code
      flush(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + AO.Markdown._esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    if (/^\s*$/.test(line)) { flush(); i++; continue; }
    const hm = line.match(/^(#{1,6})\s+(.*)$/);                           // heading
    if (hm) { flush(); out.push('<h' + hm[1].length + '>' + AO.Markdown._inline(AO.Markdown._esc(hm[2])) + '</h' + hm[1].length + '>'); i++; continue; }
    const tm = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);              // task list item
    if (tm) {
      flush();
      const done = tm[1].toLowerCase() === 'x';
      out.push('<div class="md-task' + (done ? ' is-done' : '') + '"><input type="checkbox" disabled' +
        (done ? ' checked' : '') + '> ' + AO.Markdown._inline(AO.Markdown._esc(tm[2])) + '</div>');
      i++; continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {                                       // unordered list
      flush(); const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + AO.Markdown._inline(AO.Markdown._esc(lines[i].replace(/^\s*[-*]\s+/, ''))) + '</li>'); i++; }
      out.push('<ul>' + items.join('') + '</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {                                      // ordered list
      flush(); const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push('<li>' + AO.Markdown._inline(AO.Markdown._esc(lines[i].replace(/^\s*\d+\.\s+/, ''))) + '</li>'); i++; }
      out.push('<ol>' + items.join('') + '</ol>'); continue;
    }
    if (/^\s*>\s?/.test(line)) {                                          // blockquote
      flush(); const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(AO.Markdown._esc(lines[i].replace(/^\s*>\s?/, ''))); i++; }
      out.push('<blockquote><p>' + AO.Markdown._inline(buf.join('<br>')) + '</p></blockquote>'); continue;
    }
    para.push(AO.Markdown._esc(line)); i++;                               // paragraph
  }
  flush();

  let html = out.join('\n');
  // Reinsert rendered math (display blocks should sit outside <p>; KaTeX display
  // is an inline-block span, so leaving it inline is acceptable for this surface).
  html = html.replace(/\u0000(\d+)\u0000/g, function (m, n) { return maths[+n]; });
  return html;
};
