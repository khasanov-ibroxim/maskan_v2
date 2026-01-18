// server/src/routes/settings.routes.js - ✅ FULLY FIXED
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const AppSettings = require('../models/AppSettings.pg');

// ============================================
// PUBLIC/PROTECTED ROUTES - SPECIFIC FIRST!
// ============================================

/**
 * ✅ CRITICAL: Cascader data - MUST BE FIRST
 * GET /api/settings/cascader
 */
router.get('/cascader', async (req, res) => {
    try {
        console.log('\n📊 GET /api/settings/cascader');
        const cascaderData = await AppSettings.getCascaderData();

        res.json({
            success: true,
            data: cascaderData
        });
    } catch (error) {
        console.error('❌ Cascader error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ✅ Global config - MUST BE BEFORE /:category
 * GET /api/settings/global-config
 */
router.get('/global-config', async (req, res) => {
    try {
        console.log('\n⚙️ GET /api/settings/global-config');
        const config = await AppSettings.getGlobalConfig();

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('❌ Global config error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get all settings
 * GET /api/settings
 */
router.get('/', async (req, res) => {
    try {
        console.log('\n📚 GET /api/settings');
        const settings = await AppSettings.getAll();

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Get all settings error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ✅ Get settings by category - MUST BE LAST (DYNAMIC ROUTE)
 * GET /api/settings/:category
 */
router.get('/:category', async (req, res) => {
    try {
        const { category } = req.params;
        console.log(`\n📂 GET /api/settings/${category}`);

        const settings = await AppSettings.getByCategory(category);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Get category error:', error);
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
 * ✅ Update global config
 * PUT /api/settings/global-config
 */
router.put('/global-config', protect, authorize('admin'), async (req, res) => {
    try {
        const {
            telegram_bot_token,
            glavniy_app_script_url,
            company_phone,
            default_telegram_chat_id
        } = req.body;

        console.log('\n📝 PUT /global-config');
        console.log('  Data:', {
            telegram_bot_token: telegram_bot_token ? 'SET' : 'MISSING',
            glavniy_app_script_url: glavniy_app_script_url ? 'SET' : 'MISSING',
            company_phone,
            default_telegram_chat_id
        });

        // Validation
        if (!telegram_bot_token) {
            return res.status(400).json({
                success: false,
                error: 'telegram_bot_token majburiy'
            });
        }
        if (!glavniy_app_script_url) {
            return res.status(400).json({
                success: false,
                error: 'glavniy_app_script_url majburiy'
            });
        }
        if (!company_phone || !/^\+998\d{9}$/.test(company_phone)) {
            return res.status(400).json({
                success: false,
                error: 'company_phone noto\'g\'ri formatda (+998XXXXXXXXX)'
            });
        }
        if (!default_telegram_chat_id) {
            return res.status(400).json({
                success: false,
                error: 'default_telegram_chat_id majburiy'
            });
        }

        // Update each setting
        await AppSettings.updateGlobalConfig('telegram_bot_token', telegram_bot_token.trim());
        await AppSettings.updateGlobalConfig('glavniy_app_script_url', glavniy_app_script_url.trim());
        await AppSettings.updateGlobalConfig('company_phone', company_phone.trim());
        await AppSettings.updateGlobalConfig('default_telegram_chat_id', default_telegram_chat_id.trim());

        const updatedConfig = await AppSettings.getGlobalConfig();

        res.json({
            success: true,
            message: 'Global config yangilandi',
            data: updatedConfig
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
 * Create setting
 * POST /api/settings
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { category, value, translations, display_order, parentId } = req.body;

        console.log('\n📝 POST /api/settings');
        console.log('  Category:', category);
        console.log('  Translations:', translations);

        let finalTranslations;

        if (translations && typeof translations === 'object') {
            finalTranslations = {
                uz: (translations.uz || '').trim(),
                ru: (translations.ru || '').trim(),
                en: (translations.en || '').trim(),
                uz_cy: (translations.uz_cy || '').trim()
            };
        } else if (value) {
            const trimmedValue = value.trim();
            finalTranslations = {
                uz: trimmedValue,
                ru: trimmedValue,
                en: trimmedValue,
                uz_cy: trimmedValue
            };
        } else {
            return res.status(400).json({
                success: false,
                error: 'Value yoki translations majburiy'
            });
        }

        const hasAnyTranslation = Object.values(finalTranslations).some(v => v && v.length > 0);

        if (!hasAnyTranslation) {
            return res.status(400).json({
                success: false,
                error: 'Kamida bitta til kiritilishi kerak'
            });
        }

        const setting = await AppSettings.create(
            category,
            finalTranslations,
            display_order || 0,
            parentId || null
        );

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

        console.log('\n📝 PUT /api/settings/:id');
        console.log('  ID:', id);
        console.log('  Updates:', updates);

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

        console.log('\n🗑️ DELETE /api/settings/:id');
        console.log('  ID:', id);

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

module.exports = router;