<?php
/**
 * API: Save Site Data (Config, Cards, Stats)
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Token');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'طريقة الطلب غير مسموح بها. يجب استخدام POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/storage.php';
api_require_token();

// Read incoming JSON body
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'البيانات المرسلة غير صحيحة.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Load existing data from whichever database is configured
$currentData = storage_read();
if (!is_array($currentData)) {
    $currentData = [];
}

// Update config if provided
if (isset($input['config']) && is_array($input['config'])) {
    if (!isset($currentData['config']) || !is_array($currentData['config'])) {
        $currentData['config'] = [];
    }
    foreach ($input['config'] as $key => $val) {
        $currentData['config'][$key] = $val;
    }
}

// Update cards if provided
if (isset($input['cards']) && is_array($input['cards'])) {
    $currentData['cards'] = $input['cards'];
}

// Update stats if provided
if (isset($input['stats']) && is_array($input['stats'])) {
    $currentData['stats'] = $input['stats'];
}

// Update cardStats if provided
if (isset($input['cardStats'])) {
    $currentData['cardStats'] = $input['cardStats'];
}

// Update last modified timestamp
$newTime = time();
$currentData['last_modified'] = $newTime;

// Persist through the storage layer (SQLite, mirrored to a JSON file)
$saved = storage_write($currentData);

if ($saved === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'فشل حفظ الملف على الخادم. يرجى التحقق من أذونات المجلد.'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true,
    'last_modified' => $newTime,
    'message' => 'تم حفظ البيانات بنجاح على الخادم.'
], JSON_UNESCAPED_UNICODE);
