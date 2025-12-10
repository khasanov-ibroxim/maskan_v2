const path = require('path');
const { ensureDirectoryExists, saveBase64Image, saveTextFile, createAdTexts } = require('../utils/fileHelper');
const { UPLOADS_DIR } = require('../config/constants');

async function saveFiles(data, req) {
    if (!data.rasmlar || data.rasmlar.length === 0) {
        return null;
    }

    try {
        console.log("\n💾 Lokal saqlash boshlandi...");

        const xonaSoni = data.xet.split("/")[0] || "1";
        const kvartilPath = path.join(UPLOADS_DIR, data.kvartil);
        ensureDirectoryExists(kvartilPath);

        const xonaPath = path.join(kvartilPath, `${xonaSoni} xona`);
        ensureDirectoryExists(xonaPath);

        // ✅ CRITICAL FIX: Unique folder nomi yaratish
        const cleanXet = data.xet.replace(/\//g, "_").replace(/'/g, "");
        const cleanTell = data.tell.replace(/\D/g, "");

        // ✅ Timestamp qo'shish (milliseconds bilan)
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().slice(0, 10); // 2024-12-10

        // ✅ VARIANT 1: Timestamp bilan
        const objectFolderName = `${data.kvartil}_${cleanXet}_${data.fio}_${cleanTell}_${timestamp}`;

        // ✅ VARIANT 2: Sana va vaqt bilan (o'qish uchun qulay)
        // const timeStr = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
        // const objectFolderName = `${data.kvartil}_${cleanXet}_${data.fio}_${cleanTell}_${dateStr}_${timeStr}`;

        const objectPath = path.join(xonaPath, objectFolderName);
        ensureDirectoryExists(objectPath);

        console.log(`📁 Folder nomi: ${objectFolderName}`);

        for (let i = 0; i < data.rasmlar.length; i++) {
            const imgData = data.rasmlar[i];
            const fileName = `photo_${i + 1}.jpg`;
            saveBase64Image(imgData, fileName, objectPath);
        }

        const { olxText, telegramText } = createAdTexts(data);
        saveTextFile("olx.txt", olxText, objectPath);
        saveTextFile("telegram.txt", telegramText, objectPath);

        // ✅ CRITICAL FIX: Contabo uchun to'g'ri URL
        const protocol = req.protocol;
        const host = req.get('host');

        // ✅ Environment variable orqali base URL ni belgilash (ixtiyoriy)
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

        console.log('  Base URL:', baseUrl);
        console.log('  Protocol:', protocol);
        console.log('  Host:', host);

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
