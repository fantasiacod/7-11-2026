if (!localStorage.getItem('stats_reset_v1')) {
    localStorage.setItem('siteStats', JSON.stringify({views: 0, previews: 0, downloads: 0}));
    localStorage.setItem('cardStats', JSON.stringify({}));
    localStorage.setItem('stats_reset_v1', 'true');
}

let currentIndex = 0;
let isAutoScrolling = true;
let cardData = [
    { 
        src: "https://i.postimg.cc/Y92P6tjw/image.png", 
        bottom: "10%", 
        right: "0%" 
    },
    { 
        src: "https://i.postimg.cc/D0hPcv4D/image.png", 
        bottom: "10%", 
        right: "0%" 
    },
    { 
        src: "https://i.postimg.cc/SNPRCZ9K/image.png", 
        bottom: "25%", 
        right: "0%" 
    }
];

// البطاقات تأتي من الخادم مطبوعة داخل الصفحة (مقروءة من SQLite)،
// لا من نسخة مخزّنة في المتصفح قد تكون قديمة.
if (window.__SITE_DATA__ && Array.isArray(window.__SITE_DATA__.cards)
    && window.__SITE_DATA__.cards.length > 0) {
    cardData = window.__SITE_DATA__.cards;
}

let thumbs = [];

function renderCardsUI(cards) {
    if (!cards || cards.length === 0) return;
    cardData = cards;
    if (currentIndex >= cardData.length) currentIndex = 0;
    
    const track = document.querySelector('.carousel-track');
    if (track) {
        track.innerHTML = '';
        cardData.forEach((card, i) => {
            let img = document.createElement('img');
            img.src = card.src;
            img.className = 'thumb' + (i === currentIndex ? ' active' : '');
            img.onclick = () => manualSelect(i);
            track.appendChild(img);
        });
        thumbs = document.querySelectorAll('.thumb');
        
        const activeCard = document.getElementById('active-card');
        const overlay = document.getElementById('overlay-wrap');
        if (activeCard && overlay && cardData[currentIndex]) {
            activeCard.src = cardData[currentIndex].src;
            overlay.style.bottom = cardData[currentIndex].bottom;
            overlay.style.right = cardData[currentIndex].right;
            const counter = document.getElementById('card-counter');
            if (counter) counter.innerText = `${currentIndex + 1} / ${cardData.length}`;
            applyCardLogo(cardData[currentIndex]);
        }
    }
}

/**
 * طباعة شعار الموقع على البطاقة.
 * الإعدادات (الظهور، الموضع، الحجم، اللون) محفوظة مع كل بطاقة على حدة
 * في قاعدة البيانات، ويضبطها صاحب الموقع من لوحة التحكم.
 *
 * اللون يُطبَّق بتلوين الصورة نفسها لا بـ CSS، لأن مكتبة الالتقاط لا
 * تدعم filter فكان الشعار يخرج بلونه الأصلي في الملف المحمَّل.
 */
function applyCardLogo(card) {
    const el = document.getElementById('card-logo');
    if (!el) return;

    const src = window.__SITE_LOGO__ || '';
    const cfg = (typeof LOGO_TINT !== 'undefined')
        ? LOGO_TINT.normalizeLogo(card && card.logo)
        : null;

    if (!cfg || !cfg.show || !src) {
        el.style.display = 'none';
        el.removeAttribute('src');
        return;
    }

    el.style.width   = cfg.size + '%';
    el.style.right   = cfg.x + '%';
    el.style.top     = cfg.y + '%';
    el.style.opacity = (cfg.opacity / 100);

    const config = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
    LOGO_TINT.tintLogo(src, cfg.tint, config).then((url) => {
        el.src = url;
        el.style.display = 'block';
    });
}

