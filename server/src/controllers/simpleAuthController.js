// server/src/controllers/simpleAuthController.js - FIXED
const User = require('../models/User.pg');
const { createSession, endSession, logActivity } = require('../middleware/simpleAuth');

/**
 * Login - Tizimga kirish
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log('🔐 LOGIN URINISHI');
        console.log('='.repeat(60));
        console.log('Username:', username);
        console.log('Password length:', password ? password.length : 0);
        console.log('='.repeat(60));

        // 1. Validatsiya
        if (!username || !password) {
            console.log('❌ Username yoki password kiritilmagan');
            return res.status(400).json({
                success: false,
                error: 'Username va password kiritilishi kerak'
            });
        }

        // 2. Userni topish (PASSWORD BILAN!)
        const user = await User.findByUsername(username);

        if (!user) {
            console.log('❌ User topilmadi:', username);
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        console.log('\n✅ User topildi:');
        console.log('   ID:', user.id);
        console.log('   Username:', user.username);
        console.log('   Full Name:', user.full_name);
        console.log('   Role:', user.role);
        console.log('   Active:', user.is_active);
        console.log('   Password exists:', !!user.password);

        // 3. Password tekshirish
        console.log('\n🔐 Password tekshirilmoqda...');

        if (!user.password) {
            console.error('❌ Database\'da password yo\'q!');
            return res.status(500).json({
                success: false,
                error: 'Server xatosi - password topilmadi'
            });
        }

        const isPasswordCorrect = await User.comparePassword(password, user.password);

        if (!isPasswordCorrect) {
            console.log('❌ Password noto\'g\'ri');
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        console.log('✅ Password to\'g\'ri!');

        // 4. Active tekshirish
        if (!user.is_active) {
            console.log('❌ User faol emas');
            return res.status(403).json({
                success: false,
                error: 'Hisobingiz faol emas. Admin bilan bog\'laning'
            });
        }

        // 5. Session yaratish
        console.log('\n📝 Session yaratilmoqda...');
        const sessionId = await createSession(
            user.id,
            user.username,
            req.ip,
            req.get('user-agent')
        );

        console.log('✅ Session yaratildi:', sessionId.substring(0, 16) + '...');

        // 6. Response
        console.log('\n' + '='.repeat(60));
        console.log('✅✅✅ LOGIN MUVAFFAQIYATLI');
        console.log('='.repeat(60));
        console.log('User:', user.username);
        console.log('Role:', user.role);
        console.log('Session:', sessionId.substring(0, 16) + '...');
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            message: 'Login muvaffaqiyatli',
            sessionId,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌❌❌ LOGIN XATO');
        console.error('='.repeat(60));
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(60) + '\n');

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
        await endSession(sessionId, 'manual_logout');

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