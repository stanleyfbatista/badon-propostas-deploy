'use strict';
// Funções puras compartilhadas pelo formulário e pelos testes, sem dependências externas.
(function (root) {
  const validNumber = value => /^\d{1,13}(?:[.,]\d{1,2})?$/.test(value) && Number(value.replace(',', '.')) <= 1e12;
  function matches(rule, field, answer) {
    if (field.type === 'multiple') {
      if (!Array.isArray(answer) || !answer.length || answer.some(value => !field.options.includes(value))) return false;
      if (rule.operator === 'contains') return answer.includes(rule.value);
      if (rule.operator === 'not_contains') return !answer.includes(rule.value);
      return false;
    }
    if (typeof answer !== 'string') return false;
    if (answer === '') return false;
    let value = rule.value;
    if (field.type === 'number') {
      if (!validNumber(answer)) return false;
      answer = Number(answer.replace(',', '.')); value = Number(value.replace(',', '.'));
    }
    switch (rule.operator) {
      case 'eq': return answer === value;
      case 'ne': return answer !== value;
      case 'lt': return answer < value;
      case 'lte': return answer <= value;
      case 'gt': return answer > value;
      case 'gte': return answer >= value;
      default: return false;
    }
  }
  function route(field, value) {
    const answer = typeof value === 'string' ? value.trim() : value;
    return (field.rules || []).find(rule => matches(rule, field, answer)) || field.otherwise || { target: 'next' };
  }
  function next(fields, index, values) {
    const destination = route(fields[index], values[fields[index].key] || '');
    if (destination.target === 'end:default') return { index: -1 };
    if (destination.target === 'finish') return { index: -1, ending: destination.ending };
    const nextIndex = destination.target === 'next' ? index + 1 : fields.findIndex(field => field.key === destination.target);
    if (nextIndex <= index) throw new Error('Destino inválido no funil.');
    return { index: nextIndex < fields.length ? nextIndex : -1 };
  }
  function path(fields, values) {
    const result = []; let index = 0;
    while (index >= 0 && index < fields.length) {
      result.push(index); index = next(fields, index, values).index;
    }
    return result;
  }
  root.BadonFlow = { validNumber, matches, route, next, path };
})(globalThis);
