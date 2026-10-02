<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/domain.php';
function verify(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function invalid(callable $fn, string $label): void
{
    try { $fn(); } catch (InvalidArgumentException $e) { return; }
    throw new RuntimeException('Aceitou ' . $label);
}
$ending = ['title' => 'Obrigado!', 'message' => 'Este serviço exige outro investimento.', 'whatsapp' => false];
$rows = [
    ['key' => 'email', 'label' => 'Seu e-mail', 'type' => 'email', 'required' => true],
    ['key' => 'investimento', 'label' => 'Investimento mensal', 'type' => 'number', 'required' => true, 'rules' => [
        ['operator' => 'lt', 'value' => '1000', 'target' => 'finish', 'ending' => $ending],
    ]],
    ['key' => 'negocio', 'label' => 'Tipo de negócio', 'type' => 'select', 'required' => true, 'options' => ['Local', 'Infoproduto'], 'rules' => [
        ['operator' => 'eq', 'value' => 'Infoproduto', 'target' => 'produto'],
    ]],
    ['key' => 'cidade', 'label' => 'Cidade', 'type' => 'text', 'required' => true, 'otherwise' => ['target' => 'fim']],
    ['key' => 'produto', 'label' => 'Produto', 'type' => 'text', 'required' => true],
    ['key' => 'fim', 'label' => 'Algo mais?', 'type' => 'textarea', 'required' => false],
];
$definition = clean_definition($rows, 'steps', default_ending());
$inputs = ['email' => 'a@example.invalid', 'investimento' => '500', 'negocio' => 'Local', 'cidade' => 'Dado forjado', 'produto' => ['invalid']];
[$values, $errors, $email, $outcome, $path] = validate_flow($definition, $inputs);
verify(!$errors && count($values) === 2 && $email === $inputs['email'], 'Encerrar sem exigir campos seguintes');
verify($outcome['kind'] === 'conditional' && !$outcome['ending']['whatsapp'], 'Encerramento sem WhatsApp');
verify($path === ['email', 'investimento'], 'Somente perguntas visitadas');
$priority = $definition;
$priority['fields'][1]['rules'][] = ['operator' => 'lt', 'value' => '2000', 'target' => 'produto'];
verify(flow_route($priority['fields'][1], '500')['target'] === 'finish', 'Primeira condição correspondente vence');
$priority['fields'][1]['rules'] = array_reverse($priority['fields'][1]['rules']);
verify(flow_route($priority['fields'][1], '500')['target'] === 'produto', 'Reordenar condições muda prioridade');
$inputs['investimento'] = '1000'; $inputs['cidade'] = 'Campinas';
[$values, $errors, , $outcome, $path] = validate_flow($definition, $inputs);
verify(!$errors && $path === ['email', 'investimento', 'negocio', 'cidade', 'fim'] && $outcome['kind'] === 'completed', 'Limiar exato e salto padrão');
$inputs['negocio'] = 'Infoproduto'; $inputs['produto'] = 'Curso'; $inputs['cidade'] = ['forged'];
[$values, $errors, , , $path] = validate_flow($definition, $inputs);
verify(!$errors && $path === ['email', 'investimento', 'negocio', 'produto', 'fim'], 'Seleção pula pergunta obrigatória');
unset($inputs['produto']);
[, $errors] = validate_flow($definition, $inputs);
verify(isset($errors['produto']), 'Pergunta obrigatória alcançada continua obrigatória');
foreach (['NaN', 'INF', '1e3', '-1', '1.000,00', '12.345', '1000000000001'] as $value) {
    verify(!valid_flow_number($value), 'Número inválido: ' . $value);
}
foreach (['0', '1000,50', '1000.50', '1000000000000'] as $value) verify(valid_flow_number($value), 'Número válido');
verify(!flow_matches(['operator' => 'ne', 'value' => 'Local'], $definition['fields'][2], ''), 'Vazio opcional não aciona diferente');
verify(flow_matches(['operator' => 'eq', 'value' => '1000.50'], $definition['fields'][1], '1000,50'), 'Equivalência decimal');
foreach (['lt' => false, 'lte' => true, 'gt' => false, 'gte' => true, 'eq' => true, 'ne' => false] as $op => $expected) {
    verify(flow_matches(['operator' => $op, 'value' => '1000'], $definition['fields'][1], '1000') === $expected, 'Operador ' . $op);
}
$bad = $rows; $bad[2]['rules'][0]['target'] = 'email';
invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'salto para trás');
$bad[2]['rules'][0]['target'] = 'missing';
invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'destino inexistente');
$bad = $rows; $bad[2]['rules'][0]['value'] = 'Removida';
invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'alternativa removida');
$bad = $rows; $bad[1]['rules'][0]['value'] = 'x';
invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'limiar inválido');
invalid(fn() => clean_definition($rows, 'invalid', default_ending()), 'modo desconhecido');
$many = [];
for ($i = 0; $i < 100; $i++) $many[] = ['key' => 'q_' . $i, 'label' => 'Pergunta ' . $i, 'type' => 'text'];
verify(count(clean_definition($many, 'steps', default_ending())['fields']) === 100, '100 perguntas livres');
$many[] = ['key' => 'q_100', 'label' => 'Extra', 'type' => 'text'];
invalid(fn() => clean_definition($many, 'steps', default_ending()), '101 perguntas');
$legacy = form_definition(json_encode(clean_fields(array_slice($rows, 0, 1))));
verify($legacy['mode'] === 'all' && $legacy['completion']['whatsapp'], 'Compatibilidade de JSON antigo');
verify(form_definition(json_encode($definition)) === $definition, 'JSON v2 round-trip preserva regras e finais');
verify(lead_outcome(json_encode([outcome_value($outcome)])) !== '', 'Resultado legível em lead/CSV/e-mail');
$multiple = clean_definition([
    ['key' => 'investimento', 'label' => 'Quanto investe?', 'type' => 'multiple', 'required' => true,
        'options' => ['Menos de R$ 1.000,00', 'R$ 1.000,00 ou mais', 'Não sei'],
        'rules' => [
            ['operator' => 'contains', 'value' => 'Menos de R$ 1.000,00', 'target' => 'finish', 'ending' => $ending],
            ['operator' => 'not_contains', 'value' => 'Não sei', 'target' => 'nome'],
        ]],
    ['key' => 'detalhes', 'label' => 'Detalhes', 'type' => 'text', 'required' => true],
    ['key' => 'nome', 'label' => 'Nome', 'type' => 'name', 'required' => true],
], 'steps', default_ending());
[$multiValues, $multiErrors, , $multiOutcome, $multiPath] = validate_flow($multiple, ['investimento' => ['Menos de R$ 1.000,00', 'R$ 1.000,00 ou mais'], 'nome' => 'FORGED-SKIPPED']);
verify(!$multiErrors && $multiPath === ['investimento'] && count($multiValues) === 1 && $multiOutcome['kind'] === 'conditional', 'Múltipla encerra pela primeira condição e ignora campos pulados');
[, $multiErrors, , $multiOutcome, $multiPath] = validate_flow($multiple, ['investimento' => ['R$ 1.000,00 ou mais'], 'nome' => 'Nome']);
verify(!$multiErrors && $multiPath === ['investimento', 'nome'] && $multiOutcome['kind'] === 'completed', 'Não contém pula para pergunta posterior');
[, $multiErrors] = validate_flow($multiple, ['investimento' => ['Não sei']]);
verify(isset($multiErrors['detalhes']), 'Caminho padrão exige a próxima pergunta');
foreach (['Menos de R$ 1.000,00', ['Forjada'], [['Menos de R$ 1.000,00']], []] as $invalidAnswer) {
    [, $multiErrors] = validate_flow($multiple, ['investimento' => $invalidAnswer]);
    verify(isset($multiErrors['investimento']), 'Rejeita seleção inválida ou vazia obrigatória');
}
$optional = $multiple; $optional['fields'][0]['required'] = false;
[, $multiErrors, , , $multiPath] = validate_flow($optional, ['investimento' => [], 'detalhes' => 'D', 'nome' => 'N']);
verify(!$multiErrors && $multiPath === ['investimento', 'detalhes', 'nome'], 'Vazio opcional não aciona não contém');
foreach (['eq', 'lt'] as $operator) {
    $bad = $multiple['fields']; $bad[0]['rules'][0]['operator'] = $operator;
    invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'operador inválido para múltipla');
}
$bad = $multiple['fields']; $bad[0]['rules'][0]['value'] = 'Opção removida';
invalid(fn() => clean_definition($bad, 'steps', default_ending()), 'alternativa removida em múltipla');
verify(form_definition(json_encode($multiple)) === $multiple, 'Regras múltiplas persistem no JSON');
if (in_array('--multiple-fixture', $argv, true)) echo json_encode($multiple, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
elseif (in_array('--fixture', $argv, true)) echo json_encode($definition, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
else echo "OK: funil, condições, limites, campos pulados, encerramentos, números e compatibilidade.\n";
