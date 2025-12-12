// server/src/scripts/olxManualLogin.js
const puppeteer = require('puppeteer');
const { saveCookies } = require('../services/olxCookieManager');
const path = require('path');

/**
 * Manual login script - Lokal kompyuterda ishga tushirish
 */
async function manualLogin() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 OLX.UZ MANUAL LOGIN');
    console.log('='.repeat(60));
    console.log('Bu script LOKAL KOMPYUTERDA ishga tushirilishi kerak!');
    console.log('='.repeat(60) + '\n');

    let browser = null;

    try {
        // ✅ LOKAL MODE - Headless: false
        console.log('🚀 Browser ochilmoqda (GUI mode)...');

        const USER_DATA_DIR = path.join(__dirname, '../../chrome-data');

        browser = await puppeteer.launch({
            headless: false, // ✅ GUI ko'rinadi

            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],

            userDataDir: USER_DATA_DIR,
            defaultViewport: null,

            ignoreHTTPSErrors: true
        });

        console.log('✅ Browser ochildi');
        console.log('\n📋 QADAMLAR:');
        console.log('1. Browser oynasida OLX.uz sahifasi ochiladi');
        console.log('2. Agar login bo\'lmagan bo\'lsangiz - login qiling');
        console.log('3. Login bo\'lgandan so\'ng 30 soniya kuting');
        console.log('4. Cookies avtomatik saqlanadi');
        console.log('5. Browser yopiladi');
        console.log('6. Cookies faylni serverga ko\'chiring\n');

        const page = await browser.newPage();

        console.log('📱 OLX.uz ga o\'tilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('✅ Sahifa yuklandi');
        console.log('\n⏰ 30 soniya kutilmoqda...');
        console.log('   Bu vaqt ichida login qiling (agar kerak bo\'lsa)\n');

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('💾 Cookies saqlanmoqda...');
        await saveCookies(page);

        console.log('\n✅ TAYYOR!');
        console.log('Cookies fayli:', path.join(__dirname, '../../cookies/olx-cookies.json'));

        console.log('\n📤 Serverga yuklash:');
        console.log('scp cookies/olx-cookies.json root@your-server:/path/to/server/cookies/');

        await browser.close();

        process.exit(0);

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser) {
            await browser.close();
        }

        process.exit(1);
    }
}

// Run
manualLogin();