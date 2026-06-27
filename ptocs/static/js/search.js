/* PTOCS Search — header + catalog filter application */
PT.Search = {
  apply(q) {
    const input = document.getElementById('catalogSearch');
    if (input && input.value !== q) input.value = q;
    if (PT.Entry) PT.Entry.applyFilters({ q: q });
  },
  clear() {
    const input = document.getElementById('catalogSearch');
    if (input) input.value = '';
    if (PT.Entry) PT.Entry.applyFilters({});
  },
};
