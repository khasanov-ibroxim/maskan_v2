// server/src/models/Setting.pg.js - Simple Version

const { query } = require('../config/database');

class Setting {
    /**
     * Get all settings
     */
    static async getAll() {
        const result = await query(
            `SELECT * FROM app_settings WHERE is_active = true ORDER BY category, display_order`
        );
        return result.rows;
    }

    /**
     * Get settings by category
     */
    static async getByCategory(category) {
        const result = await query(
            `SELECT * FROM app_settings WHERE category = $1 AND is_active = true ORDER BY display_order`,
            [category]
        );
        return result.rows;
    }

    /**
     * Get global config
     */
    static async getGlobalConfig() {
        const result = await query(
            `SELECT value_uz FROM app_settings 
             WHERE category = 'global_config' AND is_active = true`
        );

        const config = {
            telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
            glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
            company_phone: '+998970850604',
            default_telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '-1003298985470'
        };

        result.rows.forEach(row => {
            const value = row.value_uz;
            if (value && value.includes(':')) {
                const [key, val] = value.split(':').map(s => s.trim());
                if (key && val) {
                    config[key] = val;
                }
            }
        });

        return config;
    }

    /**
     * Create setting
     */
    static async create(data) {
        const result = await query(
            `INSERT INTO app_settings (category, value_uz, display_order, parent_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [data.category, data.value, data.displayOrder || 0, data.parentId || null]
        );
        return result.rows[0];
    }

    /**
     * Update setting
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.value !== undefined) {
            fields.push(`value_uz = $${paramCount++}`);
            values.push(updates.value);
        }
        if (updates.displayOrder !== undefined) {
            fields.push(`display_order = $${paramCount++}`);
            values.push(updates.displayOrder);
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE app_settings SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    /**
     * Delete setting
     */
    static async delete(id) {
        await query('UPDATE app_settings SET is_active = false WHERE id = $1', [id]);
        return true;
    }

    /**
     * Update global config
     */
    static async updateGlobalConfig(updates) {
        // Implementation depends on your structure
        return updates;
    }
}

module.exports = Setting;