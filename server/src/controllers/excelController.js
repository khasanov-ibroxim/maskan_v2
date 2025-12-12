// server/src/controllers/excelController.js - LOCAL OLX VERSION
const PropertyObject = require('../models/Object.pg');
const { postToOLXLocal, cleanTempImages } = require('../services/olxAutomationService');

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
 * ✅ Post Ad - LOCAL OLX VERSION
 */
exports.postAd = async (req, res) => {
    try {
        const { objectId } = req.body;

        console.log('\n📤 Post Ad Request (LOCAL MODE):');
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

        // ✅ Navbatda borligini tekshirish
        if (global.adQueue.includes(objectId)) {
            const position = global.adQueue.indexOf(objectId) + 1;
            return res.json({
                success: true,
                message: 'Allaqachon navbatda',
                queuePosition: position,
                status: 'waiting'
            });
        }

        // ✅ Processing statusni tekshirish
        if (object.elon_status === 'processing') {
            return res.json({
                success: true,
                message: 'Allaqachon qayta ishlanmoqda',
                status: 'processing'
            });
        }

        // ✅ Posted statusni tekshirish
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
            message: 'Elon navbatga qo\'shildi (LOCAL MODE)',
            queuePosition: global.adQueue.length,
            status: 'waiting',
            note: 'Browser oynasida login qilish kerak bo\'lishi mumkin'
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
 * ✅ Process queue - LOCAL VERSION
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
        console.log(`\n📤 ELON BERILMOQDA (LOCAL MODE): ${objectId}`);
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
        console.log(`   Rasmlar: ${object.rasmlar}`);

        // ✅ LOCAL OLX AUTOMATION
        console.log('\n🤖 LOCAL BROWSER OCHILMOQDA...');
        console.log('   GUI mode: Jarayonni ko\'rishingiz mumkin');
        console.log('   Login kerak bo\'lsa: Qo\'lda login qiling');
        console.log('='.repeat(60));

        const result = await postToOLXLocal(object);

        console.log(`\n✅ ELON MUVAFFAQIYATLI BERILDI: ${objectId}`);
        console.log(`   OLX URL: ${result.adUrl || 'N/A'}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish (30 soniya kutib)
        if (global.adQueue.length > 0) {
            console.log(`\n⏳ 30 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                global.isQueueProcessing = false;
                processAdQueue();
            }, 30000); // 30 seconds delay
        } else {
            console.log('\n🎉 NAVBAT BO\'SH - BARCHA ELONLAR BERILDI!');
            global.isQueueProcessing = false;
        }

    } catch (error) {
        console.error(`\n❌ ELON BERISHDA XATO: ${objectId}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // Keyingi elonga o'tish
        if (global.adQueue.length > 0) {
            console.log(`\n⏭️ Keyingi elonga o'tilmoqda... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                global.isQueueProcessing = false;
                processAdQueue();
            }, 10000); // 10 seconds delay after error
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
            mode: 'LOCAL',
            queue: queue,
            queueDetails: queueDetails,
            queueLength: queue.length,
            isProcessing: global.isQueueProcessing,
            currentlyProcessing: queue.length > 0 && global.isQueueProcessing ? queueDetails[0] : null,
            note: 'LOCAL mode: Browser oynasida login qilish kerak bo\'lishi mumkin'
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
                },
                mode: 'LOCAL'
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

        // ✅ Navbatdan ham o'chirish
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

/**
 * ✅ YANGI: Clear queue (admin only)
 */
exports.clearQueue = async (req, res) => {
    try {
        const queueLength = global.adQueue?.length || 0;
        global.adQueue = [];
        global.isQueueProcessing = false;

        console.log(`🗑️ Navbat tozalandi: ${queueLength} ta obyekt`);

        res.json({
            success: true,
            message: `Navbat tozalandi (${queueLength} ta obyekt)`,
            clearedCount: queueLength
        });

    } catch (error) {
        console.error('❌ Navbat tozalashda xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * ✅ YANGI: Clean temp images (admin only)
 */
exports.cleanTempImages = async (req, res) => {
    try {
        cleanTempImages(); // Already imported at top

        res.json({
            success: true,
            message: 'Vaqtinchalik rasmlar tozalandi'
        });

    } catch (error) {
        console.error('❌ Temp tozalashda xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


/**
 * ✅ YANGI: Update object
 * PUT /api/excel/objects/:id
 */
exports.updateObject = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log('\n📝 OBYEKT YANGILANMOQDA');
        console.log('='.repeat(60));
        console.log('  ID:', id);
        console.log('  Updates:', Object.keys(updates));

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Noto\'g\'ri UUID format'
            });
        }

        // 1. PostgreSQL'dan obyektni topish
        const object = await PropertyObject.getById(id);
        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        console.log('  ✅ Obyekt topildi:', object.kvartil, object.xet);

        // 2. PostgreSQL'da yangilash
        console.log('\n💾 PostgreSQL ga yangilanmoqda...');
        const updatedObject = await PropertyObject.update(id, updates);
        console.log('  ✅ PostgreSQL yangilandi');

        // 3. App Script'ga yuborish (GLAVNIY va RIELTOR)
        const appScriptUpdates = {
            action: 'update',
            id: object.unique_id, // ✅ unique_id ishlatish
            updates: updates
        };

        // 3.1 GLAVNIY EXCEL
        const { HERO_APP_SCRIPT } = require('../config/env');
        if (HERO_APP_SCRIPT) {
            console.log('\n📊 GLAVNIY EXCEL ga yuborish...');
            try {
                await sendToAppScriptWithRetry(HERO_APP_SCRIPT, appScriptUpdates);
                console.log('  ✅ GLAVNIY EXCEL yangilandi');
            } catch (error) {
                console.error('  ❌ GLAVNIY EXCEL xato:', error.message);
            }
        }

        // 3.2 RIELTOR EXCEL
        const User = require('../models/User.pg');
        try {
            const realtors = await User.getRealtors();
            const rielterInfo = realtors.find(u => u.username === object.rieltor);

            if (rielterInfo?.app_script_url) {
                console.log('\n👨‍💼 RIELTOR EXCEL ga yuborish...');
                await sendToAppScriptWithRetry(
                    rielterInfo.app_script_url,
                    appScriptUpdates,
                    rielterInfo.id
                );
                console.log('  ✅ RIELTOR EXCEL yangilandi');
            }
        } catch (error) {
            console.error('  ❌ RIELTOR EXCEL xato:', error.message);
        }

        console.log('\n✅ YANGILANISH TUGADI');
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli yangilandi',
            object: transformObject(updatedObject)
        });

    } catch (error) {
        console.error('❌ Update xato:', error);
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
    deleteObject: exports.deleteObject,
    clearQueue: exports.clearQueue,
    cleanTempImages: exports.cleanTempImages,
    updateObject: exports.updateObject 
};