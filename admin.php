<?php
/**
 * admin.php — server-rendered control panel (never cached).
 * Serving the panel through PHP guarantees the admin always loads the
 * current build, instead of a cached copy that silently fails to save.
 */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: text/html; charset=UTF-8');

// لوحة التحكم تأخذ ألوانها من المصدر نفسه الذي يأخذه منه الموقع:
// جدول settings في قاعدة بيانات SQLite. قبل هذا كانت تعتمد على نسخة
// مخزّنة في متصفح المشرف، فتختلف ألوانها عن الموقع بعد أي نشر جديد.
require_once __DIR__ . '/api/theme_boot.php';
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>لوحة التحكم</title>
    <!-- Prevent FOUC -->
    <?php theme_render_css_vars(true); ?>
    <?php theme_render_data_script(); ?>
    <script src="js/theme.js?v=60"></script>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&family=Readex+Pro:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">

    
    <!-- CSS -->
    <link rel="stylesheet" href="css/admin.css?v=60">
    
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Auth Script -->
    <script src="js/auth.js?v=60"></script>
    <script>
        // Protect this page from unauthorized access
        protectPage();
    </script>
</head>
<body>
    <div class="admin-layout" id="admin-layout">
        <!-- ستارة الشاشات الصغيرة: الضغط عليها يغلق القائمة -->
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        <!-- Sidebar -->
        <aside class="admin-sidebar" id="sidebar">
            <div class="hf-decoration-overlay" id="admin-sidebar-decoration"></div>
            <div class="sidebar-menu-title">القائمة</div>
            <ul class="sidebar-nav">
                <li class="nav-item active" data-target="dashboard-view">
                    <i class="fas fa-tachometer-alt"></i> الصفحة الرئيسية
                </li>
                <li class="nav-item" data-target="cards-view">
                    <i class="fas fa-images"></i> إدارة البطاقات
                </li>
                <li class="nav-item" data-target="fonts-view">
                    <i class="fas fa-font"></i> قسم الخطوط
                </li>
                <li class="nav-item" data-target="cloud-sync-view">
                    <i class="fas fa-database"></i> الربط
                </li>
                <li class="nav-item" data-target="settings-view">
                    <i class="fas fa-cog"></i> الإعدادات
                </li>
                <li class="nav-account" id="account-block">
                    <div class="nav-account-toggle" id="account-toggle">
                        <span><i class="fas fa-user"></i> حسابي</span>
                        <i class="fas fa-chevron-down account-caret"></i>
                    </div>
                    <ul class="nav-account-submenu" id="account-submenu">
                        <li><a href="#" class="submenu-item" id="change-password-btn"><i class="fas fa-key"></i> تغيير اسم المستخدم وكلمة المرور</a></li>
                        <li><a href="#" class="submenu-item text-danger" id="logout-btn"><i class="fas fa-sign-out-alt"></i> تسجيل خروج</a></li>
                    </ul>
                </li>
            </ul>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="admin-main">
            <div class="decoration-overlay" id="admin-main-decoration"></div>
            <!-- Topbar -->
            <header class="admin-topbar">
                <div class="hf-decoration-overlay" id="admin-topbar-decoration"></div>
                <div class="topbar-right">
                    <div class="header-company-name">
                        <i class="fas fa-building"></i> اسم الشركة
                    </div>
                    <div class="breadcrumbs">
                        <span>الصفحة الرئيسية</span>
                        <span id="breadcrumb-current"> <i class="fas fa-chevron-left"></i> الإحصائيات</span>
                    </div>
                </div>
                <div class="topbar-left">
                    <div id="auto-save-indicator" style="display: none; align-items: center; gap: 6px; font-size: 0.85rem; color: #10b981; padding: 6px 14px; border-radius: 20px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 700; transition: opacity 0.3s ease; opacity: 0;">
                        <i class="fas fa-check-circle"></i> تم الحفظ بنجاح
                    </div>
                    <a href="/" class="topbar-btn" style="margin-left: 10px;"><i class="fas fa-external-link-alt"></i> الموقع الرئيسي</a>

                    <button class="icon-btn" id="toggle-sidebar"><i class="fas fa-bars"></i></button>
                    <button class="icon-btn" title="ملء الشاشة" id="fullscreen-btn"><i class="fas fa-expand"></i></button>
                </div>
            </header>

            <!-- Views Container -->
            <div class="views-container">
                
                <!-- Dashboard View -->
                <div id="dashboard-view" class="view-section active">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h2>الإحصائيات <span class="header-divider">— آخر 30 يوماً</span></h2>
                        <button class="btn btn-danger" id="reset-stats-btn"><i class="fas fa-trash"></i> تصفير الإحصائيات</button>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-info">
                                <h3 id="stat-views">0</h3>
                                <p>المشاهدات</p>
                            </div>
                            <div class="stat-icon-top"><i class="fas fa-eye"></i></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-info">
                                <h3 id="stat-previews">0</h3>
                                <p>المعاينات</p>
                            </div>
                            <div class="stat-icon-top warning"><i class="fas fa-search"></i></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-info">
                                <h3 id="stat-downloads">0</h3>
                                <p>التحميلات</p>
                            </div>
                            <div class="stat-icon-top success"><i class="fas fa-download"></i></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-info">
                                <h3 id="stat-completion">0%</h3>
                                <p>نسبة إتمام التحميل</p>
                            </div>
                            <div class="stat-icon-top primary"><i class="fas fa-chart-pie"></i></div>
                        </div>
                    </div>


                    <div class="dashboard-grid">
                        <!-- Line Chart -->
                        <div class="card chart-card full-width">
                            <div class="card-header">
                                <h3>حركة الزوار — آخر 30 يوماً</h3>
                            </div>
                            <div class="card-body">
                                <canvas id="trafficChart"></canvas>
                            </div>
                        </div>

                        <!-- Progress Bars -->
                        <div class="card progress-card">
                            <div class="card-header">
                                <h3>مسار التحويل</h3>
                            </div>
                            <div class="card-body">
                                <div class="progress-item">
                                    <div class="progress-info">
                                        <span>المشاهدات</span>
                                        <span id="prog-views-val">0</span>
                                    </div>
                                    <div class="progress-bar"><div class="fill" id="prog-views-bar" style="width: 0%;"></div></div>
                                </div>
                                <div class="progress-item">
                                    <div class="progress-info">
                                        <span>المعاينات</span>
                                        <span id="prog-previews-val">0</span>
                                    </div>
                                    <div class="progress-bar"><div class="fill warning" id="prog-previews-bar" style="width: 0%;"></div></div>
                                </div>
                                <div class="progress-item">
                                    <div class="progress-info">
                                        <span>التحميلات</span>
                                        <span id="prog-downloads-val">0</span>
                                    </div>
                                    <div class="progress-bar"><div class="fill success" id="prog-downloads-bar" style="width: 0%;"></div></div>
                                </div>
                                <div class="total-conversion">
                                    <h4>إجمالي إتمام التحميل</h4>
                                    <h2 id="prog-completion-val">0%</h2>
                                </div>
                            </div>
                        </div>

                        <!-- Donut Chart -->
                        <div class="card donut-card">
                            <div class="card-header">
                                <h3>مصادر الزيارات</h3>
                            </div>
                            <div class="card-body">
                                <canvas id="sourceChart"></canvas>
                            </div>
                        </div>

                            </div>
                </div>

                <!-- Settings View -->
                <div id="settings-view" class="view-section">
                    <div class="page-header">
                        <h2>الإعدادات <span class="header-divider">— إعدادات النظام</span></h2>
                    </div>

                    <div class="settings-layout">
                        <!-- Settings Sidebar -->
                        <div class="settings-sidebar">
                            <div class="settings-menu">
                                <div class="settings-item" data-settings-target="site-settings">
                                    <i class="fas fa-cog"></i>
                                    <div>
                                        <h4>إعدادات الموقع</h4>
                                        <p>اسم التطبيق ورابط الفوتر</p>
                                    </div>
                                </div>
                                <div class="settings-item active" data-settings-target="theme-settings">
                                    <i class="fas fa-image"></i>
                                    <div>
                                        <h4>إعدادات ثيم الصفحة الوحدة</h4>
                                        <p>الشعار والزخرفة</p>
                                    </div>
                                </div>
                                <div class="settings-item" data-settings-target="appearance-settings">
                                    <i class="fas fa-palette"></i>
                                    <div>
                                        <h4>الألوان والمظهر</h4>
                                        <p>الألوان والخطوط</p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <!-- Settings Content -->
                        <div class="settings-content">
                            <!-- Site Settings -->
                            <div class="settings-section" id="site-settings" style="display: none;">
                                <div class="card settings-main-card">
                                    <div class="card-header border-bottom">
                                        <h3>إعدادات الموقع</h3>
                                        <p class="subtitle">تخصيص اسم الموقع وروابط التواصل</p>
                                    </div>
                                    <div class="card-body">
                                        <div class="form-group">
                                            <label class="form-label">اسم الشركة / المؤسسة</label>
                                            <input type="text" id="setting-company-name" class="form-control" placeholder="أدخل اسم الشركة" value="">
                                        </div>
                                        <h4 style="margin: 20px 0 10px;">روابط الفوتر (تواصل معنا)</h4>
                                        <div class="form-group" style="margin-bottom: 15px;">
                                            <label><i class="fab fa-whatsapp" style="color: #25D366;"></i> واتساب</label>
                                            <input type="text" id="setting-whatsapp" class="form-control" placeholder="رابط الواتساب">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 15px;">
                                            <label><i class="fab fa-x-twitter" style="color: #000;"></i> منصة X</label>
                                            <input type="text" id="setting-twitter" class="form-control" placeholder="رابط حساب X">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label><i class="fas fa-link" style="color: #caaa98;"></i> رابط الموقع الرئيسي (زر زيارة الموقع)</label>
                                            <input type="text" id="setting-main-link" class="form-control" placeholder="اتركه فارغاً لإخفاء الزر">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label><i class="fab fa-instagram" style="color: #E1306C;"></i> انستجرام</label>
                                            <input type="text" id="setting-instagram" class="form-control" placeholder="رابط الانستجرام">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 15px;">
                                            <label><i class="fab fa-youtube" style="color: #FF0000;"></i> يوتيوب</label>
                                            <input type="text" id="setting-youtube" class="form-control" placeholder="رابط قناة اليوتيوب">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 15px;">
                                            <label><i class="fas fa-shopping-cart" style="color: #4CAF50;"></i> رابط المتجر</label>
                                            <input type="text" id="setting-salla" class="form-control" placeholder="رابط المتجر الإلكتروني">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label><i class="fas fa-blog" style="color: #FF9800;"></i> المدونة</label>
                                            <input type="text" id="setting-blog" class="form-control" placeholder="رابط  المدونة الخاصة بك">
                                        </div>
                                        <div style="margin-top: 25px; text-align: left;">
                                            <button type="button" class="btn btn-save-settings" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"><i class="fas fa-save"></i> حفظ التغييرات</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Theme Settings (Active by default) -->
                            <div class="settings-section active" id="theme-settings">
                                <div class="card settings-main-card">
                                    <div class="card-header border-bottom">
                                        <h3>إعدادات ثيم الصفحة الوحدة</h3>
                                        <p class="subtitle">الشعار، الخلفية وزخرفة الموقع</p>
                                    </div>
                                    <div class="card-body">
                                        <div class="upload-grid">
                                            <!-- Site Decoration Preview & Select (Unified for all site) -->
                                            <div class="upload-box" style="flex: 1;">
                                                <h4>زخرفة الموقع (Pattern)</h4>
                                                <div class="upload-preview" id="decoration-preview-container" style="position: relative; background: linear-gradient(90deg, var(--hf-bg-color1, #202940), var(--hf-bg-color2, #4b4038));">
                                                    <!-- Background that gets the mask -->
                                                    <div id="decoration-preview-mask" style="position: absolute; top:0; left:0; right:0; bottom:0; background-color: #ffffff; opacity: 0.2;"></div>
                                                    
                                                    <!-- Text Overlay -->
                                                    <div style="position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
                                                        <span id="decoration-preview-text">بدون زخرفة</span>
                                                    </div>
                                                </div>
                                                <div style="margin-top: 15px;">
                                                    <select id="setting-decoration" class="form-control" style="width: 100%; max-width: 100%; margin-bottom: 15px;">
                                                        <option value="none">بدون زخرفة</option>
                                                        <option value="arabic">زخرفة حروف عربية</option>
                                                        <option value="islamic-1">زخرفة إسلامية (نجمة هندسية)</option>
                                                        <option value="islamic-2">خطوط عرضية</option>
                                                        <option value="modern-dots">نقاط عصرية (Modern Dots)</option>
                                                    </select>

                                                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                                                        <div style="flex: 1;">
                                                            <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-color, #ffffff); display: block; margin-bottom: 5px;">لون خلفية 1</label>
                                                            <input type="color" id="setting-hf-color1" class="form-control" style="padding: 2px; height: 40px; width: 100%; cursor: pointer;" value="#202940">
                                                        </div>
                                                        <div style="flex: 1;">
                                                            <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-color, #ffffff); display: block; margin-bottom: 5px;">لون خلفية 2</label>
                                                            <input type="color" id="setting-hf-color2" class="form-control" style="padding: 2px; height: 40px; width: 100%; cursor: pointer;" value="#4b4038">
                                                        </div>
                                                    </div>

                                                    <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-color, #ffffff); display: block; margin-bottom: 5px;">لون الزخرفة</label>
                                                    <input type="color" id="setting-decoration-color" class="form-control" style="padding: 2px; height: 40px; margin-bottom: 15px; cursor: pointer;" value="#ffffff">

                                                    <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-color, #ffffff); display: block; margin-bottom: 5px;">شفافية الزخرفة: <span id="decoration-opacity-val">0.15</span></label>
                                                    <input type="range" id="setting-decoration-opacity" class="form-control" min="0.0" max="1.0" step="0.05" value="0.15" style="padding: 0; height: auto;">
                                                </div>
                                            </div>

                                            <!-- Logo Upload & Settings -->
                                            <div class="upload-box" style="flex: 1;">
                                                <h4>شعار الموقع</h4>
                                                <div class="upload-preview" id="logo-preview-container" style="background: rgba(255, 255, 255, 0.06); border: 1.5px dashed var(--border);">
                                                    <div class="logo-badge" id="logo-placeholder">
                                                        <div class="logo-inner">SCHOOL LOGO</div>
                                                    </div>
                                                </div>
                                                
                                                <div style="margin-top: 15px;">
                                                    <label style="font-size: 0.95rem; font-weight: 700; color: var(--text-color, #ffffff); display: block; margin-bottom: 5px;">رفع صورة للشعار (أو اختر من جهازك)</label>
                                                    <div class="upload-control" style="margin-top: 0;">
                                                        <input type="file" id="logo-upload" class="file-input" accept="image/*">
                                                        <label for="logo-upload" class="btn" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 10px 18px; cursor: pointer; border: none; border-radius: 0;">اختر ملف</label>
                                                        <span class="file-name" id="logo-file-name" style="font-size: 0.85rem; color: var(--text-color, #ffffff); font-weight: 600;">لم يتم اختيار ملف</span>
                                                    </div>
                                                </div>

                                                <div style="margin-top: 15px;">
                                                    <h3 style="font-size: 1.1rem; margin-bottom: 15px; color: var(--text-light);">الشعار (Logo)</h3>
                                                    <label style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">أو ضع رابط الشعار (URL)</label>
                                                    <input type="text" id="setting-logo-url" class="form-control" placeholder="https://example.com/logo.png">
                                                </div>

                                                <!-- نسخ الشعار الملوّنة: ترفع نسخة PNG جاهزة لكل لون بدل التلوين التلقائي -->
                                                <div style="margin-top: 22px; border-top: 1px solid var(--border); padding-top: 16px;">
                                                    <h3 style="font-size: 1.05rem; margin-bottom: 6px;">نسخ الشعار الملوّنة (للطباعة على البطاقات)</h3>
                                                    <p style="font-size: .82rem; opacity: .8; margin-bottom: 12px; line-height: 1.7;">
                                                        يصمّم النظام هذه النسخ بنفسه من شعار الموقع المرفوع أعلاه، ويحافظ على
                                                        تفاصيل الشعار وبروزه ولمعانه. وتُنشأ تلقائياً كلّما رفعت شعاراً جديداً.
                                                        وإن كانت لديك نسخة جاهزة بلون معيّن فارفعها لتحلّ محلّ النسخة المولّدة.
                                                    </p>
                                                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;">
                                                        <button type="button" id="logo-generate-btn" class="btn" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 9px 18px; border: none; border-radius: 8px; cursor: pointer; font-size: .85rem; width: auto;">
                                                            <i class="fas fa-magic"></i> إنشاء النسخ الثلاث من الشعار
                                                        </button>
                                                        <span id="logo-generate-status" style="font-size: .8rem; opacity: .85;"></span>
                                                    </div>
                                                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                                        <div style="flex: 1; min-width: 150px;">
                                                            <div style="font-size: .85rem; font-weight: 700; margin-bottom: 6px;">أبيض</div>
                                                            <div class="logo-variant-preview" id="logo-white-preview" style="height: 78px; border-radius: 8px; border: 1.5px dashed var(--border); background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 6px;">
                                                                <span style="font-size: .72rem; opacity: .6;">لم يُرفع</span>
                                                            </div>
                                                            <input type="file" id="logo-white-upload" class="file-input" accept="image/png,image/webp,image/svg+xml" style="display:none;">
                                                            <div style="display: flex; gap: 6px;">
                                                                <label for="logo-white-upload" class="btn" style="flex:1; background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 7px 10px; cursor: pointer; border: none; border-radius: 6px; font-size: .8rem; text-align: center;">رفع</label>
                                                                <button type="button" class="btn logo-variant-clear" data-variant="white" style="background: rgba(239,68,68,.25); color: #fff; padding: 7px 10px; border: none; border-radius: 6px; font-size: .8rem; cursor: pointer; width: auto;">حذف</button>
                                                            </div>
                                                        </div>
                                                        <div style="flex: 1; min-width: 150px;">
                                                            <div style="font-size: .85rem; font-weight: 700; margin-bottom: 6px;">ذهبي</div>
                                                            <div class="logo-variant-preview" id="logo-gold-preview" style="height: 78px; border-radius: 8px; border: 1.5px dashed var(--border); background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 6px;">
                                                                <span style="font-size: .72rem; opacity: .6;">لم يُرفع</span>
                                                            </div>
                                                            <input type="file" id="logo-gold-upload" class="file-input" accept="image/png,image/webp,image/svg+xml" style="display:none;">
                                                            <div style="display: flex; gap: 6px;">
                                                                <label for="logo-gold-upload" class="btn" style="flex:1; background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 7px 10px; cursor: pointer; border: none; border-radius: 6px; font-size: .8rem; text-align: center;">رفع</label>
                                                                <button type="button" class="btn logo-variant-clear" data-variant="gold" style="background: rgba(239,68,68,.25); color: #fff; padding: 7px 10px; border: none; border-radius: 6px; font-size: .8rem; cursor: pointer; width: auto;">حذف</button>
                                                            </div>
                                                        </div>
                                                        <div style="flex: 1; min-width: 150px;">
                                                            <div style="font-size: .85rem; font-weight: 700; margin-bottom: 6px;">أسود</div>
                                                            <div class="logo-variant-preview" id="logo-black-preview" style="height: 78px; border-radius: 8px; border: 1.5px dashed var(--border); background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 6px;">
                                                                <span style="font-size: .72rem; opacity: .6;">لم يُرفع</span>
                                                            </div>
                                                            <input type="file" id="logo-black-upload" class="file-input" accept="image/png,image/webp,image/svg+xml" style="display:none;">
                                                            <div style="display: flex; gap: 6px;">
                                                                <label for="logo-black-upload" class="btn" style="flex:1; background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 7px 10px; cursor: pointer; border: none; border-radius: 6px; font-size: .8rem; text-align: center;">رفع</label>
                                                                <button type="button" class="btn logo-variant-clear" data-variant="black" style="background: rgba(239,68,68,.25); color: #fff; padding: 7px 10px; border: none; border-radius: 6px; font-size: .8rem; cursor: pointer; width: auto;">حذف</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style="margin-top: 15px;">
                                                    <label style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">موضع الشعار في الموقع</label>
                                                    <select id="setting-logo-position" class="form-control">
                                                        <option value="right">اليمين (افتراضي)</option>
                                                        <option value="center">المنتصف</option>
                                                        <option value="left">اليسار</option>
                                                    </select>
                                                </div>

                                                <div style="margin-top: 15px;">
                                                    <label style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 5px;">موضع أزرار الترويسة</label>
                                                    <select id="setting-buttons-position" class="form-control">
                                                        <option value="left">اليسار (افتراضي)</option>
                                                        <option value="right">اليمين</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div style="margin-top: 25px; text-align: left;">
                                            <button type="button" class="btn btn-save-settings" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"><i class="fas fa-save"></i> حفظ التغييرات</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Appearance Settings -->
                            <div class="settings-section" id="appearance-settings" style="display: none;">
                                <div class="card settings-main-card">
                                    <div class="card-header border-bottom">
                                        <h3>الألوان والمظهر</h3>
                                        <p class="subtitle">تخصيص الألوان الموحدة للهوية</p>
                                    </div>
                                    <div class="card-body">
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label>لون الأزرار الموحد (Primary Color)</label>
                                            <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                                                <input type="color" id="setting-color-primary" value="#caaa98" class="form-control" style="width: 60px; height: 44px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                                <div>
                                                    <div style="font-weight: 700; color: var(--text-color, #ffffff); font-size: 0.95rem;">لون أزرار الموقع ولوحة التحكم والربط</div>
                                                    <div style="color: var(--text-color, #ffffff); opacity: 0.8; font-size: 0.82rem;">يوحد لون كافة الأزرار في المنصة بنقرة واحدة</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label>لون نص الأزرار</label>
                                            <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                                                <input type="color" id="setting-btn-text-color" value="#202940" class="form-control" style="width: 60px; height: 44px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                                <div>
                                                    <div style="font-weight: 700; color: var(--text-color, #ffffff); font-size: 0.95rem;">لون الخط والكتابة داخل الأزرار</div>
                                                    <div style="color: var(--text-color, #ffffff); opacity: 0.8; font-size: 0.82rem;">لون النصوص والأيقونات داخل الأزرار</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 20px;">
                                            <label>لون الخطوط والنصوص الموحد</label>
                                            <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                                                <input type="color" id="setting-text-color-app" value="#ffffff" class="form-control" style="width: 60px; height: 44px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                                <div>
                                                    <div style="font-weight: 700; color: var(--text-color, #ffffff); font-size: 0.95rem;">توحيد لون كافة النصوص</div>
                                                    <div style="color: var(--text-color, #ffffff); opacity: 0.8; font-size: 0.82rem;">يطبق تلقائياً على العناوين، الوصف، اسم التهنئة على البطاقة، والفوتر</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="margin-top: 25px; text-align: left;">
                                            <button type="button" class="btn btn-save-settings" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 10px 24px; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);"><i class="fas fa-save"></i> حفظ التغييرات</button>
                                        </div>
                                    </div>
                                </div>
                            </div>




                        </div>
                    </div>
                </div>

                <!-- Cards View -->
                <div id="cards-view" class="view-section">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h2>إدارة البطاقات</h2>
                        <button class="btn btn-primary" id="add-card-btn"><i class="fas fa-plus"></i> إضافة بطاقة جديدة</button>
                    </div>
                    <div class="card" style="max-width: 1000px;">
                        <div class="card-header border-bottom">
                            <h3>البطاقات الحالية</h3>
                            <p class="subtitle">قم بإضافة، تعديل أو حذف بطاقات التهنئة</p>
                        </div>
                        <div class="card-body">
                            <div id="admin-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                                <!-- Cards will be generated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fonts & Colors View -->
                <div id="fonts-view" class="view-section">
                    <div class="page-header">
                        <h2>قسم الخطوط والمظهر <span class="header-divider">— تخصيص الخطوط، ألوان النصوص، الأزرار، والفوتر</span></h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; max-width: 1100px;">
                        <!-- Controls Card -->
                        <div class="card">
                            <div class="card-header border-bottom">
                                <h3><i class="fas fa-palette" style="color: var(--primary);"></i> إعدادات الخطوط وتوحيد الألوان</h3>
                                <p class="subtitle">تحكم كامل في الخط الأساسي، لون النصوص، الأزرار، والهيدر والفوتر</p>
                            </div>
                            <div class="card-body">
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="font-weight: 700; margin-bottom: 8px; display: block;">خط الموقع الأساسي</label>
                                    <select id="setting-font" class="form-control" style="width: 100%;">
                                        <option value="'Tajawal', sans-serif">Tajawal (عصري - تجوال)</option>
                                        <option value="'Cairo', sans-serif">Cairo (عصري وكلاسيكي - كايرو)</option>
                                        <option value="'Amiri', serif">Amiri (رسمي وفخم - أميري)</option>
                                        <option value="'Almarai', sans-serif">Almarai (رقمي وأنيق - المراعي)</option>
                                        <option value="'Readex Pro', sans-serif">Readex Pro (حديث - ريدكس برو)</option>
                                        <option value="'Alexandria', sans-serif">Alexandria (عصري وجذاب - الإسكندرية)</option>
                                        <option value="'Inter', sans-serif">Inter (إنجليزي)</option>
                                    </select>
                                </div>

                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="font-weight: 700; margin-bottom: 8px; display: block;">لون الخطوط والنصوص الموحد (لكافة الموقع والبطاقات والفوتر)</label>
                                    <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                                        <input type="color" id="setting-text-color" value="#ffffff" class="form-control" style="width: 65px; height: 44px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                        <div>
                                            <div style="font-weight: 700; color: var(--text-color, #ffffff); font-size: 0.95rem;">توحيد لون كافة النصوص</div>
                                            <div style="color: var(--text-color, #ffffff); opacity: 0.8; font-size: 0.82rem;">يطبق تلقائياً على العناوين، الوصف، اسم التهنئة على البطاقة، والفوتر</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="font-weight: 700; margin-bottom: 8px; display: block;">لون الأزرار الموحد (لكافة أزرار الموقع ولوحة التحكم والربط)</label>
                                    <div style="display: flex; gap: 15px;">
                                        <div style="flex: 1; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
                                            <input type="color" id="setting-color-primary-font" value="#caaa98" class="form-control" style="width: 50px; height: 40px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                            <div>
                                                <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-color, #ffffff);">لون الأزرار الموحد</div>
                                                <div style="font-size: 0.8rem; color: var(--text-color, #ffffff); opacity: 0.8;">الربط، الشريط العلوي، والتحميل</div>
                                            </div>
                                        </div>
                                        <div style="flex: 1; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
                                            <input type="color" id="setting-btn-text-color-font" value="#202940" class="form-control" style="width: 50px; height: 40px; padding: 2px; cursor: pointer; flex-shrink: 0;">
                                            <div>
                                                <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-color, #ffffff);">لون نص الأزرار</div>
                                                <div style="font-size: 0.8rem; color: var(--text-color, #ffffff); opacity: 0.8;">لون الخط داخل الأزرار</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <!-- Live Preview Card -->
                        <div class="card">
                            <div class="card-header border-bottom">
                                <h3><i class="fas fa-eye" style="color: var(--primary);"></i> معاينة حية متكاملة للخط والألوان</h3>
                                <p class="subtitle">شاهد كيف سيظهر الخط، لون النصوص، الأزرار، والفوتر مباشرة</p>
                            </div>
                            <div class="card-body" style="display: flex; flex-direction: column; gap: 15px;">
                                <div id="font-preview-box" style="padding: 24px; border-radius: 12px; background: linear-gradient(135deg, var(--hf-bg-color1, #202940), var(--hf-bg-color2, #4b4038)); border: 1px solid var(--border); text-align: center;">
                                    <h4 id="font-preview-title" style="margin: 0 0 10px; font-size: 1.25rem; color: var(--text-color, #ffffff); font-weight: 800;">منصة بطاقات التهنئة الرسمية</h4>
                                    <p id="font-preview-desc" style="margin: 0 0 16px; font-size: 0.95rem; color: var(--text-color, #ffffff); opacity: 0.85;">تهنئة خاصة بمناسبة عيد الفطر المبارك أعاده الله علينا وعليكم بالخير واليمن والبركات</p>
                                    
                                    <div style="background: rgba(0,0,0,0.35); padding: 14px 18px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.3); margin-bottom: 18px;">
                                        <span style="font-size: 0.8rem; color: rgba(255,255,255,0.7); display: block; margin-bottom: 4px;">معاينة اسم التهنئة على البطاقة:</span>
                                        <span id="font-preview-name" style="font-size: 1.25rem; font-weight: 800; color: #ffffff;">محمد بن عبدالله السعيد</span>
                                    </div>

                                    <button id="font-preview-btn" style="background: var(--primary, #caaa98); color: var(--btn-text-color, #202940); border: none; padding: 12px 28px; border-radius: 8px; font-weight: 800; font-family: inherit; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">تحميل البطاقة الآن</button>

                                    <div id="font-preview-footer" style="margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); font-size: 0.85rem; color: var(--text-color, #ffffff); opacity: 0.9;">
                                        <i class="fas fa-heart" style="color: var(--primary, #caaa98);"></i> جميع الحقوق محفوظة — معاينة الفوتر
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



                <!-- الربط (Storage) View -->
                <div id="cloud-sync-view" class="view-section">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h2><i class="fas fa-database"></i> الربط</h2>
                        <span class="badge" id="storage-status-badge" style="background: rgba(148, 163, 184, 0.2); color: var(--text-muted); border: 1px solid var(--border); padding: 6px 14px; border-radius: 20px; font-weight: bold;">
                            <i class="fas fa-circle" style="font-size: 8px; vertical-align: middle;"></i> جاري قراءة الحالة...
                        </span>
                    </div>

                    <!-- System health check -->
                    <div class="card" style="max-width: 900px; margin-bottom: 25px;">
                        <div class="card-header border-bottom" style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3><i class="fas fa-stethoscope" style="color: var(--primary);"></i> فحص حالة النظام</h3>
                                <p class="subtitle">يكشف أي مشكلة في الاستضافة ويشرح الحل مباشرة.</p>
                            </div>
                            <button class="btn btn-secondary" id="btn-run-health" style="padding: 10px 18px; white-space: nowrap;">
                                <i class="fas fa-sync-alt"></i> إعادة الفحص
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="health-results" style="line-height: 1.7;">
                                <span style="color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري الفحص...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Primary storage: SQLite -->
                    <div class="card" style="max-width: 900px; margin-bottom: 25px;">
                        <div class="card-header border-bottom">
                            <h3><i class="fas fa-hdd" style="color: var(--primary);"></i> تخزين بيانات الموقع</h3>
                            <p class="subtitle">تُحفظ إعدادات موقعك وبطاقاتك وإحصائياتك في قاعدة SQLite داخل ملف واحد على الخادم. بدون خادم قواعد بيانات ولا كلمات مرور، وتُنقل بياناتك الحالية تلقائياً عند التفعيل.</p>
                        </div>
                        <div class="card-body">
                            <div style="border: 2px solid var(--primary); border-radius: 10px; padding: 18px;">
                                <b style="font-size: 1rem;"><i class="fas fa-hdd"></i> SQLite</b>
                                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; line-height: 1.7;">
                                    قاعدة SQL حقيقية داخل ملف واحد: <code style="direction:ltr;display:inline-block;">data/site_data.db</code>
                                </div>
                                <div id="sqlite-unsupported" style="display:none;color:#f59e0b;font-size:.85rem;margin-top:12px;line-height:1.7;">
                                    <i class="fas fa-exclamation-triangle"></i> غير مدعوم على استضافتك — اطلب من الدعم الفني تفعيل إضافة <code style="direction:ltr;">pdo_sqlite</code>.
                                </div>
                            </div>

                            <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                                <button class="btn btn-secondary" id="btn-test-db" style="display:flex; align-items:center; gap:8px; padding:10px 20px;">
                                    <i class="fas fa-vial"></i> فحص الاتصال
                                </button>
                                <button class="btn btn-primary" id="btn-connect-db" style="display:flex; align-items:center; gap:8px; padding:10px 20px;">
                                    <i class="fas fa-plug"></i> تفعيل وحفظ
                                </button>
                            </div>

                            <div style="margin-top:18px;padding:13px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:.85rem;color:#fcd34d;line-height:1.8;">
                                <i class="fas fa-exclamation-triangle"></i> <b>شرط أساسي:</b> ملف قاعدة البيانات يعيش داخل مجلد <code style="direction:ltr;">data</code>.
                                لا بد أن تحتفظ استضافتك بالملفات بشكل دائم (قرص دائم أو استضافة PHP عادية).
                                على الاستضافات التي تمسح الملفات عند إعادة التشغيل ستفقد إعداداتك وكلمة مرورك في كل مرة.
                            </div>

                            <div id="db-result" style="margin-top: 18px; display: none; padding: 14px; border-radius: 8px; line-height: 1.6;"></div>
                        </div>
                    </div>

                </div>



            </div>
        </div>
    </div>

    <!-- Change Credentials Modal -->
    <div id="change-password-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: var(--card-bg); padding: 30px; border-radius: 12px; width: 90%; max-width: 430px; border: 1px solid var(--border);">
            <h3 style="margin-top: 0;"><i class="fas fa-user-shield"></i> بيانات الدخول</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0;">تُحفظ في قاعدة البيانات على الخادم، وكلمة المرور مشفّرة ولا تُخزن كنص صريح.</p>

            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">كلمة المرور الحالية <span style="color: var(--danger);">*</span></label>
                <input type="password" id="old-password" class="form-control" autocomplete="current-password">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">اسم المستخدم الجديد</label>
                <input type="text" id="new-username" class="form-control" style="direction: ltr; text-align: left;" autocomplete="username" placeholder="اتركه فارغاً لعدم التغيير">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">كلمة المرور الجديدة</label>
                <input type="password" id="new-password" class="form-control" autocomplete="new-password" placeholder="اتركها فارغة لعدم التغيير">
                <small style="color: var(--text-muted); display: block; margin-top: 6px;">8 أحرف على الأقل</small>
            </div>
            <div id="password-error" style="color: var(--danger); font-size: 0.85rem; margin-bottom: 15px; display: none;"></div>
            <div id="password-success" style="color: #10b981; font-size: 0.85rem; margin-bottom: 15px; display: none;"></div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn" id="cancel-password-btn" style="background: var(--border); width: auto;">إلغاء</button>
                <button class="btn btn-primary" id="save-password-btn" style="width: auto;">حفظ</button>
            </div>
        </div>
    </div>

    <!-- Card Modal -->
    <div id="card-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center;">
        <div class="modal-content" style="background: var(--card-bg); padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; border: 1px solid var(--border);">
            <h3 style="margin-top: 0;" id="card-modal-title">إضافة بطاقة جديدة</h3>
            <input type="hidden" id="card-index-input" value="">
            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">رفع صورة (أو استخدم الرابط أدناه)</label>
                <input type="file" id="card-file-input" class="form-control" accept="image/*">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">رابط الصورة (URL)</label>
                <input type="text" id="card-src-input" class="form-control" placeholder="مثال: https://example.com/image.png">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label class="form-label">موقع النص من الأسفل (مثال: 10% أو 20px)</label>
                <input type="text" id="card-bottom-input" class="form-control" placeholder="10%">
            </div>
            <div class="form-group" style="margin-bottom: 25px;">
                <label class="form-label">موقع النص من اليمين (عادة 0% ليكون بالمنتصف)</label>
                <input type="text" id="card-right-input" class="form-control" placeholder="0%">
            </div>
            <div class="form-group" style="margin-bottom: 25px;">
                <label class="form-label">لون الخط الخاص بهذه البطاقة</label>
                <input type="color" id="card-color-input" class="form-control" style="padding: 2px; height: 40px; margin-bottom: 5px;" value="#000000">
                <label style="font-size: 0.85rem; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="checkbox" id="card-color-unified-checkbox" checked>
                    استخدام لون الخط الموحد
                </label>
            </div>
            <!-- شعار الموقع على البطاقة: يُضبط لكل بطاقة على حدة -->
            <div class="form-group" style="margin-bottom: 25px; border-top: 1px solid var(--border); padding-top: 18px;">
                <label style="font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px;">
                    <input type="checkbox" id="card-logo-show">
                    طباعة شعار الموقع على هذه البطاقة
                </label>

                <div id="card-logo-options" style="display: none;">
                    <label class="form-label" style="font-size: 0.85rem;">لون الشعار</label>
                    <div id="card-logo-tints" style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;">
                        <button type="button" class="logo-tint-btn active" data-tint="original">الأصلي</button>
                        <button type="button" class="logo-tint-btn" data-tint="white">أبيض</button>
                        <button type="button" class="logo-tint-btn" data-tint="gold">ذهبي</button>
                        <button type="button" class="logo-tint-btn" data-tint="black">أسود</button>
                    </div>

                    <!-- تنبيه ورفع مباشر: لو لم تُرفع نسخة لهذا اللون، يرفعها من هنا
                         بدل الذهاب إلى الإعدادات، فلا يفاجئه الشكل المصمت. -->
                    <div id="card-logo-missing" style="display: none; background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.45); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;">
                        <div style="font-size: .85rem; font-weight: 700; margin-bottom: 4px;">
                            لا توجد نسخة <span id="card-logo-missing-name">ذهبية</span> من الشعار
                        </div>
                        <div style="font-size: .78rem; opacity: .9; line-height: 1.7; margin-bottom: 10px;">
                            اضغط «إنشاء النسخ» ليصمّمها النظام من شعار الموقع بكل تفاصيله،
                            أو ارفع صورة PNG جاهزة بهذا اللون لتُستعمل كما هي.
                        </div>
                        <button type="button" id="card-logo-generate" class="btn" style="background: var(--primary); color: var(--btn-text-color); font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: .82rem; width: auto; display: inline-block;">
                            <i class="fas fa-magic"></i> إنشاء النسخ الآن
                        </button>
                        <input type="file" id="card-logo-variant-upload" accept="image/png,image/webp,image/svg+xml" style="display: none;">
                        <label for="card-logo-variant-upload" class="btn" style="background: rgba(255,255,255,.15); color: var(--text-color, #fff); font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: .82rem; display: inline-block;">
                            رفع نسخة جاهزة
                        </label>
                        <span id="card-logo-variant-status" style="font-size: .78rem; margin-right: 10px; opacity: .85;"></span>
                    </div>
                    <label class="form-label" style="font-size: 0.85rem;">حجم الشعار: <span id="card-logo-size-val">22</span>٪ من عرض البطاقة</label>
                    <input type="range" id="card-logo-size" class="form-control" min="5" max="80" step="1" value="22" style="padding: 0; height: auto; margin-bottom: 12px;">

                    <label class="form-label" style="font-size: 0.85rem;">شفافية الشعار: <span id="card-logo-opacity-val">100</span>٪</label>
                    <input type="range" id="card-logo-opacity" class="form-control" min="5" max="100" step="5" value="100" style="padding: 0; height: auto; margin-bottom: 14px;">
                    <label class="form-label" style="font-size: 0.85rem;">اسحب الشعار إلى المكان الذي تريده</label>
                    <div id="card-logo-stage" style="position: relative; width: 100%; max-width: 280px; margin: 0 auto 6px; border-radius: 10px; overflow: hidden; background: rgba(0,0,0,.25); touch-action: none; user-select: none;">
                        <img id="card-logo-stage-card" src="" alt="" style="width: 100%; height: auto; display: block; pointer-events: none;">
                        <img id="card-logo-ghost" src="" alt="" style="position: absolute; cursor: grab; touch-action: none;">
                    </div>
                    <div style="text-align: center; font-size: .8rem; opacity: .75;" id="card-logo-pos-label">—</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn" id="cancel-card-btn" style="background: var(--border); width: auto;">إلغاء</button>
                <button class="btn btn-primary" id="save-card-btn" style="width: auto;">حفظ البطاقة</button>
            </div>
        </div>
    </div>

    <footer class="main-footer" style="position:relative; overflow:hidden;">
        <div class="hf-decoration-overlay" id="admin-footer-decoration"></div>
        <div class="footer-copyright">
            جميع الحقوق محفوظة
        </div>
        <div class="footer-social-links" style="display: flex; gap: 15px; justify-content: center;">
        </div>
    </footer>

    <!-- JS -->
    <script src="js/logo-tint.js?v=60"></script>
    <script src="js/logo-maker.js?v=60"></script>
    <script src="js/backend-sync.js?v=60"></script>
    <script src="js/admin.js?v=60"></script>
</body>
</html>
