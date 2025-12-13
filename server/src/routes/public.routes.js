const express = require('express');
const router = express.Router();
const { getObjectsFromExcel } = require('../services/localExcelService');
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
        title: (obj) => `${obj.sheet_type || 'Квартира'} - ${obj.kvartil || ''}`,
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
function translateProperty(obj, lang = 'uz') {
    const t = translations[lang] || translations.uz;

    // ✅ Parse price correctly - handle string with spaces
    let price = 0;
    if (obj.narx) {
        // Remove all spaces and parse
        const priceStr = String(obj.narx).replace(/\s/g, '');
        price = parseInt(priceStr, 10) || 0;
    }

    // Parse XET (xona/etaj/etajnost)
    const xetParts = (obj.xet || '').split('/');
    const rooms = parseInt(xetParts[0]) || 1;
    const floor = parseInt(xetParts[1]) || 1;
    const totalFloors = parseInt(xetParts[2]) || 1;

    // ✅ Construct images URL
    const imagesUrl = obj.rasmlar && obj.rasmlar !== "Yo'q"
        ? obj.rasmlar
        : null;

    // ✅ Get main image (for cards)
    const mainImage = imagesUrl
        ? `${process.env.API_URL || 'http://194.163.140.30:5000'}/browse/${encodeURIComponent(obj.kvartil || 'default')}`
        : null;

    return {
        id: obj.id,
        title: t.title(obj),
        description: t.description(obj),
        price: price, // ✅ Now correctly parsed
        rooms: rooms,
        area: parseInt(obj.m2) || 0,
        floor: floor,
        totalFloors: totalFloors,
        district: obj.kvartil || '',
        type: obj.sheet_type || 'Sotuv',
        renovation: t.renovation(obj),
        buildingType: t.buildingType(obj),
        balcony: t.balcony(obj),
        parking: t.parking(obj),
        images: imagesUrl ? [imagesUrl] : [],
        mainImage: mainImage,
        createdAt: obj.sana || new Date().toISOString(),
        phone: obj.tell || '',
        realtor: obj.rieltor || ''
    };
}

// ✅ GET /api/public/properties
router.get('/properties', async (req, res) => {
    try {
        const { lang = 'uz', rooms, location, type, min, max } = req.query;

        console.log('📥 GET /api/public/properties', { lang, rooms, location, type, min, max });

        // Get all objects from Excel
        const allObjects = await getObjectsFromExcel();
        console.log(`📊 Total objects from Excel: ${allObjects.length}`);

        // Filter
        let filtered = allObjects;

        if (rooms) {
            const targetRooms = parseInt(rooms);
            filtered = filtered.filter(obj => {
                const xetParts = (obj.xet || '').split('/');
                const objRooms = parseInt(xetParts[0]) || 0;
                return targetRooms >= 5 ? objRooms >= 5 : objRooms === targetRooms;
            });
        }

        if (location) {
            filtered = filtered.filter(obj =>
                (obj.kvartil || '').toLowerCase().includes(location.toLowerCase())
            );
        }

        if (type) {
            filtered = filtered.filter(obj => obj.sheet_type === type);
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

        // Translate
        const properties = filtered.map(obj => translateProperty(obj, lang));

        console.log(`✅ Returning ${properties.length} properties`);

        res.json({
            success: true,
            data: properties,
            count: properties.length
        });

    } catch (error) {
        console.error('❌ Error fetching properties:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

// ✅ GET /api/public/properties/:id
router.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang = 'uz' } = req.query;

        console.log(`📥 GET /api/public/properties/${id}`, { lang });

        const allObjects = await getObjectsFromExcel();
        const obj = allObjects.find(o => String(o.id) === String(id));

        if (!obj) {
            console.log('❌ Property not found:', id);
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        const property = translateProperty(obj, lang);

        console.log('✅ Property found:', property.id);

        res.json({
            success: true,
            data: property
        });

    } catch (error) {
        console.error('❌ Error fetching property:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

// ✅ GET /api/public/locations
router.get('/locations', async (req, res) => {
    try {
        const allObjects = await getObjectsFromExcel();

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
        console.error('❌ Error fetching locations:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

// ✅ GET /api/public/stats
router.get('/stats', async (req, res) => {
    try {
        const allObjects = await getObjectsFromExcel();

        // Get available rooms
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
                totalProperties: allObjects.length,
                availableRooms
            }
        });

    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
});

// ✅ GET /browse/:folder - Serve images from uploads folder
router.get('/browse/:folder', async (req, res) => {
    try {
        const { folder } = req.params;
        const folderPath = path.join(__dirname, '../../uploads', decodeURIComponent(folder));

        console.log('📂 Browse folder:', folderPath);

        // Check if folder exists
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
            return res.status(404).send('Folder not found');
        }

        // Read directory
        const files = await fs.readdir(folderPath);
        const imageFiles = files.filter(f =>
            /\.(jpg|jpeg|png|webp|gif)$/i.test(f)
        );

        // Generate HTML with image list
        const imagesHtml = imageFiles.map(file => {
            const imageUrl = `/browse/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
            return `<img src="${imageUrl}" alt="${file}" />`;
        }).join('\n');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${folder}</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        img { max-width: 300px; margin: 10px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Images in ${folder}</h1>
    ${imagesHtml}
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('❌ Error browsing folder:', error);
        res.status(404).send('Folder not found');
    }
});

// ✅ GET /browse/:folder/:image - Serve individual image
router.get('/browse/:folder/:image', async (req, res) => {
    try {
        const { folder, image } = req.params;
        const imagePath = path.join(
            __dirname,
            '../../uploads',
            decodeURIComponent(folder),
            decodeURIComponent(image)
        );

        console.log('🖼️ Serving image:', imagePath);

        // Send file
        res.sendFile(imagePath);

    } catch (error) {
        console.error('❌ Error serving image:', error);
        res.status(404).send('Image not found');
    }
});

module.exports = router;