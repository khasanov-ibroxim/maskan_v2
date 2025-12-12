// server/src/controllers/excelController.js - FULLY FIXED UPDATE
const PropertyObject = require('../models/Object.pg');
const { postToOLXLocal, cleanTempImages } = require('../services/olxAutomationService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const path = require('path');
const fs = require('fs');
const { createAdTexts } = require('../utils/fileHelper');
const { UPLOADS_DIR } = require('../config/constants');

// ✅ GLOBAL QUEUE
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

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(objectId)) {
            console.error('❌ Noto\'g\'ri UUID:', objectId);
            return res.status(400).json({
                success: false,
                error: 'Noto\'g\'ri UUID format'
            });
        }

        const object = await PropertyObject.getById(objectId);

        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        console.log('✅ Obyekt topildi:', object.kvartil, object.xet);

        if (global.adQueue.includes(objectId)) {
            const position = global.adQueue.indexOf(objectId) + 1;
            return res.json({
                success: true,
                message: 'Allaqachon navbatda',
                queuePosition: position,
                status: 'waiting'
            });
        }

        if (object.elon_status === 'processing') {
            return res.json({
                success: true,
                message: 'Allaqachon qayta ishlanmoqda',
                status: 'processing'
            });
        }

        if (object.elon_status === 'posted') {
            return res.json({
                success: true,
                message: 'Elon allaqachon berilgan',
                status: 'posted',
                elonDate: object.elon_date
            });
        }

        global.adQueue.push(objectId);

        console.log(`📤 Navbatga qo'shildi: ${objectId}`);
        console.log(`   Navbat uzunligi: ${global.adQueue.length}`);

        res.json({
            success: true,
            message: 'Elon navbatga qo\'shildi (LOCAL MODE)',
            queuePosition: global.adQueue.length,
            status: 'waiting',
            note: 'Browser oynasida login qilish kerak bo\'lishi mumkin'
        });

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
 * ✅ Process queue
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

        console.log('\n🤖 LOCAL BROWSER OCHILMOQDA...');
        const result = await postToOLXLocal(object);

        console.log(`\n✅ ELON MUVAFFAQIYATLI BERILDI: ${objectId}`);
        console.log(`   OLX URL: ${result.adUrl || 'N/A'}`);

        global.adQueue.shift();

        if (global.adQueue.length > 0) {
            console.log(`\n⏳ 5 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                global.isQueueProcessing = false;
                processAdQueue();
            }, 5000);
        } else {
            console.log('\n🎉 NAVBAT BO\'SH - BARCHA ELONLAR BERILDI!');
            global.isQueueProcessing = false;
        }

    } catch (error) {
        console.error(`\n❌ ELON BERISHDA XATO: ${objectId}`);
        console.error(`   Error: ${error.message}`);

        global.adQueue.shift();

        if (global.adQueue.length > 0) {
            console.log(`\n⏭️ Keyingi elonga o'tilmoqda... (Navbatda: ${global.adQueue.length})`);
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
 * ✅ Clear queue
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
 * ✅ Clean temp images
 */
exports.cleanTempImages = async (req, res) => {
    try {
        cleanTempImages();

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
 * ✅✅✅ FULLY FIXED: Update object with App Script + TXT files
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
        console.log('  📁 Rasmlar URL:', object.rasmlar);

        // 2. ✅ CRITICAL: Rieltor o'zgarishini tekshirish
        const oldRieltor = object.rieltor;
        const newRieltor = updates.rieltor || oldRieltor;
        const rielterChanged = newRieltor !== oldRieltor;

        console.log('\n👨‍💼 RIELTOR TEKSHIRUVI:');
        console.log(`  Eski: ${oldRieltor}`);
        console.log(`  Yangi: ${newRieltor}`);
        console.log(`  O'zgardi: ${rielterChanged ? '✅ HA' : '❌ YO\'Q'}`);

        // 3. PostgreSQL'da yangilash
        console.log('\n💾 PostgreSQL ga yangilanmoqda...');
        const updatedObject = await PropertyObject.update(id, updates);
        console.log('  ✅ PostgreSQL yangilandi');

        // 4. ✅ App Script'ga yuborish uchun ma'lumotlar
        const appScriptUpdates = {
            action: 'update',
            id: object.unique_id, // ✅ unique_id ishlatish
            updates: updates
        };

        console.log('\n📊 APP SCRIPT MA\'LUMOTLARI:');
        console.log('  Action:', appScriptUpdates.action);
        console.log('  Unique ID:', appScriptUpdates.id);
        console.log('  Updates:', Object.keys(appScriptUpdates.updates));

        // 5. ✅ GLAVNIY EXCEL'GA YUBORISH
        const { HERO_APP_SCRIPT } = require('../config/env');
        if (HERO_APP_SCRIPT) {
            console.log('\n📊 GLAVNIY EXCEL ga yuborish...');
            try {
                await sendToAppScriptWithRetry(HERO_APP_SCRIPT, appScriptUpdates);
                console.log('  ✅ GLAVNIY EXCEL yangilandi');
            } catch (error) {
                console.error('  ❌ GLAVNIY EXCEL xato:', error.message);
            }
        } else {
            console.log('  ⚠️ HERO_APP_SCRIPT yo\'q');
        }

        // 6. ✅ ESKI RIELTOR EXCEL'DAN O'CHIRISH (agar rieltor o'zgardi)
        if (rielterChanged && oldRieltor) {
            console.log('\n🗑️ ESKI RIELTOR EXCEL\'DAN O\'CHIRISH...');
            const User = require('../models/User.pg');
            try {
                const realtors = await User.getRealtors();
                const oldRielterInfo = realtors.find(u => u.username === oldRieltor);

                if (oldRielterInfo?.app_script_url) {
                    console.log(`  Eski rieltor: ${oldRieltor}`);
                    console.log(`  App Script URL: ${oldRielterInfo.app_script_url}`);

                    // ✅ DELETE action yuborish
                    const deleteData = {
                        action: 'delete',
                        id: object.unique_id
                    };

                    await sendToAppScriptWithRetry(
                        oldRielterInfo.app_script_url,
                        deleteData,
                        oldRielterInfo.id
                    );
                    console.log('  ✅ Eski rieltor Excel\'dan o\'chirildi');
                } else {
                    console.log('  ⚠️ Eski rieltor App Script URL topilmadi');
                }
            } catch (error) {
                console.error('  ❌ Eski rieltor o\'chirishda xato:', error.message);
            }
        }

        // 7. ✅ YANGI RIELTOR EXCEL'GA QO'SHISH
        if (newRieltor) {
            console.log('\n👨‍💼 YANGI RIELTOR EXCEL ga yuborish...');
            const User = require('../models/User.pg');
            try {
                const realtors = await User.getRealtors();
                const newRielterInfo = realtors.find(u => u.username === newRieltor);

                if (newRielterInfo?.app_script_url) {
                    console.log(`  Rieltor: ${newRieltor}`);
                    console.log(`  App Script URL: ${newRielterInfo.app_script_url}`);

                    // ✅ Agar rieltor o'zgardi - yangi qator qo'shish, aks holda - update
                    if (rielterChanged) {
                        console.log('  📝 Rieltor o\'zgardi - yangi qator yaratish...');
                        // To'liq obyekt ma'lumotlarini yuborish (CREATE action)
                        const fullData = {
                            ...updatedObject,
                            folderLink: updatedObject.rasmlar || "Yo'q"
                        };
                        await sendToAppScriptWithRetry(
                            newRielterInfo.app_script_url,
                            fullData, // CREATE uchun to'liq ma'lumot
                            newRielterInfo.id
                        );
                        console.log('  ✅ Yangi rieltor Excel\'ga qo\'shildi');
                    } else {
                        console.log('  📝 Rieltor o\'zgarmadi - update qilish...');
                        // UPDATE action
                        await sendToAppScriptWithRetry(
                            newRielterInfo.app_script_url,
                            appScriptUpdates,
                            newRielterInfo.id
                        );
                        console.log('  ✅ Rieltor Excel yangilandi');
                    }
                } else {
                    console.log('  ⚠️ Rieltor App Script URL topilmadi');
                }
            } catch (error) {
                console.error('  ❌ RIELTOR EXCEL xato:', error.message);
            }
        }

        // 8. ✅ TXT FAYLLARNI YANGILASH (OLX.TXT va TELEGRAM.TXT)
        console.log('\n📄 TXT FAYLLARNI YANGILASH...');
        try {
            // Rasmlar papkasini topish
            if (updatedObject.rasmlar && updatedObject.rasmlar !== "Yo'q") {
                console.log('  Rasmlar URL:', updatedObject.rasmlar);

                // URL'dan folder path'ni olish
                const urlParts = updatedObject.rasmlar.split('/browse/');
                if (urlParts.length > 1) {
                    const relativePath = decodeURIComponent(urlParts[1]);
                    const folderPath = path.join(UPLOADS_DIR, relativePath);

                    console.log('  Folder path:', folderPath);

                    if (fs.existsSync(folderPath)) {
                        console.log('  ✅ Papka topildi');

                        // Yangilangan ma'lumotlar bilan txt yaratish
                        const { olxText, telegramText } = createAdTexts(updatedObject);

                        // OLX.TXT yangilash
                        const olxPath = path.join(folderPath, 'olx.txt');
                        fs.writeFileSync(olxPath, olxText, 'utf8');
                        console.log('  ✅ olx.txt yangilandi');

                        // TELEGRAM.TXT yangilash
                        const telegramPath = path.join(folderPath, 'telegram.txt');
                        fs.writeFileSync(telegramPath, telegramText, 'utf8');
                        console.log('  ✅ telegram.txt yangilandi');
                    } else {
                        console.log('  ⚠️ Papka topilmadi:', folderPath);
                    }
                } else {
                    console.log('  ⚠️ URL formatida xato');
                }
            } else {
                console.log('  ⚠️ Rasmlar URL yo\'q');
            }
        } catch (txtError) {
            console.error('  ❌ TXT fayllar yangilashda xato:', txtError.message);
        }

        console.log('\n✅ YANGILANISH TUGADI');
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli yangilandi',
            object: transformObject(updatedObject),
            rielterChanged: rielterChanged,
            txtFilesUpdated: true
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