/**
 * logo-tint.js — تلوين شعار الموقع قبل طباعته على البطاقة.
 * ------------------------------------------------------------
 * يُستعمل في الموقع وفي لوحة التحكم معاً حتى يكون ما تراه في اللوحة
 * هو نفسه ما يخرج في الصورة المحمَّلة، بلا أي اختلاف.
 *
 * لماذا نلوّن على لوحة رسم (canvas) بدل خاصية filter في CSS؟
 * لأن مكتبة html2canvas التي تلتقط البطاقة **لا تدعم** filter، فلو
 * لوّنّا بها لظهر الشعار ملوّناً على الشاشة وخرج بلونه الأصلي في
 * الملف المحفوظ. التلوين هنا يُنتج صورة جاهزة، فتلتقطها المكتبة كما هي.
 *
 * طريقة التلوين تحافظ على شفافية الشعار: كل بكسل غير شفاف يأخذ اللون
 * المطلوب، والشفاف يبقى شفافاً. لذلك يجب أن يكون الشعار صورة PNG
 * بخلفية شفافة — وإلا تحوّل إلى مربّع مصمت باللون المختار.
 */
(function (global) {
    'use strict';

    var TINTS = {
        original: null,
        white: '#ffffff',
        gold:  '#d4af37',
        black: '#000000'
    };

    // ذاكرة مؤقتة: لا نعيد تلوين الشعار نفسه مرّتين
    var cache = {};

    function isKnownTint(tint) {
        return Object.prototype.hasOwnProperty.call(TINTS, tint);
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            // الشعار المرفوع محلياً لا يحتاجها، لكن الرابط الخارجي يحتاجها
            // وإلا "تتلوّث" اللوحة ويفشل استخراج الصورة منها.
            img.crossOrigin = 'anonymous';
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('تعذّر تحميل الشعار')); };
            img.src = src;
        });
    }

    /** اسم مفتاح الإعدادات الذي يحمل نسخة الشعار الجاهزة لكل لون. */
    function variantKey(tint) {
        if (tint === 'white') return 'logoWhite';
        if (tint === 'gold')  return 'logoGold';
        if (tint === 'black') return 'logoBlack';
        return null;
    }

    /**
     * نسخة الشعار الجاهزة التي رفعها صاحب الموقع لهذا اللون، إن وُجدت.
     * هذه هي الطريقة الاحترافية: صورة PNG مصمَّمة بذلك اللون بكل تفاصيلها
     * ولمعانها، بدل تحويل الشعار إلى شكل مصمت بلون واحد.
     */
    function uploadedVariant(tint, config) {
        var key = variantKey(tint);
        if (!key) return '';
        var cfg = config || (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
        var v = cfg[key];
        return (typeof v === 'string' && v.trim() !== '') ? v : '';
    }

    /**
     * يعيد رابط صورة الشعار باللون المطلوب.
     *
     * الترتيب:
     *   ١. النسخة الجاهزة التي رفعها صاحب الموقع لهذا اللون — الأفضل.
     *   ٢. التلوين التلقائي — شبكة أمان حتى يبقى الخيار شغّالاً لمن لم
     *      يجهّز نسخاً، لكنه يحوّل الشعار إلى شكل مصمت.
     *   ٣. الشعار الأصلي عند أي تعذّر، فلا تختفي الصورة أبداً.
     */
    function tintLogo(src, tint, config) {
        if (!src) return Promise.resolve('');
        if (!isKnownTint(tint) || TINTS[tint] === null) {
            return Promise.resolve(src);
        }

        var ready = uploadedVariant(tint, config);
        if (ready) return Promise.resolve(ready);

        var key = tint + '|' + src;
        if (cache[key]) return Promise.resolve(cache[key]);

        return loadImage(src).then(function (img) {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            if (!w || !h) return src;

            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');

            // نرسم الشعار، ثم نملأ لونه فوقه مع الإبقاء على الشفافية
            ctx.drawImage(img, 0, 0, w, h);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = TINTS[tint];
            ctx.fillRect(0, 0, w, h);

            var url = canvas.toDataURL('image/png');
            cache[key] = url;
            return url;
        }).catch(function () {
            return src; // أي خطأ: نعرض الشعار الأصلي بدل لا شيء
        });
    }

    /** الإعدادات الافتراضية لشعار بطاقة لم تُضبط بعد. */
    function defaultLogo() {
        return { show: false, x: 50, y: 12, size: 22, opacity: 100, tint: 'original' };
    }

    /** هل يملك هذا اللون نسخة جاهزة مرفوعة؟ تُستعمل للتنبيه في اللوحة. */
    function hasVariant(tint, config) {
        return !!uploadedVariant(tint, config);
    }

    /** تنظيف قيم قادمة من قاعدة البيانات وضمان بقائها ضمن حدود منطقية. */
    function normalizeLogo(raw) {
        var d = defaultLogo();
        if (!raw || typeof raw !== 'object') return d;
        var num = function (v, fallback, min, max) {
            var n = parseFloat(v);
            if (isNaN(n)) return fallback;
            return Math.min(max, Math.max(min, n));
        };
        return {
            show: raw.show === true || raw.show === 'true' || raw.show === 1,
            x:    num(raw.x, d.x, 0, 100),
            y:    num(raw.y, d.y, 0, 100),
            size: num(raw.size, d.size, 4, 100),
            opacity: num(raw.opacity, d.opacity, 5, 100),
            tint: isKnownTint(raw.tint) ? raw.tint : d.tint
        };
    }

    global.LOGO_TINT = {
        TINTS: TINTS,
        tintLogo: tintLogo,
        defaultLogo: defaultLogo,
        normalizeLogo: normalizeLogo,
        variantKey: variantKey,
        hasVariant: hasVariant
    };
})(window);
