// =====================================================
// PHP Backend Sync Engine (Zero-Config)
// =====================================================
const BACKEND_SYNC = {
    isPhp: null,
    lastModified: 0,
    pollTimer: null,
    listeners: [],
    _lastDetectFail: 0,

    // Kept as a no-op for backwards compatibility: writes are now
    // authorised by the server session cookie, not a client token.
    setApiToken() {},

    /**
     * Detect if PHP backend is available on current host
     */
    async detectPhp() {
        if (this.isPhp === true) return true;
        // A previous failure is only cached briefly. Without this, one
        // transient network blip on page load would leave the visitor
        // stuck on stale cached data for the whole session with no retry.
        if (this.isPhp === false && this._lastDetectFail && (Date.now() - this._lastDetectFail) < 20000) {
            return false;
        }
        try {
            const res = await fetch('api/get_data.php?check=1&t=' + Date.now(), { method: 'GET' });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
                const data = await res.json();
                if (data && data.success) {
                    this.isPhp = true;
                    this._lastDetectFail = 0;
                    if (data.last_modified) this.lastModified = data.last_modified;
                    console.log('✅ [BACKEND_SYNC] PHP Backend detected & connected successfully.');
                    return true;
                }
            }
        } catch (e) {}
        this.isPhp = false;
        this._lastDetectFail = Date.now();
        console.log('ℹ️ [BACKEND_SYNC] تعذّر الوصول إلى الخادم — نعتمد على البيانات المطبوعة في الصفحة.');
        return false;
    },

    /**
     * Get all site data (Config, Cards, Stats)
     */
    async getData() {
        const hasPhp = await this.detectPhp();
        if (hasPhp) {
            try {
                const res = await fetch('api/get_data.php?t=' + Date.now());
                if (res.ok) {
                    const result = await res.json();
                    if (result && result.success) {
                        if (result.last_modified) this.lastModified = result.last_modified;
                        // الإعدادات والبطاقات لا تُخزَّن في المتصفح إطلاقاً:
                        // قاعدة البيانات هي المصدر الوحيد. الإحصائيات
                        // فقط تبقى محليّاً لأنها عدّادات لحظية.
                        if (result.stats) localStorage.setItem('siteStats', JSON.stringify(result.stats));
                        if (result.cardStats) localStorage.setItem('cardStats', JSON.stringify(result.cardStats));
                        return {
                            config: result.config || {},
                            cards: result.cards || [],
                            stats: result.stats || { views: 0, previews: 0, downloads: 0 },
                            cardStats: result.cardStats || {},
                            last_modified: result.last_modified
                        };
                    }
                }
            } catch (e) {
                console.warn('[BACKEND_SYNC] Error fetching from PHP API:', e);
            }
        }

        // تعذّر الوصول إلى الخادم: نرجع إلى ما طبعه الخادم داخل الصفحة
        // نفسها (وهو مقروء من SQLite عند تحميلها)، لا إلى نسخة مخزّنة
        // في المتصفح. هكذا لا يمكن للموقع أن يعرض لوناً قديماً أبداً.
        let config = (window.__SITE_DATA__ && window.__SITE_DATA__.config) || {};
        let cards = (window.__SITE_DATA__ && window.__SITE_DATA__.cards) || [];
        let stats = { views: 0, previews: 0, downloads: 0 };
        let cardStats = {};

        try {
            const savedStats = localStorage.getItem('siteStats');
            if (savedStats) stats = JSON.parse(savedStats);
            const savedCardStats = localStorage.getItem('cardStats');
            if (savedCardStats) cardStats = JSON.parse(savedCardStats);
        } catch (e) {}

        return { config, cards, stats, cardStats, last_modified: this.lastModified };
    },

    /**
     * Save data (Config, Cards, Stats) to backend
     */
    async saveData(payload) {
        // 1. الإعدادات والبطاقات تذهب إلى قاعدة البيانات مباشرة بلا نسخة
        //    محلية. الواجهة تُحدَّث فوراً من القيمة التي بين يديها، فلا
        //    حاجة إلى تخزينها في المتصفح.
        if (payload.stats) localStorage.setItem('siteStats', JSON.stringify(payload.stats));
        if (payload.cardStats) localStorage.setItem('cardStats', JSON.stringify(payload.cardStats));

        // 2. Save to PHP Backend if available
        const hasPhp = await this.detectPhp();
        let phpResult = null;
        if (hasPhp) {
            try {
                const res = await fetch('api/save_data.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    phpResult = await res.json();
                    if (phpResult && phpResult.last_modified) {
                        this.lastModified = phpResult.last_modified;
                    }
                } else if (res.status === 401) {
                    console.error('[BACKEND_SYNC] Save rejected: not logged in.');
                    phpResult = { success: false, message: 'انتهت جلسة الدخول — يرجى تسجيل الدخول من جديد.' };
                }
            } catch (e) {
                console.warn('[BACKEND_SYNC] Error saving to PHP API:', e);
            }
        }

        return phpResult || { success: true, message: 'تم الحفظ محلياً' };
    },

    /**
     * Upload an image file directly to server uploads/ directory
     */
    async uploadImage(file, type = 'card') {
        const hasPhp = await this.detectPhp();
        if (hasPhp) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', type);

                const res = await fetch('api/upload.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: formData
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result && result.success && result.url) {
                        return { success: true, url: result.url };
                    } else if (result && result.message) {
                        throw new Error(result.message);
                    }
                }
            } catch (e) {
                console.warn('[BACKEND_SYNC] Upload via PHP API failed, falling back to base64:', e);
            }
        }

        // Fallback: convert file to Base64 data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ success: true, url: e.target.result });
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    /**
     * Track Visitor / Preview / Download action
     */
    async recordStat(action, cardIndex = null) {
        const hasPhp = await this.detectPhp();
        if (hasPhp) {
            try {
                let url = `api/stats.php?action=${encodeURIComponent(action)}`;
                if (cardIndex !== null) url += `&cardIndex=${encodeURIComponent(cardIndex)}`;
                fetch(url, { method: 'GET' }).catch(() => {});
            } catch (e) {}
        }
    },

    /**
     * Reset all stats/downloads counters on the server (admin only, token-protected).
     */
    async resetStats() {
        const hasPhp = await this.detectPhp();
        if (!hasPhp) return { success: true, message: 'تم التصفير محلياً' };
        try {
            const res = await fetch('api/stats.php?action=reset', {
                method: 'GET',
                credentials: 'same-origin'
            });
            if (res.ok) return await res.json();
            if (res.status === 401) {
                return { success: false, message: 'انتهت جلسة الدخول — يرجى تسجيل الدخول من جديد.' };
            }
        } catch (e) {
            console.warn('[BACKEND_SYNC] resetStats error:', e);
        }
        return { success: false, message: 'تعذر تصفير الإحصائيات على الخادم' };
    },

    /**
     * Start live background polling to detect updates from server
     */
    startPolling(callback, intervalMs = 15000) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
        if (this.pollTimer) return;

        const checkFn = async () => {
            const hasPhp = await this.detectPhp();
            if (!hasPhp) return;
            try {
                const res = await fetch(`api/get_data.php?check=1&since=${this.lastModified}&t=${Date.now()}`);
                if (res.ok) {
                    const checkData = await res.json();
                    if (checkData && checkData.success && checkData.modified) {
                        console.log('🔄 [BACKEND_SYNC] Server update detected! Fetching fresh data...');
                        const fullData = await this.getData();
                        this.listeners.forEach(fn => {
                            try { fn(fullData); } catch(err) {}
                        });
                    }
                }
            } catch (e) {}
        };

        this.pollTimer = setInterval(checkFn, intervalMs);

        // Also check immediately when browser tab regains focus
        window.addEventListener('focus', () => {
            checkFn();
        });
    }
};
