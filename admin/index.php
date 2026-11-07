<?php
/**
 * /admin/ — clean-URL entry pointt.
 * ------------------------------------------------------------
 * Works through DirectoryIndex, which is core Apache/nginx behaviour,
 * so the clean address /admin keeps working even on hosts where
 * mod_rewrite is unavailable.
 *
 * <base href="/"> is injected because the page's own asset paths are
 * relative: from /admin/ they would otherwise resolve to
 * /admin/css/style.css instead of /css/style.css.
 */
chdir(dirname(__DIR__));
ob_start();
include dirname(__DIR__) . '/admin.php';
$html = ob_get_clean();
echo preg_replace('/<head(\s[^>]*)?>/i', '$0' . "\n    " . '<base href="/">', $html, 1);
