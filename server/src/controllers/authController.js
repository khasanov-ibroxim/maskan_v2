const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { generateToken } = require('../middleware/auth');

// @desc    Login
// @route   POST /api/auth/login
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

        // Userni topish (password ham kerak)
        const user = await User.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // Passwordni tekshirish
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                error: 'Username yoki password noto\'g\'ri'
            });
        }

        // User faol emasligini tekshirish
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Hisobingiz faol emas'
            });
        }

        // Login ma'lumotlarini yangilash
        user.lastLogin = Date.now();
        user.isOnline = true;
        user.lastActivity = Date.now();
        await user.save();

        // Activity log qo'shish
        await ActivityLog.create({
            user: user._id,
            action: 'login',
            description: 'User tizimga kirdi',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Token yaratish
        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Login xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
    try {
        const user = req.user;

        // Login vaqtini hisoblash
        const loginTime = user.lastLogin;
        const duration = loginTime ? Math.floor((Date.now() - loginTime.getTime()) / 1000) : 0;

        // Offline qilish
        user.isOnline = false;
        await user.save();

        // Activity log
        await ActivityLog.create({
            user: user._id,
            action: 'logout',
            description: 'User tizimdan chiqdi',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            duration
        });

        res.json({
            success: true,
            message: 'Tizimdan muvaffaqiyatli chiqdingiz',
            duration: `${Math.floor(duration / 60)} daqiqa ${duration % 60} soniya`
        });

    } catch (error) {
        console.error('Logout xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                isOnline: user.isOnline,
                lastLogin: user.lastLogin,
                lastActivity: user.lastActivity
            }
        });

    } catch (error) {
        console.error('Get me xato:', error);
        res.status(500).json({
            success: false,
            error: 'Server xatosi'
        });
    }
};