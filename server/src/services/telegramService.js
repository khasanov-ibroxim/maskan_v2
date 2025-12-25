// server/src/services/telegramService.js - ✅ FIXED: Accept token as parameter

const axios = require('axios');
const FormData = require('form-data');
const { TELEGRAM_TIMEOUT } = require('../config/constants');

/**
 * ✅ CRITICAL FIX: Accept botToken as parameter instead of using env
 * @param {string} chatId - Telegram chat ID
 * @param {string} messageText - Message text
 * @param {Array} images - Array of base64 images
 * @param {number} themeId - Telegram thread/topic ID
 * @param {string} botToken - Telegram bot token (from Global Config or .env)
 */
async function sendToTelegram(chatId, messageText, images, themeId, botToken) {
    if (!chatId) {
        console.log("⚠️ Chat ID yo'q, Telegram'ga yuborilmadi");
        return { success: false, error: "Chat ID yo'q" };
    }

    if (!botToken) {
        console.error("❌ TELEGRAM_BOT_TOKEN topilmadi!");
        console.error("   Global Config'da 'telegram_bot_token' sozlang!");
        return { success: false, error: "Bot token yo'q" };
    }

    try {
        console.log(`📱 Telegram yuborish boshlandi:`);
        console.log(`   Chat ID: ${chatId}`);
        console.log(`   Theme ID: ${themeId || 'Yo\'q'}`);
        console.log(`   Rasmlar: ${images?.length || 0} ta`);
        console.log(`   Xabar uzunligi: ${messageText?.length || 0} belgi`);
        console.log(`   Bot Token: ${botToken ? botToken.substring(0, 20) + '...' : 'YO\'Q'}`);

        const base64ToBuffer = (base64Data) => {
            const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error("Noto'g'ri base64 format");
            }
            return Buffer.from(matches[2], "base64");
        };

        if (!Array.isArray(images)) {
            images = images ? [images] : [];
        }

        let response;

        // ✅ Faqat matn
        if (images.length === 0) {
            console.log("   📝 Faqat matn yuborilmoqda...");

            const payload = {
                chat_id: chatId,
                text: messageText,
                parse_mode: "HTML"
            };

            if (themeId) {
                payload.message_thread_id = themeId;
            }

            response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                payload,
                {
                    timeout: TELEGRAM_TIMEOUT,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        // ✅ Bitta rasm
        else if (images.length === 1) {
            console.log("   🖼 1 ta rasm yuborilmoqda...");

            const formData = new FormData();
            formData.append("chat_id", chatId);
            formData.append("caption", messageText);
            formData.append("parse_mode", "HTML");

            try {
                const photoBuffer = base64ToBuffer(images[0]);
                formData.append("photo", photoBuffer, { filename: "photo.jpg" });
                console.log(`   ✅ Rasm hajmi: ${(photoBuffer.length / 1024).toFixed(2)} KB`);
            } catch (bufferError) {
                console.error("   ❌ Base64 o'girishda xato:", bufferError.message);
                throw bufferError;
            }

            if (themeId) {
                formData.append("message_thread_id", themeId);
            }

            response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendPhoto`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: TELEGRAM_TIMEOUT,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
        }
        // ✅ Ko'p rasmlar
        else {
            console.log(`   🖼 ${images.length} ta rasm yuborilmoqda...`);

            const media = images.map((img, idx) => ({
                type: "photo",
                media: `attach://photo${idx}`,
                caption: idx === 0 ? messageText : undefined,
                parse_mode: idx === 0 ? "HTML" : undefined
            }));

            const formData = new FormData();
            formData.append("chat_id", chatId);
            formData.append("media", JSON.stringify(media));

            if (themeId) {
                formData.append("message_thread_id", themeId);
            }

            images.forEach((img, idx) => {
                try {
                    const photoBuffer = base64ToBuffer(img);
                    formData.append(`photo${idx}`, photoBuffer, { filename: `photo${idx}.jpg` });
                    console.log(`   ✅ Rasm ${idx + 1}: ${(photoBuffer.length / 1024).toFixed(2)} KB`);
                } catch (bufferError) {
                    console.error(`   ❌ Rasm ${idx + 1} xato:`, bufferError.message);
                }
            });

            response = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendMediaGroup`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: TELEGRAM_TIMEOUT * 2,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
        }

        if (response.data && response.data.ok) {
            console.log("✅ Telegram'ga muvaffaqiyatli yuborildi");
            return { success: true, data: response.data };
        } else {
            console.error(`❌ Telegram API xato: ${response.data?.description || "Unknown error"}`);
            return { success: false, error: response.data?.description || "Unknown error" };
        }

    } catch (error) {
        console.error(`❌ Telegram xato: ${error.message}`);

        if (error.response) {
            console.error("   Response status:", error.response.status);
            console.error("   Response data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error("   No response received");
        }

        return { success: false, error: error.message };
    }
}

module.exports = { sendToTelegram };