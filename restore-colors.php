<?php
/**
 * restore-colors.php — أداة تُستعمل مرّة واحدة ثم تُحذف.
 * ------------------------------------------------------------
 * تعيد ألوان الموقع التي كانت مضبوطة يوم ١٨ سبتمبر ٢٠٢٦ الساعة ٨:٣٧
 * صباحاً، قبل أن يكتب النشر التلقائي فوق بيانات الموقع.
 *
 * لا تلمس البطاقات ولا الشعار ولا أي شيء آخر — الألوان واسم الشركة فقط.
 * ومحميّة بتسجيل الدخول: لا تعمل إلا وأنت داخل لوحة التحكم.
 *
 * بعد أن تراها تقول «تم»، احذف هذا الملف من الخادم.
 */
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/api/_auth.php';
require_once __DIR__ . '/api/storage.php';

// يتطلّب جلسة دخول صالحة، وإلا يتوقّف هنا
api_require_token();

// الألوان كما قرأتُها من موقعك قبل أن تُمحى
$restore = array(
    'companyName'       => 'بطاقات التهنئة (الموقع التجريبي)',
    'colorPrimary'      => '#a39462',
    'primaryColor'      => '#caaa98',
    'hfColor1'          => '#ffffff',
    'hfColor2'          => '#3e2323',
    'colorBg'           => '#4b4038',
    'textColor'         => '#000000',
    'cardTextColor'     => '#000000',
    'btnTextColor'      => '#000000',
    'decoration'        => 'islamic-1',
    'decorationColor'   => '#8f8f8f',
    'decorationOpacity' => '0.25',
);

$data = storage_read();
if (!is_array($data)) {
    $data = array();
}
if (!isset($data['config']) || !is_array($data['config'])) {
    $data['config'] = array();
}

$before = $data['config'];
foreach ($restore as $k => $v) {
    $data['config'][$k] = $v;
}
$data['last_modified'] = time();

$ok = storage_write($data);

$dir = storage_data_dir();
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>استرجاع الألوان</title>
<style>
  body { font-family: 'Tajawal', Arial, sans-serif; background:#1a1a1f; color:#eee;
         padding:24px; line-height:1.9; }
  .box { max-width:640px; margin:0 auto; background:#24242c; border-radius:12px;
         padding:24px; border:1px solid #3a3a45; }
  h1 { font-size:1.3rem; margin:0 0 16px; }
  .ok { color:#34d399; font-weight:bold; }
  .bad { color:#f87171; font-weight:bold; }
  table { width:100%; border-collapse:collapse; margin:14px 0; font-size:.9rem; }
  td { padding:7px 10px; border-bottom:1px solid #3a3a45; }
  .sw { display:inline-block; width:16px; height:16px; border-radius:4px;
        border:1px solid #666; vertical-align:middle; margin-left:6px; }
  code { background:#15151a; padding:2px 7px; border-radius:5px; font-size:.85rem; }
  .warn { background:#78350f; padding:12px 14px; border-radius:8px; margin-top:18px; }
  a.btn { display:inline-block; margin-top:16px; background:#a39462; color:#1a1a1f;
          padding:10px 22px; border-radius:8px; text-decoration:none; font-weight:bold; }
</style>
</head>
<body>
<div class="box">
<?php if ($ok): ?>
  <h1 class="ok">✓ تم استرجاع الألوان</h1>
  <p>حُفظت في قاعدة البيانات، ومكان حفظها الآن:</p>
  <p><code><?= htmlspecialchars($dir, ENT_QUOTES, 'UTF-8') ?></code></p>
  <table>
    <?php foreach ($restore as $k => $v): ?>
    <tr>
      <td><?= htmlspecialchars($k, ENT_QUOTES, 'UTF-8') ?></td>
      <td>
        <?= htmlspecialchars($v, ENT_QUOTES, 'UTF-8') ?>
        <?php if (strpos($v, '#') === 0): ?>
          <span class="sw" style="background:<?= htmlspecialchars($v, ENT_QUOTES, 'UTF-8') ?>"></span>
        <?php endif; ?>
      </td>
    </tr>
    <?php endforeach; ?>
  </table>
  <div class="warn">
    <b>خطوة أخيرة:</b> احذف هذا الملف (<code>restore-colors.php</code>) من الخادم الآن.
    مهمّته انتهت، ووجوده بلا داعٍ.
  </div>
  <a class="btn" href="/">افتح الموقع</a>
<?php else: ?>
  <h1 class="bad">✗ تعذّر الحفظ</h1>
  <p>لم يستطع الخادم الكتابة في مجلد البيانات:</p>
  <p><code><?= htmlspecialchars($dir, ENT_QUOTES, 'UTF-8') ?></code></p>
  <p>تحقّق من أذونات المجلد ثم أعد فتح هذه الصفحة.</p>
<?php endif; ?>
</div>
</body>
</html>
