// server/src/controllers/simpleUserController.js - ✅ FIXED: Individual Rieltor Phone

const User = require('../models/User.pg');
const { logActivity } = require('../middleware/simpleAuth');

/**
 * Aktiv sesiyalarni olish
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const sessions = await User.getSessions();
        const activeSessions = sessions.filter(s => s.is_active);

        res.json({
            success: true,
            count: activeSessions.length,
            sessions: activeSessions.map(s => ({
                sessionId: s.session_id,
                userId: s.user_id,
                username: s.username,
                loginTime: s.login_time,
                lastActivity: s.last_activity,
                ipAddress: s.ip_address,
                userAgent: s.user_agent
            }))
        });

    } catch (error) {
        console.error('❌ Get active sessions xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

exports.getSessionHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        const sessions = await User.getSessions();

        let filteredSessions = sessions;

        if (userId) {
            filteredSessions = sessions.filter(s => s.user_id === userId);
        }

        if (req.user.role !== 'admin' && !userId) {
            filteredSessions = sessions.filter(s => s.user_id === req.user.id);
        }

        res.json({
            success: true,
            count: filteredSessions.length,
            sessions: filteredSessions.sort((a, b) =>
                new Date(b.login_time) - new Date(a.login_time)
            )
        });

    } catch (error) {
        console.error('❌ Get session history xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const { userId, action, limit = 100 } = req.query;

        const filters = {
            userId,
            action,
            limit: parseInt(limit)
        };

        let logs = await User.getLogs(filters);

        if (req.user.role !== 'admin' && !userId) {
            logs = logs.filter(l => l.user_id === req.user.id);
        }

        res.json({
            success: true,
            count: logs.length,
            logs: logs
        });

    } catch (error) {
        console.error('❌ Get activity logs xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll();

        res.json({
            success: true,
            count: users.length,
            users: users
        });

    } catch (error) {
        console.error('❌ Get users xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

exports.getRealtors = async (req, res) => {
    try {
        const realtors = await User.getRealtors();

        res.json({
            success: true,
            count: realtors.length,
            realtors: realtors
        });

    } catch (error) {
        console.error('❌ Get realtors xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

/**
 * ✅ CRITICAL FIX: Create user with phone validation
 */
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role, appScriptUrl, telegramThemeId, phone } = req.body;

        console.log('\n📝 YANGI USER YARATISH:');
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Phone:', phone || 'NULL');

        // Basic validation
        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                error: 'Username, password va to\'liq ism kiritilishi kerak'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Username kamida 3 ta belgidan iborat bo\'lishi kerak'
            });
        }

        if (password.length < 5) {
            return res.status(400).json({
                success: false,
                error: 'Password kamida 5 ta belgidan iborat bo\'lishi kerak'
            });
        }

        // ✅ CRITICAL: Validate role-specific requirements
        if (role === 'rieltor') {
            // Regular rieltor - needs App Script URL and Telegram Theme ID
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun App Script URL kiritilishi kerak'
                });
            }

            if (!telegramThemeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun Telegram Theme ID kiritilishi kerak'
                });
            }

            // URL format validation
            try {
                new URL(appScriptUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Noto\'g\'ri App Script URL formati'
                });
            }

            console.log('  ✅ Regular rieltor - App Script va Theme ID bor');
        }

        // ✅ CRITICAL FIX: Individual rieltor phone validation
        if (role === 'individual_rieltor') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Individual rieltor uchun telefon raqami MAJBURIY!'
                });
            }

            // Phone format validation
            const phoneRegex = /^\+998\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefon raqami noto\'g\'ri formatda! Format: +998XXXXXXXXX'
                });
            }

            console.log('  ✅ Individual rieltor - Phone validatsiya o\'tdi:', phone);
        }

        // Check if username is taken
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu username band'
            });
        }

        // ✅ Create user with phone
        const newUser = await User.create({
            username,
            password,
            fullName,
            role: role || 'user',
            appScriptUrl: role === 'rieltor' ? appScriptUrl : undefined,
            telegramThemeId: role === 'rieltor' ? parseInt(telegramThemeId) : undefined,
            phone: role === 'individual_rieltor' ? phone : undefined  // ✅ Save phone
        });

        console.log(`✅ YANGI USER YARATILDI: ${username} (${role || 'user'})`);

        if (role === 'rieltor') {
            console.log(`   App Script URL: ${appScriptUrl}`);
            console.log(`   Telegram Theme ID: ${telegramThemeId}`);
        }

        if (role === 'individual_rieltor' && phone) {
            console.log(`   📱 TELEFON SAQLANDI: ${phone}`);
        }

        // Log activity
        await logActivity(
            req.user.id,
            req.user.username,
            'create_user',
            `Yangi user yaratildi: ${username} (${role || 'user'})${role === 'individual_rieltor' ? ` - Phone: ${phone}` : ''}`,
            req.ip,
            req.get('user-agent')
        );

        res.status(201).json({
            success: true,
            message: 'User muvaffaqiyatli yaratildi',
            user: newUser
        });

    } catch (error) {
        console.error('❌ Create user xato:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server xatosi'
        });
    }
};

