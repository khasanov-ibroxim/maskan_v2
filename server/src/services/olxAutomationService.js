// server/src/services/olxAutomationService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// OLX login ma'lumotlari
const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;

// User data directory - session saqlash uchun
const USER_DATA_DIR = path.join(__dirname, '../../.chrome-data');
const PropertyObject = require('../models/Object.pg');

// Helper function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ✅ XFCE4 DISPLAY SOZLASH
 */
async function setupXFCE4Display() {
    try {
        console.log('🖥️  XFCE4 Display sozlanmoqda...');

        // DISPLAY o'zgaruvchisini tekshirish
        const currentDisplay = process.env.DISPLAY;
        console.log('   📊 Current DISPLAY:', currentDisplay || 'Not Set');

        // Agar DISPLAY yo'q bo'lsa - :0 qo'yish
        if (!currentDisplay) {
            process.env.DISPLAY = ':0';
            console.log('   ✅ DISPLAY o\'rnatildi: :0');
        }

        // X Server ishlayotganini tekshirish
        try {
            const { stdout } = await execPromise('xdpyinfo 2>/dev/null | grep "name of display"');
            console.log('   ✅ X Server ishlayapti:', stdout.trim());
        } catch (e) {
            console.log('   ⚠️ X Server tekshirilmadi:', e.message);
        }

        // XAUTHORITY tekshirish
        if (!process.env.XAUTHORITY) {
            const xauthPath = path.join(process.env.HOME || '/root', '.Xauthority');
            if (fs.existsSync(xauthPath)) {
                process.env.XAUTHORITY = xauthPath;
                console.log('   ✅ XAUTHORITY:', xauthPath);
            }
        }

        return true;

    } catch (error) {
        console.error('   ❌ Display setup xato:', error.message);
        return false;
    }
}

/**
 * ✅ CHROME/CHROMIUM TOPISH (XFCE4 uchun)
 */
async function findChromePath() {
    const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/usr/bin/chrome',
        'google-chrome',
        'chromium',
        'chromium-browser'
    ];

    console.log('🔍 Chrome/Chromium qidirilmoqda...');

    for (const chromePath of possiblePaths) {
        try {
            if (chromePath.startsWith('/')) {
                // To'liq path - fayl mavjudligini tekshirish
                if (fs.existsSync(chromePath)) {
                    console.log(`   ✅ Topildi: ${chromePath}`);
                    return chromePath;
                }
            } else {
                // Binary nom - which orqali topish
                const { stdout } = await execPromise(`which ${chromePath} 2>/dev/null`);
                if (stdout.trim()) {
                    console.log(`   ✅ Topildi: ${stdout.trim()}`);
                    return stdout.trim();
                }
            }
        } catch (e) {
            // Topilmadi - keyingisiga o'tish
            continue;
        }
    }

    console.log('   ⚠️ Chrome/Chromium topilmadi, default qo\'llaniladi');
    return null; // Puppeteer o'zining default Chrome ni ishlatadi
}

/**
 * ✅ BROWSER SOZLAMALARI (XFCE4 + Contabo VPS)
 */
