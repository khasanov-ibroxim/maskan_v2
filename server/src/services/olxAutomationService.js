// server/src/services/olxAutomationService.js - FIXED HEADLESS
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const PropertyObject = require('../models/Object.pg');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ✅ CONTABO SERVERDA ISHLASH UCHUN BROWSER SOZLAMALARI
 */
async function launchBrowser() {
    console.log('\n🚀 BROWSER ISHGA TUSHIRILMOQDA (HEADLESS MODE - CONTABO)');
    console.log('='.repeat(60));

    const USER_DATA_DIR = path.join(__dirname, '../../chrome-data');
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    // ✅ CRITICAL: Contabo serverda HEADLESS TRUE bo'lishi SHART
    const launchOptions = {
        headless: true, // ✅ Server uchun ALWAYS TRUE

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // ✅ VPS uchun
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-popup-blocking',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],

        userDataDir: USER_DATA_DIR,
        defaultViewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        timeout: 90000
    };

    console.log('📋 Browser sozlamalari:');
    console.log('   Mode: HEADLESS (Contabo VPS)');
    console.log('   User Data Dir:', USER_DATA_DIR);
    console.log('='.repeat(60) + '\n');

    try {
        const browser = await puppeteer.launch(launchOptions);
        const version = await browser.version();
        console.log('✅ Browser ochildi:', version);
        return browser;
    } catch (error) {
        console.error('❌ Browser ochishda xato:', error.message);
        throw error;
    }
}

/**
 * ✅ RASM FAYLLARINI TOPISH
 */
async function getImageFiles(folderLink) {
    try {
        if (!folderLink || folderLink === "Yo'q") {
            console.log('⚠️ Rasmlar yo\'q');
            return [];
        }

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
            console.log('⚠️ Papka topilmadi');
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
 * ✅ LOGIN STATUS TEKSHIRISH
 */
async function checkLoginStatus(page) {
    try {
        const currentUrl = page.url();

        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            return false;
        }

        // ✅ IMPROVED: Ko'proq selektorlar
        const successSelectors = [
            '[data-testid="myolx-link"]',
            'a[href*="/myaccount"]',
            'a[href*="myolx"]',
            '[class*="user-menu"]',
            'button:has-text("Мои объявления")'
        ];

        for (const selector of successSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    console.log(`✅ Login element topildi: ${selector}`);
                    return true;
                }
            } catch {
                continue;
            }
        }

        return false;

    } catch (error) {
        console.error('⚠️ Login tekshirishda xato:', error.message);
        return false;
    }
}

/**
 * ✅ HEADLESS MODE DA LOGIN (Cookie-based)
 */
async function ensureLoggedIn(page) {
    console.log('\n🔐 LOGIN TEKSHIRILMOQDA...');

    const isLoggedIn = await checkLoginStatus(page);

    if (isLoggedIn) {
        console.log('✅ Allaqachon login qilingan (cookies mavjud)');
        return true;
    }

    console.error('❌ LOGIN YO\'Q!');
    console.error('\n📋 QANDAY LOGIN QILISH (Headless mode):');
    console.error('1. Lokal kompyuterda browserda OLX.uz ga login qiling');
    console.error('2. Puppeteer User Data fayllarini Contabo serverga ko\'chiring:');
    console.error('   scp -r chrome-data/* your-server:/path/to/chrome-data/');
    console.error('3. Yoki Chrome Extension "EditThisCookie" ishlatib cookiesni export qiling');
    console.error('4. Cookiesni JSON faylga saqlab serverga yuklang\n');

    throw new Error('OLX.uz ga login qilinmagan. Cookies yuklab serverni qayta ishga tushiring.');
}
/**
 * ✅ Mebel va Komission
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
 * ✅ TAVSIF YARATISH
 */
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

/**
 * ✅ SCROLL TO ELEMENT
 */
async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await sleep(500);
}

