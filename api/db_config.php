<?php
/**
 * API: Storage configuration.
 * ------------------------------------------------------------
 * The site stores its data in a SQLite database file. This endpoint
 * lets the control panel check that the host supports it, switch the
 * site over to it, and carry the existing content across.
 *
 * GET  -> current driver + whether this host supports SQLite
 * POST -> {action: "test"}  verify SQLite works, change nothing
 *         {action: "save"}  verify, switch to SQLite, migrate data
 */
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/storage.php';

// Reading or changing where the site's data lives is an admin action.
require_once __DIR__ . '/_auth.php';
api_require_token();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $s = storage_settings();
    echo json_encode(array(
        'success'   => true,
        'driver'    => $s['driver'],
        'available' => storage_available_drivers(),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array(
        'success' => false,
        'message' => 'طريقة الطلب غير مسموح بها.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = array();
}

$action = isset($input['action']) ? (string) $input['action'] : 'save';

// Always verify SQLite really works before committing to it, so a
// client can never end up with a site that cannot save anything.
try {
    $pdo = storage_pdo();
    $pdo->query('SELECT 1');
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'فشل تشغيل SQLite: ' . $e->getMessage(),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'test') {
    echo json_encode(array(
        'success' => true,
        'message' => 'SQLite يعمل على استضافتك ✅',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

// Read the current content BEFORE switching, then write it again
// afterwards, so moving to SQLite never appears to wipe the site.
$existingData = storage_read();

if (!storage_save_settings(array('driver' => 'sqlite'))) {
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'message' => 'تعذر حفظ الإعدادات (تحقق من صلاحيات مجلد data).',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if (is_array($existingData) && !empty($existingData)) {
    storage_write($existingData);
}

echo json_encode(array(
    'success' => true,
    'driver'  => 'sqlite',
    'message' => 'تم التفعيل ونقل بياناتك إلى SQLite بنجاح ✅',
), JSON_UNESCAPED_UNICODE);
