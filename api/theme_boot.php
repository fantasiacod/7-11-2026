<?php
/**
 * theme_boot.php — نقطة الإقلاع الموحّدة لألوان الموقع.
 * ------------------------------------------------------------
 * كل صفحة في الموقع (الواجهة، تسجيل الدخول، لوحة التحكم) تستدعي هذا
 * الملف فتحصل على الألوان نفسها من المصدر نفسه: جدول settings داخل
 * قاعدة بيانات SQLite.
 *
 * الألوان الافتراضية المكتوبة هنا ليست مصدراً دائماً، بل شبكة أمان
 * تُستخدم فقط عندما لا يوجد الإعداد في قاعدة البيانات (تركيب جديد).
 * وما إن يُحفظ اللون من لوحة التحكم حتى تصبح قاعدة البيانات هي المرجع
 * وحدها، ولا يعود للكود أي أثر في اللون المعروض.
 *
 * لا يُستخدم localStorage في أي مرحلة: المتصفح يستقبل الألوان مطبوعة
 * داخل الصفحة نفسها، فلا توجد نسخة قديمة عالقة على الجهاز يمكن أن
 * ترجع بالموقع إلى ألوان سابقة.
 */

require_once __DIR__ . '/storage.php';

/** القيم الاحتياطية — تُستعمل فقط عند غياب الإعداد من قاعدة البيانات. */
function theme_fallbacks()
{
    return array(
        'colorPrimary'       => '#caaa98',  // primary_color
        'colorBg'            => '#4b4038',  // background_color
        'textColor'          => '#ffffff',  // foreground_color
        'cardTextColor'      => '#ffffff',
        'btnTextColor'       => '#202940',
        'hfColor1'           => '#202940',
        'hfColor2'           => '#4b4038',  // secondary_color
        'adminCardBg'        => '#9a8678',
        'decoration'         => 'none',
        'decorationColor'    => '#ffffff',
        'decorationOpacity'  => '0.15',
        'fontFamily'         => "'Tajawal', 'Cairo', sans-serif",
        'companyName'        => 'بطاقات التهنئة',
        'logoUrl'            => 'img/logo.jpg',
    );
}

/**
 * قراءة بيانات الموقع كاملة من قاعدة البيانات مرّة واحدة لكل طلب.
 */
function theme_data()
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $data = storage_read();
    if (!is_array($data)) {
        $data = array();
    }
    if (!isset($data['config']) || !is_array($data['config'])) {
        $data['config'] = array();
    }
    if (!isset($data['cards']) || !is_array($data['cards'])) {
        $data['cards'] = array();
    }
    $cache = $data;
    return $cache;
}

/** قيمة إعداد واحد: قاعدة البيانات أولاً، ثم القيمة الاحتياطية. */
function theme_get($key, $fallback = null)
{
    $data = theme_data();
    if (isset($data['config'][$key]) && $data['config'][$key] !== '') {
        return $data['config'][$key];
    }
    $defaults = theme_fallbacks();
    if ($fallback !== null) {
        return $fallback;
    }
    return isset($defaults[$key]) ? $defaults[$key] : '';
}

/** الألوان النهائية المطبَّقة على الصفحة، بعد دمج المرادفات القديمة. */
function theme_colors()
{
    $primary = theme_get('colorPrimary', null);
    if ($primary === '' || $primary === null) {
        $primary = theme_get('primaryColor', null);
    }
    $decoration = theme_get('decoration', null);
    if ($decoration === '' || $decoration === null) {
        $decoration = theme_get('hfDecoration', null);
    }
    $decColor = theme_get('decorationColor', null);
    if ($decColor === '' || $decColor === null) {
        $decColor = theme_get('hfDecorationColor', null);
    }
    $decOpacity = theme_get('decorationOpacity', null);
    if ($decOpacity === '' || $decOpacity === null) {
        $decOpacity = theme_get('hfOpacity', null);
    }

    return array(
        'primary'          => $primary,
        'bg'               => theme_get('colorBg'),
        'hf1'              => theme_get('hfColor1'),
        'hf2'              => theme_get('hfColor2'),
        'text'             => theme_get('textColor'),
        'cardText'         => theme_get('cardTextColor', theme_get('textColor')),
        'btnText'          => theme_get('btnTextColor'),
        'adminCardBg'      => theme_get('adminCardBg'),
        'decoration'       => $decoration,
        'decorationColor'  => $decColor,
        'decorationOpacity'=> $decOpacity,
        'font'             => theme_get('fontFamily'),
    );
}

function theme_e($v)
{
    return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
}

/** صنف نمط الزخرفة الجاهز للطباعة داخل class. */
function theme_decoration_class()
{
    $c = theme_colors();
    $dec = $c['decoration'];
    if (!$dec || $dec === 'none') {
        return '';
    }
    return ' pattern-' . preg_replace('/[^a-z0-9\-]/i', '', $dec) . ' active';
}

/**
 * طباعة متغيّرات CSS داخل <head>.
 * تُطبع قبل أي ملف CSS أو JS، فتظهر الألوان الصحيحة من أول إطار
 * للصفحة ولا تحدث ومضة بلون قديم.
 */
function theme_render_css_vars($includeAdminVars = false)
{
    $c = theme_colors();
    echo '<style id="ssr-theme">' . "\n";
    echo "      :root {\n";
    echo '        --primary: ' . theme_e($c['primary']) . ";\n";
    echo '        --bg-color: ' . theme_e($c['bg']) . ";\n";
    echo '        --hf-bg-color1: ' . theme_e($c['hf1']) . ";\n";
    echo '        --hf-bg-color2: ' . theme_e($c['hf2']) . ";\n";
    echo '        --text-color: ' . theme_e($c['text']) . ";\n";
    echo '        --card-text-color: ' . theme_e($c['cardText']) . ";\n";
    echo '        --btn-text-color: ' . theme_e($c['btnText']) . ";\n";
    echo '        --decoration-color: ' . theme_e($c['decorationColor']) . ";\n";
    echo '        --decoration-opacity: ' . theme_e($c['decorationOpacity']) . ";\n";
    echo '        --hf-decoration-color: ' . theme_e($c['decorationColor']) . ";\n";
    echo '        --hf-decoration-opacity: ' . theme_e($c['decorationOpacity']) . ";\n";
    if ($includeAdminVars) {
        echo '        --card-bg: ' . theme_e($c['adminCardBg']) . ";\n";
        echo '        --text-main: ' . theme_e($c['text']) . ";\n";
        echo '        --text-muted: ' . theme_e($c['text']) . ";\n";
    }
    echo "      }\n";
    echo '      body { font-family: ' . $c['font'] . "; }\n";
    echo "    </style>\n";
}

/**
 * طباعة بيانات الموقع داخل الصفحة ليقرأها الجافاسكربت.
 * لا كتابة في localStorage: هذا المتغيّر يُولَّد من قاعدة البيانات مع
 * كل طلب، فهو دائماً حديث بينما النسخة المخزّنة في المتصفح قد تكون
 * قديمة وترجع بالموقع إلى ألوان سابقة.
 */
function theme_render_data_script()
{
    $data = theme_data();
    echo '<script>' . "\n";
    echo '      window.__SITE_DATA__ = ' . json_encode(array(
        'config'        => $data['config'],
        'cards'         => $data['cards'],
        'last_modified' => isset($data['last_modified']) ? $data['last_modified'] : 0,
    ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n";
    echo '    </script>' . "\n";
}
