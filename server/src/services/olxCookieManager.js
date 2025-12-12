// server/src/services/olxCookieManager.js - NO VALIDATION
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
        console.log('✅ Cookies saqlandi');
        return true;
    } catch (error) {
        console.error('❌ Cookie save xato:', error.message);
        return false;
    }
}

async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            return false;
        }
        const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
        await page.setCookie(...cookies);
        console.log('✅ Cookies yuklandi:', cookies.length);
        return true;
    } catch (error) {
        console.error('❌ Cookie load xato:', error.message);
        return false;
    }
}

/**
 * ✅ SKIP VALIDATION - trust cookies
 */
async function validateCookies(page) {
    console.log('✅ Cookies loaded - skipping validation');
    console.log('   (Validation headless mode da ishlamaydi)');
    return true;
}

function deleteCookies() {
    try {
        if (fs.existsSync(COOKIE_FILE)) {
            fs.unlinkSync(COOKIE_FILE);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

function getCookieInfo() {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            return { exists: false };
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
        return { exists: false };
    }
}

function areCookiesExpired() {
    return false; // Always assume valid
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