// src/services/cleanupScheduler.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron'); // npm install node-cron kerak

const TEMP_DIR = path.join(__dirname, '../../temp');
const LOGS_DIR = path.join(__dirname, '../../logs');

/**
 * Temp papkasini tozalash
 */
function cleanTempFolder() {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            console.log('ℹ️ Temp papka topilmadi');
            return { success: false, message: 'Papka topilmadi' };
        }

        const files = fs.readdirSync(TEMP_DIR);
        let deletedCount = 0;
        let totalSize = 0;

        console.log('\n🧹 TEMP PAPKANI TOZALASH BOSHLANDI');
        console.log('='.repeat(50));
        console.log(`📁 Papka: ${TEMP_DIR}`);
        console.log(`📊 Fayllar soni: ${files.length}`);

        files.forEach(file => {
            const filePath = path.join(TEMP_DIR, file);
            try {
                const stats = fs.statSync(filePath);

                if (stats.isFile()) {
                    totalSize += stats.size;
                    fs.unlinkSync(filePath);
                    deletedCount++;

                    if (deletedCount <= 5) {
                        console.log(`  ✅ O'chirildi: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
                    }
                }
            } catch (err) {
                console.error(`  ❌ Xato: ${file} - ${err.message}`);
            }
        });

        const result = {
            success: true,
            deletedFiles: deletedCount,
            totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            timestamp: new Date().toLocaleString('uz-UZ')
        };

        console.log('='.repeat(50));
        console.log(`✅ Tozalash tugadi:`);
        console.log(`   O'chirilgan fayllar: ${deletedCount}`);
        console.log(`   Bo'shatilgan joy: ${result.totalSize}`);
        console.log(`   Vaqt: ${result.timestamp}`);
        console.log('='.repeat(50) + '\n');

        // Logga yozish
        logCleanup('temp', result);

        return result;

    } catch (error) {
        console.error('❌ Temp tozalashda xato:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Eski loglarni tozalash (30 kundan eski)
 */
function cleanOldLogs(daysToKeep = 30) {
    try {
        if (!fs.existsSync(LOGS_DIR)) {
            return { success: false, message: 'Logs papka topilmadi' };
        }

        const now = Date.now();
        const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Millisekund
        const files = fs.readdirSync(LOGS_DIR);
        let deletedCount = 0;

        console.log('\n🧹 ESKI LOGLARNI TOZALASH');
        console.log('='.repeat(50));
        console.log(`📁 Papka: ${LOGS_DIR}`);
        console.log(`📅 ${daysToKeep} kundan eski loglar o'chiriladi`);

        files.forEach(file => {
            const filePath = path.join(LOGS_DIR, file);
            try {
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;

                if (stats.isFile() && age > maxAge) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`  ✅ O'chirildi: ${file}`);
                }
            } catch (err) {
                console.error(`  ❌ Xato: ${file} - ${err.message}`);
            }
        });

        console.log(`✅ ${deletedCount} ta eski log o'chirildi`);
        console.log('='.repeat(50) + '\n');

        return { success: true, deletedFiles: deletedCount };

    } catch (error) {
        console.error('❌ Log tozalashda xato:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Tozalash logini yozish
 */
function logCleanup(type, result) {
    try {
        const logFile = path.join(LOGS_DIR, 'cleanup.log');
        const logEntry = `[${new Date().toISOString()}] ${type.toUpperCase()} - ${JSON.stringify(result)}\n`;

        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }

        fs.appendFileSync(logFile, logEntry);
    } catch (error) {
        console.error('❌ Log yozishda xato:', error.message);
    }
}

/**
 * Cron job'larni sozlash
 */
function setupCleanupSchedules() {
    console.log('\n⏰ AVTOMATIK TOZALASH REJIMINI SOZLASH');
    console.log('='.repeat(50));

    // Har kuni soat 03:00 da temp papkani tozalash
    cron.schedule('0 3 * * *', () => {
        console.log('\n⏰ REJALASHTIRILGAN TOZALASH (03:00)');
        cleanTempFolder();
    }, {
        timezone: "Asia/Tashkent"
    });

    console.log('✅ Temp tozalash: Har kuni 03:00 (Toshkent vaqti)');

    // Har hafta yakshanba soat 02:00 da eski loglarni tozalash
    cron.schedule('0 2 * * 0', () => {
        console.log('\n⏰ REJALASHTIRILGAN LOG TOZALASH (Yakshanba 02:00)');
        cleanOldLogs(30);
    }, {
        timezone: "Asia/Tashkent"
    });

    console.log('✅ Log tozalash: Har hafta yakshanba 02:00 (30 kundan eski)');

    console.log('='.repeat(50));
    console.log('✅ Avtomatik tozalash rejimlari faollashtirildi\n');
}

/**
 * Qo'lda tozalash (manual)
 */
async function manualCleanup(options = {}) {
    console.log('\n🧹 QO\'LDA TOZALASH BOSHLANDI');
    console.log('='.repeat(50));

    const results = {
        temp: null,
        logs: null
    };

    if (options.cleanTemp !== false) {
        results.temp = cleanTempFolder();
    }

    if (options.cleanLogs) {
        results.logs = cleanOldLogs(options.logsDaysToKeep || 30);
    }

    console.log('='.repeat(50));
    console.log('✅ QO\'LDA TOZALASH TUGADI\n');

    return results;
}

/**
 * Temp papka hajmini olish
 */
function getTempFolderSize() {
    try {
        if (!fs.existsSync(TEMP_DIR)) {
            return { size: 0, files: 0 };
        }

        const files = fs.readdirSync(TEMP_DIR);
        let totalSize = 0;
        let fileCount = 0;

        files.forEach(file => {
            const filePath = path.join(TEMP_DIR, file);
            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                    fileCount++;
                }
            } catch (err) {
                // Skip
            }
        });

        return {
            size: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
            files: fileCount,
            sizeBytes: totalSize
        };

    } catch (error) {
        console.error('❌ Hajmni hisoblashda xato:', error.message);
        return { size: '0 MB', files: 0, sizeBytes: 0 };
    }
}

module.exports = {
    setupCleanupSchedules,
    cleanTempFolder,
    cleanOldLogs,
    manualCleanup,
    getTempFolderSize
};