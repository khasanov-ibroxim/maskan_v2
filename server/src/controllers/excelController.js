// server/src/controllers/excelController.js
const { readFromLocalExcel } = require('../services/localExcelService');

/**
 * Barcha obyektlarni olish (elon statusli)
 * GET /api/excel/objects
 */
exports.getObjects = async (req, res) => {
    try {
        const data = await readFromLocalExcel();

        // Obyektlarni formatlash va elon statusi qo'shish
        const objects = data.map(item => ({
            id: item.id,
            kvartil: item.kvartil,
            xet: item.xet,
            m2: item.m2,
            narx: item.narx,
            tell: item.tell,
            rieltor: item.rieltor,
            folderLink: item.rasmlar,
            sana: item.sana,
            elonStatus: item.elonStatus || 'waiting', // waiting, processing, posted
            elonDate: item.elonDate || null,
            opisaniya: item.opisaniya,
            fio: item.fio,
            xolati: item.xolati,
            uy_turi: item.uy_turi,
            balkon: item.balkon,
            planirovka: item.planirovka
        }));

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
 * Elon berish (OLX)
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
        const data = await readFromLocalExcel();
        const object = data.find(item => item.id === objectId);

        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // Elon berish statusini yangilash
        object.elonStatus = 'processing';

        // Navbatga qo'shish
        global.adQueue = global.adQueue || [];
        global.adQueue.push(objectId);

        // Agar navbat bo'sh bo'lsa, darhol ishga tushirish
        if (global.adQueue.length === 1) {
            processAdQueue();
        }

        res.json({
            success: true,
            message: 'Elon navbatga qo\'shildi',
            queuePosition: global.adQueue.length,
            status: 'processing'
        });

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
        console.log(`📤 Elon berilmoqda: ${objectId}`);

        // Obyektni olish
        const data = await readFromLocalExcel();
        const object = data.find(item => item.id === objectId);

        if (!object) {
            throw new Error('Obyekt topilmadi');
        }

        // OLX.uz ga elon berish (hozircha simulyatsiya)
        await postToOLX(object);

        // Statusni yangilash
        object.elonStatus = 'posted';
        object.elonDate = new Date().toISOString();

        // Excel'ga saqlash
        const { saveToLocalExcel } = require('../services/localExcelService');
        await saveToLocalExcel(object, object.rasmlar);

        console.log(`✅ Elon muvaffaqiyatli berildi: ${objectId}`);

        // Navbatdan o'chirish
        global.adQueue.shift();

        // 10 soniya kutish
        if (global.adQueue.length > 0) {
            console.log(`⏳ 10 soniya kutish... (Navbatda: ${global.adQueue.length})`);
            setTimeout(() => {
                processAdQueue();
            }, 10000);
        }

    } catch (error) {
        console.error(`❌ Elon berishda xato: ${objectId}`, error);

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
 * OLX.uz ga elon berish
 */
async function postToOLX(object) {
    // Bu yerda OLX.uz API integratsiyasi bo'lishi kerak
    // Hozircha simulyatsiya

    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('📝 OLX.uz ga elon berildi (simulyatsiya)');
            resolve({ success: true });
        }, 2000);
    });
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