'use strict';
const fields = document.querySelector('#fields');
const template = document.querySelector('#field-template');
const addButton = document.querySelector('#add-field');
let nextIndex = fields ? fields.children.length : 0;
if (fields && template && addButton) {
  addButton.addEventListener('click', () => {
    if (fields.children.length >= 30) { window.alert('Use no máximo 30 campos.'); return; }
    const clone = template.content.cloneNode(true);
    for (const input of clone.querySelectorAll('[name]')) {
      input.name = input.name.replace('__INDEX__', String(nextIndex));
    }
    nextIndex += 1;
    fields.append(clone);
    fields.lastElementChild.querySelector('input').focus();
  });
  fields.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('fieldset');
    if (button.hasAttribute('data-remove')) {
      if (fields.children.length <= 1) { window.alert('O formulário precisa de pelo menos um campo.'); return; }
      if (window.confirm('Remover este campo? Respostas já recebidas serão preservadas.')) row.remove();
    } else if (button.dataset.move === 'up' && row.previousElementSibling) {
      fields.insertBefore(row, row.previousElementSibling);
      button.focus();
    } else if (button.dataset.move === 'down' && row.nextElementSibling) {
      fields.insertBefore(row.nextElementSibling, row);
      button.focus();
    }
  });
}
