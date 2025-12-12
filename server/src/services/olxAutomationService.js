// server/src/services/olxAutomationService.js - FULLY FIXED
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const PropertyObject = require('../models/Object.pg');

puppeteer.use(StealthPlugin());

// ============================================
// KONFIGURATSIYA
// ============================================
const TEMP_IMAGES_DIR = path.join(__dirname, '../../temp_olx_images');
const LOGS_DIR = path.join(__dirname, '../../logs');
const CHROME_USER_DATA = path.join(__dirname, '../../chrome-data');

// Ensure directories
[TEMP_IMAGES_DIR, LOGS_DIR, CHROME_USER_DATA].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = (min = 500, max = 2000) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
};

async function scrollToElement(page, element) {
    await page.evaluate(el => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, element);
    await sleep(500);
}

/**
 * ✅ Download images with proper error handling
 */
async function downloadImages(folderLink) {
    console.log('\n📥 RASMLARNI YUKLAB OLISH');
    console.log('='.repeat(60));
    console.log('  Folder Link:', folderLink);

    if (!folderLink || folderLink === "Yo'q") {
        console.log('  ⚠️ Folder link yo\'q');
        return [];
    }

    try {
        const encodedUrl = folderLink.includes('%') ? folderLink : encodeURI(folderLink);
        console.log('  Encoded URL:', encodedUrl);

        const response = await axios.get(encodedUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = response.data;

        const patterns = [
            /href="([^"]+\.(jpg|jpeg|png|webp))"/gi,
            /src="([^"]+\.(jpg|jpeg|png|webp))"/gi,
            /<img[^>]+src="([^"]+)"/gi
        ];

        let imageUrls = new Set();

        patterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            matches.forEach(match => {
                const url = match[1];
                if (!url.includes('thumbnail') && !url.includes('thumb')) {
                    imageUrls.add(url);
                }
            });
        });

        if (imageUrls.size === 0) {
            console.log('  ⚠️ Rasmlar topilmadi HTML da');
            return [];
        }

        console.log(`  📊 Topilgan rasm URL'lar: ${imageUrls.size}`);

        const baseUrl = folderLink.split('/browse/')[0];
        const imageFiles = [];
        const urlArray = Array.from(imageUrls);

        for (let i = 0; i < Math.min(urlArray.length, 8); i++) {
            let imageUrl = urlArray[i];

            if (!imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/')) {
                    imageUrl = baseUrl + imageUrl;
                } else {
                    imageUrl = `${baseUrl}/${imageUrl}`;
                }
            }

            console.log(`  📥 Rasm ${i + 1}: ${imageUrl}`);

            try {
                const imgResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const fileName = `temp_photo_${Date.now()}_${i}.jpg`;
                const filePath = path.join(TEMP_IMAGES_DIR, fileName);

                fs.writeFileSync(filePath, imgResponse.data);
                imageFiles.push(filePath);

                console.log(`    ✅ Saqlandi: ${fileName} (${(imgResponse.data.length / 1024).toFixed(2)} KB)`);
                await sleep(500);

            } catch (imgError) {
                console.error(`    ❌ Rasm yuklab olishda xato: ${imgError.message}`);
            }
        }

        console.log(`\n  ✅ Jami ${imageFiles.length} ta rasm yuklandi`);
        console.log('='.repeat(60));

        return imageFiles;

    } catch (error) {
        console.error('  ❌ Rasmlarni yuklab olishda xato:', error.message);
        return [];
    }
}

/**
 * Clean temp images
 */
function cleanTempImages() {
    try {
        const files = fs.readdirSync(TEMP_IMAGES_DIR);
        let deletedCount = 0;

        files.forEach(file => {
            const filePath = path.join(TEMP_IMAGES_DIR, file);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
            } catch (e) {
                console.error(`❌ O'chirishda xato: ${file}`);
            }
        });

        console.log(`🗑️ ${deletedCount} ta vaqtinchalik rasm o'chirildi`);
    } catch (error) {
        console.error('❌ Temp images tozalashda xato:', error.message);
    }
}

