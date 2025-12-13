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

    // ✅ CRITICAL FIX: Get first image directly from folder
    const mainImage = getMainImageFromFolder(dbProperty.rasmlar);

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
        images: [dbProperty.rasmlar], // Folder URL for fetching all images
        mainImage: mainImage, // ✅ Direct first image URL

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
 * ✅ NEW: Get main (first) image URL directly
 */
function getMainImageFromFolder(rasmlarUrl) {
    if (!rasmlarUrl || rasmlarUrl === "Yo'q") {
        return '/placeholder.jpg';
    }

    try {
        const path = require('path');
        const fs = require('fs');
        const { UPLOADS_DIR } = require('../config/constants');

        // Extract folder path from URL
        // Example: http://.../browse/Yunusobod-1/2%20xona/...
        const urlParts = rasmlarUrl.split('/browse/');
        if (urlParts.length < 2) return rasmlarUrl;

        const relativePath = decodeURIComponent(urlParts[1]);
        const folderPath = path.join(UPLOADS_DIR, relativePath);

        // Check if folder exists
        if (!fs.existsSync(folderPath)) {
            console.log(`⚠️ Folder not found: ${folderPath}`);
            return rasmlarUrl; // Return folder URL as fallback
        }

        // Read directory
        const files = fs.readdirSync(folderPath);

        // Find first image (photo_1.jpg, etc.)
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '999');
                const numB = parseInt(b.match(/\d+/)?.[0] || '999');
                return numA - numB;
            });

        if (imageFiles.length === 0) {
            console.log(`⚠️ No images in folder: ${folderPath}`);
            return rasmlarUrl;
        }

        // Construct first image URL
        const firstImage = imageFiles[0];
        const imageRelativePath = path.join(relativePath, firstImage).replace(/\\/g, '/');
        const encodedPath = imageRelativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');

        // Use environment variable or construct URL
        const baseUrl = process.env.BASE_URL || 'http://194.163.140.30:5000';
        const imageUrl = `${baseUrl}/browse/${encodedPath}`;

        console.log(`✅ Main image: ${imageUrl}`);
        return imageUrl;

    } catch (error) {
        console.error('❌ getMainImageFromFolder error:', error.message);
        return rasmlarUrl; // Fallback to folder URL
    }
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

/**
 * GET /api/public/images
 * Get all images in a folder
 * Query: ?path=Yunusobod-13/4%20xona/...
 */
router.get('/images', async (req, res) => {
    try {
        const { path: folderPath } = req.query;

        if (!folderPath || typeof folderPath !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Path parameter kerak'
            });
        }

        console.log('📷 Images so\'ralmoqda:', folderPath);

        const fs = require('fs');
        const pathModule = require('path');
        const { UPLOADS_DIR } = require('../config/constants');

        // Decode path
        const decodedPath = decodeURIComponent(folderPath);
        const fullPath = pathModule.join(UPLOADS_DIR, decodedPath);

        console.log('  Full path:', fullPath);

        // Security check
        const baseDir = pathModule.resolve(UPLOADS_DIR);
        const resolvedPath = pathModule.resolve(fullPath);

        if (!resolvedPath.startsWith(baseDir)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Check if exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                error: 'Folder topilmadi'
            });
        }

        // Read directory
        const files = fs.readdirSync(fullPath);

        // Filter only images
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files.filter(file => {
            const ext = pathModule.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        });

        // Sort images (photo_1.jpg, photo_2.jpg, etc.)
        imageFiles.sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });

        // Create full URLs
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

        const imageUrls = imageFiles.map(filename => {
            const relativePath = pathModule.join(decodedPath, filename).replace(/\\/g, '/');
            const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            return `${baseUrl}/browse/${encodedPath}`;
        });

        console.log(`  ✅ Topildi: ${imageUrls.length} ta rasm`);

        res.json({
            success: true,
            count: imageUrls.length,
            data: imageUrls
        });

    } catch (error) {
        console.error('❌ Images endpoint xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;