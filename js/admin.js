// Shared between the settings auto-save (inside DOMContentLoaded) and
// saveCards() (defined at top level). It used to be declared only inside
// the DOMContentLoaded block, so saveCards() threw a ReferenceError on
// clearTimeout — which aborted the function before it could close the
// card dialog, leaving the dialog stuck open after every save.
var autoSaveHideTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    // Writes are authorised by the server-side session cookie set at
    // login (see api/auth.php); nothing secret is kept in the browser.

    // -----------------------------------------------------
    // Keep the admin panel readable no matter what decoration
    // the client picks. A dark pattern at full opacity (which is
    // a valid choice for the public site) makes the control panel
    // itself unusable, so cap it here only. The public site still
    // renders the client's exact chosen values.
    // -----------------------------------------------------
    function clampAdminDecoration() {
        const root = document.documentElement;
        const raw = getComputedStyle(root).getPropertyValue('--decoration-opacity').trim();
        const val = parseFloat(raw);
        if (!isNaN(val) && val > 0.3) {
            root.style.setProperty('--decoration-opacity', '0.3');
            root.style.setProperty('--hf-decoration-opacity', '0.3');
        }
    }
    clampAdminDecoration();
    // Re-apply after config loads from the server/cloud
    setTimeout(clampAdminDecoration, 800);
    setTimeout(clampAdminDecoration, 2500);

    // Main Navigation Logic
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all main nav items
            navItems.forEach(n => n.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Update breadcrumb text
            const text = item.innerText.trim();
            breadcrumbCurrent.innerHTML = `<i class="fas fa-chevron-left"></i> ${text}`;

            // Switch view
            const targetId = item.getAttribute('data-target');
            if(targetId) {
                viewSections.forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById(targetId);
                if (targetView) {
                    targetView.classList.add('active');
                }
            }
        });
    });

    // Settings Sidebar Logic
    const settingsItems = document.querySelectorAll('.settings-item');
    const settingsSections = document.querySelectorAll('.settings-section');

    settingsItems.forEach(item => {
        item.addEventListener('click', () => {
            settingsItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            settingsSections.forEach(s => s.style.display = 'none');
            settingsSections.forEach(s => s.classList.remove('active'));

            const targetId = item.getAttribute('data-settings-target');
            if (targetId) {
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                    targetSection.classList.add('active');
                }
            }
        });
    });

    // =====================================================
    // إظهار القائمة الجانبية وإخفاؤها
    // -----------------------------------------------------
    // الإظهار والإخفاء يتمّان بصنف واحد على الحاوية، لا بتعديل
    // display مباشرةً. السبب: display:none يُقفز الصفحة قفزاً، ويمنع
    // أي انتقال سلس، كما يُفقد القائمة سلوكها المختلف بين الشاشة
    // الكبيرة (تطوى ويتمدّد المحتوى مكانها) والصغيرة (درج ينزلق فوق
    // المحتوى بستارة خلفه).
    // =====================================================
    const toggleSidebar   = document.getElementById('toggle-sidebar');
    const sidebar         = document.getElementById('sidebar');
    const adminLayout     = document.getElementById('admin-layout');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const NARROW = '(max-width: 992px)';

    function isNarrow() {
        return window.matchMedia(NARROW).matches;
    }

    function setSidebar(open) {
        if (!adminLayout) return;
        adminLayout.classList.toggle('sidebar-collapsed', !open);
        if (toggleSidebar) toggleSidebar.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function sidebarIsOpen() {
        return !!adminLayout && !adminLayout.classList.contains('sidebar-collapsed');
    }

    // الوضع الافتراضي: مفتوحة على الشاشة الكبيرة، مغلقة على الصغيرة
    setSidebar(!isNarrow());

    // أي بقايا display قديمة من نسخة سابقة تُزال حتى لا تتعارض مع الصنف
    if (sidebar && sidebar.style.display) sidebar.style.display = '';

    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => setSidebar(!sidebarIsOpen()));
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => setSidebar(false));
    }

    // على الشاشة الصغيرة: اختيار بند من القائمة يغلق الدرج ليرى المحتوى
    document.querySelectorAll('.sidebar-nav .nav-item, .nav-account-submenu .submenu-item')
        .forEach((el) => {
            el.addEventListener('click', () => { if (isNarrow()) setSidebar(false); });
        });

    // عند تغيّر حجم النافذة عبر حدّ الشاشة الصغيرة نعيد الوضع الافتراضي
    const narrowQuery = window.matchMedia(NARROW);
    const onBreakpoint = (e) => setSidebar(!e.matches);
    if (narrowQuery.addEventListener) {
        narrowQuery.addEventListener('change', onBreakpoint);
    } else if (narrowQuery.addListener) {
        narrowQuery.addListener(onBreakpoint); // متصفحات أقدم
    }

    // Fullscreen Toggle
    // بند «حسابي» في القائمة الجانبية: الضغط عليه يوسّعه فيظهر خياراه
    // (تغيير اسم المستخدم وكلمة المرور / تسجيل الخروج) داخل القائمة نفسها.
    // الخياران داخل الشريط الجانبي مباشرة، فلا يعتمدان على قائمة منسدلة
    // عائمة قد تحجبها عناصر الصفحة كما كان يحدث سابقاً.
    const accountBlock = document.getElementById('account-block');
    const accountToggle = document.getElementById('account-toggle');
    if (accountBlock && accountToggle) {
        accountToggle.addEventListener('click', (e) => {
            e.preventDefault();
            accountBlock.classList.toggle('open');
        });
    }

    // Auth Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof logout === 'function') logout();
        });
    }

    // Warn loudly while the site is still on the shipped admin/admin
    // credentials — this is the single biggest risk for a new client.
    (async () => {
        if (typeof AUTH === 'undefined') return;
        const status = await AUTH.check(true);
        if (status && status.using_defaults) {
            const bar = document.createElement('div');
            bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:3000;background:#b91c1c;color:#fff;padding:12px 18px;font-weight:bold;text-align:center;box-shadow:0 -4px 12px rgba(0,0,0,.35);cursor:pointer;';
            bar.innerHTML = '<i class="fas fa-exclamation-triangle"></i> تحذير أمني: ما زلت تستخدم بيانات الدخول الافتراضية (admin / admin). اضغط هنا لتغييرها الآن.';
            bar.addEventListener('click', () => {
                bar.remove();
                const btn = document.getElementById('change-password-btn');
                if (btn) btn.click();
            });
            document.body.appendChild(bar);
        }
    })();

    // Change Password Modal
    const changePasswordBtn = document.getElementById('change-password-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const savePasswordBtn = document.getElementById('save-password-btn');

    if (changePasswordBtn && changePasswordModal) {
        changePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            changePasswordModal.style.display = 'flex';
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            const userField = document.getElementById('new-username');
            if (userField) userField.value = '';
            document.getElementById('password-error').style.display = 'none';
            document.getElementById('password-success').style.display = 'none';

            // Prefill the current username so the client sees what it is
            if (userField && typeof AUTH !== 'undefined') {
                const status = await AUTH.check(true);
                if (status && status.username) userField.placeholder = 'الحالي: ' + status.username;
            }
        });

        cancelPasswordBtn.addEventListener('click', () => {
            changePasswordModal.style.display = 'none';
        });

        savePasswordBtn.addEventListener('click', async () => {
            const oldPass = document.getElementById('old-password').value;
            const newPass = document.getElementById('new-password').value;
            const newUserEl = document.getElementById('new-username');
            const newUser = newUserEl ? newUserEl.value.trim() : '';

            const errEl = document.getElementById('password-error');
            const okEl = document.getElementById('password-success');
            errEl.style.display = 'none';
            okEl.style.display = 'none';

            if (!oldPass) {
                errEl.innerText = 'يرجى إدخال كلمة المرور الحالية.';
                errEl.style.display = 'block';
                return;
            }
            if (!newUser && !newPass) {
                errEl.innerText = 'أدخل اسم مستخدم جديد أو كلمة مرور جديدة.';
                errEl.style.display = 'block';
                return;
            }

            savePasswordBtn.disabled = true;
            savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            const result = await AUTH.changeCredentials(oldPass, newUser, newPass);

            savePasswordBtn.disabled = false;
            savePasswordBtn.innerHTML = 'حفظ';

            if (result.success) {
                okEl.innerText = result.message;
                okEl.style.display = 'block';
                // The server ends the session on change, so send them
                // back to log in with the new credentials.
                setTimeout(() => { window.location.href = '/login/'; }, 1800);
            } else {
                errEl.innerText = result.message || 'تعذر تغيير البيانات.';
                errEl.style.display = 'block';
            }
        });
    }

    // Fullscreen Toggle
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });

    const logoUpload = document.getElementById('logo-upload');
    const logoFileName = document.getElementById('logo-file-name');
    const logoPreview = document.getElementById('logo-preview-container');
    const logoUrlInput = document.getElementById('setting-logo-url');

    // تُستدعى بعد رفع شعار جديد: تصميم النسخ الثلاث فوراً بلا تدخّل.
    function autoMakeVariants() {
        if (typeof generateLogoVariants !== 'function') return;
        const msg = document.getElementById('logo-generate-status');
        generateLogoVariants((m) => { if (msg) msg.textContent = m; });
    }

    function updateLogoPreview(src) {
        if (!logoPreview) return;
        if (src && src.trim() !== '') {
            logoPreview.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        } else {
            logoPreview.innerHTML = `<div class="logo-badge" id="logo-placeholder"><div class="logo-inner">SCHOOL LOGO</div></div>`;
        }
    }

    if (logoUpload) {
        logoUpload.addEventListener('change', async function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                logoFileName.textContent = file.name;
                if (typeof BACKEND_SYNC !== 'undefined') {
                    const res = await BACKEND_SYNC.uploadImage(file, 'logo');
                    if (res && res.url) {
                        updateLogoPreview(res.url);
                        if (logoUrlInput) logoUrlInput.value = '';
                        if (typeof triggerAutoSave === 'function') triggerAutoSave();
                        // شعار جديد ⇐ النسخ القديمة صارت لشعار آخر: نعيد تصميمها
                        autoMakeVariants();
                        return;
                    }
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    updateLogoPreview(e.target.result);
                    if(logoUrlInput) logoUrlInput.value = ''; // clear url if file uploaded
                    if (typeof triggerAutoSave === 'function') triggerAutoSave();
                    autoMakeVariants();
                }
                reader.readAsDataURL(file);
            } else {
                logoFileName.textContent = 'لم يتم اختيار ملف';
                if (!logoUrlInput || logoUrlInput.value.trim() === '') {
                    updateLogoPreview('');
                    if (typeof triggerAutoSave === 'function') triggerAutoSave();
                }
            }
        });
    }

    if (logoUrlInput) {
        logoUrlInput.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                updateLogoPreview(this.value.trim());
                if (logoUpload) {
                    logoUpload.value = ''; // clear file input
                    if(logoFileName) logoFileName.textContent = 'لم يتم اختيار ملف';
                }
            } else {
                // If they cleared the URL, and there is no file, clear preview
                if (!logoUpload || !logoUpload.files || logoUpload.files.length === 0) {
                    updateLogoPreview('');
                }
            }
            if (typeof triggerAutoSave === 'function') triggerAutoSave();
        });
    }

    // =====================================================
    // نسخ الشعار الملوّنة
    // -----------------------------------------------------
    // لكل لون نسخة PNG جاهزة يرفعها صاحب الموقع. هذه أفضل بكثير من
    // التلوين التلقائي الذي يحوّل الشعار إلى شكل مصمت بلون واحد.
    // تُحفظ روابطها في الإعدادات: logoWhite / logoGold / logoBlack.
    // =====================================================
    const LOGO_VARIANTS = { white: "logoWhite", gold: "logoGold", black: "logoBlack" };

    function variantPreviewEl(v) { return document.getElementById("logo-" + v + "-preview"); }

    function paintVariantPreview(v, src) {
        const box = variantPreviewEl(v);
        if (!box) return;
        if (src && src.trim() !== "") {
            box.innerHTML = '<img src="' + src + '" style="max-width:100%; max-height:100%; object-fit:contain;">';
        } else {
            box.innerHTML = '<span style="font-size:.72rem; opacity:.6;">لم يُرفع</span>';
        }
    }

    // مخزن واحد مشترك على مستوى النافذة.
    // سبب ذلك: محرّر شعار البطاقة معرَّف خارج DOMContentLoaded، فلو بقي
    // المخزن متغيّراً محلياً هنا لما رآه، ولكتب الحفظ التلقائي قيمة فارغة
    // فوق النسخة التي رُفعت للتو من داخل نافذة البطاقة.
    window.__LOGO_VARIANTS__ = window.__LOGO_VARIANTS__ || { logoWhite: "", logoGold: "", logoBlack: "" };
    const logoVariantValues = window.__LOGO_VARIANTS__;
    window.paintVariantPreview = paintVariantPreview;

    function loadLogoVariants(config) {
        Object.keys(LOGO_VARIANTS).forEach((v) => {
            const key = LOGO_VARIANTS[v];
            const val = (config && typeof config[key] === "string") ? config[key] : "";
            logoVariantValues[key] = val;
            paintVariantPreview(v, val);
        });
    }

    Object.keys(LOGO_VARIANTS).forEach((v) => {
        const key = LOGO_VARIANTS[v];
        const input = document.getElementById("logo-" + v + "-upload");
        if (input) {
            input.addEventListener("change", async function () {
                if (!this.files || !this.files[0]) return;
                const file = this.files[0];
                let url = "";
                if (typeof BACKEND_SYNC !== "undefined") {
                    const res = await BACKEND_SYNC.uploadImage(file, "logo-" + v);
                    if (res && res.url) url = res.url;
                }
                if (!url) {
                    url = await new Promise((resolve) => {
                        const r = new FileReader();
                        r.onload = (e) => resolve(e.target.result);
                        r.onerror = () => resolve("");
                        r.readAsDataURL(file);
                    });
                }
                if (!url) return;
                logoVariantValues[key] = url;
                paintVariantPreview(v, url);
                // حدّث النسخة الحيّة فوراً حتى تراها نافذة البطاقة بلا إعادة تحميل
                if (window.__SITE_DATA__ && window.__SITE_DATA__.config) {
                    window.__SITE_DATA__.config[key] = url;
                }
                if (typeof triggerAutoSave === "function") triggerAutoSave();
            });
        }
    });

    // -----------------------------------------------------
    // تصميم النسخ الثلاث تلقائياً من شعار الموقع
    // -----------------------------------------------------
    // النظام يُباع، فلا يصحّ أن يُطلب من المشتري تجهيز ثلاث صور
    // بيده. يرفع شعاره، فيصمّم النظام النسخة البيضاء والذهبية
    // والسوداء ويحفظها في قاعدة البيانات مثل أي نسخة مرفوعة.
    const generateBtn = document.getElementById("logo-generate-btn");
    const generateMsg = document.getElementById("logo-generate-status");

    function currentLogoSrc() {
        const img = document.querySelector("#logo-preview-container img");
        if (img && img.getAttribute("src")) return img.getAttribute("src");
        const url = document.getElementById("setting-logo-url");
        if (url && url.value.trim() !== "") return url.value.trim();
        const cfg = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
        return cfg.logoDataUrl || cfg.logoUrl || "";
    }

    let generating = false;

    /**
     * يصمّم النسخ الثلاث ويحفظها. onMsg تستقبل نصّ الحالة حتى
     * يمكن عرضه في الإعدادات أو داخل نافذة البطاقة على السواء.
     */
    async function generateLogoVariants(onMsg) {
        const say = typeof onMsg === "function" ? onMsg : function () {};
        if (generating) return false;
        if (typeof LOGO_MAKER === "undefined") { say("تعذّر تحميل أداة التصميم"); return false; }

        const src = currentLogoSrc();
        if (!src) { say("ارفع شعار الموقع أولاً"); return false; }

        generating = true;
        if (generateBtn) generateBtn.disabled = true;
        try {
            const made = await LOGO_MAKER.generate(src, say);
            const names = { white: "أبيض", gold: "ذهبي", black: "أسود" };
            for (const v of ["white", "gold", "black"]) {
                const key = LOGO_VARIANTS[v];
                let url = made[v];
                say("جارٍ حفظ النسخة ال" + names[v] + "...");
                if (typeof BACKEND_SYNC !== "undefined") {
                    try {
                        const file = LOGO_MAKER.dataUrlToFile(made[v], "logo-" + v + ".png");
                        const res = await BACKEND_SYNC.uploadImage(file, "logo-" + v);
                        if (res && res.url) url = res.url;
                    } catch (e) {
                        // الرفع تعذّر: نحفظ الصورة نفسها داخل الإعدادات
                    }
                }
                logoVariantValues[key] = url;
                paintVariantPreview(v, url);
                if (window.__SITE_DATA__ && window.__SITE_DATA__.config) {
                    window.__SITE_DATA__.config[key] = url;
                }
                const input = document.getElementById("logo-" + v + "-upload");
                if (input) input.value = "";
            }
            if (typeof triggerAutoSave === "function") triggerAutoSave();
            say("تم تصميم النسخ الثلاث ✓");
            return true;
        } catch (e) {
            say((e && e.message) ? e.message : "تعذّر تصميم النسخ");
            return false;
        } finally {
            generating = false;
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    // نافذة البطاقة معرَّفة خارج DOMContentLoaded، فتحتاجها عبر النافذة
    window.generateLogoVariants = generateLogoVariants;

    if (generateBtn) {
        generateBtn.addEventListener("click", (e) => {
            e.preventDefault();
            generateLogoVariants((m) => { if (generateMsg) generateMsg.textContent = m; });
        });
    }

    document.querySelectorAll(".logo-variant-clear").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const v = btn.getAttribute("data-variant");
            const key = LOGO_VARIANTS[v];
            if (!key) return;
            logoVariantValues[key] = "";
            paintVariantPreview(v, "");
            const input = document.getElementById("logo-" + v + "-upload");
            if (input) input.value = "";
            if (window.__SITE_DATA__ && window.__SITE_DATA__.config) {
                window.__SITE_DATA__.config[key] = "";
            }
            if (typeof triggerAutoSave === "function") triggerAutoSave();
        });
    });
    // Site Decoration Preview Logic (Unified - applies to header, footer, body)
    const decorationSelect = document.getElementById('setting-decoration');
    const decorationPreview = document.getElementById('decoration-preview-container');
    const decorationMask = document.getElementById('decoration-preview-mask');
    const decorationText = document.getElementById('decoration-preview-text');
    const decorationColor = document.getElementById('setting-decoration-color');
    const decorationOpacity = document.getElementById('setting-decoration-opacity');
    const decorationOpacityVal = document.getElementById('decoration-opacity-val');
    const decorationColor1 = document.getElementById('setting-hf-color1');
    const decorationColor2 = document.getElementById('setting-hf-color2');
    
    const decorationPatterns = {
        'none': 'none',
        'arabic': `url("assets/pattern_arabic.png")`,
        'islamic-1': `url("assets/pattern_islamic.png")`,
        'islamic-2': `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        'modern-dots': `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`
    };

    function updateDecorationPreview() {
        if (!decorationMask) return;
        const val = decorationSelect ? decorationSelect.value : 'none';
        const color = decorationColor ? decorationColor.value : '#ffffff';
        const opacity = decorationOpacity ? decorationOpacity.value : '0.15';
        const c1 = decorationColor1 ? decorationColor1.value : '#202940';
        const c2 = decorationColor2 ? decorationColor2.value : '#4b4038';

        if (decorationPreview) {
            decorationPreview.style.background = `linear-gradient(90deg, ${c1}, ${c2})`;
        }

        decorationMask.style.webkitMaskImage = decorationPatterns[val] || 'none';
        decorationMask.style.maskImage = decorationPatterns[val] || 'none';
        
        if (val === 'modern-dots') {
            decorationMask.style.webkitMaskSize = '50px';
            decorationMask.style.maskSize = '50px';
        } else if (val === 'islamic-1') {
            decorationMask.style.webkitMaskSize = '250px';
            decorationMask.style.maskSize = '250px';
        } else if (val === 'arabic') {
            decorationMask.style.webkitMaskSize = '300px';
            decorationMask.style.maskSize = '300px';
        } else {
            decorationMask.style.webkitMaskSize = '100px';
            decorationMask.style.maskSize = '100px';
        }

        decorationMask.style.webkitMaskRepeat = 'repeat';
        decorationMask.style.maskRepeat = 'repeat';
        decorationMask.style.backgroundColor = color;
        decorationMask.style.opacity = opacity;

        if(decorationOpacityVal) decorationOpacityVal.textContent = opacity;
        if(decorationText) decorationText.textContent = decorationSelect.options[decorationSelect.selectedIndex].text;
    }

    if (decorationSelect) decorationSelect.addEventListener('change', updateDecorationPreview);
    if (decorationColor) decorationColor.addEventListener('input', updateDecorationPreview);
    if (decorationOpacity) decorationOpacity.addEventListener('input', updateDecorationPreview);
    if (decorationColor1) decorationColor1.addEventListener('input', updateDecorationPreview);
    if (decorationColor2) decorationColor2.addEventListener('input', updateDecorationPreview);

    // Font & Text Color Live Preview Logic
    function updateFontPreview() {
        const fontVal = document.getElementById('setting-font') ? document.getElementById('setting-font').value : "'Tajawal', sans-serif";
        const textColorVal = document.getElementById('setting-text-color') ? document.getElementById('setting-text-color').value : (document.getElementById('setting-text-color-app') ? document.getElementById('setting-text-color-app').value : '#ffffff');
        const primaryVal = document.getElementById('setting-color-primary') ? document.getElementById('setting-color-primary').value : (document.getElementById('setting-color-primary-font') ? document.getElementById('setting-color-primary-font').value : '#caaa98');
        const btnTextColorVal = document.getElementById('setting-btn-text-color') ? document.getElementById('setting-btn-text-color').value : (document.getElementById('setting-btn-text-color-font') ? document.getElementById('setting-btn-text-color-font').value : '#202940');
        
        const previewBox = document.getElementById('font-preview-box');
        const previewTitle = document.getElementById('font-preview-title');
        const previewDesc = document.getElementById('font-preview-desc');
        const previewName = document.getElementById('font-preview-name');
        const previewBtn = document.getElementById('font-preview-btn');
        const previewFooter = document.getElementById('font-preview-footer');

        if (previewBox) previewBox.style.fontFamily = fontVal;
        if (previewTitle) {
            previewTitle.style.fontFamily = fontVal;
            previewTitle.style.color = textColorVal;
        }
        if (previewDesc) {
            previewDesc.style.fontFamily = fontVal;
            previewDesc.style.color = textColorVal;
        }
        if (previewName) {
            previewName.style.fontFamily = fontVal;
            previewName.style.color = textColorVal;
        }
        if (previewBtn) {
            previewBtn.style.fontFamily = fontVal;
            previewBtn.style.background = primaryVal;
            previewBtn.style.color = btnTextColorVal;
        }
        if (previewFooter) {
            previewFooter.style.fontFamily = fontVal;
            previewFooter.style.color = textColorVal;
        }
    }

    // Bind dual inputs synchronization
    function syncDual(id1, id2) {
        const el1 = document.getElementById(id1);
        const el2 = document.getElementById(id2);
        if (el1 && el2) {
            el1.addEventListener('input', () => { el2.value = el1.value; updateFontPreview(); });
            el2.addEventListener('input', () => { el1.value = el2.value; updateFontPreview(); });
        }
    }
    syncDual('setting-color-primary', 'setting-color-primary-font');
    syncDual('setting-btn-text-color', 'setting-btn-text-color-font');
    syncDual('setting-text-color', 'setting-text-color-app');

    if (document.getElementById('setting-font')) document.getElementById('setting-font').addEventListener('change', updateFontPreview);
    if (document.getElementById('setting-text-color')) document.getElementById('setting-text-color').addEventListener('input', updateFontPreview);
    if (document.getElementById('setting-color-primary')) document.getElementById('setting-color-primary').addEventListener('input', updateFontPreview);
    if (document.getElementById('setting-btn-text-color')) document.getElementById('setting-btn-text-color').addEventListener('input', updateFontPreview);
    if (document.getElementById('setting-color-primary-font')) document.getElementById('setting-color-primary-font').addEventListener('input', updateFontPreview);
    if (document.getElementById('setting-btn-text-color-font')) document.getElementById('setting-btn-text-color-font').addEventListener('input', updateFontPreview);
    if (document.getElementById('setting-text-color-app')) document.getElementById('setting-text-color-app').addEventListener('input', updateFontPreview);

    // Auto-Save Engine (Instant & Non-Blocking)
    let autoSaveTimer = null;

    function saveSettingsNow() {
        try {
            const decVal = document.getElementById('setting-decoration') ? document.getElementById('setting-decoration').value : 'islamic-1';
            const c1Val = document.getElementById('setting-hf-color1') ? document.getElementById('setting-hf-color1').value : '#202940';
            const c2Val = document.getElementById('setting-hf-color2') ? document.getElementById('setting-hf-color2').value : '#4b4038';
            const decColorVal = document.getElementById('setting-decoration-color') ? document.getElementById('setting-decoration-color').value : '#ffffff';
            const decOpacityVal = document.getElementById('setting-decoration-opacity') ? document.getElementById('setting-decoration-opacity').value : '0.15';

            let config = {
                companyName: document.getElementById('setting-company-name') ? document.getElementById('setting-company-name').value : '',
                mainSiteUrl: document.getElementById('setting-main-link') ? document.getElementById('setting-main-link').value : '',
                whatsapp: document.getElementById('setting-whatsapp') ? document.getElementById('setting-whatsapp').value : '',
                twitter: document.getElementById('setting-twitter') ? document.getElementById('setting-twitter').value : '',
                instagram: document.getElementById('setting-instagram') ? document.getElementById('setting-instagram').value : '',
                youtube: document.getElementById('setting-youtube') ? document.getElementById('setting-youtube').value : '',
                salla: document.getElementById('setting-salla') ? document.getElementById('setting-salla').value : '',
                blog: document.getElementById('setting-blog') ? document.getElementById('setting-blog').value : '',
                
                // Unified decoration system
                decoration: decVal,
                decorationColor: decColorVal,
                decorationOpacity: decOpacityVal,
                hfDecoration: decVal,
                hfColor1: c1Val,
                hfColor2: c2Val,
                hfDecorationColor: decColorVal,
                hfOpacity: decOpacityVal,

                fontFamily: document.getElementById('setting-font') ? document.getElementById('setting-font').value : "'Tajawal', sans-serif",
                textColor: document.getElementById('setting-text-color') ? document.getElementById('setting-text-color').value : (document.getElementById('setting-text-color-app') ? document.getElementById('setting-text-color-app').value : '#ffffff'),
                cardTextColor: document.getElementById('setting-text-color') ? document.getElementById('setting-text-color').value : (document.getElementById('setting-text-color-app') ? document.getElementById('setting-text-color-app').value : '#ffffff'),
                colorPrimary: document.getElementById('setting-color-primary') ? document.getElementById('setting-color-primary').value : (document.getElementById('setting-color-primary-font') ? document.getElementById('setting-color-primary-font').value : '#caaa98'),
                btnTextColor: document.getElementById('setting-btn-text-color') ? document.getElementById('setting-btn-text-color').value : (document.getElementById('setting-btn-text-color-font') ? document.getElementById('setting-btn-text-color-font').value : '#202940'),
                colorBg: document.getElementById('setting-color-bg') ? document.getElementById('setting-color-bg').value : '#4b4038',
                adminCardBg: document.getElementById('setting-admin-card-bg') ? document.getElementById('setting-admin-card-bg').value : '#9a8678',
                logoPosition: document.getElementById('setting-logo-position') ? document.getElementById('setting-logo-position').value : 'right',
                buttonsPosition: document.getElementById('setting-buttons-position') ? document.getElementById('setting-buttons-position').value : 'left',
            };
            
            const logoImg = document.querySelector('#logo-preview-container img');
            if (logoImg) {
                config.logoDataUrl = logoImg.getAttribute('src');
            } else {
                config.logoDataUrl = '';
            }

            // نسخ الشعار الملوّنة تُحفظ مع بقية الإعدادات.
            // المصدر هو المخزن المشترك، ويُستكمل مما هو محمّل في الصفحة،
            // حتى لا يمحو حفظٌ تلقائي نسخةً رُفعت من نافذة البطاقة.
            const vstore = window.__LOGO_VARIANTS__ || {};
            const vlive  = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
            ['logoWhite', 'logoGold', 'logoBlack'].forEach((k) => {
                config[k] = vstore[k] || vlive[k] || '';
            });

            // لا تُخزَّن الإعدادات في المتصفح: تُطبَّق على الشاشة فوراً
            // وتُحفظ في قاعدة البيانات عبر BACKEND_SYNC أدناه.
            applyConfig(config);

            const indicator = document.getElementById('auto-save-indicator');
            if (indicator) {
                clearTimeout(autoSaveHideTimer);
                indicator.style.display = 'flex';
                indicator.style.opacity = '1';
                indicator.style.color = '#10b981';
                indicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                indicator.style.background = 'rgba(16, 185, 129, 0.15)';
                indicator.innerHTML = '<i class="fas fa-check-circle"></i> تم الحفظ بنجاح';
                
                autoSaveHideTimer = setTimeout(() => {
                    indicator.style.opacity = '0';
                    setTimeout(() => {
                        indicator.style.display = 'none';
                    }, 300);
                }, 1800);
            }

            if (typeof BACKEND_SYNC !== 'undefined') {
                BACKEND_SYNC.saveData({ config: config }).catch(err => console.warn('[BACKEND_SYNC] Auto-save error:', err));
            }

        } catch (err) {
            console.error('Save error:', err);
        }
    }

    function triggerAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveSettingsNow();
        }, 200);
    }
    // محرّر شعار البطاقة معرَّف خارج هذه الكتلة، فيحتاج الوصول إليها
    // ليحفظ النسخة الملوّنة التي يرفعها المستخدم من داخل النافذة.
    window.triggerAutoSave = triggerAutoSave;


    // Attach auto-save to all setting form fields
    const settingInputs = [
        'setting-company-name', 'setting-main-link', 'setting-whatsapp', 'setting-twitter',
        'setting-instagram', 'setting-youtube', 'setting-salla', 'setting-blog',
        'setting-decoration', 'setting-hf-color1', 'setting-hf-color2',
        'setting-decoration-color', 'setting-decoration-opacity',
        'setting-font', 'setting-text-color', 'setting-text-color-app',
        'setting-color-primary', 'setting-color-primary-font',
        'setting-btn-text-color', 'setting-btn-text-color-font',
        'setting-color-bg',
        'setting-admin-card-bg', 'setting-logo-position', 'setting-buttons-position',
        'setting-logo-url'
    ];



    settingInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', triggerAutoSave);
            el.addEventListener('change', triggerAutoSave);
        }
    });

    document.querySelectorAll('.btn-save-settings').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            saveSettingsNow();
        });
    });

    // Load Settings
    // مصدر الإعدادات في اللوحة: ما طبعه الخادم في الصفحة من جدول
    // settings في SQLite، ثم ما يصل من api/get_data.php. لا localStorage.
    let currentServerConfig = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || null;

    function loadSettings() {
        const configStr = currentServerConfig ? JSON.stringify(currentServerConfig) : null;
        let config = {
            decoration: 'islamic-1',
            hfDecoration: 'islamic-1',
            hfColor1: '#202940',
            hfColor2: '#4b4038',
            hfDecorationColor: '#ffffff',
            hfOpacity: '0.15',
            decorationColor: '#ffffff',
            decorationOpacity: '0.15',
            colorPrimary: '#caaa98',
            btnTextColor: '#202940',
            colorBg: '#4b4038',
            logoDataUrl: 'img/logo.jpg',
            companyName: 'بطاقات التهنئة',
            logoPosition: 'right',
            buttonsPosition: 'left',
            fontFamily: "'Tajawal', sans-serif",
            textColor: '#ffffff',
            cardTextColor: '#ffffff'
        };
        if (configStr) {
            config = JSON.parse(configStr);
        }
        if (config) {
            if(document.getElementById('setting-company-name')) document.getElementById('setting-company-name').value = config.companyName || '';
            if(document.getElementById('setting-main-link')) document.getElementById('setting-main-link').value = config.mainSiteUrl || '';
            if(document.getElementById('setting-whatsapp')) document.getElementById('setting-whatsapp').value = config.whatsapp || '';
            if(document.getElementById('setting-twitter')) document.getElementById('setting-twitter').value = config.twitter || '';
            if(document.getElementById('setting-instagram')) document.getElementById('setting-instagram').value = config.instagram || '';
            if(document.getElementById('setting-youtube')) document.getElementById('setting-youtube').value = config.youtube || '';
            if(document.getElementById('setting-salla')) document.getElementById('setting-salla').value = config.salla || '';
            if(document.getElementById('setting-blog')) document.getElementById('setting-blog').value = config.blog || '';
            if(document.getElementById('setting-hf-color1')) document.getElementById('setting-hf-color1').value = config.hfColor1 || '#202940';
            if(document.getElementById('setting-hf-color2')) document.getElementById('setting-hf-color2').value = config.hfColor2 || '#4b4038';
            if(document.getElementById('setting-decoration')) {
                const decVal = config.decoration || config.hfDecoration || 'islamic-1';
                document.getElementById('setting-decoration').value = decVal;
                if(document.getElementById('setting-decoration-color')) document.getElementById('setting-decoration-color').value = config.decorationColor || config.hfDecorationColor || '#ffffff';
                if(document.getElementById('setting-decoration-opacity')) document.getElementById('setting-decoration-opacity').value = config.decorationOpacity || config.hfOpacity || '0.15';
                updateDecorationPreview();
            }

            const primaryVal = config.colorPrimary || '#caaa98';
            const btnTextVal = config.btnTextColor || '#202940';
            const textVal = config.textColor || '#ffffff';

            if(document.getElementById('setting-font')) document.getElementById('setting-font').value = config.fontFamily || "'Tajawal', sans-serif";
            if(document.getElementById('setting-text-color')) document.getElementById('setting-text-color').value = textVal;
            if(document.getElementById('setting-text-color-app')) document.getElementById('setting-text-color-app').value = textVal;
            if(document.getElementById('setting-card-text-color')) document.getElementById('setting-card-text-color').value = textVal;
            if(document.getElementById('setting-color-primary')) document.getElementById('setting-color-primary').value = primaryVal;
            if(document.getElementById('setting-color-primary-font')) document.getElementById('setting-color-primary-font').value = primaryVal;
            if(document.getElementById('setting-btn-text-color')) document.getElementById('setting-btn-text-color').value = btnTextVal;
            if(document.getElementById('setting-btn-text-color-font')) document.getElementById('setting-btn-text-color-font').value = btnTextVal;
            if(document.getElementById('setting-color-bg')) document.getElementById('setting-color-bg').value = config.colorBg || '#4b4038';
            if(document.getElementById('setting-admin-card-bg')) document.getElementById('setting-admin-card-bg').value = config.adminCardBg || '#9a8678';
            if(document.getElementById('setting-logo-position')) document.getElementById('setting-logo-position').value = config.logoPosition || 'right';
            if(document.getElementById('setting-buttons-position')) document.getElementById('setting-buttons-position').value = config.buttonsPosition || 'left';

            updateFontPreview();

            if (config.logoDataUrl && document.getElementById('logo-preview-container')) {
                document.getElementById('logo-preview-container').innerHTML = `<img src="${config.logoDataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
                if (config.logoDataUrl.startsWith('data:image')) {
                    if(document.getElementById('logo-file-name')) document.getElementById('logo-file-name').textContent = 'logo_image';
                } else {
                    if(document.getElementById('setting-logo-url')) document.getElementById('setting-logo-url').value = config.logoDataUrl;
                }
            }

            // نسخ الشعار الملوّنة المرفوعة
            if (typeof loadLogoVariants === 'function') loadLogoVariants(config);

            applyConfig(config);
        }
    }

    // Apply config
    function applyConfig(config) {
        if (config.colorPrimary) {
            document.documentElement.style.setProperty('--primary', config.colorPrimary);
        }
        if (config.btnTextColor) {
            document.documentElement.style.setProperty('--btn-text-color', config.btnTextColor);
        }
        if (config.colorBg) {
            document.documentElement.style.setProperty('--bg-color', config.colorBg);
        }
        if (config.adminCardBg) {
            document.documentElement.style.setProperty('--card-bg', config.adminCardBg);
        }
        if (config.fontFamily) {
            document.body.style.fontFamily = config.fontFamily;
        }
        if (config.textColor) {
            document.documentElement.style.setProperty('--text-color', config.textColor);
            document.documentElement.style.setProperty('--card-text-color', config.textColor);
            document.documentElement.style.setProperty('--text-main', config.textColor);
            document.documentElement.style.setProperty('--text-muted', config.textColor);
        }




        // Apply unified decoration & colors to Admin
        const mainDeco = document.getElementById('admin-main-decoration');
        const sidebarDeco = document.getElementById('admin-sidebar-decoration');
        const topbarDeco = document.getElementById('admin-topbar-decoration');
        const footerDeco = document.getElementById('admin-footer-decoration');

        const dec = config.decoration || config.hfDecoration || 'none';
        const decColor = config.decorationColor || config.hfDecorationColor || '#ffffff';
        const decOpacity = config.decorationOpacity || config.hfOpacity || '0.15';

        document.documentElement.style.setProperty('--decoration-color', decColor);
        document.documentElement.style.setProperty('--decoration-opacity', decOpacity);
        document.documentElement.style.setProperty('--hf-decoration-color', decColor);
        document.documentElement.style.setProperty('--hf-decoration-opacity', decOpacity);
        document.documentElement.style.setProperty('--hf-bg-color1', config.hfColor1 || '#202940');
        document.documentElement.style.setProperty('--hf-bg-color2', config.hfColor2 || '#4b4038');

        if (dec && dec !== 'none') {
            if (mainDeco) mainDeco.className = `decoration-overlay pattern-${dec} active`;
            if (sidebarDeco) sidebarDeco.className = `hf-decoration-overlay pattern-${dec} active`;
            if (topbarDeco) topbarDeco.className = `hf-decoration-overlay pattern-${dec} active`;
            if (footerDeco) footerDeco.className = `hf-decoration-overlay pattern-${dec} active`;
        } else {
            if (mainDeco) mainDeco.className = 'decoration-overlay';
            if (sidebarDeco) sidebarDeco.className = 'hf-decoration-overlay';
            if (topbarDeco) topbarDeco.className = 'hf-decoration-overlay';
            if (footerDeco) footerDeco.className = 'hf-decoration-overlay';
        }


        
        const companyNameVal = config.companyName && config.companyName.trim() !== '' ? config.companyName : 'اسم الشركة';
        const topbarCompany = document.querySelector('.header-company-name');
        if (topbarCompany) {
            topbarCompany.innerHTML = `<i class="fas fa-building"></i> <span>${companyNameVal}</span>`;
        }
        document.title = 'لوحة التحكم | ' + companyNameVal;
        
        const adminFooterLinks = document.querySelector('.footer-social-links');
        if (adminFooterLinks) {
            adminFooterLinks.innerHTML = '';
            const linkStyle = 'color: var(--text-color, var(--text-muted)); font-size: 1.2rem; transition: color 0.3s;';
            if (config.whatsapp) adminFooterLinks.innerHTML += `<a href="${config.whatsapp}" target="_blank" title="واتساب" style="${linkStyle}"><i class="fab fa-whatsapp"></i></a>`;
            if (config.twitter) adminFooterLinks.innerHTML += `<a href="${config.twitter}" target="_blank" title="تويتر (X)" style="${linkStyle}"><i class="fa-brands fa-x-twitter"></i></a>`;
            if (config.instagram) adminFooterLinks.innerHTML += `<a href="${config.instagram}" target="_blank" title="انستجرام" style="${linkStyle}"><i class="fab fa-instagram"></i></a>`;
            if (config.youtube) adminFooterLinks.innerHTML += `<a href="${config.youtube}" target="_blank" title="يوتيوب" style="${linkStyle}"><i class="fab fa-youtube"></i></a>`;
            if (config.salla) adminFooterLinks.innerHTML += `<a href="${config.salla}" target="_blank" title="رابط المتجر" style="${linkStyle}"><i class="fas fa-store"></i></a>`;
            if (config.blog) adminFooterLinks.innerHTML += `<a href="${config.blog}" target="_blank" title="المدونة" style="${linkStyle}"><i class="fas fa-blog"></i></a>`;
        }
    }

    const companyInput = document.getElementById('setting-company-name');
    if (companyInput) {
        companyInput.addEventListener('input', () => {
            const val = companyInput.value.trim() || 'اسم الشركة';
            const topbarCompany = document.querySelector('.header-company-name');
            if (topbarCompany) {
                topbarCompany.innerHTML = `<i class="fas fa-building"></i> <span>${val}</span>`;
            }
            document.title = 'لوحة التحكم | ' + val;
        });
    }

    // Initialize
    loadSettings();

    if (typeof BACKEND_SYNC !== 'undefined') {
        BACKEND_SYNC.getData().then(serverData => {
            if (serverData) {
                if (serverData.config && Object.keys(serverData.config).length > 0) {
                    currentServerConfig = serverData.config;
                    loadSettings();
                }
                if (serverData.cards && serverData.cards.length > 0) {
                    serverCards = serverData.cards;
                    loadCards();
                }
            }
        }).catch(err => {
            console.warn('[BACKEND_SYNC] Admin startup fetch error:', err);
        });
    }



    // -----------------------------------------------------
    // System health check
    // -----------------------------------------------------
    async function runHealthCheck() {
        const box = document.getElementById('health-results');
        if (!box) return;
        box.innerHTML = '<span style="color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري الفحص...</span>';

        try {
            const res = await fetch('api/health.php?t=' + Date.now());
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) {
                box.innerHTML = '<div style="padding:14px;background:rgba(239,68,68,.12);border:1px solid #ef4444;border-radius:8px;color:#fecaca;">' +
                    '<b>الاستضافة لا تشغّل PHP.</b> لن يعمل تسجيل الدخول ولا حفظ البيانات. استخدم استضافة تدعم PHP.</div>';
                return;
            }
            const data = await res.json();

            let head = '';
            if (data.errors > 0) {
                head = `<div style="padding:12px;margin-bottom:14px;background:rgba(239,68,68,.12);border:1px solid #ef4444;border-radius:8px;color:#fecaca;"><b>${data.errors} مشكلة تحتاج إصلاحاً</b></div>`;
            } else {
                head = `<div style="padding:12px;margin-bottom:14px;background:rgba(16,185,129,.12);border:1px solid #10b981;border-radius:8px;color:#a7f3d0;"><b>النظام يعمل بشكل سليم</b>${data.warnings ? ` — مع ${data.warnings} ملاحظة اختيارية` : ''}</div>`;
            }

            const rows = data.checks.map(c => {
                const icon = c.severity === 'ok' ? '<i class="fas fa-check-circle" style="color:#10b981"></i>'
                    : c.severity === 'warning' ? '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>'
                    : '<i class="fas fa-times-circle" style="color:#ef4444"></i>';
                const fix = (!c.ok && c.fix)
                    ? `<div style="font-size:.82rem;color:var(--text-muted);margin-top:4px;padding-right:26px;"><b>الحل:</b> ${c.fix}</div>`
                    : '';
                return `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                          <div style="display:flex;gap:10px;align-items:flex-start;">
                            <span>${icon}</span>
                            <div><b>${c.label}</b>
                              <div style="font-size:.85rem;color:var(--text-muted);">${c.detail}</div>
                            </div>
                          </div>${fix}
                        </div>`;
            }).join('');

            box.innerHTML = head + rows;
        } catch (e) {
            box.innerHTML = '<span style="color:#ef4444;">تعذر تشغيل الفحص: ' + e.message + '</span>';
        }
    }

    const btnHealth = document.getElementById('btn-run-health');
    if (btnHealth) btnHealth.addEventListener('click', runHealthCheck);
    runHealthCheck();

    // -----------------------------------------------------
    // الربط — تخزين بيانات الموقع في SQLite
    // -----------------------------------------------------
    const dbResult     = document.getElementById('db-result');
    const btnTestDb    = document.getElementById('btn-test-db');
    const btnConnectDb = document.getElementById('btn-connect-db');
    const storageBadge = document.getElementById('storage-status-badge');

    function showDbResult(ok, html) {
        if (!dbResult) return;
        dbResult.style.display = 'block';
        dbResult.style.background = ok ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)';
        dbResult.style.border = '1px solid ' + (ok ? '#10b981' : '#ef4444');
        dbResult.style.color = ok ? '#a7f3d0' : '#fecaca';
        dbResult.innerHTML = html;
    }

    function setStorageBadge(state, text) {
        if (!storageBadge) return;
        const color = state === 'ok' ? '#10b981' : state === 'warn' ? '#f59e0b' : 'var(--text-muted)';
        storageBadge.style.background  = state === 'ok' ? 'rgba(16,185,129,.2)' : 'rgba(148,163,184,.2)';
        storageBadge.style.color       = color;
        storageBadge.style.borderColor = state === 'ok' ? '#10b981' : 'var(--border)';
        storageBadge.innerHTML =
            '<i class="fas fa-circle" style="font-size: 8px; vertical-align: middle;"></i> ' + text;
    }

    async function loadDbConfig() {
        try {
            const res = await fetch('api/db_config.php?t=' + Date.now(), { credentials: 'same-origin' });
            if (res.status === 401) {
                setStorageBadge('warn', 'يلزم تسجيل الدخول');
                return;
            }
            const data = await res.json();
            if (!data || !data.success) return;

            const supported = !!(data.available && data.available.sqlite);
            const note = document.getElementById('sqlite-unsupported');
            if (note) note.style.display = supported ? 'none' : 'block';
            if (btnConnectDb) btnConnectDb.disabled = !supported;
            if (btnTestDb) btnTestDb.disabled = !supported;

            if (data.driver === 'sqlite') {
                setStorageBadge('ok', 'مُفعّل — SQLite');
            } else if (!supported) {
                setStorageBadge('warn', 'SQLite غير مدعوم على استضافتك');
            } else {
                setStorageBadge('idle', 'غير مُفعّل — التخزين الحالي: ملف احتياطي');
            }
        } catch (e) {
            setStorageBadge('warn', 'تعذر قراءة الحالة');
        }
    }

    async function runDbAction(action, btn) {
        if (!btn) return;
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التنفيذ...';
        try {
            const res = await fetch('api/db_config.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driver: 'sqlite', action: action })
            });
            if (res.status === 401) {
                showDbResult(false, '<i class="fas fa-times-circle"></i> انتهت جلسة الدخول — يرجى تسجيل الدخول من جديد.');
                return;
            }
            const data = await res.json();
            showDbResult(
                !!data.success,
                (data.success ? '<i class="fas fa-check-circle"></i> ' : '<i class="fas fa-times-circle"></i> ') +
                (data.message || '')
            );
            if (data.success) loadDbConfig();
        } catch (e) {
            showDbResult(false, '<i class="fas fa-times-circle"></i> تعذر الاتصال بالخادم: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    if (btnTestDb)    btnTestDb.addEventListener('click', () => runDbAction('test', btnTestDb));
    if (btnConnectDb) btnConnectDb.addEventListener('click', () => runDbAction('save', btnConnectDb));

    loadDbConfig();

    // Initialize Charts
    // مكتبة الرسوم تُحمَّل من الإنترنت، وقد تفشل على شبكة ضعيفة أو مع
    // مانع إعلانات. بدون هذا الحاجز يتوقف تنفيذ الكود عند الخطأ.
    try {
        initCharts();
    } catch (e) {
        console.warn('تعذر رسم الرسوم البيانية:', e.message);
    }
});

