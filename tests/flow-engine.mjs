import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import '../public/forms-assets/flow-engine.js';
const php = process.env.PHP_BIN || '/opt/homebrew/opt/php@8.4/bin/php';
const definition = JSON.parse(execFileSync(php, ['tests/flow.php', '--fixture'], { encoding: 'utf8' }));
const engine = globalThis.BadonFlow, fields = definition.fields;
const keys = values => engine.path(fields, values).map(index => fields[index].key);
assert.deepEqual(keys({ investimento: '500' }), ['email', 'investimento']);
assert.deepEqual(keys({ investimento: '1000', negocio: 'Local' }), ['email', 'investimento', 'negocio', 'cidade', 'fim']);
assert.deepEqual(keys({ investimento: '1000', negocio: 'Infoproduto' }), ['email', 'investimento', 'negocio', 'produto', 'fim']);
assert.equal(engine.next(fields, 1, { investimento: '999,99' }).ending.whatsapp, false);
const priority = structuredClone(fields[1]);
priority.rules.push({ operator: 'lt', value: '2000', target: 'produto' });
assert.equal(engine.route(priority, '500').target, 'finish');
priority.rules.reverse();
assert.equal(engine.route(priority, '500').target, 'produto');
for (const [operator, expected] of Object.entries({ eq: true, ne: false, lt: false, lte: true, gt: false, gte: true })) {
  assert.equal(engine.matches({ operator, value: '1000.50' }, fields[1], '1000,50'), expected);
}
assert.equal(engine.matches({ operator: 'ne', value: 'Local' }, fields[2], ''), false);
assert.equal(engine.validNumber('1e3'), false);
assert.equal(engine.validNumber('1000000000001'), false);
assert.equal(engine.validNumber('1000000000000'), true);
assert.throws(() => engine.next([{ key: 'x', type: 'text', otherwise: { target: 'x' } }], 0, {}));
const multiple = JSON.parse(execFileSync(php, ['tests/flow.php', '--multiple-fixture'], {encoding: 'utf8'}));
const multiFields = multiple.fields, multiKeys = values => engine.path(multiFields, values).map(i => multiFields[i].key);
assert.deepEqual(multiKeys({investimento: ['Menos de R$ 1.000,00', 'R$ 1.000,00 ou mais']}), ['investimento']);
assert.deepEqual(multiKeys({investimento: ['R$ 1.000,00 ou mais']}), ['investimento', 'nome']);
assert.deepEqual(multiKeys({investimento: ['Não sei']}), ['investimento', 'detalhes', 'nome']);
assert.deepEqual(multiKeys({investimento: []}), ['investimento', 'detalhes', 'nome']);
for (const answer of [[], '', 'Menos de R$ 1.000,00', ['Forjada'], [['Não sei']]]) {
  for (const rule of multiFields[0].rules) assert.equal(engine.matches(rule, multiFields[0], answer), false);
}
assert.equal(engine.matches({operator: 'contains', value: 'Menos de R$ 1.000'}, multiFields[0], ['Menos de R$ 1.000,00']), false);
assert.equal(engine.route(multiFields[0], ['Menos de R$ 1.000,00']).ending.whatsapp, false);
console.log('OK: regras do navegador/PHP, escolhas múltiplas exatas, prioridades, vazio, saltos e encerramentos.');
