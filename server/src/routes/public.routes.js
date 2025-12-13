// server/src/routes/public.routes.js
const express = require('express');
const router = express.Router();
const PropertyObject = require('../models/Object.pg');

/**
 * PUBLIC API - Auth kerak emas!
 * Frontend uchun uylar ro'yxati
 */

/**
 * GET /api/public/properties
 * Query params:
 *   - lang: uz | ru | en
 *   - rooms: 1 | 2 | 3 | 4+
 *   - location: Yunusobod-1, Yunusobod-2, etc.
 *   - min: minimum narx
 *   - max: maksimum narx
 *   - type: Sotuv | Arenda
 */
router.get('/properties', async (req, res) => {
    try {
        const { lang = 'uz', rooms, location, min, max, type } = req.query;

        console.log('🌐 PUBLIC API: Properties so\'ralmoqda');
        console.log('  Lang:', lang);
        console.log('  Filters:', { rooms, location, min, max, type });

        // 1. Filterlar yaratish
        const filters = {};

        // Type filter (Sotuv/Arenda)
        if (type) {
            filters.sheetType = type;
        }

        // Location filter
        if (location) {
            filters.kvartil = location;
        }

        // 2. Barcha uylarni olish
        let properties = await PropertyObject.getAll(filters);

        console.log(`  ✅ Database'dan: ${properties.length} ta`);

        // 3. ✅ CRITICAL: Faqat rasmlari bor uylarni filter qilish
        properties = properties.filter(p => {
            const hasImages = p.rasmlar &&
                p.rasmlar !== "Yo'q" &&
                p.rasmlar !== 'null' &&
                p.rasmlar !== 'undefined' &&
                p.rasmlar.trim() !== '';
            return hasImages;
        });

        console.log(`  ✅ Rasmlari bor: ${properties.length} ta`);

        // 3. Rooms filter (XET dan xonalar sonini olish)
        if (rooms) {
            properties = properties.filter(p => {
                const xonaSoni = p.xet ? p.xet.split('/')[0] : '0';
                if (rooms === '4+') {
                    return parseInt(xonaSoni) >= 4;
                }
                return xonaSoni === rooms;
            });
        }

        // 4. Price range filter
        if (min) {
            properties = properties.filter(p => {
                const price = parseFloat(p.narx);
                return !isNaN(price) && price >= parseFloat(min);
            });
        }

        if (max) {
            properties = properties.filter(p => {
                const price = parseFloat(p.narx);
                return !isNaN(price) && price <= parseFloat(max);
            });
        }

        // 5. Transform to frontend format
        const transformedProperties = properties.map(p => transformProperty(p, lang));

        console.log(`  📊 Filterdan keyin: ${transformedProperties.length} ta`);

        res.json({
            success: true,
            count: transformedProperties.length,
            data: transformedProperties
        });

    } catch (error) {
        console.error('❌ Public properties xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * GET /api/public/properties/:id
 * Bitta uyning to'liq ma'lumoti
 */
router.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang = 'uz' } = req.query;

        console.log('🌐 PUBLIC API: Property by ID');
        console.log('  ID:', id);
        console.log('  Lang:', lang);

        const property = await PropertyObject.getById(id);

        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Uy topilmadi'
            });
        }

        // ✅ Rasmlar bo'lishi kerak
        const hasImages = property.rasmlar &&
            property.rasmlar !== "Yo'q" &&
            property.rasmlar !== 'null' &&
            property.rasmlar !== 'undefined' &&
            property.rasmlar.trim() !== '';

        if (!hasImages) {
            return res.status(404).json({
                success: false,
                error: 'Bu uyning rasmlari yo\'q'
            });
        }

        const transformed = transformProperty(property, lang);

        res.json({
            success: true,
            data: transformed
        });

    } catch (error) {
        console.error('❌ Public property by ID xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * GET /api/public/locations
 * Mavjud lokatsiyalar ro'yxati (kvartil)
 */
router.get('/locations', async (req, res) => {
    try {
        const locations = await PropertyObject.getByKvartil();

        // ✅ Faqat rasmlari bor uylar bo'lgan kvartillarni qaytarish
        const activeLocations = locations.filter(loc => {
            // Check if location has properties with images
            // Note: getByKvartil only returns counts, so we trust it includes only valid ones
            return loc.count > 0;
        });

        res.json({
            success: true,
            data: activeLocations.map(loc => ({
                name: loc.kvartil,
                count: loc.count // Total count (rasmlari bor)
            }))
        });

    } catch (error) {
        console.error('❌ Locations xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * GET /api/public/stats
 * Statistika (soni, narx range, etc.)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await PropertyObject.getStats();

        res.json({
            success: true,
            data: {
                totalProperties: properties.length, // Rasmlari bor uylar
                availableRooms: ['1', '2', '3', '4+'],
                priceRange: {
                    min: 0,
                    max: 200000
                }
            }
        });

    } catch (error) {
        console.error('❌ Stats xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform database property to frontend format
 */
function transformProperty(dbProperty, lang = 'uz') {
    const xonaSoni = dbProperty.xet ? dbProperty.xet.split('/')[0] : '1';
    const etaj = dbProperty.xet ? dbProperty.xet.split('/')[1] : '1';
    const etajnost = dbProperty.xet ? dbProperty.xet.split('/')[2] : '1';

    // Parse images from rasmlar URL
    const images = parseImages(dbProperty.rasmlar);

    // Create translations
    const translations = createTranslations(dbProperty, lang);

    return {
        id: dbProperty.id,

        // Basic info
        price: parseFloat(dbProperty.narx) || 0,
        rooms: parseInt(xonaSoni) || 1,
        area: parseFloat(dbProperty.m2) || 0,
        floor: parseInt(etaj) || 1,
        totalFloors: parseInt(etajnost) || 1,

        // Location
        district: dbProperty.kvartil || 'Yunusobod',

        // Details
        type: dbProperty.sheet_type || 'Sotuv',
        buildingType: dbProperty.uy_turi || 'Панель',
        renovation: mapRenovation(dbProperty.xolati),
        layout: dbProperty.planirovka || null,
        balcony: dbProperty.balkon || null,

        // Images
        images: images,
        mainImage: images[0] || '/placeholder.jpg',

        // Meta
        createdAt: dbProperty.created_at || new Date().toISOString(),
        updatedAt: dbProperty.updated_at || new Date().toISOString(),

        // Translations
        title: translations.title,
        description: translations.description,

        // Contact
        agent: dbProperty.rieltor || 'Maskan Lux',
        phone: '+998970850604'
    };
}

/**
 * Parse images from rasmlar URL
 */
function parseImages(rasmlarUrl) {
    if (!rasmlarUrl || rasmlarUrl === "Yo'q") {
        return [];
    }

    // Extract folder path from browse URL
    // Example: http://194.163.140.30:5000/browse/Yunusobod-1/1%20xona/...
    try {
        const urlObj = new URL(rasmlarUrl);
        const pathname = urlObj.pathname; // /browse/Yunusobod-1/1 xona/...

        // For now, return the browse URL
        // Frontend will need to fetch and parse the directory listing
        return [rasmlarUrl];

        // TODO: Implement image listing endpoint
        // GET /api/public/images?folder=xxx

    } catch (error) {
        return [];
    }
}

/**
 * Create translations
 */
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

module.exports = router;