function initCharts() {
    // Colors dynamically retrieved from CSS variables
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#caaa98';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
    const warning = '#f59e0b';
    const success = '#10b981';
    const textMuted = textColor;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { font: { family: 'inherit', weight: '700' }, color: textColor }
            }
        },
        scales: {
            x: { ticks: { color: textColor }, grid: { color: 'rgba(255,255,255,0.08)' } },
            y: {
                beginAtZero: true,
                max: 5,
                ticks: { stepSize: 1, color: textColor },
                grid: { color: 'rgba(255,255,255,0.08)' }
            }
        }
    };

    // Read Stats from localStorage
    let statsStr = localStorage.getItem('siteStats');
    let siteStats = statsStr ? JSON.parse(statsStr) : {views: 0, previews: 0, downloads: 0};
    
    // Update summary cards
    const viewsEl = document.getElementById('stat-views');
    const previewsEl = document.getElementById('stat-previews');
    const downloadsEl = document.getElementById('stat-downloads');
    const completionEl = document.getElementById('stat-completion');
    
    if (viewsEl) viewsEl.innerText = siteStats.views || 0;
    if (previewsEl) previewsEl.innerText = siteStats.previews || 0;
    if (downloadsEl) downloadsEl.innerText = siteStats.downloads || 0;
    
    let completionRate = 0;
    if ((siteStats.views || 0) > 0) {
        completionRate = Math.round(((siteStats.downloads || 0) / siteStats.views) * 100);
    }
    if (completionEl) completionEl.innerText = completionRate + '%';

    // Update Progress Bars
    const progViewsVal = document.getElementById('prog-views-val');
    const progViewsBar = document.getElementById('prog-views-bar');
    const progPreviewsVal = document.getElementById('prog-previews-val');
    const progPreviewsBar = document.getElementById('prog-previews-bar');
    const progDownloadsVal = document.getElementById('prog-downloads-val');
    const progDownloadsBar = document.getElementById('prog-downloads-bar');
    const progCompletionVal = document.getElementById('prog-completion-val');

    if (progViewsVal) {
        let v = siteStats.views || 0;
        let p = siteStats.previews || 0;
        let d = siteStats.downloads || 0;
        
        progViewsVal.innerText = v;
        progPreviewsVal.innerText = p;
        progDownloadsVal.innerText = d;
        progCompletionVal.innerText = completionRate + '%';

        progViewsBar.style.width = v > 0 ? '100%' : '0%';
        progPreviewsBar.style.width = v > 0 ? Math.round((p / v) * 100) + '%' : '0%';
        progDownloadsBar.style.width = v > 0 ? Math.round((d / v) * 100) + '%' : '0%';
    }

    // 1. Traffic Line Chart
    let trafficChart;
    const ctxTraffic = document.getElementById('trafficChart');
    // مستمع زر «تصفير الإحصائيات» مكتوب بعد هذا الرسم داخل نفس الدالة.
    // مكتبة Chart تُحمَّل من الإنترنت، فإن فشل تحميلها يرمي السطر التالي
    // خطأً ولا يُربط الزر أبداً فيبدو ميتاً. try تضمن أن يكمل التنفيذ
    // إلى ربط الزر مهما حدث للرسوم البيانية.
    try {
    if (ctxTraffic) {
        // Just show a flat line for the past days and current stats for today
        const v = siteStats.views || 0;
        const p = siteStats.previews || 0;
        const d = siteStats.downloads || 0;

        trafficChart = new Chart(ctxTraffic.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['2026-05-10', '2026-05-14', '2026-05-18', '2026-05-22', '2026-05-26', '2026-05-30', '2026-06-03', 'اليوم'],
                datasets: [
                    {
                        label: 'المشاهدات',
                        data: [0, 0, 0, 0, 0, 0, 0, v],
                        borderColor: primary,
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'المعاينات',
                        data: [0, 0, 0, 0, 0, 0, 0, p],
                        borderColor: warning,
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'التحميلات',
                        data: [0, 0, 0, 0, 0, 0, 0, d],
                        borderColor: success,
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: chartOptions
        });
    }
    } catch (e) {
        console.warn('تعذر رسم مخطط حركة الزوار:', e.message);
    }

    // Reset Stats Logic
    const resetStatsBtn = document.getElementById('reset-stats-btn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد من تصفير الإحصائيات بالكامل؟')) {
                localStorage.setItem('siteStats', JSON.stringify({views: 0, previews: 0, downloads: 0}));
                localStorage.setItem('cardStats', JSON.stringify({}));

                if (typeof BACKEND_SYNC !== 'undefined') {
                    BACKEND_SYNC.resetStats().catch(err => console.warn('[BACKEND_SYNC] resetStats error:', err));
                }
                
                // Update UI immediately
                if (viewsEl) viewsEl.innerText = 0;
                if (previewsEl) previewsEl.innerText = 0;
                if (downloadsEl) downloadsEl.innerText = 0;
                if (completionEl) completionEl.innerText = '0%';

                if (progViewsVal) {
                    progViewsVal.innerText = 0;
                    progPreviewsVal.innerText = 0;
                    progDownloadsVal.innerText = 0;
                    progCompletionVal.innerText = '0%';
                    progViewsBar.style.width = '0%';
                    progPreviewsBar.style.width = '0%';
                    progDownloadsBar.style.width = '0%';
                }
                
                // Update Chart
                if (trafficChart) {
                    trafficChart.data.datasets[0].data[7] = 0;
                    trafficChart.data.datasets[1].data[7] = 0;
                    trafficChart.data.datasets[2].data[7] = 0;
                    trafficChart.update();
                }

                if (window.sourceChartInstance) {
                    window.sourceChartInstance.data.datasets[0].data = [0, 0];
                    window.sourceChartInstance.update();
                }
                // كان هنا استدعاء renderTable() — دالة غير معرّفة في الملف،
                // بقايا من نسخة قديمة كان فيها جدول أُزيل من اللوحة. كانت
                // ترمي ReferenceError في كل مرة يُضغط فيها زر التصفير.
            }
        });
    }

    // 2. Sources Donut Chart
    const ctxSource = document.getElementById('sourceChart');
    if (ctxSource) {
        window.sourceChartInstance = new Chart(ctxSource.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['مباشر (Direct)', 'مشاركة (Share)'],
                datasets: [{
                    data: [(siteStats.views || 0), (siteStats.downloads || 0)],
                    backgroundColor: [primary, 'rgba(255, 255, 255, 0.35)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'inherit', weight: '700' }, padding: 20, color: textColor }
                    }
                }
            },
            plugins: [{
                id: 'textCenter',
                beforeDraw: function(chart) {
                    var width = chart.width,
                        height = chart.height,
                        ctx = chart.ctx;

                    ctx.restore();
                    var fontSize = (height / 114).toFixed(2);
                    ctx.font = "bold " + fontSize + "em inherit";
                    ctx.textBaseline = "middle";
                    ctx.textAlign = "center";
                    ctx.fillStyle = textColor;

                    var total = (chart.data.datasets[0].data[0] || 0) + (chart.data.datasets[0].data[1] || 0);
                    var text = total.toString(),
                        textX = Math.round(width / 2),
                        textY = Math.round(height / 2) - 10;

                    ctx.fillText(text, textX, textY);
                    
                    ctx.font = (fontSize * 0.4) + "em Cairo";
                    ctx.fillStyle = "#94a3b8"; // Muted text for dark theme
                    ctx.fillText("الإجمالي", textX, textY + 25);
                    ctx.save();
                }
            }]
        });
    }
}

