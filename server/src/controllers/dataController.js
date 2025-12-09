// server/src/controllers/dataController.js
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { saveObject } = require('../services/serverDBService');
const { HERO_APP_SCRIPT } = require('../config/env');
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

        // ✅ 2. RIELTOR MA'LUMOTLARINI TOPISH
        const users = SimpleUser.getUsers();
        const rielterInfo = users.find(u =>
            u.role === 'rieltor' &&
            u.username === data.rieltor
        );

        if (!rielterInfo) {
            console.log("⚠️ Rieltor topilmadi:", data.rieltor);
        } else {
            console.log("✅ Rieltor topildi:", rielterInfo.username);
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

        // ✅ 5. BACKGROUND'DA YUBORISH
        appScriptQueue.add(async () => {
            const results = {
                telegram: { success: false },
                glavniy: { success: false },
                rielter: { success: false },
                serverDB: { success: false }
            };

            // ✅ 5.1 TELEGRAM'GA YUBORISH
            try {
                const themeId = rielterInfo?.telegramThemeId || null;
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
            if (rielterInfo?.appScriptUrl) {
                try {
                    const rielterData = {
                        ...data,
                        folderLink: folderLink || "Yo'q"
                    };
                    await sendToAppScriptWithRetry(
                        rielterInfo.appScriptUrl,
                        rielterData,
                        rielterInfo.id
                    );
                    results.rielter = { success: true };
                    console.log("✅ RIELTER EXCEL'GA YUBORILDI");
                } catch (error) {
                    console.error("❌ RIELTER EXCEL XATO:", error.message);
                }
            }

            // ✅ 5.4 SERVERDB GA SAQLASH (YANGI!)
            try {
                console.log("\n💾 ServerDB ga saqlash...");
                const savedObject = saveObject({
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
                    results.serverDB = { success: true };
                    console.log("✅ SERVERDB GA SAQLANDI, ID:", savedObject.id);
                }
            } catch (error) {
                console.error("❌ SERVERDB XATO:", error.message);
            }

            console.log("\n📊 NATIJALAR:");
            console.log("  Telegram:", results.telegram.success ? "✅" : "❌");
            console.log("  GLAVNIY:", results.glavniy.success ? "✅" : "❌");
            console.log("  Rielter:", results.rielter.success ? "✅" : "❌");
            console.log("  ServerDB:", results.serverDB.success ? "✅" : "❌");

            return results;
        });

    } catch (err) {
        console.error("❌ KRITIK XATO:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { sendData };