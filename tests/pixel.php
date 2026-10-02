<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/pixel.php';
function check_pixel(bool $value): void {if (!$value) throw new RuntimeException('Pixel test failed');}
check_pixel(clean_meta_pixel([]) === ['enabled' => false, 'id' => '']);
check_pixel(active_meta_pixel([]) === '');
$pixel = ['enabled' => true, 'id' => '123456789012345'];
check_pixel(clean_meta_pixel($pixel) === $pixel);
check_pixel(active_meta_pixel(['meta_pixel' => $pixel]) === $pixel['id']);
check_pixel(active_meta_pixel(['meta_pixel' => ['enabled' => false, 'id' => $pixel['id']]]) === '');
foreach ([['enabled' => true], ['id' => '<script>'], ['id' => '123 456'], ['id' => []], ['id' => 123456789], ['id' => str_repeat('1', 26)]] as $bad) {
    try {clean_meta_pixel($bad); throw new RuntimeException('Accepted invalid Pixel');}
    catch (InvalidArgumentException $e) {}
}
echo "OK: Pixel opcional, ID numérico e rejeição de scripts/configuração inválida.\n";
