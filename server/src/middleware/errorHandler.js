// src/middleware/errorHandler.js

/**
 * Global error handler middleware
 * Barcha xatolarni tutib, to'g'ri javob qaytaradi
 */
function errorHandler(err, req, res, next) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR HANDLER');
    console.error('='.repeat(60));
    console.error('Path:', req.path);
    console.error('Method:', req.method);
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('='.repeat(60) + '\n');

    // Multer file upload xatolar
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'Fayl hajmi juda katta (max 10MB)'
        });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            error: 'Juda ko\'p fayllar yuborildi'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            error: 'Kutilmagan fayl maydoni'
        });
    }

    // Mongoose validation xatolar
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validatsiya xatosi',
            details: messages
        });
    }

    // MongoDB xatolar
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(500).json({
            success: false,
            error: 'Database xatosi'
        });
    }

    // JWT xatolar
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token noto\'g\'ri'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token muddati tugagan'
        });
    }

    // Syntax xatolar (JSON parse)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Noto\'g\'ri JSON format'
        });
    }

    // 404 xatolar
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint topilmadi'
        });
    }

    // Custom xatolar
    if (err.status) {
        return res.status(err.status).json({
            success: false,
            error: err.message || 'Xatolik yuz berdi'
        });
    }

    // Default server xatosi
    res.status(500).json({
        success: false,
        error: 'Server xatosi',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ichki server xatosi'
    });
}

module.exports = errorHandler;