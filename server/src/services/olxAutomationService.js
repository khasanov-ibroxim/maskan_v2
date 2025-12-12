// server/src/services/olxAutomationService.js - COOKIE-BASED LOGIN
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const PropertyObject = require('../models/Object.pg');

puppeteer.use(StealthPlugin());

// ✅ Cookie file path
const COOKIE_FILE = path.join(__dirname, '../../cookies/olx-cookies.json');

// ✅ Ensure cookies directory exists
function ensureCookieDir() {
    const dir = path.dirname(COOKIE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Cookies papka yaratildi:', dir);
    }
}

// ✅ Save cookies to file
async function saveCookies(page) {
    try {
        ensureCookieDir();
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
        console.log('💾 Cookies saqlandi:', COOKIE_FILE);
        console.log('   Cookies soni:', cookies.length);
        return true;
    } catch (error) {
        console.error('❌ Cookie saqlashda xato:', error.message);
        return false;
    }
}

// ✅ Load cookies from file
async function loadCookies(page) {
    try {
        if (!fs.existsSync(COOKIE_FILE)) {
            console.log('⚠️ Cookie fayl topilmadi');
            return false;
        }

        const cookiesString = fs.readFileSync(COOKIE_FILE, 'utf8');
        const cookies = JSON.parse(cookiesString);

        if (!cookies || cookies.length === 0) {
            console.log('⚠️ Cookie fayl bo\'sh');
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

// ✅ Check if cookies are valid
async function validateCookies(page) {
    try {
        console.log('\n🔍 Cookies validatsiya...');

        // Go to account page to check if logged in
        await page.goto('https://www.olx.uz/myaccount/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await randomDelay(3000, 5000);

        const currentUrl = page.url();
        console.log('   Current URL:', currentUrl);

        // Check if redirected to login
        if (currentUrl.includes('login.olx.uz') || currentUrl.includes('/login/')) {
            console.log('❌ Cookies invalid - login sahifasiga redirect qilindi');
            return false;
        }

        // Check if on account page
        if (currentUrl.includes('/myaccount/') || currentUrl.includes('/account/')) {
            console.log('✅ Cookies valid - account sahifasida');
            return true;
        }

        // Check for account elements
        const accountLink = await page.$('a[href*="/myaccount/"], a[href*="/profile/"]').catch(() => null);
        if (accountLink) {
            console.log('✅ Cookies valid - account elementi topildi');
            return true;
        }

        console.log('⚠️ Cookies holati noaniq');
        return false;

    } catch (error) {
        console.error('❌ Validation xato:', error.message);
        return false;
    }
}

// ✅ Delete cookies file
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

// ✅ Get cookie info
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
            modified: stats.mtime.toISOString(),
            path: COOKIE_FILE
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

// ✅ Random delay
const randomDelay = (min = 500, max = 2000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
};

// ✅ Random mouse movement
async function randomMouseMove(page) {
    const viewport = page.viewport();
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
}

// ✅ Human-like typing
async function humanType(page, selector, text) {
    try {
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });
        const element = await page.$(selector);

        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        await element.click();
        await randomDelay(300, 600);

        for (const char of text) {
            await element.type(char, { delay: Math.random() * 150 + 100 });
            if (Math.random() < 0.2) {
                await randomDelay(200, 500);
            }
        }

        return true;
    } catch (error) {
        console.error(`❌ humanType xato (${selector}):`, error.message);
        throw error;
    }
}

// ✅ Launch browser
async function launchBrowser() {
    console.log('\n🚀 BROWSER ISHGA TUSHIRILMOQDA (COOKIE MODE)');
    console.log('='.repeat(60));

    const isProduction = process.env.NODE_ENV === 'production';
    console.log('🖥️  Environment:', isProduction ? 'PRODUCTION' : 'LOCAL');

    const launchOptions = {
        headless: isProduction ? true : false,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
        ],

        defaultViewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        timeout: 120000,
        ignoreDefaultArgs: ['--enable-automation'],
    };

    const browser = await puppeteer.launch(launchOptions);
    console.log('✅ Browser ochildi');

    return browser;
}

// ✅ Ensure logged in with cookies
async function ensureLoggedInWithCookies(page) {
    console.log('\n🔐 COOKIE LOGIN');
    console.log('='.repeat(60));

    // 1. Check if cookies exist
    const cookieInfo = getCookieInfo();
    console.log('📊 Cookie info:', cookieInfo);

    if (!cookieInfo.exists) {
        throw new Error('❌ Cookie fayl topilmadi! \n' +
            'Quyidagi qadamlarni bajaring:\n' +
            '1. Lokal kompyuterda: npm run olx:manual-login\n' +
            '2. Browser ochilganda OLX ga login qiling\n' +
            '3. Cookies avtomatik saqlanadi\n' +
            '4. Serverga yuklang: scp cookies/olx-cookies.json root@server:/path/to/server/cookies/');
    }

    // 2. Load cookies
    console.log('\n📥 Cookies yuklanmoqda...');
    const loaded = await loadCookies(page);

    if (!loaded) {
        throw new Error('Cookies yuklanmadi');
    }

    // 3. Validate cookies
    console.log('\n🔍 Cookies validatsiya...');
    const isValid = await validateCookies(page);

    if (!isValid) {
        console.error('\n❌ COOKIES INVALID!');
        console.error('Cookies muddati tugagan yoki noto\'g\'ri.');
        console.error('Yangi login qiling: npm run olx:manual-login');

        // Delete invalid cookies
        deleteCookies();

        throw new Error('Cookies invalid - yangi login qiling');
    }

    console.log('✅ LOGIN MUVAFFAQIYATLI (via cookies)');
    console.log('='.repeat(60) + '\n');

    return true;
}

// ✅ Get image files (unchanged)
async function getImageFiles(folderLink) {
    try {
        if (!folderLink || folderLink === "Yo'q") return [];

        const uploadsDir = path.join(__dirname, '../../uploads');
        const urlPath = folderLink.split('/browse/')[1];
        if (!urlPath) return [];

        const decodedPath = decodeURIComponent(urlPath);
        const fullPath = path.join(uploadsDir, decodedPath);

        if (!fs.existsSync(fullPath)) return [];

        const files = fs.readdirSync(fullPath);
        const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => path.join(fullPath, f));

        return imageFiles;
    } catch (error) {
        console.error('❌ Rasm topishda xato:', error.message);
        return [];
    }
}

