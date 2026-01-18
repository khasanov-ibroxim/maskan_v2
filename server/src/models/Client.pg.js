// server/src/models/Client.pg.js
const { query } = require('../config/database');

class Client {
    /**
     * Get all clients with filters
     */
    static async getAll(filters = {}) {
        let sql = `
            SELECT
                c.*,
                u.username as assigned_realtor_username,
                u.full_name as assigned_realtor_name,
                creator.username as created_by_username
            FROM clients c
                     LEFT JOIN users u ON c.assigned_realtor_id = u.id
                     LEFT JOIN users creator ON c.created_by = creator.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (filters.status) {
            sql += ` AND c.status = $${paramCount++}`;
            params.push(filters.status);
        }

        if (filters.realtorId) {
            sql += ` AND c.assigned_realtor_id = $${paramCount++}`;
            params.push(filters.realtorId);
        }

        if (filters.search) {
            sql += ` AND (c.full_name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }

        sql += ` ORDER BY c.created_at DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Get client by ID
     */
    static async getById(id) {
        const result = await query(
            `SELECT
                 c.*,
                 u.username as assigned_realtor_username,
                 u.full_name as assigned_realtor_name
             FROM clients c
                      LEFT JOIN users u ON c.assigned_realtor_id = u.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create new client
     */
    static async create(clientData) {
        const {
            fullName, phone, rooms, floorMin, floorMax,
            totalFloorsMin, totalFloorsMax, preferredLocations,
            priceMin, priceMax, notes, createdBy
        } = clientData;

        const result = await query(
            `INSERT INTO clients (
                full_name, phone, rooms, floor_min, floor_max,
                total_floors_min, total_floors_max, preferred_locations,
                price_min, price_max, notes, created_by
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                fullName, phone, rooms || [], floorMin, floorMax,
                totalFloorsMin, totalFloorsMax,
                JSON.stringify(preferredLocations || []),
                priceMin, priceMax, notes, createdBy
            ]
        );

        return result.rows[0];
    }

    /**
     * Update client
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.fullName !== undefined) {
            fields.push(`full_name = $${paramCount++}`);
            values.push(updates.fullName);
        }
        if (updates.phone !== undefined) {
            fields.push(`phone = $${paramCount++}`);
            values.push(updates.phone);
        }
        if (updates.rooms !== undefined) {
            fields.push(`rooms = $${paramCount++}`);
            values.push(updates.rooms);
        }
        if (updates.floorMin !== undefined) {
            fields.push(`floor_min = $${paramCount++}`);
            values.push(updates.floorMin);
        }
        if (updates.floorMax !== undefined) {
            fields.push(`floor_max = $${paramCount++}`);
            values.push(updates.floorMax);
        }
        if (updates.totalFloorsMin !== undefined) {
            fields.push(`total_floors_min = $${paramCount++}`);
            values.push(updates.totalFloorsMin);
        }
        if (updates.totalFloorsMax !== undefined) {
            fields.push(`total_floors_max = $${paramCount++}`);
            values.push(updates.totalFloorsMax);
        }
        if (updates.preferredLocations !== undefined) {
            fields.push(`preferred_locations = $${paramCount++}`);
            values.push(JSON.stringify(updates.preferredLocations));
        }
        if (updates.priceMin !== undefined) {
            fields.push(`price_min = $${paramCount++}`);
            values.push(updates.priceMin);
        }
        if (updates.priceMax !== undefined) {
            fields.push(`price_max = $${paramCount++}`);
            values.push(updates.priceMax);
        }
        if (updates.assignedRealtorId !== undefined) {
            fields.push(`assigned_realtor_id = $${paramCount++}`);
            values.push(updates.assignedRealtorId);
        }
        if (updates.assignedObjects !== undefined) {
            fields.push(`assigned_objects = $${paramCount++}`);
            values.push(JSON.stringify(updates.assignedObjects));
        }
        if (updates.status !== undefined) {
            fields.push(`status = $${paramCount++}`);
            values.push(updates.status);
        }
        if (updates.notes !== undefined) {
            fields.push(`notes = $${paramCount++}`);
            values.push(updates.notes);
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await query(
            `UPDATE clients
             SET ${fields.join(', ')}
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Delete client
     */
    static async delete(id) {
        await query('DELETE FROM clients WHERE id = $1', [id]);
        return true;
    }

    /**
     * Assign realtor to client
     */
    static async assignRealtor(clientId, realtorId) {
        const result = await query(
            `UPDATE clients
             SET assigned_realtor_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [realtorId, clientId]
        );
        return result.rows[0];
    }

    /**
     * Assign object to client
     */
    static async assignObject(clientId, objectId) {
        console.log('\n📝 ASSIGN OBJECT');
        console.log('='.repeat(60));
        console.log('  Client ID:', clientId);
        console.log('  Object ID:', objectId);

        try {
            // 1. Get client
            const client = await this.getById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            console.log('  ✅ Client topildi:', client.full_name);

            // 2. Parse existing assigned objects
            let assignedObjects = [];

            if (client.assigned_objects) {
                if (typeof client.assigned_objects === 'string') {
                    try {
                        assignedObjects = JSON.parse(client.assigned_objects);
                    } catch (e) {
                        console.log('  ⚠️ JSON parse xato, yangi array yaratilmoqda');
                        assignedObjects = [];
                    }
                } else if (Array.isArray(client.assigned_objects)) {
                    assignedObjects = client.assigned_objects;
                } else {
                    console.log('  ⚠️ Noto\'g\'ri format, yangi array yaratilmoqda');
                    assignedObjects = [];
                }
            }

            console.log('  📊 Mavjud obyektlar:', assignedObjects.length);

            // 3. Check if already assigned
            const exists = assignedObjects.find(a => a.object_id === objectId);
            if (exists) {
                console.log('  ℹ️ Bu obyekt allaqachon biriktirilgan');
                return client;
            }

            // 4. ✅ CRITICAL: Add new assignment
            const newAssignment = {
                object_id: objectId,
                assigned_at: new Date().toISOString()
            };

            assignedObjects.push(newAssignment);

            console.log('  ✅ Yangi obyekt qo\'shildi');
            console.log('  📊 Jami obyektlar:', assignedObjects.length);
            console.log('  📝 Yangilanayotgan ma\'lumot:', JSON.stringify(assignedObjects));

            // 5. Update database
            const result = await query(
                `UPDATE clients
                 SET assigned_objects = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [JSON.stringify(assignedObjects), clientId]
            );

            if (!result.rows[0]) {
                throw new Error('Update muvaffaqiyatsiz');
            }

            console.log('  ✅ Database yangilandi');
            console.log('  📊 Yangi assigned_objects:', result.rows[0].assigned_objects);
            console.log('='.repeat(60));

            return result.rows[0];

        } catch (error) {
            console.error('❌ assignObject xato:', error);
            console.error('='.repeat(60));
            throw error;
        }
    }

    /**
     * Unassign object from client
     */
    static async unassignObject(clientId, objectId) {
        console.log('\n🗑️ UNASSIGN OBJECT');
        console.log('='.repeat(60));
        console.log('  Client ID:', clientId);
        console.log('  Object ID:', objectId);

        try {
            const client = await this.getById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            console.log('  ✅ Client topildi:', client.full_name);

            // Parse assigned objects
            let assignedObjects = [];
            if (client.assigned_objects) {
                if (typeof client.assigned_objects === 'string') {
                    assignedObjects = JSON.parse(client.assigned_objects);
                } else if (Array.isArray(client.assigned_objects)) {
                    assignedObjects = client.assigned_objects;
                }
            }

            console.log('  📊 Mavjud obyektlar:', assignedObjects.length);

            // Filter out the object
            const filteredObjects = assignedObjects.filter(a => a.object_id !== objectId);

            console.log('  📊 Qolganlari:', filteredObjects.length);

            // Update database
            const result = await query(
                `UPDATE clients
                 SET assigned_objects = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [JSON.stringify(filteredObjects), clientId]
            );

            console.log('  ✅ Database yangilandi');
            console.log('='.repeat(60));

            return result.rows[0];

        } catch (error) {
            console.error('❌ unassignObject xato:', error);
            console.error('='.repeat(60));
            throw error;
        }
    }
    /**
     * Find matching objects for client
     */
    static async findMatches(clientId) {
        const client = await this.getById(clientId);
        if (!client) throw new Error('Client not found');

        let sql = `
            SELECT o.*,
                   COUNT(*) OVER() as total_count
            FROM objects o
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Rooms filter
        if (client.rooms && client.rooms.length > 0) {
            const roomConditions = client.rooms.map(room => {
                const roomStr = room >= 5 ? '5+' : String(room);
                return `SPLIT_PART(o.xet, '/', 1) = '${roomStr}'`;
            });
            sql += ` AND (${roomConditions.join(' OR ')})`;
        }

        // Floor filter
        if (client.floor_min) {
            sql += ` AND CAST(SPLIT_PART(o.xet, '/', 2) AS INTEGER) >= $${paramCount++}`;
            params.push(client.floor_min);
        }
        if (client.floor_max) {
            sql += ` AND CAST(SPLIT_PART(o.xet, '/', 2) AS INTEGER) <= $${paramCount++}`;
            params.push(client.floor_max);
        }

        // Total floors filter
        if (client.total_floors_min) {
            sql += ` AND CAST(SPLIT_PART(o.xet, '/', 3) AS INTEGER) >= $${paramCount++}`;
            params.push(client.total_floors_min);
        }
        if (client.total_floors_max) {
            sql += ` AND CAST(SPLIT_PART(o.xet, '/', 3) AS INTEGER) <= $${paramCount++}`;
            params.push(client.total_floors_max);
        }

        // ✅ UPDATED: Location filter with preferred_locations
        if (client.preferred_locations && client.preferred_locations.length > 0) {
            const locationConditions = [];
            client.preferred_locations.forEach(loc => {
                if (loc.kvartils && loc.kvartils.length > 0) {
                    // Specific kvartils selected
                    const kvartilList = loc.kvartils.map(k => `'${k}'`).join(', ');
                    locationConditions.push(`o.kvartil IN (${kvartilList})`);
                } else if (loc.tuman) {
                    // Entire district (all kvartils in that district)
                    locationConditions.push(`o.kvartil LIKE '${loc.tuman}%'`);
                }
            });
            if (locationConditions.length > 0) {
                sql += ` AND (${locationConditions.join(' OR ')})`;
            }
        }

        // Price filter (assuming narx is in USD)
        if (client.price_min) {
            sql += ` AND CAST(REGEXP_REPLACE(o.narx, '[^0-9]', '', 'g') AS NUMERIC) >= $${paramCount++}`;
            params.push(client.price_min);
        }
        if (client.price_max) {
            sql += ` AND CAST(REGEXP_REPLACE(o.narx, '[^0-9]', '', 'g') AS NUMERIC) <= $${paramCount++}`;
            params.push(client.price_max);
        }

        sql += ` ORDER BY o.created_at DESC LIMIT 50`;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(`
            SELECT
                COUNT(*) as total_clients,
                COUNT(*) FILTER (WHERE status = 'active') as active_clients,
                COUNT(*) FILTER (WHERE assigned_realtor_id IS NOT NULL) as clients_with_realtor,
                COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as new_this_month
            FROM clients
        `);
        return result.rows[0];
    }

    /**
     * ✅ UPDATED: Get assigned objects with full details INCLUDING REALTOR NAME
     */
    static async getAssignedObjects(clientId) {
        console.log('\n📋 GET ASSIGNED OBJECTS');
        console.log('='.repeat(60));
        console.log('  Client ID:', clientId);

        try {
            const client = await this.getById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            console.log('  ✅ Client topildi:', client.full_name);

            // Parse assigned objects
            let assignedObjects = [];
            if (client.assigned_objects) {
                if (typeof client.assigned_objects === 'string') {
                    assignedObjects = JSON.parse(client.assigned_objects);
                } else if (Array.isArray(client.assigned_objects)) {
                    assignedObjects = client.assigned_objects;
                }
            }

            console.log('  📊 Assigned objects array:', assignedObjects.length);

            if (assignedObjects.length === 0) {
                console.log('  ℹ️ Hech qanday obyekt biriktirilmagan');
                console.log('='.repeat(60));
                return [];
            }

            const objectIds = assignedObjects.map(a => a.object_id);
            console.log('  📝 Object IDs:', objectIds);

            // Get full object details with realtor name
            const placeholders = objectIds.map((_, i) => `$${i + 1}::uuid`).join(',');
            const result = await query(
                `SELECT 
                    o.*,
                    u.full_name as realtor_name,
                    u.username as realtor_username
                 FROM objects o
                 LEFT JOIN users u ON o.realtor_id = u.id
                 WHERE o.id IN (${placeholders}) 
                 ORDER BY o.created_at DESC`,
                objectIds
            );

            console.log('  ✅ Objects from DB:', result.rows.length);

            // Merge with assignment data
            const mergedData = result.rows.map(obj => {
                const assignment = assignedObjects.find(a => a.object_id === obj.id);
                return {
                    ...obj,
                    assigned_at: assignment?.assigned_at
                };
            });

            console.log('  ✅ Final merged data:', mergedData.length);
            console.log('='.repeat(60));

            return mergedData;

        } catch (error) {
            console.error('❌ getAssignedObjects xato:', error);
            console.error('='.repeat(60));
            throw error;
        }
    }
}

module.exports = Client;