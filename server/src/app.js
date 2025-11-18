// src/app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const dataRoutes = require('./routes/data.routes');
const fileRoutes = require('./routes/file.routes');
const simpleAuthRoutes = require('./routes/simpleAuth.routes');
const simpleUserRoutes = require('./routes/simpleUser.routes');
const RequestQueue = require('./utils/queue');
const { UPLOADS_DIR, TEMP_DIR, QUEUE_CONCURRENT_LIMIT, QUEUE_DELAY_BETWEEN_REQUESTS } = require('./config/constants');
const cookieParser = require('cookie-parser');

const app = express();

console.log('\n🚀 Server ishga tushmoqda...\n');

// Trust proxy (nginx yoki boshqa proxy uchun)
app.set('trust proxy', true);

// 1. CORS middleware (ENG BIRINCHI!)
app.use(corsMiddleware);
console.log('✅ CORS middleware yuklandi');

// 2. Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
console.log('✅ Body parser middleware yuklandi');

// Create directories
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('📁 Uploads papka yaratildi');
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('📁 Temp papka yaratildi');
}

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
console.log('✅ Static files middleware yuklandi');

// Queue instance
const appScriptQueue = new RequestQueue(QUEUE_CONCURRENT_LIMIT, QUEUE_DELAY_BETWEEN_REQUESTS);
console.log('✅ Request queue yaratildi');

// 3. PUBLIC ROUTES (Auth kerak EMAS) - ENG BIRINCHI!
console.log('\n📍 Public routes yuklanmoqda...');
app.use('/', dataRoutes(appScriptQueue));
app.use('/', fileRoutes);
console.log('✅ Data va File routes yuklandi');

// 4. AUTH ROUTES
console.log('\n🔐 Auth routes yuklanmoqda...');
app.use('/api/auth', simpleAuthRoutes);
app.use('/api/users', simpleUserRoutes);
console.log('✅ Auth routes yuklandi');

// 5. Health check
app.get("/api/health", (req, res) => {
    const queueStatus = appScriptQueue.getStatus();

    res.json({
        status: "ok",
        message: "Maskan Lux Server (Telegram Integration) ishlayapti ✅",
        version: "9.2",
        storage: "Local filesystem",
        uploadsDir: UPLOADS_DIR,
        queue: queueStatus,
        timestamp: new Date().toLocaleString("uz-UZ")
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Maskan Lux API",
        version: "9.2",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth/*",
            users: "/api/users/*",
            sendData: "/send-data",
            queueStatus: "/queue-status",
            browse: "/browse"
        }
    });
});

// 6. Error handler (ENG OXIRIDA)
app.use(errorHandler);

console.log('\n✅ Barcha middleware va routes yuklandi\n');

module.exports = app;