/**
 * ضبط مقاس البطاقة على الشاشة.
 *
 * الصورة تملأ منطقة الالتقاط بالكامل، فلا يبقى حولها فراغ شفاف يخرج
 * كإطار أسود في الملف المحفوظ. ولئلا تطول البطاقة الطولية حتى تُخفي
 * حقل الاسم وزر التحميل، نحدّ من عرض الإطار بقدر يجعل ارتفاعها لا
 * يتجاوز نسبة من ارتفاع الشاشة.
 *
 * الحساب يعتمد على أبعاد الصورة الأصلية لا على تقدير المتصفح: الطريقة
 * السابقة كانت تثبّت ارتفاع الصورة وتترك عرضها تلقائياً، وسفاري الجوال
 * يقدّر عرض الحاوية حينها بالعرض الأصلي للصورة، فينشأ فراغ كبير حول
 * البطاقة ويخرج الاسم خارج حدودها في الصورة المحفوظة.
 */
function fitCard() {
    const box = document.querySelector('.preview-box');
    const img = document.getElementById('active-card');
    if (!box || !img) return;

    const area = document.getElementById('capture-area');
    if (!img.naturalWidth || !img.naturalHeight) return; // لم تُحمَّل بعد

    if (area) area.classList.remove('card-broken');

    const ratio = img.naturalWidth / img.naturalHeight;

    // على الشاشات الكبيرة يبقى الحد كما هو (450px) فالعرض هناك سليم أصلاً.
    if (window.innerWidth > 480) {
        box.style.maxWidth = '';
        return;
    }

    // على الجوال نحدّ من الارتفاع بـ 46% من الشاشة — وهو نفس الارتفاع
    // السابق — ليبقى حقل الاسم وزر التحميل ظاهرَين بلا تمرير.
    const maxHeight = window.innerHeight * 0.46;
    const maxWidth = window.innerWidth - 24;

    box.style.maxWidth = Math.max(120, Math.round(Math.min(maxWidth, maxHeight * ratio))) + 'px';
}

(function watchCardSize() {
    const img = document.getElementById('active-card');
    if (!img) return;
    img.addEventListener('load', fitCard);
    img.addEventListener('error', () => {
        const area = document.getElementById('capture-area');
        if (area) area.classList.add('card-broken');
    });
    if (img.complete) fitCard();
    window.addEventListener('resize', fitCard);
    window.addEventListener('orientationchange', fitCard);
})();

renderCardsUI(cardData);

const autoSlide = setInterval(() => {
    if (isAutoScrolling) {
        currentIndex = (currentIndex + 1) % cardData.length;
        updateDisplay(currentIndex);
    }
}, 5000);

function updateDisplay(index) {
    const activeCard = document.getElementById('active-card');
    const overlay = document.getElementById('overlay-wrap');
    const counter = document.getElementById('card-counter');
    
    if (counter && cardData.length > 0) {
        counter.innerText = `${index + 1} / ${cardData.length}`;
    }

    activeCard.style.opacity = '0.7';
    setTimeout(() => {
        activeCard.src = cardData[index].src;
        
        // تحديث الموقع بناءً على المصفوفة
        overlay.style.bottom = cardData[index].bottom;
        overlay.style.right = cardData[index].right;
        
        // تحديث لون النص للبطاقة الحالية
        const nameTag = document.getElementById('target-name');
        if (nameTag) {
            nameTag.style.color = cardData[index].color ? cardData[index].color : 'var(--card-text-color, var(--text-color, #ffffff))';
        }

        applyCardLogo(cardData[index]);

        
        activeCard.style.opacity = '1';
    }, 180);

    thumbs.forEach(t => t.classList.remove('active'));
    if(thumbs[index]) {
        thumbs[index].classList.add('active');
        thumbs[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function manualSelect(index) {
    isAutoScrolling = false; 
    clearInterval(autoSlide); 
    currentIndex = index;
    updateDisplay(index);
}

window.hasPreviewed = false;
function sync() {
    const val = document.getElementById('nameInput').value;
    document.getElementById('target-name').innerText = val || "اكتب اسمك هنا";
    
    if (!window.hasPreviewed && val.trim() !== '') {
        window.hasPreviewed = true;
        incrementStat('previews');
    }
}

/**
 * تحويل لوحة الرسم إلى ملف صورة.
 * Blob وليس data: — لأن سفاري على iOS يتجاهل خاصية download
 * مع روابط data الطويلة، فلا يحدث شيء عند الضغط.
 */
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        if (canvas.toBlob) {
            canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
        } else {
            resolve(null);
        }
    });
}

