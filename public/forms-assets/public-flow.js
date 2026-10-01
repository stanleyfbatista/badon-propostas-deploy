'use strict';
(() => {
  const form = document.querySelector('#public-flow');
  if (!form || !globalThis.BadonFlow) return;
  const definition = JSON.parse(form.dataset.definition), fields = definition.fields, engine = globalThis.BadonFlow;
  const inputs = fields.map(field => document.getElementById('field-' + field.key));
  const questions = [...form.querySelectorAll('[data-question]')];
  const review = document.querySelector('#flow-review'), summary = document.querySelector('#flow-summary');
  const navigation = document.querySelector('#flow-navigation'), back = document.querySelector('#flow-back');
  const nextButton = document.querySelector('#flow-next'), progress = document.querySelector('#flow-progress');
  const consent = form.elements.consent, submit = document.querySelector('#flow-submit');
  const steps = definition.mode === 'steps'; let history = [0], reviewing = false;
  const values = () => Object.fromEntries(fields.map((field, index) => [field.key, inputs[index].value.trim()]));
  function check(index) {
    const input = inputs[index], field = fields[index], value = input.value.trim();
    let error = '';
    if (field.required && !value) error = 'Preencha esta pergunta.';
    else if (value && field.type === 'number' && !engine.validNumber(value)) error = 'Use um número de 0 a 1 trilhão, sem R$ ou separador de milhar.';
    else if (value && field.type === 'tel' && (!/^[+0-9().\s-]+$/.test(value) || value.replace(/\D/g, '').length < 8 || value.replace(/\D/g, '').length > 15)) error = 'Informe um telefone com DDD.';
    input.setCustomValidity(error);
    return input.reportValidity();
  }
  function render(focus = false) {
    const path = steps ? history : engine.path(fields, values());
    const current = history[history.length - 1];
    inputs.forEach((input, index) => {
      const included = path.includes(index);
      input.disabled = !included;
      input.required = included && fields[index].required;
      questions[index].hidden = steps ? reviewing || index !== current : !included;
    });
    review.hidden = steps && !reviewing;
    consent.disabled = review.hidden;
    submit.disabled = review.hidden;
    navigation.hidden = !steps;
    back.hidden = !reviewing && history.length === 1;
    nextButton.hidden = reviewing;
    progress.hidden = !steps;
    progress.textContent = reviewing ? 'Última etapa · confirmar envio' : 'Pergunta ' + history.length;
    if (reviewing) {
      summary.replaceChildren(); summary.hidden = false;
      const list = document.createElement('dl');
      for (const index of history) {
        const title = document.createElement('dt'), answer = document.createElement('dd');
        title.textContent = fields[index].label; answer.textContent = inputs[index].value || 'Não informado';
        list.append(title, answer);
      }
      summary.append(list);
    }
    if (focus) (reviewing ? consent : inputs[current]).focus();
  }
  function advance() {
    const current = history[history.length - 1];
    if (!check(current)) return;
    const destination = engine.next(fields, current, values());
    if (destination.index < 0) reviewing = true;
    else history.push(destination.index);
    render(true);
  }
  inputs.forEach((input, index) => input.addEventListener('input', () => {
    input.setCustomValidity(''); input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    questions[index].querySelectorAll('.error-text').forEach(message => message.remove());
    // Respostas posteriores não podem vazar de um caminho antigo para o novo.
    inputs.slice(index + 1).forEach(answer => { answer.value = ''; answer.setCustomValidity(''); });
    consent.checked = false;
    if (!steps) render();
  }));
  nextButton.addEventListener('click', advance);
  form.addEventListener('keydown', event => {
    if (steps && !reviewing && event.key === 'Enter' && event.target.tagName === 'INPUT' && !event.isComposing) {
      event.preventDefault(); advance();
    }
  });
  back.addEventListener('click', () => {
    if (reviewing) reviewing = false;
    else if (history.length > 1) history.pop();
    consent.checked = false; render(true);
  });
  form.addEventListener('submit', event => {
    if (steps && !reviewing) { event.preventDefault(); advance(); return; }
    const path = engine.path(fields, values());
    for (const index of path) {
      if (!check(index)) { event.preventDefault(); return; }
    }
    if (!consent.checked) { event.preventDefault(); consent.reportValidity(); return; }
    submit.disabled = true; submit.textContent = 'Enviando…';
  });
  // O servidor sempre repete a validação. O cliente só organiza a experiência.
  render();
  window.addEventListener('pageshow', () => { submit.disabled = review.hidden; submit.textContent = 'Confirmar e enviar'; });
})();
