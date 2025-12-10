// src/routes/file.routes.js - FIXED
const express = require('express');
const path = require('path'); // ✅ ADDED
const fs = require('fs'); // ✅ ADDED
const archiver = require('archiver');
const { downloadZip, browsePath } = require('../controllers/fileController');
const { UPLOADS_DIR } = require('../config/constants');

const router = express.Router();

// ============================================
// PUBLIC ROUTES - Auth kerak emas!
// ============================================

// ZIP yuklab olish
router.post('/download-zip', (req, res) => {
    console.log('📦 /download-zip endpoint\'ga so\'rov keldi');
    downloadZip(req, res);
});

// Uploads papkasini ZIP'ga yuklab olish
router.get('/download-uploads-zip', async (req, res) => {
    try {
        console.log('📦 Uploads ZIP yaratilmoqda...');

        const zipFileName = `uploads_backup_${Date.now()}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            console.error('❌ ZIP yaratishda xato:', err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('⚠️ ZIP warning:', err);
            } else {
                throw err;
            }
        });

        let fileCount = 0;
        archive.on('entry', (entry) => {
            fileCount++;
            if (fileCount % 10 === 0) {
                console.log(`  📄 ${fileCount} ta fayl qo'shildi...`);
            }
        });

        archive.pipe(res);
        archive.directory(UPLOADS_DIR, 'uploads');
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

// Muayyan papkani ZIP'ga yuklab olish
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

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                error: 'Papka topilmadi'
            });
        }

        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({
                success: false,
                error: 'Bu fayl, papka emas'
            });
        }

        const folderName = path.basename(folderPath);
        const zipFileName = `${folderName}_${Date.now()}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('❌ ZIP xato:', err);
            res.status(500).json({ error: err.message });
        });

        archive.pipe(res);
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

// File browser - REGEX PATTERN
router.get(/^\/browse\/?(.*)/, (req, res) => {
    const requestedPath = req.params[0] || '';
    console.log('📁 /browse endpoint\'ga so\'rov keldi:', requestedPath || 'root');
    browsePath(req, res);
});

module.exports = router;