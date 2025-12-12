// server/src/services/olxCookieManager.js - SIMPLIFIED VERSION
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, '../../cookies/olx-cookies.json');

async function saveCookies(page) {
    try {
        const cookies = await page.cookies();
        const cookieDir = path.dirname(COOKIE_FILE);
        if (!fs.existsSync(cookieDir)) {
            fs.mkdirSync(cookieDir, { recursive: true });
        }
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        console.log('✅ Cookies saqlandi:', COOKIE_FILE);
        console.log(`   ${cookies.length} ta cookie`);
        return true;
    } catch (error) {
        console.error('❌ Cookie saqlashda xato:', error.message);
        return false;
    }
}

async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            console.log('⚠️ Cookie fayli topilmadi:', COOKIE_FILE);
            return false;
        }
        const cookiesString = fs.readFileSync(COOKIE_FILE, 'utf8');
        const cookies = JSON.parse(cookiesString);
        if (!Array.isArray(cookies) || cookies.length === 0) {
            console.log('⚠️ Cookie fayli bo\'sh');
            return false;
        }
        await page.setCookie(...cookies);
        console.log('✅ Cookies yuklandi:', cookies.length, 'ta');
        return true;
    } catch (error) {
        console.error('❌ Cookie yuklashda xato:', error.message);
        return false;
    }
}

/**
 * ✅ SIMPLIFIED: Just check /adding/ page access
 */
async function validateCookies(page) {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Cookies tekshirilmoqda (urinish ${attempt}/${maxRetries})...`);

            // Direct check: try to access /adding/
            await page.goto('https://www.olx.uz/adding/', {
                waitUntil: 'domcontentloaded',
                timeout: 25000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            const url = page.url();
            console.log('   Current URL:', url);

            // Success: stayed on /adding/
            if (url.includes('/adding/')) {
                console.log('✅ /adding/ sahifasiga kirish mumkin');
                console.log('✅ Login tasdiqlandi (cookies valid)');
                return true;
            }

            // Failed: redirected to login/auth
            if (url.includes('/login') || url.includes('/auth') || url.includes('/signin')) {
                console.log('❌ Login sahifasiga redirect bo\'ldi');
                console.log('   Cookies invalid yoki expire bo\'lgan');

                if (attempt < maxRetries) {
                    console.log(`⏳ ${attempt * 3} soniya kutib qayta uriniladi...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 3000));
                    continue;
                }

                return false;
            }

            // Unknown redirect
            console.log('⚠️ Noma\'lum sahifaga redirect:', url);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }

            return false;

        } catch (error) {
            console.error(`⚠️ Validation xato (urinish ${attempt}):`, error.message);

            if (attempt < maxRetries) {
                console.log(`⏳ ${attempt * 3} soniya kutib qayta uriniladi...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 3000));
                continue;
            }

            return false;
        }
    }

    return false;
}

function deleteCookies() {
    try {
        if (fs.existsSync(COOKIE_FILE)) {
            fs.unlinkSync(COOKIE_FILE);
            console.log('🗑️ Cookies o\'chirildi');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Cookie o\'chirishda xato:', error.message);
        return false;
    }
}

function getCookieInfo() {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            return {
                exists: false,
                count: 0,
                size: 0,
                modified: null
            };
        }
        const stats = fs.statSync(COOKIE_FILE);
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
        return {
            exists: true,
            count: cookies.length,
            size: (stats.size / 1024).toFixed(2) + ' KB',
            modified: stats.mtime.toISOString()
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

function areCookiesExpired() {
    try {
        if (!fs.existsSync(COOKIE_FILE)) return true;
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
        const now = Date.now() / 1000;
        const hasValidCookie = cookies.some(cookie => {
            if (!cookie.expires) return true;
            return cookie.expires > now;
        });
        return !hasValidCookie;
    } catch (error) {
        console.error('❌ Cookie expiry check xato:', error.message);
        return true;
    }
}

module.exports = {
    saveCookies,
    loadCookies,
    validateCookies,
    deleteCookies,
    getCookieInfo,
    areCookiesExpired,
    COOKIE_FILE
};