/* ============================================================
   AIAS Icons — Self-hosted Lucide icon set (ISC license)
   Curated monoline icons, 1.6px stroke, 24px grid.
   Use:  AI.icon("target")            -> full <svg> markup
         <ai-icon name="target"></ai-icon>
   ============================================================ */
;(function (AI) {
  AI._icons = {
    "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
    "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
    "compass": "<path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>",
    "search": "<path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/>",
    "plus": "<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>",
    "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
    "inbox": "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>",
    "list": "<path d=\"M8 5h13\"/><path d=\"M8 12h13\"/><path d=\"M8 19h13\"/><path d=\"M3 5h.01\"/><path d=\"M3 12h.01\"/><path d=\"M3 19h.01\"/>",
    "gauge": "<path d=\"m12 14 4-4\"/><path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/>",
    "layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0l8.58-3.91a1 1 0 0 0 0-1.83z\"/><path d=\"m22 5.3-9.17 4.16a2 2 0 0 1-1.66 0L2 5.3\"/><path d=\"m22 10.3-9.17 4.16a2 2 0 0 1-1.66 0L2 10.3\"/>",
    "activity": "<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"/>",
    "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/><path d=\"M13 21h8\"/>",
    "trash-2": "<path d=\"M3 6h18\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\"/><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\"/>",
    "calendar": "<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>",
    "clock": "<path d=\"M12 6v6l4 2\"/><circle cx=\"12\" cy=\"12\" r=\"10\"/>",
    "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>",
    "sparkles": "<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594L2.814 12.98a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\"/>",
    "check": "<path d=\"M20 6 9 17l-5-5\"/>",
    "pause": "<rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/>",
    "play": "<polygon points=\"6 3 20 12 6 21 6 3\"/>",
    "archive": "<path d=\"M3 5h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z\"/><path d=\"M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9\"/><path d=\"M10 14h4\"/>",
    "message-square": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>",
    "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>",
    "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"M7 10l5 5 5-5\"/><path d=\"M12 15V3\"/>",
    "lightbulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>",
    "alert-triangle": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
    "git-branch": "<line x1=\"6\" x2=\"6\" y1=\"3\" y2=\"15\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M18 9a9 9 0 0 1-9 9\"/>",
    "bookmark": "<path d=\"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z\"/>",
    "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
    "sliders": "<line x1=\"4\" x2=\"4\" y1=\"21\" y2=\"14\"/><line x1=\"4\" x2=\"4\" y1=\"10\" y2=\"3\"/><line x1=\"12\" x2=\"12\" y1=\"21\" y2=\"12\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"3\"/><line x1=\"20\" x2=\"20\" y1=\"21\" y2=\"16\"/><line x1=\"20\" x2=\"20\" y1=\"12\" y2=\"3\"/><line x1=\"2\" x2=\"6\" y1=\"14\" y2=\"14\"/><line x1=\"10\" x2=\"14\" y1=\"8\" y2=\"8\"/><line x1=\"18\" x2=\"22\" y1=\"16\" y2=\"16\"/>",
    "command": "<path d=\"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3\"/>"
  };
  AI.icon = function (name, size) {
    var inner = AI._icons[name] || AI._icons["circle-dot"] || "<circle cx=\"12\" cy=\"12\" r=\"10\"/>";
    var s = size || 18;
    return "<svg class=\"ai-icon\" width=\"" + s + "\" height=\"" + s + "\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + inner + "</svg>";
  };
  if (!customElements.get("ai-icon")) {
    customElements.define("ai-icon", class extends HTMLElement {
      connectedCallback() {
        var name = this.getAttribute("name") || "target";
        var size = parseInt(this.getAttribute("size") || "18", 10);
        this.innerHTML = AI.icon(name, size);
      }
    });
  }
})(window.AI = window.AI || {});
