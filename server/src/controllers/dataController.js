// src/controllers/dataController.js
const rielterData = require('../../rielter.js');
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { saveToLocalExcel } = require('../services/localExcelService');
const { HERO_APP_SCRIPT } = require('../config/env');

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
        console.log("  Rasmlar:", data.rasmlar?.length || 0);
        console.log("  Rieltor:", data.rieltor);
        console.log("  Sana:", data.sana);

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
        const rielterInfo = rielterData.find(r => r.name === data.rieltor);

        if (!rielterInfo) {
            console.log("⚠️ Rieltor topilmadi:", data.rieltor);
        } else {
            console.log("✅ Rieltor topildi:", rielterInfo.name);
            console.log("  Chat ID:", rielterInfo.rielterChatId);
            console.log("  Excel URL:", rielterInfo.rielterExcelId?.substring(0, 50) + "...");
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
            if (rielterInfo && rielterInfo.rielterChatId && telegramMessage) {
                console.log("\n📱 Telegram'ga yuborish boshlandi...");
                try {
                    const telegramResult = await sendToTelegram(
                        rielterInfo.rielterChatId,
                        telegramMessage,
                        data.rasmlar || [],
                        rielterInfo.themeId
                    );
                    results.telegram = telegramResult;

                    if (telegramResult.success) {
                        console.log("✅ Telegram'ga yuborildi");
                    } else {
                        console.log("❌ Telegram xato:", telegramResult.error);
                    }
                } catch (telegramError) {
                    console.error("❌ Telegram kritik xato:", telegramError.message);
                    results.telegram = { success: false, error: telegramError.message };
                }
            } else {
                console.log("⚠️ Telegram yuborilmadi (rieltor yoki chat ID yo'q)");
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