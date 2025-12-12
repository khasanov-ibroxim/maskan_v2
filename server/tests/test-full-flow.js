// ============================================
// 4. test-full-flow.js - To'liq Test
// ============================================
const PropertyObject = require('../src/models/Object.pg');
const { postToOLX } = require('../src/services/olxAutomationService');

async function testFullFlow() {
    console.log('🧪 TO\'LIQ FLOW TEST');
    console.log('='.repeat(60));

    // 1. Test obyekt yaratish
    const testObject = {
        kvartil: 'Yunusobod-1',
        xet: '1/1/1',
        tell: '+998901234567',
        m2: '50',
        narx: '45000',
        fio: 'Test Foydalanuvchi',
        uy_turi: 'Yangi bino',
        xolati: 'Ta\'mirli',
        planirovka: 'Ajratilgan',
        balkon: 'Bor',
        torets: 'Yo\'q',
        dom: 'Blok',
        kvartira: '123',
        osmotir: 'Istalgan vaqt',
        opisaniya: 'Test uchun yaratilgan',
        rieltor: 'Test Realtor',
        xodim: 'Test',
        sheetType: 'Sotuv',
        rasmlar: "Yo'q",
        sana: new Date().toLocaleString('uz-UZ')
    };

    console.log('\n1️⃣ Test obyekt yaratilmoqda...');
    const savedObject = await PropertyObject.save(testObject);
    console.log('✅ Obyekt saqlandi:', savedObject.id);

    console.log('\n2️⃣ OLX ga elon berilmoqda...');
    try {
        const result = await postToOLX(savedObject);
        console.log('✅ Elon berildi!');
        console.log('   URL:', result.adUrl);
    } catch (error) {
        console.error('❌ Elon berishda xato:', error.message);
    }

    console.log('\n3️⃣ Statusni tekshirish...');
    const updatedObject = await PropertyObject.getById(savedObject.id);
    console.log('   Status:', updatedObject.elon_status);
    console.log('   Elon Date:', updatedObject.elon_date);

    console.log('='.repeat(60));
}

testFullFlow().catch(console.error);