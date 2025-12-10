// server/src/services/olxAutomationService.js - CONTABO FIXED
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// User data directory - session saqlash uchun
const USER_DATA_DIR = path.join(__dirname, '../../.chrome-data');
const PropertyObject = require('../models/Object.pg');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ✅ FIXED: Contabo uchun Chrome path topish
 */
function getChromePath() {
    const paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log(`✅ Chrome topildi: ${p}`);
            return p;
        }
    }

    console.log('⚠️ Chrome path topilmadi, default ishlatiladi');
    return null;
}

/**
 * ✅ CRITICAL FIX: Browser sozlamalari (Contabo uchun)
 */
async function launchBrowser() {
    const isContabo = process.env.NODE_ENV === 'production' || process.env.IS_SERVER === 'true';

    console.log('\n🚀 Browser ishga tushirilmoqda...');
    console.log('  Environment:', isContabo ? 'PRODUCTION (Contabo)' : 'DEVELOPMENT');

    // User data directory yaratish
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
        console.log('📁 User data directory yaratildi');
    }

    const chromePath = getChromePath();

    const launchOptions = {
        headless: isContabo ? true : false, // Contabo'da headless
        userDataDir: USER_DATA_DIR,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-popup-blocking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--window-size=1920,1080'
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        ignoreHTTPSErrors: true
    };

    // ✅ CRITICAL: Chrome path faqat topilgan bo'lsa qo'shish
    if (chromePath) {
        launchOptions.executablePath = chromePath;
    }

    try {
        const browser = await puppeteer.launch(launchOptions);
        console.log('✅ Browser muvaffaqiyatli ishga tushdi');
        return browser;

    } catch (error) {
        console.error('❌ Browser ishga tushirishda xato:', error.message);

        // ✅ Fallback: executablePath'siz urinish
        if (chromePath) {
            console.log('⚠️ executablePath siz qayta urinilmoqda...');
            delete launchOptions.executablePath;

            try {
                const browser = await puppeteer.launch(launchOptions);
                console.log('✅ Browser fallback bilan ishga tushdi');
                return browser;
            } catch (fallbackError) {
                console.error('❌ Fallback ham ishlamadi:', fallbackError.message);
                throw fallbackError;
            }
        }

        throw error;
    }
}

/**
 * Rasm fayllarini topish
 */
async function getImageFiles(folderLink) {
    try {
        const uploadsDir = path.join(__dirname, '../../uploads');
        const urlPath = folderLink.split('/browse/')[1];

        if (!urlPath) {
            console.log('⚠️ Browse path topilmadi');
            return [];
        }

        const decodedPath = decodeURIComponent(urlPath);
        const fullPath = path.join(uploadsDir, decodedPath);

        console.log('📁 Rasm papkasi:', fullPath);

        if (!fs.existsSync(fullPath)) {
            console.log('⚠️ Papka topilmadi:', fullPath);
            return [];
        }

        const files = fs.readdirSync(fullPath);
        const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => path.join(fullPath, f));

        console.log(`✅ ${imageFiles.length} ta rasm topildi`);
        return imageFiles;

    } catch (error) {
        console.error('❌ Rasm topishda xato:', error.message);
        return [];
    }
}

/**
 * Alert yopish
 */
async function closeUnfinishedAdAlert(page) {
    try {
        console.log('\n⚠️ Eski elon alertini tekshirish...');
        await sleep(5000);

        try {
            const modal = await page.waitForSelector('div[role="dialog"][aria-modal="true"]', {
                timeout: 5000,
                visible: true
            });

            if (modal) {
                console.log('   ✅ Alert modal topildi!');
                const allButtons = await modal.$$('button');

                for (let i = 0; i < allButtons.length; i++) {
                    const text = await page.evaluate(el => el.textContent, allButtons[i]);
                    const variant = await page.evaluate(el => el.getAttribute('data-button-variant'), allButtons[i]);

                    if ((text && text.includes('Нет') && text.includes('заново')) || variant === 'tertiary') {
                        console.log('   🎯 "Нет, начать заново" topildi!');
                        await allButtons[i].click();
                        console.log('   ✅ Bosildi!');
                        await sleep(3000);
                        return true;
                    }
                }
            }
        } catch (modalError) {
            console.log('   ℹ️ Modal topilmadi');
        }

        console.log('   ℹ️ Alert yo\'q yoki yopilgan');
        return false;

    } catch (error) {
        console.log('   ⚠️ Alert xato:', error.message);
        return false;
    }
}

/**
 * Scroll helper
 */
async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await sleep(500);
}

/**
 * Login status tekshirish
 */
async function checkLoginStatus(page) {
    try {
        const currentUrl = page.url();

        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            return false;
        }

        const successSelectors = [
            '[data-testid="myolx-link"]',
            'a[href*="/myaccount"]',
            'a[href*="myolx"]'
        ];

        for (const selector of successSelectors) {
            try {
                const element = await page.$(selector);
                if (element) return true;
            } catch {
                continue;
            }
        }

        return false;

    } catch (error) {
        return false;
    }
}

