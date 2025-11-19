// src/routes/file.routes.js
const express = require('express');
const { downloadZip, browsePath } = require('../controllers/fileController');

const router = express.Router();

// ============================================
// PUBLIC ROUTES - Auth kerak emas!
// ============================================

// ZIP yuklab olish
// Full path: /download-zip (chunki app.js da prefix yo'q)
router.post('/download-zip', (req, res) => {
    console.log('📦 /download-zip endpoint\'ga so\'rov keldi');
    downloadZip(req, res);
});

// File browser - REGEX PATTERN (Express v5+ uchun)
// Full path: /browse yoki /browse/anything/nested
// ✅ FIXED - Regex pattern ishlatamiz
router.get(/^\/browse\/?(.*)/, (req, res) => {
    // req.params[0] regex capture group dan keladi
    const requestedPath = req.params[0] || '';
    console.log('📁 /browse endpoint\'ga so\'rov keldi:', requestedPath || 'root');

    browsePath(req, res);
});

module.exports = router;