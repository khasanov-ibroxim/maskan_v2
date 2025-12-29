// server/src/controllers/simpleUserController.js - ✅ COMPLETE VERSION

const User = require('../models/User.pg');
const { logActivity } = require('../middleware/simpleAuth');

/**
 * Get active sessions
 * GET /api/users/sessions/active
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const Session = require('../models/Session.pg');
        const sessions = await Session.getActive();

        res.json({
            success: true,
            sessions: sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('❌ Get active sessions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get session history
 * GET /api/users/sessions/history
 */
exports.getSessionHistory = async (req, res) => {
    try {
        const { userId, limit } = req.query;
        const Session = require('../models/Session.pg');

        const sessions = await Session.getHistory(
            userId || null,
            parseInt(limit) || 100
        );

        res.json({
            success: true,
            sessions: sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('❌ Get session history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get activity logs
 * GET /api/users/logs
 */
exports.getActivityLogs = async (req, res) => {
    try {
        const { userId, action, limit } = req.query;
        const ActivityLog = require('../models/ActivityLog.pg');

        const logs = await ActivityLog.getLogs(
            {
                userId: userId || null,
                action: action || null
            },
            parseInt(limit) || 100
        );

        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        console.error('❌ Get activity logs error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get all users (admin only)
 * GET /api/users/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();

        res.json({
            success: true,
            users: users,      // ✅ "users" deb qaytarish
            count: users.length
        });
    } catch (error) {
        console.error('❌ Get all users error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * ✅ Get realtors (PUBLIC - no auth required)
 * GET /api/users/realtors
 */
exports.getRealtors = async (req, res) => {
    try {
        console.log('\n📋 GET REALTORS REQUEST');

        const realtors = await User.getRealtors();

        console.log(`✅ ${realtors.length} ta realtor topildi`);

        res.json({
            success: true,
            realtors: realtors,
            count: realtors.length
        });
    } catch (error) {
        console.error('❌ Get realtors error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create new user (admin only)
 * POST /api/users/users
 */
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role, appScriptUrl, telegramChatId, telegramThemeId, phone } = req.body;

        console.log('\n📝 CREATE USER REQUEST:');
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Phone:', phone || 'NULL');
        console.log('  Telegram Chat ID:', telegramChatId || 'NULL');

        // Validation
        if (!username || !password || !fullName || !role) {
            return res.status(400).json({
                success: false,
                error: 'Username, password, fullName va role majburiy'
            });
        }

        if (password.length < 5) {
            return res.status(400).json({
                success: false,
                error: 'Parol kamida 5 ta belgi bo\'lishi kerak'
            });
        }

        // Check username uniqueness
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu username band'
            });
        }

        // Role-specific validation
        if (role === 'rieltor') {
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun App Script URL kiritilishi kerak'
                });
            }

            // URL validation
            try {
                new URL(appScriptUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Noto\'g\'ri App Script URL formati'
                });
            }
        }

        if (role === 'individual_rieltor') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Individual rieltor uchun telefon raqami MAJBURIY!'
                });
            }

            // Phone validation
            const phoneRegex = /^\+998\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefon raqami noto\'g\'ri formatda! Format: +998XXXXXXXXX'
                });
            }
        }

        // Create user
        const user = await User.create({
            username,
            password,
            fullName,
            role,
            appScriptUrl: role === 'rieltor' ? appScriptUrl : null,
            telegramChatId: telegramChatId || null,
            telegramThemeId: telegramThemeId || null,
            phone: role === 'individual_rieltor' ? phone : null
        });

        console.log(`✅ User yaratildi: ${user.username}`);

        // Log activity
        await logActivity(
            req.user.id,
            req.user.username,
            'create_user',
            `Yangi user yaratildi: ${user.username} (${user.role})`,
            req.ip,
            req.get('user-agent')
        );

        res.status(201).json({
            success: true,
            message: 'User muvaffaqiyatli yaratildi',
            data: user
        });

    } catch (error) {
        console.error('❌ Create user error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update user (admin only)
 * PUT /api/users/users/:id
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, role, appScriptUrl, telegramChatId, telegramThemeId, phone } = req.body;

        console.log(`\n✏️ USER YANGILANMOQDA: ${id}`);
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Phone:', phone || 'NULL');
        console.log('  Telegram Chat ID:', telegramChatId || 'NULL');

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Self-edit restrictions
        if (id === req.user.id && (username !== user.username || role !== user.role)) {
            return res.status(400).json({
                success: false,
                error: 'O\'z username yoki role\'ingizni o\'zgartira olmaysiz'
            });
        }

        // Admin role protection
        if (user.role === 'admin' && role !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin rolini o\'zgartirish mumkin emas'
            });
        }

        // Username uniqueness
        if (username && username !== user.username) {
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Bu username band'
                });
            }
        }

        // Prepare updates
        const updates = {};

        if (username) updates.username = username.trim();
        if (fullName) updates.fullName = fullName.trim();
        if (role) updates.role = role;
        if (password && password.length >= 5) {
            updates.password = password;
            console.log('  ✅ Yangi parol belgilandi');
        }

        // Role-specific validation
        if (role === 'rieltor') {
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun App Script URL kiritilishi kerak'
                });
            }

            try {
                new URL(appScriptUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Noto\'g\'ri App Script URL formati'
                });
            }

            updates.appScriptUrl = appScriptUrl.trim();
            updates.telegramChatId = telegramChatId || null;
            updates.telegramThemeId = telegramThemeId ? parseInt(telegramThemeId) : null;
            updates.phone = null;

            console.log('  📝 Rieltor ma\'lumotlari yangilandi');
        }

        if (role === 'individual_rieltor') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Individual rieltor uchun telefon raqami MAJBURIY!'
                });
            }

            const phoneRegex = /^\+998\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefon raqami noto\'g\'ri formatda! Format: +998XXXXXXXXX'
                });
            }

            updates.phone = phone.trim();
            updates.telegramChatId = telegramChatId || null;
            updates.telegramThemeId = telegramThemeId ? parseInt(telegramThemeId) : null;
            updates.appScriptUrl = null;

            console.log('  📱 Individual rieltor - Telefon yangilandi:', phone);
        }

        // Clear fields when changing from rieltor roles
        if (user.role === 'individual_rieltor' && role !== 'individual_rieltor') {
            updates.phone = null;
            updates.telegramChatId = null;
            updates.telegramThemeId = null;
            console.log('  🗑️ Telefon va Telegram ma\'lumotlari o\'chirildi');
        }

        if (user.role === 'rieltor' && role !== 'rieltor') {
            updates.appScriptUrl = null;
            updates.telegramChatId = null;
            updates.telegramThemeId = null;
            console.log('  🗑️ App Script va Telegram ma\'lumotlari o\'chirildi');
        }

        // Update user
        const updatedUser = await User.update(id, updates);

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                error: 'User yangilashda xato'
            });
        }

        console.log(`✅ USER YANGILANDI: ${updatedUser.username}`);

        // Log changes
        const changes = [];
        if (username && username !== user.username) changes.push(`username: ${user.username} → ${username}`);
        if (fullName && fullName !== user.full_name) changes.push(`fullName: ${user.full_name} → ${fullName}`);
        if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
        if (password) changes.push('password o\'zgartirildi');
        if (phone !== user.phone) changes.push(`phone: ${user.phone || 'NULL'} → ${phone || 'NULL'}`);
        if (telegramChatId !== user.telegram_chat_id) changes.push(`telegramChatId: ${user.telegram_chat_id || 'NULL'} → ${telegramChatId || 'NULL'}`);

        await logActivity(
            req.user.id,
            req.user.username,
            'update_user',
            `User yangilandi: ${updatedUser.username} (${changes.join(', ')})`,
            req.ip,
            req.get('user-agent')
        );

        res.json({
            success: true,
            message: 'User muvaffaqiyatli yangilandi',
            user: updatedUser
        });

    } catch (error) {
        console.error('❌ Update user error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server xatosi'
        });
    }
};

/**
 * Delete user (admin only)
 * DELETE /api/users/users/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`\n🗑️ USER O'CHIRILMOQDA: ${id}`);

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Self-delete prevention
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'O\'zingizni o\'chira olmaysiz'
            });
        }

        // Admin protection
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin userni o\'chirib bo\'lmaydi'
            });
        }

        // Delete user
        await User.delete(id);

        console.log(`✅ USER O'CHIRILDI: ${user.username}`);

        // Log activity
        await logActivity(
            req.user.id,
            req.user.username,
            'delete_user',
            `User o'chirildi: ${user.username} (${user.role})`,
            req.ip,
            req.get('user-agent')
        );

        res.json({
            success: true,
            message: 'User muvaffaqiyatli o\'chirildi'
        });

    } catch (error) {
        console.error('❌ Delete user error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ✅ CRITICAL: Export all functions
module.exports = {
    getActiveSessions: exports.getActiveSessions,
    getSessionHistory: exports.getSessionHistory,
    getActivityLogs: exports.getActivityLogs,
    getAllUsers: exports.getAllUsers,
    getRealtors: exports.getRealtors,  // ✅ NOW EXPORTED
    createUser: exports.createUser,
    updateUser: exports.updateUser,
    deleteUser: exports.deleteUser
};