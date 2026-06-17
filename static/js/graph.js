/**
 * PRS Knowledge Graph
 * Canvas-based force-directed graph visualization.
 */
const PRS_Graph = (function () {
  let canvas, ctx;
  let nodes = [];
  let links = [];
  let animId = null;

  function init() {
    canvas = document.getElementById("graphCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
  }

  async function draw() {
    if (!canvas) init();
    if (!canvas) return;

    const data = await PRS_API.getGraph();
    const w = canvas.width;
    const h = canvas.height;

    nodes = (data.nodes || []).map((n) => ({
      id: n.id,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      r: 8,
    }));

    links = (data.links || []).filter(
      (l) => nodes.find((n) => n.id === l.source) && nodes.find((n) => n.id === l.target)
    );

    if (animId) cancelAnimationFrame(animId);
    animate();
  }

  function animate() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#1a1d2e";
    ctx.fillRect(0, 0, w, h);

    // --- Physics ---
    nodes.forEach((n) => {
      // center gravity
      n.vx += (w / 2 - n.x) * 0.0002;
      n.vy += (h / 2 - n.y) * 0.0002;

      // repulsion
      nodes.forEach((other) => {
        if (n === other) return;
        const dx = n.x - other.x;
        const dy = n.y - other.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 10000) {
          const dist = Math.sqrt(dist2) || 1;
          const force = 200 / dist2;
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        }
      });
    });

    // spring attraction along links
    links.forEach((link) => {
      const s = nodes.find((n) => n.id === link.source);
      const t = nodes.find((n) => n.id === link.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 120) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // apply velocity + friction + bounds
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.85;
      n.vy *= 0.85;
      // keep inside canvas
      n.x = Math.max(n.r + 5, Math.min(w - n.r - 5, n.x));
      n.y = Math.max(n.r + 5, Math.min(h - n.r - 5, n.y));
    });

    // --- Draw links ---
    ctx.strokeStyle = "#3b4056";
    ctx.lineWidth = 1;
    links.forEach((link) => {
      const s = nodes.find((n) => n.id === link.source);
      const t = nodes.find((n) => n.id === link.target);
      if (!s || !t) return;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();

      // label
      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2;
      ctx.fillStyle = "#8b8fa3";
      ctx.font = "9px sans-serif";
      ctx.fillText(link.type, mx, my);
    });

    // --- Draw nodes ---
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "#4ca6ff";
      ctx.fill();
      ctx.strokeStyle = "#1a1d2e";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#e4e6eb";
      ctx.font = "10px monospace";
      ctx.fillText(n.id.replace("REC-", ""), n.x + 12, n.y + 4);
    });

    // node count
    ctx.fillStyle = "#8b8fa3";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${nodes.length} nodes · ${links.length} edges`, 12, h - 12);

    animId = requestAnimationFrame(animate);
  }

  function stop() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  return { init, draw, stop };
})();