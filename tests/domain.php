<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/domain.php';
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
$fields = clean_fields([
    ['key' => 'nome', 'label' => 'Nome', 'type' => 'text', 'required' => true],
    ['key' => 'email', 'label' => 'E-mail', 'type' => 'email', 'required' => true],
    ['key' => 'telefone', 'label' => 'Telefone', 'type' => 'tel'],
    ['key' => 'tipo', 'label' => 'Tipo', 'type' => 'select', 'required' => true, 'options' => "Local\nInfoproduto"],
    ['key' => 'detalhes', 'label' => 'Detalhes', 'type' => 'textarea'],
]);
[$values, $errors, $email] = validate_answers($fields, ['nome' => 'Teste', 'email' => 'lead@example.invalid', 'telefone' => '+55 (19) 99999-9999', 'tipo' => 'Local', 'detalhes' => "Linha 1\nLinha 2"]);
check(!$errors && $email === 'lead@example.invalid' && count($values) === 5, 'Valid answers');
foreach ([['email' => "a@b.com\r\nBcc: c@d.com"], ['nome' => ['x']], ['telefone' => 'abc'], ['tipo' => 'forjado']] as $bad) {
    [, $errors] = validate_answers($fields, array_merge(['nome' => 'N', 'email' => 'a@b.com', 'tipo' => 'Local'], $bad));
    check((bool)$errors, 'Invalid answer rejected');
}
try { clean_fields([['key' => 'x', 'label' => 'X', 'type' => 'file']]); throw new RuntimeException('Invalid type accepted'); } catch (InvalidArgumentException $expected) {}
try { clean_fields([$fields[0], $fields[0]]); throw new RuntimeException('Duplicate key accepted'); } catch (InvalidArgumentException $expected) {}
check(csv_safe('=HYPERLINK("x")')[0] === "'", 'CSV formula protection');
check(csv_safe("  +123")[0] === "'", 'CSV whitespace protection');
check(csv_safe('Nome') === 'Nome', 'Normal CSV unchanged');
$url = whatsapp_url(['whatsapp_number' => '5511999999999'], 'Tráfego local', '');
check(str_contains($url, urlencode('Oi, acabei de preencher o formulário Tráfego local')), 'Default WhatsApp text');
check(str_contains(whatsapp_url(['whatsapp_number' => '5511999999999'], 'X', 'Quero saber mais!'), 'Quero+saber+mais%21'), 'Custom WhatsApp text');
echo "OK: validação de campos, tipos, opções, injeção de cabeçalho, CSV e WhatsApp.\n";
