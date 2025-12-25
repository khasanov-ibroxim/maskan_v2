// server/src/utils/fileHelper.js - ✅ FIXED: Individual Rieltor Phone

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
 * ✅ CRITICAL FIX: Use phone_for_ad (individual rieltor phone if available)
 */
function createAdTexts(data) {
    const {
        kvartil, xet, m2, xolati, uy_turi, balkon, narx,
        planirovka, sheetType, rieltor, phone_for_ad
    } = data;

    const xonaSoni = xet.split("/")[0] || "1";
    const parts = xet.split("/");
    const etajInfo = `${parts[1] || "1"}/${parts[2] || "1"}`;
    const formattedNarx = String(narx).replace(/\s/g, " ");

    // ✅ CRITICAL: Use phone_for_ad (individual rieltor or company phone)
    const phoneNumber = phone_for_ad || '+998970850604';

    console.log('📱 TXT FAYLLAR UCHUN TELEFON:');
    console.log('  Rieltor:', rieltor);
    console.log('  Phone for Ad:', phoneNumber);

    const olxText = `${sheetType === "Sotuv" ? "Sotuvda" : "Ijaraga beriladi"} — ${kvartil}, ${xonaSoni} хона

- Qavat: ${etajInfo}
- Maydoni: ${m2} м²
- Remont: ${xolati || "—"}
- Uy turi: ${uy_turi || "—"}
${planirovka ? `• Planirovka: ${planirovka}\n` : ""}${balkon ? `• Balkon: ${balkon}\n` : ""}• Narxi: ${formattedNarx} $
- Aloqa uchun: ${phoneNumber}

#realestate #${kvartil.replace(/\s+/g, "")} #${xonaSoni}xona #Tashkent #Yunusobod #RTD #${rieltor}`;

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