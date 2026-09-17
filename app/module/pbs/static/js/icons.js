/* ════════════════════════════════════════════════════════════
   PBS Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   PBS namespace and its <pbs-icon> element.
   ════════════════════════════════════════════════════════════ */
window.PBS = window.PBS || {};

PBS.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'pbs-icon'); };
PBS._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('pbs-icon', 'pbs-icon');
