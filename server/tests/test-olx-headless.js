
// ============================================
// 3. test-olx-headless.js - Headless Test (SERVER)
// ============================================
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testHeadless() {
    console.log('🧪 HEADLESS MODE TEST (SERVER)');
    console.log('='.repeat(60));

    const USER_DATA_DIR = path.join(__dirname, 'chrome-data');

    if (!fs.existsSync(USER_DATA_DIR)) {
        console.error('❌ User Data Directory topilmadi!');
        console.error('   Path:', USER_DATA_DIR);
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: true, // ✅ Server uchun
        userDataDir: USER_DATA_DIR,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ]
    });

    console.log('✅ Browser ochildi (headless)');

    const page = await browser.newPage();

    console.log('📱 OLX.uz ga kirilmoqda...');
    await page.goto('https://www.olx.uz', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Login check
    const loginElement = await page.$('[data-testid="myolx-link"]');

    if (loginElement) {
        console.log('✅ Login qilingan (headless mode)!');

        // Screenshot
        const screenshotPath = path.join(__dirname, 'logs', `headless-success-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('📷 Screenshot:', screenshotPath);
    } else {
        console.log('❌ Login yo\'q (headless mode)');

        const screenshotPath = path.join(__dirname, 'logs', `headless-failed-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('📷 Screenshot:', screenshotPath);
    }

    await browser.close();
    console.log('='.repeat(60));
}

testHeadless().catch(console.error);
