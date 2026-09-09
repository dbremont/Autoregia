/* ════════════════════════════════════════════════════════════
   PRS Scratchpad — Quick Capture (Ctrl+Shift+N)
   ════════════════════════════════════════════════════════════ */
PRS.scratchpad = {
  open() {
    document.getElementById('scratchpadOverlay').classList.remove('hidden');
    const ta = document.getElementById('scratchpadText');
    ta.value = '';
    setTimeout(()=>ta.focus(),100);
  },
  close() { document.getElementById('scratchpadOverlay').classList.add('hidden'); },
  async save() {
    const text = document.getElementById('scratchpadText').value.trim();
    if (!text) return;
    // Auto-detect type from content
    let type = 'Idea';
    if (/^TODO|^TASK/i.test(text)) type = 'Task';
    else if (/^DECISION?|^DECIDED/i.test(text)) type = 'Decision';
    else if (/^GOAL|^OBJECTIVE/i.test(text)) type = 'Goal';
    else if (/^OBSERV|NOTICED?|^SAW /i.test(text)) type = 'Observation';
    else if (/^\?|^QUESTION/i.test(text)) type = 'Question';
    
    await PRS.Store.add({
      content: text.split('\n')[0].replace(/^(TODO|TASK|DECISION?|DECIDED|GOAL|OBJECTIVE|OBSERV|NOTICED?|SAW |\?)\s*/i,''),
      detail: text.split('\n').slice(1).join('\n').trim(),
      record_type: type,
      status: 'Draft',
      priority: 'Medium',
      domain: 'General',
      tags: ['quick-capture']
    });
    this.close();
    PRS.navigate(PRS.currentView);
  }
};