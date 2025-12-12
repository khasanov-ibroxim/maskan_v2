// server/src/services/olxCookieManager.js
const fs = require('fs');
const path = require('path');

const COOKIE_FILE = path.join(__dirname, '../../cookies/olx-cookies.json');

/**
 * Save cookies to file
 */
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

/**
 * Load cookies from file
 */
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
 * Check if cookies are valid
 */
async function validateCookies(page) {
    try {
        console.log('🔍 Cookies tekshirilmoqda...');

        await page.goto('https://www.olx.uz', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForTimeout(3000);

        // Check login indicators
        const selectors = [
            '[data-testid="myolx-link"]',
            'a[href*="/myaccount"]',
            'a[href*="myolx"]',
            '[class*="user-menu"]'
        ];

        for (const selector of selectors) {
            const element = await page.$(selector);
            if (element) {
                console.log('✅ Login tasdiqlandi (cookie valid)');
                return true;
            }
        }

        console.log('❌ Login topilmadi (cookie invalid)');
        return false;

    } catch (error) {
        console.error('⚠️ Cookie validation xato:', error.message);
        return false;
    }
}

/**
 * Delete cookies
 */
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

/**
 * Get cookie info
 */
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

module.exports = {
    saveCookies,
    loadCookies,
    validateCookies,
    deleteCookies,
    getCookieInfo,
    COOKIE_FILE
};