// ============================================
// server/src/routes/public.routes.js
// ✅ PostgreSQL INTEGRATION - Excel emas!
// ============================================

const express = require('express');
const router = express.Router();
const PropertyObject = require('../models/Object.pg');
const path = require('path');
const fs = require('fs').promises;

// ✅ Translation mapping
const translations = {
    uz: {
        title: (obj) => `${obj.sheet_type || 'Kvartira'} - ${obj.kvartil || ''}`,
        description: (obj) => obj.opisaniya || `${obj.xet || ''} xonali kvartira, ${obj.m2 || ''} m², ${obj.kvartil || ''}`,
        renovation: (obj) => obj.xolati || 'Ma\'lumot yo\'q',
        buildingType: (obj) => obj.uy_turi || 'Ma\'lumot yo\'q',
        balcony: (obj) => obj.balkon || 'Yo\'q',
        parking: (obj) => obj.torets || 'Yo\'q'
    },
    ru: {
        title: (obj) => `${obj.sheet_type === 'Sotuv' ? 'Продается' : 'Аренда'} - ${obj.kvartil || ''}`,
        description: (obj) => obj.opisaniya || `${obj.xet || ''} комнатная квартира, ${obj.m2 || ''} m², ${obj.kvartil || ''}`,
        renovation: (obj) => {
            const map = {
                'Kapitalniy': 'Капитальный ремонт',
                'Ortacha': 'Средний',
                'Toza': 'Чистый',
                'Yevro remont': 'Евроремонт',
                'Kosmetichiskiy': 'Косметический',
                'Bez remont': 'Без ремонта'
            };
            return map[obj.xolati] || obj.xolati || 'Нет информации';
        },
        buildingType: (obj) => {
            const map = {
                'Kirpich': 'Кирпич',
                'Panel': 'Панель',
                'Beton': 'Бетон',
                'Monolitniy/B': 'Монолит',
                'Gaza/b': 'Газоблок',
                'Pena/b': 'Пеноблок',
                'Boshqa': 'Другое'
            };
            return map[obj.uy_turi] || obj.uy_turi || 'Нет информации';
        },
        balcony: (obj) => obj.balkon || 'Нет',
        parking: (obj) => obj.torets === 'Torets' ? 'Есть' : 'Нет'
    },
    en: {
        title: (obj) => `${obj.sheet_type === 'Sotuv' ? 'For Sale' : 'For Rent'} - ${obj.kvartil || ''}`,
        description: (obj) => obj.opisaniya || `${obj.xet || ''} room apartment, ${obj.m2 || ''} m², ${obj.kvartil || ''}`,
        renovation: (obj) => {
            const map = {
                'Kapitalniy': 'Capital repair',
                'Ortacha': 'Average',
                'Toza': 'Clean',
                'Yevro remont': 'Euro renovation',
                'Kosmetichiskiy': 'Cosmetic',
                'Bez remont': 'No repair'
            };
            return map[obj.xolati] || obj.xolati || 'No information';
        },
        buildingType: (obj) => {
            const map = {
                'Kirpich': 'Brick',
                'Panel': 'Panel',
                'Beton': 'Concrete',
                'Monolitniy/B': 'Monolith',
                'Gaza/b': 'Gas block',
                'Pena/b': 'Foam block',
                'Boshqa': 'Other'
            };
            return map[obj.uy_turi] || obj.uy_turi || 'No information';
        },
        balcony: (obj) => obj.balkon || 'No',
        parking: (obj) => obj.torets === 'Torets' ? 'Yes' : 'No'
    },
    'uz-cy': {
        title: (obj) => `${obj.sheet_type || 'Квартира'} - ${obj.kvartil || ''}`,
        description: (obj) => obj.opisaniya || `${obj.xet || ''} хонали квартира, ${obj.m2 || ''} м², ${obj.kvartil || ''}`,
        renovation: (obj) => obj.xolati || 'Маълумот йўқ',
        buildingType: (obj) => obj.uy_turi || 'Маълумот йўқ',
        balcony: (obj) => obj.balkon || 'Йўқ',
        parking: (obj) => obj.torets || 'Йўқ'
    }
};

