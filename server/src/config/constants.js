module.exports = {
    PORT: process.env.PORT || 5000,

    // Queue sozlamalari
    QUEUE_CONCURRENT_LIMIT: 2,
    QUEUE_DELAY_BETWEEN_REQUESTS: 2000,

    // File sozlamalari
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

    // API timeouts
    TELEGRAM_TIMEOUT: 30000,
    APP_SCRIPT_TIMEOUT: 30000,
    APP_SCRIPT_MAX_RETRIES: 3,

    // Directories
    UPLOADS_DIR: 'uploads',
    TEMP_DIR: 'temp',
    LOGS_DIR: 'logs'
};