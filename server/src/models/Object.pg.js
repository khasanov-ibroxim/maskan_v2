// server/src/models/Object.pg.js
const { query } = require('../config/database');

class PropertyObject {
    /**
     * Create or update object
     */
    static async save(objectData) {
        const uniqueId = `${objectData.kvartil}_${objectData.xet}_${objectData.tell}`.replace(/\s+/g, '');

        console.log('\n💾 PostgreSQL ga saqlash...');
        console.log('  Unique ID:', uniqueId);
        console.log('  Kvartil:', objectData.kvartil);
        console.log('  XET:', objectData.xet);

        // Check if exists
        const existing = await query(
            'SELECT id, elon_status, elon_date, created_at FROM objects WHERE unique_id = $1',
            [uniqueId]
        );

        if (existing.rows.length > 0) {
            // Update existing
            const result = await query(
                `UPDATE objects SET
                                    sana = $1, kvartil = $2, xet = $3, tell = $4, m2 = $5, narx = $6,
                                    fio = $7, uy_turi = $8, xolati = $9, planirovka = $10, balkon = $11,
                                    torets = $12, dom = $13, kvartira = $14, osmotir = $15, opisaniya = $16,
                                    rieltor = $17, xodim = $18, sheet_type = $19, rasmlar = $20,
                                    updated_at = CURRENT_TIMESTAMP
                 WHERE unique_id = $21
                     RETURNING *`,
                [
                    objectData.sana, objectData.kvartil, objectData.xet, objectData.tell,
                    objectData.m2, objectData.narx, objectData.fio, objectData.uy_turi,
                    objectData.xolati, objectData.planirovka, objectData.balkon, objectData.torets,
                    objectData.dom, objectData.kvartira, objectData.osmotir, objectData.opisaniya,
                    objectData.rieltor, objectData.xodim, objectData.sheetType || 'Sotuv',
                    objectData.rasmlar, uniqueId
                ]
            );

            console.log('✅ Obyekt yangilandi:', uniqueId);
            return result.rows[0];
        } else {
            // Insert new
            const result = await query(
                `INSERT INTO objects (
                    unique_id, sana, kvartil, xet, tell, m2, narx, fio, uy_turi,
                    xolati, planirovka, balkon, torets, dom, kvartira, osmotir,
                    opisaniya, rieltor, xodim, sheet_type, rasmlar, elon_status
                ) VALUES (
                             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                             $15, $16, $17, $18, $19, $20, $21, 'waiting'
                         ) RETURNING *`,
                [
                    uniqueId, objectData.sana, objectData.kvartil, objectData.xet,
                    objectData.tell, objectData.m2, objectData.narx, objectData.fio,
                    objectData.uy_turi, objectData.xolati, objectData.planirovka,
                    objectData.balkon, objectData.torets, objectData.dom, objectData.kvartira,
                    objectData.osmotir, objectData.opisaniya, objectData.rieltor,
                    objectData.xodim, objectData.sheetType || 'Sotuv', objectData.rasmlar
                ]
            );

            console.log('✅ Yangi obyekt qo\'shildi:', uniqueId);
            return result.rows[0];
        }
    }

    /**
     * Get all objects with sorting
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

        // ✅ SORTING - Kvartil bo'yicha
        sql += ` ORDER BY 
            CASE 
                WHEN kvartil ~ '^Yunusobod\\s*-\\s*\\d+$' THEN 1
                WHEN kvartil ~ '^Ц\\s*-\\s*\\d+$' THEN 2
                WHEN kvartil = 'Bodomzor' THEN 3
                WHEN kvartil = 'Minor' THEN 4
                ELSE 999
            END,
            CASE 
                WHEN kvartil ~ '\\d+' THEN CAST(SUBSTRING(kvartil FROM '\\d+') AS INTEGER)
                ELSE 0
            END,
            created_at DESC
        `;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Get by ID
     */
    static async getById(id) {
        const result = await query('SELECT * FROM objects WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Update status
     */
    static async updateStatus(id, status, elonDate = null) {
        const result = await query(
            `UPDATE objects
             SET elon_status = $1, elon_date = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
                 RETURNING *`,
            [status, elonDate, id]
        );

        if (result.rows[0]) {
            console.log(`✅ Obyekt ${id} status yangilandi: ${status}`);
        }

        return result.rows[0] || null;
    }

    /**
     * Get waiting objects for posting
     */
    static async getWaiting(limit = 50) {
        const result = await query(
            `SELECT * FROM objects
             WHERE elon_status = 'waiting'
             ORDER BY created_at ASC
                 LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    /**
     * Delete object
     */
    static async delete(id) {
        await query('DELETE FROM objects WHERE id = $1', [id]);
        console.log(`🗑️ Obyekt ${id} o'chirildi`);
        return true;
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(
            `SELECT
                 COUNT(*) as total,
                 COUNT(*) FILTER (WHERE elon_status = 'waiting') as waiting,
                 COUNT(*) FILTER (WHERE elon_status = 'processing') as processing,
                 COUNT(*) FILTER (WHERE elon_status = 'posted') as posted,
                 COUNT(*) FILTER (WHERE elon_status = 'error') as error,
                 COUNT(DISTINCT kvartil) as unique_kvartils,
                 COUNT(DISTINCT rieltor) as unique_rieltors,
                 COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as added_24h
             FROM objects`
        );
        return result.rows[0];
    }

    /**
     * Get objects grouped by kvartil
     */
    static async getByKvartil() {
        const result = await query(
            `SELECT
                 kvartil,
                 COUNT(*) as count,
                COUNT(*) FILTER (WHERE elon_status = 'posted') as posted_count
             FROM objects
             GROUP BY kvartil
             ORDER BY count DESC`
        );
        return result.rows;
    }

    /**
     * Get objects by rieltor
     */
    static async getByRieltor(rieltor) {
        const result = await query(
            `SELECT * FROM objects
             WHERE rieltor = $1
             ORDER BY created_at DESC`,
            [rieltor]
        );
        return result.rows;
    }

    /**
     * Search objects
     */
    static async search(searchTerm) {
        const result = await query(
            `SELECT * FROM objects
             WHERE
                 kvartil ILIKE $1 OR
                 xet ILIKE $1 OR
                 tell ILIKE $1 OR
                 fio ILIKE $1 OR
                 rieltor ILIKE $1 OR
                 opisaniya ILIKE $1
             ORDER BY created_at DESC
                 LIMIT 100`,
            [`%${searchTerm}%`]
        );
        return result.rows;
    }
}

module.exports = PropertyObject;