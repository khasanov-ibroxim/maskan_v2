const rielterData = require('../../rielter.js');
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { HERO_APP_SCRIPT } = require('../config/env');

async function sendData(req, res, appScriptQueue) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("🔥 YANGI SO'ROV");
        console.log("=".repeat(60));

        let data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
        if (!data) return res.status(400).json({ success: false, error: "Ma'lumot topilmadi" });

        console.log("  Kvartil:", data.kvartil);
        console.log("  XET:", data.xet);
        console.log("  Telefon:", data.tell);
        console.log("  Rasmlar:", data.rasmlar?.length || 0);
        console.log("  Rieltor:", data.rieltor);
        console.log("  Sana:", data.sana); // ✅ QUSHILDI

        // Fayllarni saqlash
        const folderLink = await saveFiles(data, req);

        // Rieltor ma'lumotlarini topish
        const rielterInfo = rielterData.find(r => r.name === data.rieltor);

        if (!rielterInfo) {
            console.log("⚠️ Rieltor topilmadi:", data.rieltor);
        } else {
            console.log("✅ Rieltor topildi:", rielterInfo.name);
        }

        // Telegram xabarni tayyorlash
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

        // Javob yuborish
        res.json({
            success: true,
            message: "Ma'lumotlar qabul qilindi va navbatga qo'shildi",
            localFolder: folderLink,
            queuePosition: appScriptQueue.queue.length + 1,
            queueStatus: appScriptQueue.getStatus()
        });

        // Background'da Telegram va App Script'ga yuborish
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
                    console.error("❌ Telegram xato:", telegramError.message);
                    results.telegram = { success: false, error: telegramError.message };
                }
            }

            // GLAVNIY EXCEL
            console.log("\n📤 GLAVNIY Excel'ga yuborish...");
            try {
                const glavniyData = {
                    ...data,
                    rasmlar: folderLink || "",
                    sana: data.sana || new Date().toLocaleString('uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) // ✅ SANA QUSHILDI va fallback bor
                };

                console.log("📊 Excel'ga yuboriladigan ma'lumotlar:");
                console.log("   Kvartil:", glavniyData.kvartil);
                console.log("   Sana:", glavniyData.sana); // ✅ LOG QUSHILDI
                console.log("   Rasmlar:", glavniyData.rasmlar);

                const glavniyResult = await sendToAppScriptWithRetry(HERO_APP_SCRIPT, glavniyData);
                results.glavniy = { success: true, data: glavniyResult };
                console.log("✅ GLAVNIY Excel'ga yuborildi");
            } catch (glavniyError) {
                console.error("❌ GLAVNIY Excel xato:", glavniyError.message);
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
                        }) // ✅ SANA QUSHILDI
                    };

                    const rielterResult = await sendToAppScriptWithRetry(
                        rielterInfo.rielterExcelId,
                        rielterExcelData
                    );
                    results.rielter = { success: true, data: rielterResult };
                    console.log("✅ Rielter Excel'ga yuborildi");
                } catch (rielterError) {
                    console.error("❌ Rielter Excel xato:", rielterError.message);
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
        console.error("\n❌ XATO:", err.message);
        console.error(err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { sendData };