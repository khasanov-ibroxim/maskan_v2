const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// ✅ CRITICAL FIX: To'g'ri import
const { filterIgnoredPaths } = require('./middleware/fileFilter');

// Middleware
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');

// Routes
const dataRoutes = require('./routes/data.routes');
const fileRoutes = require('./routes/file.routes');
const simpleAuthRoutes = require('./routes/simpleAuth.routes');
const simpleUserRoutes = require('./routes/simpleUser.routes');
const excelRoutes = require('./routes/excel.routes');
const publicRoutes = require('./routes/public.routes');
const settingsRoutes = require('./routes/settings.routes');
const telegramChatRoutes = require('./routes/telegramChat.routes'); // ✅ YANGI QATORIQ

// Utils
const RequestQueue = require('./utils/queue');

// Services
const { setupCleanupSchedules } = require('./services/cleanupScheduler');

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
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());
console.log('✅ Body parser middleware yuklandi');

// ============================================
// 4. CREATE DIRECTORIES
// ============================================
const requiredDirs = [UPLOADS_DIR, TEMP_DIR, 'storage/excel', 'logs'];
requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📂 ${dir} papka yaratildi`);
    }
});

// ============================================
// 5. STATIC FILES
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
// 7. SETUP CLEANUP SCHEDULER
// ============================================
setupCleanupSchedules();

// ============================================
// 8. LOGGING MIDDLEWARE
// ============================================
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// ✅ CRITICAL FIX: filterIgnoredPaths to'g'ri ishlatish
app.use('/browse', filterIgnoredPaths);
app.use('/download-zip', filterIgnoredPaths);

// ============================================
// PUBLIC ROUTES (AUTH KERAK EMAS!)
// ============================================
app.use('/api/public', publicRoutes);
console.log('✅ Public API routes yuklandi');

// ============================================
// 9. BROWSE ROUTE (PREFIX YO'Q!)
// ============================================
console.log('\n📁 Browse route yuklanmoqda...');
app.use('/', fileRoutes);
console.log('✅ Browse route yuklandi');

// ============================================
// 10. AUTH ROUTES
// ============================================
console.log('\n🔐 Auth routes yuklanmoqda...');
app.use('/api/auth', simpleAuthRoutes);
app.use('/api/users', simpleUserRoutes);
console.log('✅ Auth routes yuklandi');

// ============================================
// 11. SETTINGS ROUTES
// ============================================
console.log('\n⚙️ Settings routes yuklanmoqda...');
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes yuklandi');

// ============================================
// 12. ✅✅✅ TELEGRAM CHATS ROUTES (YANGI!)
// ============================================
console.log('\n💬 Telegram Chats routes yuklanmoqda...');
app.use('/api/telegram-chats', telegramChatRoutes);
console.log('✅ Telegram Chats routes yuklandi');

// ============================================
// 13. EXCEL ROUTES
// ============================================
console.log('\n📊 Excel routes yuklanmoqda...');
app.use('/api/excel', excelRoutes);
console.log('✅ Excel routes yuklandi');

// ============================================
// 14. PUBLIC DATA ROUTES
// ============================================
console.log('\n📂 Data routes yuklanmoqda...');
app.use('/api', dataRoutes(appScriptQueue));
console.log('✅ Data routes yuklandi');

// ============================================
// 15. HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
    const queueStatus = appScriptQueue.getStatus();

    res.json({
        status: "ok",
        message: "Maskan Lux Server (Telegram Integration) ishlayapti ✅",
        version: "10.1",
        storage: "Local filesystem + Excel backup",
        uploadsDir: UPLOADS_DIR,
        queue: queueStatus,
        timestamp: new Date().toLocaleString("uz-UZ"),
        features: {
            telegramIntegration: true,
            telegramChatsManagement: true, // ✅ YANGI
            googleSheetsIntegration: true,
            localExcelBackup: true,
            autoCleanup: true,
            userAuthentication: true,
            fileManagement: true
        }
    });
});

// ============================================
// 16. ROOT ENDPOINT
// ============================================
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Maskan Lux API v10.1",
        version: "10.1",
        endpoints: {
            health: "/api/health",
            auth: {
                login: "POST /api/auth/login",
                logout: "POST /api/auth/logout",
                me: "GET /api/auth/me"
            },
            users: {
                sessions: "GET /api/users/sessions/active",
                history: "GET /api/users/sessions/history",
                logs: "GET /api/users/logs",
                users: "GET /api/users/users (admin)"
            },
            telegramChats: { // ✅ YANGI
                getAll: "GET /api/telegram-chats",
                getOne: "GET /api/telegram-chats/:id",
                create: "POST /api/telegram-chats (admin)",
                update: "PUT /api/telegram-chats/:id (admin)",
                delete: "DELETE /api/telegram-chats/:id (admin)",
                stats: "GET /api/telegram-chats/stats/summary (admin)"
            },
            settings: {
                getAll: "GET /api/settings",
                getCategory: "GET /api/settings/:category",
                globalConfig: "GET /api/settings/global-config",
                updateGlobalConfig: "PUT /api/settings/global-config (admin)",
                create: "POST /api/settings (admin)",
                update: "PUT /api/settings/:id (admin)",
                delete: "DELETE /api/settings/:id (admin)"
            },
            data: {
                sendData: "POST /api/send-data",
                queueStatus: "GET /api/queue-status"
            },
            files: {
                browse: "GET /browse/*",
                downloadZip: "POST /download-zip"
            },
            excel: {
                stats: "GET /api/excel/stats",
                all: "GET /api/excel/all (admin)",
                clear: "POST /api/excel/clear (admin)",
                cleanupTemp: "POST /api/excel/cleanup-temp (admin)",
                tempSize: "GET /api/excel/temp-size"
            }
        }
    });
});

// ============================================
// 17. 404 HANDLER
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
// 18. ERROR HANDLER
// ============================================
app.use(errorHandler);

console.log('\n✅ Barcha middleware va routes yuklandi\n');

module.exports = app;