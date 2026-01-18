// server/src/controllers/settingsController.js - FIXED

const Setting = require('../models/Setting.pg');

/**
 * ✅ Get locations (districts with kvartils)
 * GET /api/settings/locations
 */
exports.getLocations = async (req, res) => {
    try {
        console.log('\n📍 GET LOCATIONS REQUEST');
        console.log('='.repeat(60));

        // Get all settings with category 'kvartil'
        const { query } = require('../config/database');

        const result = await query(`
            SELECT id, value_uz, parent_id, display_order
            FROM app_settings
            WHERE category = 'kvartil' AND is_active = true
            ORDER BY display_order ASC, value_uz ASC
        `);

        console.log('  📊 Query result:', result.rows.length, 'rows');

        if (result.rows.length === 0) {
            console.log('  ⚠️ Hech qanday tuman/kvartil topilmadi!');
            return res.json({
                success: true,
                data: []
            });
        }

        // Separate tumans (parent_id = null) and kvartils
        const tumans = result.rows.filter(row => !row.parent_id);
        const kvartils = result.rows.filter(row => row.parent_id);

        console.log('  🏙️ Tumanlar:', tumans.length);
        console.log('  📍 Kvartillar:', kvartils.length);

        // Build structure
        const locations = tumans.map(tuman => {
            const tumanKvartils = kvartils
                .filter(kv => kv.parent_id === tuman.id)
                .map(kv => kv.value_uz);

            console.log(`    ${tuman.value_uz} → ${tumanKvartils.length} kvartil`);

            return {
                name: tuman.value_uz,
                kvartils: tumanKvartils
            };
        });

        console.log('  ✅ Final result:', locations.length, 'tumanlar');
        console.log('='.repeat(60));

        res.json({
            success: true,
            data: locations
        });

    } catch (error) {
        console.error('❌ Get locations error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get all settings
 */
exports.getAllSettings = async (req, res) => {
    try {
        const settings = await Setting.getAll();
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
};

/**
 * Get settings by category
 */
exports.getSettingsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const settings = await Setting.getByCategory(category);
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('❌ Get settings by category error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get global config
 */
exports.getGlobalConfig = async (req, res) => {
    try {
        const config = await Setting.getGlobalConfig();
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
};

/**
 * Update global config (admin only)
 */
exports.updateGlobalConfig = async (req, res) => {
    try {
        const config = await Setting.updateGlobalConfig(req.body);
        res.json({
            success: true,
            message: 'Global config updated',
            data: config
        });
    } catch (error) {
        console.error('❌ Update global config error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create setting (admin only)
 */
exports.createSetting = async (req, res) => {
    try {
        const setting = await Setting.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Setting created',
            data: setting
        });
    } catch (error) {
        console.error('❌ Create setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update setting (admin only)
 */
exports.updateSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const setting = await Setting.update(id, req.body);

        if (!setting) {
            return res.status(404).json({
                success: false,
                error: 'Setting not found'
            });
        }

        res.json({
            success: true,
            message: 'Setting updated',
            data: setting
        });
    } catch (error) {
        console.error('❌ Update setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete setting (admin only)
 */
exports.deleteSetting = async (req, res) => {
    try {
        const { id } = req.params;
        await Setting.delete(id);
        res.json({
            success: true,
            message: 'Setting deleted'
        });
    } catch (error) {
        console.error('❌ Delete setting error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getLocations: exports.getLocations,
    getAllSettings: exports.getAllSettings,
    getSettingsByCategory: exports.getSettingsByCategory,
    getGlobalConfig: exports.getGlobalConfig,
    updateGlobalConfig: exports.updateGlobalConfig,
    createSetting: exports.createSetting,
    updateSetting: exports.updateSetting,
    deleteSetting: exports.deleteSetting
};