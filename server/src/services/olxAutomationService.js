// server/src/services/olxAutomationService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// OLX login ma'lumotlari
const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;

// User data directory - session saqlash uchun
const USER_DATA_DIR = path.join(__dirname, '../../.chrome-data');
const PropertyObject = require('../models/Object.pg');
// Helper function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        // 5 soniya kutish - alert chiqishi uchun
        await sleep(5000);

        // 1-usul: Modal dialog kutish
        try {
            const modal = await page.waitForSelector('div[role="dialog"][aria-modal="true"]', {
                timeout: 5000,
                visible: true
            });

            if (modal) {
                console.log('   ✅ Alert modal topildi!');

                // Modal ichidagi barcha tugmalarni topish
                const allButtons = await modal.$$('button');
                console.log(`   ℹ️ ${allButtons.length} ta tugma topildi`);

                for (let i = 0; i < allButtons.length; i++) {
                    const text = await page.evaluate(el => el.textContent, allButtons[i]);
                    const variant = await page.evaluate(el => el.getAttribute('data-button-variant'), allButtons[i]);

                    console.log(`   Tugma ${i + 1}: variant="${variant}", text="${text}"`);

                    // "Нет, начать заново" topish
                    if (text && text.includes('Нет') && text.includes('заново')) {
                        console.log('   🎯 "Нет, начать заново" topildi!');
                        await allButtons[i].click();
                        console.log('   ✅ Bosildi!');
                        await sleep(3000);
                        return true;
                    }

                    // Yoki tertiary variant bo'lsa
                    if (variant === 'tertiary') {
                        console.log('   🎯 Tertiary tugma topildi!');
                        await allButtons[i].click();
                        console.log('   ✅ Bosildi!');
                        await sleep(3000);
                        return true;
                    }
                }
            }
        } catch (modalError) {
            console.log('   ℹ️ Modal topilmadi:', modalError.message);
        }

        // 2-usul: To'g'ridan-to'g'ri h4 orqali topish
        try {
            const alertTitle = await page.$('h4:has-text("У вас есть незаконченное объявление")');

            if (alertTitle) {
                console.log('   ✅ Alert sarlavhasi topildi!');

                // Yonidagi barcha tugmalarni topish
                const parentDiv = await page.evaluateHandle(el => {
                    // H4 ning eng yaqin parent div ni topish
                    let parent = el.parentElement;
                    while (parent && parent.tagName !== 'DIV') {
                        parent = parent.parentElement;
                    }
                    return parent ? parent.parentElement : null;
                }, alertTitle);

                if (parentDiv) {
                    const buttons = await parentDiv.$$('button');
                    console.log(`   ℹ️ ${buttons.length} ta tugma topildi`);

                    for (const btn of buttons) {
                        const text = await page.evaluate(el => el.textContent, btn);
                        console.log(`   Tugma: "${text}"`);

                        if (text.includes('Нет')) {
                            await btn.click();
                            console.log('   ✅ "Нет" bosildi!');
                            await sleep(3000);
                            return true;
                        }
                    }
                }
            }
        } catch (h4Error) {
            console.log('   ℹ️ H4 orqali topilmadi');
        }

        console.log('   ℹ️ Alert yo\'q yoki allaqachon yopilgan');
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
 * ✅ Login tekshirish va qo'lda kutish (ASOSIY FUNKSIYA)
 */
