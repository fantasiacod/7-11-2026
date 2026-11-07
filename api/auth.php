<?php
/**
 * API: Real server-side authentication.
 * ------------------------------------------------------------
 * Credentials live in data/admin_auth.php, with the password
 * stored only as a
 * bcrypt hash — never in plain text, never in localStorage.
 *
 * Login state is a real PHP session cookie, so the browser cannot
 * fake it by editing localStorage.
 *
 * Actions:
 *   GET  ?action=check    -> is the current visitor logged in?
 *   POST ?action=login    -> {username, password}
 *   POST ?action=logout
 *   POST ?action=change   -> {currentPassword, newUsername, newPassword}
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Session cookie hardening. Secure flag only when actually on HTTPS,
// otherwise the cookie would be silently dropped on plain-http hosts.
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $isHttps,
        'samesite' => 'Lax',
    ]);
    session_start();
}

require_once __DIR__ . '/storage.php';

const AUTH_KEY            = 'admin_auth';
const AUTH_DEFAULT_USER   = 'admin';
const AUTH_DEFAULT_PASS   = 'admin';
const AUTH_IDLE_TIMEOUT   = 1800;   // 30 minutes
const AUTH_MAX_ATTEMPTS   = 8;
const AUTH_LOCKOUT_WINDOW = 900;    // 15 minutes

/**
 * Credentials live in their own .php file rather than inside the
 * JSON data document.
 *
 * Why: .htaccess rules don't apply on every host (nginx, or Apache
 * with AllowOverride off), so a plain .json file in data/ can be
 * downloaded directly over HTTP. A .php file is EXECUTED instead of
 * served, so requesting it returns nothing — the hash can't be
 * grabbed for offline cracking regardless of server config.
 */
function auth_file_path()
{
    require_once __DIR__ . '/storage.php';
    return storage_data_dir() . '/admin_auth.php';
}

/**
 * The credentials file is a .php file whose first line exits, so a direct
 * HTTP request to it returns nothing on any server configuration. The
 * payload after that line is plain JSON.
 *
 * It is read with file_get_contents rather than include() on purpose:
 * include() goes through PHP's opcache, which kept serving the previous
 * contents after a password change, so the new credentials silently
 * failed while the old ones still worked.
 */
function auth_read_file()
{
    $path = auth_file_path();
    if (!file_exists($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    // Drop the PHP guard line, keep the JSON payload.
    $pos = strpos($raw, "\n");
    $json = ($pos === false) ? '' : substr($raw, $pos + 1);
    $data = json_decode(trim($json), true);
    return is_array($data) ? $data : null;
}

function auth_write_file(array $auth)
{
    storage_ensure_data_dir();
    $path = auth_file_path();
    $payload = "<?php exit; ?>\n" . json_encode($auth, JSON_UNESCAPED_SLASHES);

    // Write to a temp file then rename, so a reader can never observe a
    // half-written credentials file.
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $payload, LOCK_EX) === false) {
        return false;
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    // Belt and braces in case anything else ever includes this path.
    if (function_exists('opcache_invalidate')) {
        @opcache_invalidate($path, true);
    }
    return true;
}

function auth_load()
{
    $auth = auth_read_file();
    if ($auth && !empty($auth['password_hash'])) {
        return $auth;
    }

    // Migrate credentials that an older build stored inside the JSON doc.
    $data = storage_read();
    if (isset($data[AUTH_KEY]) && is_array($data[AUTH_KEY]) && !empty($data[AUTH_KEY]['password_hash'])) {
        $migrated = $data[AUTH_KEY];
        auth_write_file($migrated);
        unset($data[AUTH_KEY]);
        storage_write($data);
        return $migrated;
    }

    // First run: seed the default admin/admin account.
    $seed = [
        'username'      => AUTH_DEFAULT_USER,
        'password_hash' => password_hash(AUTH_DEFAULT_PASS, PASSWORD_DEFAULT),
        'is_default'    => true,
        'attempts'      => 0,
        'locked_until'  => 0,
    ];
    auth_write_file($seed);
    return $seed;
}

function auth_save(array $auth)
{
    return auth_write_file($auth);
}

function auth_is_logged_in()
{
    if (empty($_SESSION['admin_logged_in'])) {
        return false;
    }
    // Idle timeout
    if (isset($_SESSION['admin_last_seen']) && (time() - $_SESSION['admin_last_seen']) > AUTH_IDLE_TIMEOUT) {
        auth_destroy_session();
        return false;
    }
    $_SESSION['admin_last_seen'] = time();
    return true;
}

function auth_destroy_session()
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    @session_destroy();
}

function auth_json($payload, $code = 200)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Length check that doesn't require the mbstring extension —
 * many cheap shared hosts ship without it, and a missing
 * mb_strlen() would fatal the whole login system.
 */
