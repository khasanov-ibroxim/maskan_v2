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

        const cleanXet = data.xet.replace(/\//g, "_").replace(/'/g, "");
        const cleanTell = data.tell.replace(/\D/g, "");
        const objectFolderName = `${data.kvartil}_${cleanXet}_${data.fio}_${cleanTell}`;
        const objectPath = path.join(xonaPath, objectFolderName);
        ensureDirectoryExists(objectPath);

        for (let i = 0; i < data.rasmlar.length; i++) {
            const imgData = data.rasmlar[i];
            const fileName = `photo_${i + 1}.jpg`;
            saveBase64Image(imgData, fileName, objectPath);
        }

        const { olxText, telegramText } = createAdTexts(data);
        saveTextFile("olx.txt", olxText, objectPath);
        saveTextFile("telegram.txt", telegramText, objectPath);

        const serverUrl = `${req.protocol}://${req.get('host')}`;
        const relativePath = path.relative(UPLOADS_DIR, objectPath).replace(/\\/g, '/');
        const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const folderLink = `${serverUrl}/browse/${encodedPath}`;

        console.log(`✅ Lokal papka yaratildi: ${objectPath}`);
        console.log(`🔗 Browse URL: ${folderLink}`);

        return folderLink;

    } catch (saveError) {
        console.error("❌ Saqlash xatosi:", saveError.message);
        throw saveError;
    }
}

module.exports = { saveFiles };