async function checkAndWaitForLogin(page) {
    console.log('\n🔐 LOGIN TEKSHIRILMOQDA...');
    console.log('='.repeat(60));

    // Birinchi tekshiruv
    const isAlreadyLoggedIn = await checkLoginStatus(page);

    if (isAlreadyLoggedIn) {
        console.log('✅ Allaqachon login qilingan (session mavjud)');
        console.log('='.repeat(60));
        return true;
    }

    // Login kerak
    console.log('⚠️  Session topilmadi, login kerak');
    console.log('');
    console.log('━'.repeat(60));
    console.log('  👆 BROWSER OYNASINI OCHING VA QO\'LDA LOGIN QILING');
    console.log('━'.repeat(60));
    console.log('');
    console.log('📋 Qadamlar:');
    console.log('   1. Browser oynasini toping (avtomatik ochilgan)');
    console.log('   2. Login tugmasini bosing');
    console.log('   3. Email/parol kiriting (yoki Google/Facebook orqali)');
    console.log('   4. Captcha yechish (agar bo\'lsa)');
    console.log('   5. Login tugagach avtomatik davom etadi');
    console.log('');
    console.log('⏰ Maksimal 3 daqiqa kutiladi...');
    console.log('='.repeat(60));
    console.log('');

    // Manual login kutish (3 daqiqa)
    const loginSuccess = await waitForManualLogin(page, 180);

    if (loginSuccess) {
        console.log('');
        console.log('='.repeat(60));
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI!');
        console.log('💾 Session saqlandi, keyingi safar avtomatik login bo\'ladi');
        console.log('='.repeat(60));
        console.log('');
        return true;
    }

    return false;
}

/**
 * ✅ Manual login kutish
 */
async function waitForManualLogin(page, timeoutSeconds = 180) {
    console.log(`⏳ Kutilmoqda (${timeoutSeconds}s)...\n`);

    for (let i = timeoutSeconds; i > 0; i--) {
        // Progress bar
        const progress = Math.floor((timeoutSeconds - i) / timeoutSeconds * 30);
        const bar = '█'.repeat(progress) + '░'.repeat(30 - progress);
        process.stdout.write(`\r[${bar}] ${i}s `);

        await sleep(1000);

        // Har 3 soniyada tekshirish
        if (i % 3 === 0) {
            const isLoggedIn = await checkLoginStatus(page);
            if (isLoggedIn) {
                console.log('\n✅ Login aniqlandi!\n');
                return true;
            }
        }
    }

    console.log('\n❌ Timeout: Login amalga oshmadi\n');
    return false;
}

/**
 * ✅ Login status tekshirish (sodda va ishonchli)
 */