/**
 * Create description
 */
function createDescription(data) {
    const { kvartil, xet, m2, xolati, uy_turi, narx, rieltor, planirovka, balkon , sheet_type } = data;
    const xonaSoni = xet.split("/")[0];
    const etaj = xet.split("/")[1];
    const etajnost = xet.split("/")[2];
    const etajInfo = `${etaj}/${etajnost}`;
    const location = kvartil || 'Yunusobod';
    const formattedPrice = narx.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    let description = `${sheet_type === "Sotuv"?"SOTILADI" :"ARENDA"} - ${location.toUpperCase()}\n${xonaSoni}-xonali kvartira\n\n`;
    description += `ASOSIY MA'LUMOTLAR:\n---\n• Joylashuv: ${location}\n• Xonalar: ${xonaSoni}\n`;
    description += `• Maydon: ${m2} m²\n• Qavat: ${etajInfo}\n`;
    if (uy_turi) description += `• Uy turi: ${uy_turi}\n`;
    if (xolati) description += `• Ta'mir: ${xolati}\n`;
    if (planirovka) description += `• Planirovka: ${planirovka}\n`;
    if (balkon) description += `• Balkon: ${balkon}\n`;
    description += `\nNARX: ${formattedPrice} y.e. (Kelishiladi)\n\n`;

    description += `${sheet_type === "Sotuv"?"ПРОДАЕТСЯ" :"АРЕНДА"} - ${location.toUpperCase()}\n${xonaSoni}-комнатная квартира\n\n`;
    description += `ОСНОВНАЯ ИНФОРМАЦИЯ:\n---\n• Расположение: ${location}\n• Комнат: ${xonaSoni}\n`;
    description += `• Площадь: ${m2} м²\n• Этаж: ${etajInfo}\n`;
    if (uy_turi) description += `• Тип дома: ${uy_turi}\n`;
    if (xolati) description += `• Состояние: ${xolati}\n`;
    if (planirovka) description += `• Планировка: ${planirovka}\n`;
    if (balkon) description += `• Балкон: ${balkon}\n`;
    description += `\nЦЕНА: ${formattedPrice} у.е. (Договорная)\n\n`;
    description += `${rieltor}`;

    return description;
}

/**
 * Take screenshot
 */
async function takeScreenshot(page, name) {
    try {
        const screenshotPath = path.join(LOGS_DIR, `${name}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📷 Screenshot: ${screenshotPath}`);
        return screenshotPath;
    } catch (error) {
        console.error('❌ Screenshot xato:', error.message);
        return null;
    }
}

// ============================================
// MAIN AUTOMATION FUNCTIONS
// ============================================

/**
 * Check and handle login
 */
async function checkAndHandleLogin(page) {
    console.log('\n🔐 LOGIN TEKSHIRUVI');
    console.log('='.repeat(60));

    await sleep(3000);

    const currentUrl = page.url();
    console.log('  Current URL:', currentUrl);

    if (currentUrl.includes('login.olx.uz') || currentUrl.includes('/login')) {
        console.log('  ⚠️ LOGIN SAHIFASIDA - QOLDA LOGIN QILING!');
        console.log('\n📋 QADAMLAR:');
        console.log('  1. Browser oynasida login formani to\'ldiring');
        console.log('  2. Email va parolni kiriting');
        console.log('  3. Login tugmasini bosing');
        console.log('  4. Login bo\'lguncha kuting...\n');



        let loginSuccess = false;
        const maxWaitTime = 5 * 60 * 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            await sleep(5000);

            const newUrl = page.url();
            console.log(`  ⏳ Kutilmoqda... (${Math.floor((Date.now() - startTime) / 1000)}s) - ${newUrl}`);

            if (!newUrl.includes('login.olx.uz') && !newUrl.includes('/login')) {
                loginSuccess = true;
                console.log('  ✅ LOGIN MUVAFFAQIYATLI!');
                console.log('  ✅ Session chrome-data da saqlandi');
                break;
            }
        }

        if (!loginSuccess) {
            throw new Error('Login vaqti tugadi - 5 daqiqa ichida login qilinmadi');
        }
    } else {
        console.log('  ✅ Allaqachon login qilingan (chrome-data dan)');
    }

    console.log('='.repeat(60) + '\n');
}

