// server/src/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Pool konfiguratsiyasi
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'maskanlux',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,

    // Connection pool settings
    max: 20, // maksimal connection soni
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Connection test
pool.on('connect', () => {
    console.log('✅ PostgreSQL ga ulandi');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL xato:', err);
});

// Connection tekshirish
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Database test muvaffaqiyatli:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection xato:', error.message);
        return false;
    }
};

// Query helper with error handling
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Query error:', error.message);
        console.error('   Query:', text);
        console.error('   Params:', params);
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};