// -----------------------------------------------------
// Cards Management Logic
// -----------------------------------------------------
let adminCardsData = [];
const defaultCards = [
    { src: "https://i.postimg.cc/Y92P6tjw/image.png", bottom: "10%", right: "0%" },
    { src: "https://i.postimg.cc/D0hPcv4D/image.png", bottom: "10%", right: "0%" },
    { src: "https://i.postimg.cc/SNPRCZ9K/image.png", bottom: "25%", right: "0%" }
];

// البطاقات كذلك مصدرها الخادم لا المتصفح.
let serverCards = (window.__SITE_DATA__ && window.__SITE_DATA__.cards) || null;

function loadCards() {
    if (Array.isArray(serverCards) && serverCards.length > 0) {
        adminCardsData = serverCards;
    } else {
        adminCardsData = [...defaultCards];
    }
    renderAdminCards();
}

function saveCards() {
    // تُحفظ في قاعدة البيانات عبر BACKEND_SYNC في نهاية الدالة.
    serverCards = adminCardsData;
    renderAdminCards();

    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
        indicator.style.opacity = '1';
        indicator.style.color = '#10b981';
        indicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        indicator.style.background = 'rgba(16, 185, 129, 0.15)';
        indicator.innerHTML = '<i class="fas fa-check-circle"></i> تم حفظ وتحديث البطاقات بنجاح';
        clearTimeout(autoSaveHideTimer);
        autoSaveHideTimer = setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 1800);
    }

    if (typeof BACKEND_SYNC !== 'undefined') {
        BACKEND_SYNC.saveData({ cards: adminCardsData }).catch(err => console.warn('[BACKEND_SYNC] Save cards error:', err));
    }
}