async function launchBrowser() {
    console.log('\n🚀 BROWSER ISHGA TUSHIRILMOQDA (XFCE4 MODE)');
    console.log('='.repeat(60));

    // ✅ 1. XFCE4 display sozlash
    await setupXFCE4Display();

    // ✅ 2. Chrome path topish
    const chromePath = await findChromePath();

    // ✅ 3. User data directory
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
        console.log('📁 User data directory yaratildi:', USER_DATA_DIR);
    }

    // ✅ 4. XFCE4 uchun maxsus args
    const launchOptions = {
        // ❗ XFCE4 da HEADLESS FALSE bo'lishi SHART
        headless: false,

        // Chrome path (agar topilgan bo'lsa)
        ...(chromePath && { executablePath: chromePath }),

        userDataDir: USER_DATA_DIR,

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-popup-blocking',

            // ✅ XFCE4 MAXSUS SOZLAMALAR
            '--disable-gpu', // GPU muammolarini oldini olish
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',

            // ✅ OYNA O'LCHAMLARI
            '--window-size=1400,900',
            '--window-position=50,50',

            // ✅ DEBUG
            '--remote-debugging-port=9222',
            '--enable-logging',
            '--v=1'
        ],

        defaultViewport: null,
        ignoreHTTPSErrors: true,

        // ✅ Timeout oshirish
        timeout: 90000,

        // ✅ Dump qilish
        dumpio: false // true qilsangiz barcha Chrome loglarini ko'rasiz
    };

    console.log('📋 Browser sozlamalari:');
    console.log('   DISPLAY:', process.env.DISPLAY);
    console.log('   Chrome Path:', chromePath || 'default');
    console.log('   User Data Dir:', USER_DATA_DIR);
    console.log('   Headless:', launchOptions.headless);
    console.log('   Debug Port: 9222');
    console.log('='.repeat(60) + '\n');

    console.log('⏳ Browser ochilmoqda...');

    try {
        const browser = await puppeteer.launch(launchOptions);
        console.log('✅ Browser muvaffaqiyatli ochildi!\n');

        // Browser ma'lumotlari
        const version = await browser.version();
        console.log('📊 Browser versiya:', version);

        return browser;

    } catch (launchError) {
        console.error('❌ Browser ochishda XATO:', launchError.message);
        console.error('\n🔧 TUZATISH USULLARI:\n');
        console.error('1. Chrome/Chromium o\'rnatilganini tekshiring:');
        console.error('   sudo apt update');
        console.error('   sudo apt install -y chromium-browser');
        console.error('');
        console.error('2. XFCE4 ishlayotganini tekshiring:');
        console.error('   echo $DISPLAY');
        console.error('   xdpyinfo');
        console.error('');
        console.error('3. RDP sessiyasini tekshiring:');
        console.error('   who');
        console.error('   echo $SESSIONNAME');
        console.error('');

        throw launchError;
    }
}

/**
 * ✅ SERVER MA'LUMOTLARI
 */
