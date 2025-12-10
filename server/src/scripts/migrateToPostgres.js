// server/src/scripts/migrateToPostgres.js
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/database');
const User = require('../models/User.pg');
const Session = require('../models/Session.pg');
const ActivityLog = require('../models/ActivityLog.pg');
const PropertyObject = require('../models/Object.pg');

// JSON fayl yo'llari
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

const STORAGE_DIR = path.join(__dirname, '../../storage');
const SERVER_DB_FILE = path.join(STORAGE_DIR, 'serverDB.json');

async function migrateUsers() {
    console.log('\n📊 USERS MIGRATSIYASI...');
    console.log('='.repeat(60));

    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.log('⚠️ users.json topilmadi');
            return;
        }

        const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        console.log(`📝 ${usersData.length} ta user topildi`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of usersData) {
            try {
                // Check if already exists
                const existing = await pool.query(
                    'SELECT id FROM users WHERE username = $1',
                    [user.username]
                );

                if (existing.rows.length > 0) {
                    console.log(`⏭️  ${user.username} - allaqachon mavjud`);
                    skippedCount++;
                    continue;
                }

                // Insert user
                await pool.query(
                    `INSERT INTO users (username, password, full_name, role, is_active, app_script_url, telegram_theme_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        user.username,
                        user.password, // already hashed
                        user.fullName,
                        user.role,
                        user.isActive !== false,
                        user.appScriptUrl || null,
                        user.telegramThemeId || null,
                        user.createdAt || new Date().toISOString()
                    ]
                );

                console.log(`✅ ${user.username} migrate qilindi`);
                migratedCount++;

            } catch (error) {
                console.error(`❌ ${user.username} xato:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Users migratsiyasi tugadi:`);
        console.log(`   Migrate qilindi: ${migratedCount}`);
        console.log(`   O'tkazildi: ${skippedCount}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Users migratsiya xato:', error.message);
    }
}

