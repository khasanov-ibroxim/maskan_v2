// server/src/routes/excel.routes.js (yangilangan)
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const {
    readFromLocalExcel,
    clearLocalExcel,
    getExcelStats
} = require('../services/localExcelService');

const {
    getObjects,
    postAd,
    getQueueStatus
} = require('../controllers/excelController');

const {
    manualCleanup,
    getTempFolderSize
} = require('../services/cleanupScheduler');

// Excel statistika
router.get('/stats', protect, async (req, res) => {
    try {
        const stats = await getExcelStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Barcha ma'lumotlar (admin only)
router.get('/all', protect, authorize('admin'), async (req, res) => {
    try {
        const data = await readFromLocalExcel();
        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ YANGI: Obyektlar ro'yxati (elon uchun)
router.get('/objects', protect, authorize('admin'), getObjects);

// ✅ YANGI: Elon berish
router.post('/post-ad', protect, authorize('admin'), postAd);

// ✅ YANGI: Navbat statusi
router.get('/queue-status', protect, authorize('admin'), getQueueStatus);

// Excel faylni tozalash
router.post('/clear', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await clearLocalExcel();
        res.json({
            success: result,
            message: result ? 'Excel fayl tozalandi' : 'Xato yuz berdi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Temp papkani tozalash
router.post('/cleanup-temp', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await manualCleanup({ cleanTemp: true });
        res.json({
            success: true,
            result: result.temp
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Temp papka hajmi
router.get('/temp-size', protect, async (req, res) => {
    try {
        const size = getTempFolderSize();
        res.json({
            success: true,
            ...size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Backup yuklab olish
const fs = require('fs');
const path = require('path');

router.get('/download-backup', protect, authorize('admin', 'manager'), async (req, res) => {
    try {
        const backupFile = path.join(__dirname, '../../storage/excel/backup_database.xlsx');

        if (!fs.existsSync(backupFile)) {
            return res.status(404).json({
                success: false,
                error: 'Backup fayl topilmadi'
            });
        }

        res.download(backupFile, 'backup_database.xlsx', (err) => {
            if (err) {
                console.error('❌ Download xato:', err);
                res.status(500).json({
                    success: false,
                    error: 'Faylni yuklab olishda xato'
                });
            } else {
                console.log('✅ Backup fayl yuklandi');
            }
        });

    } catch (error) {
        console.error('❌ Download endpoint xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;