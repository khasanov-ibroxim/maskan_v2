// server/src/models/AppSettings.pg.js - ✅ FULLY FIXED
const { query } = require('../config/database');

class AppSettings {
    /**
     * ✅ Get cascader data with translations
     */
    static async getCascaderData(lang = 'uz') {
        try {
            console.log('\n📊 GET CASCADER DATA');
            console.log('='.repeat(60));

            const result = await query(
                `SELECT 
                    id, 
                    value_uz,
                    value_ru,
                    value_en,
                    value_uz_cy,
                    display_order, 
                    parent_id,
                    category
                 FROM app_settings
                 WHERE category = 'kvartil' 
                   AND is_active = true
                 ORDER BY display_order ASC, value_uz ASC`
            );

            console.log(`  📊 Query result: ${result.rows.length} rows`);

            if (!result.rows || result.rows.length === 0) {
                console.log('  ⚠️ QUERY BO\'SH - database\'da ma\'lumot yo\'q!');
                return [];
            }

            const tumans = result.rows.filter(row => !row.parent_id);
            const kvartils = result.rows.filter(row => row.parent_id);

            console.log(`  🏙️ Tumanlar: ${tumans.length}`);
            console.log(`  📍 Kvartillar: ${kvartils.length}`);

            const cascaderData = tumans.map(tuman => {
                const children = kvartils
                    .filter(kv => kv.parent_id === tuman.id)
                    .map(kv => ({
                        value: kv.value_uz,
                        label: kv.value_uz,
                        id: kv.id,
                        display_order: kv.display_order,
                        translations: {
                            uz: kv.value_uz,
                            ru: kv.value_ru,
                            en: kv.value_en,
                            uz_cy: kv.value_uz_cy
                        }
                    }));

                return {
                    value: tuman.value_uz,
                    label: tuman.value_uz,
                    id: tuman.id,
                    display_order: tuman.display_order,
                    translations: {
                        uz: tuman.value_uz,
                        ru: tuman.value_ru,
                        en: tuman.value_en,
                        uz_cy: tuman.value_uz_cy
                    },
                    children: children.length > 0 ? children : undefined
                };
            });

            console.log(`  ✅ Result: ${cascaderData.length} tumanlar`);
            console.log('='.repeat(60));

            return cascaderData;

        } catch (error) {
            console.error('❌ getCascaderData error:', error.message);
            return [];
        }
    }

    /**
     * ✅ FIXED: Get global config with proper fallback
     */
    static async getGlobalConfig() {
        try {
            console.log('\n📊 GET GLOBAL CONFIG');
            console.log('='.repeat(60));

            const result = await query(
                `SELECT value_uz 
                 FROM app_settings
                 WHERE category = 'global_config' 
                   AND is_active = true
                 ORDER BY display_order ASC`
            );

            console.log(`  📊 Query result: ${result.rows.length} rows`);

            // Default values from env or hardcoded
            const config = {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604',
                default_telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '-1003298985470'
            };

            // Parse database values
            result.rows.forEach(row => {
                const value = row.value_uz;

                if (value && typeof value === 'string' && value.includes(':')) {
                    const colonIndex = value.indexOf(':');
                    const key = value.substring(0, colonIndex).trim();
                    const val = value.substring(colonIndex + 1).trim();

                    if (key && val) {
                        config[key] = val;
                        console.log(`  ✅ ${key}: ${val.substring(0, 30)}...`);
                    }
                }
            });

            console.log('\n  📋 FINAL CONFIG:');
            console.log('    telegram_bot_token:', config.telegram_bot_token ? 'SET' : 'MISSING');
            console.log('    glavniy_app_script_url:', config.glavniy_app_script_url ? 'SET' : 'MISSING');
            console.log('    company_phone:', config.company_phone);
            console.log('    default_telegram_chat_id:', config.default_telegram_chat_id);
            console.log('='.repeat(60));

            return config;

        } catch (error) {
            console.error('❌ getGlobalConfig error:', error.message);

            // Return safe defaults
            return {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604',
                default_telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '-1003298985470'
            };
        }
    }

