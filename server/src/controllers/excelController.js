// server/src/controllers/excelController.js - PostgreSQL version
const PropertyObject = require('../models/Object.pg');
const { postToOLX } = require('../services/olxAutomationService');

/**
 * Barcha obyektlarni olish
 * GET /api/excel/objects
 */
exports.getObjects = async (req, res) => {
    try {
        console.log('📊 Obyektlar so\'ralmoqda...');

        const { kvartil, rieltor, status } = req.query;

        const filters = {};
        if (kvartil) filters.kvartil = kvartil;
        if (rieltor) filters.rieltor = rieltor;
        if (status) filters.elonStatus = status;

        const objects = await PropertyObject.getAll(filters);

        console.log(`✅ ${objects.length} ta obyekt topildi`);

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
        const object = await PropertyObject.getById(objectId);

        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // Status yangilash - processing
        await PropertyObject.updateStatus(objectId, 'processing');

        // Navbatga qo'shish
        global.adQueue = global.adQueue || [];
        global.adQueue.push(objectId);

        console.log(`📤 Elon navbatga qo'shildi: ${objectId}`);
        console.log(`   Navbat uzunligi: ${global.adQueue.length}`);

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
        console.log(`   Navbatda qolgan: ${global.adQueue.length - 1}`);

        // Obyektni olish
        const object = await PropertyObject.getById(objectId);

        if (!object) {
            throw new Error('Obyekt topilmadi');
        }

        console.log(`   Kvartil: ${object.kvartil}`);
        console.log(`   XET: ${object.xet}`);
        console.log(`   Narx: ${object.narx}`);

        // ✅ OLX.uz ga HAQIQIY elon berish
        const result = await postToOLX(object);

        // Status yangilash - posted
        await PropertyObject.updateStatus(
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
        } else {
            console.log('✅ Navbat bo\'sh - barcha elonlar berildi');
        }

    } catch (error) {
        console.error(`❌ Elon berishda xato: ${objectId}`, error);

        // Status yangilash - waiting (qayta urinish uchun)
        await PropertyObject.updateStatus(objectId, 'waiting');

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingisiga o'tish
        if (global.adQueue.length > 0) {
            console.log(`⏭️ Keyingi elonga o'tilmoqda...`);
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
        const queue = global.adQueue || [];

        // Queue'dagi obyektlar haqida ma'lumot
        const queueDetails = [];
        for (const objectId of queue) {
            const obj = await PropertyObject.getById(objectId);
            if (obj) {
                queueDetails.push({
                    id: obj.id,
                    kvartil: obj.kvartil,
                    xet: obj.xet,
                    narx: obj.narx
                });
            }
        }

        res.json({
            success: true,
            queue: queueDetails,
            queueLength: queue.length,
            isProcessing: queue.length > 0,
            currentlyProcessing: queue.length > 0 ? queueDetails[0] : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Statistika olish
 * GET /api/excel/stats
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await PropertyObject.getStats();
        const byKvartil = await PropertyObject.getByKvartil();

        res.json({
            success: true,
            stats: {
                ...stats,
                byKvartil
            }
        });
    } catch (error) {
        console.error('❌ Statistika xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Qidiruv
 * GET /api/excel/search?q=...
 */
exports.search = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Qidiruv so\'zi kamida 2 ta belgi bo\'lishi kerak'
            });
        }

        const results = await PropertyObject.search(q.trim());

        res.json({
            success: true,
            count: results.length,
            results
        });

    } catch (error) {
        console.error('❌ Qidiruv xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Obyektni o'chirish
 * DELETE /api/excel/objects/:id
 */
exports.deleteObject = async (req, res) => {
    try {
        const { id } = req.params;

        const object = await PropertyObject.getById(id);
        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        await PropertyObject.delete(id);

        console.log(`🗑️ Obyekt o'chirildi: ${id}`);

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli o\'chirildi'
        });

    } catch (error) {
        console.error('❌ O\'chirishda xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getObjects: exports.getObjects,
    postAd: exports.postAd,
    getQueueStatus: exports.getQueueStatus,
    getStats: exports.getStats,
    search: exports.search,
    deleteObject: exports.deleteObject
};