async function checkLoginStatus(page) {
    try {
        const currentUrl = page.url();

        // Login sahifalari
        if (currentUrl.includes('login') || currentUrl.includes('callback')) {
            return false;
        }

        // Success indikatorlar
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
 * ✅ Mebel va Komission - ENG SODDA USUL
 */
async function clickFurnishedAndCommission(page) {
    try {
        // 1. МЕБЛИРОВАНА - НЕТ
        console.log('\n🔘 Меблирована - Нет...');

        const furnishedNoButton = await page.$('button[data-cy="parameters.furnished_no"]');

        if (furnishedNoButton) {
            console.log('   ✅ Tugma topildi');

            await scrollToElement(page, furnishedNoButton);

            const beforePressed = await page.evaluate(el => el.getAttribute('aria-pressed'), furnishedNoButton);
            console.log(`   Hozir: aria-pressed="${beforePressed}"`);

            // Faqat bosilmagan bo'lsa - bosish
            if (beforePressed !== 'true') {
                await furnishedNoButton.click();
                await sleep(1000);

                const afterPressed = await page.evaluate(el => el.getAttribute('aria-pressed'), furnishedNoButton);
                console.log(`   ✅ Bosildi: aria-pressed="${afterPressed}"`);
            } else {
                console.log('   ℹ️ Allaqachon bosilgan');
            }
        } else {
            console.log('   ❌ Tugma topilmadi');
        }

        await sleep(500);

        // 2. КОМИССИОННЫЕ - НЕТ
        console.log('\n🔘 Комиссионные - Нет...');

        const commissionNoButton = await page.$('button[data-cy="parameters.comission_no"]');

        if (commissionNoButton) {
            console.log('   ✅ Tugma topildi');

            await scrollToElement(page, commissionNoButton);

            const beforePressed = await page.evaluate(el => el.getAttribute('aria-pressed'), commissionNoButton);
            console.log(`   Hozir: aria-pressed="${beforePressed}"`);

            // Faqat bosilmagan bo'lsa - bosish
            if (beforePressed !== 'true') {
                await commissionNoButton.click();
                await sleep(1000);

                const afterPressed = await page.evaluate(el => el.getAttribute('aria-pressed'), commissionNoButton);
                console.log(`   ✅ Bosildi: aria-pressed="${afterPressed}"`);
            } else {
                console.log('   ℹ️ Allaqachon bosilgan');
            }
        } else {
            console.log('   ❌ Tugma topilmadi');
        }

    } catch (e) {
        console.log('   ❌ Xato:', e.message);
    }
}


/**
 * ✅ Tavsif yaratish (Rus tili KIRILL alifbosida)
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya, planirovka, balkon, rieltor } = data;

    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;

    const location = kvartil || 'Yunusobod';
    const formattedPrice = narx.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    // ==========================================
    // O'ZBEK MATNI
    // ==========================================
    let description = `SOTILADI - ${location.toUpperCase()}\n`;
    description += `${xonaSoni}-xonali kvartira\n\n`;

    description += `ASOSIY MA'LUMOTLAR:\n`;
    description += `---\n`;
    description += `• Joylashuv: ${location}\n`;
    description += `• Xonalar soni: ${xonaSoni}\n`;
    description += `• Umumiy maydoni: ${m2} m2\n`;
    description += `• Qavat: ${etajInfo}\n`;

    if (uy_turi) {
        description += `• Uy turi: ${uy_turi}\n`;
    }

    if (xolati) {
        description += `• Ta'mirlash: ${xolati}\n`;
    }

    if (planirovka) {
        description += `• Planirovka: ${planirovka}\n`;
    }

    if (balkon) {
        description += `• Balkon: ${balkon}\n`;
    }

    description += `\n`;
    description += `NARX: ${formattedPrice} $\n`;
    description += `(Kelishiladi)\n\n`;

    description += `AFZALLIKLAR:\n`;
    description += `---\n`;
    description += `+ Hujjatlar tayyor\n`;
    description += `+ Tez ko'rik\n`;
    description += `+ Professional yordam\n`;
    description += `+ Yuridik tozaligi kafolatlangan\n\n`;

    // ==========================================
    // RUS MATNI (KIRILL)
    // ==========================================
    description += `ПРОДАЕТСЯ - ${location.toUpperCase()}\n`;
    description += `${xonaSoni}-комнатная квартира\n\n`;

    description += `ОСНОВНАЯ ИНФОРМАЦИЯ:\n`;
    description += `---\n`;
    description += `• Расположение: ${location}\n`;
    description += `• Количество комнат: ${xonaSoni}\n`;
    description += `• Общая площадь: ${m2} м2\n`;
    description += `• Этаж: ${etajInfo}\n`;

    if (uy_turi) {
        description += `• Тип дома: ${uy_turi}\n`;
    }

    if (xolati) {
        description += `• Состояние: ${xolati}\n`;
    }

    if (planirovka) {
        description += `• Планировка: ${planirovka}\n`;
    }

    if (balkon) {
        description += `• Балкон: ${balkon}\n`;
    }

    description += `\n`;
    description += `ЦЕНА:${formattedPrice} $\n`;
    description += `(Договорная)\n\n`;

    description += `ПРЕИМУЩЕСТВА:\n`;
    description += `---\n`;
    description += `+ Документы готовы\n`;
    description += `+ Быстрый показ\n`;
    description += `+ Профессиональная помощь\n`;
    description += `+ Юридическая чистота гарантирована\n`;
    description += `+ Помощь с оформлением сделки\n`;
    description += `+ Консультация по ипотеке\n\n`;

    description += `КОНТАКТЫ:\n`;
    description += `---\n`;
    description += `Звоните прямо сейчас!\n`;
    description += `WhatsApp / Telegram доступны\n`;
    description += `Ответим на все вопросы\n\n`;

    if (opisaniya && opisaniya.trim().length > 0) {
        description += `ДОПОЛНИТЕЛЬНО:\n`;
        description += `---\n`;
        description += `${opisaniya}\n\n`;
    }

    // ==========================================
    // HASHTAGLAR
    // ==========================================
    description += `---\n`;
    description += `ТЕГИ ДЛЯ ПОИСКА:\n`;
    description += `---\n\n`;

    const locationClean = location.replace(/\s+/g, '').replace(/-/g, '');
    const agentName = rieltor ? rieltor.replace(/\s+/g, '_') : 'Maskan_lux';

    const hashtags = [
        '#квартира',
        '#продажа',
        '#недвижимость',
        '#realestate',
        '#Ташкент',
        '#Tashkent',
        '#Узбекистан',
        '#Uzbekistan',
        '#Юнусабад',
        '#Yunusobod',
        `#${locationClean}`,
        `#${xonaSoni}комнатная`,
        `#${xonaSoni}rooms`,
        '#продаетсяквартира',
        '#квартирыТашкент',
        '#жильеТашкент',
        uy_turi ? `#${uy_turi.replace(/\s+/g, '')}` : null,
        '#вторичка',
        '#безпосредников',
        '#срочно',
        m2 >= 70 && m2 < 100 ? '#большаяквартира' : null,
        m2 >= 100 ? '#элитнаяквартира' : null,
        parseInt(narx.replace(/\D/g, '')) < 40000 ? '#доступнаяцена' : null,
        parseInt(narx.replace(/\D/g, '')) >= 80000 ? '#премиум' : null,
        xolati && xolati.includes('Evro') ? '#евроремонт' : null,
        `#${agentName}`,
        '#риелтор',
        '#realtor',
        '#купитьквартиру',
        '#недвижимостьТашкент',
        '#tashkentrealestate',
        '#RTD',
        '#Maskan_lux'
    ].filter(Boolean);

    // 5 tadan qilib joylashtirish
    const hashtagLines = [];
    for (let i = 0; i < hashtags.length; i += 5) {
        hashtagLines.push(hashtags.slice(i, i + 5).join(' '));
    }

    description += hashtagLines.join('\n');
    description += `\n\n---`;

    // ✅ TOZALASH: Ketma-ket 3+ belgini tozalash
    description = cleanRepeatedSymbols(description);

    return description;
}


/**
 * ✅ HELPER: Ketma-ket takrorlanuvchi belgilarni tozalash
 */
function cleanRepeatedSymbols(text) {
    // Faqat ruxsat etilgan belgilar: • - + / @ # $ ! %
    const allowedSymbols = /[•\-+/@#$!%]/g;

    // Ketma-ket 3+ marta takrorlangan belgilarni 2 taga kamaytirish
    return text.replace(/([•\-+/@#$!%])\1{2,}/g, '$1$1');
}


/**
 * ✅ TO'LIQ ELON FORMASINI TO'LDIRISH
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 ELON FORMASINI TO\'LDIRISH');
        console.log('='.repeat(60));

        // ✅ CRITICAL: Debug papkasini yaratish
        const debugDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        // ✅ Sahifa to'liq yuklanishini kutish
        console.log('⏳ Sahifa render bo\'lishini kutish...');
        await sleep(5000);

        // ✅ DEBUG: Sahifa ma'lumotlari
        const pageTitle = await page.title();
        const currentUrl = page.url();
        console.log('📄 Page title:', pageTitle);
        console.log('📍 Current URL:', currentUrl);

        // ✅ Screenshot (forma to'ldirishdan OLDIN)
        const screenshotBefore = path.join(debugDir, `before-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotBefore, fullPage: true });
        console.log('📷 Screenshot saved:', screenshotBefore);

        // ✅ HTML dump
        const htmlPath = path.join(debugDir, `page-${Date.now()}.html`);
        const html = await page.content();
        fs.writeFileSync(htmlPath, html);
        console.log('📝 HTML saved:', htmlPath);

        // ✅ Form elementini kutish
        console.log('⏳ Form elementini kutish...');
        await page.waitForSelector('form', { timeout: 30000 }).catch(() => {
            console.log('⚠️ Form tag topilmadi, davom ettirilmoqda...');
        });
        await sleep(3000);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // ========================================
        // 1️⃣ TITLE - Multiple selectors
        // ========================================
        console.log('\n1️⃣ Sarlavha (Title)...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        console.log(`   "${title}"`);

        const titleSelectors = [
            '[data-testid="posting-title"]',
            'input[name="title"]',
            'input[placeholder*="Название"]',
            'input[placeholder*="название"]',
            'input[data-cy*="title"]',
            'textarea[name="title"]',
            'input[type="text"]'
        ];

        let titleInput = null;
        for (const selector of titleSelectors) {
            try {
                console.log(`   🔍 Trying: ${selector}`);
                titleInput = await page.waitForSelector(selector, {
                    timeout: 5000,
                    visible: true
                });
                if (titleInput) {
                    console.log(`   ✅ Topildi: ${selector}`);
                    break;
                }
            } catch (e) {
                console.log(`   ❌ Topilmadi: ${selector}`);
            }
        }

        // ✅ Agar hali ham topilmasa - barcha inputlarni ko'rsatish
        if (!titleInput) {
            console.log('\n   ⚠️ Title input hech qaysi selector bilan topilmadi!');
            console.log('   📋 Sahifadagi barcha inputlar:');

            const allInputs = await page.$('input');
            console.log(`   ℹ️ Jami ${allInputs.length} ta input element mavjud\n`);

            for (let i = 0; i < Math.min(allInputs.length, 15); i++) {
                const info = await page.evaluate(el => ({
                    type: el.type,
                    name: el.name || 'N/A',
                    id: el.id || 'N/A',
                    placeholder: el.placeholder || 'N/A',
                    testid: el.getAttribute('data-testid') || 'N/A',
                    cy: el.getAttribute('data-cy') || 'N/A',
                    className: el.className || 'N/A'
                }), allInputs[i]);

                console.log(`   Input ${i + 1}:`);
                console.log(`     type: ${info.type}`);
                console.log(`     name: ${info.name}`);
                console.log(`     id: ${info.id}`);
                console.log(`     placeholder: ${info.placeholder}`);
                console.log(`     data-testid: ${info.testid}`);
                console.log(`     data-cy: ${info.cy}`);
                console.log(`     class: ${info.className.substring(0, 50)}`);
                console.log('');
            }

            // ✅ CRITICAL ERROR screenshot
            const errorScreenshot = path.join(debugDir, `title-not-found-${Date.now()}.png`);
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.log('   📷 Error screenshot:', errorScreenshot);

            throw new Error('Title input topilmadi - barcha variantlar sinaldi. Screenshotni tekshiring!');
        }

        // ✅ Title yozish
        await scrollToElement(page, titleInput);
        await sleep(1000);
        await titleInput.click({ clickCount: 3 });
        await sleep(500);
        await titleInput.type(title, { delay: 80 });
        console.log('   ✅ Yozildi:', title);
        await sleep(1000);

        // ========================================
        // 2️⃣ RASMLAR
        // ========================================
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('\n2️⃣ Rasmlar...');
            try {
                const photoInput = await page.waitForSelector('[data-testid="attach-photos-input"]', {
                    timeout: 10000
                });

                if (photoInput) {
                    const imageFiles = await getImageFiles(objectData.rasmlar);

                    if (imageFiles.length > 0) {
                        const filesToUpload = imageFiles.slice(0, 8);
                        console.log(`   📤 ${filesToUpload.length} ta rasm yuklanmoqda...`);
                        await photoInput.uploadFile(...filesToUpload);
                        await sleep(5000);
                        console.log('   ✅ Rasmlar yuklandi');
                    } else {
                        console.log('   ⚠️ Rasm fayllari topilmadi');
                    }
                }
            } catch (e) {
                console.log('   ⚠️ Rasm yuklashda xato:', e.message);
            }
        } else {
            console.log('\n2️⃣ Rasmlar: Yo\'q');
        }
        await sleep(500);

        // ========================================
        // 3️⃣ TAVSIF
        // ========================================
        console.log('\n3️⃣ Tavsif (Description)...');
        const description = createDescription(objectData);
        console.log('   Preview:', description.substring(0, 100) + '...');

        try {
            const descriptionArea = await page.waitForSelector('[data-testid="posting-description-text-area"]', {
                timeout: 15000,
                visible: true
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

        // ========================================
        // 4️⃣ NARX
        // ========================================
        console.log('\n4️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');

        try {
            const priceInput = await page.waitForSelector('[data-testid="price-input"]', {
                timeout: 15000,
                visible: true
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

        // ========================================
        // 5️⃣ DOGOVORНАЯ CHECKBOX
        // ========================================
        console.log('\n5️⃣ Договорная...');
        try {
            const allCheckboxes = await page.$('input[type="checkbox"]');
            console.log(`   ℹ️ ${allCheckboxes.length} ta checkbox topildi`);

            for (let i = 0; i < allCheckboxes.length; i++) {
                const checkbox = allCheckboxes[i];
                const id = await page.evaluate(el => el.id, checkbox);
                const isChecked = await page.evaluate(el => el.checked, checkbox);

                console.log(`   Checkbox ${i + 1}: id="${id}", checked=${isChecked}`);

                if (id && id.includes('nexus-input')) {
                    console.log('   🎯 Договорная checkbox topildi!');

                    await scrollToElement(page, checkbox);

                    if (!isChecked) {
                        await page.evaluate(el => {
                            const parent = el.parentElement;
                            if (parent) parent.click();
                        }, checkbox);
                        await sleep(500);

                        const newChecked = await page.evaluate(el => el.checked, checkbox);
                        console.log(`   ✅ Договорная ${newChecked ? 'belgilandi' : 'XATO!'}`);
                    } else {
                        console.log('   ℹ️ Allaqachon belgilangan');
                    }
                    break;
                }
            }
        } catch (e) {
            console.log('   ⚠️ Договорная xato:', e.message);
        }
        await sleep(500);

        // ========================================
        // 6️⃣ VALYUTA - у.е.
        // ========================================
        console.log('\n6️⃣ Valyuta (у.е.)...');
        try {
            const currencyButton = await page.$('.n-referenceinput-button');
            if (currencyButton) {
                await scrollToElement(page, currencyButton);
                await currencyButton.click();
                console.log('   ✅ Dropdown ochildi');
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

        // ========================================
        // 7️⃣ SHAXSIY SHAXS
        // ========================================
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

        // ========================================
        // 8️⃣ TIP JILYA (Вторичный рынок)
        // ========================================
        console.log('\n8️⃣ Тип жилья (Вторичный рынок)...');
        try {
            const typeDropdownContainer = await page.$('div[data-testid="dropdown"][data-cy="parameters.type_of_market"]');

            if (typeDropdownContainer) {
                console.log('   ✅ Тип жилья dropdown topildi');

                await scrollToElement(page, typeDropdownContainer);

                const dropdownButton = await typeDropdownContainer.$('button.n-referenceinput-button');

                if (dropdownButton) {
                    await dropdownButton.click();
                    console.log('   ✅ Dropdown ochildi');
                    await sleep(1500);

                    const allMenuItems = await page.$('div[data-testid="dropdown-menu-item"] a');
                    console.log(`   ℹ️ ${allMenuItems.length} ta variant topildi`);

                    for (const item of allMenuItems) {
                        const text = await page.evaluate(el => el.textContent, item);
                        console.log(`   Variant: "${text}"`);

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

        // ========================================
        // 9️⃣ XONALAR SONI
        // ========================================
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

        // ========================================
        // 🔟 UMUMIY MAYDON
        // ========================================
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

        // ========================================
        // 1️⃣1️⃣ ETAJ
        // ========================================
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

        // ========================================
        // 1️⃣2️⃣ ETAJNOST
        // ========================================
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

        // ========================================
        // 1️⃣3️⃣-1️⃣4️⃣ МЕБЛИРОВАНА VA КОМИССИОННЫЕ
        // ========================================
        await clickFurnishedAndCommission(page);
        await sleep(500);

        // ========================================
        // 1️⃣5️⃣ JOYLASHUV - YUNUSOBOD
        // ========================================
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

        // ========================================
        // 1️⃣6️⃣ TELEFON RAQAM
        // ========================================
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

        // ========================================
        // ✅ FINAL SCREENSHOT
        // ========================================
        const screenshotAfter = path.join(debugDir, `after-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotAfter, fullPage: true });
        console.log('\n📷 Final screenshot:', screenshotAfter);

        console.log('\n' + '='.repeat(60));
        console.log('✅ BARCHA MAYDONLAR TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ FORMA XATO:', error.message);
        console.error('Stack trace:', error.stack);

        // ✅ Error screenshot
        try {
            const errorScreenshot = path.join(__dirname, '../../logs', `form-error-${Date.now()}.png`);
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.error('📷 Error screenshot:', errorScreenshot);

            // ✅ Error HTML dump
            const errorHtml = path.join(__dirname, '../../logs', `error-page-${Date.now()}.html`);
            const html = await page.content();
            fs.writeFileSync(errorHtml, html);
            console.error('📝 Error HTML:', errorHtml);
        } catch (screenshotError) {
            console.error('⚠️ Screenshot olishda xato:', screenshotError.message);
        }

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
 * ✅ Elon submit qilish (yangilangan)
 */
async function submitAd(page) {
    try {
        console.log('\n🚀 ELON BERILMOQDA...');
        console.log('='.repeat(60));

        // Submit tugma topish
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

        // Submit bosish
        await submitButton.click();
        console.log('✅ Submit tugma bosildi');

        // Navigation kutish
        console.log('⏳ Natijani kutish...');

        // 15 soniya kutish va URL tekshirish
        for (let i = 0; i < 15; i++) {
            await sleep(1000);
            const currentUrl = page.url();

            // Agar URL o'zgargan bo'lsa
            if (currentUrl !== beforeUrl) {
                console.log(`📍 URL o'zgardi (${i + 1}s): ${currentUrl}`);

                // Login sahifasiga o'tgan bo'lsa
                if (currentUrl.includes('login') || currentUrl.includes('callback')) {
                    const screenshotPath = path.join(__dirname, '../../logs', `login-required-${Date.now()}.png`);
                    await page.screenshot({path: screenshotPath, fullPage: true});
                    console.log('📷 Screenshot:', screenshotPath);

                    throw new Error('Login talab qilinmoqda');
                }

                // Adding sahifasidan chiqqan bo'lsa - muvaffaqiyat
                if (!currentUrl.includes('/adding/') && !currentUrl.includes('/posting/')) {
                    console.log('✅ Elon muvaffaqiyatli berildi!');
                    console.log('='.repeat(60) + '\n');
                    return currentUrl;
                }
            }
        }

        // 15 soniyadan keyin URL tekshirish
        const afterUrl = page.url();
        console.log('📍 Oxirgi URL:', afterUrl);

        // ✅ XATOLARNI TEKSHIRISH
        const formErrors = await checkFormErrors(page);

        if (formErrors.length > 0) {
            console.log('❌ Formada xatolar topildi:', formErrors);

            const screenshotPath = path.join(__dirname, '../../logs', `form-errors-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);

            throw new Error('Forma xatolari: ' + formErrors.join(', '));
        }

        // ✅ AGAR URL O'ZGARMAGAN BO'LSA - XATO!
        if (afterUrl === beforeUrl || afterUrl.includes('/adding/') || afterUrl.includes('/posting/')) {
            console.log('⚠️ URL o\'zgarmadi - formada xato bo\'lishi mumkin');

            const screenshotPath = path.join(__dirname, '../../logs', `submit-no-change-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);

            // ✅ XATO THROW QILISH
            throw new Error('Elon berilmadi: URL o\'zgarmadi. Formada yashirin xato bo\'lishi mumkin.');
        }

        // Agar bu qismga yetib kelgan bo'lsa - URL o'zgargan lekin adding sahifasida emas
        console.log('✅ Elon berildi!');
        console.log('='.repeat(60) + '\n');
        return afterUrl;

    } catch (error) {
        console.error('❌ Submit xato:', error.message);

        // Screenshot (agar hali olinmagan bo'lsa)
        try {
            const screenshotPath = path.join(__dirname, '../../logs', `submit-error-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);
        } catch (ssError) {
            // Screenshot olishda xato bo'lsa e'tibor bermaslik
        }

        throw error;
    }
}


async function checkFormErrors(page) {
    try {
        const errors = [];

        // 1. Aria-invalid elementlar
        const invalidElements = await page.$('[aria-invalid="true"]');
        for (const el of invalidElements) {
            const text = await page.evaluate(element => {
                const label = element.closest('div')?.querySelector('label');
                return label ? label.textContent : element.name || 'Noma\'lum maydon';
            }, el);
            errors.push(`${text} - noto'g'ri qiymat`);
        }

        // 2. Error class'lari
        const errorMessages = await page.$('.error-message, .field-error, [class*="error-text"]');
        for (const el of errorMessages) {
            const text = await page.evaluate(element => element.textContent, el);
            if (text && text.trim().length > 0 && text.trim().length < 200) {
                errors.push(text.trim());
            }
        }

        // 3. Required maydonlar
        const requiredEmpty = await page.$('input[required]:invalid, textarea[required]:invalid');
        for (const el of requiredEmpty) {
            const name = await page.evaluate(element => {
                const label = element.closest('div')?.querySelector('label');
                return label ? label.textContent : element.name || 'Noma\'lum';
            }, el);
            errors.push(`${name} - majburiy maydon to'ldirilmagan`);
        }

        return [...new Set(errors)]; // Dublikatlarni olib tashlash

    } catch (error) {
        console.log('⚠️ Xato tekshirishda muammo:', error.message);
        return [];
    }
}



async function postToOLX(objectData) {
    console.log('\n🤖 OLX automation boshlandi...');
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    let browser = null;

    try {
        // ✅ 1. PROCESSING GA O'TKAZISH
        if (objectData.id) {
            console.log('📊 Status: waiting → processing');
            await PropertyObject.setProcessing(objectData.id);
        }

        // User data directory
        if (!fs.existsSync(USER_DATA_DIR)) {
            fs.mkdirSync(USER_DATA_DIR, { recursive: true });
            console.log('📁 User data directory yaratildi');
        }

        // Browser ochish
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: USER_DATA_DIR,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--disable-infobars',
                '--disable-notifications',
                '--disable-popup-blocking'
            ],
            defaultViewport: null,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();

        // Anti-detection
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en']
            });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        page.on('dialog', async dialog => {
            console.log('⚠️ Dialog:', dialog.message());
            await dialog.dismiss();
        });

        // OLX.uz ga kirish
        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await sleep(3000);

        // Login tekshirish
        const isLoggedIn = await checkAndWaitForLogin(page);
        if (!isLoggedIn) {
            throw new Error('Login amalga oshmadi');
        }

        console.log('✅ Login muvaffaqiyatli\n');

        // Elon berish sahifasiga o'tish
        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await sleep(5000);

        // Alert yopish
        await closeUnfinishedAdAlert(page);

        // Login qayta tekshirish
        const stillLoggedIn = await checkLoginStatus(page);
        if (!stillLoggedIn) {
            console.log('⚠️ Login kerak, kutilmoqda...');
            await waitForManualLogin(page, 120);
        }

        // Forma to'ldirish
        console.log('✍️ Ma\'lumotlar to\'ldirilmoqda...');
        await fillAdForm(page, objectData);

        // Submit
        console.log('🚀 Elon berilmoqda...');
        const adUrl = await submitAd(page);

        console.log('✅ Elon muvaffaqiyatli berildi:', adUrl);

        await sleep(3000);
        await browser.close();

        // ✅ 2. POSTED GA O'TKAZISH
        if (objectData.id) {
            console.log('📊 Status: processing → posted');
            await PropertyObject.setPosted(objectData.id, adUrl);
        }

        return {
            success: true,
            adUrl: adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ OLX automation xato:', error.message);

        // Screenshot olish
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages[0]) {
                    const screenshotPath = path.join(__dirname, '../../logs', `olx-error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshotPath, fullPage: true });
                    console.log('📷 Screenshot:', screenshotPath);
                }
            } catch (screenshotError) {
                console.error('Screenshot xato:', screenshotError);
            }

            await browser.close();
        }

        // ✅ 3. ERROR GA O'TKAZISH
        if (objectData.id) {
            console.log('📊 Status: processing → error');
            await PropertyObject.setError(objectData.id, error.message);
        }

        throw error;
    }
}

module.exports = {
    postToOLX
};

