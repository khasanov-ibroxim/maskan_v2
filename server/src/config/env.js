require("dotenv").config();

// .env faylidan o'qish va tekshirish
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const HERO_APP_SCRIPT = process.env.HERO_APP_SCRIPT;
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Muhim o'zgaruvchilarni tekshirish
if (!TELEGRAM_TOKEN) {
    console.error("❌ XATO: TELEGRAM_TOKEN topilmadi .env faylida!");
}

if (!HERO_APP_SCRIPT) {
    console.error("❌ XATO: HERO_APP_SCRIPT topilmadi .env faylida!");
}

// Log qilish (faqat development muhitida)
if (NODE_ENV === 'development') {
    console.log("✅ Environment o'zgaruvchilari:");
    console.log("  - TELEGRAM_TOKEN:", TELEGRAM_TOKEN ? "Mavjud" : "Yo'q");
    console.log("  - HERO_APP_SCRIPT:", HERO_APP_SCRIPT ? "Mavjud" : "Yo'q");
    console.log("  - PORT:", PORT);
}

module.exports = {
    TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,  // Bu yerda to'g'ri export qilinishi kerak
    HERO_APP_SCRIPT: HERO_APP_SCRIPT,
    PORT: PORT,
    NODE_ENV: NODE_ENV
};