    /**
     * ✅ Update global config value
     */
    static async updateGlobalConfig(key, value) {
        try {
            console.log(`\n📝 UPDATE GLOBAL CONFIG: ${key}`);

            const formattedValue = `${key}: ${value}`;

            // Check if exists
            const existing = await query(
                `SELECT id FROM app_settings 
                 WHERE category = 'global_config' 
                   AND value_uz LIKE $1 || '%'`,
                [key]
            );

            if (existing.rows.length > 0) {
                // Update existing
                await query(
                    `UPDATE app_settings 
                     SET value_uz = $1, 
                         value = $1,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2`,
                    [formattedValue, existing.rows[0].id]
                );
                console.log(`  ✅ Updated: ${key}`);
            } else {
                // Insert new
                await query(
                    `INSERT INTO app_settings (category, value, value_uz)
                     VALUES ('global_config', $1, $1)`,
                    [formattedValue]
                );
                console.log(`  ✅ Inserted: ${key}`);
            }

            return true;

        } catch (error) {
            console.error(`❌ updateGlobalConfig error (${key}):`, error.message);
            throw error;
        }
    }

    /**
     * Get all settings
     */
    static async getAll(lang = 'uz') {
        const result = await query(
            `SELECT 
                category, 
                value_uz,
                value_ru,
                value_en,
                value_uz_cy,
                display_order, 
                is_active, 
                id, 
                parent_id
             FROM app_settings
             WHERE is_active = true
             ORDER BY category, display_order ASC`
        );

        const grouped = {};
        result.rows.forEach(row => {
            if (!grouped[row.category]) {
                grouped[row.category] = [];
            }
            grouped[row.category].push({
                id: row.id,
                value: row.value_uz,
                display_order: row.display_order,
                parent_id: row.parent_id,
                translations: {
                    uz: row.value_uz,
                    ru: row.value_ru,
                    en: row.value_en,
                    uz_cy: row.value_uz_cy
                }
            });
        });

        return grouped;
    }

    /**
     * Get by category
     */
    static async getByCategory(category, lang = 'uz') {
        const result = await query(
            `SELECT 
                id, 
                category, 
                value_uz,
                value_ru,
                value_en,
                value_uz_cy,
                display_order, 
                is_active, 
                parent_id
             FROM app_settings
             WHERE category = $1 AND is_active = true
             ORDER BY display_order ASC, value_uz ASC`,
            [category]
        );

        return result.rows.map(row => ({
            id: row.id,
            value: row.value_uz,
            display_order: row.display_order,
            parent_id: row.parent_id,
            translations: {
                uz: row.value_uz,
                ru: row.value_ru,
                en: row.value_en,
                uz_cy: row.value_uz_cy
            }
        }));
    }

    /**
     * Create setting
     */
    static async create(category, translations, displayOrder = 0, parentId = null) {
        if (category === 'tuman') {
            category = 'kvartil';
        }

        const valueForLegacyColumn = translations.uz || '';

        const result = await query(
            `INSERT INTO app_settings (
                category, value, value_uz, value_ru, value_en, value_uz_cy, 
                display_order, parent_id
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                category,
                valueForLegacyColumn,
                translations.uz || '',
                translations.ru || '',
                translations.en || '',
                translations.uz_cy || '',
                displayOrder,
                parentId
            ]
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

        if (updates.value_uz !== undefined) {
            fields.push(`value_uz = $${paramCount++}`);
            fields.push(`value = $${paramCount++}`);
            values.push(updates.value_uz || '');
            values.push(updates.value_uz || '');
        }

        if (updates.value_ru !== undefined) {
            fields.push(`value_ru = $${paramCount++}`);
            values.push(updates.value_ru || '');
        }

        if (updates.value_en !== undefined) {
            fields.push(`value_en = $${paramCount++}`);
            values.push(updates.value_en || '');
        }

        if (updates.value_uz_cy !== undefined) {
            fields.push(`value_uz_cy = $${paramCount++}`);
            values.push(updates.value_uz_cy || '');
        }

        if (updates.displayOrder !== undefined) {
            fields.push(`display_order = $${paramCount++}`);
            values.push(updates.displayOrder);
        }

        if (updates.parentId !== undefined) {
            fields.push(`parent_id = $${paramCount++}`);
            values.push(updates.parentId);
        }

        if (fields.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE app_settings
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        return result.rows[0];
    }

    /**
     * Delete setting
     */
    static async delete(id) {
        await query(
            'UPDATE app_settings SET is_active = false WHERE id = $1',
            [id]
        );
        return true;
    }
}

module.exports = AppSettings;