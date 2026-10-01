'use strict';
(() => {
  const root = document.querySelector('#flow-editor'), form = document.querySelector('#form-editor');
  if (!root || !form) return;
  const draft = JSON.parse(root.dataset.definition);
  draft.fields = Object.values(draft.fields).filter(field => field && typeof field === 'object').slice(0, 100);
  const defaultEnding = conditional => conditional
    ? { title: 'Obrigado pelo interesse.', message: 'Neste momento, esta solução não é a mais indicada para você.', whatsapp: false }
    : { title: 'Obrigado pelo contato.', message: 'Recebemos suas informações. Obrigado por responder!', whatsapp: true };
  draft.completion ||= defaultEnding(false);
  draft.fields.forEach(field => { field.rules ||= []; field.otherwise ||= { target: 'next' }; });
  const types = { text: 'Texto curto', email: 'E-mail', tel: 'Telefone', select: 'Escolha de alternativa', number: 'Número / valor em reais', textarea: 'Texto longo' };
  const operators = { eq: 'é igual a', ne: 'é diferente de', lt: 'é menor que', lte: 'é menor ou igual a', gt: 'é maior que', gte: 'é maior ou igual a' };
  let dirty = false;
  const touch = () => { dirty = true; };
  const el = (tag, className = '', text = '') => {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  const button = (text, action, className = 'text-button') => {
    const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
  };
  function control(title, value, setter, { textarea = false, required = false, max = 240, placeholder = '' } = {}) {
    const label = el('label', 'editor-control', title), input = el(textarea ? 'textarea' : 'input');
    if (!textarea) input.type = 'text'; else input.rows = 3;
    input.value = value || ''; input.required = required; input.maxLength = max; input.placeholder = placeholder;
    input.addEventListener('input', () => { setter(input.value); touch(); }); label.append(input); return label;
  }
  function select(title, options, value, setter) {
    const label = el('label', 'editor-control', title), input = el('select');
    Object.entries(options).forEach(([key, text]) => { const option = el('option', '', text); option.value = key; input.append(option); });
    input.value = value;
    input.addEventListener('change', () => { setter(input.value); touch(); }); label.append(input); return label;
  }
  function checkbox(title, value, setter) {
    const label = el('label', 'check'), input = el('input'); input.type = 'checkbox'; input.checked = Boolean(value);
    input.addEventListener('change', () => { setter(input.checked); touch(); }); label.append(input, document.createTextNode(title)); return label;
  }
  function endingEditor(ending) {
    const box = el('div', 'ending-editor');
    box.append(control('Título da tela final', ending.title, value => { ending.title = value; }, { required: true, max: 150 }),
      control('Mensagem para quem respondeu', ending.message, value => { ending.message = value; }, { textarea: true, max: 2000 }),
      checkbox('Mostrar botão de WhatsApp após confirmar o envio', ending.whatsapp, value => { ending.whatsapp = value; }));
    return box;
  }
  root.innerHTML = '<div class="builder-intro"><p class="eyebrow">Seu funil, suas perguntas</p><h2>Construa a conversa</h2><p>Comece do zero e adicione as perguntas que fizerem sentido. As regras são verificadas de cima para baixo: a primeira que combinar define o próximo passo.</p></div><div id="flow-mode"></div><div class="builder-layout"><aside class="flow-outline" aria-label="Resumo do funil"><h3>Mapa do funil</h3><p id="question-count" class="muted"></p><ol id="flow-map"></ol><p class="muted">Saltos seguem para perguntas posteriores, evitando ciclos.</p></aside><div><div id="questions-editor"></div><button type="button" class="button secondary" id="add-question">+ Adicionar pergunta</button></div></div><section class="completion-editor"><p class="eyebrow">Quando o caminho terminar</p><h2>Encerramento padrão</h2><p class="muted">Usado quando a pessoa chega ao fim sem um encerramento condicional.</p></section><input type="hidden" name="fields_payload"><p id="builder-error" class="notice" role="alert" hidden></p>';
  const list = root.querySelector('#questions-editor'), map = root.querySelector('#flow-map');
  const errorBox = root.querySelector('#builder-error');
  root.querySelector('#flow-mode').append(select('Como a pessoa vai responder?', { steps: 'Uma pergunta por vez · estilo conversa', all: 'Perguntas do caminho na mesma página' }, draft.mode, value => { draft.mode = value; }));
  root.querySelector('.completion-editor').append(endingEditor(draft.completion));
  function outline() {
    map.replaceChildren();
    root.querySelector('#question-count').textContent = draft.fields.length + ' de 100 perguntas';
    draft.fields.forEach((field, index) => {
      const item = el('li'), link = el('a', '', field.label || 'Nova pergunta'); link.href = '#question-' + field.key;
      item.append(link, el('small', '', field.rules.length ? field.rules.length + ' condição(ões)' : 'Segue o caminho padrão')); map.append(item);
      const legend = list.children[index]?.querySelector('legend'); if (legend) legend.textContent = 'Pergunta ' + (index + 1);
    });
    root.querySelectorAll('[data-destination] option').forEach(option => {
      const index = draft.fields.findIndex(field => field.key === option.value);
      if (index >= 0) option.textContent = 'Ir para ' + (index + 1) + '. ' + (draft.fields[index].label || 'Nova pergunta');
    });
  }
  function routeEditor(route, fieldIndex, title) {
    const box = el('div', 'route-editor');
    const choices = { next: 'Seguir para a próxima pergunta', finish: 'Encerrar com mensagem personalizada' };
    draft.fields.slice(fieldIndex + 1).forEach((field, offset) => { choices[field.key] = 'Ir para ' + (fieldIndex + offset + 2) + '. ' + (field.label || 'Nova pergunta'); });
    const invalid = !Object.hasOwn(choices, route.target);
    if (invalid) choices[route.target] = '⚠ Destino removido ou anterior — escolha outro';
    const chooser = select(title, choices, route.target, value => { route.target = value; route.ending ||= defaultEnding(true); draw(); });
    chooser.querySelector('select').dataset.destination = 'true';
    chooser.querySelector('select').setCustomValidity(invalid ? 'Escolha uma pergunta posterior ou outro destino.' : '');
    box.append(chooser);
    if (route.target === 'finish') { route.ending ||= defaultEnding(true); box.append(endingEditor(route.ending)); }
    return box;
  }
  function refreshResponses(field, row) {
    const options = typeof field.options === 'string' ? field.options.split(/\r?\n/).map(value => value.trim()).filter(Boolean) : field.options;
    row.querySelectorAll('[data-response]').forEach(input => {
      const rule = field.rules[Number(input.dataset.response)];
      input.replaceChildren();
      if (!options.includes(rule.value)) {
        const missing = el('option', '', rule.value ? '⚠ Opção removida: ' + rule.value : 'Selecione uma resposta');
        missing.value = rule.value || ''; input.append(missing);
      }
      options.forEach(value => { const option = el('option', '', value); option.value = value; input.append(option); });
      input.value = rule.value || '';
      input.setCustomValidity(options.includes(rule.value) ? '' : 'Escolha uma resposta que exista nas alternativas.');
    });
  }
  function drawRule(rule, index, field, fieldIndex) {
    const card = el('div', 'rule-card'), header = el('div', 'heading'), actions = el('div', 'actions');
    const moveRule = direction => {
      const target = index + direction; if (target < 0 || target >= field.rules.length) return;
      [field.rules[index], field.rules[target]] = [field.rules[target], field.rules[index]]; touch(); draw();
    };
    actions.append(button('Subir regra', () => moveRule(-1)), button('Descer regra', () => moveRule(1)), button('Remover condição', () => { field.rules.splice(index, 1); touch(); draw(); }, 'text-button danger'));
    header.append(el('strong', '', 'Se a resposta… · condição ' + (index + 1)), actions);
    const comparisons = field.type === 'number' ? operators : { eq: operators.eq, ne: operators.ne };
    const criteria = el('div', 'two-columns');
    criteria.append(select('Comparação', comparisons, rule.operator, value => { rule.operator = value; }));
    if (field.type === 'select') {
      const answer = select('Resposta', {}, rule.value || '', value => { rule.value = value; refreshResponses(field, card); });
      answer.querySelector('select').dataset.response = String(index);
      criteria.append(answer);
    } else {
      criteria.append(control(field.type === 'number' ? 'Valor (ex.: 1000)' : 'Resposta exata', rule.value, value => { rule.value = value; }, { required: true, max: 250 }));
    }
    card.append(header, criteria, routeEditor(rule, fieldIndex, 'Então…'));
    if (field.type === 'select') refreshResponses(field, card);
    return card;
  }
  function draw() {
    list.replaceChildren();
    if (!draft.fields.length) list.append(el('p', 'empty-builder', 'Nenhuma pergunta obrigatória de modelo. Clique abaixo para criar a sua primeira pergunta.'));
    draft.fields.forEach((field, index) => {
      const row = el('fieldset', 'field-editor'), legend = el('legend', '', 'Pergunta ' + (index + 1)); row.id = 'question-' + field.key;
      const name = control('O que você quer perguntar?', field.label, value => { field.label = value; outline(); }, { required: true, placeholder: 'Ex.: Quanto você investe em tráfego por mês?' });
      const type = select('Tipo de resposta', types, field.type, value => {
        field.type = value; field.options ||= [];
        field.rules.forEach(rule => { if (value !== 'number' && !['eq', 'ne'].includes(rule.operator)) rule.operator = 'eq'; });
        draw();
      });
      row.append(legend, name, type, checkbox('Resposta obrigatória', field.required, value => { field.required = value; }));
      if (field.type === 'select') {
        const options = control('Alternativas · uma por linha', Array.isArray(field.options) ? field.options.join('\n') : field.options, value => { field.options = value; refreshResponses(field, row); }, { textarea: true, required: true, max: 8000 });
        row.append(options);
      }
      if (field.type === 'number') row.append(el('small', '', 'Ideal para faturamento e investimento. Aceita até duas casas decimais, sem R$ nem separador de milhar.'));
      const rules = el('div', 'rules-editor'); rules.append(el('h3', '', 'Regras de caminho'));
      if (!field.rules.length) rules.append(el('p', 'muted', 'Sem condições: esta pergunta segue o destino padrão abaixo.'));
      field.rules.forEach((rule, ruleIndex) => rules.append(drawRule(rule, ruleIndex, field, index)));
      rules.append(button('+ Adicionar condição', () => {
        if (field.rules.length >= 20) { window.alert('Use até 20 condições por pergunta.'); return; }
        field.rules.push({ operator: field.type === 'number' ? 'lt' : 'eq', value: '', target: 'next' }); touch(); draw();
      }, 'button secondary'));
      rules.append(routeEditor(field.otherwise, index, field.rules.length ? 'Se nenhuma condição combinar…' : 'Depois desta resposta…'));
      row.append(rules);
      const actions = el('div', 'actions question-actions');
      function move(direction) {
        const target = index + direction; if (target < 0 || target >= draft.fields.length) return;
        [draft.fields[index], draft.fields[target]] = [draft.fields[target], draft.fields[index]]; touch(); draw();
        document.getElementById('question-' + field.key).querySelector('input').focus();
      }
      const up = button('↑ Subir', () => move(-1)), down = button('↓ Descer', () => move(1));
      up.disabled = index === 0; down.disabled = index === draft.fields.length - 1;
      actions.append(up, down, button('Remover pergunta', () => {
        if (!window.confirm('Remover esta pergunta? Os leads antigos serão preservados. Revise os saltos que apontam para ela.')) return;
        draft.fields.splice(index, 1); touch(); draw();
      }, 'text-button danger'));
      row.append(actions); list.append(row);
    });
    outline();
  }
  root.querySelector('#add-question').addEventListener('click', () => {
    if (draft.fields.length >= 100) { window.alert('Use até 100 perguntas por funil.'); return; }
    let index = 1; while (draft.fields.some(field => field.key === 'pergunta_' + index)) index++;
    draft.fields.push({ key: 'pergunta_' + index, label: '', type: 'text', required: true, options: [], rules: [], otherwise: { target: 'next' } });
    touch(); draw(); list.lastElementChild.querySelector('input').focus();
  });
  form.addEventListener('input', touch);
  form.addEventListener('submit', event => {
    errorBox.hidden = true;
    const payload = JSON.stringify(draft);
    root.querySelector('[name=fields_payload]').value = payload;
    if (!draft.fields.length || new URLSearchParams(new FormData(form)).toString().length > 190000) {
      event.preventDefault(); errorBox.textContent = !draft.fields.length ? 'Adicione pelo menos uma pergunta.' : 'O funil está muito grande. Reduza textos ou condições para salvar.';
      errorBox.hidden = false; errorBox.scrollIntoView({ block: 'center' }); return;
    }
    // Um único campo evita truncamento pelo max_input_vars do PHP em funis longos.
    dirty = false;
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  draw();
})();
