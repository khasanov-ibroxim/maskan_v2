// server/src/services/fileService.js - ✅ FIXED: Pass phoneForAd to createAdTexts

const path = require('path');
const { ensureDirectoryExists, saveBase64Image, saveTextFile, createAdTexts } = require('../utils/fileHelper');
const { UPLOADS_DIR } = require('../config/constants');

/**
 * ✅ FIXED: Accept phoneForAd and pass to createAdTexts
 */
async function saveFiles(data, req, phoneForAd) {
    if (!data.rasmlar || data.rasmlar.length === 0) {
        return null;
    }

    try {
        console.log("\n💾 Lokal saqlash boshlandi...");
        console.log("  📱 phoneForAd:", phoneForAd || 'NULL');

        const xonaSoni = data.xet.split("/")[0] || "1";
        const kvartilPath = path.join(UPLOADS_DIR, data.kvartil);
        ensureDirectoryExists(kvartilPath);

        const xonaPath = path.join(kvartilPath, `${xonaSoni} xona`);
        ensureDirectoryExists(xonaPath);

        // ✅ Unique folder name with timestamp
        const cleanXet = data.xet.replace(/\//g, "_").replace(/'/g, "");
        const cleanTell = data.tell.replace(/\D/g, "");
        const timestamp = Date.now();

        const objectFolderName = `${data.kvartil}_${cleanXet}_${data.fio}_${cleanTell}_${timestamp}`;
        const objectPath = path.join(xonaPath, objectFolderName);
        ensureDirectoryExists(objectPath);

        console.log(`📁 Folder nomi: ${objectFolderName}`);

        // Save images
        for (let i = 0; i < data.rasmlar.length; i++) {
            const imgData = data.rasmlar[i];
            const fileName = `photo_${i + 1}.jpg`;
            saveBase64Image(imgData, fileName, objectPath);
        }

        // ✅ CRITICAL: Pass phoneForAd to createAdTexts (async call)
        const dataWithPhone = {
            ...data,
            phoneForAd: phoneForAd  // ✅ Add phoneForAd to data
        };

        const { olxText, telegramText } = await createAdTexts(dataWithPhone);

        saveTextFile("olx.txt", olxText, objectPath);
        saveTextFile("telegram.txt", telegramText, objectPath);

        // ✅ Create browse URL
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

        const relativePath = path.relative(UPLOADS_DIR, objectPath).replace(/\\/g, '/');
        const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const folderLink = `${baseUrl}/browse/${encodedPath}`;

        console.log(`✅ Lokal papka yaratildi: ${objectPath}`);
        console.log(`🔗 Browse URL: ${folderLink}`);

        return folderLink;

    } catch (saveError) {
        console.error("❌ Saqlash xatosi:", saveError.message);
        throw saveError;
    }
}

module.exports = { saveFiles };