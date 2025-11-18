// controllers/simpleUserController.js
const SimpleUser = require('../models/SimpleUser');
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

/**
 * Yangi user yaratish (admin only)
 * POST /api/users/users
 */
exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role } = req.body;

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
            role: role || 'user'
        });

        console.log(`✅ Yangi user yaratildi: ${username} (${role || 'user'})`);

        // Log qo'shish
        logActivity(
            req.user.id,
            req.user.username,
            'create_user',
            `Yangi user yaratildi: ${username}`,
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