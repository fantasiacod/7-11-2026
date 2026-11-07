// auth.js
// ------------------------------------------------------------
// Thin client for the server-side auth API (api/auth.php).
//
// Deliberately holds NO credentials and NO "isLoggedIn" flag of its
// own: the real login state is a server session cookie. Anything
// stored here could be edited by the visitor, so it isn't trusted.
// ------------------------------------------------------------

const AUTH = {
    _status: null,

    async check(force = false) {
        if (this._status && !force) return this._status;
        try {
            const res = await fetch('api/auth.php?action=check&t=' + Date.now(), {
                credentials: 'same-origin'
            });
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // Static host: PHP is not running at all.
                const status = { success: false, authenticated: false, noPhp: true };
                this._status = status;
                return status;
            }
            const data = await res.json();
            this._status = data;
            return data;
        } catch (e) {
            console.warn('[AUTH] check failed:', e);
            return { success: false, authenticated: false };
        }
    },

    async login(username, password) {
        try {
            const res = await fetch('api/auth.php?action=login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            // If PHP isn't executing (GitHub Pages, Netlify, a Render
            // "Static Site", or any static host), the server returns the
            // raw .php source or a 404 page instead of JSON. Detect that
            // and say so plainly rather than showing "wrong password".
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return {
                    success: false,
                    noPhp: true,
                    message: 'هذه الاستضافة لا تشغّل PHP، لذلك لا يمكن تسجيل الدخول. ' +
                             'استضافات مثل GitHub Pages أو Netlify أو خدمة Static Site في Render ' +
                             'تعرض الملفات فقط ولا تنفّذها. استخدم استضافة تدعم PHP، ' +
                             'أو أنشئ الخدمة في Render كـ Web Service من نوع Docker.'
                };
            }

            const data = await res.json();
            this._status = null;
            return data;
        } catch (e) {
            return { success: false, message: 'تعذر الاتصال بالخادم. تأكد من أن الاستضافة تدعم PHP.' };
        }
    },

    async logout() {
        try {
            await fetch('api/auth.php?action=logout', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch (e) {}
        this._status = null;
        window.location.href = '/login/';
    },

    async changeCredentials(currentPassword, newUsername, newPassword) {
        try {
            const res = await fetch('api/auth.php?action=change', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newUsername, newPassword })
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: 'تعذر الاتصال بالخادم.' };
        }
    },

    /**
     * Guard an admin page. Redirects to login if the server says
     * this browser has no valid session.
     */
    async protectPage() {
        const status = await this.check(true);
        if (status.noPhp) {
            // Don't bounce to login.html — it can't work either, and the
            // two pages would redirect each other forever.
            document.body.innerHTML =
                '<div style="max-width:640px;margin:60px auto;padding:30px;background:#7f1d1d;color:#fff;' +
                'border-radius:12px;font-family:Tajawal,sans-serif;line-height:1.9;text-align:center;">' +
                '<h2>الاستضافة لا تدعم PHP</h2>' +
                '<p>لوحة التحكم تحتاج استضافة تشغّل PHP. الاستضافة الحالية تعرض الملفات فقط دون تنفيذها، ' +
                'لذلك لا يعمل تسجيل الدخول ولا الحفظ.</p>' +
                '<p>استخدم استضافة تدعم PHP، أو في Render أنشئ الخدمة كـ <b>Web Service</b> بنوع <b>Docker</b> ' +
                'وليس Static Site.</p>' +
                '<a href="/" style="color:#fecaca;">العودة للموقع</a></div>';
            return false;
        }
        if (!status.authenticated) {
            window.location.href = '/login/';
            return false;
        }
        return true;
    }
};

// Backwards-compatible helpers used elsewhere in the codebase
function logout() { AUTH.logout(); }
async function protectPage() { return AUTH.protectPage(); }

// Guard the admin panel immediately, and keep the session warm.
if (window.location.pathname.includes('/admin/')) {
    AUTH.protectPage();

    // Re-verify periodically so an expired/revoked session kicks the
    // user out instead of letting them keep editing into failed saves.
    setInterval(async () => {
        const status = await AUTH.check(true);
        if (!status.authenticated) {
            alert('انتهت جلسة الدخول. سيتم تحويلك لصفحة تسجيل الدخول.');
            window.location.href = '/login/';
        }
    }, 120000);
}
