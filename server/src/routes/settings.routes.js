// server/src/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const AppSettings = require('../models/AppSettings.pg');

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Get all settings (grouped by category)
 * GET /api/settings
 */
router.get('/', async (req, res) => {
    try {
        const settings = await AppSettings.getAll();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Get settings error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get settings by category
 * GET /api/settings/:category
 */
router.get('/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const settings = await AppSettings.getByCategory(category);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Get category settings error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * Create new setting
 * POST /api/settings
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { category, value, displayOrder } = req.body;

        if (!category || !value) {
            return res.status(400).json({
                success: false,
                error: 'Category va value majburiy'
            });
        }

        const setting = await AppSettings.create(category, value, displayOrder || 0);

        res.json({
            success: true,
            message: 'Setting yaratildi',
            data: setting
        });
    } catch (error) {
        console.error('❌ Create setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update setting
 * PUT /api/settings/:id
 */
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const setting = await AppSettings.update(id, updates);

        if (!setting) {
            return res.status(404).json({
                success: false,
                error: 'Setting topilmadi'
            });
        }

        res.json({
            success: true,
            message: 'Setting yangilandi',
            data: setting
        });
    } catch (error) {
        console.error('❌ Update setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete setting
 * DELETE /api/settings/:id
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        await AppSettings.delete(id);

        res.json({
            success: true,
            message: 'Setting o\'chirildi'
        });
    } catch (error) {
        console.error('❌ Delete setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Reorder settings
 * POST /api/settings/:category/reorder
 */
router.post('/:category/reorder', protect, authorize('admin'), async (req, res) => {
    try {
        const { category } = req.params;
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({
                success: false,
                error: 'orderedIds array bo\'lishi kerak'
            });
        }

        await AppSettings.reorder(category, orderedIds);

        res.json({
            success: true,
            message: 'Tartib o\'zgartirildi'
        });
    } catch (error) {
        console.error('❌ Reorder error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;