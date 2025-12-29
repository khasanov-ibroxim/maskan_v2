// server/src/models/User.pg.js - ✅ FIXED: Full Telegram Chat ID support

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
    static async getSessions() {
        const result = await query(
            'SELECT * FROM sessions ORDER BY login_time DESC'
        );
        return result.rows;
    }

    static async getLogs(filters = {}) {
        let sql = 'SELECT * FROM activity_logs WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.userId) {
            sql += ` AND user_id = $${paramCount++}`;
            params.push(filters.userId);
        }
        if (filters.action) {
            sql += ` AND action = $${paramCount++}`;
            params.push(filters.action);
        }

        sql += ' ORDER BY timestamp DESC';

        if (filters.limit) {
            sql += ` LIMIT $${paramCount}`;
            params.push(filters.limit);
        }

        const result = await query(sql, params);
        return result.rows;
    }

    static async getAll() {
        const result = await query(
            `SELECT id, username, full_name, role, is_active,
                    app_script_url, telegram_chat_id, telegram_theme_id, phone, created_at
             FROM users
             ORDER BY created_at DESC`
        );
        return result.rows;
    }

    static async findByUsername(username) {
        const result = await query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        return result.rows[0] || null;
    }

    static async findById(id) {
        const result = await query(
            `SELECT id, username, full_name, role, is_active,
                    app_script_url, telegram_chat_id, telegram_theme_id, phone, created_at
             FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * ✅ FIXED: Create user with telegramChatId
     */
    static async create(userData) {
        const {
            username, password, fullName, role = 'user',
            appScriptUrl, telegramChatId, telegramThemeId, phone
        } = userData;

        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('\n📝 USER CREATE:');
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Telegram Chat ID:', telegramChatId || 'NULL');
        console.log('  Telegram Theme ID:', telegramThemeId || 'NULL');

        const result = await query(
            `INSERT INTO users (
                username, password, full_name, role,
                app_script_url, telegram_chat_id, telegram_theme_id, phone, 
                is_active
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
             RETURNING id, username, full_name, role, is_active,
                 app_script_url, telegram_chat_id, telegram_theme_id, phone, 
                 created_at`,
            [
                username,
                hashedPassword,
                fullName,
                role,
                appScriptUrl || null,
                telegramChatId || null,  // ✅ Can be null
                telegramThemeId || null,
                phone || null
            ]
        );

        console.log('  ✅ User yaratildi');
        return result.rows[0];
    }

    /**
     * ✅ FIXED: Update user with telegramChatId
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        console.log('\n📝 USER UPDATE:');
        console.log('  ID:', id);
        console.log('  Updates:', Object.keys(updates));

        if (updates.username) {
            fields.push(`username = $${paramCount++}`);
            values.push(updates.username);
        }
        if (updates.password) {
            const hashedPassword = await bcrypt.hash(updates.password, 10);
            fields.push(`password = $${paramCount++}`);
            values.push(hashedPassword);
        }
        if (updates.fullName) {
            fields.push(`full_name = $${paramCount++}`);
            values.push(updates.fullName);
        }
        if (updates.role) {
            fields.push(`role = $${paramCount++}`);
            values.push(updates.role);
        }
        if (updates.appScriptUrl !== undefined) {
            fields.push(`app_script_url = $${paramCount++}`);
            values.push(updates.appScriptUrl);
        }

        // ✅ CRITICAL: Handle telegramChatId updates
        if (updates.telegramChatId !== undefined) {
            fields.push(`telegram_chat_id = $${paramCount++}`);
            values.push(updates.telegramChatId);
            console.log('  💬 Telegram Chat ID yangilanmoqda:', updates.telegramChatId || 'NULL');
        }

        if (updates.telegramThemeId !== undefined) {
            fields.push(`telegram_theme_id = $${paramCount++}`);
            values.push(updates.telegramThemeId);
        }

        // ✅ CRITICAL: Handle phone updates
        if (updates.phone !== undefined) {
            fields.push(`phone = $${paramCount++}`);
            values.push(updates.phone);
            console.log('  📱 Phone yangilanmoqda:', updates.phone || 'NULL');
        }

        if (updates.isActive !== undefined) {
            fields.push(`is_active = $${paramCount++}`);
            values.push(updates.isActive);
        }

        if (fields.length === 0) {
            console.log('  ⚠️ Yangilanish yo\'q');
            return null;
        }

        values.push(id);
        const result = await query(
            `UPDATE users
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramCount}
             RETURNING id, username, full_name, role, is_active, 
                       app_script_url, telegram_chat_id, telegram_theme_id, phone, created_at`,
            values
        );

        if (result.rows[0]) {
            console.log('  ✅ User yangilandi');
            if (updates.phone !== undefined) {
                console.log('  📱 Phone:', result.rows[0].phone || 'NULL');
            }
            if (updates.telegramChatId !== undefined) {
                console.log('  💬 Telegram Chat ID:', result.rows[0].telegram_chat_id || 'NULL');
            }
        }

        return result.rows[0] || null;
    }

    static async delete(id) {
        await query('DELETE FROM users WHERE id = $1', [id]);
        return true;
    }

    static async comparePassword(plainPassword, hashedPassword) {
        if (!hashedPassword || !plainPassword) return false;
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            console.error('❌ Password compare error:', error.message);
            return false;
        }
    }

    /**
     * ✅ FIXED: Get realtors with telegram_chat_id_value JOIN
     */
    static async getRealtors() {
        const result = await query(
            `SELECT
                 u.id, u.username, u.full_name, u.role, u.is_active,
                 u.app_script_url, u.telegram_theme_id, u.phone,
                 u.telegram_chat_id,
                 tc.chat_id as telegram_chat_id_value,
                 tc.chat_name as telegram_chat_name
             FROM users u
                      LEFT JOIN telegram_chats tc ON u.telegram_chat_id = tc.id
             WHERE (u.role = 'rieltor' OR u.role = 'individual_rieltor')
               AND u.is_active = true
             ORDER BY u.full_name`
        );

        console.log('\n📊 GET REALTORS RESULT:');
        result.rows.forEach(r => {
            console.log(`  - ${r.username}:`);
            console.log(`    telegram_chat_id (FK): ${r.telegram_chat_id || 'NULL'}`);
            console.log(`    telegram_chat_id_value: ${r.telegram_chat_id_value || 'NULL'}`);
            console.log(`    telegram_chat_name: ${r.telegram_chat_name || 'NULL'}`);
        });

        return result.rows;
    }

    static async getStats() {
        const result = await query(
            `SELECT
                 COUNT(*) FILTER (WHERE is_active = true) as active_users,
                 COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
                 COUNT(*) FILTER (WHERE role = 'admin') as admins,
                 COUNT(*) FILTER (WHERE role = 'rieltor') as rieltors,
                 COUNT(*) FILTER (WHERE role = 'individual_rieltor') as individual_rieltors,
                 COUNT(*) FILTER (WHERE role = 'individual_rieltor' AND phone IS NOT NULL) as individual_with_phone,
                 COUNT(*) FILTER (WHERE telegram_chat_id IS NOT NULL) as users_with_custom_chat,
                 COUNT(*) FILTER (WHERE role = 'user') as regular_users
             FROM users`
        );
        return result.rows[0];
    }
}

module.exports = User;