function renderAdminCards() {
    const grid = document.getElementById('admin-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    adminCardsData.forEach((card, index) => {
        const div = document.createElement('div');
        div.style.background = 'rgba(255, 255, 255, 0.08)';
        div.style.backdropFilter = 'blur(16px)';
        div.style.webkitBackdropFilter = 'blur(16px)';
        div.style.padding = '14px';
        div.style.borderRadius = '14px';
        div.style.border = '1px solid var(--border)';
        div.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
        div.style.textAlign = 'center';
        div.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
        
        div.innerHTML = `
            <img src="${card.src}" style="width: 100%; height: 210px; object-fit: cover; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-color, #ffffff); margin-bottom: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>أسفل: ${card.bottom} | يمين: ${card.right}</span>
                ${card.color ? `<span style="display:flex; align-items:center; gap:4px;"> | لون: <span style="display:inline-block; width:14px; height:14px; border-radius:50%; border:1px solid rgba(255,255,255,0.4); background-color:${card.color};"></span></span>` : `<span style="display:flex; align-items:center; gap:4px;"> | لون: الموحد</span>`}
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn btn-edit-card" data-index="${index}" style="padding: 7px 16px; font-size: 0.85rem; font-weight: 700; background: var(--primary); color: var(--btn-text-color); border: none; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); cursor: pointer;"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn btn-delete-card" data-index="${index}" style="padding: 7px 16px; font-size: 0.85rem; font-weight: 700; background: #ef4444; color: #ffffff; border: none; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); cursor: pointer;"><i class="fas fa-trash"></i> حذف</button>
            </div>
        `;
        grid.appendChild(div);
    });

    document.querySelectorAll('.btn-edit-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let idx = e.currentTarget.getAttribute('data-index');
            openCardModal(idx);
        });
    });

    document.querySelectorAll('.btn-delete-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(confirm('هل أنت متأكد من حذف هذه البطاقة؟')) {
                let idx = e.currentTarget.getAttribute('data-index');
                adminCardsData.splice(idx, 1);
                saveCards();
            }
        });
    });
}