// ✅ Helper function to translate property
async function  translateProperty (obj, lang = 'uz') {
    const t = translations[lang] || translations.uz;

    // ✅ CRITICAL FIX: Parse price - PostgreSQL returns integer or string
    let price = 0;
    if (obj.narx !== undefined && obj.narx !== null && obj.narx !== '') {
        if (typeof obj.narx === 'number') {
            price = obj.narx;
        } else {
            const priceStr = String(obj.narx).replace(/\s/g, '').replace(/\$/g, '');
            price = parseInt(priceStr, 10) || 0;
        }
    }

    // Parse XET (xona/etaj/etajnost)
    const xetParts = (obj.xet || '').split('/');
    const rooms = parseInt(xetParts[0]) || 1;
    const floor = parseInt(xetParts[1]) || 1;
    const totalFloors = parseInt(xetParts[2]) || 1;

    // ✅ CRITICAL FIX: Images URL construction
    const baseUrl = process.env.API_URL || 'http://194.163.140.30:5000';
    const imagesArray = await getImagesFromFolder(obj.rasmlar);
    const mainImage = imagesArray[0] || '/placeholder.jpg';

    if (obj.rasmlar && obj.rasmlar !== "Yo'q") {
        // If rasmlar is already a full URL
        if (obj.rasmlar.startsWith('http')) {
            mainImage = obj.rasmlar;
            imagesArray = [obj.rasmlar];
        }
        // If rasmlar is a path like "/browse/..."
        else if (obj.rasmlar.startsWith('/browse/')) {
            mainImage = `${baseUrl}${obj.rasmlar}`;
            imagesArray = [mainImage];
        }
        // If rasmlar is just a folder name
        else {
            // Try to construct browse URL
            const folderPath = obj.rasmlar.replace(/^\/+/, '');
            mainImage = `${baseUrl}/browse/${encodeURIComponent(folderPath)}`;
            imagesArray = [mainImage];
        }
    }

    console.log(`🖼️ Images:`, {
        raw: obj.rasmlar,
        mainImage,
        imagesArray
    });

    // ✅ CRITICAL FIX: rieltor field name
    const rieltorName = obj.rieltor || obj.rieltor || 'Maskan Lux Agent';

    console.log(`👤 rieltor:`, {
        rieltor: obj.rieltor,
        used: rieltorName
    });

    return {
        id: obj.id,
        title: t.title(obj),
        description: t.description(obj),

        price,
        rooms,
        area: parseInt(obj.m2) || 0,
        floor,
        totalFloors,

        district: obj.kvartil || '',
        type: obj.sheet_type || 'Sotuv',

        renovation: t.renovation(obj),
        buildingType: t.buildingType(obj),
        balcony: t.balcony(obj),
        parking: t.parking(obj),

        images: imagesArray,        // ✅ FAQAT RASMLAR
        mainImage,                  // ✅ BIRINCHI RASM

        createdAt: obj.sana || new Date().toISOString(),

        phone: obj.tell || '',
        rieltor: obj.rieltor || 'Maskan Lux'
    };

}
async function getImagesFromFolder(rasmlarPath) {
    if (!rasmlarPath || rasmlarPath === "Yo'q") return [];

    try {
        const UPLOADS_DIR = path.resolve('uploads'); // ⚠️ kerak bo‘lsa to‘g‘rila
        const decodedPath = decodeURIComponent(rasmlarPath);
        const folderPath = path.join(UPLOADS_DIR, decodedPath);

        const files = await fs.readdir(folderPath);

        const imageExt = ['.jpg', '.jpeg', '.png', '.webp'];
        const images = files
            .filter(f => imageExt.includes(path.extname(f).toLowerCase()))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)?.[0] || '999');
                const nb = parseInt(b.match(/\d+/)?.[0] || '999');
                return na - nb;
            });

        const baseUrl = process.env.API_URL || 'http://194.163.140.30:5000';

        return images.map(file => {
            const rel = path.join(decodedPath, file).replace(/\\/g, '/');
            const encoded = rel.split('/').map(encodeURIComponent).join('/');
            return `${baseUrl}/browse/${encoded}`;
        });

    } catch (err) {
        console.error('❌ Image folder error:', err.message);
        return [];
    }
}

// ============================================
// PUBLIC API ENDPOINTS
// ============================================

