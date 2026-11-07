(function() {
    /**
     * تنظيف لمرة واحدة: النسخة السابقة من الموقع كانت تخزّن الألوان
     * والبطاقات في متصفح الزائر. تلك النسخ ما زالت موجودة على أجهزة من
     * زار الموقع من قبل، ولو بقيت فقد يقرأها أي كود قديم مخزّن ويعيد
     * الموقع إلى ألوان سابقة. نحذفها هنا نهائياً.
     */
    try {
        ['siteConfig_v2', 'siteConfig', 'siteCards'].forEach(function (k) {
            localStorage.removeItem(k);
        });
    } catch (e) {}

    function applyImmediateTheme() {
        try {
            // المصدر الوحيد: البيانات التي طبعها الخادم في الصفحة، وهي
            // مقروءة من جدول settings في SQLite مع كل طلب.
            // لا قراءة من localStorage إطلاقاً: النسخة المخزّنة في الجهاز
            // كانت تبقى بعد تغيير اللون فترجع بالموقع إلى لون قديم.
            const ssrConfig = (typeof window !== 'undefined' && window.__SITE_DATA__ && window.__SITE_DATA__.config)
                ? window.__SITE_DATA__.config : null;

            // قيم احتياطية للحظة الأولى فقط، ولتركيب جديد لم تُحفظ فيه
            // ألوان بعد. أي قيمة موجودة في قاعدة البيانات تعلو عليها.
            let config = {
                decoration: 'none',
                decorationColor: '#ffffff',
                decorationOpacity: '0.15',
                colorPrimary: '#caaa98',
                colorBg: '#4b4038',
                hfColor1: '#202940',
                hfColor2: '#4b4038',
                textColor: '#ffffff',
                cardTextColor: '#ffffff',
                btnTextColor: '#202940'
            };
            if (ssrConfig) {
                config = { ...config, ...ssrConfig };
            }
            const root = document.documentElement;
            
            if (config.colorPrimary) root.style.setProperty('--primary', config.colorPrimary);
            if (config.btnTextColor) root.style.setProperty('--btn-text-color', config.btnTextColor);
            if (config.colorBg) root.style.setProperty('--bg-color', config.colorBg);
            if (config.textColor) {
                root.style.setProperty('--text-color', config.textColor);
                root.style.setProperty('--card-text-color', config.textColor);
                root.style.setProperty('--text-main', config.textColor);
                root.style.setProperty('--text-muted', config.textColor);
            }


            
            if (config.hfColor1) root.style.setProperty('--hf-bg-color1', config.hfColor1);
            if (config.hfColor2) root.style.setProperty('--hf-bg-color2', config.hfColor2);
            
            const dec = config.decoration || config.hfDecoration || 'none';
            const decColor = config.decorationColor || config.hfDecorationColor || '#ffffff';
            const decOpacity = config.decorationOpacity || config.hfOpacity || '0.15';
            
            root.style.setProperty('--decoration-color', decColor);
            root.style.setProperty('--decoration-opacity', decOpacity);
            root.style.setProperty('--hf-decoration-color', decColor);
            root.style.setProperty('--hf-decoration-opacity', decOpacity);


            const applyOverlays = () => {
                if (config.fontFamily && document.body) {
                    document.body.style.fontFamily = config.fontFamily;
                }
                const overlays = document.querySelectorAll('.decoration-overlay, .hf-decoration-overlay');
                overlays.forEach(el => {
                    const isHf = el.classList.contains('hf-decoration-overlay');
                    const baseClass = isHf ? 'hf-decoration-overlay' : 'decoration-overlay';
                    if (dec && dec !== 'none') {
                        el.className = `${baseClass} pattern-${dec} active`;
                    } else {
                        el.className = baseClass;
                    }
                });
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', applyOverlays);
            } else {
                applyOverlays();
            }
        } catch (e) {
            // Ignore JSON parse errors
        }
    }
    applyImmediateTheme();
})();

