<?php
/**
 * Write-protection guard for the admin API.
 * ------------------------------------------------------------
 * Requires a real, server-side PHP session created by api/auth.php.
 * A visitor cannot forge this by editing localStorage or replaying
 * a header — the session ID is an httponly cookie and the logged-in
 * flag lives only in server-side session storage.
 */
function api_require_token()
{
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

    $ok = !empty($_SESSION['admin_logged_in']);

    // Enforce the same idle timeout as auth.php.
    if ($ok && isset($_SESSION['admin_last_seen'])) {
        if ((time() - $_SESSION['admin_last_seen']) > 1800) {
            $_SESSION = [];
            @session_destroy();
            $ok = false;
        } else {
            $_SESSION['admin_last_seen'] = time();
        }
    }

    if (!$ok) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'غير مصرح: يرجى تسجيل الدخول إلى لوحة التحكم.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
