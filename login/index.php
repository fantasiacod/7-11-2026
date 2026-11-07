<?php
/**
 * /login/ — clean-URL entry point.
 * ------------------------------------------------------------
 * Works through DirectoryIndex, which is core Apache/nginx behaviour,
 * so the clean address /login keeps working even on hosts where
 * mod_rewrite is unavailable.
 *
 * <base href="/"> is injected because the page's own asset paths are
 * relative: from /login/ they would otherwise resolve to
 * /login/css/style.css instead of /css/style.css.
 */
chdir(dirname(__DIR__));
ob_start();
include dirname(__DIR__) . '/login.php';
$html = ob_get_clean();
echo preg_replace('/<head(\s[^>]*)?>/i', '$0' . "\n    " . '<base href="/">', $html, 1);