async function migrateSessions() {
    console.log('\n📊 SESSIONS MIGRATSIYASI...');
    console.log('='.repeat(60));

    try {
        if (!fs.existsSync(SESSIONS_FILE)) {
            console.log('⚠️ sessions.json topilmadi');
            return;
        }

        const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        console.log(`📝 ${sessionsData.length} ta session topildi`);

        // Faqat oxirgi 100 ta sessionni migrate qilish
        const recentSessions = sessionsData.slice(-100);

        let migratedCount = 0;

        for (const session of recentSessions) {
            try {
                // Get user_id by username
                const userResult = await pool.query(
                    'SELECT id FROM users WHERE username = $1',
                    [session.username]
                );

                if (userResult.rows.length === 0) {
                    console.log(`⚠️ User topilmadi: ${session.username}`);
                    continue;
                }

                const userId = userResult.rows[0].id;

                // Insert session
                await pool.query(
                    `INSERT INTO sessions (
                        session_id, user_id, username, login_time, last_activity,
                        expires_at, ip_address, user_agent, is_active, logout_time,
                        logout_reason, duration
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (session_id) DO NOTHING`,
                    [
                        session.sessionId,
                        userId,
                        session.username,
                        session.loginTime,
                        session.lastActivity,
                        session.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        session.ipAddress || 'unknown',
                        session.userAgent || 'unknown',
                        session.isActive !== false,
                        session.logoutTime || null,
                        session.logoutReason || null,
                        session.duration || null
                    ]
                );

                migratedCount++;

            } catch (error) {
                console.error(`❌ Session xato:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Sessions migratsiyasi tugadi: ${migratedCount} ta`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Sessions migratsiya xato:', error.message);
    }
}

async function migrateLogs() {
    console.log('\n📊 LOGS MIGRATSIYASI...');
    console.log('='.repeat(60));

    try {
        if (!fs.existsSync(LOGS_FILE)) {
            console.log('⚠️ logs.json topilmadi');
            return;
        }

        const logsData = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
        console.log(`📝 ${logsData.length} ta log topildi`);

        // Faqat oxirgi 500 ta logni migrate qilish
        const recentLogs = logsData.slice(-500);

        let migratedCount = 0;

        for (const log of recentLogs) {
            try {
                // Get user_id by userId (string to UUID)
                const userResult = await pool.query(
                    'SELECT id FROM users WHERE username = $1',
                    [log.username]
                );

                const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;

                if (!userId) {
                    continue;
                }

                // Insert log
                await pool.query(
                    `INSERT INTO activity_logs (
                        user_id, username, action, description, ip_address, user_agent, timestamp
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        userId,
                        log.username,
                        log.action,
                        log.description || '',
                        log.ipAddress || 'unknown',
                        log.userAgent || 'unknown',
                        log.timestamp || new Date().toISOString()
                    ]
                );

                migratedCount++;

            } catch (error) {
                // Skip duplicate or error logs
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Logs migratsiyasi tugadi: ${migratedCount} ta`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Logs migratsiya xato:', error.message);
    }
}

async function migrateObjects() {
    console.log('\n📊 OBJECTS (ServerDB) MIGRATSIYASI...');
    console.log('='.repeat(60));

    try {
        if (!fs.existsSync(SERVER_DB_FILE)) {
            console.log('⚠️ serverDB.json topilmadi');
            return;
        }

        const serverDB = JSON.parse(fs.readFileSync(SERVER_DB_FILE, 'utf8'));
        const objects = serverDB.objects || [];

        console.log(`📝 ${objects.length} ta obyekt topildi`);

        let migratedCount = 0;

        for (const obj of objects) {
            try {
                await PropertyObject.save({
                    kvartil: obj.kvartil,
                    xet: obj.xet,
                    tell: obj.tell,
                    m2: obj.m2,
                    narx: obj.narx,
                    fio: obj.fio,
                    uy_turi: obj.uy_turi,
                    xolati: obj.xolati,
                    planirovka: obj.planirovka,
                    balkon: obj.balkon,
                    torets: obj.torets,
                    dom: obj.dom,
                    kvartira: obj.kvartira,
                    osmotir: obj.osmotir,
                    opisaniya: obj.opisaniya,
                    rieltor: obj.rieltor,
                    xodim: obj.xodim,
                    sheetType: obj.sheetType || 'Sotuv',
                    rasmlar: obj.rasmlar,
                    sana: obj.sana || obj.createdAt
                });

                migratedCount++;

                if (migratedCount % 10 === 0) {
                    console.log(`  📊 ${migratedCount}/${objects.length} migrate qilindi...`);
                }

            } catch (error) {
                console.error(`❌ Obyekt xato:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Objects migratsiyasi tugadi: ${migratedCount} ta`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Objects migratsiya xato:', error.message);
    }
}

async function runMigration() {
    console.log('\n🚀 MIGRATSIYA BOSHLANDI');
    console.log('='.repeat(60));
    console.log('JSON fayllardan PostgreSQL ga migratsiya');
    console.log('='.repeat(60));

    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }

        // Migrate in order
        await migrateUsers();
        await migrateSessions();
        await migrateLogs();
        await migrateObjects();

        console.log('\n' + '='.repeat(60));
        console.log('✅✅✅ MIGRATSIYA MUVAFFAQIYATLI TUGADI');
        console.log('='.repeat(60));

        // Show statistics
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const sessionCount = await pool.query('SELECT COUNT(*) FROM sessions');
        const logCount = await pool.query('SELECT COUNT(*) FROM activity_logs');
        const objectCount = await pool.query('SELECT COUNT(*) FROM objects');

        console.log('\n📊 DATABASE STATISTIKASI:');
        console.log('  Users:', userCount.rows[0].count);
        console.log('  Sessions:', sessionCount.rows[0].count);
        console.log('  Logs:', logCount.rows[0].count);
        console.log('  Objects:', objectCount.rows[0].count);

    } catch (error) {
        console.error('\n❌ MIGRATSIYA XATO:', error.message);
        throw error;
    } finally {
        await pool.end();
        console.log('\n🔌 Database connection yopildi');
    }
}

// Run if called directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { runMigration };