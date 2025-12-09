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
 * Rasm fayllarini topish
 */
async function getImageFiles(folderLink) {
    try {
        // folderLink: http://localhost:5000/browse/Yunusobod%20-%201/1%20xona/...
        const uploadsDir = path.join(__dirname, '../../uploads');

        // URL'dan path olish
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
 * OLX.uz ga elon berish
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX automation boshlandi...');
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    let browser = null;

    try {
        // ✅ Browser sozlamalari
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            defaultViewport: null,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();

        // ✅ Bot detection'dan qochish
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });

            window.chrome = {
                runtime: {}
            };

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en']
            });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // ✅ Extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': 'https://www.olx.uz/'
        });

        // Dialog handler
        page.on('dialog', async dialog => {
            console.log('⚠️ Dialog:', dialog.message());
            await dialog.dismiss();
        });

        // Cookie yuklash
        console.log('🍪 Cookie yuklash...');
        await loadCookies(page);

        // ✅ OLX.uz ga kirish
        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await sleep(3000);

        // Login tekshirish
        const isLoggedIn = await checkLogin(page);

        if (!isLoggedIn) {
            console.log('🔐 Login qilish kerak...');
            await loginToOLX(page);
            await saveCookies(page);
            await sleep(3000);
        } else {
            console.log('✅ Allaqachon login qilingan');
        }

        // ✅ Elon berish sahifasiga to'g'ridan-to'g'ri
        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');

        // Step 1: Kategoriya tanlash
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await sleep(3000);

        // Qayta login tekshirish
        const currentUrl = page.url();
        console.log('📍 Joriy URL:', currentUrl);

        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            console.log('⚠️ Login sahifasiga yo\'naltirildi, qayta login qilish...');
            await loginToOLX(page);
            await saveCookies(page);
            await sleep(3000);

            // Qayta elon sahifasiga o'tish
            await page.goto('https://www.olx.uz/adding/', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await sleep(3000);
        }

        // ✅ Ma'lumotlarni to'ldirish
        console.log('✍️ Ma\'lumotlar to\'ldirilmoqda...');
        await fillAdForm(page, objectData);

        // ✅ Rasmlar yuklash
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('📸 Rasmlar yuklanmoqda...');
            await uploadImages(page, objectData);
        }

        // ✅ Elon berish
        console.log('🚀 Elon berilmoqda...');
        const adUrl = await submitAd(page);

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
async function loginToOLX(page) {
    if (!OLX_EMAIL || !OLX_PASSWORD) {
        throw new Error('OLX_EMAIL yoki OLX_PASSWORD environment variable topilmadi');
    }

    try {
        console.log('\n🔐 LOGIN JARAYONI BOSHLANDI');
        console.log('='.repeat(50));

        const currentUrl = page.url();
        console.log('📍 Joriy URL:', currentUrl);

        // ✅ 1. Login sahifasiga o'tish (agar kerak bo'lsa)
        if (!currentUrl.includes('login') && !currentUrl.includes('auth')) {
            console.log('🔍 Login tugmasini topish...');

            try {
                // "Войти" tugmasini topish
                const loginButton = await page.waitForSelector('a[href*="login"], button:has-text("Войти")', {
                    timeout: 5000
                });

                if (loginButton) {
                    await loginButton.click();
                    console.log('✅ Login tugma bosildi');
                    await sleep(3000);
                } else {
                    // To'g'ridan-to'g'ri login sahifasiga o'tish
                    console.log('🔗 Login sahifasiga o\'tilmoqda...');
                    await page.goto('https://www.olx.uz/account/', {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });
                    await sleep(3000);
                }
            } catch (error) {
                console.log('⚠️ Login tugma topilmadi, to\'g\'ridan sahifaga o\'tilmoqda');
                await page.goto('https://www.olx.uz/account/', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await sleep(3000);
            }
        }

        console.log('\n📋 Login formani to\'ldirish...');

        // ✅ 2. Email kiritish (turli variantlar)
        console.log('📧 Email input topilmoqda...');

        let emailInput = null;
        const emailSelectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[id="email"]',
            'input[placeholder*="email" i]',
            'input[placeholder*="почта" i]',
            'input[autocomplete="email"]'
        ];

        for (const selector of emailSelectors) {
            try {
                emailInput = await page.waitForSelector(selector, { timeout: 2000 });
                if (emailInput) {
                    console.log(`✅ Email input topildi: ${selector}`);
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!emailInput) {
            throw new Error('Email input topilmadi');
        }

        // Email ni tozalash va kiritish
        await emailInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await sleep(500);
        await emailInput.type(OLX_EMAIL, { delay: 100 });
        console.log('✅ Email kiritildi:', OLX_EMAIL);

        await sleep(1000);

        // ✅ 3. Password kiritish
        console.log('🔑 Password input topilmoqda...');

        let passwordInput = null;
        const passwordSelectors = [
            'input[type="password"]',
            'input[name="password"]',
            'input[id="password"]',
            'input[placeholder*="пароль" i]',
            'input[autocomplete="current-password"]'
        ];

        for (const selector of passwordSelectors) {
            try {
                passwordInput = await page.waitForSelector(selector, { timeout: 2000 });
                if (passwordInput) {
                    console.log(`✅ Password input topildi: ${selector}`);
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!passwordInput) {
            throw new Error('Password input topilmadi');
        }

        // Password ni tozalash va kiritish
        await passwordInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await sleep(500);
        await passwordInput.type(OLX_PASSWORD, { delay: 100 });
        console.log('✅ Password kiritildi');

        await sleep(1000);

        // ✅ 4. Submit button bosish
        console.log('🚀 Submit tugmasi topilmoqda...');

        let submitButton = null;
        const submitSelectors = [
            'button[type="submit"]',
            'button:has-text("Войти")',
            'button:has-text("Login")',
            'input[type="submit"]',
            'button[class*="submit"]'
        ];

        for (const selector of submitSelectors) {
            try {
                submitButton = await page.waitForSelector(selector, { timeout: 2000 });
                if (submitButton) {
                    console.log(`✅ Submit tugma topildi: ${selector}`);
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!submitButton) {
            // Enter tugmasini bosish (alternative)
            console.log('⚠️ Submit tugma topilmadi, Enter bosilmoqda...');
            await page.keyboard.press('Enter');
        } else {
            await submitButton.click();
            console.log('✅ Submit tugma bosildi');
        }

        // ✅ 5. Navigation kutish (flexible)
        console.log('⏳ Sahifa yuklanishini kutish...');

        try {
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                page.waitForSelector('[data-testid="myolx-link"]', { timeout: 15000 }),
                sleep(15000) // Fallback timeout
            ]);
            console.log('✅ Sahifa yuklandi');
        } catch {
            console.log('⚠️ Navigation timeout, davom etmoqda...');
        }

        await sleep(3000);

        // ✅ 6. Login muvaffaqiyatini tekshirish
        console.log('\n🔍 Login natijasini tekshirish...');
        const finalUrl = page.url();
        console.log('📍 Final URL:', finalUrl);

        // Login xato sahifalarini tekshirish
        const errorSelectors = [
            '[class*="error"]',
            '[class*="alert"]',
            '[class*="warning"]',
            'div:has-text("Неверный")',
            'div:has-text("Ошибка")',
            'div:has-text("Error")'
        ];

        let hasError = false;
        for (const selector of errorSelectors) {
            try {
                const errorElement = await page.$(selector);
                if (errorElement) {
                    const errorText = await page.evaluate(el => el.textContent, errorElement);
                    if (errorText && errorText.length < 200) {
                        console.error('❌ Login xatosi:', errorText);
                        hasError = true;
                        break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (hasError) {
            throw new Error('Login formada xato bor');
        }

        // Muvaffaqiyatli login tekshirish
        const isLoggedIn = await checkLogin(page);

        if (!isLoggedIn) {
            // Screenshot olish
            const screenshotPath = path.join(__dirname, '../../logs', `login-failed-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log('📷 Screenshot saqlandi:', screenshotPath);

            throw new Error('Login muvaffaqiyatsiz - login indikatorlari topilmadi');
        }

        console.log('='.repeat(50));
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI');
        console.log('='.repeat(50) + '\n');

        return true;

    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌❌❌ LOGIN XATO:', error.message);
        console.error('='.repeat(50));

        // Batafsil debugging info
        try {
            const currentUrl = page.url();
            const title = await page.title();
            console.error('📍 Joriy URL:', currentUrl);
            console.error('📄 Sahifa title:', title);

            // Screenshot
            const screenshotPath = path.join(__dirname, '../../logs', `login-error-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.error('📷 Screenshot:', screenshotPath);
        } catch (debugError) {
            console.error('⚠️ Debug info olishda xato:', debugError.message);
        }

        throw error;
    }
}

/**
 * ✅ Login tekshirish (yangilangan)
 */
async function checkLogin(page) {
    try {
        console.log('🔍 Login statusni tekshirish...');

        const currentUrl = page.url();
        console.log('📍 URL:', currentUrl);

        // Login/callback sahifalarini tekshirish
        if (currentUrl.includes('login') || currentUrl.includes('callback') || currentUrl.includes('auth')) {
            console.log('❌ Hali login sahifasida');
            return false;
        }

        // Success indikatorlarini tekshirish
        const successSelectors = [
            '[data-testid="myolx-link"]',
            'a[href*="/myaccount"]',
            'a[href*="myolx"]',
            'button:has-text("Мои объявления")',
            '[class*="user-menu"]',
            '[class*="account-menu"]'
        ];

        for (const selector of successSelectors) {
            try {
                const element = await page.waitForSelector(selector, { timeout: 3000 });
                if (element) {
                    console.log(`✅ Login tekshirildi: ${selector}`);
                    return true;
                }
            } catch {
                continue;
            }
        }

        console.log('❌ Login indikatorlari topilmadi');
        return false;

    } catch (error) {
        console.error('Login tekshirishda xato:', error.message);
        return false;
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

        // 1. Sarlavha
        console.log('1️⃣ Sarlavha...');
        const title = `${objectData.kvartil}, ${xonaSoni} xona, ${objectData.m2}m², ${etaj}/${etajnost}`;

        const titleInput = await page.waitForSelector('input[name="title"]', { timeout: 5000 });
        await titleInput.click({ clickCount: 3 });
        await titleInput.type(title, { delay: 50 });
        console.log('✅ Sarlavha:', title);

        await sleep(500);

        // 2. Tavsif
        console.log('2️⃣ Tavsif...');
        const description = createDescription(objectData);

        const descriptionArea = await page.waitForSelector('textarea[name="description"]', { timeout: 5000 });
        await descriptionArea.click();
        await descriptionArea.type(description, { delay: 20 });
        console.log('✅ Tavsif yozildi');

        await sleep(500);

        // 3. Narx
        console.log('3️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');

        const priceInput = await page.waitForSelector('input[name="price"]', { timeout: 5000 });
        await priceInput.click({ clickCount: 3 });
        await priceInput.type(price, { delay: 50 });
        console.log('✅ Narx:', price);

        await sleep(500);

        // 4. Valyuta - UYE
        console.log('4️⃣ Valyuta...');
        try {
            await page.select('select[name="currency"]', 'UYE');
            console.log('✅ Valyuta: UYE');
        } catch (e) {
            console.log('⚠️ Valyuta tanlanmadi');
        }

        await sleep(500);

        // 5. Xonalar soni
        try {
            await page.select('select[name="rooms"]', xonaSoni);
            console.log('✅ Xonalar:', xonaSoni);
        } catch (e) {
            console.log('⚠️ Xonalar tanlanmadi');
        }

        // 6. Maydon
        try {
            const areaInput = await page.$('input[name="area"]');
            if (areaInput) {
                await areaInput.click({ clickCount: 3 });
                await areaInput.type(objectData.m2.toString(), { delay: 50 });
                console.log('✅ Maydon:', objectData.m2);
            }
        } catch (e) {
            console.log('⚠️ Maydon:', e.message);
        }

        // 7. Etaj
        try {
            const floorInput = await page.$('input[name="floor"]');
            if (floorInput) {
                await floorInput.click({ clickCount: 3 });
                await floorInput.type(etaj, { delay: 50 });
                console.log('✅ Etaj:', etaj);
            }
        } catch (e) {
            console.log('⚠️ Etaj:', e.message);
        }

        // 8. Etajnost
        try {
            const floorsInput = await page.$('input[name="floors_count"]');
            if (floorsInput) {
                await floorsInput.click({ clickCount: 3 });
                await floorsInput.type(etajnost, { delay: 50 });
                console.log('✅ Etajnost:', etajnost);
            }
        } catch (e) {
            console.log('⚠️ Etajnost:', e.message);
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
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya } = data;
    const xonaSoni = xet.split("/")[0];
    const etajInfo = `${xet.split("/")[1]}/${xet.split("/")[2]}`;

    return `
Sotiladi - ${kvartil}, ${xonaSoni} xona

• Qavat: ${etajInfo}
• Maydoni: ${m2} m²
• Remont: ${xolati || "-"}
• Uy turi: ${uy_turi || "-"}

${opisaniya ? `\nQo'shimcha: ${opisaniya}\n` : ''}
Narxi: ${narx} $

Tel: +998 97 085 06 04
    `.trim();
}

/**
 * Rasmlarni yuklash
 */
async function uploadImages(page, objectData) {
    try {
        console.log('📸 Rasmlar yuklash boshlandi...');

        // Rasm input topish
        const photoInput = await page.$('input[type="file"][accept*="image"]');

        if (!photoInput) {
            console.log('⚠️ Rasm input topilmadi');
            return;
        }

        // Rasm fayllarini topish
        const imageFiles = await getImageFiles(objectData.rasmlar);

        if (imageFiles.length === 0) {
            console.log('⚠️ Rasmlar topilmadi');
            return;
        }

        // Maksimal 8 ta rasm yuklash (OLX limiti)
        const filesToUpload = imageFiles.slice(0, 8);

        console.log(`📤 ${filesToUpload.length} ta rasm yuklanmoqda...`);

        // Fayllarni yuklash
        await photoInput.uploadFile(...filesToUpload);

        // Yuklash tugashini kutish
        await sleep(3000);

        console.log('✅ Rasmlar yuklandi');

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
        await sleep(10000); // 10 soniya kutish

        // Yangi URL olish
        const afterUrl = page.url();
        console.log('📍 Yangi URL:', afterUrl);

        // Natijani tekshirish
        if (afterUrl.includes('login') || afterUrl.includes('callback')) {
            throw new Error('Elon berilmadi - login talab qilinmoqda');
        }

        if (afterUrl === beforeUrl || afterUrl.includes('/posting/')) {
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