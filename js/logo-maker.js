/**
 * logo-maker.js — يصمّم النظام بنفسه ثلاث نسخ من شعار الموقع:
 * أبيض، ذهبي، أسود — انطلاقاً من الشعار الأصلي المرفوع.
 * ------------------------------------------------------------
 * لماذا؟ لأن النظام يُباع، ولا يصحّ أن يُطلب من كل مشترٍ أن يجهّز
 * ثلاث صور PNG بيده. يرفع شعاره مرّة واحدة، فيولّد النظام النسخ.
 *
 * الطريقة هي نفسها التي يستعملها المصمّم في برامج التصميم
 * (Gradient Map): نقرأ درجة إضاءة كل بكسل في الشعار الأصلي، ثم
 * نسقطها على تدرّج لوني من ذلك اللون. النتيجة تحافظ على كل
 * التفاصيل والبروز واللمعان بدل أن تحوّل الشعار إلى شكل مصمت.
 *
 * وإن كان الشعار المرفوع بخلفية مصمتة (JPG أو PNG بلا شفافية)،
 * يزيل النظام الخلفية أولاً: يبدأ من حواف الصورة ويزحف إلى الداخل
 * ما دام اللون قريباً من لون الخلفية، فلا يمسّ الأبيض الموجود
 * *داخل* الشعار نفسه.
 */
