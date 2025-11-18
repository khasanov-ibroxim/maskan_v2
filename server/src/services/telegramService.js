const axios = require('axios');
const FormData = require('form-data');
const { TELEGRAM_BOT_TOKEN } = require('../config/env');
const { TELEGRAM_TIMEOUT } = require('../config/constants');

async function sendToTelegram(chatId, messageText, images, themeId) {
    if (!chatId) {
        console.log("⚠️ Chat ID yo'q, Telegram'ga yuborilmadi");
        return { success: false, error: "Chat ID yo'q" };
    }

    try {
        console.log(`📱 Telegram yuborish boshlandi: Chat=${chatId}, Theme=${themeId}`);

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

        // Faqat matn
        if (images.length === 0) {
            const payload = {
                chat_id: chatId,
                text: messageText,
                parse_mode: "HTML"
            };

            if (themeId) {
                payload.message_thread_id = themeId;
            }

            response = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                payload,
                { timeout: TELEGRAM_TIMEOUT }
            );
        }
        // Bitta rasm
        else if (images.length === 1) {
            const formData = new FormData();
            formData.append("chat_id", chatId);
            formData.append("caption", messageText);
            formData.append("parse_mode", "HTML");
            formData.append("photo", base64ToBuffer(images[0]), { filename: "photo.jpg" });

            if (themeId) {
                formData.append("message_thread_id", themeId);
            }

            response = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: TELEGRAM_TIMEOUT
                }
            );
        }
        // Ko'p rasmlar
        else {
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
                formData.append(`photo${idx}`, base64ToBuffer(img), { filename: `photo${idx}.jpg` });
            });

            response = await axios.post(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: TELEGRAM_TIMEOUT
                }
            );
        }

        if (response.data && response.data.ok) {
            console.log("✅ Telegram'ga muvaffaqiyatli yuborildi");
            return { success: true };
        } else {
            console.log(`❌ Telegram API xato: ${response.data?.description || "Unknown error"}`);
            return { success: false, error: response.data?.description || "Unknown error" };
        }

    } catch (error) {
        console.log(`❌ Telegram xato: ${error.message}`);
        return { success: false, error: error.message };
    }
}

module.exports = { sendToTelegram };