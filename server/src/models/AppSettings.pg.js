// server/src/models/AppSettings.pg.js - ✅ ULTIMATE FIX
const { query } = require('../config/database');

class AppSettings {
    /**
     * ✅ CRITICAL FIX: Cascader data with proper filtering
     */
    static async getCascaderData() {
        try {
            console.log('\n📊 CASCADER DATA (FIXED VERSION)');
            console.log('='.repeat(60));

            // ✅ Get all active kvartil category rows
            const result = await query(
                `SELECT 
                    id, 
                    value, 
                    display_order, 
                    parent_id,
                    category
                 FROM app_settings
                 WHERE category = 'kvartil' 
                   AND is_active = true
                 ORDER BY display_order ASC, value ASC`
            );

            console.log(`📊 Query result: ${result.rows.length} rows`);

            if (!result.rows || result.rows.length === 0) {
                console.log('❌ QUERY BO\'SH!');
                console.log('\n🔍 SABABLARI:');
                console.log('1. Database\'da "kvartil" category yo\'q');
                console.log('2. Barcha qatorlar is_active = false');
                console.log('3. Database connection muammosi');
                console.log('\n💡 YECHIM:');
                console.log('psql -U postgres -d maskanlux');
                console.log('SELECT * FROM app_settings WHERE category = \'kvartil\';');
                console.log('='.repeat(60));
                return [];
            }

            // ✅ Log all rows
            console.log('\n📋 DATABASE QATORLARI:');
            result.rows.forEach((row, i) => {
                const type = row.parent_id ? 'KVARTIL' : 'TUMAN';
                console.log(`  ${i + 1}. "${row.value}" (${type}, ID: ${row.id}, parent: ${row.parent_id || 'NULL'})`);
            });

            // ✅ Separate tumans and kvartils
            const tumans = result.rows.filter(row => !row.parent_id);
            const kvartils = result.rows.filter(row => row.parent_id);

            console.log(`\n🏙️ TUMANLAR: ${tumans.length}`);
            console.log(`📍 KVARTILLAR: ${kvartils.length}`);

            if (tumans.length === 0) {
                console.log('❌ TUMANLAR YO\'Q!');
                console.log('\n💡 Tuman qo\'shish:');
                console.log('INSERT INTO app_settings (category, value, parent_id, is_active)');
                console.log('VALUES (\'kvartil\', \'Yunusobod\', NULL, true);');
                console.log('='.repeat(60));
                return [];
            }

            // ✅ Build cascader structure
            const cascaderData = tumans.map(tuman => {
                const children = kvartils
                    .filter(kv => kv.parent_id === tuman.id)
                    .map(kv => ({
                        value: kv.value,
                        label: kv.value,
                        id: kv.id
                    }));

                console.log(`  🔗 "${tuman.value}" → ${children.length} kvartils`);

                return {
                    value: tuman.value,
                    label: tuman.value,
                    id: tuman.id,
                    children: children.length > 0 ? children : undefined
                };
            });

            console.log(`\n✅ FINAL RESULT: ${cascaderData.length} tumanlar`);
            console.log('='.repeat(60));

            return cascaderData;

        } catch (error) {
            console.error('\n❌ getCascaderData ERROR:');
            console.error('='.repeat(60));
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            console.error('='.repeat(60));
            return [];
        }
    }

    /**
     * Get all settings by category
     */
    static async getByCategory(category) {
        const result = await query(
            `SELECT id, category, value, display_order, is_active, parent_id
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
            `SELECT category, value, display_order, is_active, id, parent_id
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
                value: row.value,
                display_order: row.display_order,
                parent_id: row.parent_id
            });
        });

        return grouped;
    }

    /**
     * ✅ Create new setting (STRICT KVARTIL ENFORCEMENT)
     */
    static async create(category, value, displayOrder = 0, parentId = null) {
        // ✅ Force 'kvartil' category for tuman/kvartil system
        if (category === 'tuman') {
            console.log('⚠️ Category "tuman" → "kvartil" (forced)');
            category = 'kvartil';
        }

        const result = await query(
            `INSERT INTO app_settings (category, value, display_order, parent_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (category, value) DO UPDATE
                 SET display_order = $3, 
                     parent_id = $4,
                     is_active = true
             RETURNING *`,
            [category, value, displayOrder, parentId]
        );

        console.log('✅ Created/Updated:');
        console.log(`  Category: ${result.rows[0].category}`);
        console.log(`  Value: ${result.rows[0].value}`);
        console.log(`  Parent: ${result.rows[0].parent_id || 'NULL (TUMAN)'}`);

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
                `SELECT value FROM app_settings
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
                const value = row.value;
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
     * Update global config item
     */
    static async updateGlobalConfig(key, value) {
        const fullValue = `${key}:${value}`;
        const existingResult = await query(
            `SELECT id FROM app_settings 
             WHERE category = 'global_config' 
             AND value LIKE $1`,
            [`${key}:%`]
        );

        if (existingResult.rows.length > 0) {
            const result = await query(
                `UPDATE app_settings 
                 SET value = $1
                 WHERE category = 'global_config' 
                 AND value LIKE $2
                 RETURNING *`,
                [fullValue, `${key}:%`]
            );
            return result.rows[0];
        } else {
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
            return result.rows[0];
        }
    }
}

module.exports = AppSettings;