/* ════════════════════════════════════════════════════════════
   PKTS Charts — Apache ECharts wrapper
   Token-themed so visualizations read as part of the parchment
   design system (per ui.spec §11.1 exception). Palette derived
   from §3 tokens, typography from §4.
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Charts = (() => {
  const PALETTE = ['#7A1A2A','#A8854A','#3F6E50','#3F6092','#B4742A','#5C4E78','#2D6A4F','#A33434'];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function base(extra={}) {
    return Object.assign({
      textStyle: { fontFamily: 'Inter, sans-serif', color: css('--ink-1')||'#2C2A26' },
      color: PALETTE,
      grid: { left: 48, right: 18, top: 24, bottom: 36, containLabel: true },
      tooltip: {
        backgroundColor: css('--ink-0')||'#1E1C19', borderColor: 'transparent',
        textStyle: { color: '#FAF1E6', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 },
        padding: [6,10], extraCssText: 'border-radius:5px; box-shadow:0 6px 18px rgba(30,28,25,.25);'
      },
      legend: { textStyle: { color: css('--ink-3')||'#5B574E', fontSize: 11 }, icon: 'roundRect', itemWidth: 12, itemHeight: 8, top: 0 },
      xAxis: { axisLine: { lineStyle: { color: css('--ink-7')||'#C9C4B8' } },
        axisTick: { show:false }, axisLabel: { color: css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize: 10 },
        splitLine: { show:false } },
      yAxis: { axisLine: { show:false }, axisTick:{show:false},
        axisLabel: { color: css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize: 10 },
        splitLine: { lineStyle: { color: css('--ink-9')||'#EEEAE0', type:'dashed' } } },
    }, extra);
  }
  const instances = {};
  function get(id){ if(instances[id]) instances[id].dispose(); const el=document.getElementById(id); if(!el) return null;
    const ch = echarts.init(el, null, {renderer:'canvas'}); instances[id]=ch; return ch; }

  function line(id, series, opts={}) {
    const ch=get(id); if(!ch) return;
    const xData = series[0].data.map(p=>p.x);
    ch.setOption(base({
      legend: { data: series.map(s=>s.name), top:0 },
      xAxis: Object.assign({ type:'category', data:xData, boundaryGap:false }),
      yAxis: [ { type:'value', name: opts.yName1||'' },
        opts.dual ? { type:'value', name: opts.yName2||'', position:'right',
          axisLabel:{color:css('--oxford')||'#7A1A2A', fontFamily:'IBM Plex Mono', fontSize:10},
          splitLine:{show:false} } : undefined ].filter(Boolean),
      series: series.map((s,i)=>({ name:s.name, type:'line', smooth:true, symbol:'none', yAxisIndex: s.right?1:0,
        lineStyle:{ width: s.right?2:2.5, color: s.color||PALETTE[i] }, itemStyle:{ color: s.color||PALETTE[i] },
        areaStyle: s.area? { color:(s.color||PALETTE[i]), opacity:0.10 } : undefined,
        data: s.data.map(p=>p.y) })),
    }));
  }

  function bar(id, cats, vals, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ grid:{ left:48,right:18,top:16,bottom:36,containLabel:true },
      xAxis:{ type:'category', data:cats }, yAxis:{ type:'value' },
      series:[{ type:'bar', data:vals, barWidth: opts.barWidth||'55%',
        itemStyle:{ color: opts.color||PALETTE[0], borderRadius:[3,3,0,0] } }] }));
  }

  function hbar(id, rows, opts={}) {
    const ch=get(id); if(!ch) return;
    const max=Math.max(...rows.map(r=>r.value),1);
    ch.setOption(base({ grid:{ left:90, right:30, top:8, bottom:24, containLabel:false },
      xAxis:{ type:'value', max: max*1.1, show:false },
      yAxis:{ type:'category', data:rows.map(r=>r.label),
        axisLabel:{ color:css('--ink-3')||'#5B574E', fontFamily:'IBM Plex Mono', fontSize:11 } },
      series:[{ type:'bar', data:rows.map((r,i)=>({value:r.value, itemStyle:{color:r.color||PALETTE[i%8], borderRadius:[0,3,3,0]}})),
        label:{ show:true, position:'right', formatter:(p)=>p.value, color:css('--ink-4')||'#6B665B', fontFamily:'IBM Plex Mono', fontSize:10 },
        barWidth:'60%' }], tooltip:{ trigger:'item' } }));
  }

  function donut(id, data, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ legend:{ show:false }, tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' },
      series:[{ type:'pie', radius:[opts.inner||'46%','70%'], center:['50%','52%'], avoidLabelOverlap:true, padAngle:2,
        itemStyle:{ borderRadius:4, borderColor:css('--color-surface')||'#fff', borderWidth:2 },
        label:{ color:css('--ink-3')||'#5B574E', fontFamily:'IBM Plex Mono', fontSize:10 },
        labelLine:{ lineStyle:{ color:css('--ink-7')||'#C9C4B8' } },
        data: data.map((d,i)=>({name:d.name, value:d.value, itemStyle:{color:d.color||PALETTE[i%8]}})) }] }));
  }

  function gauge(id, value, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ series:[{ type:'gauge', radius:'92%', center:['50%','58%'],
      startAngle:200, endAngle:-20, min:opts.min||0, max:opts.max||100,
      progress:{ show:true, width:12, itemStyle:{ color: opts.color||css('--oxford')||'#7A1A2A' } },
      axisLine:{ lineStyle:{ width:12, color:[[1, css('--ink-9')||'#EEEAE0']] } },
      pointer:{ show:false }, axisTick:{ show:false }, splitLine:{ show:false }, axisLabel:{ show:false },
      detail:{ valueAnimation:true, formatter:(v)=>opts.fmt?opts.fmt(v):Math.round(v),
        color:css('--ink-0')||'#1E1C19', fontFamily:'Spectral, serif', fontSize:26, offsetCenter:[0,'8%'] },
      title:{ show:!!opts.title, offsetCenter:[0,'42%'], color:css('--ink-5')||'#8C877B', fontSize:10 },
      data:[{ value, name: opts.title||'' }] }] }));
  }

  function heatmap(id, xCats, yCats, data, opts={}) {
    const ch=get(id); if(!ch) return;
    const vals=data.map(d=>d[2]); const min=Math.min(...vals), max=Math.max(...vals);
    ch.setOption(base({ grid:{ left:60,right:80,top:16,bottom:48,containLabel:true },
      tooltip:{ position:'top', formatter:(p)=>`${xCats[p.value[0]]} → ${yCats[p.value[1]]}<br/>${opts.fmt?p.value[2].toFixed(3):p.value[2]}` },
      xAxis:{ type:'category', data:xCats, splitArea:{show:false},
        axisLabel:{ color:css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize:10 } },
      yAxis:{ type:'category', data:yCats, splitArea:{show:false},
        axisLabel:{ color:css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize:10 } },
      visualMap:{ min, max, calculable:true, orient:'vertical', right:8, top:'center', itemHeight:120, precision: opts.precision||0,
        inRange:{ color:[ css('--gold-tint')||'#F6EFE1', css('--gold')||'#A8854A', css('--oxford')||'#7A1A2A' ] },
        textStyle:{ color:css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize:10 } },
      series:[{ type:'heatmap', data, label:{ show:!!opts.label, fontSize:9, fontFamily:'IBM Plex Mono', color:css('--ink-1')||'#2C2A26' },
        emphasis:{ itemStyle:{ shadowBlur:6, shadowColor:'rgba(0,0,0,.2)' } } }] }));
  }

  function scatter(id, data, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ tooltip:{ trigger:'item' }, xAxis:{ type:'value', name:opts.xName||'', scale:true },
      yAxis:{ type:'value', name:opts.yName||'', scale:true },
      series:[{ type:'scatter', data, symbolSize: opts.size||7,
        itemStyle:{ color: opts.color||css('--oxford')||'#7A1A2A', opacity:0.7 } }] }));
  }

  const resize = () => Object.values(instances).forEach(ch=>{ try{ch.resize();}catch{} });
  window.addEventListener('resize', resize);
  return { line, bar, hbar, donut, gauge, heatmap, scatter, resize, instances };
})();
