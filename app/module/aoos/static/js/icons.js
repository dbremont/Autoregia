/* ════════════════════════════════════════════════════════════
   AO Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   AO namespace and its <ao-icon> element.
   ════════════════════════════════════════════════════════════ */
window.AO = window.AO || {};

AO.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'ao-icon'); };
AO._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('ao-icon', 'ao-icon');
