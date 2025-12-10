// controllers/simpleUserController.js
const SimpleUser = require('../models/User.pg');
const { logActivity } = require('../middleware/simpleAuth');

/**
 * Aktiv sesiyalarni olish
 * GET /api/users/sessions/active
 */
exports.getActiveSessions = async (req, res) => {
    try {
        const sessions = SimpleUser.getSessions();
        const activeSessions = sessions.filter(s => s.isActive);

        console.log(`📊 Aktiv sesiyalar so'ralmoqda: ${activeSessions.length} ta`);

        res.json({
            success: true,
            count: activeSessions.length,
            sessions: activeSessions.map(s => ({
                sessionId: s.sessionId,
                userId: s.userId,
                username: s.username,
                loginTime: s.loginTime,
                lastActivity: s.lastActivity,
                ipAddress: s.ipAddress,
                userAgent: s.userAgent
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
        const sessions = SimpleUser.getSessions();

        let filteredSessions = sessions;

        // Agar userId berilgan bo'lsa, faqat o'sha userning sesiyalari
        if (userId) {
            filteredSessions = sessions.filter(s => s.userId === userId);
        }

        // Admin emas bo'lsa, faqat o'z sesiyalarini ko'radi
        if (req.user.role !== 'admin' && !userId) {
            filteredSessions = sessions.filter(s => s.userId === req.user.id);
        }

        console.log(`📜 Session tarixi so'ralmoqda: ${filteredSessions.length} ta`);

        res.json({
            success: true,
            count: filteredSessions.length,
            sessions: filteredSessions.sort((a, b) =>
                new Date(b.loginTime) - new Date(a.loginTime)
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
        let logs = SimpleUser.getLogs();

        // Filter qilish
        if (userId) {
            logs = logs.filter(l => l.userId === userId);
        }

        if (action) {
            logs = logs.filter(l => l.action === action);
        }

        // Admin emas bo'lsa, faqat o'z loglarini ko'radi
        if (req.user.role !== 'admin' && !userId) {
            logs = logs.filter(l => l.userId === req.user.id);
        }

        // Limit
        const limitNum = parseInt(limit);
        logs = logs.slice(-limitNum);

        console.log(`📝 Activity logs so'ralmoqda: ${logs.length} ta`);

        res.json({
            success: true,
            count: logs.length,
            logs: logs.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            )
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
        const users = SimpleUser.getUsers();

        console.log(`👥 Barcha userlar so'ralmoqda: ${users.length} ta`);

        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                fullName: u.fullName,
                role: u.role,
                isActive: u.isActive,
                createdAt: u.createdAt
            }))
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
        const users = SimpleUser.getUsers();

        // Faqat faol rieltor'larni filter qilish
        const realtors = users.filter(u =>
            u.role === 'rieltor' &&
            u.isActive === true
        );

        console.log(`📋 Realtor'lar ro'yxati so'ralmoqda: ${realtors.length} ta`);

        // Faqat kerakli ma'lumotlarni yuborish
        const realtorsList = realtors.map(r => ({
            id: r.id,
            username: r.username,
            fullName: r.fullName,
            role: r.role,
            isActive: r.isActive
        }));

        res.json({
            success: true,
            count: realtorsList.length,
            realtors: realtorsList
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
        const existingUser = SimpleUser.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Bu username band'
            });
        }

        // Yangi user yaratish
        const newUser = SimpleUser.createUser({
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
        logActivity(
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
            user: {
                id: newUser.id,
                username: newUser.username,
                fullName: newUser.fullName,
                role: newUser.role,
                isActive: newUser.isActive,
                appScriptUrl: newUser.appScriptUrl,
                telegramThemeId: newUser.telegramThemeId,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create user xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
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
        const user = SimpleUser.findById(id);
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
        SimpleUser.deleteUser(id);

        console.log(`🗑️ User o'chirildi: ${user.username}`);

        // Log qo'shish
        logActivity(
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

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, role, appScriptUrl, telegramThemeId } = req.body;

        console.log(`✏️ User yangilanmoqda: ${id}`);
        console.log('  Yangi ma\'lumotlar:', { username, fullName, role });

        // Userni topish
        const user = SimpleUser.findById(id);
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

        // Username band emasligini tekshirish (agar o'zgartirilgan bo'lsa)
        if (username && username !== user.username) {
            const existingUser = SimpleUser.findByUsername(username);
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

        // Parol yangilash (agar kiritilgan bo'lsa)
        if (password && password.length >= 5) {
            const bcrypt = require('bcryptjs');
            updates.password = bcrypt.hashSync(password, 10);
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

            // URL formatini tekshirish
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
            console.log('    App Script URL:', appScriptUrl.substring(0, 50) + '...');
            console.log('    Telegram Theme ID:', telegramThemeId);
        } else {
            // Agar role rieltor emas bo'lsa, bu ma'lumotlarni o'chirish
            updates.appScriptUrl = undefined;
            updates.telegramThemeId = undefined;
        }

        // Userni yangilash
        const updatedUser = SimpleUser.updateUser(id, updates);

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
        if (fullName && fullName !== user.fullName) changes.push(`fullName: ${user.fullName} → ${fullName}`);
        if (role && role !== user.role) changes.push(`role: ${user.role} → ${role}`);
        if (password) changes.push('password o\'zgartirildi');
        if (appScriptUrl) changes.push('App Script URL yangilandi');
        if (telegramThemeId) changes.push(`Telegram Theme ID: ${telegramThemeId}`);

        logActivity(
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
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                appScriptUrl: updatedUser.appScriptUrl,
                telegramThemeId: updatedUser.telegramThemeId,
                createdAt: updatedUser.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Update user xato:', error);
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