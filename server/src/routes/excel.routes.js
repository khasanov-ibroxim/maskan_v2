// server/src/routes/excel.routes.js - PostgreSQL version
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const {
    getObjects,
    postAd,
    getQueueStatus,
    getStats,
    search,
    deleteObject
} = require('../controllers/excelController');

// ============================================
// PROTECTED ROUTES (AUTH REQUIRED)
// ============================================

/**
 * Statistika
 * GET /api/excel/stats
 */
router.get('/stats', protect, getStats);

/**
 * Barcha obyektlar
 * GET /api/excel/objects
 * Query params: ?kvartil=...&rieltor=...&status=...
 */
router.get('/objects', protect, authorize('admin', 'manager'), getObjects);

/**
 * OLX ga elon berish
 * POST /api/excel/post-ad
 * Body: { objectId: "uuid" }
 */
router.post('/post-ad', protect, postAd);

/**
 * Navbat statusi
 * GET /api/excel/queue-status
 */
router.get('/queue-status', protect, authorize('admin', 'manager'), getQueueStatus);

/**
 * Qidiruv
 * GET /api/excel/search?q=...
 */
router.get('/search', protect, search);

/**
 * Obyektni o'chirish
 * DELETE /api/excel/objects/:id
 */
router.delete('/objects/:id', protect, authorize('admin'), deleteObject);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * Database cleanup
 * POST /api/excel/cleanup
 */
router.post('/cleanup', protect, authorize('admin'), async (req, res) => {
    try {
        const Session = require('../models/Session.pg');
        const ActivityLog = require('../models/ActivityLog.pg');

        const results = await Promise.all([
            Session.cleanup(),
            Session.deleteOld(),
            ActivityLog.deleteOld()
        ]);

        res.json({
            success: true,
            message: 'Cleanup muvaffaqiyatli',
            cleaned: {
                sessions: results[0],
                oldSessions: results[1],
                oldLogs: results[2]
            }
        });

    } catch (error) {
        console.error('❌ Cleanup xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Database statistics
 * GET /api/excel/db-stats
 */
router.get('/db-stats', protect, authorize('admin'), async (req, res) => {
    try {
        const { query } = require('../config/database');
        const result = await query('SELECT * FROM stats_overview');

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('❌ DB stats xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Export to Excel (optional)
 * GET /api/excel/export
 */
router.get('/export', protect, authorize('admin'), async (req, res) => {
    try {
        const PropertyObject = require('../models/Object.pg');
        const ExcelJS = require('exceljs');

        const objects = await PropertyObject.getAll();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Obyektlar');

        // Headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Sana', key: 'sana', width: 20 },
            { header: 'Kvartil', key: 'kvartil', width: 20 },
            { header: 'X/E/T', key: 'xet', width: 15 },
            { header: 'Telefon', key: 'tell', width: 15 },
            { header: 'M²', key: 'm2', width: 10 },
            { header: 'Narx', key: 'narx', width: 15 },
            { header: 'Rieltor', key: 'rieltor', width: 15 },
            { header: 'Status', key: 'elon_status', width: 12 },
            { header: 'Elon Sanasi', key: 'elon_date', width: 20 }
        ];

        // Add data
        objects.forEach(obj => {
            worksheet.addRow(obj);
        });

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4285F4' }
        };

        // Send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=export_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

        console.log(`✅ Excel export: ${objects.length} ta obyekt`);

    } catch (error) {
        console.error('❌ Export xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;