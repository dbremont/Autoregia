/* ════════════════════════════════════════════════════════════
   PTOCS Charts — ECharts wrappers within the design system.
   Palettes reference the warm-parchment Oxford tokens.
   ════════════════════════════════════════════════════════════ */
PT.Charts = {
  // Shared chart palette drawn from the design tokens.
  PALETTE: ['#7A1A2A', '#B4742A', '#3F6092', '#2D6A4F', '#6B5B95', '#A8854A', '#3F6E50', '#8C6E54', '#9A9589', '#5C4E78'],
  TEXT: '#5B574E', GRID: '#E2DED4',

  base(extra) {
    return Object.assign({
      color: this.PALETTE,
      textStyle: { fontFamily: "Inter, sans-serif", color: this.TEXT, fontSize: 11 },
      tooltip: { trigger: 'item', textStyle: { fontSize: 12, fontFamily: "Inter, sans-serif" } },
      legend: { textStyle: { color: this.TEXT, fontSize: 11 }, type: 'scroll' },
    }, extra || {});
  },

  hbar(elId, data, opts) {
    const el = document.getElementById(elId); if (!el) return;
    const entries = Object.entries(data).sort(function (a,b) { return b[1]-a[1]; });
    const chart = echarts.init(el);
    chart.setOption(this.base({
      grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: this.GRID } }, axisLabel: { color: this.TEXT } },
      yAxis: { type: 'category', data: entries.map(function (e) { return e[0]; }).reverse(),
        axisLabel: { color: this.TEXT, formatter: function (v) { return v.replace(/_/g, ' '); } },
        axisLine: { lineStyle: { color: this.GRID } } },
      series: [{ type: 'bar', data: entries.map(function (e) { return e[1]; }).reverse(),
        barMaxWidth: 18, itemStyle: { color: '#7A1A2A', borderRadius: [0,3,3,0] } }],
    }));
    return chart;
  },

  donut(elId, data, opts) {
    const el = document.getElementById(elId); if (!el) return;
    const entries = Object.entries(data).filter(function (e) { return e[1] > 0; });
    const chart = echarts.init(el);
    chart.setOption(this.base({
      legend: { bottom: 0, textStyle: { color: this.TEXT, fontSize: 10 }, type: 'scroll' },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
        avoidLabelOverlap: true, itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, color: this.TEXT, fontSize: 10, formatter: '{b}\n{c}' },
        data: entries.map(function (e) { return { name: e[0].replace(/_/g,' '), value: e[1] }; }) }],
    }));
    return chart;
  },

  // dispose all charts registered in a container (called on view switch)
  disposeIn(container) {
    if (!window.echarts) return;
    container.querySelectorAll('[_echarts_instance_]').forEach(function (el) {
      echarts.dispose(el);
    });
  },
};
