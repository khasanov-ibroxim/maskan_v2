// server/src/services/olxAutomationService.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// OLX login ma'lumotlari
const OLX_EMAIL = process.env.OLX_EMAIL;
const OLX_PASSWORD = process.env.OLX_PASSWORD;

// User data directory - session saqlash uchun
const USER_DATA_DIR = path.join(__dirname, '../../.chrome-data');

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
 * Tavsif yaratish
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, narx, opisaniya, planirovka, balkon, rieltor } = data;
    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;

    // Asosiy joy nomi (masalan: Yunusobod-1)
    const location = kvartil || 'Yunusobod';

    // Rielter ismi (default: Aziz)
    const agentName = rieltor || 'Maskan_lux';

    // Tavsif qismlari
    let description = `Sotiladi — ${location}, ${xonaSoni} хона\n\n`;

    // Majburiy maydonlar
    description += `• Qavat: ${etajInfo}\n`;
    description += `• Maydoni: ${m2} м²\n`;

    // Ixtiyoriy maydonlar
    if (xolati) {
        description += `• Remont: ${xolati}\n`;
    }

    if (uy_turi) {
        description += `• Uy turi: ${uy_turi}\n`;
    }

    if (planirovka) {
        description += `• Planirovka: ${planirovka}\n`;
    }

    if (balkon) {
        description += `• Balkon: ${balkon}\n`;
    }

    // Narx
    description += `• Narxi: ${narx}\n`;

    // Telefon
    description += `\n• Aloqa uchun: +998 97 085 06 04\n\n`;

    // Hashtaglar
    const hashtags = [
        '#realestate',
        `#${location.replace(/\s+/g, '')}`,
        `#${xonaSoni}xona`,
        '#Tashkent',
        '#Yunusobod',
        '#RTD',
        `#${agentName}`
    ];

    description += hashtags.join(' ');

    return description;
}

/**
 * ✅ TO'LIQ ELON FORMASINI TO'LDIRISH
 */