/**
 * ✅ Check and close alerts - "Нет, начать заново"
 */
async function checkAndCloseAlerts(page) {
    console.log('\n🔔 ALERT TEKSHIRUVI');
    console.log('='.repeat(60));

    try {
        await sleep(3000);

        const modal = await page.$('div[role="dialog"][aria-modal="true"]');

        if (modal) {
            console.log('  ✅ Modal dialog topildi');

            const modalText = await page.evaluate(() => {
                const dialog = document.querySelector('div[role="dialog"][aria-modal="true"]');
                return dialog ? dialog.textContent : '';
            });

            console.log('  📝 Modal matni:', modalText.substring(0, 100) + '...');

            if (modalText.includes('незаконченное объявление') || modalText.includes('продолжить')) {
                console.log('  ✅ "Незаконченное объявление" modal');

                const buttons = await page.$$('div[role="dialog"] button[data-button-variant]');

                for (const button of buttons) {
                    const buttonText = await page.evaluate(el => el.textContent, button);
                    console.log('  🔘 Button topildi:', buttonText);

                    if (buttonText.includes('Нет') || buttonText.includes('начать заново')) {
                        console.log('  ✅ "Нет, начать заново" bosilmoqda...');
                        await button.click();
                        await sleep(2000);
                        console.log('  ✅ Alert yopildi - yangi e\'lon boshlanadi');
                        return true;
                    }
                }

                const tertiaryButton = await page.$('div[role="dialog"] button[data-button-variant="tertiary"]');
                if (tertiaryButton) {
                    console.log('  ✅ Tertiary button (fallback) bosilmoqda...');
                    await tertiaryButton.click();
                    await sleep(2000);
                    console.log('  ✅ Alert yopildi');
                    return true;
                }
            }
        }

        console.log('  ℹ️ Modal dialog topilmadi');
        return false;

    } catch (error) {
        console.error('  ⚠️ Alert tekshirishda xato:', error.message);
        return false;
    } finally {
        console.log('='.repeat(60) + '\n');
    }
}

/**
 * ✅ CRITICAL FIX: Fill OLX form with all missing fields
 */