// Modal Logic
const cardModal = document.getElementById('card-modal');
const addCardBtn = document.getElementById('add-card-btn');
const cancelCardBtn = document.getElementById('cancel-card-btn');
const saveCardBtn = document.getElementById('save-card-btn');

const srcInput = document.getElementById('card-src-input');
const fileInput = document.getElementById('card-file-input');
const bottomInput = document.getElementById('card-bottom-input');
const rightInput = document.getElementById('card-right-input');
const colorInput = document.getElementById('card-color-input');
const colorCheckbox = document.getElementById('card-color-unified-checkbox');
const idxInput = document.getElementById('card-index-input');
const modalTitle = document.getElementById('card-modal-title');

if (fileInput) {
    fileInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (typeof BACKEND_SYNC !== 'undefined') {
                const res = await BACKEND_SYNC.uploadImage(file, 'card');
                if (res && res.url) {
                    if (srcInput) srcInput.value = res.url;
                    return;
                }
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                if(srcInput) srcInput.value = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}

// =====================================================
// محرّر شعار البطاقة داخل نافذة التعديل
// -----------------------------------------------------
// معاينة حيّة للبطاقة يُسحب فوقها الشعار بالفأرة أو بالإصبع، وأزرار
// لاختيار لونه. ما يُضبط هنا هو بالضبط ما يظهر للزوار وما يخرج في
// الصورة المحمَّلة، لأن الموضع والحجم بالنسبة المئوية من عرض البطاقة
// لا بالبكسل — فلا يتغيّر بتغيّر حجم الشاشة.
// =====================================================
const logoShowBox   = document.getElementById('card-logo-show');
const logoOptions   = document.getElementById('card-logo-options');
const logoStage     = document.getElementById('card-logo-stage');
const logoStageCard = document.getElementById('card-logo-stage-card');
const logoGhost     = document.getElementById('card-logo-ghost');
const logoPosLabel  = document.getElementById('card-logo-pos-label');
const logoTintBtns  = document.querySelectorAll('.logo-tint-btn');
const logoSizeInput = document.getElementById('card-logo-size');
const logoSizeVal   = document.getElementById('card-logo-size-val');
const logoOpInput   = document.getElementById('card-logo-opacity');
const logoOpVal     = document.getElementById('card-logo-opacity-val');
const logoMissBox   = document.getElementById('card-logo-missing');
const logoMissName  = document.getElementById('card-logo-missing-name');
const logoMissFile  = document.getElementById('card-logo-variant-upload');
const logoMissState = document.getElementById('card-logo-variant-status');
const logoMissMake  = document.getElementById('card-logo-generate');

// زر «إنشاء النسخ الآن» داخل نافذة البطاقة: يصمّم النسخ الثلاث من
// شعار الموقع دون مغادرة النافذة، ثم يعرض النتيجة في الحال.
if (logoMissMake) {
    logoMissMake.addEventListener('click', async (e) => {
        e.preventDefault();
        if (typeof window.generateLogoVariants !== 'function') return;
        logoMissMake.disabled = true;
        const ok = await window.generateLogoVariants((m) => {
            if (logoMissState) logoMissState.innerText = m;
        });
        logoMissMake.disabled = false;
        if (ok) refreshLogoEditor();
    });
}

const TINT_NAMES = { white: 'بيضاء', gold: 'ذهبية', black: 'سوداء' };
const TINT_KEYS  = { white: 'logoWhite', gold: 'logoGold', black: 'logoBlack' };

// إعدادات الشعار للبطاقة المفتوحة حالياً
let logoState = (typeof LOGO_TINT !== 'undefined') ? LOGO_TINT.defaultLogo()
                                                   : { show: false, x: 50, y: 12, size: 22, tint: 'original' };

function siteLogoSrc() {
    const cfg = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
    return cfg.logoDataUrl || cfg.logoUrl || '';
}

function paintLogoGhost() {
    if (!logoGhost) return;
    const src = siteLogoSrc();
    if (!src) {
        logoGhost.style.display = 'none';
        return;
    }
    logoGhost.style.display = 'block';
    logoGhost.style.width   = logoState.size + '%';
    logoGhost.style.right   = logoState.x + '%';
    logoGhost.style.top     = logoState.y + '%';
    logoGhost.style.opacity = (logoState.opacity / 100);
    logoGhost.style.transform = 'translate(50%, -50%)';
    if (logoPosLabel) {
        logoPosLabel.innerText = 'من اليمين ' + Math.round(logoState.x) + '٪ · من الأعلى ' + Math.round(logoState.y) + '٪';
    }
    if (logoSizeVal) logoSizeVal.innerText = Math.round(logoState.size);
    if (logoOpVal)   logoOpVal.innerText   = Math.round(logoState.opacity);
    if (logoSizeInput && logoSizeInput.value != logoState.size) logoSizeInput.value = logoState.size;
    if (logoOpInput && logoOpInput.value != logoState.opacity)  logoOpInput.value   = logoState.opacity;

    if (typeof LOGO_TINT !== 'undefined') {
        const cfg = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
        LOGO_TINT.tintLogo(src, logoState.tint, cfg).then((url) => { logoGhost.src = url; });
    } else {
        logoGhost.src = src;
    }
}

if (logoSizeInput) {
    logoSizeInput.addEventListener('input', () => {
        logoState.size = parseFloat(logoSizeInput.value) || 22;
        paintLogoGhost();
    });
}
if (logoOpInput) {
    logoOpInput.addEventListener('input', () => {
        logoState.opacity = parseFloat(logoOpInput.value) || 100;
        paintLogoGhost();
    });
}

function refreshLogoEditor() {
    if (!logoOptions) return;
    logoOptions.style.display = logoState.show ? 'block' : 'none';
    if (logoShowBox) logoShowBox.checked = logoState.show;
    const cfgNow = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
    logoTintBtns.forEach((b) => {
        const t = b.getAttribute('data-tint');
        b.classList.toggle('active', t === logoState.tint);
        // تنبيه بصري: لون بلا نسخة جاهزة سيُلوَّن تلقائياً (شكل مصمت)
        if (t !== 'original' && typeof LOGO_TINT !== 'undefined') {
            const has = LOGO_TINT.hasVariant(t, cfgNow);
            b.classList.toggle('no-variant', !has);
            b.title = has ? 'نسخة جاهزة مرفوعة' : 'لا توجد نسخة مرفوعة لهذا اللون — ارفعها من الشريط أدناه.';
        }
    });

    // شريط الرفع المباشر: يظهر فقط للون مختار بلا نسخة جاهزة
    if (logoMissBox) {
        const t = logoState.tint;
        const needs = t !== 'original' && typeof LOGO_TINT !== 'undefined'
                      && !LOGO_TINT.hasVariant(t, cfgNow);
        logoMissBox.style.display = needs ? 'block' : 'none';
        if (needs && logoMissName) logoMissName.innerText = TINT_NAMES[t] || '';
        if (logoMissState) logoMissState.innerText = '';
    }
    if (logoStageCard) logoStageCard.src = (srcInput && srcInput.value.trim()) || '';
    paintLogoGhost();
}

if (logoShowBox) {
    logoShowBox.addEventListener('change', () => {
        logoState.show = logoShowBox.checked;
        refreshLogoEditor();
    });
}

logoTintBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        logoState.tint = btn.getAttribute('data-tint') || 'original';
        refreshLogoEditor();
    });
});

