<?php
/**
 * API: System health check.
 * Lets a client (and you, when supporting them) see exactly what is
 * wrong with their hosting instead of guessing from a blank page.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

require_once __DIR__ . '/storage.php';

// The report below exposes PHP version, session paths, extension list and
// which storage driver is configured — useful reconnaissance for an
// attacker. It is an admin diagnostic, so it requires a login.
require_once __DIR__ . '/_auth.php';
api_require_token();

$checks = [];

function add_check(&$checks, $id, $label, $ok, $detail, $fix = '', $severity = 'error')
{
    $checks[] = [
        'id'       => $id,
        'label'    => $label,
        'ok'       => (bool) $ok,
        'detail'   => $detail,
        'fix'      => $fix,
        'severity' => $ok ? 'ok' : $severity,
    ];
}

// --- PHP version -------------------------------------------------
$phpOk = version_compare(PHP_VERSION, '7.4', '>=');
add_check($checks, 'php_version', 'إصدار PHP', $phpOk, 'PHP ' . PHP_VERSION,
    $phpOk ? '' : 'يتطلب الموقع PHP 7.4 أو أحدث. اطلب من الاستضافة ترقية الإصدار.');

// --- Writable data directory -------------------------------------
$dataDir = storage_data_dir();
if (!is_dir($dataDir)) { @mkdir($dataDir, 0755, true); }
$dataWritable = is_dir($dataDir) && is_writable($dataDir);
add_check($checks, 'data_writable', 'إمكانية الكتابة في مجلد data', $dataWritable,
    $dataWritable ? 'المجلد قابل للكتابة' : 'المجلد غير قابل للكتابة',
    'غيّر صلاحيات مجلد data إلى 755 أو 775 من مدير الملفات في الاستضافة.');

// --- Writable uploads directory ----------------------------------
$upDir = __DIR__ . '/../uploads';
if (!is_dir($upDir)) { @mkdir($upDir, 0755, true); }
$upWritable = is_dir($upDir) && is_writable($upDir);
// Not fatal: when the folder isn't writable, uploads are stored inside the
// database instead, which is also what makes them survive hosts that wipe
// the filesystem on each deploy.
add_check($checks, 'uploads_writable', 'تخزين الصور المرفوعة', true,
    $upWritable
        ? 'كملفات في مجلد uploads'
        : 'داخل قاعدة البيانات (استضافتك لا تحتفظ بالملفات) — الحد الأقصى 2 ميجابايت للصورة',
    '', 'warning');

// --- Sessions working --------------------------------------------
$sessOk = false;
$sessDetail = '';
if (session_status() === PHP_SESSION_NONE) { @session_start(); }
if (session_status() === PHP_SESSION_ACTIVE) {
    $_SESSION['__healthcheck'] = 'ok';
    $sessOk = isset($_SESSION['__healthcheck']);
    $savePath = session_save_path();
    $sessDetail = 'الجلسات تعمل' . ($savePath ? " (مسار الحفظ: {$savePath})" : '');
    unset($_SESSION['__healthcheck']);
} else {
    $sessDetail = 'تعذر بدء الجلسة — تسجيل الدخول لن يعمل';
}
add_check($checks, 'sessions', 'جلسات PHP (تسجيل الدخول)', $sessOk, $sessDetail,
    'تأكد أن مجلد الجلسات قابل للكتابة، أو اطلب من الدعم الفني تفعيل session.save_path.');

// --- Credentials file protected ----------------------------------
$authFile = storage_data_dir() . '/admin_auth.php';
add_check($checks, 'auth_file', 'ملف بيانات الدخول', file_exists($authFile),
    file_exists($authFile) ? 'موجود ومشفّر (bcrypt)' : 'لم يُنشأ بعد (سيُنشأ عند أول تسجيل دخول)',
    '', 'warning');

// --- Storage driver ----------------------------------------------
$settings = storage_settings();
$drivers  = storage_available_drivers();
$driverOk = ($settings['driver'] === 'sqlite') && !empty($drivers['sqlite']);
add_check($checks, 'storage_driver', 'نوع التخزين الحالي', $driverOk,
    'المستخدم حالياً: ' . ($settings['driver'] === 'sqlite' ? 'SQLite' : 'ملف JSON (احتياطي)'),
    $driverOk ? '' : 'فعّل SQLite من صفحة الربط في لوحة التحكم.');

// --- Can we actually read/write site data? -----------------------
$rw = false;
$rwDetail = '';
try {
    $probe = storage_read();
    $probe['__healthcheck'] = time();
    $wrote = storage_write($probe);
    $back  = storage_read();
    $rw = $wrote && isset($back['__healthcheck']);
    unset($back['__healthcheck']);
    storage_write($back);
    $rwDetail = $rw ? 'القراءة والكتابة تعملان' : 'فشلت الكتابة الفعلية';
} catch (Exception $e) {
    $rwDetail = 'خطأ: ' . $e->getMessage();
}
add_check($checks, 'storage_rw', 'قراءة وكتابة بيانات الموقع', $rw, $rwDetail,
    'تحقق من صلاحيات مجلد data أو من بيانات الاتصال بقاعدة البيانات.');

// --- Optional extensions -----------------------------------------
add_check($checks, 'pdo_sqlite', 'دعم SQLite', !empty($drivers['sqlite']),
    !empty($drivers['sqlite']) ? 'متاح' : 'غير متاح على هذه الاستضافة',
    'الموقع يخزّن بياناته في SQLite. اطلب من الاستضافة تفعيل إضافة pdo_sqlite.');
// Files must survive a restart, otherwise the SQLite database and the
// admin password are wiped every time the server restarts.
$dataDirPersistent = file_exists(storage_data_dir() . '/db_config.json')
    || file_exists(storage_data_dir() . '/admin_auth.php');
add_check($checks, 'persistent_fs', 'ثبات ملفات مجلد data', $dataDirPersistent,
    $dataDirPersistent
        ? 'توجد ملفات محفوظة سابقاً — التخزين يبدو دائماً'
        : 'لا توجد ملفات محفوظة — قد تكون الاستضافة تمسح الملفات عند إعادة التشغيل',
    'استخدم استضافة تحتفظ بالملفات (قرص دائم). بدونها تضيع الإعدادات وكلمة المرور مع كل إعادة تشغيل.',
    'warning');
add_check($checks, 'mbstring', 'إضافة mbstring', function_exists('mb_strlen'),
    function_exists('mb_strlen') ? 'متاحة' : 'غير متاحة (يعمل الموقع ببديل تلقائي)',
    '', 'warning');
add_check($checks, 'finfo', 'إضافة finfo (فحص أنواع الصور)', function_exists('finfo_open'),
    function_exists('finfo_open') ? 'متاحة' : 'غير متاحة (يُستخدم بديل تلقائي)',
    '', 'warning');

// --- HTTPS -------------------------------------------------------
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
add_check($checks, 'https', 'الاتصال المشفّر HTTPS', $isHttps,
    $isHttps ? 'الموقع يعمل عبر HTTPS' : 'الموقع يعمل عبر HTTP غير المشفّر',
    'فعّل شهادة SSL المجانية من لوحة الاستضافة. بدونها تنتقل كلمة المرور بدون تشفير.',
    'warning');

// Build stamp: lets you confirm at a glance whether the deployed files
// are the current ones, instead of guessing from behaviour.
add_check($checks, 'build', 'إصدار الملفات المرفوعة', file_exists(__DIR__ . '/../debug.php'),
    file_exists(__DIR__ . '/../debug.php') ? 'النسخة الحديثة (v48)' : 'نسخة قديمة — لم يتم رفع كل الملفات',
    'ارفع كل ملفات النسخة الجديدة على الاستضافة (وعلى Render: ادفع التغييرات إلى GitHub ثم أعد النشر).');

$errors   = count(array_filter($checks, fn($c) => $c['severity'] === 'error'));
$warnings = count(array_filter($checks, fn($c) => $c['severity'] === 'warning'));

echo json_encode([
    'success'  => true,
    'errors'   => $errors,
    'warnings' => $warnings,
    'checks'   => $checks,
], JSON_UNESCAPED_UNICODE);
