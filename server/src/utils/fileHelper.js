// server/src/utils/fileHelper.js - ✅ FIXED: phone_for_ad with Global Config fallback

const fs = require('fs');
const path = require('path');

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Papka yaratildi: ${dirPath}`);
    }
}

function saveBase64Image(base64Data, fileName, folderPath) {
    try {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error("Noto'g'ri base64 format");
        }

        const base64Content = matches[2];
        const buffer = Buffer.from(base64Content, "base64");

        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, buffer);

        console.log(`✅ Rasm saqlandi: ${fileName} (${(buffer.length / 1024).toFixed(2)} KB)`);
        return filePath;

    } catch (error) {
        console.error(`❌ Rasm saqlashda xato (${fileName}):`, error.message);
        throw error;
    }
}

function saveTextFile(fileName, content, folderPath) {
    try {
        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`✅ Matn fayl saqlandi: ${fileName}`);
        return filePath;
    } catch (error) {
        console.error(`❌ Matn fayl saqlashda xato (${fileName}):`, error.message);
        throw error;
    }
}

/**
 * ✅ CRITICAL FIX: Use phone_for_ad with Global Config fallback
 *
 * Priority:
 * 1. data.phoneForAd (from dataController - individual rieltor or company phone)
 * 2. Global Config company_phone (fallback)
 * 3. Hardcoded default +998970850604
 *
 * @param {Object} data - Object data
 * @returns {Promise<Object>} - { olxText, telegramText }
 */
async function createAdTexts(data) {
    const {
        kvartil, xet, m2, xolati, uy_turi, balkon, narx,
        planirovka, sheetType, rieltor, phoneForAd
    } = data;

    const xonaSoni = xet.split("/")[0] || "1";
    const parts = xet.split("/");
    const etajInfo = `${parts[1] || "1"}/${parts[2] || "1"}`;
    const formattedNarx = String(narx).replace(/\s/g, " ");

    // ✅ CRITICAL: Determine phone with fallback chain
    let phoneNumber = phoneForAd;

    if (!phoneNumber) {
        console.log('⚠️ phoneForAd yo\'q - Global Config\'dan olish...');

        try {
            // ✅ Get from Global Config
            const AppSettings = require('../models/AppSettings.pg');
            const globalConfig = await AppSettings.getGlobalConfig();
            phoneNumber = globalConfig.company_phone || '+998970850604';

            console.log(`  ✅ Global Config company_phone: ${phoneNumber}`);
        } catch (error) {
            console.error('  ❌ Global Config olishda xato:', error.message);
            phoneNumber = '+998970850604'; // Hardcoded fallback
            console.log(`  ℹ️ Default telefon ishlatiladi: ${phoneNumber}`);
        }
    }

    console.log('\n📱 TXT FAYLLAR UCHUN TELEFON:');
    console.log('  Rieltor:', rieltor);
    console.log('  phoneForAd (from data):', phoneForAd || 'NULL');
    console.log('  Final Phone:', phoneNumber);

    // ✅ Create OLX text
    const olxText = `${sheetType === "Sotuv" ? "Sotuvda" : "Ijaraga beriladi"} — ${kvartil}, ${xonaSoni} хона

- Qavat: ${etajInfo}
- Maydoni: ${m2} м²
- Remont: ${xolati || "—"}
- Uy turi: ${uy_turi || "—"}
${planirovka ? `• Planirovka: ${planirovka}\n` : ""}${balkon ? `• Balkon: ${balkon}\n` : ""}• Narxi: ${formattedNarx} $
- Aloqa uchun: ${phoneNumber}

#realestate #${kvartil.replace(/\s+/g, "")} #${xonaSoni}xona #Tashkent #Yunusobod #RTD #${rieltor}`;

    // ✅ Create Telegram text
    const telegramText = `🏠 ${sheetType === "Sotuv" ? "Sotuvda" : "Ijaraga beriladi"} — ${kvartil}, ${xonaSoni} хона

🏢 Qavat: ${etajInfo}
📐 Maydoni: ${m2} м²
🧱 Remont: ${xolati || "—"}
🏢 Uy turi: ${uy_turi || "—"}
${planirovka ? `📋 Planirovka: ${planirovka}\n` : ""}${balkon ? `🏗 Balkon: ${balkon}\n` : ""}💰 Narxi: ${formattedNarx} $
📞 Aloqa uchun: ${phoneNumber}

Rieltor: #${rieltor}`;

    return { olxText, telegramText };
}

module.exports = {
    ensureDirectoryExists,
    saveBase64Image,
    saveTextFile,
    createAdTexts
};