/**
 * ✅ GET /api/public/properties
 * PostgreSQL'dan barcha obyektlarni olish
 */
router.get('/properties', async (req, res) => {
    try {
        const { lang = 'uz', rooms, location, type, min, max } = req.query;

        console.log('📥 GET /api/public/properties', { lang, rooms, location, type, min, max });

        // ✅ Get from PostgreSQL
        const filters = {};

        if (location) {
            filters.kvartil = location;
        }

        if (type) {
            filters.sheetType = type;
        }

        const allObjects = await PropertyObject.getAll(filters);
        console.log(`📊 PostgreSQL'dan ${allObjects.length} ta obyekt olindi`);

        // ✅ Additional filters (rooms, price)
        let filtered = allObjects;

        if (rooms) {
            const targetRooms = parseInt(rooms);
            filtered = filtered.filter(obj => {
                const xetParts = (obj.xet || '').split('/');
                const objRooms = parseInt(xetParts[0]) || 0;
                return targetRooms >= 5 ? objRooms >= 5 : objRooms === targetRooms;
            });
        }

        if (min || max) {
            filtered = filtered.filter(obj => {
                const priceStr = String(obj.narx || '0').replace(/\s/g, '');
                const objPrice = parseInt(priceStr, 10) || 0;
                const minPrice = min ? parseInt(min) : 0;
                const maxPrice = max ? parseInt(max) : Infinity;
                return objPrice >= minPrice && objPrice <= maxPrice;
            });
        }

        // ✅ Translate
        const properties = await Promise.all(
            filtered.map(obj => translateProperty(obj, lang))
        );


        console.log(`✅ Qaytarilmoqda: ${properties.length} ta property`);

        res.json({
            success: true,
            data: properties,
            count: properties.length
        });

    } catch (error) {
        console.error('❌ GET /properties xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/properties/:id
 * Bitta obyektni olish
 */
router.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang = 'uz' } = req.query;

        console.log(`📥 GET /api/public/properties/${id}`, { lang });

        // ✅ Get from PostgreSQL
        const obj = await PropertyObject.getById(id);

        if (!obj) {
            console.log('❌ Property topilmadi:', id);
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        const property = translateProperty(obj, lang);

        console.log('✅ Property topildi:', property.id);

        res.json({
            success: true,
            data: property
        });

    } catch (error) {
        console.error('❌ GET /properties/:id xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/locations
 * Barcha lokatsiyalar va ularning countini olish
 */
router.get('/locations', async (req, res) => {
    try {
        const allObjects = await PropertyObject.getAll();

        // Count by location
        const locationCounts = {};
        allObjects.forEach(obj => {
            const loc = obj.kvartil || 'Noma\'lum';
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });

        const locations = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        res.json({
            success: true,
            data: locations
        });

    } catch (error) {
        console.error('❌ GET /locations xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/stats
 * Statistika
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await PropertyObject.getStats();

        // Available rooms
        const allObjects = await PropertyObject.getAll();
        const roomsSet = new Set();

        allObjects.forEach(obj => {
            const xetParts = (obj.xet || '').split('/');
            const rooms = parseInt(xetParts[0]) || 0;
            if (rooms > 0) {
                roomsSet.add(rooms >= 5 ? '5+' : String(rooms));
            }
        });

        const availableRooms = Array.from(roomsSet).sort();

        res.json({
            success: true,
            data: {
                totalProperties: parseInt(stats.total) || 0,
                availableRooms
            }
        });

    } catch (error) {
        console.error('❌ GET /stats xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ DEBUG ENDPOINT - Database raw data
 * GET /api/public/debug/:id
 */
router.get('/debug/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🔍 DEBUG REQUEST for:', id);

        const obj = await PropertyObject.getById(id);

        if (!obj) {
            return res.json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // Return raw database object
        res.json({
            success: true,
            raw: obj,
            fields: {
                narx: {
                    value: obj.narx,
                    type: typeof obj.narx,
                    empty: !obj.narx,
                    zero: obj.narx === 0
                },
                rieltor: {
                    value: obj.rieltor,
                    type: typeof obj.rieltor,
                    empty: !obj.rieltor
                }
            }
        });

    } catch (error) {
        console.error('❌ DEBUG xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;