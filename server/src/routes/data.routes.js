// src/routes/data.routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { sendData } = require('../controllers/dataController');
const { TEMP_DIR, MAX_FILE_SIZE } = require('../config/constants');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_DIR);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
        cb(null, `${timestamp}-${cleanName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        // Rasm fayllari uchun tekshirish
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Faqat rasm fayllari ruxsat etilgan!'));
        }
    }
});

function dataRoutes(appScriptQueue) {
    // PUBLIC ROUTE - Auth kerak emas!
    router.post('/send-data', upload.array("images"), (req, res) => {
        console.log('📥 /send-data endpoint ga sorov keldi');
        console.log('   Method:', req.method);
        console.log('   Content-Type:', req.headers['content-type']);
        console.log('   Files:', req.files?.length || 0);
        console.log('   Body keys:', Object.keys(req.body));

        sendData(req, res, appScriptQueue);
    });

    // PUBLIC ROUTE - Queue status
    router.get('/queue-status', (req, res) => {
        console.log('📊 /queue-status endpoint ga sorov keldi');

        res.json({
            success: true,
            queue: appScriptQueue.getStatus()
        });
    });

    return router;
}

module.exports = dataRoutes;