/**
 * ✅ CRITICAL FIX: Update user with phone validation
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, role, appScriptUrl, telegramThemeId, phone } = req.body;

        console.log(`\n✏️ USER YANGILANMOQDA: ${id}`);
        console.log('  Username:', username);
        console.log('  Role:', role);
        console.log('  Phone:', phone || 'NULL');

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Admin self-edit restrictions
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

        // ✅ CRITICAL: Role-specific validation
        if (role === 'rieltor') {
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun App Script URL kiritilishi kerak'
                });
            }

            if (!telegramThemeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Rieltor uchun Telegram Theme ID kiritilishi kerak'
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
            updates.telegramThemeId = parseInt(telegramThemeId);
            updates.phone = null;  // Clear phone for regular rieltor

            console.log('  📝 Rieltor ma\'lumotlari yangilandi');
        }

        // ✅ CRITICAL FIX: Individual rieltor phone validation
        if (role === 'individual_rieltor') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'Individual rieltor uchun telefon raqami MAJBURIY!'
                });
            }

            // Phone format validation
            const phoneRegex = /^\+998\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Telefon raqami noto\'g\'ri formatda! Format: +998XXXXXXXXX'
                });
            }

            updates.phone = phone.trim();
            updates.appScriptUrl = null;  // Clear App Script for individual
            updates.telegramThemeId = null;  // Clear Theme ID for individual

            console.log('  📱 Individual rieltor - Telefon yangilandi:', phone);
        }

        // If changing from individual_rieltor or rieltor to another role
        if (user.role === 'individual_rieltor' && role !== 'individual_rieltor') {
            updates.phone = null;
            console.log('  🗑️ Telefon o\'chirildi (role o\'zgargan)');
        }

        if (user.role === 'rieltor' && role !== 'rieltor') {
            updates.appScriptUrl = null;
            updates.telegramThemeId = null;
            console.log('  🗑️ App Script va Theme ID o\'chirildi (role o\'zgargan)');
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
        if (updatedUser.phone) {
            console.log(`   📱 Phone: ${updatedUser.phone}`);
        }

        // Log changes
        const changes = [];
        if (username && username !== user.username) changes.push(`username: ${user.username} → ${username}`);
        if (fullName && fullName !== user.full_name) changes.push(`fullName: ${user.full_name} → ${fullName}`);
        if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
        if (password) changes.push('password o\'zgartirildi');
        if (phone !== user.phone) changes.push(`phone: ${user.phone || 'NULL'} → ${phone || 'NULL'}`);

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
        console.error('❌ Update user xato:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server xatosi'
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'O\'zingizni o\'chira olmaysiz'
            });
        }

        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin userlarni o\'chirib bo\'lmaydi'
            });
        }

        await User.delete(id);

        console.log(`🗑️ User o'chirildi: ${user.username}`);

        await logActivity(
            req.user.id,
            req.user.username,
            'delete_user',
            `User o'chirildi: ${user.username}`,
            req.ip,
            req.get('user-agent')
        );

        res.json({
            success: true,
            message: 'User muvaffaqiyatli o\'chirildi'
        });

    } catch (error) {
        console.error('❌ Delete user xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

module.exports = {
    getActiveSessions: exports.getActiveSessions,
    getSessionHistory: exports.getSessionHistory,
    getActivityLogs: exports.getActivityLogs,
    getAllUsers: exports.getAllUsers,
    createUser: exports.createUser,
    deleteUser: exports.deleteUser,
    getRealtors: exports.getRealtors,
    updateUser: exports.updateUser
};