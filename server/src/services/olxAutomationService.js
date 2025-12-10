// server/src/services/olxAutomationService.js - SERVER OPTIMIZED
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;
const USER_DATA_DIR = path.join(__dirname, '../../.chrome-data');
const PropertyObject = require('../models/Object.pg');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ✅ CRITICAL FIX: Sahifa to'liq yuklanishini kutish
 */
async function waitForPageFullyLoaded(page, timeout = 60000) {
    console.log('⏳ Sahifa to\'liq yuklanishini kutish...');

    try {
        // 1. networkidle2 kutish
        await page.waitForNetworkIdle({ timeout: 30000, idleTime: 2000 }).catch(() => {
            console.log('   ⚠️ Network idle timeout, davom ettirilmoqda...');
        });

        // 2. DOM to'liq render bo'lishini kutish
        await page.evaluate(() => {
            return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
        });

        // 3. Qo'shimcha kutish
        await sleep(5000);

        console.log('✅ Sahifa to\'liq yuklandi');
        return true;

    } catch (error) {
        console.log('⚠️ Sahifa yuklanish kutishda xato:', error.message);
        return false;
    }
}

/**
 * ✅ CRITICAL FIX: Element mavjudligini tekshirish va kutish
 */
async function waitForElement(page, selectors, timeout = 60000) {
    console.log('🔍 Element qidirilmoqda...');

    if (!Array.isArray(selectors)) {
        selectors = [selectors];
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        for (const selector of selectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await page.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    }, element);

                    if (isVisible) {
                        console.log(`   ✅ Element topildi: ${selector}`);
                        return element;
                    }
                }
            } catch (e) {
                // Continue
            }
        }

        await sleep(1000);
    }

    throw new Error(`Element topilmadi: ${selectors.join(', ')}`);
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
 * ✅ Alert yopish
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

                for (let i = 0; i < allButtons.length; i++) {
                    const text = await page.evaluate(el => el.textContent, allButtons[i]);
                    const variant = await page.evaluate(el => el.getAttribute('data-button-variant'), allButtons[i]);

                    if (text && text.includes('Нет') && text.includes('заново')) {
                        await allButtons[i].click();
                        console.log('   ✅ Alert yopildi!');
                        await sleep(3000);
                        return true;
                    }

                    if (variant === 'tertiary') {
                        await allButtons[i].click();
                        console.log('   ✅ Alert yopildi!');
                        await sleep(3000);
                        return true;
                    }
                }
            }
        } catch (modalError) {
            console.log('   ℹ️ Alert yo\'q');
        }

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
 * ✅ Login tekshirish
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
            '[class*="account-menu"]'
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
 * ✅ Manual login kutish
 */
