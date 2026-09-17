/* ════════════════════════════════════════════════════════════
   WOS Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   WOS namespace and its <wos-icon> element.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};

WOS.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'wos-icon'); };
WOS._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('wos-icon', 'wos-icon');
