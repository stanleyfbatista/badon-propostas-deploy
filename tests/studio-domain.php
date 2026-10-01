<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/domain.php';
require dirname(__DIR__) . '/app/studio-public.php';
function check(bool $value): void { if (!$value) throw new RuntimeException('Studio assertion failed'); }
foreach (['127.0.0.1','10.1.2.3','192.168.1.2','169.254.169.254','100.64.0.1','198.18.0.1','224.0.0.1','0.0.0.0','::1','::ffff:127.0.0.1','192.0.2.9'] as $ip) check(!studio_public_ip($ip));
check(studio_public_ip('8.8.8.8'));
foreach (['http://example.com','https://user:password@example.com','https://127.0.0.1','https://example.com:8080/','https://example.com/#secret'] as $url) {
    try { studio_webhook_host($url); throw new RuntimeException('Unsafe URL accepted'); } catch (InvalidArgumentException $e) {}
}
check(studio_webhook_host('https://hooks.example.com/receive?account=1') === 'hooks.example.com');
check(studio_interpolate('Olá, @nome. @ausente', [['key'=>'nome','value'=>'<script>']]) === 'Olá, <script>. @ausente');
$fields = clean_fields([
    ['key'=>'multi','label'=>'Serviços','type'=>'multiple','required'=>true,'options'=>['Site','Tráfego']],
    ['key'=>'data','label'=>'Quando','type'=>'date','required'=>true],
    ['key'=>'site','label'=>'Website','type'=>'url','required'=>false]
]);
[$values,$errors] = validate_answers($fields,['multi'=>['Site','Tráfego'],'data'=>'2026-10-01','site'=>'https://example.com']);
check(!$errors && $values[0]['value']==='Site, Tráfego');
foreach ([['multi'=>'Site','data'=>'2026-10-01'],['multi'=>['Inventado'],'data'=>'2026-10-01'],['multi'=>['Site'],'data'=>'2026-02-31'],['multi'=>['Site'],'data'=>'2026-10-01','site'=>'javascript:alert(1)']] as $answers) check((bool)validate_answers($fields,$answers)[1]);
echo "OK: novos tipos, datas, interpolação, validação de webhook e bloqueio de redes internas/especiais.\n";