/**
 * ✅ FORMA TO'LDIRISH (HEADLESS FRIENDLY)
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 FORMA TO\'LDIRISH (Headless Mode)');
        console.log('='.repeat(60));

        await sleep(5000);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1. TITLE
        console.log('1️⃣ Sarlavha...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        try {
            await page.waitForSelector('[data-testid="posting-title"]', { timeout: 10000 });
            await page.type('[data-testid="posting-title"]', title, { delay: 50 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 2. RASMLAR
        console.log('2️⃣ Rasmlar...');
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            try {
                const photoInput = await page.waitForSelector('[data-testid="attach-photos-input"]', { timeout: 10000 });
                const imageFiles = await getImageFiles(objectData.rasmlar);
                if (imageFiles.length > 0) {
                    const filesToUpload = imageFiles.slice(0, 8);
                    await photoInput.uploadFile(...filesToUpload);
                    await sleep(5000);
                    console.log(`   ✅ ${filesToUpload.length} ta rasm yuklandi`);
                }
            } catch (e) {
                console.log('   ⚠️ Xato:', e.message);
            }
        }
        await sleep(1000);

        // 3. TAVSIF
        console.log('3️⃣ Tavsif...');
        const description = createDescription(objectData);
        try {
            await page.waitForSelector('[data-testid="posting-description-text-area"]', { timeout: 10000 });
            await page.type('[data-testid="posting-description-text-area"]', description, { delay: 20 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 4. NARX
        console.log('4️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');
        try {
            await page.waitForSelector('[data-testid="price-input"]', { timeout: 10000 });
            await page.click('[data-testid="price-input"]', { clickCount: 3 });
            await page.type('[data-testid="price-input"]', price, { delay: 50 });
            console.log(`   ✅ ${price}`);
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 5. DOGOVORНАЯ
        console.log('5️⃣ Договорная...');
        try {
            const checkboxes = await page.$$('input[type="checkbox"]');
            for (const checkbox of checkboxes) {
                const id = await page.evaluate(el => el.id, checkbox);
                if (id && id.includes('nexus-input')) {
                    await page.evaluate(el => {
                        const parent = el.parentElement;
                        if (parent) parent.click();
                    }, checkbox);
                    await sleep(500);
                    console.log('   ✅ Belgilandi');
                    break;
                }
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 6. VALYUTA
        console.log('6️⃣ Valyuta...');
        try {
            const currencyButton = await page.$('.n-referenceinput-button');
            if (currencyButton) {
                await currencyButton.click();
                await sleep(1500);
                const uyeOption = await page.$('div[name="1_UYE"][role="radio"]');
                if (uyeOption) {
                    await uyeOption.click();
                    console.log('   ✅ у.е. tanlandi');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 7️⃣ SHAXSIY SHAXS
        console.log('\n7️⃣ Shaxsiy shaxs...');
        try {
            const privateButton = await page.$('button[data-testid="private_business_private_unactive"]');
            if (privateButton) {
                await scrollToElement(page, privateButton);
                await privateButton.click();
                console.log('   ✅ "Частное лицо" tanlandi');
            }
        } catch (e) {
            console.log('   ⚠️ Shaxsiy shaxs xato:', e.message);
        }
        await sleep(500);

        // 8️⃣ TIP JILYA
        console.log('\n8️⃣ Тип жилья (Вторичный рынок)...');
        try {
            const typeDropdownContainer = await page.$('div[data-testid="dropdown"][data-cy="parameters.type_of_market"]');
            if (typeDropdownContainer) {
                await scrollToElement(page, typeDropdownContainer);
                const dropdownButton = await typeDropdownContainer.$('button.n-referenceinput-button');
                if (dropdownButton) {
                    await dropdownButton.click();
                    await sleep(1500);
                    const allMenuItems = await page.$('div[data-testid="dropdown-menu-item"] a');
                    for (const item of allMenuItems) {
                        const text = await page.evaluate(el => el.textContent, item);
                        if (text.includes('Вторичный')) {
                            await item.click();
                            console.log('   ✅ "Вторичный рынок" tanlandi');
                            await sleep(500);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('   ⚠️ Тип жилья xato:', e.message);
        }
        await sleep(500);

        // 9️⃣ XONALAR SONI
        console.log('\n9️⃣ Xonalar soni...');
        try {
            const roomsInput = await page.$('input[data-testid="parameters.number_of_rooms"]');
            if (roomsInput) {
                await scrollToElement(page, roomsInput);
                await roomsInput.click({ clickCount: 3 });
                await sleep(200);
                await roomsInput.type(xonaSoni, { delay: 50 });
                console.log(`   ✅ ${xonaSoni} xona`);
            }
        } catch (e) {
            console.log('   ⚠️ Xonalar xato:', e.message);
        }
        await sleep(500);

        // 🔟 MAYDON
        console.log('\n🔟 Umumiy maydon...');
        try {
            const areaInput = await page.$('input[data-testid="parameters.total_area"]');
            if (areaInput) {
                await scrollToElement(page, areaInput);
                await areaInput.click({ clickCount: 3 });
                await sleep(200);
                await areaInput.type(objectData.m2.toString(), { delay: 50 });
                console.log(`   ✅ ${objectData.m2} m²`);
            }
        } catch (e) {
            console.log('   ⚠️ Maydon xato:', e.message);
        }
        await sleep(500);

        // 1️⃣1️⃣ ETAJ
        console.log('\n1️⃣1️⃣ Etaj...');
        try {
            const floorInput = await page.$('input[data-testid="parameters.floor"]');
            if (floorInput) {
                await scrollToElement(page, floorInput);
                await floorInput.click({ clickCount: 3 });
                await sleep(200);
                await floorInput.type(etaj, { delay: 50 });
                console.log(`   ✅ ${etaj}-etaj`);
            }
        } catch (e) {
            console.log('   ⚠️ Etaj xato:', e.message);
        }
        await sleep(500);

        // 1️⃣2️⃣ ETAJNOST
        console.log('\n1️⃣2️⃣ Etajnost...');
        try {
            const floorsInput = await page.$('input[data-testid="parameters.total_floors"]');
            if (floorsInput) {
                await scrollToElement(page, floorsInput);
                await floorsInput.click({ clickCount: 3 });
                await sleep(200);
                await floorsInput.type(etajnost, { delay: 50 });
                console.log(`   ✅ ${etajnost}-qavatli`);
            }
        } catch (e) {
            console.log('   ⚠️ Etajnost xato:', e.message);
        }
        await sleep(1000);

        // 1️⃣3️⃣-1️⃣4️⃣ МЕБЛИРОВАНА VA КОМИССИОННЫЕ
        await clickFurnishedAndCommission(page);
        await sleep(500);

        // 1️⃣5️⃣ JOYLASHUV
        console.log('\n1️⃣5️⃣ Joylashuv (Yunusobod)...');
        try {
            const locationInput = await page.$('input[data-testid="autosuggest-location-search-input"]');
            if (locationInput) {
                await scrollToElement(page, locationInput);
                await locationInput.click();
                await sleep(500);
                await locationInput.type('Yunusobod', { delay: 100 });
                console.log('   ✅ "Yunusobod" yozildi');
                await sleep(2000);
                const locationOption = await page.waitForSelector('button[data-testid="location-list-item"]', {
                    timeout: 5000
                });
                if (locationOption) {
                    await locationOption.click();
                    console.log('   ✅ "Ташкент, Юнусабадский район" tanlandi');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Joylashuv xato:', e.message);
        }
        await sleep(1000);

        // 1️⃣6️⃣ TELEFON
        console.log('\n1️⃣6️⃣ Telefon raqam...');
        try {
            const phoneInput = await page.$('input[data-testid="phone"]');
            if (phoneInput) {
                await scrollToElement(page, phoneInput);
                await phoneInput.click({ clickCount: 3 });
                await sleep(300);
                await phoneInput.press('Backspace');
                await sleep(500);
                const phoneNumber = '998970850604';
                await phoneInput.type(phoneNumber, { delay: 80 });
                console.log(`   ✅ +${phoneNumber}`);
            }
        } catch (e) {
            console.log('   ⚠️ Telefon xato:', e.message);
        }
        await sleep(1000);

        console.log('\n✅ FORMA TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');

        // Screenshot (debug uchun)
        const logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const screenshotPath = path.join(logsDir, `form-filled-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('📷 Screenshot:', screenshotPath);

    } catch (error) {
        console.error('❌ FORMA XATO:', error.message);
        throw error;
    }
}

/**
 * ✅ SUBMIT QILISH
 */
