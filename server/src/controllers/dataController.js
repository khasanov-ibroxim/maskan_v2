// server/src/controllers/dataController.js - FIXED: Moved getGlobalConfig inside async function
const { sendToTelegram } = require('../services/telegramService');
const { sendToAppScriptWithRetry } = require('../services/appScriptService');
const { saveFiles } = require('../services/fileService');
const { HERO_APP_SCRIPT } = require('../config/env');
const PropertyObject = require('../models/Object.pg');
const User = require('../models/User.pg');
const AppSettings = require('../models/AppSettings.pg'); // ✅ Import the model, not the result

async function sendData(req, res, appScriptQueue) {
    try {
        console.log("\n" + "=".repeat(60));
        console.log("🔥 YANGI SO'ROV");
        console.log("=".repeat(60));

        // ✅ FIXED: Get global config inside the async function
        const globalConfig = await AppSettings.getGlobalConfig();
        const COMPANY_PHONE = globalConfig.company_phone || '+998970850604';

        let phoneForAd = COMPANY_PHONE;

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
        let rielterInfo = null;
        try {
            console.log("\n👨‍💼 RIELTOR QIDIRISH:");
            console.log("  Username:", data.rieltor);

            const realtors = await User.getRealtors();
            console.log(`  📊 Jami rieltor'lar: ${realtors.length}`);

            realtors.forEach(r => {
                console.log(`    - ${r.username} (${r.app_script_url ? '✅ URL bor' : '❌ URL yo\'q'})`);
            });

            rielterInfo = realtors.find(u => u.username === data.rieltor);

            if (!rielterInfo) {
                console.log("  ⚠️ Rieltor topilmadi:", data.rieltor);
            } else {
                console.log("  ✅ Rieltor topildi:");
                console.log("    ID:", rielterInfo.id);
                console.log("    Username:", rielterInfo.username);
                console.log("    App Script URL:", rielterInfo.app_script_url || "YO'Q");
                console.log("    Telegram Theme ID:", rielterInfo.telegram_theme_id || "YO'Q");
            }
        } catch (error) {
            console.error("❌ Rieltor qidirishda xato:", error.message);
        }

        if (rielterInfo && rielterInfo.role === 'individual_rieltor' && rielterInfo.phone) {
            phoneForAd = rielterInfo.phone;
            console.log('  📱 Individual rieltor telefoni ishlatiladi:', phoneForAd);
        } else {
            console.log('  📱 Kompaniya telefoni ishlatiladi:', phoneForAd);
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
                console.log("\n📱 TELEGRAM'GA YUBORISH:");
                console.log("  Chat ID:", TELEGRAM_CHAT_ID);
                console.log("  Theme ID:", rielterInfo?.telegram_theme_id || "YO'Q");
                console.log("  Rasmlar:", data.rasmlar?.length || 0);

                const themeId = rielterInfo?.telegram_theme_id || null;
                const telegramResult = await sendToTelegram(
                    TELEGRAM_CHAT_ID,
                    telegramMessage,
                    data.rasmlar || [],
                    themeId
                );

                if (telegramResult.success) {
                    results.telegram = { success: true };
                    console.log("  ✅ TELEGRAM'GA YUBORILDI");
                } else {
                    console.error("  ❌ TELEGRAM XATO:", telegramResult.error);
                    results.telegram = { success: false, error: telegramResult.error };
                }
            } catch (error) {
                console.error("  ❌ TELEGRAM XATO:", error.message);
                results.telegram = { success: false, error: error.message };
            }

            // ✅ 5.2 POSTGRESQL GA SAQLASH (BU YERDA UNIQUE_ID YARATILADI!)
            let savedObject = null;
            try {
                console.log("\n💾 PostgreSQL ga saqlash...");
                savedObject = await PropertyObject.save({
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
                    sana: data.sana || new Date().toLocaleString('uz-UZ'),
                    phoneForAd: phoneForAd
                });

                if (savedObject) {
                    results.postgres = { success: true, id: savedObject.id };
                    console.log("  ✅ POSTGRESQL GA SAQLANDI");
                    console.log("    ID:", savedObject.id);
                    console.log("    Unique ID:", savedObject.unique_id);
                } else {
                    throw new Error('Obyekt saqlanmadi');
                }
            } catch (error) {
                console.error("  ❌ POSTGRESQL XATO:", error.message);
                results.postgres = { success: false, error: error.message };
            }

            // ✅ CRITICAL FIX: Agar PostgreSQL'ga saqlanmagan bo'lsa, to'xtatish
            if (!savedObject) {
                console.error("❌ Unique ID yo'q - Google Sheets'ga yuborilmaydi!");
                return results;
            }

            // ✅ 5.3 GLAVNIY EXCEL'GA YUBORISH (UNIQUE_ID bilan!)
            try {
                if (HERO_APP_SCRIPT) {
                    console.log("\n📊 GLAVNIY EXCEL'GA YUBORISH:");
                    console.log("  URL:", HERO_APP_SCRIPT.substring(0, 50) + "...");
                    console.log("  Unique ID:", savedObject.unique_id);

                    const glavniyData = {
                        ...data,
                        id: savedObject.unique_id,
                        unique_id: savedObject.unique_id,
                        folderLink: folderLink || "Yo'q"
                    };

                    console.log("  📝 Yuborilayotgan ma'lumotlar:");
                    console.log("    id:", glavniyData.id);
                    console.log("    unique_id:", glavniyData.unique_id);
                    console.log("    folderLink:", glavniyData.folderLink);

                    await sendToAppScriptWithRetry(HERO_APP_SCRIPT, glavniyData);
                    results.glavniy = { success: true };
                    console.log("  ✅ GLAVNIY EXCEL'GA YUBORILDI");
                } else {
                    console.log("  ⚠️ HERO_APP_SCRIPT yo'q");
                }
            } catch (error) {
                console.error("  ❌ GLAVNIY EXCEL XATO:", error.message);
                results.glavniy = { success: false, error: error.message };
            }

            // ✅ 5.4 RIELTER EXCEL'GA YUBORISH (UNIQUE_ID bilan!)
            if (rielterInfo?.app_script_url) {
                try {
                    console.log("\n👨‍💼 RIELTER EXCEL'GA YUBORISH:");
                    console.log("  Rieltor:", rielterInfo.username);
                    console.log("  URL:", rielterInfo.app_script_url.substring(0, 50) + "...");
                    console.log("  Unique ID:", savedObject.unique_id);

                    const rielterData = {
                        ...data,
                        id: savedObject.unique_id,
                        unique_id: savedObject.unique_id,
                        folderLink: folderLink || "Yo'q"
                    };

                    console.log("  📝 Yuborilayotgan ma'lumotlar:");
                    console.log("    id:", rielterData.id);
                    console.log("    unique_id:", rielterData.unique_id);
                    console.log("    folderLink:", rielterData.folderLink);

                    await sendToAppScriptWithRetry(
                        rielterInfo.app_script_url,
                        rielterData,
                        rielterInfo.id
                    );

                    results.rielter = { success: true };
                    console.log("  ✅ RIELTER EXCEL'GA YUBORILDI");
                } catch (error) {
                    console.error("  ❌ RIELTER EXCEL XATO:", error.message);
                    results.rielter = { success: false, error: error.message };
                }
            } else {
                console.log("\n  ⚠️ RIELTER APP SCRIPT URL YO'Q");
                console.log(`    Rieltor: ${rielterInfo?.username || "Topilmadi"}`);
            }

            console.log("\n📊 NATIJALAR:");
            console.log("  Telegram:", results.telegram.success ? "✅" : `❌ ${results.telegram.error || ''}`);
            console.log("  GLAVNIY:", results.glavniy.success ? "✅" : `❌ ${results.glavniy.error || ''}`);
            console.log("  Rielter:", results.rielter.success ? "✅" : `❌ ${results.rielter.error || ''}`);
            console.log("  PostgreSQL:", results.postgres.success ? "✅" : `❌ ${results.postgres.error || ''}`);

            return results;
        });

    } catch (err) {
        console.error("❌ KRITIK XATO:", err.message);
        console.error("   Stack:", err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = { sendData };