// server/src/services/olxAutomationService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// OLX login ma'lumotlari
const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;

// Cookie fayl yo'li
const COOKIE_PATH = path.join(__dirname, '../../data/olx-cookies.json');

// Helper function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cookie-larni saqlash
 */
async function saveCookies(page) {
    try {
        const cookies = await page.cookies();
        const dir = path.dirname(COOKIE_PATH);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
        console.log('✅ Cookie saqlandi');
    } catch (error) {
        console.error('⚠️ Cookie saqlashda xato:', error.message);
    }
}

/**
 * Cookie-larni yuklash
 */
async function loadCookies(page) {
    try {
        if (fs.existsSync(COOKIE_PATH)) {
            const cookiesString = fs.readFileSync(COOKIE_PATH, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
            console.log('✅ Cookie yuklandi');
            return true;
        }
        return false;
    } catch (error) {
        console.error('⚠️ Cookie yuklashda xato:', error.message);
        return false;
    }
}

/**
 * Alert/Dialog handler
 */
async function setupDialogHandler(page) {
    page.on('dialog', async dialog => {
        console.log('⚠️ Alert/Dialog:', dialog.message());
        await dialog.dismiss(); // Alertni yopish
    });
}

/**
 * OLX.uz ga elon berish
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX automation boshlandi...');
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    let browser = null;

    try {
        // Browser ochish
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ],
            defaultViewport: null
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Dialog handler
        setupDialogHandler(page);

        // Cookie yuklash
        console.log('🍪 Cookie yuklash...');
        await loadCookies(page);

        // OLX.uz ga kirish
        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await sleep(3000);

        // Login tekshirish
        const isLoggedIn = await checkLogin(page);

        if (!isLoggedIn) {
            console.log('🔐 Login qilish kerak...');
            await loginToOLX(page);
            await saveCookies(page);
            await sleep(2000);
        } else {
            console.log('✅ Allaqachon login qilingan');
        }

        // Elon berish sahifasiga o'tish
        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await sleep(3000);

        // Qayta login tekshirish
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            console.log('⚠️ Login sahifasiga yo\'naltirildi, qayta login qilish...');
            await loginToOLX(page);
            await saveCookies(page);

            // Qayta elon sahifasiga o'tish
            await page.goto('https://www.olx.uz/adding/', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            await sleep(3000);
        }

        // Ma'lumotlarni to'ldirish
        console.log('✍️ Ma\'lumotlar to\'ldirilmoqda...');
        await fillAdForm(page, objectData);

        // Rasmlar yuklash
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('📸 Rasmlar yuklanmoqda...');
            await uploadImages(page, objectData);
        }

        // Elon berish
        console.log('🚀 Elon berilmoqda...');
        const adUrl = await submitAd(page);

        if (!adUrl || adUrl.includes('login')) {
            throw new Error('Elon berilmadi - login sahifasiga qaytarildi');
        }

        console.log('✅ Elon muvaffaqiyatli berildi:', adUrl);

        await sleep(3000);
        await browser.close();

        return {
            success: true,
            adUrl: adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ OLX automation xato:', error);

        // Screenshot olish
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages[0]) {
                    const screenshotPath = path.join(__dirname, '../../logs', `olx-error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshotPath, fullPage: true });
                    console.log('📷 Screenshot saqlandi:', screenshotPath);
                }
            } catch (screenshotError) {
                console.error('Screenshot olishda xato:', screenshotError);
            }

            await browser.close();
        }

        throw error;
    }
}

/**
 * Login tekshirish
 */
async function checkLogin(page) {
    try {
        const currentUrl = page.url();
        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            console.log('❌ Login sahifasida');
            return false;
        }

        const selectors = [
            '[data-testid="myolx-link"]',
            'a[href*="/myaccount"]',
            'a[href*="myolx"]'
        ];

        for (const selector of selectors) {
            try {
                const element = await page.waitForSelector(selector, { timeout: 2000 });
                if (element) {
                    console.log(`✅ Login tekshirildi: ${selector}`);
                    return true;
                }
            } catch {
                continue;
            }
        }

        console.log('❌ Login elementlari topilmadi');
        return false;
    } catch (error) {
        console.error('Login tekshirishda xato:', error.message);
        return false;
    }
}