(function (global) {
    'use strict';

    // أقصى بُعد للنسخ المولّدة. الشعار يُطبع بنسبة صغيرة من عرض
    // البطاقة، فلا داعي لحجم أكبر — ويبقى حجم قاعدة البيانات معقولاً.
    var MAX_SIDE = 640;

    // تدرّجات الألوان: كل تدرّج نقاط (الموضع 0..1، اللون).
    var RAMPS = {
        gold: [
            [0.00, '#2a1c04'], [0.28, '#7a5713'], [0.52, '#c79a2b'],
            [0.72, '#eacd63'], [0.88, '#f8e9a8'], [1.00, '#fffdf2']
        ],
        white: [
            [0.00, '#c9c9c9'], [0.55, '#efefef'], [1.00, '#ffffff']
        ],
        black: [
            [0.00, '#000000'], [0.55, '#1b1b1b'], [1.00, '#4a4a4a']
        ]
    };

    var VARIANT_KEYS = { white: 'logoWhite', gold: 'logoGold', black: 'logoBlack' };
    var VARIANT_NAMES = { white: 'أبيض', gold: 'ذهبي', black: 'أسود' };

    function hexToRgb(hex) {
        var h = hex.replace('#', '');
        return [
            parseInt(h.substring(0, 2), 16),
            parseInt(h.substring(2, 4), 16),
            parseInt(h.substring(4, 6), 16)
        ];
    }

    /** جدول بحث من ٢٥٦ لوناً لتسريع الإسقاط على التدرّج. */
    function buildLut(stops) {
        var lut = new Uint8Array(256 * 3);
        var pts = stops.map(function (s) { return [s[0], hexToRgb(s[1])]; });
        for (var i = 0; i < 256; i++) {
            var t = i / 255;
            for (var j = 0; j < pts.length - 1; j++) {
                var p0 = pts[j][0], c0 = pts[j][1];
                var p1 = pts[j + 1][0], c1 = pts[j + 1][1];
                if (t <= p1 || j === pts.length - 2) {
                    var f = (p1 === p0) ? 0 : (t - p0) / (p1 - p0);
                    if (f < 0) f = 0; else if (f > 1) f = 1;
                    lut[i * 3]     = c0[0] + (c1[0] - c0[0]) * f;
                    lut[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * f;
                    lut[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * f;
                    break;
                }
            }
        }
        return lut;
    }

    var LUTS = null;
    function luts() {
        if (!LUTS) {
            LUTS = {};
            Object.keys(RAMPS).forEach(function (k) { LUTS[k] = buildLut(RAMPS[k]); });
        }
        return LUTS;
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(new Error('تعذّر تحميل صورة الشعار')); };
            img.src = src;
        });
    }

    /** هل في الصورة شفافية أصلاً؟ إن لا، فلها خلفية مصمتة يجب إزالتها. */
    function hasTransparency(data) {
        var clear = 0, total = data.length / 4;
        for (var i = 3; i < data.length; i += 4) {
            if (data[i] < 240) clear++;
        }
        return (clear / total) > 0.01;
    }

    /**
     * إزالة الخلفية بالزحف من الحواف.
     * نبدأ من بكسلات الإطار التي تشبه لون الخلفية وننتشر منها إلى
     * الجيران المشابهين. ما لا يتّصل بالحافة — كالأبيض داخل حرف —
     * يبقى كما هو. ثم نخفّف حدّة الحدود حتى لا تظهر مسنّنة.
     */
    function removeBackground(data, w, h) {
        // أقرب من TOL_LOW إلى لون الخلفية ⇐ شفاف تماماً.
        // بينهما ⇐ شفافية متدرّجة، فتذوب الظلال والهالات بنعومة.
        // أبعد من TOL_HIGH ⇐ هذا الشعار نفسه، لا نمسّه ويتوقّف الزحف عنده.
        var TOL_LOW = 40, TOL_HIGH = 110;

        function dist(i, ref) {
            var dr = data[i] - ref[0], dg = data[i + 1] - ref[1], db = data[i + 2] - ref[2];
            return Math.sqrt(dr * dr + dg * dg + db * db);
        }

        // لون الخلفية = اللون الأكثر تكراراً على إطار الصورة.
        // لا نكتفي بالأركان: ركن واحد قد يقع عليه ظلّ الشعار فيفسد التقدير.
        var bins = {};
        var best = null, bestCount = -1;
        function sample(idx) {
            var i = idx * 4;
            if (data[i + 3] < 128) return;
            var key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
            var b = bins[key];
            if (!b) { b = bins[key] = { n: 0, r: 0, g: 0, bl: 0 }; }
            b.n++; b.r += data[i]; b.g += data[i + 1]; b.bl += data[i + 2];
            if (b.n > bestCount) { bestCount = b.n; best = b; }
        }
        var x, y;
        for (x = 0; x < w; x++) { sample(x); sample((h - 1) * w + x); }
        for (y = 0; y < h; y++) { sample(y * w); sample(y * w + (w - 1)); }
        if (!best) return;
        var ref = [best.r / best.n, best.g / best.n, best.bl / best.n];

        var n = w * h;
        var alpha = new Uint8Array(n);     // الشفافية الجديدة للبكسلات المزالة
        var seen = new Uint8Array(n);
        var stack = new Int32Array(n);
        var top = 0;

        function push(idx) {
            if (seen[idx]) return;
            var d = dist(idx * 4, ref);
            if (d >= TOL_HIGH) return;     // جزء من الشعار: يتوقّف الزحف
            seen[idx] = 1;
            var a = (d - TOL_LOW) / (TOL_HIGH - TOL_LOW);
            if (a < 0) a = 0;
            alpha[idx] = Math.round(255 * a) || 0;
            stack[top++] = idx;
        }

        for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
        for (y = 0; y < h; y++) { push(y * w); push(y * w + (w - 1)); }

        while (top > 0) {
            var idx = stack[--top];
            var cy = (idx / w) | 0, cx = idx - cy * w;
            if (cx > 0)     push(idx - 1);
            if (cx < w - 1) push(idx + 1);
            if (cy > 0)     push(idx - w);
            if (cy < h - 1) push(idx + w);
        }

        for (var k = 0; k < n; k++) {
            if (seen[k] && alpha[k] < data[k * 4 + 3]) data[k * 4 + 3] = alpha[k];
        }
    }

    /**
     * مدى إضاءة الشعار نفسه (متجاهلين الشفاف)، بالنسبة المئوية ٢٪–٩٨٪
     * حتى لا تُفسده بضعة بكسلات شاذّة. هذا المدى هو ما نمدّه على
     * التدرّج اللوني، فيخرج اللون مضبوطاً مهما كان الشعار فاتحاً أو غامقاً.
     */
    function inkRange(data) {
        var hist = new Uint32Array(256), count = 0;
        for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] <= 32) continue;
            var l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) | 0;
            hist[l]++; count++;
        }
        if (!count) return null;
        var loTarget = count * 0.02, hiTarget = count * 0.98;
        var acc = 0, lo = 0, hi = 255, j;
        for (j = 0; j < 256; j++) { acc += hist[j]; if (acc >= loTarget) { lo = j; break; } }
        acc = 0;
        for (j = 0; j < 256; j++) { acc += hist[j]; if (acc >= hiTarget) { hi = j; break; } }
        // شعار بلون واحد مسطّح: لا مدى نمدّه، فنستعمل المدى الكامل
        if (hi - lo < 20) { lo = 0; hi = 255; }
        return { lo: lo, hi: hi };
    }

    function canvasFrom(img) {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) throw new Error('صورة الشعار غير صالحة');
        var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        return { canvas: canvas, ctx: ctx, w: cw, h: ch };
    }

    /**
     * يصمّم النسخ الثلاث ويعيد { white, gold, black } روابطَ صور PNG.
     * onStep (اختياري) تُنادى بنصّ يصف الخطوة الجارية.
     */
    function generate(src, onStep) {
        if (!src) return Promise.reject(new Error('لا يوجد شعار للموقع'));
        var step = typeof onStep === 'function' ? onStep : function () {};

        return loadImage(src).then(function (img) {
            step('جارٍ قراءة الشعار...');
            var c = canvasFrom(img);
            var src32;
            try {
                src32 = c.ctx.getImageData(0, 0, c.w, c.h);
            } catch (e) {
                throw new Error('الشعار محمّل من رابط خارجي لا يسمح بمعالجته. ارفع صورة الشعار من جهازك ثم أعد المحاولة.');
            }

            if (!hasTransparency(src32.data)) {
                step('جارٍ إزالة خلفية الشعار...');
                removeBackground(src32.data, c.w, c.h);
            }

            var range = inkRange(src32.data);
            if (!range) throw new Error('صورة الشعار فارغة');

            var table = luts();
            var out = {};
            Object.keys(VARIANT_KEYS).forEach(function (tint) {
                step('جارٍ تصميم النسخة ال' + VARIANT_NAMES[tint] + '...');
                var lut = table[tint];
                var data = src32.data;
                var dst = c.ctx.createImageData(c.w, c.h);
                var o = dst.data;
                var span = (range.hi - range.lo) || 1;
                for (var i = 0; i < data.length; i += 4) {
                    var a = data[i + 3];
                    if (a === 0) { o[i + 3] = 0; continue; }
                    var l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                    var t = (l - range.lo) / span;
                    if (t < 0) t = 0; else if (t > 1) t = 1;
                    var p = (t * 255) | 0;
                    o[i]     = lut[p * 3];
                    o[i + 1] = lut[p * 3 + 1];
                    o[i + 2] = lut[p * 3 + 2];
                    o[i + 3] = a;
                }
                var canvas = document.createElement('canvas');
                canvas.width = c.w; canvas.height = c.h;
                canvas.getContext('2d').putImageData(dst, 0, 0);
                out[tint] = canvas.toDataURL('image/png');
            });
            return out;
        });
    }

    /** تحويل رابط بيانات PNG إلى ملف قابل للرفع على الخادم. */
    function dataUrlToFile(dataUrl, name) {
        var parts = dataUrl.split(',');
        var binary = atob(parts[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], { type: 'image/png' });
        try {
            return new File([blob], name, { type: 'image/png' });
        } catch (e) {
            blob.name = name; // متصفحات قديمة لا تدعم مُنشئ File
            return blob;
        }
    }

    global.LOGO_MAKER = {
        generate: generate,
        dataUrlToFile: dataUrlToFile,
        VARIANT_KEYS: VARIANT_KEYS,
        VARIANT_NAMES: VARIANT_NAMES,
        RAMPS: RAMPS
    };
})(window);
