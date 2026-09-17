/* ════════════════════════════════════════════════════════════
   ACSMS Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   ACSMS namespace and its <acsms-icon> element.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};

ACSMS.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'acsms-icon'); };
ACSMS._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('acsms-icon', 'acsms-icon');
