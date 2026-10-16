(() => {
  const select = document.querySelector('#blog-category');
  if (!select) return;
  const cards = [...document.querySelectorAll('.journal-card[data-category]')];
  const count = document.querySelector('#blog-count');
  document.querySelector('.journal-filter').hidden = false;
  select.addEventListener('change', () => {
    let shown = 0;
    cards.forEach(card => {
      card.hidden = Boolean(select.value && card.dataset.category !== select.value);
      if (!card.hidden) shown++;
    });
    count.textContent = shown + (shown === 1 ? ' artigo' : ' artigos');
  });
})();
