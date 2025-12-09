// src/routes/file.routes.js
const express = require('express');
const { downloadZip, browsePath } = require('../controllers/fileController');
const archiver = require('archiver');
const { UPLOADS_DIR } = require('../config/constants');

const router = express.Router();

// ============================================
// PUBLIC ROUTES - Auth kerak emas!
// ============================================

// ZIP yuklab olish
// Full path: /download-zip (chunki app.js da prefix yo'q)
router.post('/download-zip', (req, res) => {
    console.log('📦 /download-zip endpoint\'ga so\'rov keldi');
    downloadZip(req, res);
});
/**
 * Uploads papkasini ZIP'ga yuklab olish
 * GET /download-uploads-zip
 */
router.get('/download-uploads-zip', async (req, res) => {
    try {
        console.log('📦 Uploads ZIP yaratilmoqda...');

        // ZIP fayl nomi
        const zipFileName = `uploads_backup_${Date.now()}.zip`;

        // Headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        // Archiver yaratish
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maksimal kompressiya
        });

        // Error handling
        archive.on('error', (err) => {
            console.error('❌ ZIP yaratishda xato:', err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        });

        // Warning handler
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('⚠️ ZIP warning:', err);
            } else {
                throw err;
            }
        });

        // Progress tracking
        let fileCount = 0;
        archive.on('entry', (entry) => {
            fileCount++;
            if (fileCount % 10 === 0) {
                console.log(`  📄 ${fileCount} ta fayl qo'shildi...`);
            }
        });

        // Pipe to response
        archive.pipe(res);

        // Uploads papkasini qo'shish
        console.log('📁 Uploads papka qoshilmoqda...');
        archive.directory(UPLOADS_DIR, 'uploads');

        // Finalize
        await archive.finalize();

        const totalBytes = archive.pointer();
        const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

        console.log('✅ ZIP yaratildi:');
        console.log(`  Jami fayllar: ${fileCount}`);
        console.log(`  Hajmi: ${totalMB} MB`);

    } catch (error) {
        console.error('❌ Uploads ZIP xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Yoki faqat bitta papkani yuklab olish
/**
 * Muayyan papkani ZIP'ga yuklab olish
 * POST /download-folder-zip
 * Body: { path: "Yunusobod - 1/2 xona/..." }
 */
router.post('/download-folder-zip', async (req, res) => {
    try {
        const { path: folderPath } = req.body;

        if (!folderPath) {
            return res.status(400).json({
                success: false,
                error: 'Papka yo\'li kiritilmagan'
            });
        }

        console.log('📦 Papka ZIP yaratilmoqda:', folderPath);

        const fullPath = path.join(UPLOADS_DIR, folderPath);

        // Papka mavjudligini tekshirish
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                error: 'Papka topilmadi'
            });
        }

        // Papka ekanligini tekshirish
        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                error: 'Bu fayl, papka emas'
            });
        }

        // ZIP fayl nomi
        const folderName = path.basename(folderPath);
        const zipFileName = `${folderName}_${Date.now()}.zip`;

        // Headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        // Archiver
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('❌ ZIP xato:', err);
            res.status(500).json({ error: err.message });
        });

        archive.pipe(res);

        // Papkani qo'shish
        archive.directory(fullPath, false);

        await archive.finalize();

        console.log('✅ Papka ZIP yaratildi:', zipFileName);

    } catch (error) {
        console.error('❌ Papka ZIP xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// File browser - REGEX PATTERN (Express v5+ uchun)
// Full path: /browse yoki /browse/anything/nested
// ✅ FIXED - Regex pattern ishlatamiz
router.get(/^\/browse\/?(.*)/, (req, res) => {
    // req.params[0] regex capture group dan keladi
    const requestedPath = req.params[0] || '';
    console.log('📁 /browse endpoint\'ga so\'rov keldi:', requestedPath || 'root');

    browsePath(req, res);
});

module.exports = router;