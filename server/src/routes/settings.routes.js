// server/src/routes/settings.routes.js - FIXED

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const {
    getLocations,
    getAllSettings,
    getSettingsByCategory,
    getGlobalConfig,
    updateGlobalConfig,
    createSetting,
    updateSetting,
    deleteSetting
} = require('../controllers/settingsController');

// ============================================
// PUBLIC/PROTECTED ROUTES - SPECIFIC FIRST
// ============================================

/**
 * ✅ CRITICAL: /locations MUST BE BEFORE /:category
 * Get locations (districts with kvartils)
 * GET /api/settings/locations
 */
router.get('/locations', protect, getLocations);

/**
 * Get global config
 * GET /api/settings/global-config
 */
router.get('/global-config', protect, getGlobalConfig);

/**
 * Get all settings
 * GET /api/settings
 */
router.get('/', protect, getAllSettings);

/**
 * Get settings by category (MUST BE AFTER SPECIFIC ROUTES)
 * GET /api/settings/:category
 */
router.get('/:category', protect, getSettingsByCategory);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * Update global config
 * PUT /api/settings/global-config
 */
router.put('/global-config', protect, authorize('admin'), updateGlobalConfig);

/**
 * Create setting
 * POST /api/settings
 */
router.post('/', protect, authorize('admin'), createSetting);

/**
 * Update setting
 * PUT /api/settings/:id
 */
router.put('/:id', protect, authorize('admin'), updateSetting);

/**
 * Delete setting
 * DELETE /api/settings/:id
 */
router.delete('/:id', protect, authorize('admin'), deleteSetting);

module.exports = router;