// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
    console.error('❌ Error Handler:', err.message);
    console.error(err.stack);

    // Multer xatolari
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            error: `Fayl yuklash xatosi: ${err.message}`
        });
    }

    // Validation xatolari
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // Default xato
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server xatosi',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;