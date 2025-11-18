// index.js (Root papkada)
const app = require('./src/app');
const { PORT } = require('./src/config/constants');

const server = app.listen(PORT, () => {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 MASKAN LUX SERVER - TELEGRAM INTEGRATION");
    console.log("=".repeat(70));
    console.log(`\n📡 Server manzili: http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);

    console.log(`\n📂 Asosiy endpoint'lar:`);
    console.log(`   🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   👤 Get Me: GET http://localhost:${PORT}/api/auth/me`);
    console.log(`   👥 Users: GET http://localhost:${PORT}/api/users/users`);
    console.log(`   📤 Send Data: POST http://localhost:${PORT}/send-data`);
    console.log(`   📊 Queue Status: GET http://localhost:${PORT}/queue-status`);
    console.log(`   📁 Browse Files: GET http://localhost:${PORT}/browse`);

    console.log(`\n✨ Xususiyatlar:`);
    console.log(`   ✅ User autentifikatsiya (Session)`);
    console.log(`   ✅ Admin panel`);
    console.log(`   ✅ File upload va boshqaruv`);
    console.log(`   ✅ Telegram integratsiya`);
    console.log(`   ✅ Google Sheets integratsiya`);
    console.log(`   ✅ Queue system`);
    console.log(`   ✅ ZIP yuklab olish`);

    console.log("\n✅ Server tayyor va so'rovlarni kutmoqda!");
    console.log("=".repeat(70) + "\n");
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n⚠️ SIGTERM signal qabul qilindi. Server yopilmoqda...');
    server.close(() => {
        console.log('✅ Server yopildi');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n⚠️ SIGINT signal qabul qilindi (Ctrl+C). Server yopilmoqda...');
    server.close(() => {
        console.log('✅ Server yopildi');
        process.exit(0);
    });
});

// Unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;