/**
 * Manual login kutish
 */
async function waitForManualLogin(page, timeoutSeconds = 180) {
    console.log(`⏳ Kutilmoqda (${timeoutSeconds}s)...\n`);

    for (let i = timeoutSeconds; i > 0; i--) {
        const progress = Math.floor((timeoutSeconds - i) / timeoutSeconds * 30);
        const bar = '█'.repeat(progress) + '░'.repeat(30 - progress);
        process.stdout.write(`\r[${bar}] ${i}s `);

        await sleep(1000);

        if (i % 3 === 0) {
            const isLoggedIn = await checkLoginStatus(page);
            if (isLoggedIn) {
                console.log('\n✅ Login aniqlandi!\n');
                return true;
            }
        }
    }

    console.log('\n❌ Timeout: Login amalga oshmadi\n');
    return false;
}

/**
 * Login tekshirish va kutish
 */
async function checkAndWaitForLogin(page) {
    console.log('\n🔐 LOGIN TEKSHIRILMOQDA...');
    console.log('='.repeat(60));

    const isAlreadyLoggedIn = await checkLoginStatus(page);

    if (isAlreadyLoggedIn) {
        console.log('✅ Session mavjud');
        console.log('='.repeat(60));
        return true;
    }

    console.log('⚠️ Session topilmadi');
    console.log('');
    console.log('━'.repeat(60));
    console.log('  QUYIDAGI HAVOLAGA KIRING VA LOGIN QILING:');
    console.log('  https://www.olx.uz');
    console.log('━'.repeat(60));
    console.log('');
    console.log('⏰ 3 daqiqa kutiladi...');
    console.log('='.repeat(60));
    console.log('');

    const loginSuccess = await waitForManualLogin(page, 180);

    if (loginSuccess) {
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI!');
        return true;
    }

    return false;
}

/**
 * Mebel va Komission
 */
async function clickFurnishedAndCommission(page) {
    try {
        console.log('\n🔘 Меблирована - Нет...');
        const furnishedNoButton = await page.$('button[data-cy="parameters.furnished_no"]');

        if (furnishedNoButton) {
            await scrollToElement(page, furnishedNoButton);
            const beforePressed = await page.evaluate(el => el.getAttribute('aria-pressed'), furnishedNoButton);

            if (beforePressed !== 'true') {
                await furnishedNoButton.click();
                await sleep(1000);
                console.log('   ✅ Bosildi');
            } else {
                console.log('   ℹ️ Allaqachon bosilgan');
            }
        }

        await sleep(500);

        console.log('\n🔘 Комиссионные - Нет...');
        const commissionNoButton = await page.$('button[data-cy="parameters.comission_no"]');

        if (commissionNoButton) {
            await scrollToElement(page, commissionNoButton);
            const beforePressed = await page.evaluate(el => el.getAttribute('aria-pressed'), commissionNoButton);

            if (beforePressed !== 'true') {
                await commissionNoButton.click();
                await sleep(1000);
                console.log('   ✅ Bosildi');
            } else {
                console.log('   ℹ️ Allaqachon bosilgan');
            }
        }

    } catch (e) {
        console.log('   ❌ Xato:', e.message);
    }
}

