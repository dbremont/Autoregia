/* ════════════════════════════════════════════════════════════
   LOOP Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   LOOP namespace and its <loop-icon> element.
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};

LOOP.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'loop-icon'); };
LOOP._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('loop-icon', 'loop-icon');
