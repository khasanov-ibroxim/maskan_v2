// server/src/models/Object.pg.js - CRITICAL FIXES
const { query } = require('../config/database');

class PropertyObject {
    /**
     * ✅ FIXED: Save obyekt (unique_id konfliktini hal qilish)
     */
    static async save(objectData) {
        try {
            // ✅ CRITICAL FIX: Timestamp qo'shish unique_id ga
            const timestamp = Date.now();
            const uniqueId = `${objectData.kvartil}_${objectData.xet}_${objectData.tell}_${timestamp}`.replace(/\s+/g, '');

            console.log('\n💾 PostgreSQL ga saqlash...');
            console.log('  Unique ID:', uniqueId);
            console.log('  Kvartil:', objectData.kvartil);
            console.log('  XET:', objectData.xet);
            console.log('  Telefon:', objectData.tell);

            // ✅ Check: Bunday unique_id mavjudmi?
            const existing = await query(
                'SELECT id, elon_status FROM objects WHERE unique_id = $1',
                [uniqueId]
            );

            if (existing.rows.length > 0) {
                console.log('⚠️ Bunday unique_id allaqachon mavjud (bu juda kamdan-kam holat)');
                console.log('   Mavjud ID:', existing.rows[0].id);

                // Update qilish (agar kerak bo'lsa)
                const result = await query(
                    `UPDATE objects
                     SET sana       = $1,
                         m2         = $2,
                         narx       = $3,
                         fio        = $4,
                         uy_turi    = $5,
                         xolati     = $6,
                         planirovka = $7,
                         balkon     = $8,
                         torets     = $9,
                         dom        = $10,
                         kvartira   = $11,
                         osmotir    = $12,
                         opisaniya  = $13,
                         rieltor    = $14,
                         xodim      = $15,
                         sheet_type = $16,
                         rasmlar    = $17,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE unique_id = $18
                     RETURNING *`,
                    [
                        objectData.sana, objectData.m2, objectData.narx, objectData.fio,
                        objectData.uy_turi, objectData.xolati, objectData.planirovka,
                        objectData.balkon, objectData.torets, objectData.dom, objectData.kvartira,
                        objectData.osmotir, objectData.opisaniya, objectData.rieltor,
                        objectData.xodim, objectData.sheetType || 'Sotuv', objectData.rasmlar,
                        uniqueId
                    ]
                );

                console.log('✅ Obyekt yangilandi:', uniqueId);
                return result.rows[0];
            }

            // ✅ INSERT yangi obyekt
            const result = await query(
                `INSERT INTO objects (
                    unique_id, sana, kvartil, xet, tell, m2, narx, fio, 
                    uy_turi, xolati, planirovka, balkon, torets, dom, 
                    kvartira, osmotir, opisaniya, rieltor, xodim, 
                    sheet_type, rasmlar,elon_status,phone_for_ad
                 )
                 VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,$22, 'waiting'
                 )
                 RETURNING *`,
                [
                    uniqueId, objectData.sana, objectData.kvartil, objectData.xet,
                    objectData.tell, objectData.m2, objectData.narx, objectData.fio,
                    objectData.uy_turi, objectData.xolati, objectData.planirovka,
                    objectData.balkon, objectData.torets, objectData.dom, objectData.kvartira,
                    objectData.osmotir, objectData.opisaniya, objectData.rieltor,
                    objectData.xodim, objectData.sheetType || 'Sotuv', objectData.rasmlar , objectData.phoneForAd
                ]
            );

            console.log('✅ YANGI obyekt yaratildi!');
            console.log('   ID:', result.rows[0].id);
            console.log('   Unique ID:', result.rows[0].unique_id);
            console.log('   Status:', result.rows[0].elon_status);
            console.log('   Created:', result.rows[0].created_at);

            return result.rows[0];

        } catch (error) {
            console.error('❌ SAVE XATO:', error.message);
            console.error('   Stack:', error.stack);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Update with proper validation
     */
    static async update(id, updates) {
        try {
            // UUID validation
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                throw new Error(`Noto'g'ri UUID format: ${id}`);
            }

            const fields = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(updates)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }

            if (fields.length === 0) {
                throw new Error('Hech qanday yangilanish yo\'q');
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id);

            const sql = `
                UPDATE objects
                SET ${fields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            console.log('📝 UPDATE:', { id, updates: Object.keys(updates) });

            const result = await query(sql, values);

            if (result.rows.length === 0) {
                throw new Error(`Obyekt topilmadi: ${id}`);
            }

            console.log('✅ Obyekt yangilandi:', id);
            return result.rows[0];

        } catch (error) {
            console.error('❌ Update xato:', error.message);
            throw error;
        }
    }

    /**
     * ✅ Get all objects
     */
    static async getAll(filters = {}) {
        let sql = 'SELECT * FROM objects WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.kvartil) {
            sql += ` AND kvartil = $${paramCount++}`;
            params.push(filters.kvartil);
        }

        if (filters.rieltor) {
            sql += ` AND rieltor = $${paramCount++}`;
            params.push(filters.rieltor);
        }

        if (filters.elonStatus) {
            sql += ` AND elon_status = $${paramCount++}`;
            params.push(filters.elonStatus);
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await query(sql, params);
        console.log(`📊 Topildi: ${result.rows.length} ta obyekt`);
        return result.rows;
    }

    /**
     * ✅ Get by ID
     */
    static async getById(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            console.error('❌ Noto\'g\'ri UUID:', id);
            return null;
        }

        const result = await query('SELECT * FROM objects WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * ✅ Set processing
     */
    static async setProcessing(id) {
        try {
            const result = await this.update(id, { elon_status: 'processing' });
            console.log(`✅ Status: waiting → processing (${id})`);
            return result;
        } catch (error) {
            console.error('❌ setProcessing xato:', error.message);
            throw error;
        }
    }

    /**
     * ✅ Set posted
     */
    static async setPosted(id, adUrl) {
        try {
            const updates = {
                elon_status: 'posted',
                elon_date: new Date()
            };

            const result = await this.update(id, updates);
            console.log(`✅ Status: processing → posted (${id})`);
            if (adUrl) console.log(`   URL: ${adUrl}`);
            return result;
        } catch (error) {
            console.error('❌ setPosted xato:', error.message);
            throw error;
        }
    }

    /**
     * ✅ Set error
     */
    static async setError(id, errorMessage) {
        try {
            const result = await this.update(id, { elon_status: 'error' });
            console.log(`⚠️ Status: processing → error (${id})`);
            if (errorMessage) console.log(`   Error: ${errorMessage}`);
            return result;
        } catch (error) {
            console.error('❌ setError xato:', error.message);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE elon_status = 'waiting') as waiting,
                COUNT(*) FILTER (WHERE elon_status = 'processing') as processing,
                COUNT(*) FILTER (WHERE elon_status = 'posted') as posted,
                COUNT(*) FILTER (WHERE elon_status = 'error') as error,
                COUNT(DISTINCT kvartil) as unique_kvartils,
                COUNT(DISTINCT rieltor) as unique_rieltors,
                COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as added_24h
            FROM objects
        `);
        return result.rows[0];
    }

    /**
     * Delete object
     */
    static async delete(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new Error(`Noto'g'ri UUID: ${id}`);
        }

        await query('DELETE FROM objects WHERE id = $1', [id]);
        console.log(`🗑️ Obyekt o'chirildi: ${id}`);
        return true;
    }

    /**
     * Get by kvartil
     */
    static async getByKvartil() {
        const result = await query(`
            SELECT
                kvartil,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE elon_status = 'posted') as posted_count
            FROM objects
            GROUP BY kvartil
            ORDER BY count DESC
        `);
        return result.rows;
    }

    /**
     * Search objects
     */
    static async search(searchTerm) {
        const result = await query(`
            SELECT * FROM objects
            WHERE
                kvartil ILIKE $1 OR
                xet ILIKE $1 OR
                tell ILIKE $1 OR
                fio ILIKE $1 OR
                rieltor ILIKE $1 OR
                opisaniya ILIKE $1
            ORDER BY created_at DESC
            LIMIT 100
        `, [`%${searchTerm}%`]);
        return result.rows;
    }
}

module.exports = PropertyObject;