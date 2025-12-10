// server/src/models/User.pg.js - FIXED
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
    /**
     * Get all users (without password)
     */
    static async getAll() {
        const result = await query(
            'SELECT id, username, full_name, role, is_active, app_script_url, telegram_theme_id, created_at FROM users ORDER BY created_at DESC'
        );
        return result.rows;
    }

    /**
     * Find user by username (WITH PASSWORD for login)
     */
    static async findByUsername(username) {
        const result = await query(
            'SELECT * FROM users WHERE username = $1', // ✅ SELECT * to include password
            [username]
        );
        return result.rows[0] || null;
    }

    /**
     * Find user by ID (without password)
     */
    static async findById(id) {
        const result = await query(
            'SELECT id, username, full_name, role, is_active, app_script_url, telegram_theme_id, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create new user
     */
    static async create(userData) {
        const { username, password, fullName, role = 'user', appScriptUrl, telegramThemeId } = userData;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (username, password, full_name, role, app_script_url, telegram_theme_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
                 RETURNING id, username, full_name, role, is_active, app_script_url, telegram_theme_id, created_at`,
            [username, hashedPassword, fullName, role, appScriptUrl || null, telegramThemeId || null]
        );

        return result.rows[0];
    }

    /**
     * Update user
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

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
        if (updates.telegramThemeId !== undefined) {
            fields.push(`telegram_theme_id = $${paramCount++}`);
            values.push(updates.telegramThemeId);
        }
        if (updates.isActive !== undefined) {
            fields.push(`is_active = $${paramCount++}`);
            values.push(updates.isActive);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await query(
            `UPDATE users
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramCount}
                 RETURNING id, username, full_name, role, is_active, app_script_url, telegram_theme_id, created_at`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Delete user
     */
    static async delete(id) {
        await query('DELETE FROM users WHERE id = $1', [id]);
        return true;
    }

    /**
     * Compare password
     */
    static async comparePassword(plainPassword, hashedPassword) {
        // ✅ FIXED: Check if hashedPassword exists
        if (!hashedPassword) {
            console.error('❌ Password hash yo\'q!');
            return false;
        }
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Get realtors only
     */
    static async getRealtors() {
        const result = await query(
            `SELECT id, username, full_name, role, is_active, app_script_url, telegram_theme_id
             FROM users
             WHERE role = 'rieltor' AND is_active = true
             ORDER BY full_name`
        );
        return result.rows;
    }

    /**
     * Get user statistics
     */
    static async getStats() {
        const result = await query(
            `SELECT
                 COUNT(*) FILTER (WHERE is_active = true) as active_users,
                 COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
                 COUNT(*) FILTER (WHERE role = 'admin') as admins,
                 COUNT(*) FILTER (WHERE role = 'rieltor') as rieltors,
                 COUNT(*) FILTER (WHERE role = 'user') as regular_users
             FROM users`
        );
        return result.rows[0];
    }
}

module.exports = User;