/**
 * OLX.uz ga login qilish
 */
async function loginToOLX(page) {
    if (!OLX_EMAIL || !OLX_PASSWORD) {
        throw new Error('OLX_EMAIL yoki OLX_PASSWORD environment variable topilmadi');
    }

    try {
        const currentUrl = page.url();
        if (!currentUrl.includes('login')) {
            console.log('🔍 Login tugmasini topish...');

            const loginSelectors = [
                '[data-testid="myolx-link"]',
                'a[href*="myaccount"]',
                'a[href*="login"]'
            ];

            let loginClicked = false;
            for (const selector of loginSelectors) {
                try {
                    const element = await page.waitForSelector(selector, { timeout: 3000 });
                    if (element) {
                        await element.click();
                        console.log(`✅ Login tugma bosildi: ${selector}`);
                        loginClicked = true;
                        break;
                    }
                } catch {
                    continue;
                }
            }

            if (!loginClicked) {
                throw new Error('Login tugmasi topilmadi');
            }

            await sleep(3000);
        }

        // Email input
        console.log('📧 Email kiritilmoqda...');
        const emailInput = await page.waitForSelector('input[type="email"], input[name="email"]', {
            timeout: 10000
        });

        await emailInput.click({ clickCount: 3 });
        await emailInput.type(OLX_EMAIL, { delay: 100 });
        console.log('✅ Email kiritildi');

        await sleep(1000);

        // Password input
        console.log('🔑 Password kiritilmoqda...');
        const passwordInput = await page.waitForSelector('input[type="password"], input[name="password"]', {
            timeout: 10000
        });

        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(OLX_PASSWORD, { delay: 100 });
        console.log('✅ Password kiritildi');

        await sleep(1000);

        // Submit button
        console.log('🚀 Login tugmasi bosilmoqda...');
        const submitButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });

        if (submitButton) {
            await submitButton.click();
            console.log('✅ Submit bosildi');
        }

        // Navigation kutish
        try {
            await page.waitForNavigation({
                waitUntil: 'networkidle2',
                timeout: 30000
            });
        } catch {
            console.log('⚠️ Navigation timeout');
        }

        await sleep(3000);

        const isLoggedIn = await checkLogin(page);

        if (!isLoggedIn) {
            throw new Error('Login muvaffaqiyatsiz');
        }

        console.log('✅ Login muvaffaqiyatli');

    } catch (error) {
        console.error('❌ Login xato:', error.message);
        throw error;
    }
}

/**
 * Elon formasini to'ldirish
 */
