<?php
/**
 * API: Get Site Data & Check Updates
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Token');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/storage.php';

$data = storage_read();

// Seed defaults on a brand-new install so the site is never empty.
if (!is_array($data) || empty($data)) {
    $data = [
        'last_modified' => time(),
        'config' => [
            'companyName' => 'بطاقات التهنئة',
            'primaryColor' => '#caaa98',
            'btnTextColor' => '#202940',
            'textColor' => '#ffffff',
            'fontFamily' => 'Cairo',
            'logoUrl' => 'img/logo.jpg',
            'logoPosition' => 'right',
            'buttonsPosition' => 'left',
            'decoration' => 'none',
            'decorationColor' => '#ffffff',
            'decorationOpacity' => '0.15',
            'hfColor1' => '#202940',
            'hfColor2' => '#4b4038',
            'mainSiteUrl' => '',
            'whatsapp' => '',
            'twitter' => '',
            'instagram' => '',
            'youtube' => '',
            'salla' => '',
            'blog' => ''
        ],
        'cards' => [
            [
                'src' => 'https://i.postimg.cc/Y92P6tjw/image.png',
                'bottom' => '10%',
                'right' => '0%'
            ],
            [
                'src' => 'https://i.postimg.cc/D0hPcv4D/image.png',
                'bottom' => '10%',
                'right' => '0%'
            ],
            [
                'src' => 'https://i.postimg.cc/SNPRCZ9K/image.png',
                'bottom' => '25%',
                'right' => '0%'
            ]
        ],
        'stats' => [
            'views' => 0,
            'previews' => 0,
            'downloads' => 0
        ],
        'cardStats' => new stdClass()
    ];
    storage_write($data);
}

$lastModified = isset($data['last_modified']) ? (int) $data['last_modified'] : time();

// Lightweight check mode for fast polling
if (isset($_GET['check']) && $_GET['check'] == '1') {
    $since = isset($_GET['since']) ? (int) $_GET['since'] : 0;
    echo json_encode([
        'success'       => true,
        'modified'      => ($lastModified > $since),
        'last_modified' => $lastModified
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success'       => true,
    'last_modified' => $lastModified,
    'storage'       => storage_settings()['driver'],
    'config'        => isset($data['config']) ? $data['config'] : [],
    'cards'         => isset($data['cards']) ? $data['cards'] : [],
    'stats'         => isset($data['stats']) ? $data['stats'] : ['views' => 0, 'previews' => 0, 'downloads' => 0],
    'cardStats'     => isset($data['cardStats']) ? $data['cardStats'] : new stdClass()
], JSON_UNESCAPED_UNICODE);