async function logServerInfo() {
    console.log('\n🖥️  SERVER MA\'LUMOTLARI (XFCE4)');
    console.log('='.repeat(60));

    try {
        // OS
        const { stdout: osInfo } = await execPromise('cat /etc/os-release | grep PRETTY_NAME');
        console.log('OS:', osInfo.trim().split('=')[1]?.replace(/"/g, ''));
    } catch (e) {
        console.log('OS:', 'Unknown');
    }

    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    console.log('Node Version:', process.version);
    console.log('User:', process.env.USER || process.env.USERNAME);
    console.log('Home:', process.env.HOME);
    console.log('Working Dir:', process.cwd());

    // Display
    console.log('\n📺 DISPLAY MA\'LUMOTLARI:');
    console.log('DISPLAY:', process.env.DISPLAY || 'Not Set ⚠️');
    console.log('XAUTHORITY:', process.env.XAUTHORITY || 'Not Set');
    console.log('SESSION:', process.env.XDG_SESSION_TYPE || 'Unknown');
    console.log('DESKTOP:', process.env.XDG_CURRENT_DESKTOP || 'Unknown');

    // Desktop Environment
    try {
        const { stdout: wmInfo } = await execPromise('wmctrl -m 2>/dev/null || echo "wmctrl not installed"');
        if (!wmInfo.includes('not installed')) {
            console.log('\n🪟 WINDOW MANAGER:');
            console.log(wmInfo.trim().split('\n').slice(0, 3).join('\n'));
        }
    } catch (e) {
        // ignore
    }

    // Chrome/Chromium
    try {
        const { stdout: chromeVersion } = await execPromise('chromium --version 2>/dev/null || google-chrome --version 2>/dev/null || echo "Not installed"');
        console.log('\n🌐 CHROME/CHROMIUM:');
        console.log(chromeVersion.trim());
    } catch (e) {
        console.log('\n🌐 CHROME/CHROMIUM: Not found ⚠️');
    }

    // Processes
    try {
        const { stdout: processes } = await execPromise('ps aux | grep -E "Xvfb|Xorg|xfce|chrome" | grep -v grep');
        if (processes.trim()) {
            console.log('\n🔄 RUNNING PROCESSES:');
            console.log(processes.trim().split('\n').slice(0, 5).join('\n'));
        }
    } catch (e) {
        // ignore
    }

    console.log('='.repeat(60) + '\n');
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
 * ✅ Alert yopish (eski elon)
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
                console.log(`   ℹ️ ${allButtons.length} ta tugma topildi`);

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
 * ✅ Formani scroll qilish
 */
async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await sleep(500);
}

/**
 * ✅ LOGIN TEKSHIRISH (XFCE4)
 */
async function checkAndWaitForLogin(page) {
    console.log('\n🔐 LOGIN TEKSHIRILMOQDA (XFCE4)...');
    console.log('='.repeat(60));

    const isAlreadyLoggedIn = await checkLoginStatus(page);

    if (isAlreadyLoggedIn) {
        console.log('✅ Allaqachon login qilingan (session mavjud)');
        console.log('='.repeat(60));
        return true;
    }

    console.log('⚠️  Session topilmadi, login kerak');
    console.log('');
    console.log('━'.repeat(60));
    console.log('  🖥️  XFCE4 DESKTOP DA CHROME OYNASI OCHILDI');
    console.log('  👆 ILTIMOS LOGIN QILING');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📋 QADAMLAR (XFCE4 Desktop):');
    console.log('   1. Chrome oynasi avtomatik ochildi');
    console.log('   2. Agar ko\'rinmasa - Alt+Tab ni bosing');
    console.log('   3. OLX.uz sahifasida LOGIN tugmasini bosing');
    console.log('   4. Email/Parol kiriting yoki Google/Facebook');
    console.log('   5. Captcha yechish (agar kerak bo\'lsa)');
    console.log('   6. Login muvaffaqiyatli bo\'lgach avtomatik davom etadi');
    console.log('');
    console.log('⏰ Maksimal 5 daqiqa kutiladi...');
    console.log('');
    console.log('💡 AGAR BROWSER KO\'RINMASA:');
    console.log('   • XFCE Panel da Chrome iconini qidiring');
    console.log('   • Alt+Tab bilan oynalar orasida o\'tish');
    console.log('   • Chrome Debug: http://localhost:9222');
    console.log('   • Screenshot: /logs/ papkasida');
    console.log('='.repeat(60));
    console.log('');

    // 5 DAQIQA kutish
    const loginSuccess = await waitForManualLogin(page, 300);

    if (loginSuccess) {
        console.log('');
        console.log('='.repeat(60));
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI!');
        console.log('💾 Session saqlandi');
        console.log('='.repeat(60));
        console.log('');
        return true;
    }

    return false;
}

/**
 * ✅ Manual login kutish
 */
async function waitForManualLogin(page, timeoutSeconds = 300) {
    console.log(`⏳ Kutilmoqda (${timeoutSeconds}s = ${Math.floor(timeoutSeconds/60)} daqiqa)...\n`);

    for (let i = timeoutSeconds; i > 0; i--) {
        // Progress bar
        const progress = Math.floor((timeoutSeconds - i) / timeoutSeconds * 50);
        const bar = '█'.repeat(progress) + '░'.repeat(50 - progress);
        const minutes = Math.floor(i / 60);
        const seconds = i % 60;
        process.stdout.write(`\r[${bar}] ${minutes}:${seconds.toString().padStart(2, '0')} `);

        await sleep(1000);

        // Har 3 soniyada tekshirish
        if (i % 3 === 0) {
            const isLoggedIn = await checkLoginStatus(page);
            if (isLoggedIn) {
                console.log('\n✅ Login aniqlandi!\n');
                return true;
            }
        }

        // Har 30 soniyada screenshot
        if (i % 30 === 0 && i > 0) {
            try {
                const logsDir = path.join(__dirname, '../../logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                const screenshotPath = path.join(logsDir, `login-wait-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`\n📷 Screenshot: ${screenshotPath}`);
            } catch (e) {
                // ignore
            }
        }
    }

    console.log('\n❌ Timeout: 5 daqiqada login amalga oshmadi\n');
    return false;
}

/**
 * ✅ Login status tekshirish
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
            'a[href*="myolx"]',
            '[class*="user-menu"]',
            '[class*="account-menu"]',
            'button:has-text("Мои объявления")',
            'a:has-text("Мои объявления")'
        ];

        for (const selector of successSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    return true;
                }
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
 * ✅ Tavsif yaratish
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
    description += `+ Юридическая чистота\n+ Помощь с оформлением\n\nКОНТАКТЫ:\nЗвоните!\nWhatsApp/Telegram доступны\n\n`;
    if (opisaniya?.trim()) description += `ДОПОЛНИТЕЛЬНО:\n${opisaniya}\n\n`;

    return description.replace(/([•\-+/@#$!%])\1{2,}/g, '$1$1');
}

/**
 * ✅ TO'LIQ ELON FORMASINI TO'LDIRISH
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 ELON FORMASINI TO\'LDIRISH');
        console.log('='.repeat(60));

        const debugDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        console.log('⏳ Sahifa render bo\'lishini kutish...');
        await sleep(5000);

        const pageTitle = await page.title();
        const currentUrl = page.url();
        console.log('📄 Page title:', pageTitle);
        console.log('📍 Current URL:', currentUrl);

        const screenshotBefore = path.join(debugDir, `before-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotBefore, fullPage: true });
        console.log('📷 Screenshot saved:', screenshotBefore);

        await page.waitForSelector('form', { timeout: 30000 }).catch(() => {
            console.log('⚠️ Form tag topilmadi, davom ettirilmoqda...');
        });
        await sleep(3000);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1️⃣ TITLE
        console.log('\n1️⃣ Sarlavha (Title)...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        console.log(`   "${title}"`);

        const titleSelectors = [
            '[data-testid="posting-title"]',
            'input[name="title"]',
            'input[placeholder*="Название"]',
            'input[placeholder*="название"]',
            'input[data-cy*="title"]'
        ];

        let titleInput = null;
        for (const selector of titleSelectors) {
            try {
                titleInput = await page.waitForSelector(selector, { timeout: 5000, visible: true });
                if (titleInput) {
                    console.log(`   ✅ Topildi: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (titleInput) {
            await scrollToElement(page, titleInput);
            await sleep(1000);
            await titleInput.click({ clickCount: 3 });
            await sleep(500);
            await titleInput.type(title, { delay: 80 });
            console.log('   ✅ Yozildi:', title);
        }
        await sleep(1000);

        // 2️⃣ RASMLAR
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('\n2️⃣ Rasmlar...');
            try {
                const photoInput = await page.waitForSelector('[data-testid="attach-photos-input"]', { timeout: 10000 });
                if (photoInput) {
                    const imageFiles = await getImageFiles(objectData.rasmlar);
                    if (imageFiles.length > 0) {
                        const filesToUpload = imageFiles.slice(0, 8);
                        console.log(`   📤 ${filesToUpload.length} ta rasm yuklanmoqda...`);
                        await photoInput.uploadFile(...filesToUpload);
                        await sleep(5000);
                        console.log('   ✅ Rasmlar yuklandi');
                    }
                }
            } catch (e) {
                console.log('   ⚠️ Rasm yuklashda xato:', e.message);
            }
        }
        await sleep(500);

        // 3️⃣ TAVSIF
        console.log('\n3️⃣ Tavsif (Description)...');
        const description = createDescription(objectData);
        console.log('   Preview:', description.substring(0, 100) + '...');

        try {
            const descriptionArea = await page.waitForSelector('[data-testid="posting-description-text-area"]', {
                timeout: 15000, visible: true
            });
            await scrollToElement(page, descriptionArea);
            await descriptionArea.click();
            await sleep(500);
            await descriptionArea.type(description, { delay: 30 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Tavsif xato:', e.message);
        }
        await sleep(1000);

        // 4️⃣ NARX
        console.log('\n4️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');
        try {
            const priceInput = await page.waitForSelector('[data-testid="price-input"]', {
                timeout: 15000, visible: true
            });
            await scrollToElement(page, priceInput);
            await priceInput.click({ clickCount: 3 });
            await sleep(300);
            await priceInput.type(price, { delay: 50 });
            console.log(`   ✅ ${price}`);
        } catch (e) {
            console.log('   ⚠️ Narx xato:', e.message);
        }
        await sleep(1000);

        // 5️⃣ DOGOVORНАЯ
        console.log('\n5️⃣ Договорная...');
        try {
            const allCheckboxes = await page.$('input[type="checkbox"]');
            for (let i = 0; i < allCheckboxes.length; i++) {
                const checkbox = allCheckboxes[i];
                const id = await page.evaluate(el => el.id, checkbox);
                const isChecked = await page.evaluate(el => el.checked, checkbox);

                if (id && id.includes('nexus-input')) {
                    await scrollToElement(page, checkbox);
                    if (!isChecked) {
                        await page.evaluate(el => {
                            const parent = el.parentElement;
                            if (parent) parent.click();
                        }, checkbox);
                        await sleep(500);
                        console.log('   ✅ Договорная belgilandi');
                    }
                    break;
                }
            }
        } catch (e) {
            console.log('   ⚠️ Договорная xato:', e.message);
        }
        await sleep(500);

        // 6️⃣ VALYUTA
        console.log('\n6️⃣ Valyuta (у.е.)...');
        try {
            const currencyButton = await page.$('.n-referenceinput-button');
            if (currencyButton) {
                await scrollToElement(page, currencyButton);
                await currencyButton.click();
                await sleep(1500);
                const uyeOption = await page.$('div[name="1_UYE"][role="radio"]');
                if (uyeOption) {
                    await uyeOption.click();
                    console.log('   ✅ у.е. tanlandi');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Valyuta xato:', e.message);
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

        const screenshotAfter = path.join(debugDir, `after-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotAfter, fullPage: true });
        console.log('\n📷 Final screenshot:', screenshotAfter);

        console.log('\n' + '='.repeat(60));
        console.log('✅ BARCHA MAYDONLAR TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ FORMA XATO:', error.message);

        try {
            const errorScreenshot = path.join(__dirname, '../../logs', `form-error-${Date.now()}.png`);
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.error('📷 Error screenshot:', errorScreenshot);
        } catch (e) {}

        throw error;
    }
}

/**
 * ✅ Rasmlarni yuklash
 */
async function uploadImagesNew(page, objectData) {
    try {
        console.log('   📸 Rasmlar yuklanmoqda...');

        const photoInput = await page.waitForSelector('[data-testid="attach-photos-input"]', {
            timeout: 5000
        });

        if (!photoInput) {
            console.log('   ⚠️ Rasm input topilmadi');
            return;
        }

        const imageFiles = await getImageFiles(objectData.rasmlar);

        if (imageFiles.length === 0) {
            console.log('   ⚠️ Rasmlar topilmadi');
            return;
        }

        const filesToUpload = imageFiles.slice(0, 8);
        console.log(`   📤 ${filesToUpload.length} ta rasm yuklanmoqda...`);

        await photoInput.uploadFile(...filesToUpload);
        await sleep(5000);

        console.log('   ✅ Rasmlar yuklandi');

    } catch (error) {
        console.error('   ⚠️ Rasmlar xato:', error.message);
    }
}

/**
 * ✅ Elon submit qilish
 */
async function submitAd(page) {
    try {
        console.log('\n🚀 ELON BERILMOQDA...');
        console.log('='.repeat(60));

        const submitSelectors = [
            'button[type="submit"]',
            'button[data-testid="submit-button"]',
            'button:has-text("Опубликовать")',
            'button:has-text("Разместить")',
            'button[class*="submit"]'
        ];

        let submitButton = null;
        for (const selector of submitSelectors) {
            try {
                submitButton = await page.waitForSelector(selector, {timeout: 3000});
                if (submitButton) {
                    console.log(`✅ Submit tugma topildi: ${selector}`);
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!submitButton) {
            const screenshotPath = path.join(__dirname, '../../logs', `no-submit-button-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);
            throw new Error('Submit tugma topilmadi');
        }

        const beforeUrl = page.url();
        console.log('📍 Joriy URL:', beforeUrl);

        await submitButton.click();
        console.log('✅ Submit tugma bosildi');

        console.log('⏳ Natijani kutish...');

        for (let i = 0; i < 15; i++) {
            await sleep(1000);
            const currentUrl = page.url();

            if (currentUrl !== beforeUrl) {
                console.log(`📍 URL o'zgardi (${i + 1}s): ${currentUrl}`);

                if (currentUrl.includes('login') || currentUrl.includes('callback')) {
                    const screenshotPath = path.join(__dirname, '../../logs', `login-required-${Date.now()}.png`);
                    await page.screenshot({path: screenshotPath, fullPage: true});
                    throw new Error('Login talab qilinmoqda');
                }

                if (!currentUrl.includes('/adding/') && !currentUrl.includes('/posting/')) {
                    console.log('✅ Elon muvaffaqiyatli berildi!');
                    console.log('='.repeat(60) + '\n');
                    return currentUrl;
                }
            }
        }

        const afterUrl = page.url();
        console.log('📍 Oxirgi URL:', afterUrl);

        const formErrors = await checkFormErrors(page);

        if (formErrors.length > 0) {
            console.log('❌ Formada xatolar:', formErrors);
            const screenshotPath = path.join(__dirname, '../../logs', `form-errors-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            throw new Error('Forma xatolari: ' + formErrors.join(', '));
        }

        if (afterUrl === beforeUrl || afterUrl.includes('/adding/') || afterUrl.includes('/posting/')) {
            console.log('⚠️ URL o\'zgarmadi - formada xato bo\'lishi mumkin');
            const screenshotPath = path.join(__dirname, '../../logs', `submit-no-change-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            throw new Error('Elon berilmadi: URL o\'zgarmadi');
        }

        console.log('✅ Elon berildi!');
        console.log('='.repeat(60) + '\n');
        return afterUrl;

    } catch (error) {
        console.error('❌ Submit xato:', error.message);

        try {
            const screenshotPath = path.join(__dirname, '../../logs', `submit-error-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);
        } catch (e) {}

        throw error;
    }
}

/**
 * ✅ Forma xatolarini tekshirish
 */
async function checkFormErrors(page) {
    try {
        const errors = [];

        const invalidElements = await page.$('[aria-invalid="true"]');
        for (const el of invalidElements) {
            const text = await page.evaluate(element => {
                const label = element.closest('div')?.querySelector('label');
                return label ? label.textContent : element.name || 'Noma\'lum maydon';
            }, el);
            errors.push(`${text} - noto'g'ri qiymat`);
        }

        const errorMessages = await page.$('.error-message, .field-error, [class*="error-text"]');
        for (const el of errorMessages) {
            const text = await page.evaluate(element => element.textContent, el);
            if (text && text.trim().length > 0 && text.trim().length < 200) {
                errors.push(text.trim());
            }
        }

        const requiredEmpty = await page.$('input[required]:invalid, textarea[required]:invalid');
        for (const el of requiredEmpty) {
            const name = await page.evaluate(element => {
                const label = element.closest('div')?.querySelector('label');
                return label ? label.textContent : element.name || 'Noma\'lum';
            }, el);
            errors.push(`${name} - majburiy maydon to'ldirilmagan`);
        }

        return [...new Set(errors)];

    } catch (error) {
        console.log('⚠️ Xato tekshirishda muammo:', error.message);
        return [];
    }
}

/**
 * ✅ ASOSIY FUNKSIYA (XFCE4 + Contabo)
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION BOSHLANDI (XFCE4 MODE)');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('='.repeat(60) + '\n');

    // ✅ SERVER INFO
    await logServerInfo();

    let browser = null;

    try {
        // ✅ 1. PROCESSING
        if (objectData.id) {
            console.log('📊 Status: waiting → processing');
            await PropertyObject.setProcessing(objectData.id);
        }

        // ✅ 2. BROWSER OCHISH (XFCE4)
        browser = await launchBrowser();
        const page = await browser.newPage();

        // Anti-detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        });

        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        page.on('dialog', async dialog => {
            console.log('⚠️ Dialog:', dialog.message());
            await dialog.dismiss();
        });

        // ✅ 3. OLX.UZ
        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(3000);

        // ✅ 4. LOGIN
        const isLoggedIn = await checkAndWaitForLogin(page);
        if (!isLoggedIn) {
            throw new Error('Login amalga oshmadi (5 daqiqa kutildi)');
        }

        console.log('✅ Login muvaffaqiyatli\n');

        // ✅ 5. ELON BERISH
        console.log('📝 Elon berish...');
        await page.goto('https://www.olx.uz/adding/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(5000);
        await closeUnfinishedAdAlert(page);

        // ✅ 6. FORMA (sizning fillAdForm funktsiyangiz)
        console.log('✍️ Forma...');
        await fillAdForm(page, objectData);

        // ✅ 7. SUBMIT (sizning submitAd funktsiyangiz)
        console.log('🚀 Submit...');
        const adUrl = await submitAd(page);

        console.log('✅ MUVAFFAQIYATLI!');
        await sleep(3000);
        await browser.close();

        // ✅ 8. POSTED
        if (objectData.id) {
            await PropertyObject.setPosted(objectData.id, adUrl);
        }

        return { success: true, adUrl: adUrl, timestamp: new Date().toISOString() };

    } catch (error) {
        console.error('❌ XATO:', error.message);

        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages[0]) {
                    const logsDir = path.join(__dirname, '../../logs');
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, { recursive: true });
                    }
                    const screenshotPath = path.join(logsDir, `error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshotPath, fullPage: true });
                    console.log('📷 Screenshot:', screenshotPath);
                }
            } catch (e) {}
            await browser.close();
        }

        if (objectData.id) {
            await PropertyObject.setError(objectData.id, error.message);
        }

        throw error;
    }
}

module.exports = { postToOLX };