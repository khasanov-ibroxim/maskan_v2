// server/src/services/serverDBService.js
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../../storage');
const DB_FILE = path.join(DB_DIR, 'serverDB.json');

console.log('📂 ServerDB konfiguratsiya:', DB_FILE);

// DB papkasini yaratish
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('✅ Storage papka yaratildi');
}

/**
 * DB faylni o'qish
 */
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = {
                objects: [],
                lastUpdate: new Date().toISOString(),
                version: '1.0'
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            console.log('✅ Yangi serverDB.json yaratildi');
            return initialData;
        }

        const content = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ DB o\'qishda xato:', error);
        return { objects: [], lastUpdate: new Date().toISOString() };
    }
}

/**
 * DB ga yozish
 */
function writeDB(data) {
    try {
        data.lastUpdate = new Date().toISOString();
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        console.log('✅ ServerDB yangilandi');
        return true;
    } catch (error) {
        console.error('❌ DB yozishda xato:', error);
        return false;
    }
}

/**
 * Yangi obyekt qo'shish yoki yangilash
 */
function saveObject(objectData) {
    console.log('\n💾 ServerDB ga saqlash...');
    console.log('  Kvartil:', objectData.kvartil);
    console.log('  XET:', objectData.xet);

    const db = readDB();

    // Unique ID yaratish (kvartil + xet + telefon)
    const uniqueId = `${objectData.kvartil}_${objectData.xet}_${objectData.tell}`.replace(/\s+/g, '');

    // Mavjud obyektni topish
    const existingIndex = db.objects.findIndex(obj => obj.uniqueId === uniqueId);

    const newObject = {
        id: existingIndex >= 0 ? db.objects[existingIndex].id : Date.now().toString(),
        uniqueId: uniqueId,
        ...objectData,
        elonStatus: existingIndex >= 0 ? db.objects[existingIndex].elonStatus : 'waiting',
        elonDate: existingIndex >= 0 ? db.objects[existingIndex].elonDate : null,
        createdAt: existingIndex >= 0 ? db.objects[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        // Mavjud obyektni yangilash
        db.objects[existingIndex] = newObject;
        console.log('✅ Obyekt yangilandi:', uniqueId);
    } else {
        // Yangi obyekt qo'shish
        db.objects.push(newObject);
        console.log('✅ Yangi obyekt qo\'shildi:', uniqueId);
    }

    // Saralash
    db.objects = sortObjects(db.objects);

    writeDB(db);
    return newObject;
}

/**
 * Barcha obyektlarni olish
 */
function getAllObjects() {
    const db = readDB();
    return db.objects || [];
}

/**
 * ID bo'yicha obyekt topish
 */
function getObjectById(id) {
    const db = readDB();
    return db.objects.find(obj => obj.id === id);
}

/**
 * Obyektni yangilash (elon status)
 */
function updateObjectStatus(id, status, elonDate = null) {
    const db = readDB();
    const index = db.objects.findIndex(obj => obj.id === id);

    if (index >= 0) {
        db.objects[index].elonStatus = status;
        db.objects[index].elonDate = elonDate;
        db.objects[index].updatedAt = new Date().toISOString();

        writeDB(db);
        console.log(`✅ Obyekt ${id} status yangilandi: ${status}`);
        return db.objects[index];
    }

    return null;
}

/**
 * Saralash funksiyasi
 */
function sortObjects(objects) {
    return objects.sort((a, b) => {
        // Kvartil bo'yicha
        const orderA = getKvartilOrder(a.kvartil);
        const orderB = getKvartilOrder(b.kvartil);

        if (orderA.group !== orderB.group) return orderA.group - orderB.group;
        if (orderA.number !== orderB.number) return orderA.number - orderB.number;

        // XET bo'yicha
        const xetA = parseXET(a.xet);
        const xetB = parseXET(b.xet);

        if (xetA.xona !== xetB.xona) return xetA.xona - xetB.xona;
        if (xetA.etaj !== xetB.etaj) return xetA.etaj - xetB.etaj;
        return xetA.etajnost - xetB.etajnost;
    });
}

function getKvartilOrder(kvartil) {
    kvartil = String(kvartil || '').trim();
    if (!kvartil) return { group: 9999, number: 0 };

    if (/^Yunusobod\s*-\s*\d+$/i.test(kvartil)) {
        const num = parseInt(kvartil.match(/\d+/)[0]);
        return { group: 1, number: num };
    }
    if (/^Ц\s*-\s*\d+$/i.test(kvartil)) {
        const num = parseInt(kvartil.match(/\d+/)[0]);
        return { group: 2, number: num };
    }
    if (/^Bodomzor$/i.test(kvartil)) return { group: 3, number: 0 };
    if (/^Minor$/i.test(kvartil)) return { group: 4, number: 0 };

    return { group: 999, number: 0 };
}

function parseXET(xet) {
    const parts = String(xet || '').split('/').map(s => parseInt(s) || 0);
    return {
        xona: parts[0] || 0,
        etaj: parts[1] || 0,
        etajnost: parts[2] || 0
    };
}

/**
 * DB statistikasi
 */
function getStats() {
    const db = readDB();
    return {
        total: db.objects.length,
        waiting: db.objects.filter(o => o.elonStatus === 'waiting').length,
        processing: db.objects.filter(o => o.elonStatus === 'processing').length,
        posted: db.objects.filter(o => o.elonStatus === 'posted').length,
        lastUpdate: db.lastUpdate
    };
}

module.exports = {
    saveObject,
    getAllObjects,
    getObjectById,
    updateObjectStatus,
    getStats,
    readDB,
    writeDB
};