async function fillAdForm(page, objectData) {
    try {
        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1. SARLAVHA (MAJBURIY)
        console.log('1️⃣ Sarlavha kiritilmoqda...');
        const title = `Sotiladi — ${objectData.kvartil}, ${xonaSoni} хона`;

        const titleInput = await page.waitForSelector('[data-testid="posting-title"]', { timeout: 5000 });
        await titleInput.click({ clickCount: 3 });
        await titleInput.type(title, { delay: 50 });
        console.log('✅ Sarlavha:', title);

        await sleep(1000);

        // 2. KATEGORIYA tanlash
        console.log('2️⃣ Kategoriya tanlash...');
        try {
            // "Выберите категорию" tugmasini topish va bosish
            const categoryButton = await page.waitForSelector('[data-testid="category-select"]', { timeout: 5000 });
            if (categoryButton) {
                await categoryButton.click();
                await sleep(1000);

                // Nedvizhimost -> Prodazha kvartir yo'lini tanlash
                // Bu qismni sizning real kategoriya strukturangizga qarab sozlang
                console.log('⚠️ Kategoriya tanlash qo\'lda bajarilishi kerak');
            }
        } catch (error) {
            console.log('⚠️ Kategoriya avtomatik tanlanmadi:', error.message);
        }

        await sleep(1000);

        // 3. TAVSIF (MAJBURIY)
        console.log('3️⃣ Tavsif yozilmoqda...');
        const description = createDescription(objectData);

        const textarea = await page.waitForSelector('[data-testid="posting-description-text-area"]', { timeout: 5000 });
        await textarea.click();
        await textarea.type(description, { delay: 30 });
        console.log('✅ Tavsif yozildi');

        await sleep(1000);

        // 4. NARX (MAJBURIY)
        console.log('4️⃣ Narx kiritilmoqda...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');

        const priceInput = await page.waitForSelector('[data-testid="price-input"]', { timeout: 5000 });
        await priceInput.click({ clickCount: 3 });
        await priceInput.type(price, { delay: 50 });
        console.log('✅ Narx:', price);

        await sleep(1000);

        // 5. VALYUTA - у.е. (MAJBURIY)
        console.log('5️⃣ Valyuta - у.е. tanlash...');
        try {
            // Valyuta dropdown tugmasini topish
            const currencyButton = await page.$('button[data-referenceinput-open="false"]');
            if (currencyButton) {
                await currencyButton.click();
                await sleep(500);

                // у.е. tanlash - aria-label="у.е." bo'yicha
                const uyeOption = await page.$('[name="1_UYE"]');
                if (uyeOption) {
                    await uyeOption.click();
                    console.log('✅ Valyuta: у.е.');
                } else {
                    console.log('⚠️ у.е. topilmadi');
                }
            }
        } catch (error) {
            console.log('⚠️ Valyuta tanlanmadi:', error.message);
        }

        await sleep(1000);

        // 6. ЧАСТНОЕ ЛИЦО (MAJBURIY)
        console.log('6️⃣ Частное лицо tanlash...');
        try {
            const privateLitso = await page.waitForSelector('[data-testid="private_business_private_unactive"]', {
                timeout: 5000
            });

            if (privateLitso) {
                await privateLitso.click();
                console.log('✅ Частное лицо tanlandi');
            }
        } catch (error) {
            console.log('⚠️ Частное лицо tanlanmadi:', error.message);
        }

        await sleep(1000);

        // 7. QOSHIMCHA MAYDONLAR (agar mavjud bo'lsa)
        console.log('7️⃣ Qo\'shimcha maydonlar...');

        // Xonalar soni
        try {
            const roomsInput = await page.$('input[name="rooms"]');
            if (roomsInput) {
                await roomsInput.click({ clickCount: 3 });
                await roomsInput.type(xonaSoni, { delay: 50 });
                console.log('✅ Xonalar soni:', xonaSoni);
            }
        } catch (error) {
            console.log('⚠️ Xonalar soni:', error.message);
        }

        await sleep(500);

        // Maydon
        try {
            const areaInput = await page.$('input[name="area"]');
            if (areaInput) {
                await areaInput.click({ clickCount: 3 });
                await areaInput.type(objectData.m2.toString(), { delay: 50 });
                console.log('✅ Maydon:', objectData.m2);
            }
        } catch (error) {
            console.log('⚠️ Maydon:', error.message);
        }

        await sleep(500);

        // Etaj
        try {
            const floorInput = await page.$('input[name="floor"]');
            if (floorInput) {
                await floorInput.click({ clickCount: 3 });
                await floorInput.type(etaj, { delay: 50 });
                console.log('✅ Etaj:', etaj);
            }
        } catch (error) {
            console.log('⚠️ Etaj:', error.message);
        }

        await sleep(500);

        // Etajnost
        try {
            const totalFloorsInput = await page.$('input[name="floors_count"]');
            if (totalFloorsInput) {
                await totalFloorsInput.click({ clickCount: 3 });
                await totalFloorsInput.type(etajnost, { delay: 50 });
                console.log('✅ Etajnost:', etajnost);
            }
        } catch (error) {
            console.log('⚠️ Etajnost:', error.message);
        }

        await sleep(1000);

        // 8. TELEFON
        console.log('8️⃣ Telefon kiritilmoqda...');
        try {
            const phoneInput = await page.$('input[name="phone"]') || await page.$('input[type="tel"]');
            if (phoneInput) {
                await phoneInput.click({ clickCount: 3 });
                await phoneInput.type('998970850604', { delay: 50 });
                console.log('✅ Telefon: +998970850604');
            }
        } catch (error) {
            console.log('⚠️ Telefon:', error.message);
        }

        await sleep(1000);

        // 9. JOYLASHUV (agar mavjud bo'lsa)
        console.log('9️⃣ Joylashuv...');
        try {
            const locationInput = await page.$('input[name="location"]') ||
                await page.$('input[placeholder*="Местоположение"]');

            if (locationInput) {
                await locationInput.click();
                await locationInput.type('Yunusobod', { delay: 100 });
                await sleep(1500);

                // Dropdown'dan Yunusobod tanlash
                const locationOptions = await page.$$('[role="option"]');
                for (const option of locationOptions) {
                    const text = await page.evaluate(el => el.textContent, option);
                    if (text.includes('Юнусабадский')) {
                        await option.click();
                        console.log('✅ Joylashuv: Ташкент, Юнусабадский район');
                        break;
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Joylashuv:', error.message);
        }

        await sleep(1000);

        console.log('✅ Forma to\'ldirildi');

    } catch (error) {
        console.error('❌ Forma to\'ldirishda xato:', error);
        throw error;
    }
}

/**
 * Tavsif yaratish
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, balkon, narx, planirovka, opisaniya } = data;
    const xonaSoni = xet.split("/")[0];
    const etajInfo = `${xet.split("/")[1]}/${xet.split("/")[2]}`;

    return `
${data.sheetType === "Sotuv" ? "Sotiladi" : "Ijaraga beriladi"} - ${kvartil}, ${xonaSoni} хона

• Qavat: ${etajInfo}
• Maydoni: ${m2} m²
• Remont: ${xolati || "-"}
• Uy turi: ${uy_turi || "-"}
${planirovka ? `• Planirovka: ${planirovka}\n` : ''}${balkon ? `• Balkon: ${balkon}\n` : ''}
${opisaniya ? `\n• Qo'shimcha: ${opisaniya}\n` : ''}
Narxi: ${narx} $

Aloqa uchun qo'ng'iroq qiling: +998 97 085 06 04
    `.trim();
}

/**
 * Rasmlarni yuklash
 */
async function uploadImages(page, objectData) {
    console.log('📸 Rasmlar yuklash boshlandi...');

    try {
        // Rasm yuklash input topish
        const photoInput = await page.$('[data-testid="attach-photos-input"]');

        if (!photoInput) {
            console.log('⚠️ Rasm yuklash input topilmadi');
            return;
        }

        // Rasmlar papkasidan fayllarni topish
        // TODO: objectData.rasmlar URL'dan fayllarni olish kerak
        console.log('⚠️ Rasmlar yuklash hozircha to\'liq ishlamaydi');
        console.log('   Folder link:', objectData.rasmlar);

    } catch (error) {
        console.error('⚠️ Rasmlar yuklashda xato:', error.message);
    }
}

/**
 * Elon submit qilish
 */
async function submitAd(page) {
    try {
        console.log('🔍 Submit tugmasini topish...');

        // Submit tugma topish
        const submitButton = await page.$('button[type="submit"]');

        if (!submitButton) {
            throw new Error('Submit tugma topilmadi');
        }

        const beforeUrl = page.url();
        console.log('📍 Joriy URL:', beforeUrl);

        // Submit bosish
        await submitButton.click();
        console.log('✅ Submit tugma bosildi');

        // Navigation kutish
        try {
            await page.waitForNavigation({
                waitUntil: 'networkidle2',
                timeout: 30000
            });
        } catch {
            console.log('⚠️ Navigation timeout');
        }

        await sleep(5000);

        // Yangi URL olish
        const afterUrl = page.url();
        console.log('📍 Yangi URL:', afterUrl);

        // Natijani tekshirish
        if (afterUrl.includes('login') || afterUrl.includes('callback')) {
            const screenshotPath = path.join(__dirname, '../../logs', `submit-failed-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            throw new Error('Elon berilmadi - login talab qilinmoqda');
        }

        if (afterUrl === beforeUrl || afterUrl.includes('/adding/')) {
            console.log('⚠️ URL o\'zgarmadi, formada xato bo\'lishi mumkin');

            // Xato xabarlarini tekshirish
            const errors = await page.$$eval('[class*="error"]', els => els.map(e => e.textContent));
            if (errors.length > 0) {
                console.log('❌ Formada xatolar:', errors);
                throw new Error('Forma xatolari: ' + errors.join(', '));
            }
        }

        return afterUrl;

    } catch (error) {
        console.error('❌ Submit xato:', error);
        throw error;
    }
}

module.exports = {
    postToOLX
};