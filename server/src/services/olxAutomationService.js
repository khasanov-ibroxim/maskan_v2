// server/src/services/olxAutomationService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// OLX login ma'lumotlari (environment variable'dan)
const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;

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
            headless: false, // Debug uchun false, production'da true
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();

        // User agent o'rnatish
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // OLX.uz ga kirish
        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Login tekshirish va login qilish
        const isLoggedIn = await checkLogin(page);

        if (!isLoggedIn) {
            console.log('🔐 Login qilish boshlandi...');
            await loginToOLX(page);
        } else {
            console.log('✅ Allaqachon login qilingan');
        }

        // Elon berish sahifasiga o'tish
        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');
        await page.goto('https://www.olx.uz/d/uk/obyavlenie/create/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Kategoriya tanlash (Ko'chmas mulk > Xonadonlar)
        console.log('📂 Kategoriya tanlanmoqda...');
        await selectCategory(page);

        // Ma'lumotlarni to'ldirish
        console.log('✍️ Ma\'lumotlar to\'ldirilmoqda...');
        await fillAdForm(page, objectData);

        // Rasmlar yuklash
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('📸 Rasmlar yuklanmoqda...');
            await uploadImages(page, objectData.rasmlar);
        }

        // Elon berish
        console.log('🚀 Elon berilmoqda...');
        await submitAd(page);

        // Elon URL olish
        const adUrl = await page.url();
        console.log('✅ Elon muvaffaqiyatli berildi:', adUrl);

        await browser.close();

        return {
            success: true,
            adUrl: adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ OLX automation xato:', error);

        // Screenshot olish (debug uchun)
        if (browser) {
            try {
                const screenshotPath = path.join(__dirname, '../../logs', `olx-error-${Date.now()}.png`);
                await browser.pages().then(pages => {
                    if (pages[0]) pages[0].screenshot({ path: screenshotPath });
                });
                console.log('📷 Screenshot saqlandi:', screenshotPath);
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
        await page.waitForSelector('data-testid="myolx-link"', { timeout: 3000 });
        return true;
    } catch {
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

    // Login tugmasini bosish
    await page.waitForSelector('data-testid="myolx-link"', { timeout: 10000 });
    await page.click('data-testid="myolx-link"');

    // Login formani kutish
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Email kiriting
    await page.type('input[type="email"]', OLX_EMAIL);
    await page.waitForTimeout(1000);

    // Password kiriting
    await page.type('input[type="password"]', OLX_PASSWORD);
    await page.waitForTimeout(1000);

    // Submit
    await page.click('button[type="submit"]');

    // Login natijasini kutish
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    console.log('✅ Login muvaffaqiyatli');
}

/**
 * Kategoriya tanlash
 */
async function selectCategory(page) {
    // Ko'chmas mulk kategoriyasini tanlash
    await page.waitForSelector('[data-testid="category-real-estate"]', { timeout: 10000 });
    await page.click('[data-testid="category-real-estate"]');
    await page.waitForTimeout(1000);

    // Xonadonlar subkategoriyasini tanlash
    await page.click('[data-testid="subcategory-apartments"]');
    await page.waitForTimeout(1000);
}

/**
 * Elon formasini to'ldirish
 */
async function fillAdForm(page, objectData) {
    // Sarlavha
    const title = `${objectData.sheetType === 'Sotuv' ? 'Sotiladi' : 'Ijaraga beriladi'} - ${objectData.kvartil}, ${objectData.xet.split('/')[0]} xona`;
    await page.waitForSelector('input[name="title"]');
    await page.type('input[name="title"]', title);

    // Tavsif
    const description = createDescription(objectData);
    await page.type('textarea[name="description"]', description);

    // Narx
    const price = objectData.narx.replace(/\s/g, '');
    await page.type('input[name="price"]', price);

    // Valyuta (USD)
    await page.select('select[name="currency"]', 'USD');

    // Xona soni
    const roomCount = objectData.xet.split('/')[0];
    await page.select('select[name="rooms"]', roomCount);

    // Maydon (m²)
    await page.type('input[name="area"]', objectData.m2);

    // Manzil/Shahar
    await page.type('input[name="location"]', 'Toshkent, ' + objectData.kvartil);

    // Telefon
    const phone = objectData.tell.replace(/\D/g, '');
    await page.type('input[name="phone"]', phone);

    await page.waitForTimeout(1000);
}

/**
 * Tavsif yaratish
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, balkon, narx, planirovka, opisaniya } = data;
    const xonaSoni = xet.split("/")[0];
    const etajInfo = `${xet.split("/")[1]}/${xet.split("/")[2]}`;

    return `
${data.sheetType === "Sotuv" ? "Sotiladi" : "Ijaraga beriladi"} — ${kvartil}, ${xonaSoni} хона

🏢 Qavat: ${etajInfo}
📐 Maydoni: ${m2} м²
🔧 Remont: ${xolati || "—"}
🏗 Uy turi: ${uy_turi || "—"}
${planirovka ? `📋 Planirovka: ${planirovka}\n` : ''}${balkon ? `🏗 Balkon: ${balkon}\n` : ''}
${opisaniya ? `\n📝 Qo'shimcha: ${opisaniya}\n` : ''}
💰 Narxi: ${narx} $

Aloqa uchun qo'ng'iroq qiling!
    `.trim();
}

/**
 * Rasmlarni yuklash
 */
async function uploadImages(page, folderLink) {
    // Agar folder link browse URL bo'lsa, rasmlarni yuklab olish kerak
    // Yoki localdan to'g'ridan yuklash

    console.log('📸 Rasmlar yuklash hozircha qo\'llab-quvvatlanmaydi');
    // TODO: Implement image upload from folder
}

/**
 * Elon submit qilish
 */
async function submitAd(page) {
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await page.click('button[type="submit"]');

    // Submit natijasini kutish
    await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 20000
    });
}

/**
 * Browser'ni yopish
 */
async function closeBrowser(browser) {
    if (browser) {
        await browser.close();
    }
}

module.exports = {
    postToOLX
};