async function submitAd(page) {
    try {
        console.log('\n🚀 ELON BERILMOQDA...');

        const submitButton = await page.waitForSelector('button[data-testid="submit-btn"]', { timeout: 10000 });
        const beforeUrl = page.url();

        await submitButton.click();
        console.log('✅ Submit bosildi');

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        const afterUrl = page.url();
        console.log('📍 Yangi URL:', afterUrl);

        if (afterUrl !== beforeUrl && !afterUrl.includes('/adding/')) {
            console.log('✅ ELON BERILDI!');
            return afterUrl;
        }

        throw new Error('Submit amalga oshmadi');

    } catch (error) {
        console.error('❌ Submit xato:', error.message);
        throw error;
    }
}

/**
 * ✅ ASOSIY FUNKSIYA
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION (HEADLESS - CONTABO)');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('='.repeat(60) + '\n');

    let browser = null;

    try {
        // 1. PROCESSING
        await PropertyObject.setProcessing(objectData.id);

        // 2. BROWSER
        browser = await launchBrowser();
        const page = await browser.newPage();

        // Anti-detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // 3. OLX.UZ
        console.log('📱 OLX.uz...');
        await page.goto('https://www.olx.uz', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(3000);

        // 4. LOGIN TEKSHIRISH
        await ensureLoggedIn(page);

        // 5. ADDING PAGE
        console.log('📝 Elon berish sahifasi...');
        await page.goto('https://www.olx.uz/adding/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);

        // 6. FORMA
        await fillAdForm(page, objectData);

        // 7. SUBMIT
        const adUrl = await submitAd(page);

        console.log('✅ MUVAFFAQIYATLI!');
        await sleep(2000);
        await browser.close();

        // 8. POSTED
        await PropertyObject.setPosted(objectData.id, adUrl);

        return { success: true, adUrl, timestamp: new Date().toISOString() };

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser) {
            try {
                const page = (await browser.pages())[0];
                const screenshotPath = path.join(__dirname, '../../logs', `error-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log('📷 Error screenshot:', screenshotPath);
            } catch (e) {}
            await browser.close();
        }

        await PropertyObject.setError(objectData.id, error.message);

        throw error;
    }
}

module.exports = { postToOLX };