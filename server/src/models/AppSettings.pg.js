// server/src/models/AppSettings.pg.js
const { query } = require('../config/database');

class AppSettings {
    /**
     * Get all settings by category
     */
    static async getByCategory(category) {
        const result = await query(
            `SELECT id, category, value, display_order, is_active 
             FROM app_settings 
             WHERE category = $1 AND is_active = true
             ORDER BY display_order ASC, value ASC`,
            [category]
        );
        return result.rows;
    }

    /**
     * Get all categories with their values
     */
    static async getAll() {
        const result = await query(
            `SELECT category, value, display_order, is_active, id
             FROM app_settings 
             WHERE is_active = true
             ORDER BY category, display_order ASC`
        );

        // Group by category
        const grouped = {};
        result.rows.forEach(row => {
            if (!grouped[row.category]) {
                grouped[row.category] = [];
            }
            grouped[row.category].push({
                id: row.id,
                value: row.value,
                display_order: row.display_order
            });
        });

        return grouped;
    }

    /**
     * Create new setting
     */
    static async create(category, value, displayOrder = 0) {
        const result = await query(
            `INSERT INTO app_settings (category, value, display_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (category, value) DO UPDATE
             SET display_order = $3, is_active = true
             RETURNING *`,
            [category, value, displayOrder]
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
            fields.push(`value = $${paramCount++}`);
            values.push(updates.value);
        }
        if (updates.displayOrder !== undefined) {
            fields.push(`display_order = $${paramCount++}`);
            values.push(updates.displayOrder);
        }
        if (updates.isActive !== undefined) {
            fields.push(`is_active = $${paramCount++}`);
            values.push(updates.isActive);
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE app_settings 
             SET ${fields.join(', ')} 
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );
        return result.rows[0];
    }

    /**
     * Delete setting (soft delete)
     */
    static async delete(id) {
        await query(
            'UPDATE app_settings SET is_active = false WHERE id = $1',
            [id]
        );
        return true;
    }

    /**
     * Get global config (telegram_bot_token, glavniy_app_script_url, company_phone)
     */
    static async getGlobalConfig() {
        const result = await query(
            `SELECT value FROM app_settings 
         WHERE category = 'global_config' AND is_active = true
         ORDER BY display_order ASC`
        );

        const config = {};
        result.rows.forEach(row => {
            // Parse "key:value" format
            const [key, ...valueParts] = row.value.split(':');
            config[key] = valueParts.join(':'); // Handle URLs with ":"
        });

        return config;
    }

    /**
     * Update global config item
     */
    static async updateGlobalConfig(key, value) {
        const result = await query(
            `UPDATE app_settings 
         SET value = $1
         WHERE category = 'global_config' 
         AND value LIKE $2
         RETURNING *`,
            [`${key}:${value}`, `${key}:%`]
        );
        return result.rows[0];
    }

    /**
     * Reorder settings in category
     */
    static async reorder(category, orderedIds) {
        for (let i = 0; i < orderedIds.length; i++) {
            await query(
                'UPDATE app_settings SET display_order = $1 WHERE id = $2',
                [i, orderedIds[i]]
            );
        }
        return true;
    }
}

module.exports = AppSettings;