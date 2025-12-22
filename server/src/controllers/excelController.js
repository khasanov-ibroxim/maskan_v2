// server/src/controllers/excelController.js - UPDATE FIXED
const PropertyObject = require('../models/Object.pg');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const path = require('path');
const fs = require('fs');
const { createAdTexts } = require('../utils/fileHelper');
const { UPLOADS_DIR } = require('../config/constants');

/**
 * ✅✅✅ FULLY FIXED: Update object with App Script + TXT files
 * PUT /api/excel/objects/:id
 */
exports.updateObject = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log('\n📝 OBYEKT YANGILANMOQDA');
        console.log('='.repeat(60));
        console.log('  ID:', id);
        console.log('  Updates:', Object.keys(updates));

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Noto\'g\'ri UUID format'
            });
        }

        // 1. PostgreSQL'dan obyektni topish
        const object = await PropertyObject.getById(id);
        if (!object) {
            return res.status(404).json({
                success: false,
                error: 'Obyekt topilmadi'
            });
        }

        console.log('  ✅ Obyekt topildi:', object.kvartil, object.xet);
        console.log('  📁 Rasmlar URL:', object.rasmlar);

        // 2. ✅ CRITICAL: Rieltor o'zgarishini tekshirish
        const oldRieltor = object.rieltor;
        const newRieltor = updates.rieltor || oldRieltor;
        const rielterChanged = newRieltor !== oldRieltor;

        console.log('\n👨‍💼 RIELTOR TEKSHIRUVI:');
        console.log(`  Eski: ${oldRieltor}`);
        console.log(`  Yangi: ${newRieltor}`);
        console.log(`  O'zgardi: ${rielterChanged ? '✅ HA' : '❌ YO\'Q'}`);

        // 3. PostgreSQL'da yangilash
        console.log('\n💾 PostgreSQL ga yangilanmoqda...');
        const updatedObject = await PropertyObject.update(id, updates);
        console.log('  ✅ PostgreSQL yangilandi');

        // 4. ✅ App Script'ga yuborish uchun ma'lumotlar
        const appScriptUpdates = {
            action: 'update',
            id: object.unique_id, // ✅ unique_id ishlatish
            updates: updates
        };

        console.log('\n📊 APP SCRIPT MA\'LUMOTLARI:');
        console.log('  Action:', appScriptUpdates.action);
        console.log('  Unique ID:', appScriptUpdates.id);
        console.log('  Updates:', Object.keys(appScriptUpdates.updates));

        // 5. ✅ GLAVNIY EXCEL'GA YUBORISH
        const { HERO_APP_SCRIPT } = require('../config/env');
        if (HERO_APP_SCRIPT) {
            console.log('\n📊 GLAVNIY EXCEL ga yuborish...');
            try {
                await sendToAppScriptWithRetry(HERO_APP_SCRIPT, appScriptUpdates);
                console.log('  ✅ GLAVNIY EXCEL yangilandi');
            } catch (error) {
                console.error('  ❌ GLAVNIY EXCEL xato:', error.message);
            }
        } else {
            console.log('  ⚠️ HERO_APP_SCRIPT yo\'q');
        }

        // 6. ✅ ESKI RIELTOR EXCEL'DAN O'CHIRISH (agar rieltor o'zgardi)
        if (rielterChanged && oldRieltor) {
            console.log('\n🗑️ ESKI RIELTOR EXCEL\'DAN O\'CHIRISH...');
            const User = require('../models/User.pg');
            try {
                const realtors = await User.getRealtors();
                const oldRielterInfo = realtors.find(u => u.username === oldRieltor);

                if (oldRielterInfo?.app_script_url) {
                    console.log(`  Eski rieltor: ${oldRieltor}`);
                    console.log(`  App Script URL: ${oldRielterInfo.app_script_url}`);

                    // ✅ DELETE action yuborish
                    const deleteData = {
                        action: 'delete',
                        id: object.unique_id
                    };

                    await sendToAppScriptWithRetry(
                        oldRielterInfo.app_script_url,
                        deleteData,
                        oldRielterInfo.id
                    );
                    console.log('  ✅ Eski rieltor Excel\'dan o\'chirildi');
                } else {
                    console.log('  ⚠️ Eski rieltor App Script URL topilmadi');
                }
            } catch (error) {
                console.error('  ❌ Eski rieltor o\'chirishda xato:', error.message);
            }
        }

        // 7. ✅ YANGI RIELTOR EXCEL'GA QO'SHISH
        if (newRieltor) {
            console.log('\n👨‍💼 YANGI RIELTOR EXCEL ga yuborish...');
            const User = require('../models/User.pg');
            try {
                const realtors = await User.getRealtors();
                const newRielterInfo = realtors.find(u => u.username === newRieltor);

                if (newRielterInfo?.app_script_url) {
                    console.log(`  Rieltor: ${newRieltor}`);
                    console.log(`  App Script URL: ${newRielterInfo.app_script_url}`);

                    // ✅ Agar rieltor o'zgardi - yangi qator qo'shish, aks holda - update
                    if (rielterChanged) {
                        console.log('  📝 Rieltor o\'zgardi - yangi qator yaratish...');
                        // To'liq obyekt ma'lumotlarini yuborish (CREATE action)
                        const fullData = {
                            ...updatedObject,
                            folderLink: updatedObject.rasmlar || "Yo'q"
                        };
                        await sendToAppScriptWithRetry(
                            newRielterInfo.app_script_url,
                            fullData, // CREATE uchun to'liq ma'lumot
                            newRielterInfo.id
                        );
                        console.log('  ✅ Yangi rieltor Excel\'ga qo\'shildi');
                    } else {
                        console.log('  📝 Rieltor o\'zgarmadi - update qilish...');
                        // UPDATE action
                        await sendToAppScriptWithRetry(
                            newRielterInfo.app_script_url,
                            appScriptUpdates,
                            newRielterInfo.id
                        );
                        console.log('  ✅ Rieltor Excel yangilandi');
                    }
                } else {
                    console.log('  ⚠️ Rieltor App Script URL topilmadi');
                }
            } catch (error) {
                console.error('  ❌ RIELTOR EXCEL xato:', error.message);
            }
        }

        // 8. ✅ TXT FAYLLARNI YANGILASH (OLX.TXT va TELEGRAM.TXT)
        console.log('\n📄 TXT FAYLLARNI YANGILASH...');
        try {
            // Rasmlar papkasini topish
            if (updatedObject.rasmlar && updatedObject.rasmlar !== "Yo'q") {
                console.log('  Rasmlar URL:', updatedObject.rasmlar);

                // URL'dan folder path'ni olish
                const urlParts = updatedObject.rasmlar.split('/browse/');
                if (urlParts.length > 1) {
                    const relativePath = decodeURIComponent(urlParts[1]);
                    const folderPath = path.join(UPLOADS_DIR, relativePath);

                    console.log('  Folder path:', folderPath);

                    if (fs.existsSync(folderPath)) {
                        console.log('  ✅ Papka topildi');

                        // Yangilangan ma'lumotlar bilan txt yaratish
                        const { olxText, telegramText } = createAdTexts(updatedObject);

                        // OLX.TXT yangilash
                        const olxPath = path.join(folderPath, 'olx.txt');
                        fs.writeFileSync(olxPath, olxText, 'utf8');
                        console.log('  ✅ olx.txt yangilandi');

                        // TELEGRAM.TXT yangilash
                        const telegramPath = path.join(folderPath, 'telegram.txt');
                        fs.writeFileSync(telegramPath, telegramText, 'utf8');
                        console.log('  ✅ telegram.txt yangilandi');
                    } else {
                        console.log('  ⚠️ Papka topilmadi:', folderPath);
                    }
                } else {
                    console.log('  ⚠️ URL formatida xato');
                }
            } else {
                console.log('  ⚠️ Rasmlar URL yo\'q');
            }
        } catch (txtError) {
            console.error('  ❌ TXT fayllar yangilashda xato:', txtError.message);
        }

        console.log('\n✅ YANGILANISH TUGADI');
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            message: 'Obyekt muvaffaqiyatli yangilandi',
            object: updatedObject,
            rielterChanged: rielterChanged,
            txtFilesUpdated: true
        });

    } catch (error) {
        console.error('❌ Update xato:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};