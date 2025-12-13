// server/src/routes/public.routes.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const PropertyObject = require('../models/Object.pg');
const path = require('path');
const fs = require('fs').promises;

/**
 * ✅ CRITICAL FIX: Get images array from folder link
 */
async function getImagesFromFolder(folderLink) {
    if (!folderLink || folderLink === "Yo'q") {
        console.log('⚠️ Folder link yo\'q');
        return [];
    }

    try {
        console.log('\n📂 RASMLARNI OLISH:');
        console.log('  Folder Link:', folderLink);

        // ✅ Parse folder path from browse URL
        // Example: http://194.163.140.30:5000/browse/Yunusobod%20-%2011/3%20xona/...
        const urlParts = folderLink.split('/browse/');

        if (urlParts.length < 2) {
            console.log('  ❌ Browse URL noto\'g\'ri format');
            return [];
        }

        const baseUrl = urlParts[0]; // http://194.163.140.30:5000
        const encodedPath = urlParts[1]; // Yunusobod%20-%2011/3%20xona/...
        const decodedPath = decodeURIComponent(encodedPath); // Yunusobod - 11/3 xona/...

        console.log('  Base URL:', baseUrl);
        console.log('  Decoded Path:', decodedPath);

        // ✅ Create local file system path
        const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
        const folderPath = path.join(UPLOADS_ROOT, decodedPath);

        console.log('  Local Path:', folderPath);

        // ✅ Check if folder exists
        try {
            await fs.access(folderPath);
            console.log('  ✅ Folder mavjud');
        } catch {
            console.log('  ❌ Folder topilmadi');
            return [];
        }

        // ✅ Read directory
        const files = await fs.readdir(folderPath);
        console.log('  📊 Fayllar soni:', files.length);

        // ✅ Filter only images and sort
        const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXT.includes(ext);
            })
            .sort((a, b) => {
                // Sort by number: photo_1.jpg, photo_2.jpg, ...
                const numA = parseInt(a.match(/\d+/)?.[0] || '999');
                const numB = parseInt(b.match(/\d+/)?.[0] || '999');
                return numA - numB;
            });

        console.log('  📷 Rasmlar:', imageFiles.length);

        if (imageFiles.length === 0) {
            console.log('  ⚠️ Rasmlar topilmadi');
            return [];
        }

        // ✅ Create full URLs for each image
        const imageUrls = imageFiles.map(file => {
            // Create encoded path: Yunusobod%20-%2011/3%20xona/.../photo_1.jpg
            const imagePath = `${decodedPath}/${file}`
                .split('/')
                .map(segment => encodeURIComponent(segment))
                .join('/');

            return `${baseUrl}/browse/${imagePath}`;
        });

        console.log(`  ✅ ${imageUrls.length} ta rasm URL yaratildi`);
        imageUrls.forEach((url, i) => {
            console.log(`    ${i + 1}. ${path.basename(url)}`);
        });

        return imageUrls;

    } catch (error) {
        console.error('  ❌ getImagesFromFolder error:', error.message);
        return [];
    }
}

/**
 * ✅ CRITICAL FIX: Parse price correctly (55 000 -> 55000)
 */
function parsePrice(priceValue) {
    if (!priceValue) return 0;

    // Convert to string and remove all non-numeric characters except dots
    const cleanPrice = String(priceValue)
        .replace(/\s/g, '')        // Remove spaces
        .replace(/\$/g, '')        // Remove $
        .replace(/у\.е\./g, '')    // Remove у.е.
        .replace(/[^\d.]/g, '');   // Keep only digits and dots

    const parsed = parseFloat(cleanPrice) || 0;

    console.log('  💰 Price parsing:');
    console.log('    Raw:', priceValue);
    console.log('    Clean:', cleanPrice);
    console.log('    Parsed:', parsed);

    return parsed;
}

/**
 * ✅ Transform to frontend format with FIXED images and price
 */
