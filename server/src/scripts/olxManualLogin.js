// server/src/scripts/olxManualLogin.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const COOKIE_FILE = path.join(__dirname, '../../cookies/olx-cookies.json');

/**
 * Manual login script - Lokal kompyuterda ishga tushirish uchun
 */
async function manualLogin() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 OLX.UZ MANUAL LOGIN (COOKIE SAVER)');
    console.log('='.repeat(60));
    console.log('Bu script LOKAL KOMPYUTERDA ishga tushirilishi kerak!');
    console.log('='.repeat(60) + '\n');

    let browser = null;

    try {
        console.log('🚀 Browser ochilmoqda (GUI mode)...');

        browser = await puppeteer.launch({
            headless: false, // ✅ GUI ko'rinadi

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
            ],

            defaultViewport: null,
            ignoreHTTPSErrors: true,
            ignoreDefaultArgs: ['--enable-automation'],
        });

        console.log('✅ Browser ochildi');
        console.log('\n📋 QADAMLAR:');
        console.log('1. Browser oynasida OLX.uz sahifasi ochiladi');
        console.log('2. Agar login bo\'lmagan bo\'lsangiz - QOLDA login qiling!');
        console.log('3. Login bo\'lgandan so\'ng 60 soniya kuting');
        console.log('4. Cookies avtomatik saqlanadi');
        console.log('5. Browser yopiladi');
        console.log('6. Cookies faylni serverga ko\'chiring\n');

        const page = await browser.newPage();

        // Stealth
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
        });

        console.log('📱 OLX.uz ga o\'tilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Sahifa yuklandi');
        console.log('\n⏰ 60 soniya kutilmoqda...');
        console.log('   🔐 Bu vaqt ichida LOGIN qiling!\n');
        console.log('   Qadamlar:');
        console.log('   1. Brauzerda login tugmasini bosing');
        console.log('   2. Email va parolingizni kiriting');
        console.log('   3. Login tugmasini bosing');
        console.log('   4. Login bo\'lguncha kuting\n');

        // Countdown timer
        for (let i = 60; i > 0; i -= 5) {
            console.log(`   ⏳ ${i} soniya qoldi...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log('\n💾 Cookies saqlanmoqda...');

        // Ensure cookies directory
        const cookieDir = path.dirname(COOKIE_FILE);
        if (!fs.existsSync(cookieDir)) {
            fs.mkdirSync(cookieDir, { recursive: true });
        }

        // Save cookies
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));

        console.log('✅ COOKIES SAQLANDI!');
        console.log('   Fayl:', COOKIE_FILE);
        console.log('   Cookies soni:', cookies.length);

        // Check if logged in
        console.log('\n🔍 Login holatini tekshirish...');
        await page.goto('https://www.olx.uz/myaccount/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const currentUrl = page.url();
        console.log('   Current URL:', currentUrl);

        if (currentUrl.includes('/myaccount/') || currentUrl.includes('/account/')) {
            console.log('✅ LOGIN MUVAFFAQIYATLI!');
        } else if (currentUrl.includes('login.olx.uz')) {
            console.log('⚠️ Login bo\'lmagan - qaytadan urinib ko\'ring');
        } else {
            console.log('⚠️ Login holati noaniq - cookies saqlanganligini tekshiring');
        }

        console.log('\n📤 SERVERGA YUKLASH:');
        console.log('Local dan server ga ko\'chirish uchun:');
        console.log('\n# Windows PowerShell:');
        console.log(`scp ${COOKIE_FILE.replace(/\\/g, '/')} root@your-server:/path/to/server/cookies/`);
        console.log('\n# Linux/Mac:');
        console.log(`scp ${COOKIE_FILE} root@your-server:/path/to/server/cookies/`);
        console.log('\n# Yoki WinSCP ishlatib manual ko\'chiring');

        console.log('\n✅ TAYYOR!');
        console.log('Brauzer 5 soniyadan keyin yopiladi...');

        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();

        process.exit(0);

    } catch (error) {
        console.error('\n❌ XATO:', error.message);

        if (browser) {
            await browser.close();
        }

        process.exit(1);
    }
}

// Run
if (require.main === module) {
    manualLogin();
}

module.exports = { manualLogin };