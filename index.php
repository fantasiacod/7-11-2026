<?php
/**
 * index.php — server-rendered entry point.
 * ------------------------------------------------------------
 * The site's data is printed INTO this page by PHP before it ever
 * reaches the browser. That removes the whole class of "changes
 * don't show on mobile" bugs: even if the device is serving a
 * stale cached copy of theme.js or app.js, the colours, name and
 * cards below are already correct because the server wrote them.
 *
 * JavaScript still runs afterwards for live updates, but the page
 * no longer DEPENDS on it being fresh.
 */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: text/html; charset=UTF-8');

require_once __DIR__ . '/api/theme_boot.php';

// قراءة واحدة من قاعدة البيانات لكل طلب (theme_boot يخزّنها داخلياً).
$__data   = theme_data();
$__config = $__data['config'];
$__cards  = $__data['cards'];

// A brand-new install has no cards yet. Fall back to the shipped
// defaults so the page never renders as a blank frame.
if (empty($__cards)) {
    $__cards = array(
        array('src' => 'https://i.postimg.cc/Y92P6tjw/image.png', 'bottom' => '10%', 'right' => '0%'),
        array('src' => 'https://i.postimg.cc/D0hPcv4D/image.png', 'bottom' => '10%', 'right' => '0%'),
        array('src' => 'https://i.postimg.cc/SNPRCZ9K/image.png', 'bottom' => '25%', 'right' => '0%'),
    );
}

function e($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }

// كل الألوان تأتي من theme_boot.php، وهو يقرأها من جدول settings في
// قاعدة بيانات SQLite. لا قيمة لون مكتوبة هنا.
$__company   = theme_get('companyName');
$__logo      = theme_get('logoDataUrl', theme_get('logoUrl'));
$__firstCard = isset($__cards[0]['src']) ? $__cards[0]['src'] : '';
$__decorClass = theme_decoration_class();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>منصة بطاقات التهنئة</title>
    <!-- Prevent FOUC -->
    <!-- Server-rendered truth: applied before any (possibly cached) script -->
    <?php theme_render_css_vars(); ?>
    <?php theme_render_data_script(); ?>
    <script src="js/theme.js?v=60"></script>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&family=Readex+Pro:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">

    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    <link rel="stylesheet" href="css/style.css?v=60">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body>
    <div class="decoration-overlay<?= $__decorClass ?>" id="site-decoration"></div>

    <header class="header">
        <div class="hf-decoration-overlay<?= $__decorClass ?>" id="header-decoration"></div>
        <div class="header-right">
            <div id="header-logo-container">
                <img src="<?= e($__logo) ?>" alt="شعار الموقع" class="logo" id="site-logo">
            </div>
            
            <div class="header-info"><h1 class="company-header-name"><?= e($__company) ?></h1></div>
        </div>
        <div id="header-buttons" style="display: flex; gap: 10px; align-items: center; z-index: 10; position: absolute; top: 50%; transform: translateY(-50%); left: 5%;">
            <a href="/login/" id="admin-panel-link" class="btn-site-link" style="background: var(--hf-bg-color1, #202940); border: 1px solid rgba(255,255,255,0.2); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 50%;"><i class="fas fa-cog"></i></a>
            <a href="#" id="main-site-link" class="btn-site-link" style="display: none;">زيارة الموقع</a>
        </div>
    </header>

    <div class="main-container">
        <div class="preview-box">
            <div id="capture-area">
                <img id="active-card" src="<?= e($__firstCard) ?>" class="main-img" alt="بطاقة التهنئة">
                <!-- شعار الموقع: موضعه ولونه يُضبطان لكل بطاقة من لوحة التحكم -->
                <img id="card-logo" class="card-logo" src="" alt="" style="display: none;">
                <div id="overlay-wrap" class="name-overlay">
                    <div id="target-name" class="name-tag">اكتب اسمك هنا</div>
                </div>
            </div>
        </div>

        <div class="carousel-container">
            <div class="carousel-track">
<?php foreach ($__cards as $__i => $__c): ?>
                <img src="<?= e(isset($__c['src']) ? $__c['src'] : '') ?>" class="thumb<?= $__i === 0 ? ' active' : '' ?>" onclick="manualSelect(<?= (int) $__i ?>)">
<?php endforeach; ?>
            </div>
        </div>

        <div class="input-group">
            <input type="text" id="nameInput" placeholder="أدخل الاسم المراد كتابته..." oninput="sync()" autocomplete="off">
            <button class="dl-button" id="download-btn" onclick="save()"><i class="fas fa-download"></i> تحميل البطاقة الآن</button>
        </div>
    </div>

    <footer class="footer" id="site-footer">
        <div class="hf-decoration-overlay<?= $__decorClass ?>" id="footer-decoration"></div>
        <div class="footer-content">
            <div class="footer-company" id="footer-company-name">جميع الحقوق محفوظة © 2026</div>
            <div style="margin-top: 10px; font-weight: bold;">تواصل معنا</div>
            <div class="contact-us" id="footer-social-links">
            </div>
        </div>
    </footer>

    <script>window.__SITE_LOGO__ = <?= json_encode($__logo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;</script>
    <script src="js/logo-tint.js?v=60"></script>
    <script src="js/backend-sync.js?v=60"></script>
    <script src="js/app.js?v=60"></script>
</body>
</html>
