/* ════════════════════════════════════════════════════════════
   PEOS Vader — coarse tone scorer (port of the lexicon + a few rules).
   Quality is intentionally modest: directional tint only (~65-75% on
   clean English titles), used as a reading aid, not ground truth.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Vader = (() => {
  let LEX = {};
  const NEG = new Set(['not','no','never','without',"isn't","wasn't","don't","doesn't","didn't","can't","won't","cannot"]);
  const BOOST = new Set(['very','really','extremely','so','too','incredibly','absolutely','totally']);

  function setLexicon(o){ LEX = o || {}; }
  function score(text){
    if(!text) return 0;
    const toks = ((text||'').toLowerCase().match(/[^\W_]+/g)) || [];
    if(!toks.length) return 0;
    let total = 0;
    for(let i=0;i<toks.length;i++){
      const w = LEX[toks[i]];
      if(w==null) continue;
      let v = w;
      if(i>0 && NEG.has(toks[i-1])) v = -v*0.7;
      else if(i>0 && BOOST.has(toks[i-1])) v = v*1.4;
      total += v;
    }
    const norm = total/Math.sqrt(toks.length);
    return Math.max(-1, Math.min(1, norm/3));
  }
  return { setLexicon, score };
})();
