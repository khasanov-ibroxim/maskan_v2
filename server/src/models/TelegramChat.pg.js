// server/src/models/TelegramChat.pg.js
const { query } = require('../config/database');

class TelegramChat {
    /**
     * Get all active chats
     */
    static async getAll() {
        const result = await query(
            `SELECT id, chat_name, chat_id, is_active, display_order, created_at
             FROM telegram_chats
             WHERE is_active = true
             ORDER BY display_order ASC, chat_name ASC`
        );
        return result.rows;
    }

    /**
     * Get chat by ID
     */
    static async getById(id) {
        const result = await query(
            'SELECT * FROM telegram_chats WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get chat by chat_id (Telegram chat ID)
     */
    static async getByChatId(chatId) {
        const result = await query(
            'SELECT * FROM telegram_chats WHERE chat_id = $1 AND is_active = true',
            [chatId]
        );
        return result.rows[0] || null;
    }

    /**
     * Create new chat
     */
    static async create(chatName, chatId, displayOrder = 0) {
        const result = await query(
            `INSERT INTO telegram_chats (chat_name, chat_id, display_order)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [chatName, chatId, displayOrder]
        );
        return result.rows[0];
    }

    /**
     * Update chat
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.chatName !== undefined) {
            fields.push(`chat_name = $${paramCount++}`);
            values.push(updates.chatName);
        }
        if (updates.chatId !== undefined) {
            fields.push(`chat_id = $${paramCount++}`);
            values.push(updates.chatId);
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

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await query(
            `UPDATE telegram_chats
             SET ${fields.join(', ')}
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    /**
     * Delete chat (soft delete)
     */
    static async delete(id) {
        await query(
            'UPDATE telegram_chats SET is_active = false WHERE id = $1',
            [id]
        );
        return true;
    }

    /**
     * Hard delete (faqat development uchun)
     */
    static async hardDelete(id) {
        await query('DELETE FROM telegram_chats WHERE id = $1', [id]);
        return true;
    }

    /**
     * Get statistics
     */
    static async getStats() {
        const result = await query(
            `SELECT 
                COUNT(*) as total_chats,
                COUNT(*) FILTER (WHERE is_active = true) as active_chats,
                COUNT(DISTINCT u.id) as users_with_chats
             FROM telegram_chats tc
             LEFT JOIN users u ON u.telegram_chat_id = tc.id`
        );
        return result.rows[0];
    }
}

module.exports = TelegramChat;