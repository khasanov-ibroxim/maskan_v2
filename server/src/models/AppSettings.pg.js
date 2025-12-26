// server/src/models/AppSettings.pg.js - ✅ FIXED: Proper error handling
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
     * ✅ FIXED: Get global config with proper error handling
     */
    static async getGlobalConfig() {
        try {
            const result = await query(
                `SELECT value FROM app_settings 
                 WHERE category = 'global_config' AND is_active = true
                 ORDER BY display_order ASC`
            );

            console.log('\n🔍 GLOBAL CONFIG DATABASE:');
            console.log('  Query result rows:', result.rows.length);

            if (result.rows.length === 0) {
                console.log('  ⚠️ global_config yo\'q - default yaratilmoqda...');

                // ✅ Create default config
                await this.createDefaultGlobalConfig();

                // ✅ Retry reading
                const retryResult = await query(
                    `SELECT value FROM app_settings 
                     WHERE category = 'global_config' AND is_active = true
                     ORDER BY display_order ASC`
                );

                result.rows = retryResult.rows;
            }

            const config = {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604'
            };

            // ✅ Parse values with error handling
            result.rows.forEach(row => {
                try {
                    const value = row.value;

                    if (!value || typeof value !== 'string') {
                        console.log(`  ⚠️ Invalid value format:`, value);
                        return;
                    }

                    // ✅ Check if value contains ":"
                    if (!value.includes(':')) {
                        console.log(`  ⚠️ Value missing colon separator:`, value);
                        return;
                    }

                    // ✅ Split only at first ":"
                    const colonIndex = value.indexOf(':');
                    const key = value.substring(0, colonIndex).trim();
                    const val = value.substring(colonIndex + 1).trim();

                    if (key && val) {
                        config[key] = val;
                        console.log(`  ✅ ${key}: ${val.substring(0, 30)}...`);
                    } else {
                        console.log(`  ⚠️ Empty key or value after split:`, value);
                    }
                } catch (parseError) {
                    console.error(`  ❌ Parse error for row:`, row.value);
                    console.error(`     Error:`, parseError.message);
                }
            });

            console.log('\n  📊 Final config keys:', Object.keys(config));
            console.log('='.repeat(60) + '\n');

            return config;

        } catch (error) {
            console.error('❌ getGlobalConfig error:', error.message);

            // ✅ Return defaults on error
            return {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604'
            };
        }
    }

    /**
     * ✅ NEW: Create default global config
     */
    static async createDefaultGlobalConfig() {
        try {
            console.log('  📝 Creating default global config...');

            const defaults = [
                { key: 'telegram_bot_token', value: process.env.TELEGRAM_TOKEN || '', order: 0 },
                { key: 'glavniy_app_script_url', value: process.env.HERO_APP_SCRIPT || '', order: 1 },
                { key: 'company_phone', value: '+998970850604', order: 2 }
            ];

            for (const item of defaults) {
                const fullValue = `${item.key}:${item.value}`;

                await query(
                    `INSERT INTO app_settings (category, value, display_order, is_active)
                     VALUES ('global_config', $1, $2, true)
                     ON CONFLICT (category, value) DO UPDATE
                     SET is_active = true, display_order = $2`,
                    [fullValue, item.order]
                );

                console.log(`    ✅ Created: ${item.key}`);
            }

            console.log('  ✅ Default config created');
            return true;

        } catch (error) {
            console.error('  ❌ Create default config error:', error.message);
            return false;
        }
    }

    /**
     * ✅ FIXED: Update global config item with validation
     */
    static async updateGlobalConfig(key, value) {
        try {
            console.log('\n📝 UPDATE GLOBAL CONFIG:');
            console.log('  Key:', key);
            console.log('  Value:', value ? value.substring(0, 30) + '...' : 'NULL');

            if (!key || value === undefined || value === null) {
                throw new Error('Key va value majburiy');
            }

            // ✅ Create full value string
            const fullValue = `${key}:${value}`;
            console.log('  Full value:', fullValue.substring(0, 50) + '...');

            // ✅ Check if exists
            const existingResult = await query(
                `SELECT id FROM app_settings 
                 WHERE category = 'global_config' 
                 AND value LIKE $1`,
                [`${key}:%`]
            );

            if (existingResult.rows.length > 0) {
                // ✅ Update existing
                const result = await query(
                    `UPDATE app_settings 
                     SET value = $1
                     WHERE category = 'global_config' 
                     AND value LIKE $2
                     RETURNING *`,
                    [fullValue, `${key}:%`]
                );

                console.log('  ✅ Updated existing row');
                return result.rows[0];
            } else {
                // ✅ Insert new
                const result = await query(
                    `INSERT INTO app_settings (category, value, display_order, is_active)
                     VALUES ('global_config', $1, 
                         (SELECT COALESCE(MAX(display_order), 0) + 1 
                          FROM app_settings 
                          WHERE category = 'global_config'),
                         true)
                     RETURNING *`,
                    [fullValue]
                );

                console.log('  ✅ Inserted new row');
                return result.rows[0];
            }

        } catch (error) {
            console.error('❌ updateGlobalConfig error:', error.message);
            throw error;
        }
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