/* ════════════════════════════════════════════════════════════
   AI Icons — thin adapter over the shared registry (/ui/js/icons.js).
   The registry holds the merged Lucide set; this file only binds the
   AI namespace and its <ai-icon> element.
   ════════════════════════════════════════════════════════════ */
window.AI = window.AI || {};

AI.icon = function (name, size) { return AUTOREGIA.icon(name, size, 'ai-icon'); };
AI._icons = AUTOREGIA.ICONS;
AUTOREGIA.defineIconElement('ai-icon', 'ai-icon');
