// server/src/services/olxAutomationService.js - BETTER VALIDATION
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const PropertyObject = require('../models/Object.pg');
const { loadCookies, validateCookies, getCookieInfo, areCookiesExpired } = require('./olxCookieManager');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ✅ BROWSER CONFIG
 */
async function launchBrowser() {
    console.log('\n🚀 BROWSER ISHGA TUSHIRILMOQDA');
    console.log('='.repeat(60));

    const launchOptions = {
        headless: true,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--window-size=1920,1080'
        ],

        defaultViewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        timeout: 90000
    };

    console.log('📋 Headless mode (VPS)');

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
 * ✅ IMPROVED: Login check with better error handling
 */
async function ensureLoggedIn(page) {
    console.log('\n🔐 COOKIE LOGIN');
    console.log('='.repeat(60));

    // 1. Cookie file check
    const cookieInfo = getCookieInfo();
    console.log('📊 Cookie info:');
    console.log('   Mavjud:', cookieInfo.exists ? '✅' : '❌');

    if (!cookieInfo.exists) {
        throw new Error('Cookie fayli topilmadi - olxManualLogin.js ishga tushiring');
    }

    console.log('   Cookies:', cookieInfo.count);
    console.log('   Hajmi:', cookieInfo.size);
    console.log('   O\'zgartirilgan:', new Date(cookieInfo.modified).toLocaleString('uz-UZ'));

    // 2. Check if cookies are expired (quick check)
    const expired = areCookiesExpired();
    if (expired) {
        console.log('⚠️ Ba\'zi cookies expire bo\'lgan');
        console.log('   Lekin baribir tekshiramiz...');
    }

    // 3. Load cookies
    console.log('\n📥 Cookies yuklanmoqda...');
    const loaded = await loadCookies(page);

    if (!loaded) {
        throw new Error('Cookies yuklanmadi');
    }

    // 4. Validate cookies
    console.log('\n🔍 Cookies validatsiya...');
    const isValid = await validateCookies(page);

    if (!isValid) {
        console.error('\n❌ COOKIES INVALID!');
        console.error('\n📋 YANGI LOGIN KERAK:');
        console.error('1. Lokal kompyuterda:');
        console.error('   npm run olx:login');
        console.error('   # yoki');
        console.error('   node src/scripts/olxManualLogin.js');
        console.error('\n2. Cookies faylni serverga yuklash:');
        console.error('   scp cookies/olx-cookies.json root@your-server:/root/maskan-lux-server/cookies/');
        console.error('\n3. Serverni restart:');
        console.error('   pm2 restart maskan-lux\n');

        throw new Error('Cookies invalid - yangi login qiling');
    }

    console.log('✅ LOGIN MUVAFFAQIYATLI');
    console.log('='.repeat(60) + '\n');

    return true;
}

// ... (qolgan kodlar o'zgarmaydi - getImageFiles, createDescription, scrollToElement, etc.)

/**
 * ✅ GET IMAGE FILES
 */
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

async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await sleep(500);
}

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
            }
        }
    } catch (e) {
        console.log('   ❌ Xato:', e.message);
    }
}

async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 FORMA TO\'LDIRISH');
        console.log('='.repeat(60));

        await sleep(5000);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1. TITLE
        console.log('1️⃣ Sarlavha...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        try {
            await page.waitForSelector('input[data-testid="posting-title"]', { timeout: 10000 });
            await page.type('[data-testid="posting-title"]', title, { delay: 50 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 2. IMAGES
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

        // 3. DESCRIPTION
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

        // 4. PRICE
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

        // 5. NEGOTIABLE
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

        // 6. CURRENCY
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

        // 7. PRIVATE PERSON
        console.log('\n7️⃣ Shaxsiy shaxs...');
        try {
            const privateButton = await page.$('button[data-testid="private_business_private_unactive"]');
            if (privateButton) {
                await scrollToElement(page, privateButton);
                await privateButton.click();
                console.log('   ✅ "Частное лицо" tanlandi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 8. TYPE OF MARKET
        console.log('\n8️⃣ Тип жилья (Вторичный рынок)...');
        try {
            const typeDropdownContainer = await page.$('div[data-testid="dropdown"][data-cy="parameters.type_of_market"]');
            if (typeDropdownContainer) {
                await scrollToElement(page, typeDropdownContainer);
                const dropdownButton = await typeDropdownContainer.$('button.n-referenceinput-button');
                if (dropdownButton) {
                    await dropdownButton.click();
                    await sleep(1500);
                    const allMenuItems = await page.$$('div[data-testid="dropdown-menu-item"] a');
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 9. ROOMS
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 10. AREA
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 11. FLOOR
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 12. TOTAL FLOORS
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 13-14. FURNISHED & COMMISSION
        await clickFurnishedAndCommission(page);
        await sleep(500);

        // 15. LOCATION
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 16. PHONE
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

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

    } catch (error) {
        console.error('❌ FORMA XATO:', error.message);
        throw error;
    }
}

async function submitAd(page) {
    console.log('\n🚀 SUBMIT...');
    const submitButton = await page.waitForSelector('button[data-testid="submit-btn"]', { timeout: 10000 });
    await submitButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    const afterUrl = page.url();
    if (!afterUrl.includes('/adding/')) {
        console.log('✅ ELON BERILDI:', afterUrl);
        return afterUrl;
    }
    throw new Error('Submit xato');
}

async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('='.repeat(60) + '\n');

    let browser = null;

    try {
        await PropertyObject.setProcessing(objectData.id);
        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await ensureLoggedIn(page);

        console.log('📝 Elon sahifasi...');
        await page.goto('https://www.olx.uz/adding/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);

        await fillAdForm(page, objectData);
        const adUrl = await submitAd(page);

        await browser.close();
        await PropertyObject.setPosted(objectData.id, adUrl);

        return { success: true, adUrl, timestamp: new Date().toISOString() };

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser) {
            try {
                const page = (await browser.pages())[0];
                const screenshotPath = path.join(__dirname, '../../logs', `error-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log('📷 Screenshot:', screenshotPath);
            } catch (e) {}
            await browser.close();
        }

        await PropertyObject.setError(objectData.id, error.message);
        throw error;
    }
}

module.exports = { postToOLX };