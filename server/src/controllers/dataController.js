// server/src/controllers/dataController.js - FIXED VERSION
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { HERO_APP_SCRIPT } = require('../config/env');
const PropertyObject = require('../models/Object.pg'); // ✅ PostgreSQL model
const User = require('../models/User.pg'); // ✅ PostgreSQL model

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
        console.log("  Rieltor:", data.rieltor);

        // ✅ 1. FAYLLARNI SAQLASH
        let folderLink = null;
        try {
            console.log("\n💾 Fayllarni saqlash...");
            folderLink = await saveFiles(data, req);
            console.log("✅ Folder link:", folderLink || "Yo'q");
        } catch (fileError) {
            console.error("❌ Fayl saqlashda xato:", fileError.message);
        }

        // ✅ 2. RIELTOR MA'LUMOTLARINI TOPISH (PostgreSQL)
        // server/src/controllers/dataController.js - RIELTOR TOPISH QISMI
// Faqat o'zgartirilgan qismlar:

// ✅ 2. RIELTOR MA'LUMOTLARINI TOPISH (PostgreSQL)
        let rielterInfo = null;
        try {
            // ✅ FIXED: To'g'ri method
            const realtors = await User.getRealtors(); // Bu method mavjud

            rielterInfo = realtors.find(u => u.username === data.rieltor);

            if (!rielterInfo) {
                console.log("⚠️ Rieltor topilmadi:", data.rieltor);
            } else {
                console.log("✅ Rieltor topildi:", rielterInfo.username);
            }
        } catch (error) {
            console.error("❌ Rieltor qidirishda xato:", error.message);
        }
        if (rielterInfo?.app_script_url) { // ✅ snake_case
            try {
                const rielterData = {
                    ...data,
                    folderLink: folderLink || "Yo'q"
                };
                await sendToAppScriptWithRetry(
                    rielterInfo.app_script_url, // ✅ snake_case
                    rielterData,
                    rielterInfo.id
                );
                results.rielter = { success: true };
                console.log("✅ RIELTER EXCEL'GA YUBORILDI");
            } catch (error) {
                console.error("❌ RIELTER EXCEL XATO:", error.message);
            }
        }

        // ✅ 3. TELEGRAM XABAR TAYYORLASH
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003298985470';
        const telegramMessage = `
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

        // ✅ 4. JAVOB YUBORISH (TEZKOR)
        res.json({
            success: true,
            message: "Ma'lumotlar qabul qilindi va navbatga qo'shildi",
            localFolder: folderLink,
            queueStatus: appScriptQueue.getStatus()
        });

        // ✅ 5. BACKGROUND'DA YUBORISH VA SAQLASH
        appScriptQueue.add(async () => {
            const results = {
                telegram: { success: false },
                glavniy: { success: false },
                rielter: { success: false },
                postgres: { success: false }
            };

            // ✅ 5.1 TELEGRAM'GA YUBORISH
            try {
                const themeId = rielterInfo?.telegram_theme_id || null;
                const telegramResult = await sendToTelegram(
                    TELEGRAM_CHAT_ID,
                    telegramMessage,
                    data.rasmlar || [],
                    themeId
                );
                results.telegram = { success: telegramResult.success };
                console.log("✅ TELEGRAM'GA YUBORILDI");
            } catch (error) {
                console.error("❌ TELEGRAM XATO:", error.message);
            }

            // ✅ 5.2 GLAVNIY EXCEL'GA YUBORISH
            try {
                if (HERO_APP_SCRIPT) {
                    const glavniyData = {
                        ...data,
                        folderLink: folderLink || "Yo'q"
                    };
                    await sendToAppScriptWithRetry(HERO_APP_SCRIPT, glavniyData);
                    results.glavniy = { success: true };
                    console.log("✅ GLAVNIY EXCEL'GA YUBORILDI");
                }
            } catch (error) {
                console.error("❌ GLAVNIY EXCEL XATO:", error.message);
            }

            // ✅ 5.3 RIELTER EXCEL'GA YUBORISH
            if (rielterInfo?.app_script_url) {
                try {
                    const rielterData = {
                        ...data,
                        folderLink: folderLink || "Yo'q"
                    };
                    await sendToAppScriptWithRetry(
                        rielterInfo.app_script_url,
                        rielterData,
                        rielterInfo.id
                    );
                    results.rielter = { success: true };
                    console.log("✅ RIELTER EXCEL'GA YUBORILDI");
                } catch (error) {
                    console.error("❌ RIELTER EXCEL XATO:", error.message);
                }
            }

            // ✅ 5.4 POSTGRESQL GA SAQLASH (YANGI - FIXED!)
            try {
                console.log("\n💾 PostgreSQL ga saqlash...");
                const savedObject = await PropertyObject.save({
                    kvartil: data.kvartil,
                    xet: data.xet,
                    tell: data.tell,
                    m2: data.m2,
                    narx: data.narx,
                    fio: data.fio,
                    uy_turi: data.uy_turi,
                    xolati: data.xolati,
                    planirovka: data.planirovka,
                    balkon: data.balkon,
                    torets: data.torets,
                    dom: data.dom,
                    kvartira: data.kvartira,
                    osmotir: data.osmotir,
                    opisaniya: data.opisaniya,
                    rieltor: data.rieltor,
                    xodim: data.xodim,
                    sheetType: data.sheetType,
                    rasmlar: folderLink || "Yo'q",
                    sana: data.sana || new Date().toLocaleString('uz-UZ')
                });

                if (savedObject) {
                    results.postgres = { success: true, id: savedObject.id };
                    console.log("✅ POSTGRESQL GA SAQLANDI, ID:", savedObject.id);
                    console.log("   Unique ID:", savedObject.unique_id);
                } else {
                    throw new Error('Obyekt saqlanmadi');
                }
            } catch (error) {
                console.error("❌ POSTGRESQL XATO:", error.message);
                console.error("   Stack:", error.stack);
                results.postgres = { success: false, error: error.message };
            }

            console.log("\n📊 NATIJALAR:");
            console.log("  Telegram:", results.telegram.success ? "✅" : "❌");
            console.log("  GLAVNIY:", results.glavniy.success ? "✅" : "❌");
            console.log("  Rielter:", results.rielter.success ? "✅" : "❌");
            console.log("  PostgreSQL:", results.postgres.success ? "✅" : "❌");

            if (results.postgres.success) {
                console.log("  Postgres ID:", results.postgres.id);
            }

            return results;
        });

    } catch (err) {
        console.error("❌ KRITIK XATO:", err.message);
        console.error("   Stack:", err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { sendData };