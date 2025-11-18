// test-network.js - Tarmoq ulanishini tekshirish
require('dotenv').config();
const axios = require('axios');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const HERO_APP_SCRIPT = process.env.HERO_APP_SCRIPT;

console.log("🔍 TARMOQ ULANISHINI TEKSHIRISH\n");
console.log("=".repeat(60));

// 1. Environment o'zgaruvchilarini tekshirish
console.log("\n1️⃣ Environment o'zgaruvchilari:");
console.log("   TELEGRAM_TOKEN:", TELEGRAM_BOT_TOKEN ? "✅ Mavjud" : "❌ Yo'q");
console.log("   HERO_APP_SCRIPT:", HERO_APP_SCRIPT ? "✅ Mavjud" : "❌ Yo'q");

// 2. Internet ulanishini tekshirish
async function testInternet() {
    console.log("\n2️⃣ Internet ulanishini tekshirish:");

    const testUrls = [
        { name: "Google", url: "https://www.google.com" },
        { name: "Cloudflare", url: "https://www.cloudflare.com" },
        { name: "Telegram API", url: "https://api.telegram.org" }
    ];

    for (const { name, url } of testUrls) {
        try {
            const start = Date.now();
            await axios.get(url, { timeout: 5000 });
            const duration = Date.now() - start;
            console.log(`   ✅ ${name}: ${duration}ms`);
        } catch (error) {
            console.log(`   ❌ ${name}: ${error.message}`);
        }
    }
}

// 3. Telegram API ni tekshirish
async function testTelegram() {
    console.log("\n3️⃣ Telegram API ni tekshirish:");

    if (!TELEGRAM_BOT_TOKEN) {
        console.log("   ❌ Token yo'q");
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
        console.log("   📡 So'rov: getMe");

        const start = Date.now();
        const response = await axios.get(url, { timeout: 10000 });
        const duration = Date.now() - start;

        if (response.data.ok) {
            console.log(`   ✅ Token ishlayapti (${duration}ms)`);
            console.log(`   🤖 Bot nomi: ${response.data.result.username}`);
        } else {
            console.log("   ❌ Token noto'g'ri");
        }
    } catch (error) {
        console.log(`   ❌ Xato: ${error.message}`);
        if (error.code === 'ENOTFOUND') {
            console.log("   💡 DNS xatosi - internet ulanishini tekshiring");
        }
    }
}

// 4. Google Apps Script ni tekshirish
async function testAppScript() {
    console.log("\n4️⃣ Google Apps Script ni tekshirish:");

    if (!HERO_APP_SCRIPT) {
        console.log("   ❌ URL yo'q");
        return;
    }

    console.log("   📡 URL:", HERO_APP_SCRIPT.substring(0, 70) + "...");

    try {
        const testData = {
            test: true,
            sana: new Date().toISOString(),
            message: "Test so'rov"
        };

        console.log("   📤 Test so'rov yuborilmoqda...");

        const start = Date.now();
        const response = await axios.post(HERO_APP_SCRIPT, testData, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000
        });
        const duration = Date.now() - start;

        console.log(`   ✅ Apps Script ishlayapti (${duration}ms)`);
        console.log("   📥 Javob:", typeof response.data === 'string'
            ? response.data.substring(0, 100)
            : JSON.stringify(response.data).substring(0, 100));

    } catch (error) {
        console.log(`   ❌ Xato: ${error.message}`);

        if (error.code === 'ENOTFOUND') {
            console.log("   💡 DNS xatosi:");
            console.log("      - Internet ulanishini tekshiring");
            console.log("      - VPN ishlatib ko'ring");
            console.log("      - DNS serverini o'zgartiring (8.8.8.8)");
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.log("   💡 Timeout xatosi:");
            console.log("      - Apps Script juda sekin javob bermoqda");
            console.log("      - Timeout vaqtini oshiring");
        } else if (error.response) {
            console.log("   📥 Server javobi:", error.response.status, error.response.statusText);
        }
    }
}

// 5. DNS ni tekshirish
async function testDNS() {
    console.log("\n5️⃣ DNS ni tekshirish:");

    const dns = require('dns').promises;
    const domains = [
        'api.telegram.org',
        'script.google.com',
        'www.google.com'
    ];

    for (const domain of domains) {
        try {
            const addresses = await dns.resolve4(domain);
            console.log(`   ✅ ${domain}: ${addresses[0]}`);
        } catch (error) {
            console.log(`   ❌ ${domain}: ${error.message}`);
        }
    }
}

// Barcha testlarni ishga tushirish
async function runAllTests() {
    try {
        await testInternet();
        await testTelegram();
        await testAppScript();
        await testDNS();

        console.log("\n" + "=".repeat(60));
        console.log("✅ Testlar tugadi");
        console.log("=".repeat(60) + "\n");

    } catch (error) {
        console.error("\n❌ Test xatosi:", error.message);
    }
}

// Testlarni boshlash
runAllTests();