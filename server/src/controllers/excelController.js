// server/src/controllers/excelController.js
const PropertyObject = require('../models/Object.pg');
const { postToOLX } = require('../services/olxAutomationService');

/**
 * ✅ HELPER: DB object -> Frontend format
 */
function transformObject(obj) {
    if (!obj) return null;
    return {
        ...obj,
        elonStatus: obj.elon_status,      // ✅ DB: elon_status -> Frontend: elonStatus
        elonDate: obj.elon_date,          // ✅ DB: elon_date -> Frontend: elonDate
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
        sheetType: obj.sheet_type,
        uyTuri: obj.uy_turi,
        uniqueId: obj.unique_id
    };
}

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

        // ✅ Transform: snake_case -> camelCase
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
 * OLX ga elon berish
 * POST /api/excel/post-ad
 */
exports.postAd = async (req, res) => {
    try {
        const { objectId } = req.body;

        console.log('\n📤 Post Ad Request:');
        console.log('   objectId:', objectId);
        console.log('   Type:', typeof objectId);
        console.log('   Length:', objectId?.length);

        if (!objectId) {
            return res.status(400).json({
                success: false,
                error: 'ObjectId majburiy'
            });
        }

        // ✅ UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(objectId)) {
            console.error('❌ Noto\'g\'ri UUID format:', objectId);
            return res.status(400).json({
                success: false,
                error: `Noto'g'ri UUID format: ${objectId}`
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

        console.log('✅ Obyekt topildi:', object.id);
        console.log('   Kvartil:', object.kvartil);
        console.log('   XET:', object.xet);

        // ✅ Status yangilash - faqat elon_status
        await PropertyObject.update(objectId, {
            elon_status: 'processing'
        });

        console.log('✅ Status yangilandi: processing');

        // Navbatga qo'shish
        global.adQueue = global.adQueue || [];
        global.adQueue.push(objectId);

        console.log(`📤 Elon navbatga qo'shildi: ${objectId}`);
        console.log(`   Navbat uzunligi: ${global.adQueue.length}`);

        // Response yuborish
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
        console.error('   Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * ✅ FIXED: Navbatni qayta ishlash (faqat elon_status)
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
        console.log(`   M²: ${object.m2}`);

        // ✅ OLX.uz ga elon berish
        const result = await postToOLX(object);

        console.log(`✅ Elon muvaffaqiyatli berildi: ${objectId}`);
        console.log(`   OLX URL: ${result.adUrl || 'N/A'}`);

        // ✅ Status yangilash - faqat elon_status va elon_date
        await PropertyObject.update(objectId, {
            elon_status: 'posted',
            elon_date: new Date()
        });

        console.log(`✅ Database yangilandi:`);
        console.log(`   elon_status: posted`);
        console.log(`   elon_date: ${new Date().toLocaleString('uz-UZ')}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish (10 soniya kutib)
        if (global.adQueue.length > 0) {
            console.log(`⏳ 10 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                processAdQueue();
            }, 10000);
        } else {
            console.log('🎉 Navbat bo\'sh - barcha elonlar berildi!');
        }

    } catch (error) {
        console.error(`❌ Elon berishda xato: ${objectId}`);
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack:`, error.stack);

        try {
            // ✅ Xato statusini yangilash - faqat elon_status
            await PropertyObject.update(objectId, {
                elon_status: 'error'
            });

            console.log(`✅ Database yangilandi:`);
            console.log(`   elon_status: error`);

        } catch (updateError) {
            console.error(`❌ Status yangilashda xato:`, updateError.message);
        }

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish
        if (global.adQueue.length > 0) {
            console.log(`⏭️ Keyingi elonga o'tilmoqda... (Navbatda: ${global.adQueue.length})`);
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
        const queueDetails = [];

        for (const objectId of queue) {
            const obj = await PropertyObject.getById(objectId);
            if (obj) {
                queueDetails.push(transformObject(obj));
            }
        }

        res.json({
            success: true,
            queue: queue,                                    // ✅ ID array
            queueDetails: queueDetails,                      // ✅ Full objects
            queueLength: queue.length,
            isProcessing: queue.length > 0,
            currentlyProcessing: queue.length > 0 ? queueDetails[0] : null
        });
    } catch (error) {
        console.error('❌ Navbat statusini olishda xato:', error);
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
 * Obyektni o'chirish
 * DELETE /api/excel/objects/:id
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
