// server/src/routes/settings.routes.js - ✅ FIXED: Route order
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const AppSettings = require('../models/AppSettings.pg');

// ============================================
// PUBLIC ROUTES - SPECIFIC BEFORE DYNAMIC
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
 * ✅ CRITICAL: Must be BEFORE /:category route!
 * Get cascader data (Tuman -> Kvartil)
 * GET /api/settings/cascader
 */
router.get('/cascader', async (req, res) => {
    try {
        console.log('\n📊 GET /api/settings/cascader');
        const cascaderData = await AppSettings.getCascaderData();
        console.log(`  ✅ Returning: ${cascaderData.length} tumanlar`);

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

/**
 * ✅ CRITICAL: Must be BEFORE /:category route!
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
 * Get settings by category (MUST BE AFTER SPECIFIC ROUTES!)
 * GET /api/settings/:category
 */
router.get('/:category', async (req, res) => {
    try {
        const { category } = req.params;
        console.log(`📊 GET /api/settings/${category}`);

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
 * Update global config
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
        console.log('  telegram_bot_token:', telegram_bot_token ? 'Provided' : 'Missing');
        console.log('  glavniy_app_script_url:', glavniy_app_script_url ? 'Provided' : 'Missing');

        // Validation
        const errors = [];
        if (!telegram_bot_token?.trim()) errors.push('telegram_bot_token majburiy');
        if (!glavniy_app_script_url?.trim()) errors.push('glavniy_app_script_url majburiy');
        if (!company_phone?.trim()) errors.push('company_phone majburiy');
        if (!default_telegram_chat_id?.trim()) errors.push('default_telegram_chat_id majburiy');

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation xatolari',
                errors: errors
            });
        }

        // Phone validation
        const phoneRegex = /^\+998\d{9}$/;
        if (!phoneRegex.test(company_phone)) {
            return res.status(400).json({
                success: false,
                error: 'company_phone noto\'g\'ri formatda. Format: +998XXXXXXXXX'
            });
        }

        // URL validation
        try {
            new URL(glavniy_app_script_url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'glavniy_app_script_url noto\'g\'ri URL format'
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
            message: 'Global sozlamalar yangilandi',
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
 * ✅ FIXED: Support both old (value) and new (translations) formats
 * POST /api/settings
 */

router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        let { category, value, translations, displayOrder, parentId } = req.body;

        console.log('\n📝 POST /api/settings');
        console.log('  Category:', category);
        console.log('  Value:', value || 'NULL');
        console.log('  Translations:', translations);
        console.log('  Parent ID:', parentId || 'NULL');

        // ✅ CRITICAL: Force 'kvartil' for tuman/kvartil system
        if (category === 'tuman' || category === 'kvartil') {
            category = 'kvartil';
            console.log('  ✅ Category forced to: kvartil');
        }

        // ✅ Validation
        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category majburiy'
            });
        }

        // ✅ CRITICAL: Build translations object properly
        let finalTranslations;

        if (translations && typeof translations === 'object') {
            // New format with translations
            finalTranslations = {
                uz: (translations.uz || '').trim(),
                ru: (translations.ru || '').trim(),
                en: (translations.en || '').trim(),
                uz_cy: (translations.uz_cy || '').trim()
            };
            console.log('  ✅ Using translations format');
        } else if (value) {
            // Old format - use value for all languages
            const trimmedValue = value.trim();
            finalTranslations = {
                uz: trimmedValue,
                ru: trimmedValue,
                en: trimmedValue,
                uz_cy: trimmedValue
            };
            console.log('  ✅ Using value format (all languages same)');
        } else {
            return res.status(400).json({
                success: false,
                error: 'Value yoki translations majburiy'
            });
        }

        // ✅ Check if at least one translation exists
        const hasAnyTranslation = Object.values(finalTranslations).some(v => v && v.length > 0);

        if (!hasAnyTranslation) {
            return res.status(400).json({
                success: false,
                error: 'Kamida bitta til kiritilishi kerak'
            });
        }

        console.log('  📝 Final translations:', finalTranslations);

        // Create setting
        const setting = await AppSettings.create(
            category,
            finalTranslations,
            displayOrder || 0,
            parentId || null
        );

        console.log('  ✅ Created:', setting.id);
        console.log('    uz:', setting.value_uz);
        console.log('    ru:', setting.value_ru);
        console.log('    en:', setting.value_en);
        console.log('    uz_cy:', setting.value_uz_cy);
        console.log('    Parent ID:', setting.parent_id || 'NULL (TUMAN)');

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