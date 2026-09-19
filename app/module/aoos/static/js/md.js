/* ════════════════════════════════════════════════════════════
   AOOS Markdown — thin alias over the shared renderer
   (AUTOREGIA.Markdown in /ui/js/md.js). Pages that forgot to
   load the layer first are healed synchronously (parser-inserted
   scripts block, so the implementation is present right after).
   Rendering contract is unchanged for Scratchpad + share page.
   ════════════════════════════════════════════════════════════ */
window.AO = window.AO || {};

if (!(window.AUTOREGIA && window.AUTOREGIA.Markdown)) {
  document.write('<script src="/ui/js/md.js?v=20260919"><\/script>');
}
AO.Markdown = window.AUTOREGIA.Markdown;