function auth_len($str)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($str, 'UTF-8');
    }
    // Counts UTF-8 characters, not bytes.
    return strlen(preg_replace('/[\x80-\xBF]/', '', $str));
}

$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : 'check';
$input  = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

// ---------------------------------------------------------------
if ($action === 'check') {
    $auth = auth_load();
    auth_json([
        'success'        => true,
        'authenticated'  => auth_is_logged_in(),
        'username'       => auth_is_logged_in() ? $auth['username'] : null,
        'using_defaults' => !empty($auth['is_default']),
    ]);
}

// ---------------------------------------------------------------
if ($action === 'login') {
    $auth = auth_load();

    $lockedUntil = isset($auth['locked_until']) ? (int) $auth['locked_until'] : 0;
    if ($lockedUntil > time()) {
        $mins = (int) ceil(($lockedUntil - time()) / 60);
        auth_json([
            'success' => false,
            'message' => "تم إيقاف المحاولات مؤقتاً بسبب محاولات دخول خاطئة كثيرة. حاول بعد {$mins} دقيقة.",
        ], 429);
    }

    $u = isset($input['username']) ? trim((string) $input['username']) : '';
    $p = isset($input['password']) ? (string) $input['password'] : '';

    $userOk = hash_equals((string) $auth['username'], $u);
    $passOk = password_verify($p, (string) $auth['password_hash']);

    if ($userOk && $passOk) {
        session_regenerate_id(true); // prevent session fixation
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user']      = $auth['username'];
        $_SESSION['admin_last_seen'] = time();

        $auth['attempts']     = 0;
        $auth['locked_until'] = 0;
        auth_save($auth);

        auth_json([
            'success'        => true,
            'message'        => 'تم تسجيل الدخول بنجاح',
            'using_defaults' => !empty($auth['is_default']),
        ]);
    }

    // Failed attempt: count it and lock out after too many.
    $auth['attempts'] = (isset($auth['attempts']) ? (int) $auth['attempts'] : 0) + 1;
    if ($auth['attempts'] >= AUTH_MAX_ATTEMPTS) {
        $auth['locked_until'] = time() + AUTH_LOCKOUT_WINDOW;
        $auth['attempts']     = 0;
    }
    auth_save($auth);

    // Deliberately vague: don't reveal which field was wrong.
    auth_json(['success' => false, 'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة'], 401);
}

// ---------------------------------------------------------------
if ($action === 'logout') {
    auth_destroy_session();
    auth_json(['success' => true, 'message' => 'تم تسجيل الخروج']);
}

// ---------------------------------------------------------------
if ($action === 'change') {
    if (!auth_is_logged_in()) {
        auth_json(['success' => false, 'message' => 'غير مصرح. يرجى تسجيل الدخول أولاً.'], 401);
    }

    $auth = auth_load();

    $current     = isset($input['currentPassword']) ? (string) $input['currentPassword'] : '';
    $newUsername = isset($input['newUsername']) ? trim((string) $input['newUsername']) : '';
    $newPassword = isset($input['newPassword']) ? (string) $input['newPassword'] : '';

    // Always require the current password to change anything.
    if (!password_verify($current, (string) $auth['password_hash'])) {
        auth_json(['success' => false, 'message' => 'كلمة المرور الحالية غير صحيحة'], 403);
    }

    if ($newUsername !== '') {
        if (auth_len($newUsername) < 3 || !preg_match('/^[A-Za-z0-9._@-]+$/', $newUsername)) {
            auth_json(['success' => false, 'message' => 'اسم المستخدم يجب أن يكون 3 أحرف أو أكثر (حروف وأرقام إنجليزية فقط).'], 400);
        }
        $auth['username'] = $newUsername;
    }

    if ($newPassword !== '') {
        if (auth_len($newPassword) < 8) {
            auth_json(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'], 400);
        }
        if (strtolower($newPassword) === 'admin' || $newPassword === '12345678') {
            auth_json(['success' => false, 'message' => 'كلمة المرور ضعيفة جداً، اختر كلمة مرور أقوى.'], 400);
        }
        $auth['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    if ($newUsername === '' && $newPassword === '') {
        auth_json(['success' => false, 'message' => 'لم يتم إدخال أي تغيير.'], 400);
    }

    // No longer running on the shipped defaults.
    $auth['is_default'] = false;

    if (!auth_save($auth)) {
        auth_json(['success' => false, 'message' => 'تعذر حفظ البيانات في قاعدة البيانات.'], 500);
    }

    // Force a fresh login with the new credentials.
    auth_destroy_session();

    auth_json([
        'success' => true,
        'message' => 'تم تحديث بيانات الدخول بنجاح. يرجى تسجيل الدخول من جديد.',
    ]);
}

auth_json(['success' => false, 'message' => 'إجراء غير معروف.'], 400);