// رفع نسخة اللون من داخل نافذة البطاقة مباشرة
if (logoMissFile) {
    logoMissFile.addEventListener('change', async function () {
        if (!this.files || !this.files[0]) return;
        const tint = logoState.tint;
        const key  = TINT_KEYS[tint];
        if (!key) return;

        const file = this.files[0];
        if (logoMissState) logoMissState.innerText = 'جاري الرفع...';

        let url = '';
        if (typeof BACKEND_SYNC !== 'undefined') {
            try {
                const res = await BACKEND_SYNC.uploadImage(file, 'logo-' + tint);
                if (res && res.url) url = res.url;
            } catch (e) {}
        }
        if (!url) {
            url = await new Promise((resolve) => {
                const r = new FileReader();
                r.onload = (e) => resolve(e.target.result);
                r.onerror = () => resolve('');
                r.readAsDataURL(file);
            });
        }
        if (!url) {
            if (logoMissState) logoMissState.innerText = 'تعذّر الرفع';
            return;
        }

        // حدّث النسخة الحيّة فوراً ثم احفظ في قاعدة البيانات
        if (window.__SITE_DATA__ && window.__SITE_DATA__.config) {
            window.__SITE_DATA__.config[key] = url;
        }
        window.__LOGO_VARIANTS__ = window.__LOGO_VARIANTS__ || {};
        window.__LOGO_VARIANTS__[key] = url;
        if (typeof window.paintVariantPreview === 'function') window.paintVariantPreview(tint, url);
        if (typeof window.triggerAutoSave === 'function') window.triggerAutoSave();

        this.value = '';
        if (logoMissState) logoMissState.innerText = 'تم ✓';
        refreshLogoEditor();
    });
}

