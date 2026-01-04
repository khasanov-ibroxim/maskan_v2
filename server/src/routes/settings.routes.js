// server/src/routes/settings.routes.js - ✅ FIXED: No duplicate routes
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
 * Get global config
 * GET /api/settings/global-config
 */
router.get('/global-config', async (req, res) => {
    try {
        const config = await AppSettings.getGlobalConfig();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('❌ Get global config error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ✅ FIXED: Update global config (FAQAT 1 MARTA)
 * PUT /api/settings/global-config
 * Body: { telegram_bot_token, glavniy_app_script_url, company_phone, default_telegram_chat_id }
 */
router.put('/global-config', protect, authorize('admin'), async (req, res) => {
    try {
        const {
            telegram_bot_token,
            glavniy_app_script_url,
            company_phone,
            default_telegram_chat_id
        } = req.body;

        console.log('\n📝 PUT /global-config request');
        console.log('  telegram_bot_token:', telegram_bot_token ? 'Provided' : 'Missing');
        console.log('  glavniy_app_script_url:', glavniy_app_script_url ? 'Provided' : 'Missing');
        console.log('  company_phone:', company_phone || 'Missing');
        console.log('  default_telegram_chat_id:', default_telegram_chat_id || 'Missing');

        // ✅ Validation
        const errors = [];

        if (!telegram_bot_token || telegram_bot_token.trim() === '') {
            errors.push('telegram_bot_token majburiy');
        }

        if (!glavniy_app_script_url || glavniy_app_script_url.trim() === '') {
            errors.push('glavniy_app_script_url majburiy');
        }

        if (!company_phone || company_phone.trim() === '') {
            errors.push('company_phone majburiy');
        }

        if (!default_telegram_chat_id || default_telegram_chat_id.trim() === '') {
            errors.push('default_telegram_chat_id majburiy');
        }

        if (errors.length > 0) {
            console.log('  ❌ Validation errors:', errors);
            return res.status(400).json({
                success: false,
                error: 'Validation xatolari',
                errors: errors
            });
        }

        // ✅ Validate phone format
        const phoneRegex = /^\+998\d{9}$/;
        if (!phoneRegex.test(company_phone)) {
            return res.status(400).json({
                success: false,
                error: 'company_phone noto\'g\'ri formatda. Format: +998XXXXXXXXX'
            });
        }

        // ✅ Validate URL format
        try {
            new URL(glavniy_app_script_url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'glavniy_app_script_url noto\'g\'ri URL format'
            });
        }

        console.log('  ✅ Validation passed');

        // ✅ Update each setting
        const results = [];

        try {
            const r1 = await AppSettings.updateGlobalConfig('telegram_bot_token', telegram_bot_token.trim());
            results.push(r1);
            console.log('  ✅ telegram_bot_token updated');
        } catch (e) {
            console.error('  ❌ telegram_bot_token error:', e.message);
            throw new Error('telegram_bot_token yangilashda xato: ' + e.message);
        }

        try {
            const r2 = await AppSettings.updateGlobalConfig('glavniy_app_script_url', glavniy_app_script_url.trim());
            results.push(r2);
            console.log('  ✅ glavniy_app_script_url updated');
        } catch (e) {
            console.error('  ❌ glavniy_app_script_url error:', e.message);
            throw new Error('glavniy_app_script_url yangilashda xato: ' + e.message);
        }

        try {
            const r3 = await AppSettings.updateGlobalConfig('company_phone', company_phone.trim());
            results.push(r3);
            console.log('  ✅ company_phone updated');
        } catch (e) {
            console.error('  ❌ company_phone error:', e.message);
            throw new Error('company_phone yangilashda xato: ' + e.message);
        }

        try {
            const r4 = await AppSettings.updateGlobalConfig('default_telegram_chat_id', default_telegram_chat_id.trim());
            results.push(r4);
            console.log('  ✅ default_telegram_chat_id updated');
        } catch (e) {
            console.error('  ❌ default_telegram_chat_id error:', e.message);
            throw new Error('default_telegram_chat_id yangilashda xato: ' + e.message);
        }

        console.log('  ✅ All settings updated successfully');

        // ✅ Return updated config
        const updatedConfig = await AppSettings.getGlobalConfig();

        res.json({
            success: true,
            message: 'Global sozlamalar muvaffaqiyatli yangilandi',
            data: updatedConfig,
            updated: results.filter(r => r !== null).length
        });

    } catch (error) {
        console.error('❌ Update global config error:', error);
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


router.get('/cascader', async (req, res) => {
    try {
        const cascaderData = await AppSettings.getCascaderData();
        res.json({
            success: true,
            data: cascaderData
        });
    } catch (error) {
        console.error('❌ Get cascader error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;