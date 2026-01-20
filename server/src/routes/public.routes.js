// server/src/routes/public.routes.js - ✅ MULTILANG VERSION
const express = require('express');
const router = express.Router();
const PropertyObject = require('../models/Object.pg');
const AppSettings = require('../models/AppSettings.pg');
const path = require('path');
const {getGlobalConfig} = require("../models/AppSettings.pg");
const fs = require('fs').promises;

/**
 * ✅ Get images array from folder link
 */
async function getImagesFromFolder(folderLink) {
    if (!folderLink || folderLink === "Yo'q") {
        return [];
    }

    try {
        const urlParts = folderLink.split('/browse/');
        if (urlParts.length < 2) {
            return [];
        }

        const baseUrl = urlParts[0];
        const encodedPath = urlParts[1];
        const decodedPath = decodeURIComponent(encodedPath);

        const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
        const folderPath = path.join(UPLOADS_ROOT, decodedPath);

        try {
            await fs.access(folderPath);
        } catch {
            return [];
        }

        const files = await fs.readdir(folderPath);
        const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

        const imageFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXT.includes(ext);
            })
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '999');
                const numB = parseInt(b.match(/\d+/)?.[0] || '999');
                return numA - numB;
            });

        if (imageFiles.length === 0) {
            return [];
        }

        const imageUrls = imageFiles.map(file => {
            const imagePath = `${decodedPath}/${file}`
                .split('/')
                .map(segment => encodeURIComponent(segment))
                .join('/');
            return `${baseUrl}/browse/${imagePath}`;
        });

        return imageUrls;

    } catch (error) {
        console.error('❌ getImagesFromFolder error:', error.message);
        return [];
    }
}

/**
 * ✅ Parse price correctly
 */
function parsePrice(priceValue) {
    if (!priceValue) return 0;

    const cleanPrice = String(priceValue)
        .replace(/\s/g, '')
        .replace(/\$/g, '')
        .replace(/у\.е\./g, '')
        .replace(/[^\d.]/g, '');

    return parseFloat(cleanPrice) || 0;
}

/**
 * ✅ Get translation for specific field from app_settings
 */
async function getFieldTranslations(category, value) {
    if (!value) return null;

    try {
        const allSettings = await AppSettings.getByCategory(category, 'uz');
        const setting = allSettings.find(s =>
            s.translations.uz === value ||
            s.translations.ru === value ||
            s.translations.en === value ||
            s.translations.uz_cy === value
        );

        if (setting && setting.translations) {
            return {
                uz: setting.translations.uz || value,
                ru: setting.translations.ru || setting.translations.uz || value,
                en: setting.translations.en || setting.translations.uz || value,
                uz_cy: setting.translations.uz_cy || setting.translations.uz || value
            };
        }
    } catch (error) {
        console.error(`❌ Translation error for ${category}:`, error.message);
    }

    // Fallback - return value for all languages
    return {
        uz: value,
        ru: value,
        en: value,
        uz_cy: value
    };
}

/**
 * ✅ Get kvartil (location) translations
 */
