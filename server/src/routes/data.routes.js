const express = require('express');
const multer = require('multer');
const path = require('path');
const { sendData } = require('../controllers/dataController');
const { TEMP_DIR, MAX_FILE_SIZE } = require('../config/constants');
const { fileFilterForUpload } = require('../middleware/fileFilter'); // ✅ To'g'ri import

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

// ✅ fileFilterForUpload ishlatish (temp tekshirmaydi)
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: fileFilterForUpload // Simple function
});

function dataRoutes(appScriptQueue) {
    // PUBLIC ROUTE - Auth kerak emas!
    // Path: /api/send-data
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
