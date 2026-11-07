<?php
/**
 * API: Upload Image Files (Cards & Logos)
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
api_require_token();

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0775, true);
}
// Some hosts (Render, Heroku, and anything with a read-only or ephemeral
// filesystem) can't keep uploaded files at all. Detect that up front so we
// can fall back to storing the image in the database instead of failing.
$canWriteFiles = is_dir($uploadDir) && is_writable($uploadDir);

// Locate uploaded file in $_FILES
$fileKey = null;
if (isset($_FILES['file'])) {
    $fileKey = 'file';
} elseif (isset($_FILES['image'])) {
    $fileKey = 'image';
} elseif (!empty($_FILES)) {
    $keys = array_keys($_FILES);
    $fileKey = $keys[0];
}

if (!$fileKey || !isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
    $errorCode = isset($_FILES[$fileKey]['error']) ? $_FILES[$fileKey]['error'] : 'Unknown';
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'لم يتم إرسال ملف صالح أو حدث خطأ أثناء الرفع. رمز الخطأ: ' . $errorCode], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES[$fileKey];

// Validate file size (Max 10 MB)
if ($file['size'] > 10 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate MIME type and extension
$allowedMimes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'image/svg+xml' => 'svg'
];

// Detect the real MIME type. finfo is the reliable way, but it isn't
// enabled on every shared host — fall back to getimagesize() so image
// uploads keep working instead of fataling.
$mime = null;
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    }
}
if (!$mime && function_exists('getimagesize')) {
    $info = @getimagesize($file['tmp_name']);
    if (is_array($info) && !empty($info['mime'])) {
        $mime = $info['mime'];
    }
}
// SVG is XML, so getimagesize() can't identify it. Sniff it directly.
if (!$mime) {
    $head = (string) @file_get_contents($file['tmp_name'], false, null, 0, 512);
    if (stripos($head, '<svg') !== false) {
        $mime = 'image/svg+xml';
    }
}

if (!isset($allowedMimes[$mime])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'نوع الملف غير مدعوم. يسمح بالصور فقط (JPG, PNG, WEBP, GIF, SVG).'], JSON_UNESCAPED_UNICODE);
    exit;
}

$ext = $allowedMimes[$mime];
$prefix = isset($_POST['type']) && preg_match('/^[a-zA-Z0-9_-]+$/', $_POST['type']) ? $_POST['type'] : 'img';
// random_bytes is available on PHP 7+; keep a fallback just in case.
if (function_exists('random_bytes')) {
    $rand = bin2hex(random_bytes(4));
} else {
    $rand = substr(md5(uniqid((string) mt_rand(), true)), 0, 8);
}
$filename = $prefix . '_' . time() . '_' . substr($rand, 0, 8) . '.' . $ext;
$targetPath = $uploadDir . $filename;

// Preferred path: a real file on disk (small pages, browser-cacheable).
if ($canWriteFiles && @move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        'success'  => true,
        'url'      => 'uploads/' . $filename,
        'filename' => $filename,
        'storage'  => 'file',
        'message'  => 'تم رفع الصورة وحفظها على الخادم.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Fallback: embed the image in the site data itself, so it lives in the
// database alongside everything else. This is what makes uploads survive
// hosts that wipe the filesystem on every deploy.
$bytes = @file_get_contents($file['tmp_name']);
if ($bytes === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'تعذر قراءة الملف المرفوع.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Base64 inflates by ~33% and the whole document is stored as one row,
// so keep embedded images modest.
if (strlen($bytes) > 2 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'استضافتك لا تسمح بحفظ الملفات، لذا تُحفظ الصور داخل قاعدة البيانات بحد أقصى 2 ميجابايت. يرجى ضغط الصورة أو استخدام رابط صورة خارجي.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$dataUrl = 'data:' . $mime . ';base64,' . base64_encode($bytes);

echo json_encode([
    'success'  => true,
    'url'      => $dataUrl,
    'filename' => $filename,
    'storage'  => 'database',
    'message'  => 'تم حفظ الصورة داخل قاعدة البيانات (استضافتك لا تحتفظ بالملفات).'
], JSON_UNESCAPED_UNICODE);
