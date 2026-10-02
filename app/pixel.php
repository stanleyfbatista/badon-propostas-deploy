<?php
declare(strict_types=1);

function clean_meta_pixel($raw): array
{
    if (!is_array($raw)) throw new InvalidArgumentException('Configuração do Pixel inválida.');
    $id = $raw['id'] ?? '';
    if (!is_string($id) || ($id !== '' && !preg_match('/^[1-9][0-9]{4,24}$/D', $id))) {
        throw new InvalidArgumentException('Pixel da Meta: informe apenas o ID numérico, não o código de instalação.');
    }
    $enabled = !empty($raw['enabled']);
    if ($enabled && $id === '') throw new InvalidArgumentException('Preencha o ID do Pixel para ativar o rastreamento.');
    return ['enabled' => $enabled, 'id' => $id];
}

function active_meta_pixel(array $settings): string
{
    $pixel = $settings['meta_pixel'] ?? [];
    return !empty($pixel['enabled']) && is_string($pixel['id'] ?? null)
        && preg_match('/^[1-9][0-9]{4,24}$/D', $pixel['id']) ? $pixel['id'] : '';
}
