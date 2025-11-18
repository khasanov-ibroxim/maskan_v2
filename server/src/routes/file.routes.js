// src/routes/file.routes.js
const express = require('express');
const { downloadZip, browsePath } = require('../controllers/fileController');

const router = express.Router();

// PUBLIC ROUTES - Auth kerak emas!

// ZIP yuklab olish
router.post('/download-zip', (req, res) => {
    console.log('📦 /download-zip endpoint\'ga so\'rov keldi');
    downloadZip(req, res);
});

// File browser
router.get(/^\/browse\/?(.*)$/, (req, res) => {
    console.log('📁 /browse endpoint\'ga so\'rov keldi:', req.params[0] || 'root');
    browsePath(req, res);
});

module.exports = router;