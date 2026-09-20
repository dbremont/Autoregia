/* ════════════════════════════════════════════════════════════
   MAD Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   MAD namespace and its <mad-icon> element.
   ════════════════════════════════════════════════════════════ */
window.MAD = window.MAD || {};

MAD.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'mad-icon'); };
MAD._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('mad-icon', 'mad-icon');
