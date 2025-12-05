const path = require('path');

// ⚠️ MUHIM: Faqat CLIENT'dan kelgan pathlarni bloklash kerak
// Multer internal temp ishlatishi mumkin
const IGNORED_FOLDERS = ['uploads', 'storage'];

/**
 * Faylni tekshirish - uploads, storage papkalarini ignore qilish
 * TEMP papka multer uchun ruxsat berilgan (internal use)
 */
function isPathIgnored(filePath) {
    if (!filePath) return false;

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    return IGNORED_FOLDERS.some(folder => {
        return normalizedPath.includes(`/${folder}/`) ||
            normalizedPath.startsWith(`${folder}/`) ||
            normalizedPath === folder;
    });
}

/**
 * Request body'dagi pathlarni filter qilish middleware
 * Browse va download operations uchun
 */
const filterIgnoredPaths = (req, res, next) => {
    const pathsToCheck = [];

    // ✅ GET requestlar uchun params tekshirish
    if (req.params && req.params[0]) {
        pathsToCheck.push(req.params[0]);
    }

    // ✅ POST requestlar uchun body tekshirish
    if (req.body) {
        if (req.body.path) pathsToCheck.push(req.body.path);
        if (req.body.filePath) pathsToCheck.push(req.body.filePath);
        if (req.body.folderPath) pathsToCheck.push(req.body.folderPath);

        // Files array tekshirish (download-zip uchun)
        if (Array.isArray(req.body.files)) {
            pathsToCheck.push(...req.body.files);
        }
    }

    // ✅ Query params tekshirish
    if (req.query && req.query.path) {
        pathsToCheck.push(req.query.path);
    }

    // Ignored pathlarni tekshirish
    for (const pathToCheck of pathsToCheck) {
        if (isPathIgnored(pathToCheck)) {
            console.log(`⚠️ Ignored path blocked: ${pathToCheck}`);
            return res.status(403).json({
                success: false,
                error: 'Bu papkaga kirish taqiqlangan (uploads, storage)',
                path: pathToCheck
            });
        }
    }

    next();
};

/**
 * Multer uchun file filter
 * TEMP papkani tekshirmaydi (multer o'zi ishlatadi)
 */
const fileFilterForUpload = (req, file, cb) => {
    // Multer allaqachon TEMP_DIR ishlatadi, uni bloklash shart emas
    // Faqat file type'ni tekshirish
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Faqat rasm fayllari ruxsat etilgan!'), false);
    }
};

// ✅ CRITICAL FIX: To'g'ri export
module.exports = {
    filterIgnoredPaths,
    fileFilterForUpload,
    isPathIgnored
};