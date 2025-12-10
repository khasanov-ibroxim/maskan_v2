// controllers/simpleUserController.js
const User = require('../models/User.pg'); // ✅ SimpleUser emas, User
const { logActivity } = require('../middleware/simpleAuth');

/**
 * Aktiv sesiyalarni olish
 * GET /api/users/sessions/active
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const sessions = await User.getSessions(); // ✅ await qo'shildi
        const activeSessions = sessions.filter(s => s.is_active); // ✅ isActive -> is_active

        console.log(`📊 Aktiv sesiyalar so'ralmoqda: ${activeSessions.length} ta`);

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

/**
 * Session tarixini olish
 * GET /api/users/sessions/history
 */
exports.getSessionHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        const sessions = await User.getSessions(); // ✅ await qo'shildi

        let filteredSessions = sessions;

        if (userId) {
            filteredSessions = sessions.filter(s => s.user_id === userId);
        }

        if (req.user.role !== 'admin' && !userId) {
            filteredSessions = sessions.filter(s => s.user_id === req.user.id);
        }

        console.log(`📜 Session tarixi so'ralmoqda: ${filteredSessions.length} ta`);

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

/**
 * Activity loglarini olish
 * GET /api/users/logs
 */
exports.getActivityLogs = async (req, res) => {
    try {
        const { userId, action, limit = 100 } = req.query;

        // ✅ Filters obyekt orqali
        const filters = {
            userId,
            action,
            limit: parseInt(limit)
        };

        let logs = await User.getLogs(filters); // ✅ await qo'shildi

        // Admin emas bo'lsa, faqat o'z loglarini ko'radi
        if (req.user.role !== 'admin' && !userId) {
            logs = logs.filter(l => l.user_id === req.user.id);
        }

        console.log(`📝 Activity logs so'ralmoqda: ${logs.length} ta`);

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

/**
 * Barcha userlarni olish (admin only)
 * GET /api/users/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.getAll(); // ✅ await qo'shildi

        console.log(`👥 Barcha userlar so'ralmoqda: ${users.length} ta`);

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

/**
 * Realtorlar ro'yxati
 * GET /api/users/realtors
 */
exports.getRealtors = async (req, res) => {
    try {
        const realtors = await User.getRealtors(); // ✅ await qo'shildi

        console.log(`📋 Realtor'lar ro'yxati so'ralmoqda: ${realtors.length} ta`);

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
 * Yangi user yaratish (admin only)
 * POST /api/users/users
 */
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role, appScriptUrl, telegramThemeId } = req.body;

        console.log('📝 Yangi user yaratilmoqda:', { username, role });

        // Validatsiya
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

        // Realtor uchun qo'shimcha validatsiya
        if (role === 'rieltor') {
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Realtor uchun App Script URL kiritilishi kerak'
                });
            }

            if (!telegramThemeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Realtor uchun Telegram Theme ID kiritilishi kerak'
                });
            }

            // URL formatini tekshirish
            try {
                new URL(appScriptUrl);
            } catch {
                return res.status(400).json({
                    success: false,
                    error: 'Noto\'g\'ri App Script URL formati'
                });
            }
        }

        // Username band emasligini tekshirish
        const existingUser = await User.findByUsername(username); // ✅ await qo'shildi
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu username band'
            });
        }

        // Yangi user yaratish
        const newUser = await User.create({ // ✅ await qo'shildi
            username,
            password,
            fullName,
            role: role || 'user',
            appScriptUrl: role === 'rieltor' ? appScriptUrl : undefined,
            telegramThemeId: role === 'rieltor' ? parseInt(telegramThemeId) : undefined
        });

        console.log(`✅ Yangi user yaratildi: ${username} (${role || 'user'})`);

        if (role === 'rieltor') {
            console.log(`   App Script URL: ${appScriptUrl}`);
            console.log(`   Telegram Theme ID: ${telegramThemeId}`);
        }

        // Log qo'shish
        await logActivity(
            req.user.id,
            req.user.username,
            'create_user',
            `Yangi user yaratildi: ${username} (${role || 'user'})`,
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
 * Userni yangilash (admin only)
 * PUT /api/users/users/:id
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, role, appScriptUrl, telegramThemeId } = req.body;

        console.log(`✏️ User yangilanmoqda: ${id}`);
        console.log('  Yangi ma\'lumotlar:', { username, fullName, role });

        // Userni topish
        const user = await User.findById(id); // ✅ await qo'shildi
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Admin o'zini tahrirlay olmaydi (username/role o'zgartirish)
        if (id === req.user.id && (username !== user.username || role !== user.role)) {
            return res.status(400).json({
                success: false,
                error: 'O\'z username yoki role\'ingizni o\'zgartira olmaysiz'
            });
        }

        // Admin rolini o'zgartirish mumkin emas
        if (user.role === 'admin' && role !== 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin rolini o\'zgartirish mumkin emas'
            });
        }

        // Username band emasligini tekshirish
        if (username && username !== user.username) {
            const existingUser = await User.findByUsername(username); // ✅ await qo'shildi
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Bu username band'
                });
            }
        }

        // Yangilash uchun ma'lumotlar
        const updates = {};

        if (username) updates.username = username.trim();
        if (fullName) updates.fullName = fullName.trim();
        if (role) updates.role = role;
        if (password && password.length >= 5) {
            updates.password = password;
            console.log('  ✅ Yangi parol belgilandi');
        }

        // Realtor uchun qo'shimcha validatsiya
        if (role === 'rieltor') {
            if (!appScriptUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Realtor uchun App Script URL kiritilishi kerak'
                });
            }

            if (!telegramThemeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Realtor uchun Telegram Theme ID kiritilishi kerak'
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

            console.log('  📝 Rieltor ma\'lumotlari yangilandi');
        } else {
            updates.appScriptUrl = null;
            updates.telegramThemeId = null;
        }

        // Userni yangilash
        const updatedUser = await User.update(id, updates); // ✅ await qo'shildi

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                error: 'User yangilashda xato'
            });
        }

        console.log(`✅ User yangilandi: ${updatedUser.username}`);

        // Log qo'shish
        const changes = [];
        if (username && username !== user.username) changes.push(`username: ${user.username} → ${username}`);
        if (fullName && fullName !== user.full_name) changes.push(`fullName: ${user.full_name} → ${fullName}`);
        if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
        if (password) changes.push('password o\'zgartirildi');

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

/**
 * Userni o'chirish (admin only)
 * DELETE /api/users/users/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Userni topish
        const user = await User.findById(id); // ✅ await qo'shildi
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User topilmadi'
            });
        }

        // Admin o'zini o'chirib bo'lmaydi
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'O\'zingizni o\'chira olmaysiz'
            });
        }

        // Admin rolini o'chirib bo'lmaydi
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                error: 'Admin userlarni o\'chirib bo\'lmaydi'
            });
        }

        // Userni o'chirish
        await User.delete(id); // ✅ await qo'shildi

        console.log(`🗑️ User o'chirildi: ${user.username}`);

        // Log qo'shish
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
