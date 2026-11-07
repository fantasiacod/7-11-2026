<?php
/**
 * login.php — server-rendered login page (no-cache).
 * Mirrors login.html so branding is correct even on a device that
 * is holding a stale cached copy of the site's JavaScript.
 */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: text/html; charset=UTF-8');
require_once __DIR__ . '/api/theme_boot.php';
function e($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }
// الألوان من جدول settings في SQLite عبر theme_boot.php
$__company = theme_get('companyName', theme_get('companyName'));
$__logo    = theme_get('logoDataUrl', theme_get('logoUrl'));
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>تسجيل الدخول - لوحة التحكم</title>
    <!-- Prevent FOUC -->
    <?php theme_render_css_vars(); ?>
    <?php theme_render_data_script(); ?>
    <script>
      window.__SITE_DATA__ = <?= json_encode(array('config' => $__config), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
    </script>
    <script src="js/theme.js?v=48"></script>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&family=Readex+Pro:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">

    
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    
    <!-- CSS -->
    <link rel="stylesheet" href="css/style.css?v=48">
    <script src="js/auth.js?v=48"></script>

    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-image: var(--bg-gradient);
            margin: 0;
            font-family: 'Tajawal', 'Cairo', sans-serif;
            color: var(--text-color, #ffffff);
            position: relative;
            overflow: hidden;
            opacity: 1;
        }

        .login-card {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 40px 35px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            z-index: 10;
            position: relative;
            box-sizing: border-box;
        }

        .login-header {
            text-align: center;
            margin-bottom: 25px;
        }

        .login-logo {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 16px;
            margin-bottom: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .login-header h2 {
            margin: 0 0 8px;
            font-size: 1.7rem;
            color: var(--text-color, #ffffff);
            font-weight: 800;
        }

        .login-header p {
            margin: 0;
            color: var(--text-color, #ffffff);
            opacity: 0.8;
            font-size: 0.95rem;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: center;
        }

        .form-label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
            color: var(--text-color, #ffffff);
            font-size: 0.95rem;
            font-weight: 600;
            text-align: center;
        }

        .form-control {
            width: 100%;
            padding: 14px 16px;
            background: rgba(255, 255, 255, 0.92) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.35);
            border-radius: 10px;
            color: #0f172a !important;
            font-family: inherit;
            font-size: 15px;
            font-weight: 700 !important;
            box-sizing: border-box;
            outline: none;
            text-align: center;
            transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
        }

        .form-control:focus {
            border-color: var(--primary, #caaa98);
            background: #ffffff !important;
            box-shadow: 0 0 0 3px rgba(202, 170, 152, 0.4);
            color: #000000 !important;
        }

        .form-control::placeholder {
            color: #64748b !important;
            text-align: center;
            font-weight: 600;
        }


        .btn-login {
            width: 100%;
            padding: 15px;
            background: var(--primary, #caaa98);
            color: var(--btn-text-color, #202940);
            border: none;
            border-radius: 10px;
            font-size: 1.05rem;
            font-weight: 800;
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
        }

        .btn-login:hover {
            filter: brightness(1.1);
            transform: translateY(-2px);
        }

        .btn-login:active {
            transform: translateY(1px);
        }

        #login-error {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            color: #fecaca;
            padding: 10px;
            border-radius: 8px;
            font-size: 0.9rem;
            margin-bottom: 15px;
            text-align: center;
            display: none;
        }

        .back-to-site {
            text-align: center;
            margin-top: 20px;
        }

        .back-to-site a {
            color: var(--text-color, #ffffff);
            opacity: 0.8;
            text-decoration: none;
            font-size: 0.9rem;
            transition: opacity 0.2s;
        }

        .back-to-site a:hover {
            opacity: 1;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <!-- Full Site Pattern Overlay -->
    <div class="decoration-overlay" id="site-decoration"></div>

    <div class="login-card">
        <div class="login-header">
            <img src="<?= e($__logo) ?>" alt="Logo" class="login-logo" id="login-logo-img">
            <h2 id="login-company-name"><?= e($__company) ?></h2>
            <p>أدخل بيانات الدخول للوصول إلى لوحة التحكم</p>
        </div>
        
        <div id="login-error"><i class="fas fa-exclamation-circle"></i> اسم المستخدم أو كلمة المرور غير صحيحة</div>

        <form id="login-form">
            <div class="form-group">
                <label class="form-label" for="username"><i class="fas fa-user"></i> اسم المستخدم</label>
                <input type="text" id="username" class="form-control" placeholder="admin" required autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label" for="password"><i class="fas fa-lock"></i> كلمة المرور</label>
                <input type="password" id="password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn-login"><i class="fas fa-sign-in-alt"></i> دخول</button>
        </form>

        <div class="back-to-site">
            <a href="/"><i class="fas fa-arrow-right"></i> العودة للموقع الرئيسي</a>
        </div>
    </div>

    <script src="js/backend-sync.js?v=48"></script>
    <script>
        function applyLoginConfig(config) {
            if (!config) return;
            const root = document.documentElement;
            if (config.colorPrimary) root.style.setProperty('--primary', config.colorPrimary);
            if (config.btnTextColor) root.style.setProperty('--btn-text-color', config.btnTextColor);
            if (config.colorBg) root.style.setProperty('--bg-color', config.colorBg);
            if (config.textColor) root.style.setProperty('--text-color', config.textColor);
            if (config.fontFamily) document.body.style.fontFamily = config.fontFamily;
            
            if (config.companyName && config.companyName.trim() !== '') {
                document.getElementById('login-company-name').innerText = config.companyName;
                document.title = 'تسجيل الدخول | ' + config.companyName;
            }

            const logoImg = document.getElementById('login-logo-img');
            if (logoImg && config.logoDataUrl && config.logoDataUrl.trim() !== '') {
                logoImg.src = config.logoDataUrl;
            }

            const deco = document.getElementById('site-decoration');
            const decType = config.decoration || config.hfDecoration || 'none';
            const decColor = config.decorationColor || config.hfDecorationColor || '#ffffff';
            const decOpacity = config.decorationOpacity || config.hfOpacity || '0.15';

            root.style.setProperty('--decoration-color', decColor);
            root.style.setProperty('--decoration-opacity', decOpacity);
            root.style.setProperty('--hf-decoration-color', decColor);
            root.style.setProperty('--hf-decoration-opacity', decOpacity);

            if (deco) {
                if (decType && decType !== 'none') {
                    deco.className = `decoration-overlay pattern-${decType} active`;
                } else {
                    deco.className = 'decoration-overlay';
                }
            }
        }
        // الألوان مطبوعة في الصفحة من قاعدة البيانات (theme_boot.php)،
        // فنطبّقها فوراً بلا أي نسخة مخزّنة في المتصفح.
        try {
            if (window.__SITE_DATA__ && window.__SITE_DATA__.config) {
                applyLoginConfig(window.__SITE_DATA__.config);
            }
        } catch(e) {}

        // Load the current look from the PHP backend (same server).
        (async () => {
            if (typeof BACKEND_SYNC !== 'undefined') {
                try {
                    const serverData = await BACKEND_SYNC.getData();
                    if (serverData && serverData.config && Object.keys(serverData.config).length > 0) {
                        applyLoginConfig(serverData.config);
                    }
                } catch (e) {
                    console.warn('[BACKEND_SYNC] login config fetch error:', e);
                }
            }
        })();

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            const errBox = document.getElementById('login-error');
            const btn = document.querySelector('.btn-login');

            errBox.style.display = 'none';
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

            const result = await AUTH.login(u, p);

            if (result.success) {
                window.location.href = '/admin/';
            } else {
                errBox.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' +
                    (result.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
                errBox.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
            }
        });
    </script>
</body>
</html>
