/* ════════════════════════════════════════════════════════════
    GCAL Icons — thin adapter over the shared registry (/ui/js/icons.js).
   ════════════════════════════════════════════════════════════ */
window.GCAL = window.GCAL || {};

GCAL.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'gcal-icon'); };
GCAL._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('gcal-icon', 'gcal-icon');
