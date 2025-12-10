// server/src/models/Session.pg.js
const { query } = require('../config/database');
const crypto = require('crypto');

const SESSION_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

class Session {
    /**
     * Create new session
     */
    static async create(userId, username, ipAddress, userAgent) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_LIFETIME);

        const result = await query(
            `INSERT INTO sessions (session_id, user_id, username, login_time, last_activity, expires_at, ip_address, user_agent, is_active)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4, $5, $6, true)
             RETURNING *`,
            [sessionId, userId, username, expiresAt, ipAddress, userAgent]
        );

        console.log(`✅ Session created: ${username} (${sessionId.substring(0, 8)}...)`);
        return result.rows[0];
    }

    /**
     * Find session by session_id
     */
    static async findBySessionId(sessionId) {
        const result = await query(
            'SELECT * FROM sessions WHERE session_id = $1 AND is_active = true',
            [sessionId]
        );
        return result.rows[0] || null;
    }

    /**
     * Update last activity
     */
    static async updateActivity(sessionId) {
        await query(
            'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = $1',
            [sessionId]
        );
    }

    /**
     * End session
     */
    static async end(sessionId, reason = 'manual_logout') {
        const result = await query(
            `UPDATE sessions 
             SET is_active = false, 
                 logout_time = CURRENT_TIMESTAMP,
                 logout_reason = $2,
                 duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time))::INTEGER
             WHERE session_id = $1
             RETURNING *`,
            [sessionId, reason]
        );

        if (result.rows[0]) {
            console.log(`🔴 Session ended: ${result.rows[0].username} - ${reason}`);
        }

        return result.rows[0] || null;
    }

    /**
     * Get all active sessions
     */
    static async getActive() {
        const result = await query(
            `SELECT s.*, u.full_name, u.role
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.is_active = true
             ORDER BY s.last_activity DESC`
        );
        return result.rows;
    }

    /**
     * Get session history
     */
    static async getHistory(userId = null, limit = 100) {
        let sql = `
            SELECT s.*, u.full_name, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
        `;
        const params = [];

        if (userId) {
            sql += ' WHERE s.user_id = $1';
            params.push(userId);
        }

        sql += ' ORDER BY s.login_time DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Cleanup old and inactive sessions
     */
    static async cleanup(activityTimeoutMs = 30 * 60 * 1000) {
        const result = await query(
            `UPDATE sessions
             SET is_active = false,
                 logout_time = CURRENT_TIMESTAMP,
                 logout_reason = 'auto_logout',
                 duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time))::INTEGER
             WHERE is_active = true
             AND (
                 expires_at < CURRENT_TIMESTAMP
                 OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_activity)) * 1000 > $1
             )
             RETURNING session_id`,
            [activityTimeoutMs]
        );

        if (result.rowCount > 0) {
            console.log(`🧹 ${result.rowCount} ta session tozalandi`);
        }

        return result.rowCount;
    }

    /**
     * Delete old sessions (older than 30 days)
     */
    static async deleteOld(days = 30) {
        const result = await query(
            `DELETE FROM sessions 
             WHERE logout_time IS NOT NULL 
             AND logout_time < CURRENT_TIMESTAMP - INTERVAL '${days} days'
             RETURNING session_id`
        );

        if (result.rowCount > 0) {
            console.log(`🗑️ ${result.rowCount} ta eski session o'chirildi`);
        }

        return result.rowCount;
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
                COUNT(*) FILTER (WHERE is_active = false) as inactive_sessions,
                COUNT(*) FILTER (WHERE login_time > CURRENT_TIMESTAMP - INTERVAL '24 hours') as sessions_24h,
                COUNT(DISTINCT user_id) FILTER (WHERE is_active = true) as unique_active_users
             FROM sessions`
        );
        return result.rows[0];
    }
}

module.exports = Session;