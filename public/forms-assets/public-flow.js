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
  const bar = document.createElement('progress'); bar.className = 'flow-progress-bar'; bar.max = fields.length; bar.setAttribute('aria-label', 'Progresso do formulário'); progress.after(bar);
  const cover = definition.welcome || {};
  const steps = definition.mode === 'steps'; let history = [0], reviewing = false, welcoming = true;
  const answer = input => input.multiple ? [...input.selectedOptions].map(o => o.value) : input.value.trim();
  const displayAnswer = value => Array.isArray(value) ? value.join(', ') : value;
  const values = () => Object.fromEntries(fields.map((field, index) => [field.key, answer(inputs[index])]));
  const interpolate = text => text.replace(/@([a-z][a-z0-9_]{0,39})/g, (match, key) => displayAnswer(values()[key]) || match);
  const welcome = document.createElement('section'); welcome.className = 'flow-welcome cover-container';
  if (welcoming) {
    const content = document.createElement('section'), copy = document.createElement('div');
    content.className = 'welcome-cover cover-' + (cover.media ? cover.layout : 'plain') + (cover.media?.type === 'video' ? ' has-video' : '');
    copy.className = 'cover-copy';
    if (cover.media) {
      const frame = document.createElement('div'); frame.className = 'cover-media';
      const media = document.createElement(cover.media.type === 'video' ? 'video' : 'img');
      media.src = cover.media.src; media.style.objectFit = cover.fit || 'cover';
      media.style.objectPosition = `${cover.x ?? 50}% ${cover.y ?? 50}%`;
      if (cover.media.type === 'video') { media.controls = true; media.playsInline = true; media.preload = 'metadata'; media.setAttribute('aria-label', cover.alt || 'Vídeo de apresentação'); }
      else { media.alt = cover.alt || ''; media.decoding = 'async'; }
      frame.append(media); content.append(frame);
    }
    const title = document.createElement('h2'), description = document.createElement('p'), start = document.createElement('button');
    title.textContent = cover.title || 'Bem-vindo!'; description.textContent = cover.message || '';
    start.type = 'button'; start.className = 'button cover-start'; start.textContent = (cover.button_text || 'Começar') + ' →';
    start.addEventListener('click', () => { welcome.querySelector('video')?.pause(); welcoming = false; render(true); });
    copy.append(title); if (cover.message) copy.append(description); copy.append(start);
    content.append(copy); welcome.append(content); form.prepend(welcome);
  }
  fields.forEach((field, index) => {
    const input = inputs[index], question = questions[index];
    input.placeholder = field.placeholder || '';
    if (field.description) { const description = document.createElement('p'); description.className = 'muted flow-description'; description.textContent = field.description; question.querySelector('label').after(description); }
    if (['single', 'multiple', 'yesno'].includes(field.type)) {
      const choices = document.createElement('div'); choices.className = 'flow-choices';
      input.classList.add('choice-source');
      field.options.forEach((value, optionIndex) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'flow-choice';
        const letter = document.createElement('kbd'); letter.textContent = optionIndex < 26 ? String.fromCharCode(65 + optionIndex) : String(optionIndex + 1);
        button.append(letter, document.createTextNode(value)); button.dataset.choice = value;
        button.addEventListener('click', () => {
          if (input.multiple) { const option = [...input.options].find(o => o.value === value); option.selected = !option.selected; }
          else input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true })); render();
        }); choices.append(button);
      }); input.after(choices);
    }
  });
  function check(index) {
    const input = inputs[index], field = fields[index], value = answer(input);
    let error = '';
    if (field.required && !value.length) error = 'Preencha esta pergunta.';
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
      questions[index].hidden = welcoming || (steps ? reviewing || index !== current : !included);
      questions[index].querySelector('label').textContent = interpolate(fields[index].label) + (fields[index].required ? ' *' : '');
      questions[index].querySelectorAll('[data-choice]').forEach(button => button.setAttribute('aria-pressed', String([...input.selectedOptions].some(o => o.value === button.dataset.choice))));
    });
    welcome.hidden = !welcoming;
    const introduction = document.querySelector('.flow-introduction');
    if (introduction) introduction.hidden = welcoming;
    review.hidden = welcoming || (steps && !reviewing);
    consent.disabled = review.hidden;
    submit.disabled = review.hidden;
    navigation.hidden = !steps || welcoming;
    back.hidden = !reviewing && history.length === 1;
    nextButton.hidden = reviewing;
    progress.hidden = !steps || welcoming || definition.theme?.progress === false;
    bar.hidden = progress.hidden; bar.value = reviewing ? fields.length : current + 1;
    nextButton.textContent = fields[current]?.button_text || 'Continuar →';
    progress.textContent = reviewing ? 'Última etapa · confirmar envio' : 'Pergunta ' + history.length;
    if (reviewing) {
      summary.replaceChildren(); summary.hidden = false;
      const list = document.createElement('dl');
      for (const index of history) {
        const title = document.createElement('dt'), answer = document.createElement('dd');
        title.textContent = interpolate(fields[index].label); answer.textContent = displayAnswer(values()[fields[index].key]) || 'Não informado';
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
    inputs.slice(index + 1).forEach(answer => { if (answer.multiple) [...answer.options].forEach(o => o.selected = false); else answer.value = ''; answer.setCustomValidity(''); });
    consent.checked = false;
    if (!steps) render();
  }));
  nextButton.addEventListener('click', advance);
  form.addEventListener('keydown', event => {
    if (welcoming) return;
    const current = history[history.length - 1];
    if (steps && !reviewing && /^[a-z]$/i.test(event.key) && !['INPUT','TEXTAREA'].includes(event.target.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const option = questions[current].querySelectorAll('[data-choice]')[event.key.toUpperCase().charCodeAt(0) - 65];
      if (option) { event.preventDefault(); option.click(); }
    }
    if (steps && !reviewing && event.key === 'Enter' && ['INPUT', 'SELECT'].includes(event.target.tagName) && !event.isComposing) {
      event.preventDefault(); advance();
    }
  });
  back.addEventListener('click', () => {
    if (reviewing) reviewing = false;
    else if (history.length > 1) history.pop();
    consent.checked = false; render(true);
  });
  form.addEventListener('submit', event => {
    if (welcoming) { event.preventDefault(); return; }
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
