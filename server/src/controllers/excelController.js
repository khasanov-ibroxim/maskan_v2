// server/src/controllers/excelController.js - FIXED
const PropertyObject = require('../models/Object.pg');
const { postToOLX } = require('../services/olxAutomationService');

// ✅ GLOBAL QUEUE (serverni restart qilganda yo'qoladi)
if (!global.adQueue) {
    global.adQueue = [];
}
if (!global.isQueueProcessing) {
    global.isQueueProcessing = false;
}

/**
 * ✅ HELPER: Transform object
 */
function transformObject(obj) {
    if (!obj) return null;
    return {
        ...obj,
        elonStatus: obj.elon_status,
        elonDate: obj.elon_date,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
        sheetType: obj.sheet_type,
        uyTuri: obj.uy_turi,
        uniqueId: obj.unique_id
    };
}

/**
 * Get all objects
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
        const transformedObjects = objects.map(transformObject);

        console.log(`✅ ${transformedObjects.length} ta obyekt topildi`);

        res.json({
            success: true,
            count: transformedObjects.length,
            objects: transformedObjects
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
 * ✅ FIXED: Post Ad with better error handling
 */
exports.postAd = async (req, res) => {
    try {
        const { objectId } = req.body;

        console.log('\n📤 Post Ad Request:');
        console.log('   objectId:', objectId);

        if (!objectId) {
            return res.status(400).json({
                success: false,
                error: 'ObjectId majburiy'
            });
        }

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(objectId)) {
            console.error('❌ Noto\'g\'ri UUID:', objectId);
            return res.status(400).json({
                success: false,
                error: 'Noto\'g\'ri UUID format'
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

        console.log('✅ Obyekt topildi:', object.kvartil, object.xet);

        // ✅ FIXED: Navbatda borligini tekshirish
        if (global.adQueue.includes(objectId)) {
            const position = global.adQueue.indexOf(objectId) + 1;
            return res.json({
                success: true,
                message: 'Allaqachon navbatda',
                queuePosition: position,
                status: 'waiting'
            });
        }

        // ✅ FIXED: Processing statusni tekshirish
        if (object.elon_status === 'processing') {
            return res.json({
                success: true,
                message: 'Allaqachon qayta ishlanmoqda',
                status: 'processing'
            });
        }

        // ✅ FIXED: Posted statusni tekshirish
        if (object.elon_status === 'posted') {
            return res.json({
                success: true,
                message: 'Elon allaqachon berilgan',
                status: 'posted',
                elonDate: object.elon_date
            });
        }

        // Navbatga qo'shish
        global.adQueue.push(objectId);

        console.log(`📤 Navbatga qo'shildi: ${objectId}`);
        console.log(`   Navbat uzunligi: ${global.adQueue.length}`);

        // Response yuborish
        res.json({
            success: true,
            message: 'Elon navbatga qo\'shildi',
            queuePosition: global.adQueue.length,
            status: 'waiting'
        });

        // Background'da elon berish
        if (!global.isQueueProcessing) {
            processAdQueue();
        }

    } catch (error) {
        console.error('❌ Post Ad xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * ✅ FIXED: Process queue with proper error handling
 */
async function processAdQueue() {
    if (global.isQueueProcessing) {
        console.log('ℹ️ Navbat allaqachon qayta ishlanmoqda');
        return;
    }

    if (!global.adQueue || global.adQueue.length === 0) {
        console.log('✅ Elon navbati bo\'sh');
        global.isQueueProcessing = false;
        return;
    }

    global.isQueueProcessing = true;
    const objectId = global.adQueue[0];

    try {
        console.log(`\n📤 Elon berilmoqda: ${objectId}`);
        console.log(`   Navbatda qolgan: ${global.adQueue.length - 1}`);

        // Obyektni olish
        const object = await PropertyObject.getById(objectId);

        if (!object) {
            console.error('❌ Obyekt topilmadi:', objectId);
            global.adQueue.shift();
            global.isQueueProcessing = false;
            processAdQueue();
            return;
        }

        console.log(`   Kvartil: ${object.kvartil}`);
        console.log(`   XET: ${object.xet}`);

        // ✅ OLX ga elon berish
        const result = await postToOLX(object);

        console.log(`✅ Elon muvaffaqiyatli berildi: ${objectId}`);
        console.log(`   OLX URL: ${result.adUrl || 'N/A'}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish (10 soniya kutib)
        if (global.adQueue.length > 0) {
            console.log(`⏳ 10 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                global.isQueueProcessing = false;
                processAdQueue();
            }, 10000);
        } else {
            console.log('🎉 Navbat bo\'sh - barcha elonlar berildi!');
            global.isQueueProcessing = false;
        }

    } catch (error) {
        console.error(`❌ Elon berishda xato: ${objectId}`);
        console.error(`   Error: ${error.message}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish
        if (global.adQueue.length > 0) {
            console.log(`⏭️ Keyingi elonga o'tilmoqda... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                global.isQueueProcessing = false;
                processAdQueue();
            }, 10000);
        } else {
            global.isQueueProcessing = false;
        }
    }
}

/**
 * Get queue status
 */
exports.getQueueStatus = async (req, res) => {
    try {
        const queue = global.adQueue || [];
        const queueDetails = [];

        for (const objectId of queue) {
            const obj = await PropertyObject.getById(objectId);
            if (obj) {
                queueDetails.push(transformObject(obj));
            }
        }

        res.json({
            success: true,
            queue: queue,
            queueDetails: queueDetails,
            queueLength: queue.length,
            isProcessing: global.isQueueProcessing,
            currentlyProcessing: queue.length > 0 && global.isQueueProcessing ? queueDetails[0] : null
        });
    } catch (error) {
        console.error('❌ Queue status xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get statistics
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await PropertyObject.getStats();
        const byKvartil = await PropertyObject.getByKvartil();

        res.json({
            success: true,
            stats: {
                ...stats,
                byKvartil,
                queue: {
                    length: global.adQueue?.length || 0,
                    isProcessing: global.isQueueProcessing || false
                }
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
 * Search
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
        const transformedResults = results.map(transformObject);

        res.json({
            success: true,
            count: transformedResults.length,
            results: transformedResults
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
 * Delete object
 */
exports.deleteObject = async (req, res) => {
    try {
        const { id } = req.params;

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Noto\'g\'ri UUID format'
            });
        }

        const object = await PropertyObject.getById(id);
        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // ✅ FIXED: Navbatdan ham o'chirish
        const queueIndex = global.adQueue.indexOf(id);
        if (queueIndex !== -1) {
            global.adQueue.splice(queueIndex, 1);
            console.log(`🗑️ Navbatdan o'chirildi: ${id}`);
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