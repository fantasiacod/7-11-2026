<?php
/**
 * debug.php — open this ON THE PHONE to see exactly what that device
 * receives. It renders server-side, so it works even when the phone is
 * serving stale cached JavaScript.
 */
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

require_once __DIR__ . '/api/storage.php';

// Diagnostics reveal storage type, timestamps and configuration state.
// Anyone may run the device-side checks, but the server-side section is
// only rendered for a logged-in admin.
$__isAdmin = false;
if (session_status() === PHP_SESSION_NONE) { @session_start(); }
$__isAdmin = !empty($_SESSION['admin_logged_in']);

$data     = storage_read();
$settings = storage_settings();
$config   = isset($data['config']) ? $data['config'] : array();
$serverNow = date('Y-m-d H:i:s');
$lastMod  = isset($data['last_modified']) ? (int) $data['last_modified'] : 0;

function h($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Cache-Control" content="no-store">
<title>تشخيص الموقع</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background:#0f172a; color:#e2e8f0;
         margin:0; padding:16px; line-height:1.8; }
  h2 { color:#38bdf8; font-size:1.1rem; margin:22px 0 8px; }
  .box { background:#1e293b; border:1px solid #334155; border-radius:10px; padding:14px; margin-bottom:14px; }
  .row { display:flex; justify-content:space-between; gap:10px; border-bottom:1px solid #334155;
         padding:7px 0; font-size:.9rem; }
  .row:last-child { border-bottom:none; }
  .k { color:#94a3b8; }
  .v { font-weight:700; text-align:left; direction:ltr; word-break:break-all; }
  .ok { color:#4ade80; } .bad { color:#f87171; } .warn { color:#fbbf24; }
  .sw { width:26px; height:26px; border-radius:6px; display:inline-block; vertical-align:middle;
        border:1px solid #475569; }
  code { background:#0b1220; padding:2px 6px; border-radius:5px; font-size:.82rem; }
  .big { font-size:1.05rem; padding:12px; border-radius:8px; text-align:center; font-weight:800; }
</style>
</head>
<body>

<?php if (!$__isAdmin): ?>
<div class="box" style="background:#7f1d1d;">
  <b>القسم الأول (بيانات الخادم) يظهر بعد تسجيل الدخول فقط.</b><br>
  <span style="font-size:.9rem;opacity:.9;">
    فحوصات هذا الجهاز بالأسفل تعمل للجميع. لعرض بيانات الخادم،
    <a href="/login/" style="color:#fecaca;">سجّل الدخول</a> ثم أعد فتح هذه الصفحة.
  </span>
</div>
<?php else: ?>
<h2>1. ما يراه الخادم (المصدر الحقيقي)</h2>
<div class="box">
  <div class="row"><span class="k">اسم الجهة</span><span class="v"><?= h(isset($config['companyName']) ? $config['companyName'] : '—') ?></span></div>
  <div class="row"><span class="k">اللون الأساسي</span><span class="v">
      <span class="sw" style="background:<?= h(isset($config['colorPrimary']) ? $config['colorPrimary'] : '#000') ?>"></span>
      <?= h(isset($config['colorPrimary']) ? $config['colorPrimary'] : '—') ?></span></div>
  <div class="row"><span class="k">لون الهيدر 1</span><span class="v">
      <span class="sw" style="background:<?= h(isset($config['hfColor1']) ? $config['hfColor1'] : '#000') ?>"></span>
      <?= h(isset($config['hfColor1']) ? $config['hfColor1'] : '—') ?></span></div>
  <div class="row"><span class="k">عدد البطاقات</span><span class="v"><?= isset($data['cards']) ? count($data['cards']) : 0 ?></span></div>
  <div class="row"><span class="k">نوع التخزين</span><span class="v"><?= h($settings['driver']) ?></span></div>
  <div class="row"><span class="k">آخر تعديل</span><span class="v"><?= $lastMod ? h(date('Y-m-d H:i:s', $lastMod)) : '—' ?></span></div>
  <div class="row"><span class="k">وقت الخادم الآن</span><span class="v"><?= h($serverNow) ?></span></div>
</div>
<p style="font-size:.85rem;color:#94a3b8;margin:0 0 10px;">
  إذا كانت القيم أعلاه <b>صحيحة ومحدَّثة</b>، فالخادم وقاعدة البيانات سليمان،
  والمشكلة في هذا الجهاز (كاش/جافاسكربت). القسم التالي يحدد ذلك.
</p>

<?php endif; ?>

<h2>2. ما يراه هذا الجهاز فعلياً</h2>
<div class="box" id="device-box">
  <div class="row"><span class="k">جاري الفحص...</span><span class="v">⏳</span></div>
</div>

<h2>3. الحكم النهائي</h2>
<div id="verdict" class="big" style="background:#334155;">جاري التحليل...</div>

<h2>4. معلومات الجهاز</h2>
<div class="box">
  <div class="row"><span class="k">الرابط المفتوح</span><span class="v" id="i-url">—</span></div>
  <div class="row"><span class="k">البروتوكول</span><span class="v" id="i-proto">—</span></div>
  <div class="row"><span class="k">المتصفح</span><span class="v" id="i-ua" style="font-size:.72rem;">—</span></div>
  <div class="row"><span class="k">Service Worker</span><span class="v" id="i-sw">—</span></div>
</div>

<div style="margin:18px 0;">
  <button onclick="hardReset()" style="width:100%;padding:15px;background:#dc2626;color:#fff;border:none;
     border-radius:10px;font-size:1rem;font-weight:800;">
     مسح كل الكاش والبيانات المحلية لهذا الموقع
  </button>
</div>

<script>
// Server-rendered truth, injected before any cached script can interfere.
var SERVER = <?= $__isAdmin ? json_encode(array(
    'companyName'  => isset($config['companyName']) ? $config['companyName'] : null,
    'colorPrimary' => isset($config['colorPrimary']) ? $config['colorPrimary'] : null,
    'lastModified' => $lastMod,
), JSON_UNESCAPED_UNICODE) : '{}' ?>;

document.getElementById('i-url').textContent   = location.href;
document.getElementById('i-proto').textContent = location.protocol;
document.getElementById('i-ua').textContent    = navigator.userAgent;
document.getElementById('i-sw').textContent    =
    ('serviceWorker' in navigator && navigator.serviceWorker.controller) ? 'نشط ⚠️' : 'غير موجود ✅';

function row(k, v, cls) {
  return '<div class="row"><span class="k">' + k + '</span><span class="v ' + (cls||'') + '">' + v + '</span></div>';
}

(async function () {
  var box = document.getElementById('device-box');
  var out = '', apiOk = false, apiName = null, jsFresh = false;

  // A) Can this device reach the PHP API at all?
  try {
    var r = await fetch('api/get_data.php?t=' + Date.now(), { cache: 'no-store' });
    var ct = r.headers.get('content-type') || '';
    if (ct.indexOf('application/json') === -1) {
      out += row('الاتصال بالـ API', 'PHP لا يعمل ❌', 'bad');
    } else {
      var d = await r.json();
      apiOk = true;
      apiName = d.config ? d.config.companyName : null;
      out += row('الاتصال بالـ API', 'يعمل ✅', 'ok');
      out += row('الاسم من الـ API', apiName || '—', apiName === SERVER.companyName ? 'ok' : 'bad');
      out += row('تطابق مع الخادم', apiName === SERVER.companyName ? 'مطابق ✅' : 'مختلف ❌',
                 apiName === SERVER.companyName ? 'ok' : 'bad');
    }
  } catch (e) {
    out += row('الاتصال بالـ API', 'فشل: ' + e.message, 'bad');
  }

  // B) Is the cached JavaScript the current build?
  try {
    var jr = await fetch('js/backend-sync.js?probe=' + Date.now(), { cache: 'no-store' });
    var txt = await jr.text();
    jsFresh = txt.indexOf('_lastDetectFail') !== -1;   // marker only in the new build
    out += row('نسخة الجافاسكربت على الخادم', jsFresh ? 'حديثة ✅' : 'قديمة ❌', jsFresh ? 'ok' : 'bad');
  } catch (e) {
    out += row('فحص الجافاسكربت', 'تعذر: ' + e.message, 'warn');
  }

  // C) Stale copy sitting in this device's local storage?
  var ls = null;
  try { ls = localStorage.getItem('siteConfig_v2'); } catch (e) {}
  if (ls) {
    var lsName = '—';
    try { lsName = (JSON.parse(ls).companyName) || '—'; } catch (e) {}
    out += row('نسخة محفوظة بالجهاز', lsName, lsName === SERVER.companyName ? 'ok' : 'warn');
  } else {
    out += row('نسخة محفوظة بالجهاز', 'لا يوجد ✅', 'ok');
  }
  box.innerHTML = out;

  // Verdict
  var v = document.getElementById('verdict');
  if (!apiOk) {
    v.style.background = '#7f1d1d';
    v.innerHTML = 'الاستضافة لا تشغّل PHP على هذا الرابط.<br><small>هذا سبب عدم ظهور التغييرات.</small>';
  } else if (apiName !== SERVER.companyName) {
    v.style.background = '#7f1d1d';
    v.innerHTML = 'الـ API يعيد بيانات مختلفة عن الخادم.<br><small>يوجد كاش وسيط (CDN مثل Cloudflare).</small>';
  } else if (!jsFresh) {
    v.style.background = '#78350f';
    v.innerHTML = 'ملفات الجافاسكربت على الخادم قديمة.<br><small>لم يتم رفع النسخة الجديدة بالكامل.</small>';
  } else {
    v.style.background = '#14532d';
    v.innerHTML = 'الخادم والـ API والملفات كلها سليمة ✅<br><small>إن بقيت الصفحة الرئيسية قديمة، فهي نسخة مخزّنة في هذا الجهاز — اضغط زر المسح بالأسفل.</small>';
  }
})();

async function hardReset() {
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  try {
    if (window.caches) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }
  } catch (e) {}
  try {
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function (r) { return r.unregister(); }));
    }
  } catch (e) {}
  alert('تم المسح. سيتم فتح الصفحة الرئيسية بنسخة جديدة.');
  location.href = '/?fresh=' + Date.now();
}
</script>
</body>
</html>