/**
 * إيصال الصورة للمستخدم. تُجرَّب ثلاث طرق بالترتيب لأن كل متصفح
 * جوال يسمح بواحدة منها فقط:
 *   ١. مشاركة الملف الأصلية (تعمل على iOS وأندرويد الحديثين)
 *   ٢. التنزيل المعتاد عبر رابط blob
 *   ٣. فتح الصورة لحفظها بالضغط المطوّل (آخر ملاذ على سفاري القديم)
 */
/**
 * هل الجهاز جوال أو لوحي؟
 * نافذة المشاركة مفيدة على الجوال فقط، فهي الطريقة الوحيدة لحفظ الصورة
 * في ألبوم الصور على iOS. أما على الكمبيوتر فويندوز وماك يفتحان «لوحة
 * المشاركة» أيضاً، وهذا مزعج: المستخدم يريد الملف ينزل مباشرة. لذا
 * نقصر المشاركة على الأجهزة اللمسية ونذهب في الكمبيوتر إلى التنزيل فوراً.
 */
function isTouchDevice() {
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod|iPad|Windows Phone|IEMobile|Opera Mini/i.test(ua)) return true;
    // آيباد الحديث يعرّف نفسه بـ Macintosh، ويُميَّز بدعمه للمس
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
    return false;
}

async function deliverCard(blob, canvas, fileName) {
    // ١) مشاركة الملف — على الجوال واللوحي فقط
    if (blob && navigator.canShare && isTouchDevice()) {
        try {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: fileName });
                return 'shared';
            }
        } catch (err) {
            // ألغى المستخدم نافذة المشاركة: لا نكمل إلى طرق أخرى
            if (err && err.name === 'AbortError') return 'cancelled';
        }
    }

    const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png', 1.0);
    const supportsDownload = 'download' in document.createElement('a');

    // ٢) التنزيل المعتاد — العنصر يُضاف للصفحة لأن بعض المتصفحات
    //    تتجاهل النقر على عنصر غير موجود فيها
    if (supportsDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        // لا يُحذف فوراً: إزالته في نفس اللحظة تُفقد اسم الملف
        // في بعض المتصفحات فيُحفظ باسم "download" بلا امتداد.
        setTimeout(() => {
            if (link.parentNode) link.parentNode.removeChild(link);
            if (blob) URL.revokeObjectURL(url);
        }, 60000);
        return 'downloaded';
    }

    // ٣) فتح الصورة ليحفظها المستخدم بنفسه
    window.open(url, '_blank');
    if (blob) setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'opened';
}

function save() {
    const btn = document.getElementById('download-btn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تجهيز البطاقة بدقة عالية...';
        btn.style.pointerEvents = 'none';
    }

    const area = document.getElementById('capture-area');
    // المتصفحات ترفض الأسماء العربية في خاصية download وتحفظ الملف باسم
    // "download" بلا امتداد فلا يُفتح. لذا نبني اسماً لاتينياً آمناً،
    // وإن لم يبقَ منه شيء نستخدم التاريخ.
    const rawName = (document.getElementById('nameInput').value || '').trim();
    const safeName = rawName.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = 'card-' + (safeName || stamp) + '.png';

    // scale: 3 كان يرسم لوحة بتسعة أضعاف عدد البكسلات، وهو سبب البطء.
    // نحسب المضاعف ليكون عرض الصورة الناتجة ~1200 بكسل مهما كان حجم
    // العرض على الشاشة: جودة عالية للطباعة والمشاركة، وبثلث الزمن.
    // المضاعف يُحسب ليخرج عرض الصورة ~1200 بكسل دائماً، مهما كان حجم
    // البطاقة على الشاشة. فالبطاقة تُعرض أصغر على الجوال، ولو ثبّتنا
    // المضاعف لخرجت الصورة بدقة منخفضة هناك.
    const targetWidth = 1200;
    const areaWidth = area.offsetWidth || 450;
    const scale = Math.max(1, Math.min(6, targetWidth / areaWidth));

    html2canvas(area, {
        useCORS: true,
        scale: scale,
        logging: false,
        backgroundColor: null,
        // بلا هذا ينتظر html2canvas 15 ثانية كاملة على أي صورة
        // لا تُحمَّل (رابط خارجي ميت مثلاً) قبل أن يكمل
        imageTimeout: 5000
    }).then(canvas => {
        return canvasToBlob(canvas).then(blob => deliverCard(blob, canvas, fileName));
    }).then(result => {
        if (result === 'cancelled') return;

        incrementStat('downloads');
        if (result === 'opened') {
            showToast('اضغط مطولاً على الصورة ثم اختر «حفظ الصورة»');
        } else {
            showToast('تم تحميل البطاقة بنجاح!');
        }
    }).catch(err => {
        console.error(err);
        showToast('حدث خطأ أثناء تحميل البطاقة، يرجى المحاولة مرة أخرى.');
    }).finally(() => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }
    });
}

