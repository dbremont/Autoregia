/* ════════════════════════════════════════════════════════════
   PKTS Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   PKTS namespace and its <pkts-icon> element.
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};

PKTS.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'pkts-icon'); };
PKTS._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('pkts-icon', 'pkts-icon');
