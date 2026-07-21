<?php
declare(strict_types=1);

function painel_pix_qr_image_data_url(string $pixCode): string
{
    $pixCode = trim($pixCode);
    if ($pixCode === '') {
        return '';
    }

    $svg = painel_pix_qr_svg_with_qrencode($pixCode);
    if ($svg === '') {
        return '';
    }

    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}

function painel_pix_qr_svg_with_qrencode(string $pixCode): string
{
    if (!function_exists('proc_open')) {
        return '';
    }

    $binary = painel_qrencode_binary();
    if ($binary === '') {
        return '';
    }

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $process = @proc_open([$binary, '-t', 'SVG', '-m', '2', '-o', '-'], $descriptors, $pipes);
    if (!is_resource($process)) {
        return '';
    }

    fwrite($pipes[0], $pixCode);
    fclose($pipes[0]);

    $svg = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);
    if ($exitCode !== 0 || !is_string($svg) || stripos($svg, '<svg') === false) {
        return '';
    }

    return painel_pix_qr_normalize_svg($svg);
}

function painel_qrencode_binary(): string
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    foreach (['/usr/bin/qrencode', '/usr/local/bin/qrencode', 'qrencode'] as $candidate) {
        if ($candidate !== 'qrencode' && !is_executable($candidate)) {
            continue;
        }
        $cached = $candidate;
        return $cached;
    }

    $cached = '';
    return $cached;
}

function painel_pix_qr_normalize_svg(string $svg): string
{
    $svg = trim($svg);
    $svg = preg_replace('/<\?xml[^>]*>\s*/i', '', $svg) ?? $svg;
    $svg = preg_replace('/<!DOCTYPE[^>]*>\s*/i', '', $svg) ?? $svg;
    $svg = str_replace('#000000', '#07111f', $svg);
    $svg = str_replace('#FFFFFF', '#ffffff', $svg);
    return $svg;
}