async function waitForManualLogin(page, timeoutSeconds = 180) {
    console.log(`⏳ Kutilmoqda (${timeoutSeconds}s)...\n`);

    for (let i = timeoutSeconds; i > 0; i--) {
        const progress = Math.floor((timeoutSeconds - i) / timeoutSeconds * 30);
        const bar = '█'.repeat(progress) + '░'.repeat(30 - progress);
        process.stdout.write(`\r[${bar}] ${i}s `);

        await sleep(1000);

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
 * ✅ Login tekshirish va kutish
 */
async function checkAndWaitForLogin(page) {
    console.log('\n🔐 LOGIN TEKSHIRILMOQDA...');
    console.log('='.repeat(60));

    const isAlreadyLoggedIn = await checkLoginStatus(page);

    if (isAlreadyLoggedIn) {
        console.log('✅ Allaqachon login qilingan');
        console.log('='.repeat(60));
        return true;
    }

    console.log('⚠️  Session topilmadi, login kerak');
    console.log('');
    console.log('━'.repeat(60));
    console.log('  👆 BROWSER OYNASINI OCHING VA QO\'LDA LOGIN QILING');
    console.log('━'.repeat(60));
    console.log('');

    const loginSuccess = await waitForManualLogin(page, 180);

    if (loginSuccess) {
        console.log('');
        console.log('='.repeat(60));
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI!');
        console.log('='.repeat(60));
        console.log('');
        return true;
    }

    return false;
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
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya, planirovka, balkon, rieltor } = data;

    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;

    const location = kvartil || 'Yunusobod';
    const formattedPrice = narx.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

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
    description += `ЦЕНА: ${formattedPrice} $\n`;
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

    description += `---\n`;
    description += `ТЕГИ ДЛЯ ПОИСКА:\n`;
    description += `---\n\n`;

    const locationClean = location.replace(/\s+/g, '').replace(/-/g, '');
    const agentName = rieltor ? rieltor.replace(/\s+/g, '_') : 'Maskan_lux';

    const hashtags = [
        '#квартира',
        '#продажа',
        '#недвижимость',
        '#Ташкент',
        '#Yunusobod',
        `#${locationClean}`,
        `#${xonaSoni}комнатная`,
        '#продаетсяквартира',
        `#${agentName}`,
        '#Maskan_lux'
    ].filter(Boolean);

    const hashtagLines = [];
    for (let i = 0; i < hashtags.length; i += 5) {
        hashtagLines.push(hashtags.slice(i, i + 5).join(' '));
    }

    description += hashtagLines.join('\n');
    description += `\n\n---`;

    return description.replace(/([•\-+/@#$!%])\1{2,}/g, '$1$1');
}

/**
 * ✅ CRITICAL FIX: TO'LIQ ELON FORMASI (Server optimized)
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 ELON FORMASINI TO\'LDIRISH');
        console.log('='.repeat(60));

        const debugDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        // ✅ CRITICAL: Sahifa to'liq yuklanishini kutish
        console.log('⏳ Sahifa to\'liq yuklanishini kutish...');
        await waitForPageFullyLoaded(page);

        const pageTitle = await page.title();
        const currentUrl = page.url();
        console.log('📄 Page title:', pageTitle);
        console.log('📍 Current URL:', currentUrl);

        // Screenshot OLDIN
        const screenshotBefore = path.join(debugDir, `before-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotBefore, fullPage: true });
        console.log('📷 Screenshot:', screenshotBefore);

        // HTML dump
        const htmlPath = path.join(debugDir, `page-${Date.now()}.html`);
        const html = await page.content();
        fs.writeFileSync(htmlPath, html);
        console.log('📝 HTML saved:', htmlPath);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // ========================================
        // 1️⃣ TITLE - CRITICAL FIX
        // ========================================
        console.log('\n1️⃣ Sarlavha (Title)...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;

        const titleSelectors = [
            '[data-testid="posting-title"]',
            'input[name="title"]',
            'input[placeholder*="Название"]',
            'input[placeholder*="название"]',
            'textarea[name="title"]'
        ];

        // ✅ CRITICAL: waitForElement ishlatish
        const titleInput = await waitForElement(page, titleSelectors, 60000);

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
                    timeout: 15000
                });

                if (photoInput) {
                    const imageFiles = await getImageFiles(objectData.rasmlar);

                    if (imageFiles.length > 0) {
                        const filesToUpload = imageFiles.slice(0, 8);
                        console.log(`   📤 ${filesToUpload.length} ta rasm yuklanmoqda...`);
                        await photoInput.uploadFile(...filesToUpload);
                        await sleep(8000); // Server uchun ko'proq kutish
                        console.log('   ✅ Rasmlar yuklandi');
                    }
                }
            } catch (e) {
                console.log('   ⚠️ Rasm yuklashda xato:', e.message);
            }
        }
        await sleep(1000);

        // ========================================
        // 3️⃣ TAVSIF
        // ========================================
        console.log('\n3️⃣ Tavsif...');
        const description = createDescription(objectData);

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
        // 5️⃣-1️⃣6️⃣ QOLGAN MAYDONLAR
        // ========================================

        // Dogovoraya
        console.log('\n5️⃣ Договорная...');
        try {
            const allCheckboxes = await page.$$('input[type="checkbox"]');
            for (const checkbox of allCheckboxes) {
                const id = await page.evaluate(el => el.id, checkbox);
                if (id && id.includes('nexus-input')) {
                    await scrollToElement(page, checkbox);
                    const isChecked = await page.evaluate(el => el.checked, checkbox);
                    if (!isChecked) {
                        await page.evaluate(el => el.parentElement?.click(), checkbox);
                        await sleep(500);
                        console.log('   ✅ Belgilandi');
                    }
                    break;
                }
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Valyuta
        console.log('\n6️⃣ Valyuta...');
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
            console.log('   ⚠️ Xato:', e.message);
        }

        // Shaxsiy shaxs
        console.log('\n7️⃣ Shaxsiy shaxs...');
        try {
            const privateButton = await page.$('button[data-testid="private_business_private_unactive"]');
            if (privateButton) {
                await scrollToElement(page, privateButton);
                await privateButton.click();
                console.log('   ✅ Tanlandi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Tip jilya
        console.log('\n8️⃣ Тип жилья...');
        try {
            const typeDropdown = await page.$('div[data-testid="dropdown"][data-cy="parameters.type_of_market"]');
            if (typeDropdown) {
                await scrollToElement(page, typeDropdown);
                const dropdownButton = await typeDropdown.$('button');
                if (dropdownButton) {
                    await dropdownButton.click();
                    await sleep(1500);
                    const allItems = await page.$$('div[data-testid="dropdown-menu-item"] a');
                    for (const item of allItems) {
                        const text = await page.evaluate(el => el.textContent, item);
                        if (text.includes('Вторичный')) {
                            await item.click();
                            console.log('   ✅ Вторичный рынок');
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Xonalar
        console.log('\n9️⃣ Xonalar...');
        try {
            const roomsInput = await page.$('input[data-testid="parameters.number_of_rooms"]');
            if (roomsInput) {
                await scrollToElement(page, roomsInput);
                await roomsInput.click({ clickCount: 3 });
                await sleep(200);
                await roomsInput.type(xonaSoni, { delay: 50 });
                console.log(`   ✅ ${xonaSoni}`);
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Maydon
        console.log('\n🔟 Maydon...');
        try {
            const areaInput = await page.$('input[data-testid="parameters.total_area"]');
            if (areaInput) {
                await scrollToElement(page, areaInput);
                await areaInput.click({ clickCount: 3 });
                await sleep(200);
                await areaInput.type(objectData.m2.toString(), { delay: 50 });
                console.log(`   ✅ ${objectData.m2}`);
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Etaj
        console.log('\n1️⃣1️⃣ Etaj...');
        try {
            const floorInput = await page.$('input[data-testid="parameters.floor"]');
            if (floorInput) {
                await scrollToElement(page, floorInput);
                await floorInput.click({ clickCount: 3 });
                await sleep(200);
                await floorInput.type(etaj, { delay: 50 });
                console.log(`   ✅ ${etaj}`);
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Etajnost
        console.log('\n1️⃣2️⃣ Etajnost...');
        try {
            const floorsInput = await page.$('input[data-testid="parameters.total_floors"]');
            if (floorsInput) {
                await scrollToElement(page, floorsInput);
                await floorsInput.click({ clickCount: 3 });
                await sleep(200);
                await floorsInput.type(etajnost, { delay: 50 });
                console.log(`   ✅ ${etajnost}`);
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Mebel va Komission
        await clickFurnishedAndCommission(page);

        // Joylashuv
        console.log('\n1️⃣5️⃣ Joylashuv...');
        try {
            const locationInput = await page.$('input[data-testid="autosuggest-location-search-input"]');
            if (locationInput) {
                await scrollToElement(page, locationInput);
                await locationInput.click();
                await sleep(500);
                await locationInput.type('Yunusobod', { delay: 100 });
                await sleep(2000);
                const locationOption = await page.waitForSelector('button[data-testid="location-list-item"]', {
                    timeout: 5000
                });
                if (locationOption) {
                    await locationOption.click();
                    console.log('   ✅ Tanlandi');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Telefon
        console.log('\n1️⃣6️⃣ Telefon...');
        try {
            const phoneInput = await page.$('input[data-testid="phone"]');
            if (phoneInput) {
                await scrollToElement(page, phoneInput);
                await phoneInput.click({ clickCount: 3 });
                await sleep(300);
                await phoneInput.press('Backspace');
                await sleep(500);
                await phoneInput.type('998970850604', { delay: 80 });
                console.log('   ✅ Kiritildi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }

        // Final screenshot
        const screenshotAfter = path.join(debugDir, `after-fill-${Date.now()}.png`);
        await page.screenshot({ path: screenshotAfter, fullPage: true });
        console.log('\n📷 Final screenshot:', screenshotAfter);

        console.log('\n' + '='.repeat(60));
        console.log('✅ BARCHA MAYDONLAR TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ FORMA XATO:', error.message);
        console.error('Stack trace:', error.stack);

        try {
            const errorScreenshot = path.join(__dirname, '../../logs', `form-error-${Date.now()}.png`);
            await page.screenshot({ path: errorScreenshot, fullPage: true });
            console.error('📷 Error screenshot:', errorScreenshot);

            const errorHtml = path.join(__dirname, '../../logs', `error-page-${Date.now()}.html`);
            const html = await page.content();
            fs.writeFileSync(errorHtml, html);
            console.error('📝 Error HTML:', errorHtml);
        } catch (screenshotError) {
            console.error('⚠️ Screenshot xato:', screenshotError.message);
        }

        throw error;
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
                    console.log('📷 Screenshot:', screenshotPath);
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
            console.log('📷 Screenshot:', screenshotPath);
            throw new Error('Forma xatolari: ' + formErrors.join(', '));
        }

        if (afterUrl === beforeUrl || afterUrl.includes('/adding/') || afterUrl.includes('/posting/')) {
            console.log('⚠️ URL o\'zgarmadi');
            const screenshotPath = path.join(__dirname, '../../logs', `submit-no-change-${Date.now()}.png`);
            await page.screenshot({path: screenshotPath, fullPage: true});
            console.log('📷 Screenshot:', screenshotPath);
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
        } catch (ssError) {
            // Ignore
        }

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
                return label ? label.textContent : element.name || 'Noma\'lum';
            }, el);
            errors.push(`${text} - noto'g'ri`);
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
            errors.push(`${name} - to'ldirilmagan`);
        }

        return [...new Set(errors)];

    } catch (error) {
        console.log('⚠️ Xato tekshirishda muammo:', error.message);
        return [];
    }
}

/**
 * ✅ ASOSIY FUNKSIYA: OLX ga elon berish (SERVER OPTIMIZED)
 */
async function postToOLX(objectData) {
    console.log('\n🤖 OLX AUTOMATION BOSHLANDI');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);
    console.log('='.repeat(60));

    let browser = null;

    try {
        // 1. Status: processing
        if (objectData.id) {
            console.log('\n📊 Status: waiting → processing');
            await PropertyObject.setProcessing(objectData.id);
        }

        // User data directory
        if (!fs.existsSync(USER_DATA_DIR)) {
            fs.mkdirSync(USER_DATA_DIR, { recursive: true });
            console.log('📁 User data directory yaratildi');
        }

        // ✅ CRITICAL: Server uchun optimallashtirilgan browser config
        console.log('\n🌐 Browser ochilmoqda...');
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
                '--disable-popup-blocking',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            },
            ignoreHTTPSErrors: true,
            timeout: 60000
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

        // Dialog handler
        page.on('dialog', async dialog => {
            console.log('⚠️ Dialog:', dialog.message());
            await dialog.dismiss();
        });

        // OLX.uz ga kirish
        console.log('\n📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // ✅ CRITICAL: Sahifa to'liq yuklanishini kutish
        await waitForPageFullyLoaded(page);

        // Login tekshirish
        console.log('\n🔐 Login tekshirilmoqda...');
        const isLoggedIn = await checkAndWaitForLogin(page);
        if (!isLoggedIn) {
            throw new Error('Login amalga oshmadi');
        }

        console.log('✅ Login muvaffaqiyatli\n');

        // Elon berish sahifasiga
        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // ✅ CRITICAL: Sahifa to'liq yuklanishini kutish
        await waitForPageFullyLoaded(page);

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

        console.log('\n' + '='.repeat(60));
        console.log('✅✅✅ ELON MUVAFFAQIYATLI BERILDI!');
        console.log('🔗 URL:', adUrl);
        console.log('='.repeat(60) + '\n');

        await sleep(3000);
        await browser.close();

        // 2. Status: posted
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
        console.error('\n' + '='.repeat(60));
        console.error('❌❌❌ OLX AUTOMATION XATO');
        console.error('='.repeat(60));
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(60) + '\n');

        // Screenshot
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

        // 3. Status: error
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