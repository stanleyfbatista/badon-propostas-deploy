<?php
declare(strict_types=1);

// Versionamento dentro do JSON existente: nenhuma migração ou ALTER na hospedagem.
function form_definition(string $json): array
{
    $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (isset($data['version'])) return $data;
    return ['version' => 2, 'mode' => 'all', 'fields' => $data, 'completion' => default_ending()];
}

function default_ending(): array
{
    return ['title' => 'Obrigado pelo contato.', 'message' => 'Recebemos suas informações. Obrigado por responder!', 'whatsapp' => true];
}

function valid_flow_number(string $value): bool
{
    return (bool)preg_match('/^\d{1,13}(?:[.,]\d{1,2})?$/D', $value)
        && (float)str_replace(',', '.', $value) <= 1000000000000;
}

function clean_ending($raw, bool $conditional = false): array
{
    if (!is_array($raw)) throw new InvalidArgumentException('Encerramento inválido.');
    $defaults = $conditional
        ? ['title' => 'Obrigado pelo interesse.', 'message' => 'Neste momento, esta solução não é a mais indicada para você.', 'whatsapp' => false]
        : default_ending();
    $title = text_value($raw['title'] ?? $defaults['title']);
    $message = text_value($raw['message'] ?? $defaults['message']);
    if ($title === '' || mb_strlen($title) > 150 || mb_strlen($message) > 2000
        || !mb_check_encoding($title . $message, 'UTF-8') || preg_match('/[\x00-\x1F]/u', $title)) {
        throw new InvalidArgumentException('Use um título de encerramento de até 150 caracteres e mensagem de até 2.000.');
    }
    return ['title' => $title, 'message' => $message, 'whatsapp' => !empty($raw['whatsapp'])];
}

function clean_definition(array $rows, string $mode, array $completion): array
{
    if (!in_array($mode, ['all', 'steps'], true)) throw new InvalidArgumentException('Escolha o modo de apresentação.');
    $rows = array_values($rows);
    $fields = clean_fields($rows);
    $positions = array_flip(array_column($fields, 'key'));
    foreach ($fields as $index => &$field) {
        $routes = $rows[$index]['rules'] ?? [];
        if (!is_array($routes) || count($routes) > 20) throw new InvalidArgumentException('Use no máximo 20 condições por pergunta.');
        $field['rules'] = [];
        foreach ($routes as $raw) {
            if (!is_array($raw)) throw new InvalidArgumentException('Condição inválida.');
            $operator = text_value($raw['operator'] ?? '');
            $value = text_value($raw['value'] ?? '');
            $allowed = $field['type'] === 'number' ? ['eq', 'ne', 'lt', 'lte', 'gt', 'gte'] : ['eq', 'ne'];
            if (!in_array($operator, $allowed, true) || $value === '' || mb_strlen($value) > 250 || !mb_check_encoding($value, 'UTF-8')) {
                throw new InvalidArgumentException('Condição de “' . $field['label'] . '”: escolha uma comparação e preencha a resposta.');
            }
            if ($field['type'] === 'select' && !in_array($value, $field['options'], true)) {
                throw new InvalidArgumentException('A resposta da condição precisa existir nas opções de “' . $field['label'] . '”.');
            }
            if ($field['type'] === 'number' && !valid_flow_number($value)) throw new InvalidArgumentException('O valor da comparação numérica é inválido.');
            $route = clean_route($raw, $positions, $index);
            $field['rules'][] = ['operator' => $operator, 'value' => $value] + $route;
        }
        $field['otherwise'] = clean_route($rows[$index]['otherwise'] ?? ['target' => 'next'], $positions, $index);
    }
    unset($field);
    return ['version' => 2, 'mode' => $mode, 'fields' => $fields, 'completion' => clean_ending($completion)];
}

function clean_route($raw, array $positions, int $index): array
{
    if (!is_array($raw)) throw new InvalidArgumentException('Destino inválido.');
    $target = text_value($raw['target'] ?? 'next');
    if (!in_array($target, ['next', 'finish'], true) && (!isset($positions[$target]) || $positions[$target] <= $index)) {
        throw new InvalidArgumentException('Um salto precisa apontar para uma pergunta posterior. Confira as regras após remover ou reordenar perguntas.');
    }
    // Reservar palavras de destino, sem limitar os identificadores dos formulários antigos.
    if ($target === 'finish') return ['target' => $target, 'ending' => clean_ending($raw['ending'] ?? [], true)];
    return ['target' => $target];
}

function flow_matches(array $rule, array $field, string $answer): bool
{
    if ($answer === '') return false; // Ausência de resposta nunca desqualifica por "diferente".
    $expected = $rule['value'];
    if ($field['type'] === 'number') {
        if (!valid_flow_number($answer)) return false;
        $answer = (float)str_replace(',', '.', $answer);
        $expected = (float)str_replace(',', '.', $expected);
    }
    switch ($rule['operator']) {
        case 'eq': return $answer === $expected;
        case 'ne': return $answer !== $expected;
        case 'lt': return $answer < $expected;
        case 'lte': return $answer <= $expected;
        case 'gt': return $answer > $expected;
        case 'gte': return $answer >= $expected;
        default: return false;
    }
}

function flow_route(array $field, string $answer): array
{
    foreach (($field['rules'] ?? []) as $rule) if (flow_matches($rule, $field, $answer)) return $rule;
    return $field['otherwise'] ?? ['target' => 'next'];
}

// Autoridade no servidor: campos pulados e resultados enviados pelo navegador são ignorados.
function validate_flow(array $definition, array $input): array
{
    $fields = $definition['fields'];
    $positions = array_flip(array_column($fields, 'key'));
    $index = 0; $values = []; $errors = []; $email = null; $path = [];
    $outcome = ['kind' => 'completed', 'question' => '', 'ending' => $definition['completion']];
    while (isset($fields[$index])) {
        $field = $fields[$index]; $path[] = $field['key'];
        [$answers, $invalid, $reply] = validate_answers([$field], $input);
        $values = array_merge($values, $answers);
        if ($email === null) $email = $reply;
        if ($invalid) { $errors = $invalid; break; }
        $route = flow_route($field, $answers[0]['value']);
        if ($route['target'] === 'finish') {
            $outcome = ['kind' => 'conditional', 'question' => $field['label'], 'ending' => $route['ending']];
            break;
        }
        $next = $route['target'] === 'next' ? $index + 1 : ($positions[$route['target']] ?? -1);
        if ($next <= $index) throw new RuntimeException('Invalid flow destination');
        $index = $next;
    }
    return [$values, $errors, $email, $outcome, $path];
}

function outcome_value(array $outcome): array
{
    return ['key' => '_flow_outcome', 'label' => 'Resultado do funil', 'value' => $outcome['kind'] === 'conditional'
        ? 'Encerramento condicional em “' . $outcome['question'] . '” — ' . $outcome['ending']['title']
        : 'Concluído — ' . $outcome['ending']['title']];
}

function lead_outcome(string $json): string
{
    foreach (json_decode($json, true, 512, JSON_THROW_ON_ERROR) as $value) {
        if ($value['key'] === '_flow_outcome') return $value['value'];
    }
    return 'Concluído';
}
