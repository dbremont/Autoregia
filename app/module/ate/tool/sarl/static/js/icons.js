/* ════════════════════════════════════════════════════════════
    SARL Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   SARL namespace and its <sarl-icon> element.
   ════════════════════════════════════════════════════════════ */
window.SARL = window.SARL || {};

SARL.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'sarl-icon'); };
SARL._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('sarl-icon', 'sarl-icon');
