// src/app.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Middleware
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');

// Routes
const dataRoutes = require('./routes/data.routes');
const fileRoutes = require('./routes/file.routes');
const simpleAuthRoutes = require('./routes/simpleAuth.routes');
const simpleUserRoutes = require('./routes/simpleUser.routes');

// Utils
const RequestQueue = require('./utils/queue');

// Config
const {
    UPLOADS_DIR,
    TEMP_DIR,
    QUEUE_CONCURRENT_LIMIT,
    QUEUE_DELAY_BETWEEN_REQUESTS
} = require('./config/constants');

const app = express();

console.log('\n🚀 Server ishga tushmoqda...\n');

// ============================================
// 1. TRUST PROXY
// ============================================
app.set('trust proxy', true);

// ============================================
// 2. CORS MIDDLEWARE (ENG BIRINCHI!)
// ============================================
app.use(corsMiddleware);
console.log('✅ CORS middleware yuklandi');

// ============================================
// 3. BODY PARSER
// ============================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
console.log('✅ Body parser middleware yuklandi');

// ============================================
// 4. CREATE DIRECTORIES
// ============================================
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('📂 Uploads papka yaratildi');
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('📂 Temp papka yaratildi');
}

// ============================================
// 5. STATIC FILES - /uploads dan to'g'ridan-to'g'ri
// ============================================
app.use('/uploads', express.static(UPLOADS_DIR));
console.log('✅ Static files middleware yuklandi');

// ============================================
// 6. CREATE QUEUE INSTANCE
// ============================================
const appScriptQueue = new RequestQueue(
    QUEUE_CONCURRENT_LIMIT,
    QUEUE_DELAY_BETWEEN_REQUESTS
);
console.log('✅ Request queue yaratildi');

// ============================================
// 7. LOGGING MIDDLEWARE (optional)
// ============================================
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// ============================================
// 8. BROWSE ROUTE - /api dan TASHQARIDA! (MUHIM!)
// ============================================
console.log('\n📁 Browse route yuklanmoqda...');
app.use('/', fileRoutes); // ✅ "/browse" uchun prefix yo'q!
console.log('✅ Browse route yuklandi');

// ============================================
// 9. AUTH ROUTES
// ============================================
console.log('\n🔐 Auth routes yuklanmoqda...');
app.use('/api/auth', simpleAuthRoutes);
app.use('/api/users', simpleUserRoutes);
console.log('✅ Auth routes yuklandi');

// ============================================
// 10. PUBLIC DATA ROUTES
// ============================================
console.log('\n📂 Data routes yuklanmoqda...');
app.use('/api', dataRoutes(appScriptQueue));
console.log('✅ Data routes yuklandi');

// ============================================
// 11. HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
    const queueStatus = appScriptQueue.getStatus();

    res.json({
        status: "ok",
        message: "Maskan Lux Server (Telegram Integration) ishlayapti ✅",
        version: "9.3",
        storage: "Local filesystem",
        uploadsDir: UPLOADS_DIR,
        queue: queueStatus,
        timestamp: new Date().toLocaleString("uz-UZ")
    });
});

// ============================================
// 12. ROOT ENDPOINT
// ============================================
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Maskan Lux API",
        version: "9.3",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth/*",
            users: "/api/users/*",
            sendData: "/api/send-data",
            queueStatus: "/api/queue-status",
            browse: "/browse/*",
            downloadZip: "/api/download-zip"
        }
    });
});

// ============================================
// 13. 404 HANDLER
// ============================================
app.use((req, res, next) => {
    console.log('❌ 404 - Path not found:', req.path);
    res.status(404).json({
        success: false,
        error: 'Endpoint topilmadi',
        path: req.path
    });
});

// ============================================
// 14. ERROR HANDLER (ENG OXIRIDA)
// ============================================
app.use(errorHandler);

console.log('\n✅ Barcha middleware va routes yuklandi\n');

module.exports = app;