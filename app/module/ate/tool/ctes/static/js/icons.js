/* ════════════════════════════════════════════════════════════
   CTES Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   CTES namespace and its <ctes-icon> element.
   ════════════════════════════════════════════════════════════ */
window.CTES = window.CTES || {};

CTES.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'ctes-icon'); };
CTES._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('ctes-icon', 'ctes-icon');