// ✅ Create description (unchanged)
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya, planirovka, balkon } = data;
    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;
    const location = kvartil || 'Yunusobod';
    const formattedPrice = narx.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    let description = `SOTILADI - ${location.toUpperCase()}\n${xonaSoni}-xonali kvartira\n\n`;
    description += `ASOSIY MA'LUMOTLAR:\n---\n• Joylashuv: ${location}\n• Xonalar: ${xonaSoni}\n`;
    description += `• Maydon: ${m2} m2\n• Qavat: ${etajInfo}\n`;
    if (uy_turi) description += `• Uy turi: ${uy_turi}\n`;
    if (xolati) description += `• Ta'mir: ${xolati}\n`;
    if (planirovka) description += `• Planirovka: ${planirovka}\n`;
    if (balkon) description += `• Balkon: ${balkon}\n`;
    description += `\nNARX: ${formattedPrice} $ (Kelishiladi)\n\n`;
    description += `AFZALLIKLAR:\n+ Hujjatlar tayyor\n+ Tez ko'rik\n+ Professional yordam\n\n`;

    description += `ПРОДАЕТСЯ - ${location.toUpperCase()}\n${xonaSoni}-комнатная квартира\n\n`;
    description += `ОСНОВНАЯ ИНФОРМАЦИЯ:\n---\n• Расположение: ${location}\n• Комнат: ${xonaSoni}\n`;
    description += `• Площадь: ${m2} м2\n• Этаж: ${etajInfo}\n`;
    if (uy_turi) description += `• Тип дома: ${uy_turi}\n`;
    if (xolati) description += `• Состояние: ${xolati}\n`;
    if (planirovka) description += `• Планировка: ${planirovka}\n`;
    if (balkon) description += `• Балкон: ${balkon}\n`;
    description += `\nЦЕНА: ${formattedPrice} $ (Договорная)\n\n`;
    description += `ПРЕИМУЩЕСТВА:\n+ Документы готовы\n+ Быстрый показ\n+ Профессиональная помощь\n`;

    if (opisaniya?.trim()) description += `\nДОПОЛНИТЕЛЬНО:\n${opisaniya}\n`;

    return description;
}

