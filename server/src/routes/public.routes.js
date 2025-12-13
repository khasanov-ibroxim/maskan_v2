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


async function translateProperty(obj, lang = 'uz') {
    const t = translations[lang] || translations.uz;
    const images = await getImagesFromFolder(obj.rasmlar);
    const mainImage = images[0] || '/placeholder.jpg';

    return {
        id: obj.id,
        title: t.title(obj),
        description: t.description(obj),

        price: Number(obj.narx) || 0,
        rooms: parseInt(obj.xet?.split('/')[0]) || 1,
        area: parseInt(obj.m2) || 0,

        floor: parseInt(obj.xet?.split('/')[1]) || 1,
        totalFloors: parseInt(obj.xet?.split('/')[2]) || 1,

        district: obj.kvartil || '',
        type: obj.sheet_type || 'Sotuv',

        // ✅ FIXED: To'g'ridan-to'g'ri rasmlar array
        images,          // ✅ Array<string> - barcha rasmlar URL'lari
        mainImage,       // ✅ Birinchi rasm

        phone: obj.tell || '',
        rieltor: obj.rieltor?.trim() || 'Maskan Lux Agent',
        createdAt: obj.sana || new Date().toISOString(),

        renovation: t.renovation(obj),
        buildingType: t.buildingType(obj),
        balcony: t.balcony(obj),
        parking: t.parking(obj),
    };
}


async function getImagesFromFolder(rasmlarPath) {
    if (!rasmlarPath || rasmlarPath === "Yo'q") return [];

    try {
        // 📌 CONTABO'DAGI REAL PAPKA
        const UPLOADS_ROOT = path.join(__dirname, '../../uploads'); // ✅ Server'dagi uploads papka

        // DB dagi path: "Yunusobod - 13/4 xona/Yunusobod - 13_2_4_9_..."
        const decoded = decodeURIComponent(rasmlarPath).replace(/^\/+/, '');
        const folderPath = path.join(UPLOADS_ROOT, decoded);

        console.log('📂 Folder path:', folderPath);

        if (!fs.existsSync(folderPath)) {
            console.log('⚠️ Papka topilmadi');
            return [];
        }

        // ✅ Faqat rasm fayllarini olish
        const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const files = await fs.promises.readdir(folderPath);

        const images = files
            .filter(f => {
                const ext = path.extname(f).toLowerCase();
                return IMAGE_EXT.includes(ext);
            })
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)?.[0] || '999');
                const nb = parseInt(b.match(/\d+/)?.[0] || '999');
                return na - nb;
            });

        // ✅ To'liq URL yaratish
        const baseUrl = process.env.API_URL || 'http://194.163.140.30:5000';

        return images.map(file => {
            const relativePath = `${decoded}/${file}`
                .split('/')
                .map(encodeURIComponent)
                .join('/');

            return `${baseUrl}/browse/${relativePath}`;
        });

    } catch (err) {
        console.error('❌ Image folder error:', err.message);
        return [];
    }
}

// ============================================
// PUBLIC API ENDPOINTS
// ============================================
// server/src/routes/public.routes.js - YANGI ENDPOINT QO'SHISH

/**
 * ✅ GET /api/public/properties/:id/images
 * Faqat rasmlar URL'larini qaytarish
 */
router.get('/properties/:id/images', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('📸 Rasmlar so\'ralmoqda:', id);

        // 1. Obyektni topish
        const obj = await PropertyObject.getById(id);

        if (!obj) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // 2. Rasmlar papkasini tekshirish
        if (!obj.rasmlar || obj.rasmlar === "Yo'q") {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        // 3. Rasmlar papkasini ochish
        const BROWSE_ROOT = '/var/www/html/browse'; // ✅ Contabo path
        const decoded = decodeURIComponent(obj.rasmlar).replace(/^\/+/, '');
        const folderPath = path.join(BROWSE_ROOT, decoded);

        if (!fs.existsSync(folderPath)) {
            console.log('⚠️ Papka topilmadi:', folderPath);
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        // 4. ✅ FAQAT RASMLARNI OLISH (olx.txt, telegram.txt IGNORE)
        const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const files = await fs.promises.readdir(folderPath);

        const images = files
            .filter(f => {
                const ext = path.extname(f).toLowerCase();
                return IMAGE_EXT.includes(ext);
            })
            .sort((a, b) => {
                // photo_1.jpg, photo_2.jpg format bo'yicha saralash
                const na = parseInt(a.match(/\d+/)?.[0] || '999');
                const nb = parseInt(b.match(/\d+/)?.[0] || '999');
                return na - nb;
            });

        // 5. ✅ To'liq URL yaratish
        const baseUrl = process.env.API_URL || 'http://194.163.140.30:5000';

        const imageUrls = images.map(file => {
            const relativePath = `${decoded}/${file}`
                .split('/')
                .map(encodeURIComponent)
                .join('/');

            return `${baseUrl}/browse/${relativePath}`;
        });

        console.log(`✅ ${imageUrls.length} ta rasm topildi`);

        res.json({
            success: true,
            data: imageUrls,
            count: imageUrls.length
        });

    } catch (error) {
        console.error('❌ Rasmlar olishda xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});
/**
 * ✅ GET /api/public/properties
 * PostgreSQL'dan barcha obyektlarni olish
 */
/**
 * ✅ GET /api/public/properties
 * Min/Max filter o'chirildi - DB'dagi narx aynan ko'rsatiladi
 */
router.get('/properties', async (req, res) => {
    try {
        const { lang = 'uz', rooms, location, type } = req.query;

        console.log('📥 GET /api/public/properties', { lang, rooms, location, type });

        // ✅ Database filters
        const filters = {};
        if (location) filters.kvartil = location;
        if (type) filters.sheetType = type;

        const allObjects = await PropertyObject.getAll(filters);
        console.log(`📊 PostgreSQL'dan ${allObjects.length} ta obyekt olindi`);

        let filtered = allObjects;

        // ✅ Faqat rooms filter
        if (rooms) {
            const targetRooms = parseInt(rooms);
            filtered = filtered.filter(obj => {
                const xetParts = (obj.xet || '').split('/');
                const objRooms = parseInt(xetParts[0]) || 0;
                return targetRooms >= 5 ? objRooms >= 5 : objRooms === targetRooms;
            });
        }

        // ✅ REMOVED: min/max price filter - DB'dagi narx aynan ko'rsatiladi

        // ✅ Translate with images
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

        const obj = await PropertyObject.getById(id);

        if (!obj) {
            console.log('❌ Property topilmadi:', id);
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // ✅ Translate with images
        const property = await translateProperty(obj, lang);

        console.log('✅ Property topildi:', property.id);
        console.log(`   Rasmlar: ${property.images.length} ta`);

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