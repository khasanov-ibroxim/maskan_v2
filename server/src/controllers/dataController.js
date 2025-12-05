// ============================================
// server/src/controllers/dataController.js
// ✅ TO'LIQ YANGILANGAN KOD
// ============================================

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

        // ✅ CRITICAL FIX: Multer fayllarni base64'ga o'girish
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

            data.rasmlar = base64Images;
            console.log(`✅ ${base64Images.length} ta rasm base64'ga o'girildi`);
        }

        console.log("  Final rasmlar soni:", data.rasmlar?.length || 0);

        // ✅ 1. FAYLLARNI SAQLASH (Browse URL olish)
        let folderLink = null;
        try {
            console.log("\n💾 Fayllarni saqlash boshlandi...");
            console.log("  Request protocol:", req.protocol);
            console.log("  Request host:", req.get('host'));
            console.log("  Full URL:", `${req.protocol}://${req.get('host')}`);

            folderLink = await saveFiles(data, req);

            if (folderLink) {
                console.log("✅ Folder link yaratildi:", folderLink);
            } else {
                console.warn("⚠️ Folder link null qaytdi");
            }
        } catch (fileError) {
            console.error("❌ Fayl saqlashda xato:", fileError.message);
            console.error(fileError.stack);
        }
// ✅ 2. LOKAL EXCEL'GA SAQLASH (folderLink bilan)
        try {
            console.log("\n📊 Lokal Excel'ga saqlash boshlandi...");
            console.log("  Folder link:", folderLink || "YO'Q");
            console.log("  Data keys:", Object.keys(data));

            await saveToLocalExcel(data, folderLink); // ✅ folderLink uzatish
            console.log("✅ Lokal Excel'ga saqlandi");
        } catch (excelError) {
            console.error("❌ Lokal Excel'ga saqlashda xato:", excelError.message);
            console.error("   Stack:", excelError.stack);
            // ❌ CRITICAL: Xato bo'lsa ham davom ettirish
        }

        // ✅ 3. RIELTOR MA'LUMOTLARINI TOPISH
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

        // ✅ 4. TELEGRAM XABARNI TAYYORLASH
        let telegramMessage = "";
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003298985470';

        telegramMessage = `
🏠 <b>Yangi uy ma'lumoti</b>

📍 <b>Kvartil:</b> ${data.kvartil}
🏢 <b>X/E/ET:</b> ${data.xet}
📐 <b>Maydon:</b> ${data.m2} m²
💰 <b>Narxi:</b> ${data.narx} $
📞 <b>Telefon:</b> ${data.tell}
${data.fio ? `👤 <b>Ega:</b> ${data.fio}\n` : ''}${data.uy_turi ? `🏗 <b>Uy turi:</b> ${data.uy_turi}\n` : ''}${data.xolati ? `🔧 <b>Holati:</b> ${data.xolati}\n` : ''}${data.opisaniya ? `📝 <b>Izoh:</b> ${data.opisaniya}\n` : ''}${data.osmotir ? `🕐 <b>Ko'rikdan o'tish:</b> ${data.osmotir}\n` : ''}
👨‍💼 <b>Rieltor:</b> ${data.rieltor}
📅 <b>Sana:</b> ${data.sana}
${folderLink ? `\n🔗 <b>Rasmlar:</b> <a href="${folderLink}">Ko'rish</a>` : ''}
        `.trim();

        // ✅ 5. JAVOB YUBORISH (TEZKOR)
        res.json({
            success: true,
            message: "Ma'lumotlar qabul qilindi va navbatga qo'shildi",
            localFolder: folderLink,
            imageCount: data.rasmlar?.length || 0,
            queuePosition: appScriptQueue.queue.length + 1,
            queueStatus: appScriptQueue.getStatus()
        });

        // ✅ 6. BACKGROUND'DA YUBORISH
        appScriptQueue.add(async () => {
            const results = {
                telegram: { success: false },
                glavniy: { success: false },
                rielter: { success: false }
            };

            // ✅ TELEGRAM'GA YUBORISH
            console.log("\n📤 TELEGRAM'GA YUBORISH...");
            try {
                if (!TELEGRAM_CHAT_ID) {
                    throw new Error("TELEGRAM_CHAT_ID topilmadi");
                }

                const themeId = rielterInfo?.telegramThemeId || null;
                console.log(`   Chat ID: ${TELEGRAM_CHAT_ID}`);
                console.log(`   Theme ID: ${themeId || 'Yo\'q'}`);
                console.log(`   Rasmlar soni: ${data.rasmlar?.length || 0}`);

                const telegramResult = await sendToTelegram(
                    TELEGRAM_CHAT_ID,
                    telegramMessage,
                    data.rasmlar || [],  // ✅ Base64 rasmlarni yuborish
                    themeId
                );

                results.telegram = { success: telegramResult.success, data: telegramResult };
                console.log("✅ TELEGRAM'GA YUBORILDI");
            } catch (telegramError) {
                console.error("❌ TELEGRAM XATO:", telegramError.message);
                results.telegram = { success: false, error: telegramError.message };
            }

            // ✅ GLAVNIY EXCEL'GA YUBORISH
            console.log("\n📤 GLAVNIY EXCEL'GA YUBORISH...");
            try {
                if (!HERO_APP_SCRIPT) {
                    throw new Error("HERO_APP_SCRIPT environment o'zgaruvchisi topilmadi");
                }

                const glavniyData = {
                    ...data,
                    rasmlar: folderLink || "Yo'q",  // ✅ MUHIM: folderLink qo'shish
                    folderLink: folderLink || "Yo'q", // ✅ QOSHIMCHA backup field
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
                console.log("   Rasmlar URL:", glavniyData.rasmlar);
                console.log("   Folder Link:", glavniyData.folderLink); // ✅ Log qo'shish
                console.log("   URL:", HERO_APP_SCRIPT.substring(0, 50) + "...");

                const glavniyResult = await sendToAppScriptWithRetry(HERO_APP_SCRIPT, glavniyData);
                results.glavniy = { success: true, data: glavniyResult };
                console.log("✅ GLAVNIY EXCEL'GA YUBORILDI");
            } catch (glavniyError) {
                console.error("❌ GLAVNIY EXCEL XATO:", glavniyError.message);
                console.error("   Stack:", glavniyError.stack);
                results.glavniy = { success: false, error: glavniyError.message };
            }

      // ✅ RIELTER EXCEL'GA YUBORISH
            if (rielterInfo && rielterInfo.appScriptUrl) {
                console.log("\n📤 RIELTER EXCEL'GA YUBORISH...");
                try {
                    const rielterExcelData = {
                        ...data,
                        rasmlar: folderLink || "Yo'q",  // ✅ MUHIM: folderLink qo'shish
                        folderLink: folderLink || "Yo'q", // ✅ QOSHIMCHA backup field
                        sana: data.sana || new Date().toLocaleString('uz-UZ', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    };

                    console.log("   URL:", rielterInfo.appScriptUrl.substring(0, 50) + "...");
                    console.log("   Rasmlar URL:", rielterExcelData.rasmlar);
                    console.log("   Folder Link:", rielterExcelData.folderLink); // ✅ Log qo'shish

                    const rielterResult = await sendToAppScriptWithRetry(
                        rielterInfo.appScriptUrl,
                        rielterExcelData,
                        rielterInfo.id
                    );
                    results.rielter = { success: true, data: rielterResult };
                    console.log("✅ RIELTER EXCEL'GA YUBORILDI");
                } catch (rielterError) {
                    console.error("❌ RIELTER EXCEL XATO:", rielterError.message);
                    results.rielter = { success: false, error: rielterError.message };
                }
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