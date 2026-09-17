/* ════════════════════════════════════════════════════════════
   PT Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   PT namespace and its <pt-icon> element.
   ════════════════════════════════════════════════════════════ */
window.PT = window.PT || {};

PT.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'pt-icon'); };
PT._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('pt-icon', 'pt-icon');
