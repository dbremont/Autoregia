/* ════════════════════════════════════════════════════════════
    SOPCS Icons — thin adapter over the shared registry (/ui/js/icons.js).
    The registry holds the merged Lucide set; this file only binds the
    SOPCS namespace and its <sopcs-icon> element.
    ════════════════════════════════════════════════════════════ */
window.SOPCS = window.SOPCS || {};

SOPCS.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'sopcs-icon'); };
SOPCS._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('sopcs-icon', 'sopcs-icon');
