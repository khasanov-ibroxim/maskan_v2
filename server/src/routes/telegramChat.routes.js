// server/src/routes/telegramChat.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/simpleAuth');
const TelegramChat = require('../models/TelegramChat.pg');

/**
 * Get all chats
 * GET /api/telegram-chats
 */
router.get('/', protect, async (req, res) => {
    try {
        const chats = await TelegramChat.getAll();
        res.json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error('❌ Get chats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get chat by ID
 * GET /api/telegram-chats/:id
 */
router.get('/:id', protect, async (req, res) => {
    try {
        const chat = await TelegramChat.getById(req.params.id);
        if (!chat) {
            return res.status(404).json({
                success: false,
                error: 'Chat topilmadi'
            });
        }
        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        console.error('❌ Get chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create new chat
 * POST /api/telegram-chats
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { chatName, chatId, displayOrder } = req.body;

        // Validation
        if (!chatName || !chatId) {
            return res.status(400).json({
                success: false,
                error: 'chatName va chatId majburiy'
            });
        }

        // Check if chat_id already exists
        const existing = await TelegramChat.getByChatId(chatId);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Bu Chat ID allaqachon mavjud'
            });
        }

        const chat = await TelegramChat.create(
            chatName.trim(),
            chatId.trim(),
            displayOrder || 0
        );

        console.log(`✅ Yangi Telegram chat yaratildi: ${chatName}`);

        res.status(201).json({
            success: true,
            message: 'Chat yaratildi',
            data: chat
        });
    } catch (error) {
        console.error('❌ Create chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update chat
 * PUT /api/telegram-chats/:id
 */
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { chatName, chatId, displayOrder, isActive } = req.body;

        const updates = {};
        if (chatName !== undefined) updates.chatName = chatName.trim();
        if (chatId !== undefined) updates.chatId = chatId.trim();
        if (displayOrder !== undefined) updates.displayOrder = displayOrder;
        if (isActive !== undefined) updates.isActive = isActive;

        const chat = await TelegramChat.update(req.params.id, updates);

        if (!chat) {
            return res.status(404).json({
                success: false,
                error: 'Chat topilmadi'
            });
        }

        console.log(`✅ Telegram chat yangilandi: ${chat.chat_name}`);

        res.json({
            success: true,
            message: 'Chat yangilandi',
            data: chat
        });
    } catch (error) {
        console.error('❌ Update chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete chat
 * DELETE /api/telegram-chats/:id
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await TelegramChat.delete(req.params.id);

        console.log(`🗑️ Telegram chat o'chirildi: ${req.params.id}`);

        res.json({
            success: true,
            message: 'Chat o\'chirildi'
        });
    } catch (error) {
        console.error('❌ Delete chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get statistics
 * GET /api/telegram-chats/stats/summary
 */
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
    try {
        const stats = await TelegramChat.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Get stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;