// ✅ Scroll to element
async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await randomDelay(500, 1000);
    await randomMouseMove(page);
}

// ✅ Human click
async function humanClick(page, element) {
    await scrollToElement(page, element);

    const box = await element.boundingBox();
    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;

    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await randomDelay(100, 300);
    await page.mouse.click(x, y);
}

// ✅ Fill ad form (simplified - add more fields as needed)
async function fillAdForm(page, objectData) {
    console.log('\n📝 FORMA TO\'LDIRISH');
    console.log('='.repeat(60));

    await randomDelay(3000, 5000);

    const xonaSoni = objectData.xet.split('/')[0];
    const etaj = objectData.xet.split('/')[1];
    const etajnost = objectData.xet.split('/')[2];

    // 1. TITLE
    console.log('1️⃣ Sarlavha...');
    const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
    try {
        await humanType(page, 'input[data-testid="posting-title"]', title);
        console.log('   ✅ Yozildi');
    } catch (e) {
        console.log('   ⚠️ Xato:', e.message);
    }
    await randomDelay(1000, 2000);

    // 2. IMAGES
    console.log('2️⃣ Rasmlar...');
    if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
        try {
            const photoInput = await page.$('[data-testid="attach-photos-input"]');
            const imageFiles = await getImageFiles(objectData.rasmlar);
            if (imageFiles.length > 0) {
                const filesToUpload = imageFiles.slice(0, 8);
                await photoInput.uploadFile(...filesToUpload);
                await randomDelay(5000, 7000);
                console.log(`   ✅ ${filesToUpload.length} ta rasm yuklandi`);
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
    }

    // Add more form fields here...
    // (Price, description, rooms, area, floor, etc.)

    console.log('\n✅ FORMA TO\'LDIRILDI');
    console.log('='.repeat(60) + '\n');

    // Screenshot
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    const screenshotPath = path.join(logsDir, `form-filled-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📷 Screenshot:', screenshotPath);
}

// ✅ Submit ad
async function submitAd(page) {
    console.log('\n🚀 SUBMIT...');
    const submitButton = await page.$('button[data-testid="submit-btn"]');
    await humanClick(page, submitButton);

    await randomDelay(3000, 5000);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

    const afterUrl = page.url();
    if (!afterUrl.includes('/adding/')) {
        console.log('✅ ELON BERILDI:', afterUrl);
        return afterUrl;
    }
    throw new Error('Submit xato');
}

// ✅ Main function
async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION - COOKIE LOGIN');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('='.repeat(60) + '\n');

    let browser = null;
    let page = null;

    try {
        await PropertyObject.setProcessing(objectData.id);

        browser = await launchBrowser();
        page = await browser.newPage();

        // Stealth
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru'] });
            window.chrome = { runtime: {} };
        });

        // ✅ Login with cookies
        await ensureLoggedInWithCookies(page);

        // Navigate to adding page
        console.log('📝 /adding sahifasiga o\'tish...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await randomDelay(5000, 8000);

        // Fill form
        await fillAdForm(page, objectData);

        // Submit
        const adUrl = await submitAd(page);

        await page.close();
        await browser.close();

        await PropertyObject.setPosted(objectData.id, adUrl);

        return {
            success: true,
            adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser && page) {
            try {
                const logsDir = path.join(__dirname, '../../logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                const screenshotPath = path.join(logsDir, `error-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
                console.log('📷 Screenshot:', screenshotPath);
            } catch (e) {}
        }

        try {
            if (page) await page.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});
        } catch (e) {}

        await PropertyObject.setError(objectData.id, error.message);
        throw error;
    }
}

module.exports = {
    postToOLX,
    saveCookies,
    loadCookies,
    validateCookies,
    deleteCookies,
    getCookieInfo
};