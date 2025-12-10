// server/src/models/ActivityLog.pg.js
const { query } = require('../config/database');

class ActivityLog {
    /**
     * Create new log entry
     */
    static async create(userId, username, action, description, ipAddress, userAgent) {
        const result = await query(
            `INSERT INTO activity_logs (user_id, username, action, description, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, username, action, description, ipAddress, userAgent]
        );

        return result.rows[0];
    }

    /**
     * Get logs with filters
     */
    static async getLogs(filters = {}, limit = 100) {
        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (filters.userId) {
            conditions.push(`user_id = $${paramCount++}`);
            params.push(filters.userId);
        }

        if (filters.action) {
            conditions.push(`action = $${paramCount++}`);
            params.push(filters.action);
        }

        if (filters.startDate) {
            conditions.push(`timestamp >= $${paramCount++}`);
            params.push(filters.startDate);
        }

        if (filters.endDate) {
            conditions.push(`timestamp <= $${paramCount++}`);
            params.push(filters.endDate);
        }

        let sql = `
            SELECT l.*, u.full_name, u.role
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
        `;

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ` ORDER BY l.timestamp DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Get logs for specific user
     */
    static async getByUser(userId, limit = 100) {
        return await this.getLogs({ userId }, limit);
    }

    /**
     * Get logs for specific action
     */
    static async getByAction(action, limit = 100) {
        return await this.getLogs({ action }, limit);
    }

    /**
     * Get recent logs (last 24 hours)
     */
    static async getRecent(limit = 100) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return await this.getLogs({ startDate: yesterday }, limit);
    }

    /**
     * Delete old logs (older than specified days)
     */
    static async deleteOld(days = 90) {
        const result = await query(
            `DELETE FROM activity_logs 
             WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '${days} days'
             RETURNING id`
        );

        if (result.rowCount > 0) {
            console.log(`🗑️ ${result.rowCount} ta eski log o'chirildi`);
        }

        return result.rowCount;
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(
            `SELECT 
                COUNT(*) as total_logs,
                COUNT(*) FILTER (WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as logs_24h,
                COUNT(*) FILTER (WHERE action = 'login') as total_logins,
                COUNT(*) FILTER (WHERE action = 'login' AND timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours') as logins_24h,
                COUNT(DISTINCT user_id) as unique_users
             FROM activity_logs`
        );
        return result.rows[0];
    }

    /**
     * Get action breakdown
     */
    static async getActionBreakdown(hours = 24) {
        const result = await query(
            `SELECT 
                action,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users
             FROM activity_logs
             WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
             GROUP BY action
             ORDER BY count DESC`
        );
        return result.rows;
    }

    /**
     * Get most active users
     */
    static async getMostActiveUsers(hours = 24, limit = 10) {
        const result = await query(
            `SELECT 
                l.user_id,
                l.username,
                u.full_name,
                u.role,
                COUNT(*) as activity_count
             FROM activity_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.timestamp > CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
             GROUP BY l.user_id, l.username, u.full_name, u.role
             ORDER BY activity_count DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }
}

module.exports = ActivityLog;