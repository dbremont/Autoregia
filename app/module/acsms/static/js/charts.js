/* ════════════════════════════════════════════════════════════
   ACSMS Charts — hand-rolled SVG helpers (no chart dependency).
   line(): multi-series percentage line chart with null-safe
   segmenting (a null value breaks the line, not the chart).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Charts = {
  line({ labels = [], series = [], height = 210 }) {
    const W = 560, H = height;
    const pad = { l: 36, r: 12, t: 12, b: 24 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = Math.max(...series.map(s => s.values.length), 1);
    const x = (i) => pad.l + (n === 1 ? iw / 2 : i * iw / (n - 1));
    const y = (v) => pad.t + ih * (1 - v / 100);

    let svg = '';
    [0, 25, 50, 75, 100].forEach(g => {
      svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(g)}" y2="${y(g)}" style="stroke:var(--color-border-light)" stroke-width="1"></line>`;
      svg += `<text x="${pad.l - 6}" y="${y(g) + 3}" text-anchor="end" style="fill:var(--color-text-muted);font-size:9px;font-family:var(--font-mono)">${g}%</text>`;
    });
    const step = Math.max(1, Math.ceil(n / 6));
    labels.forEach((l, i) => {
      if (i % step === 0 || i === n - 1)
        svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" style="fill:var(--color-text-muted);font-size:9px;font-family:var(--font-mono)">${l}</text>`;
    });
    series.forEach(s => {
      // contiguous runs of non-null values → separate polylines
      let run = [];
      const flush = () => {
        if (run.length > 1) svg += `<polyline fill="none" style="stroke:${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${run.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')}"></polyline>`;
        run = [];
      };
      s.values.forEach((v, i) => { if (v == null) flush(); else run.push([i, v]); });
      flush();
      s.values.forEach((v, i) => {
        if (v != null) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="2.4" style="fill:${s.color}"><title>${s.name} · ${v}%</title></circle>`;
      });
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="line-chart" role="img" aria-label="${series.map(s => s.name).join(', ')} trajectory">${svg}</svg>`;
  },
};
