// ============================================
// 1. test-olx-login.js - Login Test (LOCAL)
// ============================================
const puppeteer = require('puppeteer');
const path = require('path');

async function testLogin() {
    console.log('🧪 OLX LOGIN TEST (LOCAL)');
    console.log('='.repeat(60));

    const USER_DATA_DIR = path.join(__dirname, '.chrome-data');

    const browser = await puppeteer.launch({
        headless: false, // ✅ Local da ko'rish uchun
        userDataDir: USER_DATA_DIR,
        args: ['--no-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();

    console.log('📱 OLX.uz ga kirilmoqda...');
    await page.goto('https://www.olx.uz', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    const currentUrl = page.url();
    console.log('📍 URL:', currentUrl);

    // Login tekshirish
    const loginElement = await page.$('[data-testid="myolx-link"]');

    if (loginElement) {
        console.log('✅ Login qilingan!');
        console.log('\n📋 User Data Directory saqlandi:');
        console.log('   Path:', USER_DATA_DIR);
        console.log('\n📤 Serverga ko\'chirish uchun:');
        console.log(`   scp -r ${USER_DATA_DIR}/* root@your-ip:/path/to/server/.chrome-data/`);
    } else {
        console.log('⚠️ Login yo\'q. Iltimos login qiling...');
        console.log('⏳ 2 daqiqa kutilmoqda...');
        await new Promise(r => setTimeout(r, 120000));

        // Qayta tekshirish
        const loginCheck = await page.$('[data-testid="myolx-link"]');
        if (loginCheck) {
            console.log('✅ Login muvaffaqiyatli!');
        } else {
            console.log('❌ Login amalga oshmadi');
        }
    }

    await browser.close();
    console.log('='.repeat(60));
}

testLogin().catch(console.error);