async function fillOLXForm(page, objectData, imageFiles) {
    try {
        console.log('\n📝 FORMA TO\'LDIRISH');
        console.log('='.repeat(60));

        await sleep(5000);

        const xonaSoni = objectData.xet.split('/')[0];
        const etaj = objectData.xet.split('/')[1];
        const etajnost = objectData.xet.split('/')[2];

        // 1. TITLE
        console.log('\n1️⃣ Sarlavha...');
        const title = `${objectData.sheet_type === "Sotuv"?"SOTILADI" :"ARENDA"} ${objectData.kvartil} ${xonaSoni}-xona`;
        try {
            await page.waitForSelector('[data-testid="posting-title"]', { timeout: 10000 });
            await page.type('[data-testid="posting-title"]', title, { delay: 50 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 2. ✅ IMAGES - CRITICAL FIX
        console.log('\n2️⃣ Rasmlar...');
        if (imageFiles.length > 0) {
            console.log(`  📊 Yuklash uchun tayyor: ${imageFiles.length} ta rasm`);

            // ✅ Verify files exist
            const existingFiles = imageFiles.filter(file => {
                const exists = fs.existsSync(file);
                console.log(`    ${exists ? '✅' : '❌'} ${path.basename(file)}`);
                return exists;
            });

            if (existingFiles.length === 0) {
                console.log('  ❌ Hech qanday rasm topilmadi!');
            } else {
                try {
                    // ✅ CRITICAL: Correct selector
                    const photoInput = await page.$('input[data-testid="attach-photos-input"]');

                    if (!photoInput) {
                        console.log('  ❌ Rasm input elementi topilmadi!');
                        // Try alternative selector
                        const altInput = await page.$('input[type="file"][accept*="image"]');
                        if (altInput) {
                            console.log('  ✅ Alternative input topildi');
                            const filesToUpload = existingFiles.slice(0, 8);
                            await altInput.uploadFile(...filesToUpload);
                            console.log(`  ⏳ ${filesToUpload.length} ta rasm yuklanmoqda...`);
                            await sleep(filesToUpload.length * 2000); // 2s per image
                            console.log(`  ✅ Rasmlar yuklandi`);
                        } else {
                            console.log('  ❌ Hech qanday input topilmadi');
                        }
                    } else {
                        console.log('  ✅ Rasm input topildi');
                        const filesToUpload = existingFiles.slice(0, 8);

                        console.log('  📤 Rasmlar yuklanmoqda...');
                        await photoInput.uploadFile(...filesToUpload);

                        console.log(`  ⏳ ${filesToUpload.length} ta rasm yuklanishini kutish...`);
                        await sleep(filesToUpload.length * 2000); // 2 seconds per image

                        console.log(`  ✅ ${filesToUpload.length} ta rasm yuklandi`);
                    }
                } catch (e) {
                    console.log('  ❌ Rasm yuklashda xato:', e.message);
                    await takeScreenshot(page, 'image-upload-error');
                }
            }
        } else {
            console.log('  ⚠️ Rasmlar yo\'q');
        }
        await sleep(2000);

        // 3. DESCRIPTION
        console.log('\n3️⃣ Tavsif...');
        const description = createDescription(objectData);
        try {
            await page.waitForSelector('[data-testid="posting-description-text-area"]', { timeout: 10000 });
            await page.type('[data-testid="posting-description-text-area"]', description, { delay: 20 });
            console.log('   ✅ Yozildi');
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 4. PRICE
        console.log('\n4️⃣ Narx...');
        const price = objectData.narx.toString().replace(/\s/g, '').replace(/\$/g, '');
        try {
            await page.waitForSelector('[data-testid="price-input"]', { timeout: 10000 });
            await page.click('[data-testid="price-input"]', { clickCount: 3 });
            await page.type('[data-testid="price-input"]', price, { delay: 50 });
            console.log(`   ✅ ${price}`);
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 5. ✅ CRITICAL FIX: NEGOTIABLE (Договорная)
        console.log('\n5️⃣ Договорная...');
        try {
            // Method 1: Direct checkbox click
            const negotiableCheckbox = await page.$('input#nexus-input[type="checkbox"]');
            if (negotiableCheckbox) {
                const isChecked = await page.evaluate(el => el.checked, negotiableCheckbox);
                console.log(`  Joriy holat: ${isChecked ? 'Belgilangan' : 'Belgilanmagan'}`);

                if (!isChecked) {
                    // Click the label to toggle
                    await page.evaluate(() => {
                        const checkbox = document.querySelector('input#nexus-input[type="checkbox"]');
                        if (checkbox && !checkbox.checked) {
                            const label = checkbox.closest('div').querySelector('label');
                            if (label) label.click();
                        }
                    });
                    await sleep(500);
                    console.log('  ✅ Договорная belgilandi');
                } else {
                    console.log('  ℹ️ Allaqachon belgilangan');
                }
            } else {
                console.log('  ⚠️ Checkbox topilmadi');
            }
        } catch (e) {
            console.log('  ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 6. CURRENCY
        console.log('\n6️⃣ Valyuta...');
        try {
            const currencyButton = await page.$('.n-referenceinput-button');
            if (currencyButton) {
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
        await sleep(500);

        // 7. PRIVATE PERSON
        console.log('\n7️⃣ Shaxsiy shaxs...');
        try {
            const privateButton = await page.$('button[data-testid="private_business_private_unactive"]');
            if (privateButton) {
                await scrollToElement(page, privateButton);
                await privateButton.click();
                console.log('   ✅ "Частное лицо" tanlandi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 8. TYPE OF MARKET
        console.log('\n8️⃣ Тип жилья (Вторичный рынок)...');
        try {
            const typeDropdown = await page.$('div[data-testid="dropdown"][data-cy="parameters.type_of_market"]');
            if (typeDropdown) {
                await scrollToElement(page, typeDropdown);
                const dropdownButton = await typeDropdown.$('button.n-referenceinput-button');
                if (dropdownButton) {
                    await dropdownButton.click();
                    await sleep(1500);
                    const menuItems = await page.$$('div[data-testid="dropdown-menu-item"] a');
                    for (const item of menuItems) {
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 9. ROOMS
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 10. AREA
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 11. FLOOR
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 12. TOTAL FLOORS
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 13. ✅ CRITICAL FIX: FURNISHED (Меблирована - Нет)
        console.log('\n1️⃣3️⃣ Меблирована (Нет)...');
        try {
            const furnishedNo = await page.$('button[data-testid="parameters.furnished_no_unactive"]');
            if (furnishedNo) {
                await scrollToElement(page, furnishedNo);
                await furnishedNo.click();
                await sleep(500);
                console.log('   ✅ "Нет" tanlandi');
            } else {
                console.log('   ⚠️ Furnished button topilmadi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 13a. ✅ NEW: COMMISSION (Комиссионные - Нет)
        console.log('\n1️⃣3️⃣a Комиссионные (Нет)...');
        try {
            const commissionNo = await page.$('button[data-testid="parameters.comission_no_unactive"]');
            if (commissionNo) {
                await scrollToElement(page, commissionNo);
                await commissionNo.click();
                await sleep(500);
                console.log('   ✅ "Нет" tanlandi');
            } else {
                console.log('   ⚠️ Commission button topilmadi');
            }
        } catch (e) {
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(500);

        // 14. LOCATION
        console.log('\n1️⃣4️⃣ Joylashuv (Yunusobod)...');
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        // 15. PHONE
        console.log('\n1️⃣5️⃣ Telefon raqam...');
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
            console.log('   ⚠️ Xato:', e.message);
        }
        await sleep(1000);

        console.log('\n✅ FORMA TO\'LDIRILDI');
        console.log('='.repeat(60) + '\n');


    } catch (error) {
        console.error('❌ FORMA XATO:', error.message);
        await takeScreenshot(page, 'form-error');
        throw error;
    }
}

/**
 * Submit ad
 */
async function submitAd(page) {
    console.log('\n🚀 E\'LONNI BERISH');
    console.log('='.repeat(60));

    try {
        const submitButton = await page.$('button[data-testid="submit-btn"]');

        if (!submitButton) {
            throw new Error('Submit tugma topilmadi');
        }

        console.log('  ✅ Submit tugma topildi');


        await submitButton.click();
        console.log('  ✅ Submit tugma bosildi');

        await sleep(5000);

        await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 10000
        }).catch(() => {
            console.log('  ℹ️ Navigation timeout');
        });

        await sleep(3000);

        const finalUrl = page.url();
        console.log('  Final URL:', finalUrl);


        if (!finalUrl.includes('/adding')) {
            console.log('\n✅ E\'LON BERILDI!');
            console.log('  URL:', finalUrl);
            console.log('='.repeat(60) + '\n');
            return finalUrl;
        } else {
            throw new Error('E\'lon berilmadi - hali /adding da');
        }

    } catch (error) {
        console.error('  ❌ Submit xato:', error.message);
        throw error;
    }
}

/**
 * Submit ad
 */
async function submitAd(page) {
    console.log('\n🚀 E\'LONNI BERISH');
    console.log('='.repeat(60));

    try {
        const submitButton = await page.$('button[data-testid="submit-btn"]');

        if (!submitButton) {
            throw new Error('Submit tugma topilmadi');
        }

        console.log('  ✅ Submit tugma topildi');


        await submitButton.click();
        console.log('  ✅ Submit tugma bosildi');

        await sleep(5000);

        await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 30000
        }).catch(() => {
            console.log('  ℹ️ Navigation timeout');
        });

        await sleep(3000);

        const finalUrl = page.url();
        console.log('  Final URL:', finalUrl);


        if (!finalUrl.includes('/adding')) {
            console.log('\n✅ E\'LON BERILDI!');
            console.log('  URL:', finalUrl);
            console.log('='.repeat(60) + '\n');
            return finalUrl;
        } else {
            throw new Error('E\'lon berilmadi - hali /adding da');
        }

    } catch (error) {
        console.error('  ❌ Submit xato:', error.message);
        throw error;
    }
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * ✅ FIXED: Post ad to OLX with all fixes
 */
async function postToOLXLocal(objectData) {
    console.log('\n🤖 OLX LOCAL AUTOMATION');
    console.log('='.repeat(60));
    console.log('  ID:', objectData.id);
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);
    console.log('  Rasmlar URL:', objectData.rasmlar);
    console.log('='.repeat(60) + '\n');

    let browser = null;
    let page = null;
    let imageFiles = [];

    try {
        await PropertyObject.setProcessing(objectData.id);

        // ✅ CRITICAL: Download images first
        console.log('\n📥 RASMLARNI YUKLAB OLISH BOSHLANDI');
        imageFiles = await downloadImages(objectData.rasmlar);
        console.log(`📊 Yuklangan rasmlar: ${imageFiles.length} ta`);

        if (imageFiles.length === 0) {
            console.log('⚠️ OGOHLANTIRISH: Rasmlar yuklanmadi!');
            console.log('  Sabablari:');
            console.log('  1. Folder link noto\'g\'ri');
            console.log('  2. Server rasmlarni qaytarmayapti');
            console.log('  3. Network xatosi');
            console.log('\n  Davom ettirilmoqda (rasmlar)...\n');
        }

        console.log('\n🚀 BROWSER OCHILMOQDA');
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: CHROME_USER_DATA,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ],
            defaultViewport: null,
            ignoreHTTPSErrors: true,
            timeout: 120000,
            ignoreDefaultArgs: ['--enable-automation']
        });

        page = await browser.newPage();
        console.log('✅ Browser ochildi\n');

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'uz'] });
            window.chrome = { runtime: {} };
        });

        console.log('📝 /adding sahifasiga o\'tish...');
        await page.goto('https://www.olx.uz/adding/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await checkAndHandleLogin(page);
        await checkAndCloseAlerts(page);
        await fillOLXForm(page, objectData, imageFiles);

        const adUrl = await submitAd(page);

        cleanTempImages();

        await page.close();
        await browser.close();

        await PropertyObject.setPosted(objectData.id, adUrl);

        console.log('\n✅✅✅ MUVAFFAQIYAT!');
        console.log('='.repeat(60));
        console.log('  E\'lon URL\'i:', adUrl);
        console.log('  Object ID:', objectData.id);
        console.log('='.repeat(60));

        return {
            success: true,
            adUrl,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('\n❌❌❌ XATO:', error.message);
        console.error('='.repeat(60));

        if (page) {
            await takeScreenshot(page, 'final-error');
        }

        try {
            cleanTempImages();
            if (page) await page.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});
        } catch (e) {}

        await PropertyObject.setError(objectData.id, error.message).catch(err => {
            console.error('❌ Status error ga o\'zgarmadi:', err.message);
        });

        throw error;
    }
}

module.exports = {
    postToOLXLocal,
    cleanTempImages
};