// server/src/services/appScriptService.js
const axios = require('axios');
const { APP_SCRIPT_TIMEOUT, APP_SCRIPT_MAX_RETRIES } = require('../config/constants');
const { sendToTelegram } = require('./telegramService');
const User = require('../models/User.pg'); // ✅ FIXED

async function sendToAppScriptWithRetry(url, data, realtorId, maxRetries = APP_SCRIPT_MAX_RETRIES) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 App Script'ga urinish ${attempt}/${maxRetries}...`);

            const response = await axios.post(url, data, {
                headers: { "Content-Type": "application/json" },
                timeout: APP_SCRIPT_TIMEOUT
            });

            console.log(`✅ App Script javobi (urinish ${attempt}):`,
                typeof response.data === 'string'
                    ? response.data.substring(0, 100) + '...'
                    : response.data
            );

            return response.data;

        } catch (error) {
            lastError = error;
            console.error(`❌ App Script xato (urinish ${attempt}/${maxRetries}):`, error.message);

            if (attempt === maxRetries && realtorId) {
                await notifyRealtorAboutError(realtorId, error, data);
            }

            if (attempt < maxRetries) {
                const waitTime = attempt * 3000;
                console.log(`⏳ ${waitTime}ms kutib qayta uriniladi...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
}

async function notifyRealtorAboutError(realtorId, error, data) {
    try {
        const realtor = await User.findById(realtorId); // ✅ FIXED

        if (!realtor || !realtor.telegram_theme_id) { // ✅ snake_case
            console.log('⚠️ Realtor yoki Telegram Theme ID topilmadi');
            return;
        }

        const errorMessage = `
⚠️ <b>App Script Xatosi</b>

🔴 Ma'lumotlarni yuborishda xatolik yuz berdi

📊 <b>Ma'lumot:</b>
• Kvartil: ${data.kvartil || 'N/A'}
• X/E/T: ${data.xet || 'N/A'}
• Telefon: ${data.tell || 'N/A'}

❌ <b>Xato:</b>
${error.message}

⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

💡 Iltimos, ma'lumotlarni qo'lda tekshiring.
        `.trim();

        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003298985470';

        await sendToTelegram(
            TELEGRAM_CHAT_ID,
            errorMessage,
            [],
            realtor.telegram_theme_id // ✅ snake_case
        );

        console.log(`✅ Realtor ${realtor.username} ga xato haqida xabar yuborildi`);

    } catch (notifyError) {
        console.error('❌ Telegram xabarnoma yuborishda xato:', notifyError.message);
    }
}

module.exports = {
    sendToAppScriptWithRetry,
    notifyRealtorAboutError
};