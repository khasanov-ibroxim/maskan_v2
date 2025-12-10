// server/src/scripts/seedUsers.js
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const users = [
    {
        username: 'admin',
        password: 'admin123',
        fullName: 'Administrator',
        role: 'admin',
        isActive: true
    },
    {
        username: 'aziz',
        password: 'aziz123',
        fullName: 'Aziz Jumayev',
        role: 'rieltor',
        isActive: true,
        appScriptUrl: 'https://script.google.com/macros/s/AZIZ_SCRIPT/exec',
        telegramThemeId: 100
    },
    {
        username: 'sarvar',
        password: 'sarvar123',
        fullName: 'Sarvar Karimov',
        role: 'rieltor',
        isActive: true,
        appScriptUrl: 'https://script.google.com/macros/s/SARVAR_SCRIPT/exec',
        telegramThemeId: 200
    },
    {
        username: 'jasur',
        password: 'jasur123',
        fullName: 'Jasur Aliyev',
        role: 'rieltor',
        isActive: true,
        appScriptUrl: 'https://script.google.com/macros/s/JASUR_SCRIPT/exec',
        telegramThemeId: 300
    }
];

async function seedUsers() {
    try {
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await pool.query(
                `INSERT INTO users (
                    username, password, full_name, role, is_active, 
                    app_script_url, telegram_theme_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (username) DO UPDATE
                SET password = $2, 
                    full_name = $3,
                    is_active = $5,
                    app_script_url = COALESCE($6, users.app_script_url),
                    telegram_theme_id = COALESCE($7, users.telegram_theme_id)`,
                [
                    user.username,
                    hashedPassword,
                    user.fullName,
                    user.role,
                    user.isActive,
                    user.appScriptUrl || null,
                    user.telegramThemeId || null
                ]
            );

            console.log(`✅ ${user.username} (${user.role})`);
        }

        console.log('\n✅ Barcha userlar yaratildi!');

    } catch (error) {
        console.error('❌ Xato:', error.message);
    } finally {
        await pool.end();
    }
}

seedUsers();