async function transformProperty(obj, lang = 'uz') {
    console.log('\n📦 TRANSFORM PROPERTY:');
    console.log('  ID:', obj.id);
    console.log('  Rasmlar URL:', obj.rasmlar);

    // ✅ Get all images from folder
    const images = await getImagesFromFolder(obj.rasmlar);
    console.log('  📊 Images found:', images.length);

    // ✅ Main image - first one
    const mainImage = images.length > 0 ? images[0] : null;
    console.log('  🖼️ Main image:', mainImage ? path.basename(mainImage) : 'None');

    // Parse XET
    const xonaSoni = obj.xet ? obj.xet.split('/')[0] : '1';
    const etaj = obj.xet ? obj.xet.split('/')[1] : '1';
    const etajnost = obj.xet ? obj.xet.split('/')[2] : '1';

    // ✅ CRITICAL: Parse price correctly
    const price = parsePrice(obj.narx);

    // Create title
    const title = `${obj.sheet_type === 'Sotuv' ? 'Sotiladi' : 'Ijaraga'} - ${obj.kvartil || ''}, ${xonaSoni} xona`;

    // Create description
    const description = obj.opisaniya || `${xonaSoni} xonali kvartira, ${obj.m2 || ''} m², ${obj.kvartil || ''}`;
    const translations = createTranslations(obj, lang);

    const result = {
        id: obj.id,
        title: translations.title,
        description: translations.description,

        // ✅ Price (properly parsed)
        price: price,

        rooms: parseInt(xonaSoni) || 1,
        area: parseFloat(obj.m2) || 0,
        floor: parseInt(etaj) || 1,
        totalFloors: parseInt(etajnost) || 1,

        district: obj.kvartil || '',
        type: obj.sheet_type || 'Sotuv',

        // ✅ Images array (all photos)
        images: images,

        // ✅ Main image (first photo)
        mainImage: mainImage,

        // ✅ Contact info
        phone: obj.tell || '+998970850604',
        rieltor: obj.rieltor?.trim() || 'Maskan Lux Agent',

        createdAt: obj.sana || obj.created_at || new Date().toISOString(),

        // Additional details
        renovation: mapRenovation(obj.xolati) || 'Yaxshi',
        buildingType: obj.uy_turi || 'Panel',
        balcony: obj.balkon || "Yo'q",
        parking: obj.torets || "Yo'q",
        layout: obj.planirovka || null,
    };

    return result;
}

function createTranslations(dbProperty, lang) {
    const xonaSoni = dbProperty.xet ? dbProperty.xet.split('/')[0] : '1';
    const location = dbProperty.kvartil || 'Yunusobod';
    const type = dbProperty.sheet_type || 'Sotuv';

    const titles = {
        uz: `${type === 'Sotuv' ? 'Sotiladi' : 'Ijaraga'} ${xonaSoni}-xonali kvartira ${location}`,
        ru: `${type === 'Sotuv' ? 'Продается' : 'Сдается'} ${xonaSoni}-комнатная квартира ${location}`,
        en: `${type === 'Sotuv' ? 'For Sale' : 'For Rent'} ${xonaSoni}-room apartment ${location}`
    };

    const descriptions = {
        uz: createDescription(dbProperty, 'uz'),
        ru: createDescription(dbProperty, 'ru'),
        en: createDescription(dbProperty, 'en')
    };

    return {
        title: titles[lang] || titles.uz,
        description: descriptions[lang] || descriptions.uz
    };
}

/**
 * Create description in specific language
 */
function createDescription(property, lang) {
    const { kvartil, xet, m2, xolati, uy_turi, planirovka, balkon } = property;
    const xonaSoni = xet ? xet.split('/')[0] : '1';
    const etajInfo = xet ? `${xet.split('/')[1]}/${xet.split('/')[2]}` : '1/1';

    if (lang === 'ru') {
        let desc = `${xonaSoni}-комнатная квартира в ${kvartil}\n\n`;
        desc += `• Площадь: ${m2} м²\n`;
        desc += `• Этаж: ${etajInfo}\n`;
        if (uy_turi) desc += `• Тип дома: ${uy_turi}\n`;
        if (xolati) desc += `• Состояние: ${xolati}\n`;
        if (planirovka) desc += `• Планировка: ${planirovka}\n`;
        if (balkon) desc += `• Балкон: ${balkon}\n`;
        return desc;
    }

    if (lang === 'en') {
        let desc = `${xonaSoni}-room apartment in ${kvartil}\n\n`;
        desc += `• Area: ${m2} m²\n`;
        desc += `• Floor: ${etajInfo}\n`;
        if (uy_turi) desc += `• Building type: ${uy_turi}\n`;
        if (xolati) desc += `• Condition: ${xolati}\n`;
        if (planirovka) desc += `• Layout: ${planirovka}\n`;
        if (balkon) desc += `• Balcony: ${balkon}\n`;
        return desc;
    }

    // Uzbek (default)
    let desc = `${kvartil}da ${xonaSoni}-xonali kvartira\n\n`;
    desc += `• Maydon: ${m2} m²\n`;
    desc += `• Qavat: ${etajInfo}\n`;
    if (uy_turi) desc += `• Uy turi: ${uy_turi}\n`;
    if (xolati) desc += `• Ta'mir: ${xolati}\n`;
    if (planirovka) desc += `• Planirovka: ${planirovka}\n`;
    if (balkon) desc += `• Balkon: ${balkon}\n`;
    return desc;
}

