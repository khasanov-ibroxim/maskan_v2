// server/src/routes/public.routes.js - FINAL VERSION
const express = require('express');
const router = express.Router();
const PropertyObject = require('../models/Object.pg');
const path = require('path');
const fs = require('fs').promises;

/**
 * ✅ Get images array from folder
 */
async function getImagesFromFolder(rasmlarPath) {
    if (!rasmlarPath || rasmlarPath === "Yo'q") {
        return [];
    }

    try {
        const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
        const decoded = decodeURIComponent(rasmlarPath).replace(/^\/+/, '');
        const folderPath = path.join(UPLOADS_ROOT, decoded);

        console.log('📂 Reading folder:', folderPath);

        // Check if folder exists
        try {
            await fs.access(folderPath);
        } catch {
            console.log('⚠️ Folder not found:', folderPath);
            return [];
        }

        // Read directory
        const files = await fs.readdir(folderPath);

        // Filter only images
        const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXT.includes(ext);
            })
            .sort((a, b) => {
                // Sort by number (photo_1.jpg, photo_2.jpg, etc.)
                const numA = parseInt(a.match(/\d+/)?.[0] || '999');
                const numB = parseInt(b.match(/\d+/)?.[0] || '999');
                return numA - numB;
            });

        // Create full URLs
        const baseUrl = process.env.BASE_URL || 'http://194.163.140.30:5000';

        const imageUrls = imageFiles.map(file => {
            const relativePath = `${decoded}/${file}`
                .split('/')
                .map(encodeURIComponent)
                .join('/');

            return `${baseUrl}/browse/${relativePath}`;
        });

        console.log(`✅ Found ${imageUrls.length} images`);
        return imageUrls;

    } catch (error) {
        console.error('❌ getImagesFromFolder error:', error.message);
        return [];
    }
}

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
 * ✅ Transform to frontend format
 */
async function transformProperty(obj, lang = 'uz') {
    console.log('\n📦 Transform Property:');
    console.log('  ID:', obj.id);
    console.log('  Narx (raw):', obj.narx, typeof obj.narx);
    console.log('  Rieltor (raw):', obj.rieltor);
    console.log('  Rasmlar:', obj.rasmlar);

    // ✅ Get all images
    console.log('  Images found:', images.length);

    // Parse XET
    const xonaSoni = obj.xet ? obj.xet.split('/')[0] : '1';
    const etaj = obj.xet ? obj.xet.split('/')[1] : '1';
    const etajnost = obj.xet ? obj.xet.split('/')[2] : '1';
    const images = parseImages(obj.rasmlar);

    // ✅ CRITICAL: Parse price properly
    let price = 0;
    if (obj.narx) {
        // Remove spaces and parse
        const cleanPrice = String(obj.narx).replace(/\s/g, '');
        price = parseFloat(cleanPrice) || 0;
    }
    console.log('  Price (parsed):', price);

    // Create title
    const title = `${obj.sheet_type === 'Sotuv' ? 'Sotiladi' : 'Ijaraga'} - ${obj.kvartil || ''}, ${xonaSoni} xona`;

    // Create description
    const description = obj.opisaniya || `${xonaSoni} xonali kvartira, ${obj.m2 || ''} m², ${obj.kvartil || ''}`;

    const result = {
        id: obj.id,
        title: title,
        description: description,

        // ✅ Price (properly parsed)
        price: price,

        rooms: parseInt(xonaSoni) || 1,
        area: parseFloat(obj.m2) || 0,
        floor: parseInt(etaj) || 1,
        totalFloors: parseInt(etajnost) || 1,

        district: obj.kvartil || '',
        type: obj.sheet_type || 'Sotuv',

        // ✅ Images array
        images: images,

        // ✅ Contact info
        phone: obj.tell || '+998970850604',
        rieltor: obj.rieltor?.trim() || 'Maskan Lux Agent',

        createdAt: obj.sana || obj.created_at || new Date().toISOString(),

        // Additional details
        renovation: obj.xolati || 'Yaxshi',
        buildingType: obj.uy_turi || 'Panel',
        balcony: obj.balkon || "Yo'q",
        parking: obj.torets || "Yo'q",
        layout: obj.planirovka || null,
    };

    console.log('  ✅ Transform complete:');
    console.log('    Price:', result.price);
    console.log('    Rieltor:', result.rieltor);
    console.log('    Images:', result.images.length);

    return result;
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

        console.log('📥 GET /properties', { lang, rooms, location, type });

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

        console.log(`📥 GET /properties/${id}`);

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
        console.log('  Rieltor:', property.rieltor); // ✅ Log rieltor
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