async function getKvartilTranslations(kvartilValue) {
    if (!kvartilValue) return null;

    try {
        const cascaderData = await AppSettings.getCascaderData('uz');

        // Search in tumans (parent_id = null)
        for (const tuman of cascaderData) {
            if (tuman.translations) {
                const translations = tuman.translations;
                if (translations.uz === kvartilValue ||
                    translations.ru === kvartilValue ||
                    translations.en === kvartilValue ||
                    translations.uz_cy === kvartilValue) {
                    return {
                        uz: translations.uz || kvartilValue,
                        ru: translations.ru || translations.uz || kvartilValue,
                        en: translations.en || translations.uz || kvartilValue,
                        uz_cy: translations.uz_cy || translations.uz || kvartilValue
                    };
                }
            }

            // Search in children (kvartils)
            if (tuman.children) {
                for (const child of tuman.children) {
                    if (child.translations) {
                        const translations = child.translations;
                        if (translations.uz === kvartilValue ||
                            translations.ru === kvartilValue ||
                            translations.en === kvartilValue ||
                            translations.uz_cy === kvartilValue) {
                            return {
                                uz: translations.uz || kvartilValue,
                                ru: translations.ru || translations.uz || kvartilValue,
                                en: translations.en || translations.uz || kvartilValue,
                                uz_cy: translations.uz_cy || translations.uz || kvartilValue
                            };
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Kvartil translation error:', error.message);
    }

    return {
        uz: kvartilValue,
        ru: kvartilValue,
        en: kvartilValue,
        uz_cy: kvartilValue
    };
}

/**
 * ✅ Sheet type translations
 */
const SHEET_TYPE_TRANSLATIONS = {
    'Sotuv': {
        uz: 'Sotiladi',
        ru: 'Продажа',
        en: 'For Sale',
        uz_cy: 'Сотилади'
    },
    'Arenda': {
        uz: 'Ijaraga beriladi',
        ru: 'Аренда',
        en: 'For Rent',
        uz_cy: 'Ижарага берилади'
    }
};

/**
 * ✅ Create multilingual title
 */
async function createMultilingualTitle(obj) {
    const xonaSoni = obj.xet ? obj.xet.split('/')[0] : '1';
    const type = obj.sheet_type || 'Sotuv';

    // ✅ Get kvartil translations
    const kvartilTranslations = await getKvartilTranslations(obj.kvartil);

    const typeTranslations = SHEET_TYPE_TRANSLATIONS[type] || {
        uz: type,
        ru: type,
        en: type,
        uz_cy: type
    };

    return {
        uz: `${typeTranslations.uz} ${xonaSoni}-xonali kvartira ${kvartilTranslations.uz}`,
        ru: `${typeTranslations.ru} ${xonaSoni}-комнатная квартира ${kvartilTranslations.ru}`,
        en: `${typeTranslations.en} ${xonaSoni}-room apartment ${kvartilTranslations.en}`,
        uz_cy: `${typeTranslations.uz_cy} ${xonaSoni}-хонали квартира ${kvartilTranslations.uz_cy}`
    };
}

/**
 * ✅ Create multilingual description
 */
/**
 * ✅ Create multilingual description
 */
async function createMultilingualDescription(obj) {
    const { kvartil, xet, m2, xolati, uy_turi, planirovka, balkon } = obj;
    const xonaSoni = xet ? xet.split('/')[0] : '1';
    const etajInfo = xet ? `${xet.split('/')[1]}/${xet.split('/')[2]}` : '1/1';

    // ✅ Avval barcha translation'larni olamiz
    const [
        kvartilTrans,
        uyTuriTrans,
        xolatiTrans,
        planirovkaTrans,
        balkonTrans
    ] = await Promise.all([
        getKvartilTranslations(kvartil),
        getFieldTranslations('uy_turi', uy_turi),
        getFieldTranslations('xolati', xolati),
        getFieldTranslations('planirovka', planirovka),
        getFieldTranslations('balkon', balkon)
    ]);

    console.log('📝 Description translations:', {
        kvartilTrans,
        uyTuriTrans,
        xolatiTrans,
        planirovkaTrans,
        balkonTrans
    });

    return {
        uz: createDescriptionUz(
            kvartilTrans?.uz || kvartil || 'Yunusobod',
            xonaSoni,
            etajInfo,
            m2,
            uyTuriTrans?.uz || uy_turi,
            xolatiTrans?.uz || xolati,
            planirovkaTrans?.uz || planirovka,
            balkonTrans?.uz || balkon
        ),
        ru: createDescriptionRu(
            kvartilTrans?.ru || kvartil || 'Yunusobod',
            xonaSoni,
            etajInfo,
            m2,
            uyTuriTrans?.ru || uy_turi,
            xolatiTrans?.ru || xolati,
            planirovkaTrans?.ru || planirovka,
            balkonTrans?.ru || balkon
        ),
        en: createDescriptionEn(
            kvartilTrans?.en || kvartil || 'Yunusobod',
            xonaSoni,
            etajInfo,
            m2,
            uyTuriTrans?.en || uy_turi,
            xolatiTrans?.en || xolati,
            planirovkaTrans?.en || planirovka,
            balkonTrans?.en || balkon
        ),
        uz_cy: createDescriptionUzCy(
            kvartilTrans?.uz_cy || kvartil || 'Yunusobod',
            xonaSoni,
            etajInfo,
            m2,
            uyTuriTrans?.uz_cy || uy_turi,
            xolatiTrans?.uz_cy || xolati,
            planirovkaTrans?.uz_cy || planirovka,
            balkonTrans?.uz_cy || balkon
        )
    };
}

function createDescriptionUz(kvartil, xonaSoni, etajInfo, m2, uy_turi, xolati, planirovka, balkon) {
    let desc = `${kvartil}da ${xonaSoni}-xonali kvartira\n\n`;
    desc += `• Maydon: ${m2} m²\n`;
    desc += `• Qavat: ${etajInfo}\n`;
    if (uy_turi && uy_turi !== 'null') desc += `• Uy turi: ${uy_turi}\n`;
    if (xolati && xolati !== 'null') desc += `• Ta'mir: ${xolati}\n`;
    if (planirovka && planirovka !== 'null') desc += `• Planirovka: ${planirovka}\n`;
    if (balkon && balkon !== 'null') desc += `• Balkon: ${balkon}\n`;

    console.log('✅ UZ Description:', desc);
    return desc;
}

function createDescriptionRu(kvartil, xonaSoni, etajInfo, m2, uy_turi, xolati, planirovka, balkon) {
    let desc = `${xonaSoni}-комнатная квартира в ${kvartil}\n\n`;
    desc += `• Площадь: ${m2} м²\n`;
    desc += `• Этаж: ${etajInfo}\n`;
    if (uy_turi && uy_turi !== 'null') desc += `• Тип дома: ${uy_turi}\n`;
    if (xolati && xolati !== 'null') desc += `• Состояние: ${xolati}\n`;
    if (planirovka && planirovka !== 'null') desc += `• Планировка: ${planirovka}\n`;
    if (balkon && balkon !== 'null') desc += `• Балкон: ${balkon}\n`;

    console.log('✅ RU Description:', desc);
    return desc;
}

function createDescriptionEn(kvartil, xonaSoni, etajInfo, m2, uy_turi, xolati, planirovka, balkon) {
    let desc = `${xonaSoni}-room apartment in ${kvartil}\n\n`;
    desc += `• Area: ${m2} m²\n`;
    desc += `• Floor: ${etajInfo}\n`;
    if (uy_turi && uy_turi !== 'null') desc += `• Building type: ${uy_turi}\n`;
    if (xolati && xolati !== 'null') desc += `• Condition: ${xolati}\n`;
    if (planirovka && planirovka !== 'null') desc += `• Layout: ${planirovka}\n`;
    if (balkon && balkon !== 'null') desc += `• Balcony: ${balkon}\n`;

    console.log('✅ EN Description:', desc);
    return desc;
}

function createDescriptionUzCy(kvartil, xonaSoni, etajInfo, m2, uy_turi, xolati, planirovka, balkon) {
    let desc = `${kvartil}да ${xonaSoni}-хонали квартира\n\n`;
    desc += `• Майдон: ${m2} м²\n`;
    desc += `• Қават: ${etajInfo}\n`;
    if (uy_turi && uy_turi !== 'null') desc += `• Уй тури: ${uy_turi}\n`;
    if (xolati && xolati !== 'null') desc += `• Таъмир: ${xolati}\n`;
    if (planirovka && planirovka !== 'null') desc += `• Планировка: ${planirovka}\n`;
    if (balkon && balkon !== 'null') desc += `• Балкон: ${balkon}\n`;

    console.log('✅ UZ_CY Description:', desc);
    return desc;
}
/**
 * ✅ Transform to frontend format with ALL translations
 */
/**
 * ✅ Transform to frontend format with ALL translations
 */
async function transformProperty(obj) {
    console.log('\n📦 TRANSFORM PROPERTY:');
    console.log('  ID:', obj.id);
    console.log('  Kvartil:', obj.kvartil);

    const globalConfig = await getGlobalConfig();

    // Get images
    const images = await getImagesFromFolder(obj.rasmlar);
    const mainImage = images.length > 0 ? images[0] : null;

    // Parse XET
    const xonaSoni = obj.xet ? obj.xet.split('/')[0] : '1';
    const etaj = obj.xet ? obj.xet.split('/')[1] : '1';
    const etajnost = obj.xet ? obj.xet.split('/')[2] : '1';

    // Parse price
    const price = parsePrice(obj.narx);

    // ✅ Get translations for all fields
    const [
        kvartilTranslations,
        uyTuriTranslations,
        xolatiTranslations,
        planirovkaTranslations,
        balkonTranslations,
        toretsTranslations,
        titleTranslations,        // ✅ Bu yerga
        descriptionTranslations
    ] = await Promise.all([
        getKvartilTranslations(obj.kvartil),
        getFieldTranslations('uy_turi', obj.uy_turi),
        getFieldTranslations('xolati', obj.xolati),
        getFieldTranslations('planirovka', obj.planirovka),
        getFieldTranslations('balkon', obj.balkon),
        getFieldTranslations('torets', obj.torets),
        createMultilingualTitle(obj),     // ✅ Title
        createMultilingualDescription(obj) // ✅ Description
    ]);

    console.log('📝 Final descriptions:', descriptionTranslations);

    // ✅ Sheet type translations
    const sheetTypeTranslations = SHEET_TYPE_TRANSLATIONS[obj.sheet_type] || {
        uz: obj.sheet_type,
        ru: obj.sheet_type,
        en: obj.sheet_type,
        uz_cy: obj.sheet_type
    };

    return {
        id: obj.id,

        // ✅ Multilingual title
        title: titleTranslations,

        // ✅ Multilingual description
        description: descriptionTranslations,

        // Price and basic info
        price: price,
        rooms: parseInt(xonaSoni) || 1,
        area: parseFloat(obj.m2) || 0,
        floor: parseInt(etaj) || 1,
        totalFloors: parseInt(etajnost) || 1,

        // ✅ Multilingual fields
        district: kvartilTranslations,
        type: sheetTypeTranslations,
        buildingType: uyTuriTranslations,
        renovation: xolatiTranslations,
        layout: planirovkaTranslations,
        balcony: balkonTranslations,
        parking: toretsTranslations,

        // Images
        images: images,
        mainImage: mainImage,

        // Contact info
        phone: obj.phone_for_ad || globalConfig.company_phone,
        rieltor: obj.rieltor?.trim() || 'Maskan Lux Agent',

        // Dates
        createdAt: obj.sana || obj.created_at || new Date().toISOString(),
    };
}
// ============================================
// PUBLIC API ENDPOINTS
// ============================================

/**
 * ✅ GET /api/public/config
 */
router.get('/config', async (req, res) => {
    try {
        const globalConfig = await getGlobalConfig();
        const COMPANY_PHONE = globalConfig.company_phone || '';
        const TELEGRAM_BOT_TOKEN = globalConfig.telegram_bot_token || '';

        res.json({
            success: true,
            data: {
                companies_phone: COMPANY_PHONE,
                telegram_bot_token: TELEGRAM_BOT_TOKEN
            },
        });
    } catch (error) {
        console.error('❌ GET /config error:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

/**
 * ✅ GET /api/public/properties - Returns ALL translations
 */
router.get('/properties', async (req, res) => {
    try {
        const { rooms, location, type } = req.query;

        console.log('\n📥 GET /properties', { rooms, location, type });

        // Build filters
        const filters = {};
        if (location) filters.kvartil = location;
        if (type) filters.sheetType = type;

        // Get all objects
        let allObjects = await PropertyObject.getAll(filters);
        console.log(`📊 PostgreSQL: ${allObjects.length} objects`);

        // Filter only objects with images
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

        // ✅ Transform all objects with ALL translations
        const properties = await Promise.all(
            allObjects.map(obj => transformProperty(obj))
        );

        console.log(`✅ Returning ${properties.length} properties with full translations`);

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
 * ✅ GET /api/public/properties/:id - Returns ALL translations
 */
router.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;

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

        // ✅ Transform with ALL translations
        const property = await transformProperty(obj);

        console.log('✅ Property found:', property.id);
        console.log('  Translations: uz, ru, en, uz_cy');
        console.log('  Price:', property.price);
        console.log('  Images:', property.images.length);

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
 * ✅ GET /api/public/locations - Returns locations with translations
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

        // ✅ Get translations for each location
        const locationsPromises = Object.entries(locationCounts)
            .filter(([_, count]) => count > 0)
            .map(async ([name, count]) => {
                const translations = await getKvartilTranslations(name);
                return {
                    name: translations,  // ✅ Now returns object with all translations
                    count
                };
            });

        const locations = await Promise.all(locationsPromises);

        // Sort by count
        locations.sort((a, b) => b.count - a.count);

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