/**
 * Map xolati to renovation enum
 */
function mapRenovation(xolati) {
    if (!xolati) return 'euro';

    const lower = xolati.toLowerCase();
    if (lower.includes('евро') || lower.includes('euro')) return 'euro';
    if (lower.includes('средн') || lower.includes('oddiy')) return 'standard';
    if (lower.includes('треб') || lower.includes('tamir')) return 'needs';

    return 'euro';
}

// ============================================
// PUBLIC API ENDPOINTS
// ============================================

/**
 * ✅ GET /api/public/properties
 */
router.get('/properties', async (req, res) => {
    try {
        const { lang = 'uz', rooms, location, type } = req.query;

        console.log('\n📥 GET /properties', { lang, rooms, location, type });

        // Build filters
        const filters = {};
        if (location) filters.kvartil = location;
        if (type) filters.sheetType = type;

        // Get all objects
        let allObjects = await PropertyObject.getAll(filters);
        console.log(`📊 PostgreSQL: ${allObjects.length} objects`);

        // ✅ Filter only objects with images
        allObjects = allObjects.filter(obj => {
            return obj.rasmlar &&
                obj.rasmlar !== "Yo'q" &&
                obj.rasmlar.trim() !== '';
        });
        console.log(`📷 With images: ${allObjects.length} objects`);

        // Additional filters (rooms)
        if (rooms) {
            const targetRooms = parseInt(rooms);
            allObjects = allObjects.filter(obj => {
                const xetParts = (obj.xet || '').split('/');
                const objRooms = parseInt(xetParts[0]) || 0;
                return targetRooms >= 5 ? objRooms >= 5 : objRooms === targetRooms;
            });
        }

        // Transform all objects
        const properties = await Promise.all(
            allObjects.map(obj => transformProperty(obj, lang))
        );

        console.log(`✅ Returning ${properties.length} properties`);

        res.json({
            success: true,
            data: properties,
            count: properties.length
        });

    } catch (error) {
        console.error('❌ GET /properties error:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/properties/:id
 */
router.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang = 'uz' } = req.query;

        console.log(`\n📥 GET /properties/${id}`);

        const obj = await PropertyObject.getById(id);

        if (!obj) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        // Check images
        if (!obj.rasmlar || obj.rasmlar === "Yo'q") {
            return res.status(404).json({
                success: false,
                error: 'Bu obyektning rasmlari yo\'q'
            });
        }

        const property = await transformProperty(obj, lang);

        console.log('✅ Property found:', property.id);
        console.log('  Price:', property.price);
        console.log('  Images:', property.images.length);
        console.log('  Main Image:', property.mainImage ? '✅' : '❌');
        console.log('  Rieltor:', property.rieltor);

        res.json({
            success: true,
            data: property
        });

    } catch (error) {
        console.error('❌ GET /properties/:id error:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/locations
 */
router.get('/locations', async (req, res) => {
    try {
        const allObjects = await PropertyObject.getAll();

        // Count by location (only with images)
        const locationCounts = {};
        allObjects.forEach(obj => {
            if (obj.rasmlar && obj.rasmlar !== "Yo'q") {
                const loc = obj.kvartil || 'Noma\'lum';
                locationCounts[loc] = (locationCounts[loc] || 0) + 1;
            }
        });

        const locations = Object.entries(locationCounts)
            .map(([name, count]) => ({ name, count }))
            .filter(loc => loc.count > 0)
            .sort((a, b) => b.count - a.count);

        res.json({
            success: true,
            data: locations
        });

    } catch (error) {
        console.error('❌ GET /locations error:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const allObjects = await PropertyObject.getAll();

        // Count only objects with images
        const withImages = allObjects.filter(obj =>
            obj.rasmlar && obj.rasmlar !== "Yo'q"
        );

        // Available rooms
        const roomsSet = new Set();
        withImages.forEach(obj => {
            const xetParts = (obj.xet || '').split('/');
            const rooms = parseInt(xetParts[0]) || 0;
            if (rooms > 0) {
                roomsSet.add(rooms >= 5 ? '5+' : String(rooms));
            }
        });

        res.json({
            success: true,
            data: {
                totalProperties: withImages.length,
                availableRooms: Array.from(roomsSet).sort()
            }
        });

    } catch (error) {
        console.error('❌ GET /stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

module.exports = router;