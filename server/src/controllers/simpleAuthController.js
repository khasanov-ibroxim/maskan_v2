// controllers/simpleAuthController.js
const SimpleUser = require('../models/User.pg');
const { createSession, endSession, logActivity } = require('../middleware/simpleAuth');

/**
 * Login - Tizimga kirish
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validatsiya
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username va password kiritilishi kerak'
            });
        }

        console.log(`🔐 Login urinishi: ${username}`);

        // Userni topish
        const user = SimpleUser.findByUsername(username);

        if (!user) {
            console.log(`❌ User topilmadi: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // Passwordni tekshirish
        const isPasswordCorrect = SimpleUser.comparePassword(password, user.password);

        if (!isPasswordCorrect) {
            console.log(`❌ Password noto'g'ri: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // User faolligi tekshirish
        if (!user.isActive) {
            console.log(`❌ User faol emas: ${username}`);
            return res.status(403).json({
                success: false,
                error: 'Hisobingiz faol emas. Admin bilan bog\'laning'
            });
        }

        // Session yaratish
        const sessionId = createSession(
            user.id,
            user.username,
            req.ip,
            req.get('user-agent')
        );

        console.log(`✅ Login muvaffaqiyatli: ${username} (${user.role})`);

        // Response
        res.json({
            success: true,
            message: 'Login muvaffaqiyatli',
            sessionId,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Login xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi. Qaytadan urinib ko\'ring'
        });
    }
};

/**
 * Logout - Tizimdan chiqish
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        const sessionId = req.session.sessionId;
        const username = req.user.username;

        console.log(`👋 Logout: ${username}`);

        // Sessionni tugatish
        endSession(sessionId, 'manual_logout');

        res.json({
            success: true,
            message: 'Tizimdan muvaffaqiyatli chiqdingiz'
        });

    } catch (error) {
        console.error('❌ Logout xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

/**
 * Get Me - Joriy user ma'lumotlari
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
    try {
        console.log(`ℹ️ Get Me: ${req.user.username}`);

        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                fullName: req.user.fullName,
                role: req.user.role,
                isActive: req.user.isActive,
                createdAt: req.user.createdAt
            },
            session: {
                sessionId: req.session.sessionId,
                loginTime: req.session.loginTime,
                lastActivity: req.session.lastActivity,
                ipAddress: req.session.ipAddress
            }
        });

    } catch (error) {
        console.error('❌ Get me xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};