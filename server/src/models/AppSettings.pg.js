// server/src/models/AppSettings.pg.js - ✅ MULTILANG VERSION
const { query } = require('../config/database');

class AppSettings {
    /**
     * ✅ Get cascader data with translations
     */
    static async getCascaderData(lang = 'uz') {
        try {
            console.log('\n📊 CASCADER DATA (MULTILANG)');
            console.log('='.repeat(60));
            console.log('  Requested language:', lang);

            const valueColumn = this.getValueColumn(lang);

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
                 ORDER BY display_order ASC, ${valueColumn} ASC`
            );

            console.log(`📊 Query result: ${result.rows.length} rows`);

            if (!result.rows || result.rows.length === 0) {
                console.log('❌ QUERY BO\'SH!');
                return [];
            }

            // Separate tumans and kvartils
            const tumans = result.rows.filter(row => !row.parent_id);
            const kvartils = result.rows.filter(row => row.parent_id);

            console.log(`\n🏙️ TUMANLAR: ${tumans.length}`);
            console.log(`📍 KVARTILLAR: ${kvartils.length}`);

            // Build cascader structure
            const cascaderData = tumans.map(tuman => {
                const tumanValue = tuman[valueColumn] || tuman.value_uz;

                const children = kvartils
                    .filter(kv => kv.parent_id === tuman.id)
                    .map(kv => {
                        const kvValue = kv[valueColumn] || kv.value_uz;
                        return {
                            value: kvValue,
                            label: kvValue,
                            id: kv.id,
                            // Include all translations
                            translations: {
                                uz: kv.value_uz,
                                ru: kv.value_ru,
                                en: kv.value_en,
                                uz_cy: kv.value_uz_cy
                            }
                        };
                    });

                console.log(`  🔗 "${tumanValue}" → ${children.length} kvartils`);

                return {
                    value: tumanValue,
                    label: tumanValue,
                    id: tuman.id,
                    translations: {
                        uz: tuman.value_uz,
                        ru: tuman.value_ru,
                        en: tuman.value_en,
                        uz_cy: tuman.value_uz_cy
                    },
                    children: children.length > 0 ? children : undefined
                };
            });

            console.log(`\n✅ FINAL RESULT: ${cascaderData.length} tumanlar`);
            console.log('='.repeat(60));

            return cascaderData;

        } catch (error) {
            console.error('\n❌ getCascaderData ERROR:', error.message);
            return [];
        }
    }

    /**
     * Get all settings by category with translations
     */
    static async getByCategory(category, lang = 'uz') {
        const valueColumn = this.getValueColumn(lang);

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
             ORDER BY display_order ASC, ${valueColumn} ASC`,
            [category]
        );

        return result.rows.map(row => ({
            id: row.id,
            value: row[valueColumn] || row.value_uz,
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
     * Get all categories with translations
     */
    static async getAll(lang = 'uz') {
        const valueColumn = this.getValueColumn(lang);

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
                value: row[valueColumn] || row.value_uz,
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
     * ✅ Create new setting with translations
     */
    static async create(category, translations, displayOrder = 0, parentId = null) {
        // Force 'kvartil' category for tuman/kvartil system
        if (category === 'tuman') {
            console.log('⚠️ Category "tuman" → "kvartil" (forced)');
            category = 'kvartil';
        }

        console.log('📝 Creating setting with translations:');
        console.log('  uz:', translations.uz);
        console.log('  ru:', translations.ru);
        console.log('  en:', translations.en);
        console.log('  uz_cy:', translations.uz_cy);

        const result = await query(
            `INSERT INTO app_settings (
                category, 
                value_uz, 
                value_ru, 
                value_en, 
                value_uz_cy, 
                display_order, 
                parent_id
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                category,
                translations.uz || translations.value, // Fallback
                translations.ru || translations.value,
                translations.en || translations.value,
                translations.uz_cy || translations.value,
                displayOrder,
                parentId
            ]
        );

        console.log('✅ Created/Updated:');
        console.log(`  Category: ${result.rows[0].category}`);
        console.log(`  Parent: ${result.rows[0].parent_id || 'NULL (TUMAN)'}`);

        return result.rows[0];
    }

    /**
     * Update setting with translations
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.value_uz !== undefined) {
            fields.push(`value_uz = $${paramCount++}`);
            values.push(updates.value_uz);
        }
        if (updates.value_ru !== undefined) {
            fields.push(`value_ru = $${paramCount++}`);
            values.push(updates.value_ru);
        }
        if (updates.value_en !== undefined) {
            fields.push(`value_en = $${paramCount++}`);
            values.push(updates.value_en);
        }
        if (updates.value_uz_cy !== undefined) {
            fields.push(`value_uz_cy = $${paramCount++}`);
            values.push(updates.value_uz_cy);
        }

        if (updates.displayOrder !== undefined) {
            fields.push(`display_order = $${paramCount++}`);
            values.push(updates.displayOrder);
        }
        if (updates.isActive !== undefined) {
            fields.push(`is_active = $${paramCount++}`);
            values.push(updates.isActive);
        }
        if (updates.parentId !== undefined) {
            fields.push(`parent_id = $${paramCount++}`);
            values.push(updates.parentId);
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
     * Get global config
     */
    static async getGlobalConfig() {
        try {
            const result = await query(
                `SELECT value_uz FROM app_settings
                 WHERE category = 'global_config' AND is_active = true
                 ORDER BY display_order ASC`
            );

            const config = {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604',
                default_telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '-1003298985470'
            };

            result.rows.forEach(row => {
                const value = row.value_uz;
                if (value && typeof value === 'string' && value.includes(':')) {
                    const colonIndex = value.indexOf(':');
                    const key = value.substring(0, colonIndex).trim();
                    const val = value.substring(colonIndex + 1).trim();
                    if (key && val) {
                        config[key] = val;
                    }
                }
            });

            return config;
        } catch (error) {
            console.error('❌ getGlobalConfig error:', error.message);
            return {
                telegram_bot_token: process.env.TELEGRAM_TOKEN || '',
                glavniy_app_script_url: process.env.HERO_APP_SCRIPT || '',
                company_phone: '+998970850604',
                default_telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '-1003298985470'
            };
        }
    }

    /**
     * Helper: Get correct column name based on language
     */
    static getValueColumn(lang) {
        const columns = {
            'uz': 'value_uz',
            'ru': 'value_ru',
            'en': 'value_en',
            'uz-cy': 'value_uz_cy',
            'uz_cy': 'value_uz_cy'
        };
        return columns[lang] || 'value_uz';
    }
}

module.exports = AppSettings;