function shareWhatsApp() {
    const name = (document.getElementById('nameInput').value || '').trim();
    const url = window.location.href;
    const msg = name 
        ? `أهديكم أجمل التهاني والتبريكات بمناسبة العيد المبارك 🌙✨ - من: ${name}\nصمم بطاقتك الخاصة الآن عبر الرابط:\n${url}`
        : `صمم بطاقة تهنئة خاصة بك وشاركها مع أحبابك 🌙✨ عبر الرابط:\n${url}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

function copySiteLink() {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('تم نسخ الرابط بنجاح! جاهز للمشاركة.');
        });
    } else {
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = url;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
        showToast('تم نسخ الرابط بنجاح!');
    }
}

function showToast(text) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('span').innerText = text;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function incrementStat(type) {
    // Global stats
    let stats = JSON.parse(localStorage.getItem('siteStats') || '{"views":0, "previews":0, "downloads":0}');
    stats[type] = (stats[type] || 0) + 1;
    localStorage.setItem('siteStats', JSON.stringify(stats));

    // Per-card stats
    if (typeof currentIndex !== 'undefined' && cardData && cardData[currentIndex]) {
        let cardStats = JSON.parse(localStorage.getItem('cardStats') || '{}');
        let cardKey = 'card_' + currentIndex;
        if (!cardStats[cardKey]) {
            cardStats[cardKey] = { views: 0, previews: 0, downloads: 0, src: cardData[currentIndex].src };
        }
        cardStats[cardKey][type] = (cardStats[cardKey][type] || 0) + 1;
        localStorage.setItem('cardStats', JSON.stringify(cardStats));
    }

    if (typeof BACKEND_SYNC !== 'undefined') {
        const actionMap = { views: 'view', previews: 'preview', downloads: 'download' };
        BACKEND_SYNC.recordStat(actionMap[type] || type, typeof currentIndex !== 'undefined' ? currentIndex : null);
    }
}

// -----------------------------------------------------
// Admin Control Panel Integration (OmniSyncCloud)
// -----------------------------------------------------
function applysiteConfig_v2(overrideConfig) {
    let config = overrideConfig;
    // المصدر الوحيد: ما طبعه الخادم في الصفحة من قاعدة بيانات SQLite.
    if (!config && window.__SITE_DATA__ && window.__SITE_DATA__.config
        && Object.keys(window.__SITE_DATA__.config).length > 0) {
        config = window.__SITE_DATA__.config;
    }
    if (!config) {
        config = {
            decoration: 'islamic-1',
            hfDecoration: 'islamic-1',
            hfColor1: '#202940',
            hfColor2: '#4b4038',
            hfDecorationColor: '#ffffff',
            hfOpacity: '0.2',
            decorationColor: '#ffffff',
            decorationOpacity: '0.1',
            colorPrimary: '#caaa98',
            colorBg: '#4b4038',
            logoDataUrl: 'img/logo.jpg',
            companyName: 'بطاقات التهنئة',
            logoPosition: 'right',
            buttonsPosition: 'left'
        };
    }
    if (config) {
        
        // Colors
        if (config.colorPrimary) {
            document.documentElement.style.setProperty('--primary', config.colorPrimary);
        }
        if (config.colorBg) {
            document.documentElement.style.setProperty('--bg-color', config.colorBg);
            // Link footer bg to this
            const footer = document.querySelector('.footer');
            if (footer) footer.style.backgroundColor = config.colorBg;
        }

        // Fonts & Text Color
        if (config.fontFamily) {
            document.body.style.fontFamily = config.fontFamily;
            const nameTag = document.getElementById('target-name');
            if(nameTag) nameTag.style.fontFamily = config.fontFamily;
        }
        
        if (config.textColor) {
            document.documentElement.style.setProperty('--text-color', config.textColor);
            document.documentElement.style.setProperty('--card-text-color', config.textColor);
        } else if (config.cardTextColor) {
            document.documentElement.style.setProperty('--card-text-color', config.cardTextColor);
        }
        if (config.btnTextColor) {
            document.documentElement.style.setProperty('--btn-text-color', config.btnTextColor);
        }



        // Company Name
        const companyHeaders = document.querySelectorAll('.company-header-name');
        companyHeaders.forEach(el => {
            el.innerText = config.companyName || '';
        });
        const footerComp = document.getElementById('footer-company-name');
        if (footerComp) {
            const year = new Date().getFullYear();
            footerComp.innerText = config.companyName && config.companyName.trim() !== '' 
                ? `جميع الحقوق محفوظة © ${config.companyName} ${year}`
                : `جميع الحقوق محفوظة © ${year}`;
        }


        // Topbar Logo and Position
        const logoContainer = document.getElementById('header-logo-container');
        if (logoContainer) {
            const logoSrc = (config.logoDataUrl && config.logoDataUrl.trim() !== '') 
                ? config.logoDataUrl 
                : 'img/logo.jpg';
            
            logoContainer.innerHTML = `<img src="${logoSrc}" alt="Logo" class="logo">`;
            logoContainer.style.display = '';

            const header = document.querySelector('.header');
            const headerRight = document.querySelector('.header-right');
            const headerButtons = document.getElementById('header-buttons');
            const mainLogo = document.querySelector('#header-logo-container .logo');

            if (header && headerRight) {
                headerRight.style.width = '100%';
                
                const logoPos = config.logoPosition || 'right';
                const buttonsPos = config.buttonsPosition || 'left';

                if (logoPos === 'center') {
                    headerRight.style.flexDirection = 'column';
                    headerRight.style.justifyContent = 'center';
                    headerRight.style.textAlign = 'center';
                } else if (logoPos === 'left') {
                    headerRight.style.flexDirection = 'row-reverse';
                    headerRight.style.justifyContent = 'flex-end';
                    headerRight.style.textAlign = 'left';
                } else {
                    // right (default)
                    headerRight.style.flexDirection = 'row';
                    headerRight.style.justifyContent = 'flex-start';
                    headerRight.style.textAlign = 'right';
                }

                if (headerButtons) {
                    if (buttonsPos === 'right') {
                        headerButtons.style.right = '5%';
                        headerButtons.style.left = 'auto';
                    } else {
                        // left (default)
                        headerButtons.style.left = '5%';
                        headerButtons.style.right = 'auto';
                    }
                }

                if (mainLogo) {
                    const isFar = (logoPos === 'right' && buttonsPos === 'left') ||
                                  (logoPos === 'left' && buttonsPos === 'right');
                    mainLogo.style.height = isFar ? '90px' : '70px';
                }
            }
        }
        
        // Main Site Link (Visit Site Button)
        const siteLinkBtn = document.getElementById('main-site-link');
        if (siteLinkBtn) {
            if (config.mainSiteUrl && config.mainSiteUrl.trim() !== '') {
                siteLinkBtn.href = config.mainSiteUrl;
                siteLinkBtn.style.display = 'inline-block';
            } else {
                siteLinkBtn.style.display = 'none';
            }
        }

        // Unified Site & Header/Footer Decoration
        const dec = config.decoration || config.hfDecoration || 'none';
        const decColor = config.decorationColor || config.hfDecorationColor || '#ffffff';
        const decOpacity = config.decorationOpacity || config.hfOpacity || '0.15';

        document.documentElement.style.setProperty('--decoration-color', decColor);
        document.documentElement.style.setProperty('--decoration-opacity', decOpacity);
        document.documentElement.style.setProperty('--hf-decoration-color', decColor);
        document.documentElement.style.setProperty('--hf-decoration-opacity', decOpacity);
        document.documentElement.style.setProperty('--hf-bg-color1', config.hfColor1 || '#202940');
        document.documentElement.style.setProperty('--hf-bg-color2', config.hfColor2 || '#4b4038');

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


        // Footer Social Links
        const socialLinksContainer = document.getElementById('footer-social-links');
        if (socialLinksContainer) {
            let hasLinks = false;
            socialLinksContainer.innerHTML = '';
            
            if (config.whatsapp) {
                socialLinksContainer.innerHTML += `<a href="${config.whatsapp}" class="contact-link" target="_blank" title="واتساب"><i class="fab fa-whatsapp fa-2x"></i></a>`;
                hasLinks = true;
            }
            if (config.twitter) {
                socialLinksContainer.innerHTML += `<a href="${config.twitter}" class="contact-link" target="_blank" title="تويتر (X)"><i class="fa-brands fa-x-twitter fa-2x"></i></a>`;
                hasLinks = true;
            }
            if (config.instagram) {
                socialLinksContainer.innerHTML += `<a href="${config.instagram}" class="contact-link" target="_blank" title="انستجرام"><i class="fab fa-instagram fa-2x"></i></a>`;
                hasLinks = true;
            }
            if (config.youtube) {
                socialLinksContainer.innerHTML += `<a href="${config.youtube}" class="contact-link" target="_blank" title="يوتيوب"><i class="fab fa-youtube fa-2x"></i></a>`;
                hasLinks = true;
            }
            if (config.salla) {
                socialLinksContainer.innerHTML += `<a href="${config.salla}" class="contact-link" target="_blank" title="رابط المتجر"><i class="fas fa-store fa-2x"></i></a>`;
                hasLinks = true;
            }
            if (config.blog) {
                socialLinksContainer.innerHTML += `<a href="${config.blog}" class="contact-link" target="_blank" title="المدونة"><i class="fas fa-blog fa-2x"></i></a>`;
                hasLinks = true;
            }
            
            if (!hasLinks) {
                socialLinksContainer.style.display = 'none';
                document.querySelector('.footer').querySelector('div[style*="font-weight: bold;"]').style.display = 'none';
            } else {
                socialLinksContainer.style.display = 'flex';
                document.querySelector('.footer').querySelector('div[style*="font-weight: bold;"]').style.display = 'block';
            }
        }
    }
}

// Run integration on load + real-time backend/cloud sync
window.addEventListener('DOMContentLoaded', async () => {
    applysiteConfig_v2();
    document.body.classList.add('ready');
    incrementStat('views');

    // Tracks whether the PHP backend answered. If it did, it is the single
    // source of truth and the legacy Supabase mirror must NOT run: that
    // mirror still holds rows from the old system and would overwrite the
    // correct data a moment after the page renders.
    let backendAuthoritative = false;

    // 1. Fetch from PHP Backend first if available
    if (typeof BACKEND_SYNC !== 'undefined') {
        try {
            const serverData = await BACKEND_SYNC.getData();
            if (serverData && await BACKEND_SYNC.detectPhp()) {
                backendAuthoritative = true;
            }
            if (serverData) {
                if (serverData.config && Object.keys(serverData.config).length > 0) {
                    applysiteConfig_v2(serverData.config);
                }
                if (serverData.cards && serverData.cards.length > 0) {
                    renderCardsUI(serverData.cards);
                }
            }
            
            // Start live polling to detect any updates made by admin
            BACKEND_SYNC.startPolling((freshData) => {
                if (freshData.config) {
                    applysiteConfig_v2(freshData.config);
                }
                if (freshData.cards && freshData.cards.length > 0) {
                    renderCardsUI(freshData.cards);
                }
            }, 10000);
        } catch (e) {
            console.warn('[BACKEND_SYNC] Initialization error:', e);
        }
    }

    // The legacy Supabase mirror (the old `main_config` row) is deliberately
    // NOT read here any more. When the site is backed by Supabase, that old
    // row lives in the same table and was overwriting the correct data a
    // moment after the page rendered — which is why the page appeared to
    // load correctly and then revert to an older version.
    // api/get_data.php is now the single source of truth.
});
