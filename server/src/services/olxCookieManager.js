// server/src/services/olxCookieManager.js - FIXED VERSION
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
 * ✅ FIXED: Better cookie validation with retry
 */
async function validateCookies(page) {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔍 Cookies tekshirilmoqda (urinish ${attempt}/${maxRetries})...`);

            // Go to OLX.uz
            await page.goto('https://www.olx.uz', {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            // Wait for page to stabilize
            await page.waitForTimeout(3000);

            // ✅ IMPROVED: Multiple validation methods

            // Method 1: Check for login indicators
            const loginSelectors = [
                '[data-testid="myolx-link"]',
                'a[href*="/myaccount"]',
                'a[href*="myolx"]',
                'button[data-testid="user-menu-button"]'
            ];

            for (const selector of loginSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const isVisible = await page.evaluate(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0;
                        }, element);

                        if (isVisible) {
                            console.log(`✅ Login element topildi: ${selector}`);
                            console.log('✅ Login tasdiqlandi (cookie valid)');
                            return true;
                        }
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }

            // Method 2: Check cookies existence
            const currentCookies = await page.cookies();
            const hasAuthCookies = currentCookies.some(cookie =>
                cookie.name.includes('auth') ||
                cookie.name.includes('session') ||
                cookie.name.includes('token') ||
                cookie.name.includes('user')
            );

            if (hasAuthCookies) {
                console.log('✅ Auth cookies mavjud');

                // Try to access adding page
                try {
                    const addingResponse = await page.goto('https://www.olx.uz/adding/', {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000
                    });

                    const url = page.url();

                    // If we stayed on /adding/, we're logged in
                    if (url.includes('/adding/')) {
                        console.log('✅ /adding/ sahifasiga kirish mumkin - login valid');
                        return true;
                    }

                    // If redirected to login, cookies invalid
                    if (url.includes('/login') || url.includes('/auth')) {
                        console.log('❌ Login sahifasiga redirect bo\'ldi');
                        if (attempt < maxRetries) {
                            console.log(`⏳ ${attempt * 2} soniya kutib qayta uriniladi...`);
                            await page.waitForTimeout(attempt * 2000);
                            continue;
                        }
                        return false;
                    }

                    console.log('✅ Cookies ishlayotganga o\'xshaydi');
                    return true;

                } catch (e) {
                    console.log('⚠️ /adding/ sahifasini tekshirishda xato:', e.message);
                    if (attempt < maxRetries) {
                        console.log(`⏳ Qayta uriniladi...`);
                        await page.waitForTimeout(2000);
                        continue;
                    }
                }
            }

            console.log('❌ Login topilmadi (cookie invalid)');

            if (attempt < maxRetries) {
                console.log(`⏳ ${attempt * 2} soniya kutib qayta uriniladi...`);
                await page.waitForTimeout(attempt * 2000);
                continue;
            }

            return false;

        } catch (error) {
            console.error(`⚠️ Cookie validation xato (urinish ${attempt}):`, error.message);

            if (attempt < maxRetries) {
                console.log(`⏳ ${attempt * 2} soniya kutib qayta uriniladi...`);
                await page.waitForTimeout(attempt * 2000);
                continue;
            }

            return false;
        }
    }

    return false;
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

/**
 * ✅ NEW: Check if cookies are expired (without opening browser)
 */
function areCookiesExpired() {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            return true;
        }

        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
        const now = Date.now() / 1000; // Convert to seconds

        // Check if any important cookie is expired
        const hasValidCookie = cookies.some(cookie => {
            // If no expiration, assume it's valid
            if (!cookie.expires) return true;

            // Check if cookie is still valid
            return cookie.expires > now;
        });

        return !hasValidCookie;

    } catch (error) {
        console.error('❌ Cookie expiry check xato:', error.message);
        return true; // Assume expired on error
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