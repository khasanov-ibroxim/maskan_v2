// server/src/controllers/excelController.js
const {
    getAllObjects,
    getObjectById,
    updateObjectStatus
} = require('../services/serverDBService');
const { postToOLX } = require('../services/olxAutomationService');

/**
 * Barcha obyektlarni olish
 * GET /api/excel/objects
 */
exports.getObjects = async (req, res) => {
    try {
        const objects = getAllObjects();

        res.json({
            success: true,
            count: objects.length,
            objects
        });

    } catch (error) {
        console.error('❌ Obyektlarni olishda xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * OLX ga elon berish
 * POST /api/excel/post-ad
 */
exports.postAd = async (req, res) => {
    try {
        const { objectId } = req.body;

        if (!objectId) {
            return res.status(400).json({
                success: false,
                error: 'ObjectId majburiy'
            });
        }

        // Obyektni topish
        const object = getObjectById(objectId);

        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // Status yangilash - processing
        updateObjectStatus(objectId, 'processing');

        // Navbatga qo'shish
        global.adQueue = global.adQueue || [];
        global.adQueue.push(objectId);

        // Response yuborish (tezkor)
        res.json({
            success: true,
            message: 'Elon navbatga qo\'shildi',
            queuePosition: global.adQueue.length,
            status: 'processing'
        });

        // Background'da elon berish
        if (global.adQueue.length === 1) {
            processAdQueue();
        }

    } catch (error) {
        console.error('❌ Elon berishda xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Navbatni qayta ishlash
 */
async function processAdQueue() {
    if (!global.adQueue || global.adQueue.length === 0) {
        console.log('✅ Elon navbati bo\'sh');
        return;
    }

    const objectId = global.adQueue[0];

    try {
        console.log(`\n📤 Elon berilmoqda: ${objectId}`);

        // Obyektni olish
        const object = getObjectById(objectId);

        if (!object) {
            throw new Error('Obyekt topilmadi');
        }

        // ✅ OLX.uz ga HAQIQIY elon berish
        const result = await postToOLX(object);

        // Status yangilash - posted
        updateObjectStatus(
            objectId,
            'posted',
            new Date().toISOString()
        );

        console.log(`✅ Elon muvaffaqiyatli berildi: ${objectId}`);
        console.log(`   OLX URL: ${result.adUrl}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // 10 soniya kutish (OLX rate limit)
        if (global.adQueue.length > 0) {
            console.log(`⏳ 10 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                processAdQueue();
            }, 10000);
        }

    } catch (error) {
        console.error(`❌ Elon berishda xato: ${objectId}`, error);

        // Status yangilash - error
        updateObjectStatus(objectId, 'waiting');

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingisiga o'tish
        if (global.adQueue.length > 0) {
            setTimeout(() => {
                processAdQueue();
            }, 10000);
        }
    }
}

/**
 * Navbat statusini olish
 * GET /api/excel/queue-status
 */
exports.getQueueStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            queue: global.adQueue || [],
            queueLength: (global.adQueue || []).length,
            isProcessing: (global.adQueue || []).length > 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getObjects: exports.getObjects,
    postAd: exports.postAd,
    getQueueStatus: exports.getQueueStatus
};