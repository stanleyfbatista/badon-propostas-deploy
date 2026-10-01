<?php
declare(strict_types=1);

function validate_config(array $c): void
{
    if (!in_array($c['environment'] ?? '', ['production', 'development'], true)
        || !preg_match('/^[a-f0-9]{64}$/', $c['app_key'] ?? '')
        || !preg_match('/^[1-9][0-9]{9,14}$/', $c['whatsapp_number'] ?? '')
        || !filter_var($c['privacy']['contact_email'] ?? '', FILTER_VALIDATE_EMAIL)
        || empty($c['privacy']['controller'])
        || (int)($c['privacy']['retention_days'] ?? 0) < 1
        || !in_array($c['timezone'] ?? '', timezone_identifiers_list(), true)) {
        throw new RuntimeException('Invalid private configuration');
    }
    $base = parse_url($c['base_url'] ?? '');
    if (!$base || empty($base['host']) || isset($base['user']) || isset($base['query'])
        || !in_array($base['scheme'] ?? '', ['http', 'https'], true)
        || (($base['path'] ?? '') !== '')
        || ($c['environment'] === 'production' && $base['scheme'] !== 'https')) {
        throw new RuntimeException('Invalid base URL');
    }
    $privacy = $c['privacy_url'] ?? '';
    if (!preg_match('#^/[a-zA-Z0-9/_-]+/?$#', $privacy) || strlen($privacy) > 500) {
        throw new RuntimeException('Use a local privacy policy URL');
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $c['db']['name'] ?? '') || empty($c['db']['host']) || empty($c['db']['user'])) {
        throw new RuntimeException('Invalid database settings');
    }
    foreach (['from_email', 'to_email'] as $key) {
        if (!filter_var($c['smtp'][$key] ?? '', FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Invalid mail address');
        }
    }
    $modes = $c['environment'] === 'production' ? ['smtps', 'tls'] : ['smtps', 'tls', 'none'];
    if (!in_array($c['smtp']['encryption'] ?? '', $modes, true) || empty($c['smtp']['host']) || empty($c['smtp']['port'])) {
        throw new RuntimeException('Invalid SMTP settings');
    }
    if ($c['environment'] === 'production' && (empty($c['smtp']['username']) || empty($c['smtp']['password']))) {
        throw new RuntimeException('Production SMTP requires authentication');
    }
}

function text_value($value): string
{
    return is_string($value) ? trim($value) : '';
}

function clean_fields(array $rows): array
{
    if (count($rows) < 1 || count($rows) > 30) {
        throw new InvalidArgumentException('Use entre 1 e 30 campos.');
    }
    $fields = [];
    $keys = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            throw new InvalidArgumentException('Campo inválido.');
        }
        $key = text_value($row['key'] ?? '');
        $label = text_value($row['label'] ?? '');
        $type = text_value($row['type'] ?? '');
        if (!preg_match('/^[a-z][a-z0-9_]{0,39}$/', $key) || isset($keys[$key])) {
            throw new InvalidArgumentException('Identificadores precisam ser únicos, sem espaços ou acentos, começando por letra.');
        }
        if ($label === '' || mb_strlen($label) > 100 || preg_match('/[\x00-\x1F]/u', $label)) {
            throw new InvalidArgumentException('Dê a cada campo um título de até 100 caracteres.');
        }
        if (!in_array($type, ['text', 'email', 'tel', 'select', 'textarea'], true)) {
            throw new InvalidArgumentException('Tipo de campo inválido.');
        }
        $options = [];
        if ($type === 'select') {
            $raw = $row['options'] ?? '';
            $raw = is_array($raw) ? $raw : preg_split('/\R/u', text_value($raw));
            foreach ($raw as $option) {
                if (!is_string($option)) {
                    throw new InvalidArgumentException('Opção inválida.');
                }
                $option = trim($option);
                if ($option === '') continue;
                if (mb_strlen($option) > 150 || preg_match('/[\x00-\x1F]/u', $option)) {
                    throw new InvalidArgumentException('Cada opção deve ter até 150 caracteres.');
                }
                $options[] = $option;
            }
            $options = array_values(array_unique($options));
            if (!$options || count($options) > 50) {
                throw new InvalidArgumentException('Seleção precisa de 1 a 50 opções, uma por linha.');
            }
        }
        $keys[$key] = true;
        $fields[] = ['key' => $key, 'label' => $label, 'type' => $type, 'required' => !empty($row['required']), 'options' => $options];
    }
    return $fields;
}

function validate_answers(array $fields, array $input): array
{
    $errors = []; $values = []; $email = null;
    foreach ($fields as $field) {
        $key = $field['key'];
        $raw = $input[$key] ?? '';
        $value = text_value($raw);
        $limit = $field['type'] === 'textarea' ? 5000 : ($field['type'] === 'email' ? 254 : 250);
        if (!is_string($raw) || !mb_check_encoding($value, 'UTF-8') || mb_strlen($value) > $limit || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
            $errors[$key] = 'Valor inválido ou muito longo.';
        } elseif ($field['required'] && $value === '') {
            $errors[$key] = 'Preencha este campo.';
        } elseif ($value !== '' && $field['type'] === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $errors[$key] = 'Informe um e-mail válido.';
        } elseif ($value !== '' && $field['type'] === 'tel' && (!preg_match('/^[+0-9().\s-]+$/', $value) || strlen(preg_replace('/\D/', '', $value)) < 8 || strlen(preg_replace('/\D/', '', $value)) > 15)) {
            $errors[$key] = 'Informe telefone com DDD (8 a 15 dígitos).';
        } elseif ($value !== '' && $field['type'] === 'select' && !in_array($value, $field['options'], true)) {
            $errors[$key] = 'Escolha uma das opções disponíveis.';
        } elseif ($field['type'] !== 'textarea' && preg_match('/[\r\n]/', $value)) {
            $errors[$key] = 'Use apenas uma linha.';
        }
        if (!isset($errors[$key]) && $field['type'] === 'email' && $value !== '' && $email === null) $email = $value;
        $values[] = ['key' => $key, 'label' => $field['label'], 'value' => $value];
    }
    return [$values, $errors, $email];
}

function consent_text(string $title): string
{
    return 'Li a Política de Privacidade e autorizo a Produtora Bādon a tratar os dados informados para responder à minha solicitação no formulário “' . $title . '” e entrar em contato comigo sobre ela. Sei que posso revogar este consentimento pelo canal informado na política.';
}

function whatsapp_url(array $config, string $title, string $message): string
{
    $message = trim($message) !== '' ? $message : 'Oi, acabei de preencher o formulário ' . $title;
    return 'https://wa.me/' . $config['whatsapp_number'] . '?text=' . urlencode($message);
}

function csv_safe(string $value): string
{
    // Impedir execução de fórmulas ao abrir o CSV no Excel/LibreOffice.
    if (preg_match('/^[\s\x00-\x1F]*[=+@-]/u', $value) || preg_match('/^[\t\r\n]/', $value)) return "'" . $value;
    return $value;
}
