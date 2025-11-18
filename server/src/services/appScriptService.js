const axios = require('axios');
const { APP_SCRIPT_TIMEOUT, APP_SCRIPT_MAX_RETRIES } = require('../config/constants');

async function sendToAppScriptWithRetry(url, data, maxRetries = APP_SCRIPT_MAX_RETRIES) {
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

            if (attempt < maxRetries) {
                const waitTime = attempt * 3000;
                console.log(`⏳ ${waitTime}ms kutib qayta uriniladi...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
}

module.exports = { sendToAppScriptWithRetry };