// السحب: يعمل باللمس وبالفأرة عبر أحداث المؤشّر الموحّدة
if (logoGhost && logoStage) {
    let dragging = false;

    const moveTo = (clientX, clientY) => {
        const r = logoStage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        // من اليمين لأن الواجهة عربية والموضع محفوظ بالنسبة لليمين
        let x = ((r.right - clientX) / r.width) * 100;
        let y = ((clientY - r.top) / r.height) * 100;
        logoState.x = Math.min(100, Math.max(0, x));
        logoState.y = Math.min(100, Math.max(0, y));
        paintLogoGhost();
    };

    logoGhost.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dragging = true;
        logoGhost.style.cursor = 'grabbing';
        if (logoGhost.setPointerCapture) logoGhost.setPointerCapture(e.pointerId);
    });
    logoGhost.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        e.preventDefault();
        moveTo(e.clientX, e.clientY);
    });
    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        logoGhost.style.cursor = 'grab';
        if (logoGhost.releasePointerCapture && e.pointerId !== undefined) {
            try { logoGhost.releasePointerCapture(e.pointerId); } catch (err) {}
        }
    };
    logoGhost.addEventListener('pointerup', endDrag);
    logoGhost.addEventListener('pointercancel', endDrag);

    // الضغط على أي مكان في المعاينة ينقل الشعار إليه مباشرة
    logoStage.addEventListener('pointerdown', (e) => {
        if (e.target === logoGhost) return;
        moveTo(e.clientX, e.clientY);
    });
}