async function fillAdForm(page, objectData) {
    try {
        console.log('\n📝 ELON FORMASINI TO\'LDIRISH');
        console.log('='.repeat(60));

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // ✅ 1. TITLE
        console.log('\n1️⃣ Sarlavha (Title)...');
        const title = `Sotiladi ${objectData.kvartil} ${xonaSoni}-xona`;
        console.log(`   "${title}"`);

        const titleInput = await page.waitForSelector('[data-testid="posting-title"]', {
            timeout: 10000
        });

        await scrollToElement(page, titleInput);
        await titleInput.click({ clickCount: 3 });
        await sleep(500);
        await titleInput.type(title, { delay: 80 });
        console.log('   ✅ Yozildi');
        await sleep(1000);

        // ✅ 2. RASMLAR
        if (objectData.rasmlar && objectData.rasmlar !== "Yo'q") {
            console.log('\n2️⃣ Rasmlar...');
            await uploadImagesNew(page, objectData);
        } else {
            console.log('\n2️⃣ Rasmlar: Yo\'q');
        }
        await sleep(500);

        // ✅ 3. TAVSIF
        console.log('\n3️⃣ Tavsif (Description)...');
        const description = createDescription(objectData);
        console.log('   Preview:', description.substring(0, 100) + '...');

        const descriptionArea = await page.waitForSelector('[data-testid="posting-description-text-area"]', {
            timeout: 10000
        });

        await scrollToElement(page, descriptionArea);
        await descriptionArea.click();
        await sleep(500);
        await descriptionArea.type(description, { delay: 30 });
        console.log('   ✅ Yozildi');
        await sleep(1000);

        // ✅ 4. NARX
        console.log('\n4️⃣ Narx...');
        const price = objectData.narx.replace(/\s/g, '').replace(/\$/g, '');

        const priceInput = await page.waitForSelector('[data-testid="price-input"]', {
            timeout: 10000
        });

        await scrollToElement(page, priceInput);
        await priceInput.click({ clickCount: 3 });
        await sleep(300);
        await priceInput.type(price, { delay: 50 });
        console.log(`   ✅ ${price}`);
        await sleep(1000);

        // ✅ 5. DOGOVORНАЯ CHECKBOX - TUZATILGAN
        console.log('\n5️⃣ Договорная...');
        try {
            // Barcha checkboxlarni topish
            const allCheckboxes = await page.$('input[type="checkbox"]');
            console.log(`   ℹ️ ${allCheckboxes.length} ta checkbox topildi`);

            for (let i = 0; i < allCheckboxes.length; i++) {
                const checkbox = allCheckboxes[i];
                const id = await page.evaluate(el => el.id, checkbox);
                const isChecked = await page.evaluate(el => el.checked, checkbox);

                console.log(`   Checkbox ${i + 1}: id="${id}", checked=${isChecked}`);

                // Nexus-input topilsa
                if (id && id.includes('nexus-input')) {
                    console.log('   🎯 Договорная checkbox topildi!');

                    await scrollToElement(page, checkbox);

                    if (!isChecked) {
                        // Parent div orqali bosish
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

        // ✅ 6. VALYUTA - у.е.
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

        // ✅ 7. SHAXSIY SHAXS
        console.log('\n7️⃣ Shaxsiy shaxs...');
        try {
            const privateButton = await page.$('button[data-testid="private_business_private_unactive"]');
            if (privateButton) {
                await scrollToElement(page, privateButton);
                await privateButton.click();
                console.log('   ✅ "Частное лицо" tanlandi');
            }
        } catch (e) {
            console.log('   ⚠️ Shaxsiy shaxs xato');
        }
        await sleep(500);

        // ✅ 8. TIP JILYA (Вторичный рынок)
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

        // ✅ 9. XONALAR SONI
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

        // ✅ 10. UMUMIY MAYDON
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

        // ✅ 11. ETAJ
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

        // ✅ 12. ETAJNOST
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

        // ✅ 13-14. МЕБЛИРОВАНА VA КОМИССИОННЫЕ - FAQAT 1 MARTA!
        await clickFurnishedAndCommission(page);
        await sleep(500);

        // ✅ 15. JOYLASHUV - YUNUSOBOD
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

        // ✅ 16. TELEFON RAQAM
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

        console.log('\n' + '='.repeat(60));
        console.log('✅ BARCHA MAYDONLAR TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ FORMA XATO:', error.message);

        const screenshotPath = path.join(__dirname, '../../logs', `form-error-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error('📷 Screenshot:', screenshotPath);

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

        // Xatolarni tekshirish (to'g'ri usul bilan)
        try {
            const errorElements = await page.$('[class*="error"], [class*="alert"], [aria-invalid="true"]');

            if (errorElements.length > 0) {
                console.log(`⚠️ ${errorElements.length} ta xato elementi topildi`);

                const errors = [];
                for (const el of errorElements) {
                    const text = await page.evaluate(element => element.textContent, el);
                    if (text && text.trim().length > 0 && text.trim().length < 200) {
                        errors.push(text.trim());
                    }
                }

                if (errors.length > 0) {
                    console.log('❌ Xatolar:', errors);

                    // Screenshot
                    const screenshotPath = path.join(__dirname, '../../logs', `form-errors-${Date.now()}.png`);
                    await page.screenshot({path: screenshotPath, fullPage: true});
                    console.log('📷 Screenshot:', screenshotPath);

                    throw new Error('Formada xatolar: ' + errors.join(', '));
                }
            }
        } catch (errorCheckError) {
            console.log('ℹ️ Xato tekshirish o\'tkazildi (xato topilmadi)');
        }

        // Muvaffaqiyat tekshirish
        if (afterUrl !== beforeUrl) {
            if (!afterUrl.includes('/adding/') && !afterUrl.includes('/posting/')) {
                console.log('✅ Elon berildi!');
                console.log('='.repeat(60) + '\n');
                return afterUrl;
            }
        }

        // Agar URL o'zgarmagan bo'lsa - ehtimol xato bor
        console.log('⚠️ URL o\'zgarmadi - formada xato bo\'lishi mumkin');

        // Screenshot
        const screenshotPath = path.join(__dirname, '../../logs', `submit-no-change-${Date.now()}.png`);
        await page.screenshot({path: screenshotPath, fullPage: true});
        console.log('📷 Screenshot:', screenshotPath);
        console.log('💡 Browserda natijani tekshiring');
        console.log('='.repeat(60) + '\n');

        return beforeUrl;

    } catch (error) {
        console.error('❌ Submit xato:', error.message);

        // Screenshot
        const screenshotPath = path.join(__dirname, '../../logs', `submit-error-${Date.now()}.png`);
        await page.screenshot({path: screenshotPath, fullPage: true});
        console.log('📷 Screenshot:', screenshotPath);

        throw error;
    }
}



async function postToOLX(objectData) {
    console.log('\n🤖 OLX automation boshlandi...');
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    let browser = null;

    try {
        if (!fs.existsSync(USER_DATA_DIR)) {
            fs.mkdirSync(USER_DATA_DIR, { recursive: true });
            console.log('📁 User data directory yaratildi');
        }

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

        console.log('📱 OLX.uz ga kirilmoqda...');
        await page.goto('https://www.olx.uz', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await sleep(3000);

        const isLoggedIn = await checkAndWaitForLogin(page);
        if (!isLoggedIn) {
            throw new Error('Login amalga oshmadi');
        }

        console.log('✅ Login muvaffaqiyatli\n');

        console.log('📝 Elon berish sahifasiga o\'tilmoqda...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await sleep(5000);

        // ✅ Alert yopish (eski elon)
        await closeUnfinishedAdAlert(page);

        // ✅ Login tekshirish
        const stillLoggedIn = await checkLoginStatus(page);
        if (!stillLoggedIn) {
            console.log('⚠️ Login kerak, kutilmoqda...');
            await waitForManualLogin(page, 120);
        }

        // ✅ Forma to'ldirish
        console.log('✍️ Ma\'lumotlar to\'ldirilmoqda...');
        await fillAdForm(page, objectData);

        // ✅ Submit
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

        throw error;
    }
}

module.exports = {
    postToOLX
};
