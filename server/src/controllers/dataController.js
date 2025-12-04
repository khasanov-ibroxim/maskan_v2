// src/controllers/dataController.js
const rielterData = require('../../rielter.js');
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { saveToLocalExcel } = require('../services/localExcelService');
const { HERO_APP_SCRIPT } = require('../config/env');
const fs = require('fs');
const path = require('path');
const SimpleUser = require('../models/SimpleUser');

async function sendData(req, res, appScriptQueue) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("🔥 YANGI SO'ROV");
        console.log("=".repeat(60));

        let data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
        if (!data) {
            return res.status(400).json({
                success: false,
                error: "Ma'lumot topilmadi"
            });
        }

        console.log("📊 Qabul qilingan ma'lumotlar:");
        console.log("  Kvartil:", data.kvartil);
        console.log("  XET:", data.xet);
        console.log("  Telefon:", data.tell);
        console.log("  Multer files:", req.files?.length || 0);
        console.log("  Data rasmlar:", data.rasmlar?.length || 0);
        console.log("  Rieltor:", data.rieltor);
        console.log("  Sana:", data.sana);

        // ✅ CRITICAL FIX: Agar multer orqali fayllar kelgan bo'lsa, ularni base64'ga o'girish
        if (req.files && req.files.length > 0) {
            console.log("🔄 Multer fayllarni base64'ga o'girish boshlandi...");

            const base64Images = [];
            for (const file of req.files) {
                try {
                    const imageBuffer = fs.readFileSync(file.path);
                    const base64 = `data:${file.mimetype};base64,${imageBuffer.toString('base64')}`;
                    base64Images.push(base64);

                    console.log(`  ✅ ${file.originalname} o'girildi (${(base64.length / 1024).toFixed(2)} KB)`);

                    // Temp faylni o'chirish
                    try {
                        fs.unlinkSync(file.path);
                    } catch (unlinkErr) {
                        console.warn(`  ⚠️ Temp fayl o'chirilmadi: ${file.path}`);
                    }
                } catch (err) {
                    console.error(`  ❌ Fayl o'girishda xato: ${file.originalname}`, err.message);
                }
            }

            // Data'ga base64 rasmlarni qo'shish
            data.rasmlar = base64Images;
            console.log(`✅ ${base64Images.length} ta rasm base64'ga o'girildi`);
        }

        console.log("  Final rasmlar soni:", data.rasmlar?.length || 0);

        // 1. Fayllarni saqlash
        let folderLink = null;
        try {
            folderLink = await saveFiles(data, req);
            console.log("✅ Fayllar saqlandi:", folderLink);
        } catch (fileError) {
            console.error("⚠️ Fayl saqlashda xato:", fileError.message);
        }

        // 2. Lokal Excel'ga saqlash (staxovka)
        try {
            await saveToLocalExcel(data, folderLink);
            console.log("✅ Lokal Excel'ga saqlandi");
        } catch (excelError) {
            console.error("⚠️ Lokal Excel'ga saqlashda xato:", excelError.message);
        }

        // 3. Rieltor ma'lumotlarini topish
        const users = SimpleUser.getUsers();
        const rielterInfo = users.find(u =>
            u.role === 'rieltor' &&
            u.username === data.rieltor
        );

        if (!rielterInfo) {
            console.log("⚠️ Rieltor topilmadi:", data.rieltor);
        } else {
            console.log("✅ Rieltor topildi:", rielterInfo.username);
            console.log("  App Script URL:", rielterInfo.appScriptUrl?.substring(0, 50) + "...");
            console.log("  Telegram Theme ID:", rielterInfo.telegramThemeId);
        }

        // 4. Telegram xabarni tayyorlash
        let telegramMessage = "";
        if (rielterInfo && rielterInfo.rielterChatId) {
            telegramMessage = `
🏠 <b>Yangi uy ma'lumoti</b>

📍 <b>Kvartil:</b> ${data.kvartil}
🏢 <b>X/E/ET:</b> ${data.xet}
📐 <b>Maydon:</b> ${data.m2} m²
💰 <b>Narxi:</b> ${data.narx} $
📞 <b>Telefon:</b> ${data.tell}
${data.fio ? `👤 <b>Ega:</b> ${data.fio}` : ''}
${data.uy_turi ? `🏗 <b>Uy turi:</b> ${data.uy_turi}` : ''}
${data.xolati ? `🔧 <b>Holati:</b> ${data.xolati}` : ''}
${data.opisaniya ? `📝 <b>Izoh:</b> ${data.opisaniya}` : ''}
${data.osmotir ? `🕐 <b>Ko'rikdan o'tish:</b> ${data.osmotir}` : ''}

👨‍💼 <b>Rieltor:</b> ${data.rieltor}
📅 <b>Sana:</b> ${data.sana}
            `.trim();
        }

        // 5. Javob yuborish (TEZKOR)
        res.json({
            success: true,
            message: "Ma'lumotlar qabul qilindi va navbatga qo'shildi",
            localFolder: folderLink,
            imageCount: data.rasmlar?.length || 0,
            queuePosition: appScriptQueue.queue.length + 1,
            queueStatus: appScriptQueue.getStatus()
        });

        // 6. Background'da yuborish
        appScriptQueue.add(async () => {
            const results = {
                telegram: { success: false },
                glavniy: { success: false },
                rielter: { success: false }
            };

            // TELEGRAM
            if (rielterInfo && rielterInfo.appScriptUrl) {
                console.log("\n📤 Rielter Excel'ga yuborish...");
                try {
                    const rielterExcelData = {
                        ...data,
                        rasmlar: folderLink || "",
                        sana: data.sana || new Date().toLocaleString('uz-UZ', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    };

                    console.log("   URL:", rielterInfo.appScriptUrl.substring(0, 50) + "...");

                    const rielterResult = await sendToAppScriptWithRetry(
                        rielterInfo.appScriptUrl,
                        rielterExcelData,
                        rielterInfo.id // Xato bo'lganda notification uchun
                    );
                    results.rielter = { success: true, data: rielterResult };
                    console.log("✅ Rielter Excel'ga yuborildi");
                } catch (rielterError) {
                    console.error("❌ Rielter Excel xato:", rielterError.message);
                    results.rielter = { success: false, error: rielterError.message };
                }
            }


            // GLAVNIY EXCEL
            console.log("\n📤 GLAVNIY Excel'ga yuborish...");
            try {
                if (!HERO_APP_SCRIPT) {
                    throw new Error("HERO_APP_SCRIPT environment o'zgaruvchisi topilmadi");
                }

                const glavniyData = {
                    ...data,
                    rasmlar: folderLink || "",
                    sana: data.sana || new Date().toLocaleString('uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                };

                console.log("📊 Excel'ga yuboriladigan ma'lumotlar:");
                console.log("   Kvartil:", glavniyData.kvartil);
                console.log("   Sana:", glavniyData.sana);
                console.log("   Rasmlar:", glavniyData.rasmlar);
                console.log("   URL:", HERO_APP_SCRIPT.substring(0, 50) + "...");

                const glavniyResult = await sendToAppScriptWithRetry(HERO_APP_SCRIPT, glavniyData);
                results.glavniy = { success: true, data: glavniyResult };
                console.log("✅ GLAVNIY Excel'ga yuborildi");
            } catch (glavniyError) {
                console.error("❌ GLAVNIY Excel xato:", glavniyError.message);
                console.error("   Stack:", glavniyError.stack);
                results.glavniy = { success: false, error: glavniyError.message };
            }

            // RIELTER EXCEL
            if (rielterInfo && rielterInfo.rielterExcelId) {
                console.log("\n📤 Rielter Excel'ga yuborish...");
                try {
                    const rielterExcelData = {
                        ...data,
                        rasmlar: folderLink || "",
                        sana: data.sana || new Date().toLocaleString('uz-UZ', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    };

                    console.log("   URL:", rielterInfo.rielterExcelId.substring(0, 50) + "...");

                    const rielterResult = await sendToAppScriptWithRetry(
                        rielterInfo.rielterExcelId,
                        rielterExcelData
                    );
                    results.rielter = { success: true, data: rielterResult };
                    console.log("✅ Rielter Excel'ga yuborildi");
                } catch (rielterError) {
                    console.error("❌ Rielter Excel xato:", rielterError.message);
                    console.error("   Stack:", rielterError.stack);
                    results.rielter = { success: false, error: rielterError.message };
                }
            } else {
                console.log("⚠️ Rielter Excel yuborilmadi (URL yo'q)");
            }

            console.log("\n" + "=".repeat(60));
            console.log("📊 NATIJALAR:");
            console.log("  Telegram:", results.telegram.success ? "✅" : "❌");
            console.log("  GLAVNIY:", results.glavniy.success ? "✅" : "❌");
            console.log("  Rielter:", results.rielter.success ? "✅" : "❌");
            console.log("=".repeat(60) + "\n");

            return results;
        });

        console.log("=".repeat(60) + "\n");

    } catch (err) {
        console.error("\n❌ KRITIK XATO:", err.message);
        console.error(err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { sendData };