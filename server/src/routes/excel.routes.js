// src/routes/excel.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const {
    readFromLocalExcel,
    clearLocalExcel,
    getExcelStats
} = require('../services/localExcelService');

const {
    manualCleanup,
    getTempFolderSize
} = require('../services/cleanupScheduler');

/**
 * Excel statistika (barcha userlar)
 * GET /api/excel/stats
 */
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

/**
 * Barcha ma'lumotlarni olish (admin only)
 * GET /api/excel/all
 */
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

/**
 * Excel faylni tozalash (admin only)
 * POST /api/excel/clear
 */
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

/**
 * Temp papkani tozalash (admin only)
 * POST /api/excel/cleanup-temp
 */
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

/**
 * Temp papka hajmi
 * GET /api/excel/temp-size
 */
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

module.exports = router;