function openCardModal(index = null) {
    if (index !== null) {
        let card = adminCardsData[index];
        srcInput.value = card.src;
        bottomInput.value = card.bottom;
        rightInput.value = card.right;
        if (card.color) {
            if (colorInput) colorInput.value = card.color;
            if (colorCheckbox) colorCheckbox.checked = false;
        } else {
            if (colorInput) colorInput.value = '#000000';
            if (colorCheckbox) colorCheckbox.checked = true;
        }
        idxInput.value = index;
        if(fileInput) fileInput.value = '';
        logoState = (typeof LOGO_TINT !== 'undefined') ? LOGO_TINT.normalizeLogo(card.logo) : logoState;
        modalTitle.innerText = '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629'; // "تعديل البطاقة"
    } else {
        srcInput.value = '';
        if(fileInput) fileInput.value = '';
        bottomInput.value = '10%';
        rightInput.value = '0%';
        if (colorInput) colorInput.value = '#000000';
        if (colorCheckbox) colorCheckbox.checked = true;
        idxInput.value = '';
        logoState = (typeof LOGO_TINT !== 'undefined') ? LOGO_TINT.defaultLogo() : logoState;
        modalTitle.innerText = '\u0625\u0636\u0627\u0641\u0629 \u0628\u0637\u0627\u0642\u0629 \u062c\u062f\u064a\u062f\u0629'; // "إضافة بطاقة جديدة"
    }
    refreshLogoEditor();
    cardModal.style.display = 'flex';
}

function closeCardModal() {
    cardModal.style.display = 'none';
}

if (addCardBtn) {
    addCardBtn.addEventListener('click', () => openCardModal(null));
}
if (cancelCardBtn) {
    cancelCardBtn.addEventListener('click', closeCardModal);
}
if (saveCardBtn) {
    saveCardBtn.addEventListener('click', () => {
        let src = srcInput.value.trim();
        let bottom = bottomInput.value.trim();
        let right = rightInput.value.trim();
        
        if (!src) {
            alert('يرجى إدخال رابط الصورة');
            return;
        }

        let newCard = { src, bottom, right };
        if (colorCheckbox && !colorCheckbox.checked && colorInput) {
            newCard.color = colorInput.value;
        }
        // إعدادات الشعار تُحفظ مع البطاقة نفسها
        newCard.logo = {
            show: !!logoState.show,
            x: Math.round(logoState.x * 10) / 10,
            y: Math.round(logoState.y * 10) / 10,
            size: Math.round(logoState.size * 10) / 10,
            opacity: Math.round(logoState.opacity),
            tint: logoState.tint
        };
        let idx = idxInput.value;
        
        if (idx !== '') {
            adminCardsData[idx] = newCard;
        } else {
            adminCardsData.push(newCard);
        }
        
        try {
            saveCards();
        } catch (err) {
            console.error('[cards] save error:', err);
            alert('تعذر حفظ البطاقة: ' + err.message);
        } finally {
            // Always close, so a failure in saving can never leave the
            // dialog stuck open with no way to tell what happened.
            closeCardModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Other DOMContentLoaded logic...
    loadCards();
});