/**
 * Tavsif yaratish
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya, planirovka, balkon, rieltor } = data;
    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;
    const location = kvartil || 'Yunusobod';
    const formattedPrice = narx.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    let description = `SOTILADI - ${location.toUpperCase()}\n`;
    description += `${xonaSoni}-xonali kvartira\n\n`;
    description += `• Joylashuv: ${location}\n`;
    description += `• Xonalar: ${xonaSoni}\n`;
    description += `• Maydon: ${m2} m2\n`;
    description += `• Qavat: ${etajInfo}\n`;
    if (uy_turi) description += `• Uy turi: ${uy_turi}\n`;
    if (xolati) description += `• Holati: ${xolati}\n`;
    if (planirovka) description += `• Planirovka: ${planirovka}\n`;
    if (balkon) description += `• Balkon: ${balkon}\n`;
    description += `\nNARX: ${formattedPrice} $\n\n`;
    description += `ПРОДАЕТСЯ - ${location.toUpperCase()}\n`;
    description += `${xonaSoni}-комнатная квартира\n\n`;
    description += `• Расположение: ${location}\n`;
    description += `• Комнат: ${xonaSoni}\n`;
    description += `• Площадь: ${m2} м2\n`;
    description += `• Этаж: ${etajInfo}\n`;
    if (uy_turi) description += `• Тип дома: ${uy_turi}\n`;
    if (xolati) description += `• Состояние: ${xolati}\n`;
    if (planirovka) description += `• Планировка: ${planirovka}\n`;
    if (balkon) description += `• Балкон: ${balkon}\n`;
    description += `\nЦЕНА: ${formattedPrice} $\n\n`;
    if (opisaniya) description += `${opisaniya}\n\n`;
    description += `#квартира #продажа #Ташкент #Yunusobod #${location.replace(/\s+/g, '')} #RTD #Maskan_lux`;

    return description.replace(/([•\-+/@#$!%])\1{2,}/g, '$1$1');
}

/**
 * Forma to'ldirish
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 FORMA TO\'LDIRISH');
        console.log('='.repeat(60));

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1. Title
        console.log('\n1️⃣ Sarlavha...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        const titleInput = await page.waitForSelector('[data-testid="posting-title"]', { timeout: 10000 });
        await scrollToElement(page, titleInput);
        await titleInput.click({ clickCount: 3 });
        await sleep(500);
        await titleInput.type(title, { delay: 80 });
        console.log('   ✅ Yozildi');
        await sleep(1000);

        // 2. Rasmlar
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('\n2️⃣ Rasmlar...');
            const photoInput = await page.waitForSelector('[data-testid="attach-photos-input"]', { timeout: 5000 });
            const imageFiles = await getImageFiles(objectData.rasmlar);

            if (imageFiles.length > 0) {
                const filesToUpload = imageFiles.slice(0, 8);
                console.log(`   📤 ${filesToUpload.length} ta rasm...`);
                await photoInput.uploadFile(...filesToUpload);
                await sleep(5000);
                console.log('   ✅ Yuklandi');
            }
        }

        // 3. Description
        console.log('\n3️⃣ Tavsif...');
        const description = createDescription(objectData);
        const descriptionArea = await page.waitForSelector('[data-testid="posting-description-text-area"]', { timeout: 10000 });
        await scrollToElement(page, descriptionArea);
        await descriptionArea.click();
        await sleep(500);
        await descriptionArea.type(description, { delay: 30 });
        console.log('   ✅ Yozildi');
        await sleep(1000);

        // 4. Narx
        console.log('\n4️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');
        const priceInput = await page.waitForSelector('[data-testid="price-input"]', { timeout: 10000 });
        await scrollToElement(page, priceInput);
        await priceInput.click({ clickCount: 3 });
        await sleep(300);
        await priceInput.type(price, { delay: 50 });
        console.log(`   ✅ ${price}`);
        await sleep(1000);

        // Qolgan maydonlar...
        console.log('\n✅ Asosiy maydonlar to\'ldirildi');

        console.log('\n' + '='.repeat(60));
        console.log('✅ FORMA TAYYOR');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ FORMA XATO:', error.message);
        throw error;
    }
}

/**
 * Submit
 */
async function submitAd(page) {
    try {
        console.log('\n🚀 SUBMIT...');

        const submitButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
        const beforeUrl = page.url();

        await submitButton.click();
        console.log('✅ Submit bosildi');

        await sleep(5000);

        const afterUrl = page.url();

        if (afterUrl !== beforeUrl && !afterUrl.includes('/adding/')) {
            console.log('✅ Elon berildi!');
            return afterUrl;
        }

        throw new Error('Elon berilmadi');

    } catch (error) {
        console.error('❌ Submit xato:', error.message);
        throw error;
    }
}

/**
 * ✅ MAIN FUNCTION - Contabo fixed
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION');
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    let browser = null;

    try {
        if (objectData.id) {
            await PropertyObject.setProcessing(objectData.id);
        }

        // ✅ FIXED: Contabo uchun browser launch
        browser = await launchBrowser();
        const page = await browser.newPage();

        // Anti-detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {} };
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        page.on('dialog', async dialog => {
            console.log('⚠️ Dialog:', dialog.message());
            await dialog.dismiss();
        });

        // OLX ga kirish
        console.log('📱 OLX.uz ga kirish...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await sleep(3000);

        // Login
        const isLoggedIn = await checkAndWaitForLogin(page);
        if (!isLoggedIn) {
            throw new Error('Login amalga oshmadi');
        }

        // Adding page
        console.log('📝 Adding page...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await sleep(5000);
        await closeUnfinishedAdAlert(page);

        // Fill form
        await fillAdForm(page, objectData);

        // Submit
        const adUrl = await submitAd(page);

        await sleep(3000);
        await browser.close();

        // Success
        if (objectData.id) {
            await PropertyObject.setPosted(objectData.id, adUrl);
        }

        return {
            success: true,
            adUrl: adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages[0]) {
                    const screenshotPath = path.join(__dirname, '../../logs', `error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshotPath, fullPage: true });
                    console.log('📷 Screenshot:', screenshotPath);
                }
            } catch (ssError) {
                // ignore
            }

            await browser.close();
        }

        if (objectData.id) {
            await PropertyObject.setError(objectData.id, error.message);
        }

        throw error;
    }
}

module.exports = {
    postToOLX
};