
// ============================================
// 2. test-database.js - Database Test
// ============================================
const { query, testConnection } = require('./src/config/database');

async function testDatabase() {
    console.log('🧪 DATABASE TEST');
    console.log('='.repeat(60));

    // 1. Connection
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }

    // 2. Count objects
    const countResult = await query('SELECT COUNT(*) FROM objects');
    console.log('📊 Jami obyektlar:', countResult.rows[0].count);

    // 3. Last 5 objects
    const lastObjects = await query(`
        SELECT id, kvartil, xet, elon_status, created_at 
        FROM objects 
        ORDER BY created_at DESC 
        LIMIT 5
    `);

    console.log('\n📋 Oxirgi 5 ta obyekt:');
    lastObjects.rows.forEach((obj, idx) => {
        console.log(`${idx + 1}. ${obj.kvartil} ${obj.xet} - ${obj.elon_status} (${obj.created_at})`);
    });

    // 4. Status breakdown
    const statusResult = await query(`
        SELECT 
            elon_status,
            COUNT(*) as count
        FROM objects
        GROUP BY elon_status
        ORDER BY count DESC
    `);

    console.log('\n📊 Status bo\'yicha:');
    statusResult.rows.forEach(row => {
        console.log(`   ${row.elon_status}: ${row.count}`);
    });

    console.log('='.repeat(60));
    process.exit(0);
}

testDatabase().catch(console.error);
