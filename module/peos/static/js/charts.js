/* ════════════════════════════════════════════════════════════
   PEOS Charts — Apache ECharts wrapper
   Token-themed so visualizations read as part of the parchment
   design system (per ui.spec §11.1). Palette derived from the §3
   tokens, typography from §4. Extended beyond LOOP.Charts with the
   analytical chart types this dashboard needs: stacked area, stream
   graph (themeRiver), sankey, force graph, treemap, word cloud.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Charts = (() => {
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

  // on-click bus: every chart wires PEOS.Charts.onClick where relevant
  const clickHandlers = {};
  function onClick(kind, fn){ clickHandlers[kind] = fn; }

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

  // stacked area — the volume-over-time backbone
  function stackedArea(id, buckets, series, opts={}) {
    const ch=get(id); if(!ch) return;
    const opt = base({
      legend: { data: series.map(s=>s.name), top:0, type:'scroll' },
      grid: { left: 44, right: 18, top: 30, bottom: 56, containLabel: true },
      xAxis: Object.assign({ type:'category', data:buckets, boundaryGap:false }),
      yAxis: { type:'value', name: opts.yName||'items' },
      dataZoom: [
        { type:'inside', start: opts.zoomStart||0, end: opts.zoomEnd||100 },
        { type:'slider', height: 16, bottom: 18, borderColor: css('--ink-8')||'#E2DED4',
          fillerColor: (css('--gold-tint')||'#F6EFE1')+'', handleStyle:{ color: css('--gold')||'#A8854A' } },
      ],
      series: series.map((s,i)=>({ name:s.name, type:'line', stack:'vol', smooth:true, symbol:'none',
        areaStyle:{ color: s.color||PALETTE[i%PALETTE.length], opacity:0.32 },
        lineStyle:{ width:1, color: s.color||PALETTE[i%PALETTE.length] },
        emphasis:{ focus:'series' }, data: s.data })),
      tooltip: { trigger:'axis', axisPointer:{ type:'cross', lineStyle:{ color: css('--gold')||'#A8854A' } } },
    });
    ch.setOption(opt);
  }

  // stream graph — themeRiver. rows: [ [date, value, name], ... ]
  function streamGraph(id, rows, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({
      tooltip: { trigger:'item', enterable:false, formatter:(p)=> {
        const d=p.data; return `${d[2]} · ${d[0]}<br/><b>${d[1]}</b>`; } },
      legend: { data: opts.names||[], top:0, type:'scroll' },
      singleAxis: { type:'time', axisTick:{show:false}, axisLine:{ lineStyle:{ color: css('--ink-7')||'#C9C4B8' } },
        axisLabel:{ color: css('--ink-5')||'#8C877B', fontFamily:'IBM Plex Mono', fontSize:10 },
        splitLine:{ show:true, lineStyle:{ color: css('--ink-9')||'#EEEAE0', type:'dashed' } } },
      series: [{ type:'themeRiver', emphasis:{ itemStyle:{ shadowBlur:6, shadowColor:'rgba(0,0,0,.15)' } },
        label:{ show:false }, data: rows }],
      color: PALETTE,
    }));
  }

  // sankey — links: [{source, target, value}]; nodes auto-derived
  function sankey(id, nodes, links, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({
      tooltip: { trigger:'item', formatter:(p)=> p.dataType==='edge'
        ? `${p.data.source} → ${p.data.target}: <b>${p.data.value}</b>` : `${p.data.name}` },
      series: [{ type:'sankey', layout:'none', emphasis:{ focus:'adjacency' },
        left: 12, right: 90, top: 12, bottom: 12, nodeWidth: 14, nodeGap: 6,
        label: { color: css('--ink-2')||'#44413B', fontFamily:'IBM Plex Mono', fontSize:10 },
        lineStyle: { color:'gradient', opacity:0.35, curveness:0.5 },
        itemStyle: { borderWidth:0 },
        data: nodes, links,
        color: PALETTE }],
    }));
    ch.on('click', (p)=>{ if(p.dataType==='node' && clickHandlers.sankey) clickHandlers.sankey(p.data.name, p.data.category); });
  }

  // force graph — nodes [{id,name,value}], links [{source,target,value}]
  function graph(id, nodes, links, opts={}) {
    const ch=get(id); if(!ch) return;
    const maxV = Math.max(...nodes.map(n=>n.value||1),1);
    ch.setOption(base({
      tooltip:{ formatter:(p)=> p.dataType==='node'
        ? `${p.data.name} (${p.data.value||0})` : `${p.data.source} — ${p.data.target}` },
      series:[{ type:'graph', layout:'force', roam:true, draggable:true,
        force:{ repulsion: opts.repulsion||120, edgeLength:[28,90], gravity:0.08, layoutAnimation:true },
        label:{ show:true, color: css('--ink-2')||'#44413B', fontFamily:'Inter', fontSize:10, position:'right' },
        edgeSymbol:['none','none'], edgeLabel:{show:false},
        lineStyle:{ color: css('--ink-8')||'#E2DED4', opacity:0.6, curveness:0.12, width:1 },
        emphasis:{ focus:'adjacency', lineStyle:{ color: css('--gold')||'#A8854A', width:2 } },
        data: nodes.map((n,i)=>({ id:n.id, name:n.name, value:n.value,
          symbolSize: 12 + 26*( (n.value||0)/maxV ),
          itemStyle:{ color: n.color||PALETTE[i%PALETTE.length] } })),
        links: links.map(l=>({ source:l.source, target:l.target, value:l.value,
          lineStyle:{ width: 0.5 + 3*(l.value/Math.max(...links.map(x=>x.value||1),1)) } })),
      }],
    }));
    ch.on('click', (p)=>{ if(p.dataType==='node' && clickHandlers.graph) clickHandlers.graph(p.data.name); });
  }

  // treemap — rect area = frequency; no extension needed
  function treemap(id, items, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({
      tooltip:{ formatter:(p)=> `${p.name}: <b>${p.value}</b>` },
      series:[{ type:'treemap', roam:false, nodeClick:false,
        breadcrumb:{ show:false }, left:6, right:6, top:6, bottom:6,
        label:{ show:true, color:'#FAF1E6', fontFamily:'Inter', fontSize:11, formatter:(p)=> p.value>2?p.name:'' },
        upperLabel:{ show:false },
        itemStyle:{ borderColor: css('--color-surface')||'#fff', borderWidth:2, gapWidth:2 },
        levels:[ { itemStyle:{ borderColor: css('--color-surface-2')||'#F4F1EA', borderWidth:2, gapWidth:2 } } ],
        data: items.map((it,i)=>({ name:it.name, value:it.value,
          itemStyle:{ color: it.color || PALETTE[i%PALETTE.length] } })),
      }],
    }));
    ch.on('click', (p)=>{ if(clickHandlers.treemap) clickHandlers.treemap(p.name); });
  }

  // word cloud — requires echarts-wordcloud.min.js loaded after echarts
  function wordCloud(id, items, opts={}) {
    const ch=get(id); if(!ch) return;
    const maxV = Math.max(...items.map(i=>i.value),1);
    ch.setOption(base({
      tooltip:{ formatter:(p)=> `${p.name}: <b>${p.value}</b>` },
      series:[{ type:'wordCloud', shape:'circle', width:'96%', height:'96%',
        sizeRange: opts.sizeRange||[12,52], rotationRange:[-30,30], rotationStep:15,
        gridSize: 6, drawOutOfBound:false, layoutAnimation:true,
        textStyle:{ fontFamily:'Spectral, serif', fontWeight:500,
          color:()=> PALETTE[Math.floor(Math.random()*PALETTE.length)] },
        emphasis:{ focus:'self', textStyle:{ textShadowBlur:6, textShadowColor:'rgba(122,26,42,.3)' } },
        data: items.map(it=>({ name:it.name, value:it.value })),
      }],
    }));
    ch.on('click', (p)=>{ if(clickHandlers.wordCloud) clickHandlers.wordCloud(p.name); });
  }

  function bar(id, cats, vals, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ grid:{ left:48,right:18,top:16,bottom:36,containLabel:true },
      xAxis:{ type:'category', data:cats }, yAxis:{ type:'value' },
      series:[{ type:'bar', data:vals, barWidth: opts.barWidth||'55%',
        itemStyle:{ color: opts.color||PALETTE[0], borderRadius:[3,3,0,0] } }] }));
  }
  function stackedBar(id, cats, series, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({
      legend: { data: series.map(s=>s.name), top:0 },
      grid:{ left:48, right:18, top:28, bottom:36, containLabel:true },
      xAxis:{ type:'category', data:cats }, yAxis:{ type:'value' },
      series: series.map((s,i)=>({ name:s.name, type:'bar', stack: opts.stack||'total',
        data:s.data, barWidth: opts.barWidth||'60%',
        itemStyle:{ color: s.color||PALETTE[i%PALETTE.length], borderRadius:[2,2,0,0] } })),
      tooltip: { trigger:'axis', axisPointer:{type:'shadow'} },
    }));
  }
  function hbar(id, rows, opts={}) {
    const ch=get(id); if(!ch) return;
    const max=Math.max(...rows.map(r=>r.value),1);
    ch.setOption(base({ grid:{ left:90, right:40, top:8, bottom:24, containLabel:false },
      xAxis:{ type:'value', max: max*1.1, show:false },
      yAxis:{ type:'category', data:rows.map(r=>r.label),
        axisLabel:{ color:css('--ink-3')||'#5B574E', fontFamily:'IBM Plex Mono', fontSize:11 } },
      series:[{ type:'bar', data:rows.map((r,i)=>({value:r.value, itemStyle:{color:r.color||PALETTE[i%8], borderRadius:[0,3,3,0]}})),
        label:{ show:true, position:'right', formatter:(p)=>p.value, color:css('--ink-4')||'#6B665B', fontFamily:'IBM Plex Mono', fontSize:10 },
        barWidth:'60%' }], tooltip:{ trigger:'item' } }));
    ch.on('click', (p)=>{ if(clickHandlers.hbar) clickHandlers.hbar(p.name||p.value, p.seriesName); });
  }
  function donut(id, data, opts={}) {
    const ch=get(id); if(!ch) return;
    ch.setOption(base({ legend:{ show:false }, tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' },
      series:[{ type:'pie', radius:[opts.inner||'46%','70%'], center:['50%','52%'], avoidLabelOverlap:true, padAngle:2,
        itemStyle:{ borderRadius:4, borderColor:css('--color-surface')||'#fff', borderWidth:2 },
        label:{ color:css('--ink-3')||'#5B574E', fontFamily:'IBM Plex Mono', fontSize:10 },
        labelLine:{ lineStyle:{ color:css('--ink-7')||'#C9C4B8' } },
        data: data.map((d,i)=>({name:d.name, value:d.value, itemStyle:{color:d.color||PALETTE[i%8]}})) }] }));
    ch.on('click', (p)=>{ if(clickHandlers.donut) clickHandlers.donut(p.name); });
  }
  function gauge(id, value, opts={}) {
    const ch=get(id); if(!ch) return;
    const v = opts.abs ? Math.abs(value) : value;
    ch.setOption(base({ series:[{ type:'gauge', radius:'92%', center:['50%','58%'],
      startAngle:200, endAngle:-20, min:opts.min||0, max:opts.max||100,
      progress:{ show:true, width:12, itemStyle:{ color: opts.color||css('--oxford')||'#7A1A2A' } },
      axisLine:{ lineStyle:{ width:12, color:[[1, css('--ink-9')||'#EEEAE0']] } },
      pointer:{ show:false }, axisTick:{ show:false }, splitLine:{ show:false }, axisLabel:{ show:false },
      detail:{ valueAnimation:true, formatter:(x)=>opts.fmt?opts.fmt(x):Math.round(x),
        color:css('--ink-0')||'#1E1C19', fontFamily:'Spectral, serif', fontSize:26, offsetCenter:[0,'8%'] },
      title:{ show:!!opts.title, offsetCenter:[0,'42%'], color:css('--ink-5')||'#8C877B', fontSize:10 },
      data:[{ value: v, name: opts.title||'' }] }] }));
  }

  const resize = () => Object.values(instances).forEach(ch=>{ try{ch.resize();}catch{} });
  window.addEventListener('resize', resize);
  return { line, bar, stackedBar, stackedArea, streamGraph, sankey, graph, treemap, wordCloud,
           hbar, donut, gauge, resize, onClick, instances };
})();
